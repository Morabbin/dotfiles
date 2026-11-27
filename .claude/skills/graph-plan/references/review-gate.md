# Review gates between milestones

A review gate is a node in the graph that stops the next milestone until an adversarial review of the whole project has run, advisors have filtered its findings, and the plan has been updated from what survived.

## Placement

Gate R*k* sits between milestone M*k* and M*k*+1.

- **Waits for:** every task of M*k* (minus named carve-outs) and the previous gate.
- **Blocks:** every task of M*k*+1 that has not started when the gate is added. Running or merged tasks are not stopped; the review covers them as they stand.
- **Covers the whole project,** not just M*k*: code, tests, proofs or type-level guarantees, docs, the plan doc, the graph, the tracker, open follow-ups and the confidential findings file.
- **Carve-outs:** a long task off the critical path can be carved out; the next gate reviews it. List carve-outs per gate in the plan.
- If milestones overlap in time, define each gate by what it blocks, not by a strict phase order. If gates are added mid-project, merge finished milestones' boundaries into the first gate.
- No gate after the last milestone by default; the closing write-up is the final review unless the owner adds one.

Gates put the review on the critical path. Show that in the graph and tell the owner what it costs when gates are added.

**When a gate starts:** after the PRs it waits for have merged and main has been rebuilt with the check command. Reviewing a main that doesn't build wastes the reviewer.

## Flow

1. **Review.** A reviewer (largest model) gets the prompt below. Read-only: no pushes, PRs or plan edits. It assumes the work is worse than it claims and looks for what is wrong, weak or missing. Every gate runs the asks lens (lens 0 below), whatever other lenses it picks.
2. **Advisor pass.** Two persistent, read-only advisors, ideally from different model families (the `pr-advisors` pattern; fall back to two strong agents and say which ran), each get the full findings and the same prompt: try to refute every finding. A scope finding (an owner ask narrowed, weakened, dropped or unscheduled) can be refuted only by evidence that the whole ask was delivered or by the owner's own decision, quoted with its source; "the plan says so" or "out of the plan's scope" is not a refutation, because the plan is what is being checked. The reviewer cross-shares their objections until they agree or the disagreement is stated, and settles each finding:
   - **confirmed:** survives both advisors, with evidence (file:line, command output, audit line);
   - **disputed:** advisors disagree; kept with both positions;
   - **dropped:** refuted; kept with the reason, so later gates don't re-raise it.
3. **Report.** `reviews/R<k>.md` in the shared folder, sections: Summary (five lines max); Findings (id, severity high/medium/low, verdict, evidence, suggested plan change); Scope trace (every ask: what was asked, what was delivered, coverage, evidence); Owner decisions needed (every narrowing found, the ask quoted); Dropped findings (with reasons); Advisor record (models, disagreements). The reviewer sends the coordinator a summary of at most ten lines with the confirmed high and medium findings. Confidential findings go only to the confidential file.
4. **Plan update (planner).** For each confirmed finding the planner does one of: add a task (model, deps, prompt), fold it into an existing task's prompt, change deps, or record why no change is needed. A scope finding is never closed with "no change": the planner restores the full ask (adds and schedules the missing tasks, since the owner already asked for them) and tells the owner, or puts the narrowing to the owner as a decision. Update the asks ledger. Disputed findings and any change to the owner's goals or scope go to the owner as a decision, never applied silently. The planner updates the plan doc, graph and tracker, and appends "Plan changes" to `R<k>.md`.
5. **Gate opens** when the plan changes are recorded and every scope finding is either restored in the graph or in front of the owner. A narrowing still awaiting the owner stays open in the ledger and every later gate raises it again. The coordinator starts the blocked tasks; any new task the review added as a prerequisite also blocks them.

## Review lenses

Lens 0 always runs; pick the others that apply and add domain lenses.

0. **Asks vs. delivered.** Rebuild the list of owner asks from the ledger *and* the owner's own messages since the plan began (the ledger itself can be incomplete), and for each ask compare its wording with what was merged and what is scheduled. Flag: asks with no task; tasks that deliver a subset; done criteria or closure conditions widened after sign-off; optional wording in prompts; items moved out of scope without the owner's decision; deferrals with no task; approved tasks never started or handed back to the owner; owner questions never answered; review findings never turned into tasks; and a missing or stale ledger.
1. **Claims vs. evidence.** Every claim in README, docs and PR descriptions is backed by a test, proof or measurement that shows what the prose says. Look for vacuous or too-weak guarantees and assumptions that never hold. Run the check command and paste its output.
2. **Spec or requirements fidelity.** Compare against the governing spec: missing pieces, places stricter or looser than it.
3. **Trusted base.** What is still unverified or untested (parsers, FFI, IO, unsafe code, mocks standing in for real systems), and whether that is documented.
4. **Tests vs. guarantees.** Gaps between what is claimed and what the tests actually exercise.
5. **Plan health.** Tasks whose premise is now wrong, missing tasks, wrong deps, stale prompts, follow-ups noted but never scheduled, and whether the remaining plan still reaches the goal.
6. **Exposure.** Anything that should not be public, secrets, unsafe defaults in demos.
7. **Carried over.** Tasks carved out of the previous gate.

One project specialized lens 1 to Lean theorems and the axiom/`sorry` audit, lens 2 to the protocol schema it implemented, and lens 6 to its demo's public-mode and Bearer-token behaviour.

## Reviewer prompt template

> Gate R<k> of the <project> plan (<plan link>; graph <graph link>). Repo <owner/repo>, current `main`. This is a read-only, adversarial review of the whole project at the end of M<k> (<milestone name>). Do not push, open PRs or edit plan files.
>
> Inputs: the repo at `main`, the owner's messages since the plan began, the plan folder (<path>: asks ledger, tracker, pending prompts, earlier reviews/R*.md, the confidential findings file), the plan doc, and the PRs merged since the last gate.
>
> Goal: find what is wrong, weak or missing, assuming the work is not as good as it claims. Check at least: asks vs. delivered (every owner ask, quoted, against what merged and what is scheduled; any narrowing the owner did not decide is a finding, refuted only by evidence of full delivery or the owner's quoted decision), <lenses, numbered, specialized to this project>. Carried over from the previous gate: <carve-outs>.
>
> Then run the advisor pass: two read-only advisors (<models>) each try to refute every finding; cross-share their objections; settle each finding as confirmed, disputed or dropped, with evidence.
>
> Output: <path>/reviews/R<k>.md with Summary, Findings, Scope trace, Owner decisions needed, Dropped findings and Advisor record sections. Send the coordinator a summary of at most 10 lines with the confirmed high and medium findings. Confidential findings go only into <confidential file>, never into the report.
>
> Standing rules: <standing rules>. Run `<check command>` locally. Read-only.

## As a workflow

`.claude/workflows/milestone-review.js` runs steps 1 to 3 as one Workflow (lenses in parallel, three skeptics per finding, two advisors on survivors, a written report), when the owner has opted into multi-agent workflows. The asks lens always runs. A refutation of a scope finding counts only with a structured basis (full delivery with evidence, or the owner's decision quoted with its source); code checks the form, not the truth, so every refuted scope finding is returned in `scopeRefuted` and listed in the report for the owner to check. Without `ownerMessages`, or if the asks lens could not read them or the asks ledger, `coverage.complete` is false. It returns `ownerDecisions` and `scopeTrace` with the report. Its output is the report; step 4 stays with the planner and the owner.
