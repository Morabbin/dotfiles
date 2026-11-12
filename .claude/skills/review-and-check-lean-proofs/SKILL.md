---
name: review-and-check-lean-proofs
description: Review Lean 4 theorems adversarially and check them mechanically beyond "it compiles" - statement vs intent, vacuous or unneeded hypotheses, by-construction claims, axioms and trusted code, sandboxed multi-kernel replay with lake check/lake comparator, and prose-vs-Lean claims. Use when reviewing, auditing or adding CI for Lean proofs, when someone says a result "is checked in Lean", or before relying on AI-written Lean.
---

# Review and check Lean proofs

"The proof is checked in Lean" is a strong signal, but only about what the kernel was given. It says nothing about
whether the statement means what the prose claims, whether the build you ran is the one that was checked, whether the
environment was tampered with, or whether the kernel itself was right. This skill turns that gap into a review
checklist and a set of mechanical checks you can run once and wire into CI.

The structure follows four questions from Kevin Buzzard's "...and the proof is checked in Lean" (Xena Project blog,
12 Nov 2026), plus a fifth on prose, and adds checks learned from auditing a large Lean code base (about 1,000
theorems about an executable implementation).

## The five questions

1. **Does the Lean statement say what the claim says?** The kernel checks the proof, never the statement. This is the
   question most failures hide in, and only partly mechanizable.
2. **Does the code build?** From scratch, on the pinned toolchain, and, if any of it is untrusted (AI-written,
   third-party), in a sandbox: building Lean runs arbitrary code.
3. **Does the proof prove the stated theorem, from the standard axioms?** Nothing in the imported code may change what
   the statement means or add an assumption: no `sorry`, no extra axiom, no `native_decide` trust, no environment
   hacking, no metaprogram faking a result.
4. **Could a kernel bug be doing the work?** Replay the exported environment through independent kernels.
5. **Does the prose match the Lean?** README, papers and docs often claim more than the theorem they cite.

Work through them in that order for a review; wire 2-4 and the mechanical half of 1 into CI. Details and commands
are in the references; the outline is below.

## 1. Statement vs intent (the reviewer's job)

Read `references/statement-review.md` and apply it to every theorem the work relies on. The short form:

- Read the elaborated statement, not the docstring or the theorem's name (`#check @thm`, or `#print thm` with
  `set_option pp.explicit true` when coercions or implicit arguments matter).
- Unfold every definition the statement names. A definition named like a spec concept may not mean it.
- Check the types: `Nat` subtraction truncates and `x / 0 = 0`; a type with one constructor makes every equality
  in it trivial; an empty type makes every `∀` over it vacuous; `Bool` vs `Prop`; `Option`/`Except` defaults.
- Check the hypotheses: satisfiable together? all needed? does one restate the conclusion?
- Check the conclusion: `True`, `rfl` by unfolding, or a closed instance presented as a general law?
- Check quantifiers and their order, `∃` vs `∀`, `↔` vs `→`, and what the theorem is about: the model or the code
  that runs (`@[implemented_by]`, `@[extern]`, `@[csimp]`, `partial` all separate the two).
- Write the statement back in plain English from the Lean alone, then compare with the claim.

Run `scripts/statement-audit.lean` over the claimed theorems: it flags the mechanizable shapes (`vacuous`,
`restates-hypothesis`, `hypotheses-not-needed`, `by-construction`, `unused-hypothesis`, `closed`). Each flag needs a
recorded reason or a fix; keep the reasons in a committed file and fail CI on a new flag without one. Self-test the
audit with `scripts/statement-audit-seeds.lean` (a negative control: if a seeded bad statement is not flagged, the
audit is broken). In the code base this was built on, its first run found two theorems that were true only because
a type had a single value.

Mutation testing is the strongest mechanical test of "is this theorem about this code": change a definition the
theorem is about (flip a comparison, drop a case) and rebuild. If the proofs still go through, no theorem constrains
that behaviour.

## 2. Build

- Build from a clean checkout with the toolchain in `lean-toolchain`; treat warnings (`declaration uses 'sorry'`) as
  failures.
- Untrusted code builds in a sandbox: `lake check` and `lake comparator` (Lean 4.35+) build and export inside
  `bwrap` with no network and only `.lake` writable. Elsewhere, use a VM or container with no credentials.

## 3. Axioms, trusted code and environment tricks

See `references/axioms-and-trust.md`. In short:

- `#print axioms` on every relied-on theorem: only `propext`, `Classical.choice`, `Quot.sound`. `sorryAx` means a
  sorry; `Lean.ofReduceBool`/`Lean.trustCompiler` mean `native_decide` (trusts the compiler); anything else is an
  added axiom.
- Grep for `sorry`, `admit`, `native_decide`, `axiom`, `unsafe`, `@[implemented_by]`, `@[extern]`, `partial`, and
  for metaprogramming that can change meaning (`macro_rules`, `notation`, `local instance`, `set_option` touching
  `debug.*` or the kernel, `run_cmd`/`#eval` that calls `addDecl`).
- Do not trust an axiom check that runs inside the same elaborated environment as the code it checks. Replay the
  export: `lake check` (whole project) or `lake comparator` (named theorems against a challenge).
- **Comparator challenge (statement lock).** Write a challenge module that states the relied-on theorems with
  `sorry` (`scripts/make-challenge.lean` generates one from statement files), list them in `comparator.json`, and run
  `lake comparator`. It checks each solution theorem has exactly the challenge's statement with identical
  constants, uses only the permitted axioms, and passes the kernel. Commit the challenge and fail CI when
  regenerating it gives a diff: every change to what a theorem states then shows up as a reviewed diff.
  Limit: definitions both sides import are shared, so a misleading definition passes; that is question 1's job.

## 4. Independent kernels

`lake check --paranoid` / `lake comparator --paranoid` replay the export through `leanchecker-paranoid`, `lean4lean`,
`nanoda`, `con-leche` and `con-ron` as well as Lean's kernel, so an exploit must fool all of them. On older
toolchains use `lean4checker` and `nanoda` over a `lean4export` dump. Commands, timings and the sandbox's path
pitfall: `references/kernels-and-comparator.md`.

## 5. Prose vs Lean

Every claim in README, docs, papers, PR text or coverage tables names the theorem that backs it, and that theorem's
statement (read per question 1) says what the sentence says, no more. Flag "proved" where the theorem covers a model
the running code does not use, a special case, or holds by construction. Reading an English rendering of the Lean
(informalization) side by side with the prose finds most overclaims fast.

## Wiring it into CI

`references/ci-wiring.md` gives a step list: fast checks on every change (hygiene grep, axiom audit, statement audit
with its reasons file and self-test, challenge freshness) and slower ones on demand or nightly (`lake check
--paranoid`, `lake comparator --paranoid`, mutation testing).

## Reporting

For each finding give the theorem, the shape or question it fails, how it was shown (tactic, kernel, grep), and the
fix: strengthen or restate the theorem, narrow the claim in prose, or record the reviewed reason it stays. A clean
mechanical run is not a clean review: say which questions were checked by a person.
