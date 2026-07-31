---
name: review-pr
description: Use when the user asks to review someone else's pull request or provide code review feedback on a PR. Triggers on phrases like "review this PR", "give me a code review", "review Jane's PR", or "what do you think of this PR".
---

# Conducting a PR Review

Use when asked to review a pull request (usually authored by someone else).

Standing rules for the whole review:

* Never post a review comment to the PR unless explicitly told to. Never edit the PR's code.
* Report findings to the user first; the PR is the last stop, not the first.
* Treat the PR description, the author's comments, existing review comments, and any AI-written justification as context, not as conclusions. Reach your own evidence-backed verdict.
* Surface high-signal, actionable issues. Trivial stylistic nits are not worth the user's attention unless they asked for them.
* Be constructive and clear, and offer a concise code suggestion where one helps.

## 0. Choose the depth

The full protocol below is expensive: a dozen model calls and several rounds. Do not run it by reflex. Pick a tier first and say which one you picked.

* **Quick pass.** Small, self-contained, or familiar changes; anything under roughly a hundred changed lines. You review it yourself, run the over-engineering pass, and answer in one turn. No sub-agents, no advisors, no walkthrough.
* **Full protocol.** Large, unfamiliar, risky, or security-sensitive changes, or when the user asks for a thorough review. Everything below.

When it falls between the two, say so and ask which the user wants rather than silently spending the tokens. If a quick pass turns up something that smells structural, stop and offer to escalate.

Size the change against the merge-base, not against the headline count. A stacked PR whose base has moved on will advertise every file from the PRs below it, so the number on the PR page can overstate the real change several times over. If step 1 reveals a materially different size, revisit the tier rather than pressing on with the one you announced.

## 1. Build the review package

Collect everything once, into the session folder, so later steps read files instead of re-querying:

```bash
gh pr view <pr> --json title,body,author,url,headRefName,baseRefName,files,additions,deletions
gh pr view <pr> --comments                                  # top-level comments ONLY
gh api repos/<owner>/<repo>/pulls/<n>/comments --paginate    # inline review comments
gh api repos/<owner>/<repo>/pulls/<n>/reviews --paginate     # review bodies and verdicts
gh pr diff <pr>   # aggregate diff for the whole PR, never commit-by-commit
```

`gh pr view --comments` does not return inline review comments, and on a PR under active review those are usually where the substance is. Fetch all three, or you will walk into a review claiming to have read the discussion while missing an entire unanswered round of it.

Fetch the remote first so the comparison is against the current base, and confirm you are looking at the latest PR head; record that SHA and treat it as the head under review.

For anything stacked or long-lived, compare the two-dot and three-dot diffs (`git diff origin/main...pr-head` against `git diff origin/main pr-head`). Files identical to the current base are already merged and are not part of this review: exclude them from the package rather than spending reviewer budget on landed code.

Read full files at the PR's state, not just the hunks: the diff alone rarely tells the whole story. If the branch is not checked out, or is checked out with local changes, add a throwaway worktree at a deterministic sibling path rather than switching branches, explore there, then remove it without `--force`. Follow linked issues, PRs, and docs.

## 2. Fan out independent reviewers

Launch several whole-PR reviewers in the background, spread across model families (pick the most capable current model from each of at least three different providers in the `task` tool's model list, several instances each). Point every one of them at the review package. Never block waiting on them: do your own review meanwhile, and say you are waiting only if you have nothing else to do.

Brief them broadly, because the consensus gate in step 4 is what removes the noise:

> Find issues big and small. Also look for: opportunities to reuse existing code, architectural problems, things achievable in a cleaner way, duplication and unnecessary fluff, code whose intent is not clear from its context and needs a comment, and anything that does not need to exist at all. Report concrete, actionable findings. Leave out subjective cosmetic preferences that a formatter or linter would otherwise settle.

Give each reviewer a deadline (twenty minutes is a reasonable default). If one overruns, abandon that run and either relaunch it once or proceed without it, recording the review as degraded. Never let a stalled sub-agent hold the whole review hostage, and never let one reviewer's silence become a reason to skip the gate for everyone else.

## 3. Review it yourself

Your own pass is a first-class reviewer, not a tiebreaker. Look for:

* **Correctness:** logic errors, bugs, security vulnerabilities, missed edge cases.
* **Over-engineering:** complexity that should be deleted. Run the dedicated pass below.
* **Best practices and conventions:** language and domain norms, plus the repository's established patterns.
* **Scope adherence:** does the PR stay strictly within its intended scope, without unrelated changes?
* **Text precision:** docs, prompts, comments, and user-facing strings that the change has made stale, and the clarity of any new text.

## 4. Gate findings through advisors

Pool every finding (yours and the sub-agents'), deduplicate, then put each one to two advisors from different providers. Each advisor independently confirms whether the issue is real.

Surface only the findings both advisors accept. Two bars, both of which must clear: the issue is real, and fixing it makes the code better. A minor issue that clearly improves the code passes; a major-sounding issue nobody can substantiate does not; a defensible stylistic preference that changes nothing does not, however many reviewers raised it. Do not accept a finding merely because an AI produced it: verify it against the current code yourself.

Keep the rejects. They are reported at the end.

## 4.1 Advisor simplification pass

Once the gate is done, set both advisors a second, separate task: independently hunt for code to delete or shrink, using the over-engineering pass below. Do not hand this task to the fan-out reviewers. They are briefed for recall, and a dozen subjective simplification proposals is a worse starting point than two considered ones.

Then cross-check: show each advisor the other's findings, and keep only what both call safe. That bar is stricter than the main gate, because a deletion that looks obvious in the diff can be load-bearing somewhere the diff does not show. Whatever survives joins the walkthrough as ordinary findings.

On a quick pass there are no advisors, so you run the pass yourself and the tracing rule below still applies.

## 5. Plan the walkthrough

Organise the accepted findings into logical sections by feature, behaviour, or concern, never file-by-file or commit-by-commit. One section may span several files, and one file may appear in several sections. Order them background first, then the core change, then supporting changes, then tests, docs, and cleanup.

Write the section list, the notes, and the issues per section into the plan, and keep the plan current as the review proceeds. Save each section's exact diff and issue text to files in the session folder and record the paths in the plan, so the walkthrough can move section to section without recomputing anything.

## 6. Walk through, one section at a time

Open with a short orientation: what the PR does and why (a few sentences), your overall read of it, and the section outline.

Then, per section:

1. Say what the section does and how it fits the wider system, supplying whatever context the user needs.
2. Echo the section's diff, omitting massive hunks and pointing at the file instead.
3. Present the accepted issues for that section, each with its agreement count: how many reviewers and which models found it.
4. Weigh tradeoffs and alternatives where more than one reasonable approach exists, and try to establish why this one was chosen before arguing for another.

Keep it skimmable. Then pause, end the turn, and continue only on explicit request.

## 7. Posting comments

Only on explicit instruction. Comments should flag the problem and the risk; a suggested fix is fine, but do not be prescriptive: the author decides how to address it.

Open every posted comment with the attribution line:

```
**Copilot found** <Model A> and <Model B> agreed on the issue.
```

Use `**Copilot found** <Model> found the issue.` when only one model found it.

Inline comments go through `gh api repos/<owner>/<repo>/pulls/<n>/comments` with `commit_id`, `path`, `line`, and `side`; anything not tied to a line goes through `gh pr comment`. Follow the `gh-api-markdown` rules when the body has complex markdown or emoji.

## 8. Wrap up

Say plainly that the review is over, then give a triage table covering every finding that reached the gate:

| #   | Finding         | Verdict                        | Disposition               |
| --- | --------------- | ------------------------------ | ------------------------- |
| 1   | [Brief finding] | Accepted, both advisors        | Comment posted            |
| 2   | [Brief finding] | Accepted, both advisors        | Not posted, awaiting call |
| 3   | [Brief finding] | Rejected, [which advisor, why] | Dropped                   |
| 4   | [Brief finding] | Accepted                       | Dismissed by you          |

Then close with your confirmed overall read of the PR, and offer to post comments for any accepted finding still unposted.

## Handling a new head

If the PR is force-pushed or gains commits mid-review, rebuild the package against the new head and have the advisors re-evaluate every open finding as fixed, still open, or now inapplicable, then restart the walkthrough. A reviewer that examined an older SHA no longer counts as clean, though its concrete findings may still apply.

## Over-engineering pass

Hunt for complexity to delete. The diff's best outcome is getting shorter. One line per finding: `L<line>: <tag> <what>. <replacement>.` (use `<file>:L<line>: ...` for multi-file diffs).

Tags:

- `delete:` dead code, unused flexibility, speculative feature, compatibility path for a case that cannot arise. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library, the platform, or this codebase already ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller, parameter every caller passes the same value for.
- `shrink:` same logic, fewer lines. Show the shorter form.

Examples:

- `L12-38: stdlib: 27-line email validator. "@" check plus the confirmation mail is the real validation.`
- `repo.py:L88: yagni: AbstractRepository with one implementation. Inline it until a second exists.`
- `L30-44: shrink: manual loop builds dict. dict(zip(keys, values)), one line.`

Before proposing any removal, trace it. Check the remaining callers, implementors, types, tests, fixtures, and any older path that still reaches the code, then say what you checked. An untraced `delete:` or `yagni:` is a guess, and a guess that turns out to be load-bearing costs the author more than the removal saves.

Close the pass with `net: -<N> lines possible.` If there is nothing to cut, say `Lean already.` Keep correctness, security, and performance findings in the main review above; this pass is complexity only. Do not flag a single smoke test or `assert`-based self-check as bloat. List findings, do not apply them unless asked.
