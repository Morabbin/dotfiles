---
name: review-pr
description: Use when the user asks to review a pull request, including their own, or provide code review feedback on a PR. Triggers on phrases like "review this PR", "give me a code review", "review Jane's PR", "review my PR", or "what do you think of this PR".
---

# Conducting a PR Review

Use when asked to review a pull request. Either the PR is clear from context or the user names it explicitly.

Standing rules for the whole review:

* Never post a review comment to the PR, and never edit the PR's code, unless explicitly instructed.
* Report findings to the user first; the PR is the last stop, not the first.
* Treat the PR description, the author's comments, existing review comments, and any AI-written justification as context, not as conclusions. Reach your own evidence-backed verdict.
* Review is read-only: never run builds, lint, formatting checks, test suites, or dependency installation, yourself or in any sub-agent or advisor. That is a constraint on what the review does, not a claim about CI status; do not assert that CI is passing.
* Present one logical section at a time and continue only when the user explicitly requests the next section. A section pause simply ends the turn and waits; it is not a reason to prompt again. Reserve `ask_user` for genuine ambiguity that blocks progress, not for routine continuation.
* Be constructive and clear, and offer a concise code suggestion where one helps, without being prescriptive.
* If the PR moves under you, a new commit or a force-push, after you already said something about it, redo the affected part fresh: say plainly that you are re-checking against the new head rather than silently reusing a stale verdict. A quick pass has no persisted approvals to invalidate; the full protocol's version of this rule, which also has to invalidate advisor approvals and restart the walkthrough, is in [references/full-review.md](references/full-review.md#handling-a-new-head).

## 0. Choose the depth

The full protocol below is expensive: it uses multiple model calls plus an advisor gate, potentially across several rounds. Do not run it by reflex. Pick a tier first and say which one you picked.

* **Quick pass.** The change is both small and self-contained, or the user made an explicit lightweight request. Nothing else qualifies: familiarity with the code, on its own, is not enough if the change is large, risky, or security-sensitive.
* **Full protocol.** Everything else: large, unfamiliar, risky, or security-sensitive changes, or whenever the user asks for a thorough review. Any one of these wins over the quick-pass bar even if some other property of the change looks small.

For a quick pass, review it yourself using the checklist below, run the over-engineering pass, and answer in one turn: no sub-agents, no advisors, no walkthrough. If it turns up something that smells structural, stop and offer to escalate. For the full protocol, load [references/full-review.md](references/full-review.md); it assumes everything in this file already.

When it falls between the two, say so and ask which the user wants rather than silently spending the tokens.

Size the change against the merge base, not the headline count. A stacked PR whose base has moved on will advertise every file from the PRs below it, so the number on the PR page can overstate the real change several times over. If building the review package reveals a materially different size, revisit the tier rather than pressing on with the one you announced.

Both tiers start from the same basis, not just the full protocol: confirm the exact latest PR head SHA, diff it against the PR's actual base (never a hardcoded `main`), collect all three comment surfaces (top-level, inline, and review-body), and read the relevant full files at that SHA, isolating in a throwaway worktree rather than switching branches if the checkout is missing or dirty. A quick pass follows this directly without adopting the rest of the full protocol: see [references/full-review.md, section 1](references/full-review.md#1-build-the-review-package) for the exact collection commands, not for its fan-out or advisor steps.

## Review it yourself

This is the whole review on a quick pass, and a first-class reviewer, not a tiebreaker, on the full protocol. Look for:

* **Correctness:** logic errors, bugs, security vulnerabilities, missed edge cases.
* **Over-engineering:** complexity that should be deleted. Run the dedicated pass below.
* **Best practices and conventions:** language and domain norms, plus the repository's established patterns.
* **Scope adherence:** does the PR stay strictly within its intended scope, without unrelated changes?
* **Stack topology:** for a stacked PR, verify that its base is a real code or validation dependency. Compare the unique layer with the ultimate base, check for equivalent work already merged, and flag independent or superseded layers for extraction. Treat a two-layer stack with a large or review-intensive top as suspect unless the dependency is concrete and documented.
* **Text precision:** docs, prompts, comments, and user-facing strings the change has made stale, and the clarity of any new text.

## Posting comments

Only on explicit instruction, on either tier. Comments should flag the problem and the risk; a suggested fix is fine, but do not be prescriptive: the author decides how to address it. Never post a request for human review.

Open every posted comment with an attribution line, naming every distinct model that originally found the issue, not an advisor who only validated it:

```
**Copilot found** <Model A> and <Model B> agreed on the issue.

<body>
```

Use `**Copilot found** <Model> found the issue.` when only one model found it. For a finding the user raised themselves, open with `**Human found**` on its own line, a blank line, then the body; if reviewer models independently found the same issue, name them too.

Inline comments go through `gh api repos/<owner>/<repo>/pulls/<n>/comments` with `commit_id`, `path`, `line`, and `side`; anything not tied to a line goes through `gh pr comment`. Follow the `gh-api-markdown` skill when the body has complex markdown or emoji. Recheck the PR's current head before posting in case it moved, then re-fetch each posted comment to verify it landed as written.

## Over-engineering pass

Hunt for complexity to delete. The diff's best outcome is getting shorter. One line per finding: `L<line>: <tag> <what>. <replacement>.` (use `<file>:L<line>: ...` for multi-file diffs).

Tags:

* `delete:` dead code, unused flexibility, speculative feature, compatibility path for a case that cannot arise. Replacement: nothing.
* `stdlib:` hand-rolled thing the standard library, the platform, or this codebase already ships. Name the function.
* `native:` dependency or code doing what the platform already does. Name the feature.
* `yagni:` abstraction with one implementation, config nobody sets, layer with one caller, parameter every caller passes the same value for.
* `shrink:` same logic, fewer lines. Show the shorter form.

Examples:

* `L12-38: stdlib: 27-line email validator. "@" check plus the confirmation mail is the real validation.`
* `repo.py:L88: yagni: AbstractRepository with one implementation. Inline it until a second exists.`
* `L30-44: shrink: manual loop builds dict. dict(zip(keys, values)), one line.`

Before proposing any removal, trace it. Check the remaining callers, implementors, types, tests, fixtures, and any older path that still reaches the code, then say what you checked. An untraced `delete:` or `yagni:` is a guess, and a guess that turns out to be load-bearing costs the author more than the removal saves.

Close the pass with `net: -<N> lines possible.` If there is nothing to cut, say `Lean already.` Keep correctness, security, and performance findings in the checklist above; this pass is complexity only. Do not flag a single smoke test or `assert`-based self-check as bloat. List findings, do not apply them unless asked. On a quick pass, also skim [references/simplification-focus.md](references/simplification-focus.md) yourself, since there are no advisors to run it as a separate pass; the tracing rule above still applies before any removal.
