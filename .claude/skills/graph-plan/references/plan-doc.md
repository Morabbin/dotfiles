# The plan doc

The plan doc is a readable document the owner signs off (in a Claude project, a Claude Doc). The graph is derived from it.

## Sections

1. **Summary.** The goal in two or three sentences, and what "done" means for the whole project.
2. **Scope.** In scope, non-goals, and a "dropped, parked or reframed" list for anything the owner cut, with the reason. Threads read this to avoid reviving cut work.
3. **Current state.** What exists, with numbers you can check later (tests, theorems, modules).
4. **Proposed architecture.** The layers or components, enough for task prompts to point at a section instead of repeating it.
5. **Milestones.** M0 to Mn, each with a one-line outcome. M0 is always foundation: toolchain, the single check command, README, cleanup.
6. **Tasks.** A table per milestone (below).
7. **Review gates.** Which gate sits after which milestone, what it waits for, what it blocks, and its carve-outs.
8. **Open questions for the owner.** Numbered, each with a recommendation. Resolve them before sign-off and record the answers here.
9. **Standing rules.** The rules every prompt repeats.

## Task row

| Field | Notes |
|---|---|
| id | `T<milestone>.<n>`; follow-ups get the next free number in the same milestone |
| outcome | one line, phrased as the result ("Verified JSON parser replacing the trusted one") |
| deps | ids that must be **merged** first |
| model | see below |
| gate | true if the task's outward step is irreversible and needs the owner |
| status | todo, running, review, done, deferred |

Keep tasks to one PR each. If a task needs two PRs, it is two tasks.

## Choosing the model

Match the model to the hardest part of the task, not the average part.

- **Smallest model (Haiku-class):** mechanical, well-specified work: a script with a fixed spec, branch inventories, archiving, labelled corpora, triage against a checklist.
- **Mid model (Sonnet-class):** ordinary engineering with clear acceptance criteria: features following an existing pattern, docs rewrites, harnesses repeated per target, benchmarks, wiring.
- **Large model (Opus-class):** proofs, parsers, protocol state machines, anything where a subtle mistake survives the tests; and spec-style writing.
- **Largest model (Fable-class), sparingly:** design that everything downstream depends on (a schema, a catalogue format) and the adversarial review gates.

The owner can override any choice; record overrides in the plan ("Q5: the JSON parser goes to Opus").

## Graph data

Each task becomes one entry in `tasks.json` (see `assets/tasks.example.json`). Gates are tasks too, with `"kind": "gate"` and deps on the milestone's tasks minus carve-outs; the tasks they block list the gate as a dep. `scripts/graph.mjs` checks the data and prints waves, the critical path and what is startable.
