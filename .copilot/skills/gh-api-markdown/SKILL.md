---
name: gh-api-markdown
description: Use when creating, posting, or editing GitHub PR/issue descriptions or comments that contain substantial markdown (emojis, em-dashes, backticks, tables, links, or multiline/shell-sensitive content), especially via `gh`, `gh pr/issue`, or `gh api`. Triggers whenever a body must survive shell quoting or a `gh api` call needs a JSON body.
---

# Posting markdown via gh / gh api

Mechanics for getting markdown bodies through the shell and the GitHub API intact.

* **`gh api` with JSON bodies:** Write the body to a JSON file with valid UTF-8/JSON escaping and pass it via `--input file.json`. Avoid `-f body=...`, which is fragile with multi-line markdown.
* **Prefer purpose-built flags:** For PR/issue bodies, prefer `--body-file <file>` (e.g. `gh pr create --body-file`, `gh issue create --body-file`) where supported; reserve `gh api --input` for raw API calls (e.g. posting review-comment replies).
* **Special characters in shell arguments:** When content contains emojis, em-dashes, backticks, or other non-ASCII, pass it via a file or heredoc rather than inline strings, to avoid quoting and encoding issues.
* **Em-dashes:** Prefer `--` over the em-dash character in the content itself (global Markdown rule).
* **Verify:** Render or preview the result after posting to confirm the formatting is intact.
