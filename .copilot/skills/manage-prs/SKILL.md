---
name: manage-prs
description: Use when the user asks to manage, refresh, sync, update, merge main into, or resolve conflicts on one or multiple pull requests, or to coordinate an epic/program of PRs. Triggers on phrases like "refresh this PR", "update PR 123 from main", "sync my epic's PRs", or "link each PR to its issue".
---

# Managing PRs

Use when asked to refresh, sync, or manage one or more PRs.

## Single PR
For each PR being managed:
1. Ensure the PR branch is up to date with its base branch by merging it in (`git fetch origin && git merge origin/<base>`). Avoid rebasing to preserve the "changes since last review" view for reviewers.
2. Resolve merge conflicts if any arise.
3. Investigate and fix CI failures caused by the PR. Re-run failed or flaky jobs when appropriate.
4. If there are review comments to address, invoke the `address-pr-review` skill.
5. Invoke the `validate-changes` skill and fix any issues.
6. Push (`git push`).
7. Ensure the PR title and description are accurate, current-state-only, with no historical narration.

When reporting status, mention only current open PRs unless asked about closed or superseded ones.

## Bulk / Multiple PRs (Program Ops)
When asked to manage an epic or coordinate multiple related PRs/issues:
1. Build a linkage map (`1:1`, `1:N`, `N:1`). Ask for confirmation if ambiguous.
2. Refresh/sync each PR iteratively using the single-PR steps above.
3. If missing PRs need bootstrapping, invoke the `create-pr` skill.
4. If review feedback is in scope, invoke the `address-pr-review` skill.
5. Update PR/issue bodies in a batched pass.
6. Publish one consolidated status report covering PR state, linkage state, and blockers.
