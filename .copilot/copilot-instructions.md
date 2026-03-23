# Copilot Instructions

## Safety

* Never push to `origin/main` without explicit confirmation.

## Starting Work

* Before beginning any work, ensure the local repository is up to date with the remote:
  * Run `git fetch origin` to update remote-tracking branches.
  * Pull the latest changes for the current branch (`git pull --rebase` or equivalent).

## Branches

* **Always create a new branch before making changes when on the default branch (`main` or `master`).**
  * Branch from `origin/<default-branch>` and set upstream to `origin/<branch>`.
  * Name branches `morabbin/<short-description>` when issue link is provided; otherwise, ask for a short description of the work or an issue link.
* If there are uncommitted/unpushed changes, ask whether to keep them on the current branch or move them to the new one.

## Commits

* Group commits logically.
* Write commit messages in imperative mood (e.g., "Add validation").

## Pre-commit and Pre-PR

* Review changes for simplifications, clarity, performance, and adherence to best practices and repo conventions.
* Run typechecking, formatting, and linting across the whole repo.
* Run all tests; if expensive, run only affected tests.
* If eval tests were added or changed, run affected evals with `EVAL_TAGS=nightly`.
* Rebase the local branch on top of `origin/main` before pushing (`git fetch origin && git rebase origin/main`).

## Creating a PR

1. Check for contribution guidelines (e.g., `CONTRIBUTING.md`, `.github/CONTRIBUTING.md`) and follow them.
2. Check for a PR template (e.g., `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE/`) and use it to structure the PR description.
3. Run all pre-commit checks before pushing.
4. Create the PR with a clear title and a description that follows the template (if one exists).
5. Always assign me (`Morabbin`) to the PR.

## Creating Issues

* Always assign me (`Morabbin`) to any issue created.

## Dummy / Staging PRs

When creating a "DO NOT MERGE" PR (e.g., for staging deployment testing):

* **Title format:** Use `🚫 DO NOT MERGE — <short purpose>`.
* **Description format:** Start with a `## ⚠️ DO NOT MERGE` heading, then explain the purpose and link to the source PR. End with a note to close without merging. Example:

  ```markdown
  ## ⚠️ DO NOT MERGE

  This is a **dummy PR for staging deployment only**. It points the runtime
  submodule at [`branch-name`](link-to-source-pr) to test <what> in staging.

  **Purpose:** Deploy [repo#number](link) to staging for validation.

  This PR should be **closed without merging** once staging testing is complete.
  ```

## Addressing PR Code Review

When asked to work on a PR:

1. Check out the PR branch locally and pull the latest changes.
2. Read all pending code review comments on the PR.
3. Address each comment by making the appropriate code changes.
4. Run all pre-commit checks (typechecking, formatting, linting, tests) before committing.
5. Commit and push the fixes.
6. Update the PR description if the changes warrant it.
7. Reply to each code review comment on my behalf, summarizing what was done and noting that you are replying on my behalf. Resolve the comments after replying.

## Shell and Markdown Pitfalls

* **`gh api` with JSON bodies:** For markdown content containing special characters, write a JSON file with proper `\uXXXX` escapes and pass it via `--input file.json` rather than using `-f body=...`, which is fragile with multi-line markdown.
* **Emojis, em-dashes, and backticks in shell commands:** When passing markdown content containing Unicode characters (emojis, em-dashes, etc.) through shell arguments, use a file or heredoc instead of inline strings to avoid quoting and encoding issues.
* **Avoid em-dash characters (`—`) in markdown.** Use `--` instead. Em-dashes can cause encoding and rendering issues across tools and terminals.
* **Always render and verify** the output after writing or updating any markdown document -- especially content with emojis, special characters, or complex formatting. Fix any rendering issues before considering the task done.