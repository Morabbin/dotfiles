# Copilot Instructions

These are always-on global rules. Task-specific procedures live in skills (`.copilot/skills/`).

## Safety
* Never push to `main`/`master` without confirmation.
* Never run `gh variable set` or mutate Actions variables/secrets.
* Only force-push if explicitly requested or fixing history/conflicts. Ask confirmation first if the branch is shared or unowned.
* In public or open-source repos, never mention private repos or internal references.

## Git Workflow
* Check `git status` before coding; ask how to handle uncommitted changes.
* Update branches via `git merge` (not rebase) to preserve review history.
* Branch from `origin/<base>` as `morabbin/<short-desc>`. Push with `-u origin <branch>`.
* For non-base branches, ask before modifying unless the session was opened for that specific PR/issue.

## Code & Commits
* Keep code comments concise. Omit reasoning/history. Link issues/PRs only inside TODOs.
* Group commits logically. Use imperative mood (e.g., "Add validation").
* Invoke the `validate-changes` skill before committing or updating a PR.

## Shell & Markdown
* Pass markdown with non-ASCII/backticks to `gh` via file/heredoc to avoid escaping errors.
* Use `--` instead of em-dashes (`—`).
* Always format PR and issue references as clickable links when reporting status.

## Cost & Context Hygiene
* Checkpoint long efforts. Confirm risky operations.
* Read and search files with `view`/`grep`/`glob`. Never shell out to `cat`/`head`/`tail`/`find`/`grep`/`ls` for reads -- they waste tokens and turns.
* Delegate broad research and multi-file investigations to `explore` sub-agents; don't grind through inline bash search loops.
* On long, multi-day sessions, compact context around ~150K tokens. Don't run pinned at the context ceiling.
* Match the model to the task: a small/cheap model for mechanical work, a heavy model for design and architecture.
* Never block the main session waiting (e.g. CI/sleeps). Delegate waits to background processes.
* Summarize status per milestone.
