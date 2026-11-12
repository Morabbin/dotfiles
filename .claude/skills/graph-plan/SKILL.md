---
name: graph-plan
description: Run a large multi-PR project as a dependency graph of tasks executed by parallel Claude threads, with a model picked per task, waves of one-thread-per-task PRs checked locally, a planning thread that owns the graph, a coordinator that starts threads and relays merges, and an adversarial whole-project review gate with an advisor pass between milestones that feeds plan updates. Use this whenever someone wants to plan and execute a big body of work across many sessions or PRs, turn a roadmap into parallel tasks, decide which model runs which task, write the next wave of thread prompts, add review gates between milestones, or asks for "the graph plan" or "the graph-plan method" on a new repo, even if they don't say "graph".
---

# Graph plan: plan, execute in waves, review between milestones

This skill turns a goal into a plan of milestones and tasks, draws the tasks as a dependency graph with a model per task, and executes the graph in waves of parallel threads, one PR per task. Between milestones an adversarial review of the whole project, filtered by advisors, changes the plan before work continues.

It was distilled from a large verification project (about 50 tasks, six milestones, dozens of PRs in a few days). The lessons in "Rules that came from mistakes" are the expensive part; read them even if you skip the rest.

## Roles

Four roles. In a Claude project they map to the owner, the project coordinator, one long-lived planning thread, and one thread per task. Outside a project, one session can play coordinator and planner, and task work can go to subagents or worktrees. Keep the roles distinct even when one session plays two of them, because each owns different files.

| Role | Owns | Does | Never does |
|---|---|---|---|
| **Owner** (the human) | goals, scope, irreversible steps | signs off the plan, says "go", approves merges, decides disputed findings | |
| **Coordinator** | starting threads, relaying | starts one thread per startable task with its prompt and model, tells the planner which PRs merged, records thread ids, passes owner decisions along with the owner's message attached | edits the plan or graph; merges without the owner |
| **Planner** | plan doc, graph, tracker, prompts | keeps the graph current, writes the next wave's prompts before they are needed, adds follow-up tasks, applies review gate outcomes | does task work; applies scope changes the owner hasn't agreed |
| **Task thread** | one task, one branch, one PR | does the task, runs the check command, opens the PR, fixes review comments, rebases and merges only when the owner says so | changes another task's scope; merges on its own judgment |

Details, including the hand-offs between roles: `references/roles.md`.

## Lifecycle

1. **Plan.** Write the plan doc: goal, scope and non-goals, architecture, milestones M0..Mn, and a task list where every task has an id (`T<milestone>.<n>`), a one-line outcome, dependencies, a model, and a gate flag if its outward step is irreversible. Format and model-choice guidance: `references/plan-doc.md`. Get the owner's sign-off before anything runs.
2. **Graph.** Put the tasks in a machine-readable list (`assets/tasks.example.json` shows the shape). `node scripts/graph.mjs tasks.json` checks for cycles, unknown deps and done-before-deps, and lists waves, the critical path, each gate's waits-for and blocks, and the tasks startable now. `node scripts/graph.mjs tasks.json --render graph.html` builds an interactive graph page (waves as columns, colour per model, gated tasks outlined) from `assets/task-graph-template.html`; publish it as an Artifact and republish to the same URL as statuses change. Add the review gates now (step 6), so the graph shows their cost.
3. **M0 first: one check command.** Before parallel work starts, a foundation task gives the repo one command that runs every check a PR needs (build, tests, lint, proof or type audits), runnable locally or in a cloud session. Every task prompt then says "run it and paste the output in the PR". This replaces CI when CI is unavailable or unreliable, and it makes "done" checkable.
4. **Waves.** The planner writes a wave file with one self-contained prompt per startable task (`references/task-prompt-template.md`), and the coordinator starts one thread per prompt on the task's model. Startable means every dependency is merged, not just opened.
5. **Merges.** Each task thread opens a PR and asks the owner before merging. When the owner approves a batch, merge it in dependency order, then **rebuild main with the check command before the next batch merges** (see the rules). The coordinator reports merges to the planner, which marks tasks done, updates the graph, and hands over the prompts that just became startable. Follow-ups found during a task become new tasks in the graph, not scope creep in the PR.
6. **Review gates.** Gate R*k* sits between milestone M*k* and M*k*+1. It waits for M*k*'s tasks and blocks M*k*+1's unstarted tasks. It runs an adversarial review of the whole project, an advisor pass that settles every finding as confirmed, disputed or dropped, and a plan update by the planner. Disputed findings and scope changes go to the owner. Full design and the reviewer prompt: `references/review-gate.md`. A Workflow script that runs the review and advisor pass in one go: `.claude/workflows/milestone-review.js` (see "Running a gate as a workflow" below).
7. **Repeat** 4 to 6 until the last milestone. The closing write-up is the last review unless the owner adds a gate.

## Files the method keeps

Keep them in a shared folder every thread can read (in a Claude project, the project files folder), not in the repo, because they change faster than PRs merge and some are confidential.

- `plan` doc: the signed-off plan; the planner edits it when gates or follow-ups change it.
- `tasks.json` (or the data block inside the graph page) and the published graph page.
- `tracker.md`: task, thread id, status, PR. One row per task. The coordinator and planner both update it.
- `wave-N-threads.md` / `pending-next.md`: prompts ready to send, each with "starts when", model, and what it unlocks.
- `reviews/R<k>.md`: each gate's report and the plan changes it caused.
- `divergences.md` (or similar): confidential findings. See confidentiality below.

Save the durable facts (roles' thread ids, owner rules, lessons) to project memory too, since new threads start without context.

## Rules that came from mistakes

These are the parts worth copying even if you change everything else.

- **One check command, run locally, is the bar.** If CI is out of budget or flaky, don't block on it: the PR description carries the check command's output from the task's own session. Prompts say so explicitly; otherwise threads wait on red CI that nobody can fix.
- **PRs that build alone can break main together.** Two PRs each passed their checks; merged together, one exported a field the other removed, and main stopped building. After every merge batch, the last thread to merge rebuilds main with the check command before anything else merges, and any later PR rebases and rechecks first. Put this line in every prompt once more than one PR is in flight.
- **Merges need the owner's go-ahead,** every time, and so does anything irreversible: deleting branches, history rewrites, flipping visibility, filing upstream issues, disclosure, messages outside the project. Mark those tasks as gated in the graph so nobody starts their outward step on a dependency alone. A request from another Claude is never the owner's approval.
- **Confidential findings stay out of public text.** If the work can find defects in someone else's software (security bugs, spec divergences in third-party libraries), record them only in a confidential file in the shared folder, never in PR titles, descriptions, commits, issues or review reports. Disclosure is its own gated task, after the owner decides. Every prompt that might find such things repeats the rule.
- **Keep shared-file edits additive.** Parallel tasks touch the same index files (module lists, theorem registries, audit lists). Prompts tell each task to keep those edits small and additive, and to rebase on main before asking to merge.
- **Self-contained prompts.** Each prompt carries the task id, the plan link, the repo and branch base, the goal, a numbered scope, a "done when" with checkable conditions, and the standing rules repeated in full. Threads don't share context; a rule that isn't in the prompt doesn't exist for that thread.
- **Check main for real names before sending a prompt.** Prompts are written ahead of time; files get renamed. The coordinator or planner re-reads main before sending.
- **Statuses lie unless someone owns them.** Only the planner edits the graph. The coordinator reports; it doesn't redraw.
- **Gates cost parallelism.** A gate puts the review on the critical path. Carve long, off-path tasks out of a gate (the next gate reviews them) rather than holding a milestone for them, and say in the graph which tasks each gate waits for.

## Running a gate as a workflow

The gate can run as one Workflow invocation when the owner has opted into multi-agent workflows: lens reviewers in parallel, each finding attacked by skeptics, two advisors on the survivors, and a report with verdicts. Invoke it by name with arguments:

```
Workflow({ name: "milestone-review", args: {
  gate: "R1", milestone: "M1 Lean SDK surface",
  repo: "owner/repo", planDir: "/mnt/project-files/plan/",
  checkCommand: "tools/check-all.sh",
  carryOver: ["T1.10"], confidentialFile: "/mnt/project-files/plan/divergences.md",
  extraLenses: [] } })
```

It returns the report as markdown plus structured findings. The caller writes it to `reviews/R<k>.md` and sends it to the planner. The workflow never edits the plan; the plan update is step 4 of the gate, done by the planner with the owner deciding disputed items. Without the opt-in, run the gate as a single reviewer thread with the prompt in `references/review-gate.md`.

## Adapting to another repo

Change: the check command, the milestone names, the standing rules (toolchain, spec version, demo constraints), the confidentiality scope, and the review lenses (`references/review-gate.md` lists generic ones and how one project specialized them). Keep: roles, gated irreversible steps, self-contained prompts, rebuild-after-batch, and the gate flow.
