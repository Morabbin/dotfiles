
# Copilot Instructions

## Safety

* Never push to `origin/main` without explicit confirmation.

## Branches

* **Always create a new branch before making changes when on the default branch (`main` or `master`).**
  * Branch from `origin/<default-branch>` and set upstream to `origin/<branch>`.
  * Name branches `morabbin/<short-description>` for issues.
* If there are uncommitted/unpushed changes, ask whether to keep them on the current branch or move them to the new one.

## Commits

* Group commits logically.
* Write commit messages in imperative mood (e.g., "Add validation for…").

## Pre-commit and Pre-PR

* Review changes for simplifications, clarity, performance, and adherence to best practices and repo conventions.
* Run typechecking, formatting, and linting across the whole repo.
* Run all tests; if expensive, run only affected tests.
* If eval tests were added or changed, run affected evals with `EVAL_TAGS=nightly`.
