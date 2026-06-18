---
name: validate-changes
description: Use before committing code, opening a PR, or updating a PR to run standard validation checks (lint, format, test) and sync the branch.
---

# Validate Changes

Run this checklist before committing code or updating/opening a PR.

1. **Code Review:** Evaluate changes for correctness, conciseness, adherence to language and domain best practices, repo conventions, maintainability, and strict PR scope adherence.
2. **Lint & Format:** Run documented repo-wide typecheck, format, and lint commands. If missing or undocumented, report it and ask before using package-specific commands.
3. **Tests:** Run the test suite. If it takes >15m or needs external services, run only affected tests and report skipped ones.
4. **Evals:** If the repo has eval tests and your change affects them, run them using the repo's documented eval command.
5. **Sync:** Merge the base branch if needed (`git fetch origin && git merge origin/<base>`). Avoid rebasing to preserve review history.
6. **Push:** `git push`. Only force-push if explicitly requested or fixing history/conflicts.
