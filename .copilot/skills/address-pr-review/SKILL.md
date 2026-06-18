---
name: address-pr-review
description: Use when the user asks to address, handle, or respond to reviewer feedback, requested changes, or review threads on a pull request; to reply to or resolve a specific PR review comment (including comments from review bots); or to finish working on a PR that has open review comments. Triggers on phrases like "address the review comments", "reply to Jane's comment", "handle the reviewer feedback", "fix the review nits", or "resolve the conversation on PR 123".
---

# Addressing PR Code Review

Use when asked to act on a PR's review feedback.

1. Check out the PR branch locally and pull the latest changes.
2. Read the unresolved/current review comments, including comments on outdated diffs if still relevant.
3. Decide scope:
   * Address comments requesting correctness fixes, test updates, documentation for changed behavior, or repo-convention compliance.
   * Ask me before addressing comments that request scope expansion, architectural changes, or product decisions.
4. Make the appropriate code changes for each in-scope comment. Commit these as new, distinct commits (do not amend or rebase) so reviewers can easily track your fixes.
5. Reply to each addressed comment on my behalf, summarizing what was done and noting that you are replying on my behalf.
6. Resolve a comment only when it is clearly fully addressed and resolving is appropriate. Leave reviewer-owned or open product/architecture threads unresolved, and report why.
7. Invoke the `validate-changes` skill before pushing.
