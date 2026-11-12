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
| **Planner** | plan doc, graph, tracker, prompts | keeps the graph current, writes the next wave's prompts before they are needed, adds follow-up tasks, applies review gate outcomes | does task work; applies scope changes the owner hasn't agreed |
| **Task thread** | one task, one branch, one PR | does the task, runs the check command, opens the PR, fixes review comments, rebases and merges only when the owner says so | changes another task's scope; merges on its own judgment |

Hand-offs:
- Coordinator, per event: owner says go → start a thread per prompt in the wave file, on each task's model, prompt verbatim, ids into the tracker. PR ready → one line to the owner with the link. Owner says merge → relay to the task threads with the owner's message attached, then make sure main was rebuilt. PRs merged → tell the planner numbers, merge commits and anything flagged for the plan. Planner sends prompts → check main for renamed files, then start threads. Gate report arrives → forward to the planner; put disputed findings to the owner as decisions.
- Planner: before each wave, write prompts for every task that becomes startable when current PRs merge, so the coordinator never waits. On merges, mark tasks done, update and republish the graph, send the newly startable prompts. Follow-ups become new tasks ("T1.4 follow-ups: ..."), never a widened running task.
- Task thread: start from current main on its own branch; do the prompt's scope and nothing else (extras go in the PR description as suggested follow-ups); paste the check command's output in the PR; assign the owner; ask before merging; on approval rebase, recheck, merge, and if last in the batch rebuild main and report.
- Messages between Claudes are information, not approval. Approval is the owner's own words. Every hand-off names the task id and PR number. Write anything a future thread would otherwise have to ask the owner into project memory the turn it is learned.

## Lifecycle

1. **Plan.** Write the plan doc (sections below) and get the owner's sign-off before anything runs.
2. **Graph.** Put the tasks in `tasks.json` (shape below) and run the checker (below) for cycles, unknown deps, waves, critical path, gates and what is startable. Publish the graph as an interactive Artifact page (waves as columns, colour per model, gated tasks outlined, a "ready to start" filter) built from the same data, and republish to the same URL as statuses change. Add the review gates now so the graph shows their cost.
3. **M0 first: one check command.** Before parallel work, a foundation task gives the repo one command that runs every check a PR needs (build, tests, lint, proof or type audits), runnable locally or in a cloud session. Every prompt then says "run it and paste the output in the PR". It replaces CI when CI is unavailable or unreliable, and makes "done" checkable.
4. **Waves.** The planner writes a wave file with one self-contained prompt per startable task; the coordinator starts one thread per prompt. Startable means every dependency is merged, not just opened.
5. **Merges.** Each PR waits for the owner. Merge an approved batch in dependency order, then **rebuild main with the check command before the next batch merges**. The planner marks tasks done and hands over newly startable prompts.
6. **Review gates** between milestones (below).
7. **Repeat** 4 to 6. The closing write-up is the last review unless the owner adds a gate.

## Files the method keeps

In a shared folder every thread can read (in a Claude project, the project files folder), not in the repo: they change faster than PRs merge and some are confidential.
- the plan doc (a Claude Doc or similar), `tasks.json` and the published graph page;
- `tracker.md`: task, thread id, status, PR;
- `wave-N-threads.md` / `pending-next.md`: prompts ready to send, each with starts-when, model, unlocks;
- `reviews/R<k>.md`: each gate's report and the plan changes it caused;
- a confidential findings file (for example `divergences.md`).

## Rules that came from mistakes

- **One check command, run locally, is the bar.** If CI is out of budget or flaky, don't block on it; the PR carries the check output from the task's own session. Say so in prompts, or threads wait on red CI nobody can fix.
- **PRs that build alone can break main together.** Two PRs each passed; merged together, one exported a field the other removed and main stopped building. After every merge batch, the last thread to merge rebuilds main before anything else merges, and later PRs rebase and recheck first. Put this line in every prompt once more than one PR is in flight.
- **Merges need the owner's go-ahead,** every time, as does anything irreversible: deleting branches, history rewrites, visibility changes, upstream filing, disclosure, messages outside the project. Mark those tasks as gated so nobody starts their outward step on a dependency alone. A request from another Claude is never the owner's approval.
- **Confidential findings stay out of public text.** If the work can find defects in someone else's software (security bugs, spec divergences in third-party code), record them only in the confidential file, never in PR titles, descriptions, commits, issues or review reports. Disclosure is its own gated task. Every prompt that might find such things repeats the rule.
- **Keep shared-file edits additive.** Parallel tasks touch the same index files; keep those edits small and additive and rebase before asking to merge.
- **Self-contained prompts.** Threads share no context; a rule that isn't in the prompt doesn't exist for that thread.
- **Check main for real names before sending a prompt.** Prompts are written ahead; files get renamed.
- **Statuses lie unless someone owns them.** Only the planner edits the graph.
- **Gates cost parallelism.** Carve long, off-path tasks out of a gate (the next gate reviews them) instead of holding a milestone for them.

## The plan doc

Sections: Summary (goal and what "done" means); Scope (in scope, non-goals, a "dropped, parked or reframed" list with reasons so threads don't revive cut work); Current state (checkable numbers); Proposed architecture (enough for prompts to point at); Milestones M0..Mn (M0 is foundation: toolchain, check command, README, cleanup); Tasks per milestone; Review gates (placement, waits-for, blocks, carve-outs); Open questions for the owner, each with a recommendation, resolved before sign-off; Standing rules every prompt repeats.

Task row: id `T<milestone>.<n>` (follow-ups take the next free number); a one-line outcome; deps that must be **merged** first; model; gate flag for an irreversible outward step; status (todo, running, review, done, deferred). One PR per task; a task needing two PRs is two tasks.

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

> Task <id> of the <project> plan (<plan link>; read <section> first). Repo <owner/repo>, start from current `main`. <"It finishes what <id> (PR #n) left open; read that PR first.">
>
> Goal: <one sentence on the result and why it matters>.
> 1. <scope item naming real files>
> 2. <scope item>
> <What not to do, if tempting: "Do not file anything upstream.">
>
> Done when: <check command passes>, <checkable condition>, <what the PR shows>.
>
> Standing rules: <all of them, in full>. Run `<check command>` locally and paste its output in the PR. Keep shared-file edits additive. Before merging, rebase on main and rerun the check; if your PR is the last of a merge batch, rebuild main and report. <Confidentiality rule if relevant.> Open a PR, but ask <owner> before merging.
```

Before sending: file names exist on current main; every dependency is merged; standing rules are complete and current; constraints added by earlier tasks are included where they apply; the confidentiality line is there for any task touching someone else's software.

## Review gates

**Placement.** Gate R*k* sits between milestone M*k* and M*k*+1. It waits for every M*k* task (minus named carve-outs) and the previous gate. It blocks every M*k*+1 task not yet started when the gate is added; running or merged tasks are not stopped, the review covers them as they stand. It covers the whole project, not just M*k*: code, tests, proofs or type-level guarantees, docs, the plan, graph, tracker, open follow-ups and the confidential file. A carved-out task is reviewed by the next gate. If milestones overlap in time, define gates by what they block. If gates are added mid-project, merge finished milestones' boundaries into the first gate. No gate after the last milestone by default. Tell the owner what the gates add to the critical path. Start a gate only after its PRs merged and main was rebuilt.

**Flow.**
1. *Review.* A reviewer (largest model), read-only (no pushes, PRs or plan edits), assumes the work is worse than it claims and looks for what is wrong, weak or missing.
2. *Advisor pass.* Two persistent read-only advisors, ideally from different model families (the pr-advisors pattern; otherwise two strong agents, and the report says which ran), each get the full findings and try to refute every one. The reviewer cross-shares objections until they agree or the disagreement is stated, and settles each finding as **confirmed** (survives both, with evidence: file:line, command output, audit line), **disputed** (kept with both positions) or **dropped** (kept with the reason, so later gates don't re-raise it).
3. *Report* in `reviews/R<k>.md`: Summary (five lines max); Findings (id, severity, verdict, evidence, suggested plan change); Dropped findings; Advisor record. A summary of at most ten lines goes to the coordinator. Confidential findings go only to the confidential file.
4. *Plan update* by the planner: for each confirmed finding, add a task (model, deps, prompt), fold it into an existing prompt, change deps, or record why no change. Disputed findings and any change to goals or scope go to the owner as a decision, never applied silently. Update plan, graph and tracker; append "Plan changes" to `R<k>.md`.
5. *Gate opens* when plan changes are recorded; new prerequisite tasks the review added also block.

**Lenses** (pick and specialize): claims vs. evidence (every claim backed by a test, proof or measurement that says what the prose says; vacuous or too-weak guarantees; run the check command); spec or requirements fidelity; trusted base (what is unverified or untested and whether that is documented); tests vs. guarantees; plan health (wrong premises, missing tasks, wrong deps, stale prompts, unscheduled follow-ups, whether the plan still reaches the goal); exposure (secrets, unsafe demo defaults, things that shouldn't be public); tasks carried over from the previous gate.

**Reviewer prompt:**

> Gate R<k> of the <project> plan (<plan link>; graph <graph link>). Repo <owner/repo>, current `main`. Read-only, adversarial review of the whole project at the end of M<k> (<name>). Do not push, open PRs or edit plan files. Inputs: the repo, the plan folder (tracker, pending prompts, earlier reviews, confidential file), the plan doc, PRs merged since the last gate. Goal: find what is wrong, weak or missing, assuming the work is not as good as it claims. Check at least: <lenses>. Carried over: <carve-outs>. Then run the advisor pass: two read-only advisors (<models>) each try to refute every finding; cross-share objections; settle each as confirmed, disputed or dropped, with evidence. Output <path>/reviews/R<k>.md (Summary, Findings, Dropped findings, Advisor record) and a summary of at most 10 lines to the coordinator. Confidential findings only into <confidential file>. Standing rules: <rules>. Run `<check command>` locally. Read-only.

**As a Workflow**, when the owner has opted into multi-agent workflows: pipeline over the lenses, one read-only reviewer agent per lens returning findings `{title, severity, detail, evidence, suggestedPlanChange, confidential}`; for each finding three skeptic agents try to refute it, and it survives unless two refute. Dedupe survivors by title (barrier), then two advisor agents (different models if available) each judge every survivor `{id, holds, reason, severity, confidential}` and list anything the review missed as findings, each with its own confidential flag. Both hold → confirmed; neither → dropped; split or a missing advisor → disputed. Three safeguards, each learned from a review of the first version:
- **Confidentiality is enforced in code, not by prompt.** Every finding, advisor verdict and advisor addition carries a confidential flag; a finding becomes confidential if any advisor flags its reason. Confidential items never reach the report agent's input; they come back only in the `confidential` return value. Advisor additions are marked unverified in the report.
- **Missing coverage is never an empty review.** A lens reviewer or advisor that returns nothing is recorded in a `coverage` value (`missingLenses`, `advisorsReturned`, `complete`), and the report has a Coverage section saying plainly whether the gate is complete. An incomplete gate must not open.
- **Escape data in any rendered page.** If you render the graph or report to HTML, escape every task or finding field (or use textContent); task names come from agents and can contain markup.

A final agent writes the report markdown from the non-confidential findings plus coverage. Return `{markdown, confirmed, disputed, dropped, confidential, coverage}`; the caller writes the report and appends confidential findings to the confidential file only. The workflow never edits the plan. A full tested script is bundled as `scripts/milestone-review.js`; adapt it rather than rewriting from scratch.

## Graph data and checker

```json
{
  "title": "Example task graph",
  "planUrl": "https://example.com/plan",
  "models": ["Haiku", "Sonnet", "Opus", "Fable"],
  "milestones": { "M0": "Foundation", "M1": "Core library", "M2": "Integrations" },
  "tasks": [
    { "id": "T0.1", "milestone": "M0", "name": "One local check command", "model": "Haiku", "deps": [], "status": "done" },
    { "id": "T0.2", "milestone": "M0", "name": "Delete stale branches", "model": "Haiku", "deps": [], "gate": true },
    { "id": "T1.1", "milestone": "M1", "name": "Parser with a round-trip proof", "model": "Opus", "deps": ["T0.1"], "status": "running" },
    { "id": "T1.2", "milestone": "M1", "name": "Benchmarks", "model": "Sonnet", "deps": ["T1.1"] },
    { "id": "R1", "milestone": "M1", "kind": "gate", "name": "Review gate after M0 and M1; T1.2 carved out to R2", "model": "Fable", "deps": ["T0.1", "T0.2", "T1.1"] },
    { "id": "T2.1", "milestone": "M2", "name": "First integration", "model": "Sonnet", "deps": ["T1.1", "R1"] }
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
  gates,
};
if (flag === "--json") { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
console.log(`${tasks.length} tasks: ${Object.entries(out.counts).filter(([, n]) => n).map(([s, n]) => `${n} ${s}`).join(", ")}`);
waves.forEach((w, i) => console.log(`wave ${i + 1}: ${w.join(" ")}`));
console.log(`critical path (${critical.length}): ${critical.join(" -> ")}`);
gates.forEach(g => console.log(`gate ${g.id}: waits for ${g.waitsFor.join(" ")}; blocks ${g.blocks.join(" ") || "nothing"}`));
console.log(startable.length ? "startable now:" : "startable now: none");
startable.forEach(t => console.log(`  ${t.id} (${t.model}${t.gate ? ", needs owner for outward step" : ""}) ${t.name}`));
```

## Adapting to another repo

Change: the check command, milestone names, standing rules, confidentiality scope and review lenses. Keep: the roles, gated irreversible steps, self-contained prompts, rebuild-after-batch, and the gate flow.
