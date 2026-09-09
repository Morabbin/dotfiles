# Full protocol

Load this when step 0 of `SKILL.md` picked the full protocol. It assumes you already have the entrypoint's standing rules, depth choice, "Review it yourself" checklist, posting rules, and over-engineering pass in mind; they are not repeated here.

## 1. Build the review package

Create a review package in the current session's `files/` directory so later steps read files instead of re-querying.

* Save the PR title, body, author, and other relevant metadata to a Markdown file.
* Save the aggregate diff for the whole PR, never commit-by-commit.
* Fetch `origin` first so the comparison is against the current base, and confirm you are looking at the latest PR head; record that SHA and treat it as the head under review.
* If the branch is not checked out, or is checked out with local changes, add a throwaway worktree at a deterministic sibling path rather than switching branches, explore there, then remove it without `--force` when done. Never move the user's current branch: an isolated worktree keeps the review from disturbing whatever they have checked out.
* Keep generated Bash scripts compatible with macOS Bash 3.2: no `mapfile` or `readarray`, use NUL-delimited `while IFS= read -r -d ''` loops for Git path lists and expand arrays as `"${paths[@]}"`.

Dump every top-level comment, inline review comment, and review body from the PR into a Markdown file, including author, timestamp, and any replies:

```bash
gh pr view <pr> --json title,body,author,url,headRefName,baseRefName,files,additions,deletions
gh pr view <pr> --comments                                   # top-level comments ONLY
gh api repos/<owner>/<repo>/pulls/<n>/comments --paginate    # inline review comments
gh api repos/<owner>/<repo>/pulls/<n>/reviews --paginate     # review bodies and verdicts
gh pr diff <pr>   # aggregate diff for the whole PR, never commit-by-commit
```

`gh pr view --comments` does not return inline review comments, and on a PR under active review those are usually where the substance is. Fetch all three surfaces, or you will walk into a review claiming to have read the discussion while missing an entire unanswered round of it.

For anything stacked or long-lived, compare the two-dot and three-dot diffs against the PR's actual base, and its ultimate base if the base is itself a PR branch, never a hardcoded `main`: `git diff <base>...<pr-head>` against `git diff <base> <pr-head>`. Files identical to the current base are already landed and are not part of this review: exclude them from the package rather than spending reviewer budget on merged code, and never conflate a base-only difference in the two-dot diff with an actual change in the PR.

Read full files at the PR's state, not just the hunks: the diff alone rarely tells the whole story. Follow linked issues, PRs, and docs.

## 2. Fan out reviewers

Fan-out is adaptive and bounded, not a fixed swarm: start small, expand only for a named gap, and stop as soon as a round adds nothing new. If the caller supplied a credit cap, treat it as a hard ceiling on the total reviewers spawned across every round below.

### Round 1: baseline

Launch exactly one whole-PR reviewer each from `gpt-5.6-sol`, `claude-sonnet-5`, and `gemini-3.8-flash` in the background, all pointed at the review package. Brief them to look for issues both big and small, including:

* Opportunities to share or reuse existing code.
* Architectural issues.
* Cleaner or nicer ways to achieve the same result.
* Duplication and unnecessary fluff.
* Code whose purpose or behavior is unclear from context and needs a comment explaining what or why.
* Code whose necessity should be questioned.
* General issues anywhere in the code.

Leave out subjective cosmetic preferences that a formatter or linter would otherwise settle. Give each reviewer a deadline (twenty minutes is a reasonable default). Run all of them in the background: never block waiting on them, do your own review meanwhile, and say you are waiting only if you have nothing else to do. If one overruns its deadline, abandon that run and either relaunch it once or proceed without it, recording the review as degraded; never let a stalled sub-agent hold the whole review hostage, and never let one reviewer's silence become a reason to skip the gate for everyone else.

### Expansion rounds

Do not start duplicate premium reviewers by default: three baseline findings that agree need no fourth opinion. Add at most one reviewer per explicitly named coverage gap or unresolved disagreement, such as a security-sensitive area the baseline round didn't touch, or two baseline reviewers reaching opposite conclusions on the same point, picking whichever provider or specialty best fits that specific gap. State the gap or disagreement that justifies each added reviewer before launching it.

Brief an added reviewer with the artifact paths and the delta since the prior round (the specific gap or disagreement, plus anything already found), not a repeated copy of the full review package. Give it the same twenty-minute deadline and run it in the background alongside everything else.

Stop expanding as soon as a round adds no new accepted candidate: if the newest round only restates or fails to substantiate what an earlier round already found, treat fan-out as complete and move on. Do not keep adding reviewers hoping for a different answer.

Also launch a separate simplification fan-out, briefed only on finding code to delete or shrink, not the whole-PR brief above: one `gpt-5.6-sol` and one `claude-sonnet-5`. Give them the block in [simplification-focus.md](simplification-focus.md) verbatim, in addition to the review package. Their output is held back completely, not shown to the advisors or folded into any pool, until step 5.1 below: the advisors first have to reach a full, approved walkthrough plan on their own without seeing this fan-out's opinions.

Record every agent finding in the plan as it arrives. Once the whole-PR reviewers are done, proceed straight to the gate, where step 3 deduplicates the pooled findings before advisor review; do not stop and wait for further instruction.

## 3. Gate findings through advisors

Invoke the `pr-advisors` skill for the shared advisor models and defaults: use fresh advisors, separate from the step 2 fan-out.

Pool only your own findings from the entrypoint's "Review it yourself" pass together with the step 2 whole-PR fan-out's findings; these are the `F` findings (see step 6). Do not include the step 2 simplification fan-out here; its output stays withheld per step 2. Deduplicate the pooled findings: when the same issue arrives from more than one finder, keep its original ID and credit every independent finder, and keep that credit separate from which advisor merely validated it. Then put each one to both advisors. Surface only findings both accept. Two bars, both of which must clear: the issue is real, and fixing it makes the code better. A minor issue that clearly improves the code passes; a major-sounding issue nobody can substantiate does not; a defensible stylistic preference that changes nothing does not, however many reviewers raised it. Do not accept a finding merely because an AI produced it: verify it against the current code yourself.

Keep the rejects. They are reported at the end.

### 3.1 Advisor simplification pass

Have both advisors independently hunt for code to delete or shrink, using [simplification-focus.md](simplification-focus.md). Do not hand this task to the whole-PR fan-out; they are briefed for recall, and a pile of subjective simplification proposals is a worse starting point than two considered ones. This is still only the advisors' own pass; the step 2 simplification fan-out remains withheld until step 5.1.

Do not reject a simplification candidate merely because it is small or phrased as a question: an evidence-backed question both advisors agree is worth raising is a legitimate finding here, not a proven bug or an authorization to remove anything. Reject a candidate only when it is factually wrong, already handled, unsafe, or would not improve the code.

Cross-check between the two advisors and keep only what both call safe; that bar is stricter than the main gate, because a deletion that looks obvious in the diff can be load-bearing somewhere the diff does not show. Whatever survives joins the pool as an `A` finding (see step 6): the advisors originated it themselves, even though the lens they used was the simplification one.

Before proposing any removal, trace it: check the remaining callers, implementors, types, tests, fixtures, and any older path that still reaches the code, and say what you checked. An untraced deletion is a guess, and a guess that turns out to be load-bearing costs the author more than the removal saves.

### 3.2 Advisor reconciliation of prior comments

Have the advisors check the user's (`gh api user --jq .login`) own previous top-level and inline review comments against the subsequent diff and any replies collected in step 1. Omit findings that are already addressed, including duplicates raised again by the sub-agent reviewers; present unaddressed comments together with what still remains missing. Surface any disagreements between the advisors rather than resolving them yourself.

## 4. Plan the walkthrough

Organize the accepted findings (steps 3 through 3.2) into logical sections by feature, behavior, or concern, never file-by-file or commit-by-commit. One section may span several files, and one file may appear in several sections. Order them background first, then the core change, then supporting changes, then tests, docs, and cleanup.

Write the section list, the notes, and the issues per section into the plan, and keep the plan current as the review proceeds. Save each section's exact diff and issue text to files in the session folder and record the paths in the plan, so the walkthrough can move section to section without recomputing anything.

For every accepted finding, record in the plan: the SHA it was reviewed against, the evidence for it, its original finder(s) by actual model ID (never a validating advisor), each advisor's verdict, and its current disposition. This ledger is what step 6's per-finding presentation and step 7's triage table both read from, and it is exactly what "Handling a new head" below re-evaluates entry by entry.

## 5. First complete walkthrough approval

Get every advisor's explicit approval of the complete plan built in steps 3 through 4: every accepted finding, its explanation, its exact diff excerpt, and its placement in the walkthrough, per `pr-advisors`'s "approve the final result" step, applied here to the whole deliverable rather than one finding at a time.

### 5.1 Incorporate the simplification fan-out

Only now, after the approval above, bring the step 2 simplification fan-out's withheld findings to the advisors. They assess each candidate using the same reject rules as step 3.1; incorporate only the candidates both advisors unanimously accept, as `S` findings (see step 6), keeping the fan-out as their original finder even though the advisors are the ones who accepted them. Update the plan and its ledger, then get a final, revised walkthrough approval covering the updated plan. This revised approval, not the one from step 5, is what step 6 requires before it can begin.

## 6. Walk through, one section at a time

Do not start until the final revised walkthrough approval from step 5.1 is in hand.

Open with a short orientation: what the PR does and why, your overall read of it, and the section outline, two to three paragraphs. Then walk the sections in the order agreed with the advisors.

For each section:

1. Echo the section's diff first, omitting massive hunks and pointing at the file instead, so the user can review it before you interpret it.
2. Then say what the section does and how it fits the wider system, and why it is happening, not just what. Have the advisors draft this explanation as part of their walkthrough prep, not you alone.
3. Present the accepted issues for that section. Use `F1`, `F2`, ... for issues the whole-PR reviewers or your own "Review it yourself" pass found (step 3), `S1`, `S2`, ... for issues the dedicated simplification fan-out originated (step 2, incorporated in step 5.1), and `A1`, `A2`, ... for issues the advisors originated themselves, including anything they turned up in their own independent simplification pass (step 3.1). An issue keeps its original ID and finder credit for as long as it exists: incorporating an `S` finding in step 5.1 does not relabel it `A`, because the fan-out, not the advisors, originated it; the advisors only accepted it. `A` is reserved for issues nobody but an advisor raised, wherever in the process the advisor raised them. If the same issue arrives from more than one independent finder, it keeps one ID and credits every one of them, kept separate from whichever advisor only validated it. For each finding:

   **F1. A one line description of the issue.**
   A paragraph, or two, explaining the issue and why it matters.
   * Found by: gpt-5.6-sol, claude-sonnet-5

   If your own "Review it yourself" pass found the issue too, credit it by your actual model ID (from the session context), not a generic "myself" or "the main agent". Credit the user only on issues they explicitly raised, not on every issue they commented on.
4. Weigh tradeoffs and alternatives where more than one reasonable approach exists, and try to establish why this one was chosen before arguing for another.

Keep it skimmable. Then pause, end the turn, and continue only on explicit request.

### Self-review mode

If the PR is authored by the user (its author matches `gh api user --jq .login`), ask at the end of the first walkthrough section whether they want to enter self-review-and-fix mode.

In that mode, when the user asks to fix a review comment mid-walkthrough, do not fix it yet: note it, with all relevant detail, into the plan as a fix to make later. When the walkthrough is complete, ask if they want to fix the queued issues now. If so, hand them to the `address-pr-review` skill. Findings discovered locally in this review have no GitHub thread ID; do not fabricate one or force posting and resolving a thread just to hand a finding off. The review itself stays read-only throughout.

## 7. Wrap up

Say plainly that the review is over, then give a triage table covering every finding that reached the gate, drawn from the ledger in step 4:

| #   | Finding         | Verdict                        | Disposition               |
| --- | --------------- | ------------------------------ | ------------------------- |
| 1   | [Brief finding] | Accepted, both advisors        | Comment posted            |
| 2   | [Brief finding] | Accepted, both advisors        | Not posted, awaiting call |
| 3   | [Brief finding] | Rejected, [which advisor, why] | Dropped                   |
| 4   | [Brief finding] | Accepted                       | Dismissed by you          |

Then close with your confirmed overall read of the PR.

## Handling a new head

If the PR is force-pushed or gains commits mid-review, rebuild the package against the new head and have the advisors re-evaluate every open finding in the ledger, entry by entry, as fixed, still open, or now inapplicable, then restart the walkthrough. A reviewer that examined an older SHA no longer counts as clean; neither the step 5 nor the step 5.1 approval carries over to the new head, though a reviewer's concrete findings may still apply. Rebuild and re-evaluate rather than reusing an old clean verdict.
