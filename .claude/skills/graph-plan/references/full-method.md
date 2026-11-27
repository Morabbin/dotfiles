---
name: graph-plan
description: Plan and run a large multi-PR project as a task dependency graph executed by parallel Claude threads: model per task, waves of one-PR-per-task threads checked locally, a planner and a coordinator, and adversarial review gates with an advisor pass between milestones.
---

# Graph plan: plan, execute in waves, review between milestones

Use this whenever someone wants to plan and execute a big body of work across many sessions or PRs, turn a roadmap into parallel tasks, decide which model runs which task, write the next wave of thread prompts, or add review gates between milestones, even if they don't say "graph".

The method turns a goal into a plan of milestones and tasks, draws the tasks as a dependency graph with a model per task, and executes the graph in waves of parallel threads, one PR per task. Between milestones an adversarial review of the whole project, filtered by advisors, changes the plan before work continues. It was distilled from a large verification project (about 50 tasks, six milestones, dozens of PRs in a few days). The "Rules that came from mistakes" are the expensive part; read them even if you skip the rest.

## Roles

In a Claude project the roles map to the owner, the project coordinator, one long-lived planning thread, and one thread per task. Outside a project, one session can play coordinator and planner, and task work can go to subagents or worktrees. Keep the roles distinct even when one session plays two, because each owns different files.

| Role | Owns | Does | Never does |
|---|---|---|---|
| **Owner** (the human) | goals, scope, irreversible steps | signs off the plan, says "go", approves merges, decides disputed findings | |
| **Coordinator** | starting threads, relaying | starts one thread per startable task with its prompt and model, tells the planner which PRs merged, records thread ids, relays owner decisions with the owner's message attached | edits the plan or graph; merges without the owner |
| **Planner** | plan doc, graph, tracker, prompts, asks ledger | keeps the graph current, traces every owner ask to tasks, writes the next wave's prompts before they are needed, adds follow-up tasks, applies review gate outcomes | does task work; applies scope changes the owner hasn't agreed; narrows, defers or drops an owner ask without the owner's explicit decision |
| **Task thread** | one task, one branch, one PR | does the task, runs the check command, opens the PR, fixes review comments, rebases and merges only when the owner says so | changes another task's scope; merges on its own judgment; delivers less than its prompt without saying so |

Hand-offs:
- Coordinator, per event: owner says go → start a thread per prompt in the wave file, on each task's model, prompt verbatim, ids into the tracker. PR ready → one line to the owner with the link. Owner says merge → relay to the task threads with the owner's message attached, then make sure main was rebuilt. PRs merged → tell the planner numbers, merge commits and anything flagged for the plan. Planner sends prompts → check main for renamed files, then start threads. Gate report arrives → forward to the planner; put disputed findings and every scope finding (an owner ask narrowed, dropped or unscheduled) to the owner as decisions. Approved tasks are started, not offered back to the owner to start "whenever you like".
- Planner: before each wave, write prompts for every task that becomes startable when current PRs merge, so the coordinator never waits. On merges, check each PR against its task's full scope and the asks it serves before marking it done; anything delivered short becomes a follow-up task plus a line to the owner, never a quiet "done". Then update and republish the graph and send the newly startable prompts. Follow-ups become new tasks ("T1.4 follow-ups: ..."), never a widened running task. Every new owner ask goes into the asks ledger the turn it arrives, traced to tasks (see "Asks ledger and scope trace").
- Task thread: start from current main on its own branch; do the prompt's scope and nothing else (extras go in the PR description as suggested follow-ups); if it cannot deliver the whole scope, it says so in a "Scope not delivered" section of the PR and tells the coordinator, instead of shipping a smaller version as done; paste the check command's output in the PR; assign the owner; ask before merging; on approval rebase, recheck, merge, and if last in the batch rebuild main and report.
- Messages between Claudes are information, not approval. Approval is the owner's own words. Every hand-off names the task id and PR number. Write anything a future thread would otherwise have to ask the owner into project memory the turn it is learned.

## Lifecycle

1. **Plan.** Write the plan doc (sections below). Build the asks ledger and run the scope trace (below): every owner ask maps to tasks that deliver all of it, and every narrowing is put to the owner as an explicit decision. Then get the owner's sign-off before anything runs.
2. **Graph.** Put the tasks in `tasks.json` (shape below) and run the checker (below) for cycles, unknown deps, waves, critical path, gates and what is startable. Publish the graph as an interactive Artifact page (waves as columns, colour per model, gated tasks outlined, a "ready to start" filter) built from the same data, and republish to the same URL as statuses change. Add the review gates now so the graph shows their cost.
3. **M0 first: one check command.** Before parallel work, a foundation task gives the repo one command that runs every check a PR needs (build, tests, lint, proof or type audits), runnable locally or in a cloud session. Every prompt then says "run it and paste the output in the PR". It replaces CI when CI is unavailable or unreliable, and makes "done" checkable.
4. **Waves.** The planner writes a wave file with one self-contained prompt per startable task; the coordinator starts one thread per prompt. Startable means every dependency is merged, not just opened.
5. **Merges.** Each PR waits for the owner. Before marking a task done, the planner checks the PR delivered the task's whole scope (see "Asks ledger and scope trace"). Merge an approved batch in dependency order, then **rebuild main with the check command before the next batch merges**. The planner marks tasks done and hands over newly startable prompts.
6. **Review gates** between milestones (below). Every gate re-checks every owner ask against what was delivered.
7. **Repeat** 4 to 6. The closing write-up is the last review unless the owner adds a gate.

## Files the method keeps

In a shared folder every thread can read (in a Claude project, the project files folder), not in the repo: they change faster than PRs merge and some are confidential.
- the plan doc (a Claude Doc or similar), `tasks.json` and the published graph page;
- `asks.md`: the asks ledger, every owner ask traced to tasks (below);
- `tracker.md`: task, thread id, status, PR;
- `wave-N-threads.md` / `pending-next.md`: prompts ready to send, each with starts-when, model, unlocks;
- `reviews/R<k>.md`: each gate's report and the plan changes it caused;
- a confidential findings file (for example `divergences.md`).

## Asks ledger and scope trace

The costliest failure is silent narrowing: an ask the owner agreed in the plan becomes a task that delivers a fraction of it, and nobody tells the owner until weeks later. It hides in many forms: a feature cut to its first slice; a subset of targets; "done" criteria widened after sign-off (accepting "partial" or "reported" where the ask said "all" or "proved"); optional wording in a prompt ("implement X or record why not", "where feasible", "if time permits"); items moved out of scope in a list the owner never reviewed; approved tasks never started, or offered back to the owner; deferred items with no task or trigger; questions put to the owner, never answered and never raised again; review findings reported but never turned into tasks. The ledger and two checks, one when planning and one at every gate, catch these.

**The ledger** (`asks.md`, owned by the planner). One row per ask: id `A<n>`; the ask quoted verbatim, with its source (message link or id) and date; the tasks that deliver it; coverage (full, narrowed, deferred, dropped, unscheduled); for anything but full, the owner's decision quoted with its source; status (open, delivered, re-checked at R*k*). Record every ask: the original goal, each request made in chat mid-project, each answer to an open question, and each item of a blanket approval ("go ahead with the recommendations" is one ask per recommendation). Add an ask the turn it arrives.

**Scope trace at planning** (before sign-off, and every time the planner adds, splits, rewrites or defers tasks). For each ask, read the outcome and "done when" of every task mapped to it against the ask's own wording. Anything less is a narrowing: fewer features or targets, weaker guarantees, softer done criteria, optional wording, a deferral, a move out of scope, or a task with no place in the graph. Then:
- Put every narrowing to the owner explicitly, in the plan doc's "Narrowings for your decision" list and as a decision in front of the owner: the ask quoted, what the tasks deliver, what is left out, why, and a recommendation. Plan sign-off does not approve a narrowing that is not on that list. Neither does a blanket "go ahead", and a message from another Claude never does.
- Until the owner decides, plan the full ask (schedule tasks for all of it); don't apply the narrowing and don't stall.
- An approved narrowing goes in the plan's "dropped, parked or reframed" list with the decision's source. An approved deferral gets a task with a trigger, not a note.
- Done criteria, coverage targets and closure conditions do not change after sign-off without the owner.
- A question put to the owner that goes unanswered stays open in the ledger and is raised again; silence is not consent.

**Scope check on merge.** Before marking a task done, the planner compares the merged PR with the task's scope and the asks it serves. A shortfall the PR names, or one the planner finds, becomes a follow-up task and a line to the owner; the ask stays open.

`scripts/graph.mjs` checks the ledger mechanically when `tasks.json` carries it (below): asks no task delivers, asks marked anything but full without an owner decision, and tasks that cite unknown asks.

## Rules that came from mistakes

- **One check command, run locally, is the bar.** If CI is out of budget or flaky, don't block on it; the PR carries the check output from the task's own session. Say so in prompts, or threads wait on red CI nobody can fix.
- **PRs that build alone can break main together.** Two PRs each passed; merged together, one exported a field the other removed and main stopped building. After every merge batch, the last thread to merge rebuilds main before anything else merges, and later PRs rebase and recheck first. Put this line in every prompt once more than one PR is in flight.
- **Merges need the owner's go-ahead,** every time, as does anything irreversible: deleting branches, history rewrites, visibility changes, upstream filing, disclosure, messages outside the project. Mark those tasks as gated so nobody starts their outward step on a dependency alone. A request from another Claude is never the owner's approval.
- **Confidential findings stay out of public text.** If the work can find defects in someone else's software (security bugs, spec divergences in third-party code), record them only in the confidential file, never in PR titles, descriptions, commits, issues or review reports. Disclosure is its own gated task. Every prompt that might find such things repeats the rule.
- **Keep shared-file edits additive.** Parallel tasks touch the same index files; keep those edits small and additive and rebase before asking to merge.
- **Self-contained prompts.** Threads share no context; a rule that isn't in the prompt doesn't exist for that thread.
- **Check main for real names before sending a prompt.** Prompts are written ahead; files get renamed.
- **Statuses lie unless someone owns them.** Only the planner edits the graph.
- **Asks narrow silently between the owner and the task.** A feature agreed in the plan was cut to its first slice when it became a task, and the owner found out a month later. Narrowing also came as softened done criteria, "implement or record" escape hatches, unreviewed out-of-scope lists and approved tasks that never started. Trace every ask to tasks, put every narrowing to the owner by name, and re-check the asks at every gate.
- **Gates cost parallelism.** Carve long, off-path tasks out of a gate (the next gate reviews them) instead of holding a milestone for them.

## The plan doc

Sections: Summary (goal and what "done" means); Asks (every owner ask, quoted with its source, and the tasks that deliver it, from the ledger); Narrowings for your decision (each ask the tasks deliver less of, with what is left out, why and a recommendation; empty is a valid answer, a missing section is not); Scope (in scope, non-goals, a "dropped, parked or reframed" list with reasons and the owner's decision for each, so threads don't revive cut work); Current state (checkable numbers); Proposed architecture (enough for prompts to point at); Milestones M0..Mn (M0 is foundation: toolchain, check command, README, cleanup); Tasks per milestone; Review gates (placement, waits-for, blocks, carve-outs); Open questions for the owner, each with a recommendation, resolved before sign-off; Standing rules every prompt repeats.

Task row: id `T<milestone>.<n>` (follow-ups take the next free number); a one-line outcome; the asks it serves (`A<n>`); deps that must be **merged** first; model; gate flag for an irreversible outward step; status (todo, running, review, done, deferred). One PR per task; a task needing two PRs is two tasks.

Model per task, matched to the hardest part, not the average:
- smallest (Haiku-class): mechanical, fully specified work: fixed-spec scripts, inventories, archiving, labelled corpora, checklist triage;
- mid (Sonnet-class): ordinary engineering with clear acceptance criteria, features following a pattern, docs rewrites, per-target harnesses, benchmarks, wiring;
- large (Opus-class): proofs, parsers, protocol state machines, anything where a subtle mistake survives tests; spec-style writing;
- largest (Fable-class), sparingly: designs everything downstream depends on, and the review gates.
The owner can override; record overrides in the plan.

## Task prompt template

Wave file header: plan link, graph link, repo and `main` sha with what just merged, which tasks are startable and which wait on what, and a concurrency note naming tasks that touch the same files.

One entry:

```
## <id> · <thread title>
- Thread title: <verb-first, in the owner's words>
- Model: <model>
- Depends on: <ids and PR numbers>
- Unlocks: <ids>
- Gate: <only if the outward step needs the owner>
- Asks: <A-ids this task serves>

> Task <id> of the <project> plan (<plan link>; read <section> first). Repo <owner/repo>, start from current `main`. <"It finishes what <id> (PR #n) left open; read that PR first.">
>
> Goal: <one sentence on the result and why it matters>.
> Owner's ask: "<the ask, verbatim>" (<source>). This task delivers <all of it | the part named below; the rest is <task id> | the owner-approved narrowing <source>>.
> 1. <scope item naming real files>
> 2. <scope item>
> <What not to do, if tempting: "Do not file anything upstream.">
>
> Done when: <check command passes>, <checkable condition>, <what the PR shows>.
>
> If you cannot deliver all of this scope, do not ship a smaller version as done or record the gap as acceptable: list what is missing under "Scope not delivered" in the PR and tell the coordinator.
>
> Standing rules: <all of them, in full>. Run `<check command>` locally and paste its output in the PR. Keep shared-file edits additive. Before merging, rebase on main and rerun the check; if your PR is the last of a merge batch, rebuild main and report. <Confidentiality rule if relevant.> Open a PR, but ask <owner> before merging.
```

Before sending: the scope and done criteria cover the whole ask the task serves (or an owner-approved narrowing, cited), with no optional wording ("or record why not", "where feasible") the owner didn't approve; file names exist on current main; every dependency is merged; standing rules are complete and current; constraints added by earlier tasks are included where they apply; the confidentiality line is there for any task touching someone else's software.

## Review gates

**Placement.** Gate R*k* sits between milestone M*k* and M*k*+1. It waits for every M*k* task (minus named carve-outs) and the previous gate. It blocks every M*k*+1 task not yet started when the gate is added; running or merged tasks are not stopped, the review covers them as they stand. It covers the whole project, not just M*k*: code, tests, proofs or type-level guarantees, docs, the plan, graph, tracker, open follow-ups and the confidential file. A carved-out task is reviewed by the next gate. If milestones overlap in time, define gates by what they block. If gates are added mid-project, merge finished milestones' boundaries into the first gate. No gate after the last milestone by default. Tell the owner what the gates add to the critical path. Start a gate only after its PRs merged and main was rebuilt.

**Flow.**
1. *Review.* A reviewer (largest model), read-only (no pushes, PRs or plan edits), assumes the work is worse than it claims and looks for what is wrong, weak or missing. Every gate runs the asks lens (below), whatever other lenses it picks.
2. *Advisor pass.* A scope finding (an owner ask narrowed, weakened, dropped or unscheduled) can be refuted only by evidence that the whole ask was delivered or by the owner's own decision, quoted with its source. "The plan says so", "out of the plan's scope" or "agreed by the planner" is not a refutation, because the plan is what is being checked. Two persistent read-only advisors, ideally from different model families (the pr-advisors pattern; otherwise two strong agents, and the report says which ran), each get the full findings and try to refute every one. The reviewer cross-shares objections until they agree or the disagreement is stated, and settles each finding as **confirmed** (survives both, with evidence: file:line, command output, audit line), **disputed** (kept with both positions) or **dropped** (kept with the reason, so later gates don't re-raise it).
3. *Report* in `reviews/R<k>.md`: Summary (five lines max); Findings (id, severity, verdict, evidence, suggested plan change); Scope trace (every ask in the ledger: what was asked, what was delivered, coverage, evidence); Owner decisions needed (every narrowing found, the ask quoted); Dropped findings; Advisor record. A summary of at most ten lines goes to the coordinator. Confidential findings go only to the confidential file.
4. *Plan update* by the planner: for each confirmed finding, add a task (model, deps, prompt), fold it into an existing prompt, change deps, or record why no change. A scope finding is never closed with "no change": the planner restores the full ask (adds and schedules the missing tasks, since the owner already asked for them) and tells the owner, or puts the narrowing to the owner as a decision. Disputed findings and any change to goals or scope go to the owner as a decision, never applied silently. Update the ledger with each ask's new coverage. Update plan, graph and tracker; append "Plan changes" to `R<k>.md`.
5. *Gate opens* when plan changes are recorded and every scope finding is either restored in the graph or in front of the owner; new prerequisite tasks the review added also block. A narrowing still awaiting the owner stays open in the ledger and every later gate raises it again.

**Lenses.** Always run **asks vs. delivered**: rebuild the list of owner asks from the ledger *and* the owner's own messages since the plan began (the ledger itself can be incomplete), and for each ask compare its wording with what was merged and what is scheduled. Flag: asks with no task; tasks that deliver a subset; done criteria or closure conditions widened after sign-off; optional wording in prompts; items moved out of scope without the owner's decision; deferrals with no task; approved tasks never started or handed back to the owner; owner questions never answered; review findings never turned into tasks; and a missing or stale ledger. Then pick and specialize the rest: claims vs. evidence (every claim backed by a test, proof or measurement that says what the prose says; vacuous or too-weak guarantees; run the check command); spec or requirements fidelity; trusted base (what is unverified or untested and whether that is documented); tests vs. guarantees; plan health (wrong premises, missing tasks, wrong deps, stale prompts, unscheduled follow-ups, whether the plan still reaches the goal); exposure (secrets, unsafe demo defaults, things that shouldn't be public); tasks carried over from the previous gate.

**Reviewer prompt:**

> Gate R<k> of the <project> plan (<plan link>; graph <graph link>). Repo <owner/repo>, current `main`. Read-only, adversarial review of the whole project at the end of M<k> (<name>). Do not push, open PRs or edit plan files. Inputs: the repo, the plan folder (asks ledger, tracker, pending prompts, earlier reviews, confidential file), the plan doc, the owner's messages since the plan began, PRs merged since the last gate. Goal: find what is wrong, weak or missing, assuming the work is not as good as it claims. Check at least: asks vs. delivered (every owner ask, quoted, against what merged and what is scheduled; any narrowing not decided by the owner is a finding), <lenses>. Carried over: <carve-outs>. Then run the advisor pass: two read-only advisors (<models>) each try to refute every finding; cross-share objections; settle each as confirmed, disputed or dropped, with evidence. A scope finding is refuted only by evidence of full delivery or the owner's quoted decision. Output <path>/reviews/R<k>.md (Summary, Findings, Scope trace, Owner decisions needed, Dropped findings, Advisor record) and a summary of at most 10 lines to the coordinator. Confidential findings only into <confidential file>. Standing rules: <rules>. Run `<check command>` locally. Read-only.

**As a Workflow**, when the owner has opted into multi-agent workflows: pipeline over the lenses, one read-only reviewer agent per lens returning findings `{title, severity, detail, evidence, suggestedPlanChange, confidential}`; for each finding three skeptic agents try to refute it, and it survives unless two refute. Dedupe survivors by title (barrier), then two advisor agents (different models if available) each judge every survivor `{id, holds, reason, severity, confidential}` and list anything the review missed as findings, each with its own confidential flag. Both hold → confirmed; neither → dropped; split or a missing advisor → disputed. The asks lens always runs and also returns a scope trace (one row per ask); skeptic and advisor refutations of a scope finding count only with a structured basis: full delivery with evidence, or the owner's decision quoted with its source. Code checks that form, not its truth, so every scope finding dropped this way is listed for the owner with the claimed basis. Four safeguards (all but the scope one were learned from a review of the first version):
- **Confidentiality is enforced in code, not by prompt.** Every finding, advisor verdict and advisor addition carries a confidential flag; a finding becomes confidential if any advisor flags its reason. Confidential items never reach the report agent's input; they come back only in the `confidential` return value. Advisor additions are marked unverified in the report.
- **Missing coverage is never an empty review.** A lens reviewer or advisor that returns nothing, or owner messages that were not provided or not read, is recorded in a `coverage` value (`missingLenses`, `ownerMessages`, `advisorsReturned`, `complete`), and the report has a Coverage section saying plainly whether the gate is complete. An incomplete gate must not open.
- **Scope findings go to the owner.** Confirmed and disputed scope findings come back in an `ownerDecisions` value, refuted ones in `scopeRefuted` with their claimed basis, and the report has Scope trace, Owner decisions needed and Refuted scope findings sections. A gate whose asks lens returned no trace is incomplete.
- **Escape data in any rendered page.** If you render the graph or report to HTML, escape every task or finding field (or use textContent); task names come from agents and can contain markup.

A final agent writes the report markdown from the non-confidential findings plus coverage. Return `{markdown, confirmed, disputed, dropped, ownerDecisions, scopeRefuted, scopeTrace, confidential, coverage}`; the caller writes the report and appends confidential findings to the confidential file only. The workflow never edits the plan. A full tested script is bundled as `scripts/milestone-review.js` (tests: `node --test scripts/milestone-review.test.mjs`); adapt it rather than rewriting from scratch.

## Graph data and checker

```json
{
  "title": "Example task graph",
  "planUrl": "https://example.com/plan",
  "models": ["Haiku", "Sonnet", "Opus", "Fable"],
  "milestones": { "M0": "Foundation", "M1": "Core library", "M2": "Integrations" },
  "asks": [
    { "id": "A1", "text": "A verified parser, with benchmarks", "source": "kickoff message, 2026-01-05", "coverage": "full" },
    { "id": "A2", "text": "Support every integration target", "source": "chat, 2026-01-09", "coverage": "narrowed", "decision": "owner, chat 2026-01-10: first target only for now" }
  ],
  "tasks": [
    { "id": "T0.1", "milestone": "M0", "name": "One local check command", "model": "Haiku", "deps": [], "status": "done" },
    { "id": "T0.2", "milestone": "M0", "name": "Delete stale branches", "model": "Haiku", "deps": [], "gate": true },
    { "id": "T1.1", "milestone": "M1", "name": "Parser with a round-trip proof", "model": "Opus", "deps": ["T0.1"], "asks": ["A1"], "status": "running" },
    { "id": "T1.2", "milestone": "M1", "name": "Benchmarks", "model": "Sonnet", "deps": ["T1.1"], "asks": ["A1"] },
    { "id": "R1", "milestone": "M1", "kind": "gate", "name": "Review gate after M0 and M1; T1.2 carved out to R2", "model": "Fable", "deps": ["T0.1", "T0.2", "T1.1"] },
    { "id": "T2.1", "milestone": "M2", "name": "First integration", "model": "Sonnet", "deps": ["T1.1", "R1"], "asks": ["A2"] }
  ]
}
```

`graph.mjs` (Node 18+; write it out when needed, run `node graph.mjs tasks.json [--json]`):

```js
import { readFileSync } from "node:fs";
const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage: node graph.mjs tasks.json [--json]"); process.exit(2); }
const data = JSON.parse(readFileSync(file, "utf8"));
const tasks = data.tasks;
const byId = Object.fromEntries(tasks.map(t => [t.id, t]));
const status = t => t.status || "todo";
const errors = [];
for (const t of tasks) {
  if (!data.milestones?.[t.milestone]) errors.push(`${t.id}: unknown milestone ${t.milestone}`);
  for (const d of t.deps) if (!byId[d]) errors.push(`${t.id}: unknown dep ${d}`);
  if (status(t) === "done" && t.deps.some(d => byId[d] && status(byId[d]) !== "done"))
    errors.push(`${t.id}: done but depends on unfinished ${t.deps.filter(d => status(byId[d]) !== "done").join(", ")}`);
}
if (tasks.length !== Object.keys(byId).length) errors.push("duplicate task ids");
// Asks ledger: every owner ask is delivered by some task, and every narrowing has the owner's decision.
const asks = data.asks || [];
const askIds = new Set(asks.map(a => a.id));
for (const t of tasks) for (const a of t.asks || []) if (!askIds.has(a)) errors.push(`${t.id}: unknown ask ${a}`);
const scope = [];
if (!data.asks) scope.push("no asks ledger in tasks.json: owner asks are not traced to tasks");
for (const a of asks) {
  const by = tasks.filter(t => (t.asks || []).includes(a.id) && status(t) !== "deferred");
  const cov = a.coverage || "full";
  if (cov !== "dropped" && !by.length) scope.push(`${a.id} has no scheduled task: "${a.text}"`);
  if (cov !== "full" && !a.decision) scope.push(`${a.id} is ${cov} without an owner decision: "${a.text}"`);
}
const depth = {}, visiting = new Set();
const dOf = id => {
  if (id in depth) return depth[id];
  if (visiting.has(id)) { errors.push(`cycle through ${id}`); return 0; }
  visiting.add(id);
  const ds = byId[id].deps.filter(d => byId[d]);
  depth[id] = ds.length ? 1 + Math.max(...ds.map(dOf)) : 0;
  visiting.delete(id);
  return depth[id];
};
tasks.forEach(t => dOf(t.id));
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
const waves = [];
tasks.forEach(t => (waves[depth[t.id]] ||= []).push(t.id));
const best = {};
const chain = id => best[id] ||= (() => {
  let b = [];
  for (const d of byId[id].deps) { const c = chain(d); if (c.length > b.length) b = c; }
  return [...b, id];
})();
let critical = [];
tasks.forEach(t => { const c = chain(t.id); if (c.length > critical.length) critical = c; });
const startable = tasks.filter(t => status(t) === "todo" && t.deps.every(d => status(byId[d]) === "done"));
const gates = tasks.filter(t => t.kind === "gate").map(g => ({
  id: g.id, waitsFor: g.deps, blocks: tasks.filter(t => t.deps.includes(g.id)).map(t => t.id),
}));
const out = {
  counts: Object.fromEntries(["todo", "running", "review", "done", "deferred"].map(s => [s, tasks.filter(t => status(t) === s).length])),
  waves, critical,
  startable: startable.map(t => ({ id: t.id, model: t.model, needsOwner: !!t.gate, name: t.name })),
  gates, scope,
};
if (flag === "--json") { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
console.log(`${tasks.length} tasks: ${Object.entries(out.counts).filter(([, n]) => n).map(([s, n]) => `${n} ${s}`).join(", ")}`);
waves.forEach((w, i) => console.log(`wave ${i + 1}: ${w.join(" ")}`));
console.log(`critical path (${critical.length}): ${critical.join(" -> ")}`);
gates.forEach(g => console.log(`gate ${g.id}: waits for ${g.waitsFor.join(" ")}; blocks ${g.blocks.join(" ") || "nothing"}`));
console.log(startable.length ? "startable now:" : "startable now: none");
startable.forEach(t => console.log(`  ${t.id} (${t.model}${t.gate ? ", needs owner for outward step" : ""}) ${t.name}`));
console.log(scope.length ? `scope trace: ${scope.length} problem(s) to put to the owner` : `scope trace: ${asks.length} asks, all traced`);
scope.forEach(s => console.log(`  ${s}`));
```

## Adapting to another repo

Change: the check command, milestone names, standing rules, confidentiality scope and review lenses. Keep: the roles, gated irreversible steps, self-contained prompts, rebuild-after-batch, the asks ledger with its scope trace at planning and at every gate, and the gate flow.
