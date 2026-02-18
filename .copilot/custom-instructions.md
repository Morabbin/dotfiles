# Custom Instructions

## Safety

* Never push to origin/main without explicit confirmation.

## Branches

* Branch from latest `origin/main`; set upstream to `origin/<branch>`.
* For issues, name the branch like `morabbin/<short-description>`.
* If there are uncommitted/unpushed changes on the current branch, ask whether to keep them here or move them to the new branch.

## Commits

* Group commits together logically.
* Write concise commit messages in imperative mood (e.g., "Add validation for…").

## Pre-commit and pre-PR

* Review changes, looking for simplifications, clarity improvements, performance improvements.
* Run typechecking, formatting, and linting on the whole repo.
* Run all tests unless expensive; then run only affected tests.
