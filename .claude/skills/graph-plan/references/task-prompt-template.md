# Task thread prompt

Wave files hold one entry per startable task. Write them before the dependencies merge so the coordinator can start threads the moment they do.

## Wave file header

```
# <Project> plan: startable tasks (wave N)

Source plan: <plan link>
Graph: <graph link>
Repo: <owner/repo>, `main` at <short sha> (<what just merged>).

<Which tasks are startable, and which are waiting on what.>

Concurrency note: <tasks in this wave that touch the same files, and the additive-edit rule.>
```

## One entry

```
## <id> · <thread title>

- Thread title: <verb-first title in the owner's words>
- Model: <model>
- Depends on: <ids and PR numbers>
- Unlocks: <ids, or "nothing directly">
- Gate: <only if the outward step needs the owner>

Prompt:

> Task <id> of the <project> plan (<plan link>; read <section> first). Repo <owner/repo>, start from current `main`. <If it finishes an earlier task: "It finishes what <id> (PR #n) left open; read that PR first.">
>
> Goal: <one sentence on the result and why it matters>.
> 1. <scope item, naming real files>
> 2. <scope item>
> 3. <scope item>
> <What not to do, if a thread would be tempted: "Do not file anything upstream.">
>
> Done when: <the check command passes>, <a checkable condition>, <what the PR shows>.
>
> Standing rules: <every standing rule, in full>. Run `<check command>` locally and paste its output in the PR. Keep shared-file edits additive. Before merging, rebase on main and rerun the check; if your PR is the last of a merge batch, rebuild main and report. <Confidentiality rule, if the task can find third-party defects.> Open a PR, but ask <owner> before merging.
```

## Checklist before sending

- The file names in the prompt exist on current main.
- Every dependency is merged, not just open.
- The standing rules are complete and current (copy them from the latest wave, then add any new owner decisions).
- Constraints added by earlier tasks are included where they apply (example: "any PR that touches the demo Dockerfile must keep the DEMO_PUBLIC and Bearer-token behaviour").
- The confidentiality line is there for any task that runs against someone else's software.
