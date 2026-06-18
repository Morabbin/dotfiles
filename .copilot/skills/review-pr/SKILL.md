---
name: review-pr
description: Use when the user asks to review someone else's pull request or provide code review feedback on a PR. Triggers on phrases like "review this PR", "give me a code review", "review Jane's PR", or "what do you think of this PR".
---

# Conducting a PR Review

Use when asked to review a pull request (usually authored by someone else).

1. **Understand the Context:** Fetch the PR description and the code diff (`gh pr diff <number>`) to understand the goal and the scope of the PR.
2. **Evaluate the Code:** Review the changes specifically looking for:
   * **Correctness:** Are there logic errors, bugs, security vulnerabilities, or missed edge cases?
   * **Over-engineering:** Is there complexity that should be deleted? Run the dedicated pass below.
   * **Best Practices & Conventions:** Does it adhere to the language/domain best practices and the repository's established conventions?
   * **Scope Adherence:** Does the PR stay strictly within its intended scope without introducing unrelated changes (scope creep)?
3. **Formulate Feedback:**
   * Focus on high-signal, actionable issues rather than trivial stylistic nits.
   * Be constructive and clear. If applicable, provide concise code suggestions.
4. **Deliver the Review:** Present your review findings to the user. If the user asks you to submit the review to GitHub, use the `gh` CLI (remembering to follow `gh-api-markdown` rules if the review contains complex markdown or emojis).

## Over-engineering pass

Hunt for complexity to delete. The diff's best outcome is getting shorter. One line per finding: `L<line>: <tag> <what>. <replacement>.` (use `<file>:L<line>: ...` for multi-file diffs).

Tags:

- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

Examples:

- `L12-38: stdlib: 27-line email validator. "@" check plus the confirmation mail is the real validation.`
- `repo.py:L88: yagni: AbstractRepository with one implementation. Inline it until a second exists.`
- `L30-44: shrink: manual loop builds dict. dict(zip(keys, values)), one line.`

Close the pass with `net: -<N> lines possible.` If there is nothing to cut, say `Lean already.` Keep correctness, security, and performance findings in the main review above; this pass is complexity only. Do not flag a single smoke test or `assert`-based self-check as bloat. List findings, do not apply them unless asked.
