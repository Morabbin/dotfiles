// Run: node --test .claude/skills/graph-plan/scripts/milestone-review.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const body = readFileSync(new URL('./milestone-review.js', import.meta.url), 'utf8').replace('export const meta', 'const meta')
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor
const workflow = new AsyncFunction('args', 'agent', 'pipeline', 'parallel', 'log', 'phase', body)

const ARGS = { gate: 'R1', milestone: 'M1', repo: 'o/r', planDir: '/plan', checkCommand: 'check' }
const SCOPE = { title: 'Ask A1 narrowed', severity: 'high', detail: 'd', evidence: 'e', suggestedPlanChange: 's', confidential: false, ownerAsk: '"all targets" (chat 1)' }
const NONE = { basis: 'none', evidence: '', ownerQuote: '', source: '' }
const ROW = { ask: 'all targets', source: 'chat 1', tasks: 'T1', delivered: 'one', coverage: 'narrowed', ownerDecision: '', evidence: 'e', confidential: false }

// refutation: what every skeptic and advisor answers for the scope finding.
async function run({ args = ARGS, refutation, ownerMessagesRead = true }) {
  let reportInput = null
  const agent = async (prompt, { label }) => {
    if (label === 'review:asks') return { findings: [SCOPE], trace: [ROW], sources: { ledgerRead: true, ownerMessagesRead, note: '' } }
    if (label.startsWith('review:')) return { findings: [] }
    if (label.startsWith('refute:')) return { refuted: refutation !== NONE, reason: 'r', scopeRefutation: refutation }
    if (label.startsWith('advisor-')) return { verdicts: [{ id: 'R1-1', holds: refutation === NONE, reason: 'r', confidential: false, scopeRefutation: refutation }], missed: [] }
    if (label === 'report') { reportInput = JSON.parse(prompt.slice(prompt.indexOf('\n\n{') + 2)); return '# report' }
    throw new Error(label)
  }
  const pipeline = (items, a, b) => Promise.all(items.map(async it => b(await a(it), it)))
  const parallel = fns => Promise.all(fns.map(f => f()))
  const out = await workflow(args, agent, pipeline, parallel, () => {}, () => {})
  return { out, reportInput }
}

const withMessages = { ...ARGS, ownerMessages: 'project chat' }

test('a free-form "out of scope" refutation does not drop a scope finding', async () => {
  const { out } = await run({ args: withMessages, refutation: { basis: 'none', evidence: 'out of plan scope', ownerQuote: '', source: '' } })
  assert.equal(out.ownerDecisions.length, 1)
  assert.equal(out.scopeRefuted.length, 0)
})

test('an owner-decision refutation without a source does not count', async () => {
  const { out } = await run({ args: withMessages, refutation: { basis: 'owner-decision', evidence: '', ownerQuote: 'fine, one target', source: '' } })
  assert.equal(out.ownerDecisions.length, 1)
})

test('a well-formed refutation drops the finding but lists the claim for the owner', async () => {
  const claim = { basis: 'owner-decision', evidence: '', ownerQuote: 'one target is enough', source: 'chat 2' }
  const { out, reportInput } = await run({ args: withMessages, refutation: claim })
  assert.equal(out.ownerDecisions.length, 0)
  assert.deepEqual(out.scopeRefuted, [{ title: SCOPE.title, ownerAsk: SCOPE.ownerAsk, claimedRefutations: [claim, claim, claim] }])
  assert.equal(reportInput.scopeRefuted.length, 1)
})

test('coverage is incomplete without owner messages', async () => {
  const { out, reportInput } = await run({ refutation: NONE })
  assert.equal(out.coverage.ownerMessages, 'not provided')
  assert.equal(out.coverage.complete, false)
  assert.equal(reportInput.coverage.complete, false)
})

test('coverage is incomplete when the asks lens could not read owner messages', async () => {
  const { out } = await run({ args: withMessages, refutation: NONE, ownerMessagesRead: false })
  assert.equal(out.coverage.ownerMessages, 'not read')
  assert.equal(out.coverage.complete, false)
})

test('coverage is complete when every source was read', async () => {
  const { out } = await run({ args: withMessages, refutation: NONE })
  assert.equal(out.coverage.ownerMessages, 'read')
  assert.equal(out.coverage.complete, true)
  assert.equal(out.confirmed.length, 1)
})
