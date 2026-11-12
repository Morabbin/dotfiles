export const meta = {
  name: 'milestone-review',
  description: 'Adversarial whole-project review gate between milestones: lens reviewers, skeptic refutation, two-advisor pass, report with verdicts',
  whenToUse: 'At a graph-plan review gate (see .claude/skills/graph-plan/references/review-gate.md), once the milestone has merged and main passes the check command',
  phases: [
    { title: 'Review', detail: 'one read-only reviewer per lens; each finding attacked by three skeptics' },
    { title: 'Advise', detail: 'two advisors try to refute every surviving finding' },
    { title: 'Report', detail: 'settle verdicts and write the gate report' },
  ],
}

// args: { gate, milestone, repo, planDir, checkCommand, carryOver?, confidentialFile?,
//         extraLenses?: [{key, prompt}], advisorModels?: [string, string], standingRules? }
const A = args || {}
const need = ['gate', 'milestone', 'repo', 'planDir', 'checkCommand']
const missing = need.filter(k => !A[k])
if (missing.length) throw new Error(`milestone-review: missing args ${missing.join(', ')}`)

const CONTEXT = `Gate ${A.gate} of a graph plan, at the end of milestone ${A.milestone}. Repo ${A.repo}, current main (check it out read-only). Plan folder: ${A.planDir} (plan doc link, tracker, pending prompts, earlier reviews/R*.md).${A.confidentialFile ? ` Confidential findings file: ${A.confidentialFile}.` : ''} Check command: \`${A.checkCommand}\`.${A.standingRules ? ` Standing rules: ${A.standingRules}` : ''}
This is READ-ONLY: do not push, open PRs, comment on GitHub, or edit plan files. Assume the work is not as good as it claims. Every finding needs concrete evidence: file:line, command output, or an audit line.
A finding that is a defect in someone else's software (a third-party SDK, library or service) is confidential: set confidential=true and keep its details out of every other field's public phrasing.`

const LENSES = [
  { key: 'claims', prompt: 'Claims vs. evidence: every claim in the README, docs, spec/theorem index and PR descriptions merged since the last gate is backed by a test, proof or measurement that shows what the prose says. Look for vacuous or too-weak guarantees and assumptions that never hold. Run the check command and include its pass/fail summary in evidence.' },
  { key: 'spec', prompt: 'Spec or requirements fidelity: compare the implementation against the governing spec named in the plan. Missing pieces, and places stricter or looser than the spec.' },
  { key: 'trusted-base', prompt: 'Trusted base: what is still unverified or untested (parsers, FFI, IO, unsafe or partial code, mocks standing in for real systems), and whether it is documented as such.' },
  { key: 'tests', prompt: 'Tests vs. guarantees: gaps between what is claimed or proved and what the tests and exported checks actually exercise.' },
  { key: 'plan', prompt: `Plan health: tasks whose premise is now wrong, missing tasks, wrong dependencies, stale prompts in the pending files, follow-ups noted but never scheduled, and whether the remaining plan still reaches the goal.${A.carryOver && A.carryOver.length ? ` Also review these tasks carried over from the previous gate: ${A.carryOver.join(', ')}.` : ''}` },
  { key: 'exposure', prompt: 'Exposure: anything in the repo that should not be public, secrets, unsafe defaults in demos or examples, and whether earlier exposure fixes still hold.' },
  ...(A.extraLenses || []),
]

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          detail: { type: 'string' },
          evidence: { type: 'string' },
          suggestedPlanChange: { type: 'string' },
          confidential: { type: 'boolean' },
        },
        required: ['title', 'severity', 'detail', 'evidence', 'suggestedPlanChange', 'confidential'],
      },
    },
  },
  required: ['findings'],
}
const REFUTE = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' } },
  required: ['refuted', 'reason'],
}
const ADVICE = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          holds: { type: 'boolean' },
          reason: { type: 'string' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          confidential: { type: 'boolean' },
        },
        required: ['id', 'holds', 'reason', 'confidential'],
      },
    },
    missed: FINDINGS.properties.findings,
  },
  required: ['verdicts', 'missed'],
}

const show = f => `${f.title} [${f.severity}]\n${f.detail}\nEvidence: ${f.evidence}`

// Review: each lens finds, then every finding is attacked by three skeptics, without a barrier between lenses.
const reviewed = await pipeline(
  LENSES,
  lens => agent(`${CONTEXT}\n\nYour lens: ${lens.prompt}\n\nReturn every finding under this lens, most severe first. Return an empty list if you find nothing real.`,
    { label: `review:${lens.key}`, phase: 'Review', schema: FINDINGS }),
  (res, lens) => res === null ? { missingLens: lens.key } : parallel(res.findings.map(f => async () => {
    const votes = (await parallel([0, 1, 2].map(i => () =>
      agent(`${CONTEXT}\n\nSkeptic ${i + 1} of 3. Try to REFUTE this finding by checking the repo yourself: is it wrong, already fixed, out of the plan's scope, or unsupported by its evidence? Answer refuted=true only with a concrete reason.\n\n${show(f)}`,
        { label: `refute:${lens.key}`, phase: 'Review', schema: REFUTE })))).filter(Boolean)
    const refutations = votes.filter(v => v.refuted)
    return { ...f, lens: lens.key, skeptics: votes, survives: refutations.length < 2 }
  })),
)

// A lens whose reviewer never returned is missing coverage, not an empty review: it is reported, never hidden.
const missingLenses = LENSES.filter((l, i) => !reviewed[i] || reviewed[i].missingLens).map(l => l.key)
if (missingLenses.length) log(`INCOMPLETE: no result from lens reviewer(s) ${missingLenses.join(', ')}`)
const all = reviewed.filter(r => Array.isArray(r)).flat().filter(Boolean)
const seen = new Set()
const unique = all.filter(f => { const k = f.title.toLowerCase().replace(/\W+/g, ' ').trim(); if (seen.has(k)) return false; seen.add(k); return true })
const survivors = unique.filter(f => f.survives).map((f, i) => ({ ...f, id: `${A.gate}-${i + 1}` }))
const skepticDropped = unique.filter(f => !f.survives)
log(`${all.length} findings, ${unique.length} unique, ${survivors.length} survive skeptics, ${skepticDropped.length} refuted`)

// Advise: two independent advisors see the same full list (barrier: they judge findings against each other).
phase('Advise')
const list = survivors.map(f => `${f.id}: ${show(f)}`).join('\n\n')
const models = A.advisorModels || [undefined, undefined]
const advice = survivors.length ? (await parallel(models.map((m, i) => () =>
  agent(`${CONTEXT}\n\nYou are advisor ${i + 1} of 2 at this review gate. For EVERY finding below, check the repo and decide whether it holds (a real problem the plan should act on). Try to refute each one; prefer the smallest plan change that fixes a real problem. You may adjust severity. Set confidential=true on a verdict whose reason reveals a defect in someone else's software. In "missed", list anything important the review missed as findings with evidence, each with its own confidential flag.\n\n${list}`,
    { label: `advisor-${i + 1}`, phase: 'Advise', schema: ADVICE, ...(m ? { model: m } : {}) })))).filter(Boolean) : []
if (survivors.length && advice.length < 2) log(`only ${advice.length} of 2 advisors returned; affected findings are marked disputed`)

const settled = survivors.map(f => {
  const vs = advice.map(a => a.verdicts.find(v => v.id === f.id)).filter(Boolean)
  const holds = vs.filter(v => v.holds).length
  const verdict = vs.length === 2 && holds === 2 ? 'confirmed' : vs.length === 2 && holds === 0 ? 'dropped' : 'disputed'
  return { ...f, verdict, advisors: vs, confidential: f.confidential || vs.some(v => v.confidential) }
})

// Report: confidential findings are returned separately and never enter the markdown.
phase('Report')
const pub = settled.filter(f => !f.confidential)
const confidential = settled.filter(f => f.confidential).concat(skepticDropped.filter(f => f.confidential))
const droppedPub = pub.filter(f => f.verdict === 'dropped').concat(skepticDropped.filter(f => !f.confidential))
// Advisor additions are unverified; private ones go only to the confidential list.
const additions = advice.flatMap((a, i) => (a.missed || []).map(f => ({ ...f, from: `advisor-${i + 1}`, verdict: 'unverified (advisor addition)' })))
confidential.push(...additions.filter(f => f.confidential))
const missed = additions.filter(f => !f.confidential)
const coverage = { missingLenses, advisorsReturned: advice.length, complete: !missingLenses.length && (!survivors.length || advice.length === 2) }
const markdown = await agent(`Write the review gate report for ${A.gate} (end of ${A.milestone}) as markdown, from the JSON below. Sections exactly: "# ${A.gate} review", "## Summary" (five lines max), "## Findings" (a table: id, severity, verdict, title, evidence, suggested plan change; confirmed first, then disputed with both advisors' positions under the table), "## Dropped findings" (title and the reason it was refuted), "## Advisor record" (advisor models: ${models.map(m => m || 'session default').join(', ')}; where they disagreed; what they said the review missed, marked unverified), a "## Coverage" section that states plainly whether the review is complete and names any lens or advisor that returned nothing (an incomplete gate must not read as a clean one), and an empty "## Plan changes" section for the planner to fill. Do not invent findings. Return only the markdown.\n\n${JSON.stringify({ findings: pub.filter(f => f.verdict !== 'dropped'), dropped: droppedPub, missed, coverage }, null, 1)}`,
  { label: 'report', phase: 'Report' })

return {
  markdown,
  confirmed: settled.filter(f => f.verdict === 'confirmed' && !f.confidential),
  disputed: settled.filter(f => f.verdict === 'disputed' && !f.confidential),
  dropped: droppedPub.length,
  confidential,
  coverage,
}
