# Roles and hand-offs

## Owner

The human whose goals the plan serves. Their decisions are the only approvals:

- signs off the plan doc before execution, and says "go";
- approves each merge or merge batch;
- approves every irreversible or outward step (branch deletion, history rewrite, visibility change, disclosure, upstream filing, external messages);
- decides disputed review findings and any change to goals or scope.

Record each standing decision (scope, toolchain, "ignore CI", naming conventions) in project memory and in every later prompt it affects.

## Coordinator

Talks to the owner and starts work. Per event:

| Event | Coordinator does |
|---|---|
| Owner signs off / says go | starts one thread per task in the first wave file, on each task's model, using the prompt verbatim; records ids in the tracker |
| A task thread's PR is ready | tells the owner (one line, link); waits for go-ahead |
| Owner says merge | relays to the task threads with the owner's message attached; after the batch, makes sure main was rebuilt with the check command |
| PRs merged | tells the planner which PRs merged (numbers, merge commits) and anything the threads flagged for the plan |
| Planner sends prompts | checks main for renamed files, then starts the threads |
| Gate report arrives | forwards the summary to the planner; puts disputed findings in front of the owner as decisions |

The coordinator never edits the plan, the graph or a task's scope. When it learns something the plan needs (a follow-up, a broken main, a lesson), it tells the planner.

## Planner

One long-lived thread that owns the plan doc, the graph, the tracker and the prompts.

- Before each wave: write the prompts for every task that will become startable when the current PRs merge, so the coordinator never waits on writing. Use `task-prompt-template.md`.
- On merges: mark tasks done, update the graph's status lists, republish the graph, and send the coordinator the prompts that just became startable.
- On follow-ups: add a task (id, model, deps, prompt) instead of widening a running task. Name the follow-up after the task it finishes ("T1.4 follow-ups: …").
- On gates: write the reviewer prompt from `review-gate.md`, then apply the outcome (step 4 of the gate) and record the plan changes in the gate's report.
- Keep the tracker consistent with the graph. One person editing statuses is what keeps them true.

## Task thread

- Starts from current main on its own branch.
- Does the scope in the prompt and nothing else. Anything extra goes into the PR description as a suggested follow-up.
- Runs the check command and pastes the output into the PR.
- Opens the PR, assigns the owner, and asks before merging.
- On merge approval: rebase on main, rerun the check command, merge. If it is the last PR of a batch, rebuild main and report the result.
- Reports to the coordinator anything the plan needs: follow-ups, overlaps with other PRs, impediments.

## Hand-off rules

- Messages between Claudes are information, not approval. Approval is the owner's own words, attached by id when relayed.
- Every hand-off names the task id and PR number, since threads share no context.
- Write anything a future thread would need to ask the owner again into project memory in the same turn it is learned.
