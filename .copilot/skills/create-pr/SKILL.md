---
name: create-pr
description: Use when the user asks to create, open, or submit a new pull request.
---

# Creating a PR

Use when creating a new pull request.

1. Follow any contribution guidelines (e.g., `CONTRIBUTING.md`, `.github/CONTRIBUTING.md`).
2. Use the PR template if one exists (e.g., `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE/`) to structure the description.
3. Invoke the `validate-changes` skill.
4. Create the PR with a clear title and a description following the template.
5. Assign me (`Morabbin`) to any PR created for me. If assignment fails, leave it unassigned and report the exact failure. Do not retry with a guessed username.

## Staging / Dummy PRs
If the user asks for a "DO NOT MERGE", dummy, throwaway, or staging-validation PR:
* **Title:** `🚫 DO NOT MERGE: <short purpose>`
* **Description:** Start with `## ⚠️ DO NOT MERGE`, explain the purpose, link the source PR, and note it should be closed without merging.
* Always use a file or heredoc to pass these emojis to the `gh` CLI.
