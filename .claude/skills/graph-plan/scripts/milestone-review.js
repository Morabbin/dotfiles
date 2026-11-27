export const meta = {
  name: 'milestone-review',
  description: 'Adversarial whole-project review gate between milestones: owner asks re-checked against delivery, lens reviewers, skeptic refutation, two-advisor pass, report with verdicts',
  whenToUse: 'At a graph-plan review gate (see .claude/skills/graph-plan/references/review-gate.md), once the milestone has merged and main passes the check command',
  phases: [
    { title: 'Review', detail: 'one read-only reviewer per lens (the asks lens always runs); each finding attacked by three skeptics' },
    { title: 'Advise', detail: 'two advisors try to refute every surviving finding' },
    { title: 'Report', detail: 'settle verdicts and write the gate report' },
  ],
}

// args: { gate, milestone, repo, planDir, checkCommand, carryOver?, confidentialFile?,
//         asksFile?, ownerMessages?,
//         extraLenses?: [{key, prompt}], advisorModels?: [string, string], standingRules? }
// asksFile: the asks ledger (every owner ask, quoted with its source, traced to tasks); default <planDir>/asks.md.
// ownerMessages: where the owner's own messages can be read (e.g. the project chat), so the asks lens
// can find asks the ledger missed. Without it, or if the asks lens reports it could not read them or the ledger, the gate is incomplete.
const A = args || {}
const need = ['gate', 'milestone', 'repo', 'planDir', 'checkCommand']
const missing = need.filter(k => !A[k])
if (missing.length) throw new Error(`milestone-review: missing args ${missing.join(', ')}`)

const ASKS = A.asksFile || `${A.planDir}/asks.md`
const CONTEXT = `Gate ${A.gate} of a graph plan, at the end of milestone ${A.milestone}. Repo ${A.repo}, current main (check it out read-only). Plan folder: ${A.planDir} (plan doc link, asks ledger ${ASKS}, tracker, pending prompts, earlier reviews/R*.md).${A.ownerMessages ? ` The owner's own messages: ${A.ownerMessages}.` : ''}${A.confidentialFile ? ` Confidential findings file: ${A.confidentialFile}.` : ''} Check command: \`${A.checkCommand}\`.${A.standingRules ? ` Standing rules: ${A.standingRules}` : ''}
This is READ-ONLY: do not push, open PRs, comment on GitHub, or edit plan files. Assume the work is not as good as it claims. Every finding needs concrete evidence: file:line, command output, or an audit line.
A finding that is a defect in someone else's software (a third-party SDK, library or service) is confidential: set confidential=true and keep its details out of every other field's public phrasing.
A finding that an owner ask was narrowed, weakened, dropped, deferred without a task, or left unscheduled is a scope finding: put the ask, quoted with its source, in ownerAsk (empty string for any other finding). The plan is what is being checked, so "the plan says so", "out of the plan's scope" or "the planner agreed" never refutes a scope finding; only evidence that the whole ask was delivered, or the owner's own decision quoted with its source, does.`

const SCOPE_LENS = { key: 'asks', prompt: `Asks vs. delivered (runs at every gate). Rebuild the full list of the owner's asks from the asks ledger (${ASKS}) AND from the owner's own messages since the plan began, the plan doc and earlier reviews, because the ledger itself can be incomplete. Count each item of a blanket approval ("go ahead with the recommendations") as its own ask. For EVERY ask, compare its own wording with what has merged on main and what is scheduled in the graph and pending prompts. Report as findings: asks with no task; tasks that deliver only a subset (fewer features, targets or guarantees); done criteria, coverage targets or closure conditions widened after sign-off; optional wording in prompts ("implement or record", "where feasible") the owner never approved; items moved out of scope without the owner's decision; deferrals with no task or trigger; approved tasks never started or offered back to the owner; questions put to the owner and never answered or raised again; earlier review findings never turned into tasks; and a missing or stale ledger. A narrowing is fine only with the owner's own decision, quoted with its source. Also return trace: one row per ask (ask quoted, source, tasks, delivered, coverage full|narrowed|deferred|dropped|unscheduled, owner decision or empty, evidence). An empty trace means this lens did not run. Also return sources: whether you actually read the asks ledger and the owner's own messages (ownerMessagesRead=false if no location was given or you could not open it), with a note on what was missing.` }

const LENSES = [
  SCOPE_LENS,
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
          ownerAsk: { type: 'string' },
        },
        required: ['title', 'severity', 'detail', 'evidence', 'suggestedPlanChange', 'confidential', 'ownerAsk'],
      },
    },
  },
  required: ['findings'],
}
const SCOPE_TRACE = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      ask: { type: 'string' }, source: { type: 'string' }, tasks: { type: 'string' }, delivered: { type: 'string' },
      coverage: { type: 'string', enum: ['full', 'narrowed', 'deferred', 'dropped', 'unscheduled'] },
      ownerDecision: { type: 'string' }, evidence: { type: 'string' }, confidential: { type: 'boolean' },
    },
    required: ['ask', 'source', 'tasks', 'delivered', 'coverage', 'ownerDecision', 'evidence', 'confidential'],
  },
}
const SCOPE_SOURCES = {
  type: 'object',
  properties: { ledgerRead: { type: 'boolean' }, ownerMessagesRead: { type: 'boolean' }, note: { type: 'string' } },
  required: ['ledgerRead', 'ownerMessagesRead', 'note'],
}
const SCOPE_FINDINGS = {
  type: 'object',
  properties: { findings: FINDINGS.properties.findings, trace: SCOPE_TRACE, sources: SCOPE_SOURCES },
  required: ['findings', 'trace', 'sources'],
}
// scopeRefutation: why a scope finding is wrong. basis none for other findings; full-delivery needs evidence;
// owner-decision needs the owner's words quoted and their source.
const SCOPE_REFUTATION = {
  type: 'object',
  properties: {
    basis: { type: 'string', enum: ['none', 'full-delivery', 'owner-decision'] },
    evidence: { type: 'string' }, ownerQuote: { type: 'string' }, source: { type: 'string' },
  },
  required: ['basis', 'evidence', 'ownerQuote', 'source'],
}
const REFUTE = {
  type: 'object',
  properties: { refuted: { type: 'boolean' }, reason: { type: 'string' }, scopeRefutation: SCOPE_REFUTATION },
  required: ['refuted', 'reason', 'scopeRefutation'],
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
          scopeRefutation: SCOPE_REFUTATION,
        },
        required: ['id', 'holds', 'reason', 'confidential', 'scopeRefutation'],
      },
    },
    missed: FINDINGS.properties.findings,
  },
  required: ['verdicts', 'missed'],
}

const isScope = f => !!(f.ownerAsk && f.ownerAsk.trim()) || f.lens === SCOPE_LENS.key
const show = f => `${f.title} [${f.severity}]${isScope(f) ? `\nScope finding. Owner's ask: ${f.ownerAsk || '(see detail)'}` : ''}\n${f.detail}\nEvidence: ${f.evidence}`
const filled = s => typeof s === 'string' && !!s.trim()
// A refutation of a scope finding counts only with a well-formed basis: full delivery with evidence, or the
// owner's decision quoted with its source. This checks form, not truth, so refuted scope findings are reported.
const validScopeRefutation = r => !!r && ((r.basis === 'full-delivery' && filled(r.evidence)) ||
  (r.basis === 'owner-decision' && filled(r.ownerQuote) && filled(r.source)))
const counts = (f, v) => !isScope(f) || validScopeRefutation(v.scopeRefutation)
const SCOPE_REFUTE_RULE = 'This is a scope finding: "out of the plan\'s scope", "the plan says so" or "the planner agreed" does not refute it. Refute it only with scopeRefutation basis "full-delivery" and evidence that the whole ask was delivered, or basis "owner-decision" with the owner\'s own words in ownerQuote and their source.'
const NON_SCOPE_RULE = 'Set scopeRefutation basis "none" with empty strings.'

// Review: each lens finds, then every finding is attacked by three skeptics, without a barrier between lenses.
let scopeRaw = null
const reviewed = await pipeline(
  LENSES,
  lens => agent(`${CONTEXT}\n\nYour lens: ${lens.prompt}\n\nReturn every finding under this lens, most severe first. Return an empty list if you find nothing real.`,
    { label: `review:${lens.key}`, phase: 'Review', schema: lens === SCOPE_LENS ? SCOPE_FINDINGS : FINDINGS }),
  (res, lens) => { if (lens === SCOPE_LENS) scopeRaw = res; return res === null ? { missingLens: lens.key } : parallel(res.findings.map(f => async () => {
    const votes = (await parallel([0, 1, 2].map(i => () =>
      agent(`${CONTEXT}\n\nSkeptic ${i + 1} of 3. Try to REFUTE this finding by checking the repo yourself: is it wrong, already fixed, out of the plan's scope, or unsupported by its evidence? Answer refuted=true only with a concrete reason. ${isScope(f) ? SCOPE_REFUTE_RULE : NON_SCOPE_RULE}\n\n${show(f)}`,
        { label: `refute:${lens.key}`, phase: 'Review', schema: REFUTE })))).filter(Boolean)
    const refutations = votes.filter(v => v.refuted && counts(f, v))
    const survives = refutations.length < 2
    return { ...f, lens: lens.key, skeptics: votes, survives,
      ...(isScope(f) && !survives ? { claimedRefutations: refutations.map(v => v.scopeRefutation) } : {}) }
  })) },
)

// A lens whose reviewer never returned is missing coverage, not an empty review: it is reported, never hidden.
const missingLenses = LENSES.filter((l, i) => !reviewed[i] || reviewed[i].missingLens).map(l => l.key)
// The asks lens's trace, kept from its raw result (the pipeline's second stage replaces it with findings).
const scopeTrace = scopeRaw && Array.isArray(scopeRaw.trace) ? scopeRaw.trace : []
if (!scopeTrace.length && !missingLenses.includes(SCOPE_LENS.key)) log('INCOMPLETE: the asks lens returned no scope trace')
// Asks missing from the ledger can only be found in the owner's own messages; without them the trace is partial.
const ownerMessages = !A.ownerMessages ? 'not provided' : scopeRaw && scopeRaw.sources && scopeRaw.sources.ownerMessagesRead ? 'read' : 'not read'
if (ownerMessages !== 'read') log(`INCOMPLETE: owner messages ${ownerMessages}; asks absent from the ledger cannot be found`)
const asksLedger = scopeRaw && scopeRaw.sources && scopeRaw.sources.ledgerRead ? 'read' : 'not read'
if (asksLedger !== 'read') log(`INCOMPLETE: asks ledger ${ASKS} not read`)
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
  agent(`${CONTEXT}\n\nYou are advisor ${i + 1} of 2 at this review gate. For EVERY finding below, check the repo and decide whether it holds (a real problem the plan should act on). Try to refute each one; prefer the smallest plan change that fixes a real problem. For a scope finding (one that names an owner's ask), holds=false counts only with a scopeRefutation. ${SCOPE_REFUTE_RULE} For other findings: ${NON_SCOPE_RULE} You may adjust severity. Set confidential=true on a verdict whose reason reveals a defect in someone else's software. In "missed", list anything important the review missed as findings with evidence, each with its own confidential flag.\n\n${list}`,
    { label: `advisor-${i + 1}`, phase: 'Advise', schema: ADVICE, ...(m ? { model: m } : {}) })))).filter(Boolean) : []
if (survivors.length && advice.length < 2) log(`only ${advice.length} of 2 advisors returned; affected findings are marked disputed`)

const settled = survivors.map(f => {
  const vs = advice.map(a => a.verdicts.find(v => v.id === f.id)).filter(Boolean)
  const holds = vs.filter(v => v.holds || !counts(f, v)).length
  const verdict = vs.length === 2 && holds === 2 ? 'confirmed' : vs.length === 2 && holds === 0 ? 'dropped' : 'disputed'
  return { ...f, verdict, advisors: vs, confidential: f.confidential || vs.some(v => v.confidential),
    ...(isScope(f) && verdict === 'dropped' ? { claimedRefutations: vs.map(v => v.scopeRefutation) } : {}) }
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
const ownerDecisions = pub.filter(f => isScope(f) && f.verdict !== 'dropped').concat(missed.filter(isScope))
// Model-claimed refutations of scope findings are not independently verified; the owner sees each one.
const scopeRefuted = droppedPub.filter(isScope).map(f => ({ title: f.title, ownerAsk: f.ownerAsk, claimedRefutations: f.claimedRefutations || [] }))
const tracePub = scopeTrace.filter(r => !r.confidential)
confidential.push(...scopeTrace.filter(r => r.confidential).map(r => ({ title: `scope trace: ${r.ask}`, ...r })))
const coverage = { missingLenses, scopeTraceRows: scopeTrace.length, asksLedger, ownerMessages, advisorsReturned: advice.length,
  complete: !missingLenses.length && scopeTrace.length > 0 && asksLedger === 'read' && ownerMessages === 'read' && (!survivors.length || advice.length === 2) }
const markdown = await agent(`Write the review gate report for ${A.gate} (end of ${A.milestone}) as markdown, from the JSON below. Sections exactly: "# ${A.gate} review", "## Summary" (five lines max), "## Findings" (a table: id, severity, verdict, title, evidence, suggested plan change; confirmed first, then disputed with both advisors' positions under the table), "## Scope trace" (a table with one row per owner ask from scopeTrace: ask quoted, source, tasks, delivered, coverage, owner decision, evidence; say plainly if it is empty), "## Owner decisions needed" (every item in ownerDecisions: the owner's ask quoted, what was delivered, what is missing, the suggested plan change; these are never settled by the planner alone), "## Refuted scope findings" (every item in scopeRefuted: the ask, and each claimed basis with its evidence or the quoted owner decision and source; say these refutations are model claims, not independently verified, for the owner to check), "## Dropped findings" (title and the reason it was refuted), "## Advisor record" (advisor models: ${models.map(m => m || 'session default').join(', ')}; where they disagreed; what they said the review missed, marked unverified), a "## Coverage" section that states plainly whether the review is complete and names any lens or advisor that returned nothing, whether the asks ledger was read, and whether the owner's own messages were read (if not, say asks missing from the ledger were not checked) (an incomplete gate must not read as a clean one), and an empty "## Plan changes" section for the planner to fill. Do not invent findings. Return only the markdown.\n\n${JSON.stringify({ findings: pub.filter(f => f.verdict !== 'dropped'), dropped: droppedPub, missed, scopeTrace: tracePub, ownerDecisions, scopeRefuted, coverage }, null, 1)}`,
  { label: 'report', phase: 'Report' })

return {
  markdown,
  confirmed: settled.filter(f => f.verdict === 'confirmed' && !f.confidential),
  disputed: settled.filter(f => f.verdict === 'disputed' && !f.confidential),
  dropped: droppedPub.length,
  ownerDecisions,
  scopeRefuted,
  scopeTrace: tracePub,
  confidential,
  coverage,
}
