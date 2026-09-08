---
name: pr-advisors
description: Use when a task, or another skill such as review-pr, needs shared persistent advisor models to gate findings or approve a deliverable. Load on "use advisors", "consult advisors", or "work with advisors".
---

# Shared advisor models and behavior

This skill defines which advisors to use and how they work. Every model and behavior below is a default: override only the specific part the calling task states otherwise.

## 1. Start early and reuse

Use one each of `gpt-6-astra` and `claude-opus-5` as persistent, read-only background advisors, with high reasoning effort and long context where supported. Start them as background agents and reuse those exact agents through follow-up messages (`write_agent`), not one-off reviews; only the main agent edits anything.

When starting them, give every advisor the task, constraints, relevant context, and current work. Ask each to investigate independently, challenge assumptions, and support conclusions with evidence. Do not pause after the initial briefing: continue your own independent work while they think in the background, and rely on the completion notification rather than polling or sleeping at the top level.

## 2. Consult throughout

Get advice from the advisors on the approach only after gathering all relevant context and forming your own approach for the task. The advisors then review meaningful revisions and supporting evidence for correctness, completeness, and simplicity. They should question unnecessary additions and prefer reuse, deletion, and the smallest coherent solution that does not overengineer the implementation.

Give both advisors the same prompt, so both check the full scope. Cross-share findings and disagreements between them until they agree, revise, and repeat until no worthwhile improvement remains.

### 2.1 Read-only investigations

If the advisors are used for a read-only investigation rather than a change, still cross-share their findings between them until any disagreements are aired.

## 3. Approve the final result

Get explicit approval from every advisor for the correctness, completeness, and minimality of the complete deliverable and its presentation, not an earlier proposal. Re-review subsequent changes, and surface unresolved disagreements honestly rather than claiming consensus that was not reached. If an advisor is unavailable or misses its deadline, say so plainly; do not fabricate its agreement or silently skip the gate.

This skill adds advice and review, not extra authority. It does not change the calling task's scope, workflow, or permissions, including any restriction against builds, tests, lint, or dependency installation.
