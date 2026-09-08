---
name: create-pr
description: Use when the user asks to create, open, or submit a new pull request.
---

# Creating a PR

Use when creating a new pull request.

1. Follow any contribution guidelines (e.g., `CONTRIBUTING.md`, `.github/CONTRIBUTING.md`).
2. Use the PR template if one exists (e.g., `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE/`) to structure the description.
3. Invoke the `validate-changes` skill.
4. If the PR body contains substantial markdown or multiline / shell-sensitive content, follow the `gh-api-markdown` skill.
5. Create the PR as a **draft**, with a clear title and a description following the template, so step 7 below has an actual PR to inspect.
6. Assign me (`Morabbin`) to any PR created for me. If assignment fails, leave it unassigned and report the exact failure. Do not retry with a guessed username.
7. Before presenting the PR as ready, invoke the `review-pr` skill on it. This initial gate applies only the first time a PR is created, not to routine later updates, aside from `review-pr`'s own new-head re-evaluation folded into this same gate. Let `review-pr` pick its own quick or full tier; validate-changes having passed is not a reason to skip this. If it comes back with no accepted findings, go to step 8. If it does have accepted findings:
   * Keep the PR in draft.
   * Get the user's explicit approval before changing anything, respecting `review-pr`'s own self-review mode.
   * Fix through the appropriate workflow, such as `address-pr-review`, without fabricating GitHub thread IDs for findings that exist only locally.
   * Invoke `validate-changes` again, push, and have `review-pr` re-evaluate the new head.
   * Repeat until the findings are resolved or the user explicitly accepts them as-is.
8. Mark the PR ready only if the user asked for a ready PR. Leave a draft, staging, or dummy PR in draft, as arranged below. Never request human review from anyone.

## Staging / Dummy PRs
If the user asks for a "DO NOT MERGE", dummy, throwaway, or staging-validation PR:
* **Title:** `🚫 DO NOT MERGE: <short purpose>`
* **Description:** Start with `## ⚠️ DO NOT MERGE`, explain the purpose, link the source PR, and note it should be closed without merging.
* Always use a file or heredoc to pass these emojis to the `gh` CLI.
