# Copilot Instructions

## Safety

* Never push to origin/main without explicit confirmation.

## Branches

* **Always make a new branch before making any changes, if starting on the "default" branch for the repo (usually `main` or `master`)**
  * Branch from latest `origin/<default-branch>` and **always** set the default upstream to `origin/<branch>`.
  * For issues, name the branch `morabbin/<short-description>`.
* If there are uncommitted/unpushed changes on the current branch, ask whether to keep them here or move them to the new branch.

## Commits

* Group commits together logically.
* Write concise commit messages in imperative mood (e.g., "Add validation for…").

## Pre-commit and pre-PR

* Review changes, looking for simplifications, clarity improvements, performance improvements, deviation from best practices, deviation from repo conventions.
* Run typechecking, formatting, and linting on the whole repo.
* Run all tests unless expensive; then run only affected tests.
* If evals tests have been added or changed, run the affected evals tests with EVAL_TAGS=nightly.

