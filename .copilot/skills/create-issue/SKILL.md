---
name: create-issue
description: Use when the user asks to create, open, or file a new issue.
---

# Creating Issues

Use when creating a new issue.

1. Create the issue with a clear title and body.
2. Assign me (`Morabbin`) to any issue created for me. If assignment fails, leave it unassigned and report the exact failure. Do not retry with a guessed username.

## Structuring long issue bodies

Keep the title, problem or result summary, key decision, impact, and acceptance criteria visible. When present, the owner, status, blocker, user impact, and main recommendation must also stay visible.

For a long issue, place secondary material such as raw evidence, long query bodies, logs, inventories, exhaustive tables, reproduction transcripts, appendices, or alternative explorations inside collapsed-by-default GitHub details sections:

```html
<details>
<summary>Concise description of the hidden detail</summary>

Markdown content, tables, or fenced code.

</details>
```

Do not add the `open` attribute when content should start collapsed. Preserve the blank lines around the body so GitHub renders nested Markdown correctly.

Use a specific summary label such as `Evidence: affected runs` or `Query: failure breakdown`, not `Details`. Avoid nesting details sections unless the document genuinely needs it.

When another document must deep-link to a collapsed section, optionally place a stable named anchor immediately before `<details>`, for example `<a name="evidence"></a>`. GitHub renders its fragment as `#user-content-evidence`.

Keep each GitHub prose paragraph and list item on one physical line.
