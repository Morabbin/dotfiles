# Statement review checklist

The kernel checks that a proof proves its statement. Whether the statement is the claim is a person's job. Do this
for every theorem the work relies on; keep a short written note per theorem (what it says in English, what it
assumes, what it excludes).

## Read the real statement

- `#check @thm` for the elaborated type; `set_option pp.explicit true` / `pp.coercions true` / `pp.proofs true` when
  implicit arguments, coercions or instances could change the reading.
- Ignore the name and the docstring until you have read the type. Then check the docstring against it.
- A theorem restated in a "spec" file and proved by citing the original is fine: the restated type is the one that
  was proved. A spec file that only *mentions* a theorem in prose is not.

## Definitions

- Unfold every definition the statement names (`#print`, go to definition). Ask: is this the concept the prose
  names, or an approximation, a model, a stub, a decidable approximation of a `Prop`?
- Watch for definitions that are trivially true or empty by construction (`def Valid _ := True`, a predicate over
  a type with no inhabitants, an `Option` that is always `none`).
- Is the statement about the code that runs? `@[implemented_by f]` and `@[extern]` replace a definition at run time
  with code no theorem sees. `partial def` is opaque to proofs. `@[csimp]` is safe only because a theorem proves the
  replacement equal.

## Types

- `Nat`: `a - b = 0` when `b > a`; `a / 0 = 0`; `a % 0 = a`. `Int.toNat` clamps. `Float` has no useful laws.
- A type with exactly one value (an enum with one constructor, `Unit`, a subsingleton structure) makes any equality
  between its values trivial. A theorem "the negotiated version is the one every message carries" is empty if there
  is only one version.
- An empty type makes `∀ x : T, ...` vacuously true.
- `Bool` vs `Prop`: `b = true` vs `p`; `decide` coercions; `==` vs `=` (a `BEq` instance need not be lawful).
- Default values: `Option.getD`, `List.head!`, `Array.get!` return a default on failure, which a statement may then
  "prove" things about.

## Hypotheses

- Are they jointly satisfiable? Exhibit one input that meets them (a closed `example` with concrete values is a good
  regression test). Unsatisfiable hypotheses make the theorem say nothing.
- Is each one needed? A hypothesis the proof does not use, or a conclusion that holds without them, means the claim
  is narrower than it could be, or the hypothesis encodes the conclusion.
- Does a hypothesis assume what should be proved (a "well-formed" premise that is the property itself, or an
  assumption the running code never establishes)? Check that callers in the real code path can discharge it.

## Conclusion

- `True`, `x = x`, or a conclusion closed by `rfl` after unfolding: true by construction. Sometimes intended (a
  definition stated in the spec's words); then the prose must say "defined as", not "proved".
- A closed statement (no variables) is one worked example, not a law.
- Quantifier order (`∀ x, ∃ y` vs `∃ y, ∀ x`), `∃` that a trivial witness satisfies, `→` where `↔` was claimed.
- Equalities between functions (`@f = @g`) are strong; equalities on one input are not.

## Model vs reality

- Is the theorem about a model of a system (a state machine, a trace semantics) or about the code that is shipped?
  If a model, what ties the model to the code (a refinement theorem, tests, nothing)?
- Is the relied-on function the one the program actually calls on its served path? A theorem about an uncalled helper
  backs no claim about behaviour.

## Write it back in English

Write one or two sentences of what the Lean says, from the Lean alone, then compare with the claim being made.
Disagreements are findings. An LLM-produced informalization is a useful second reading but not a substitute.

## Mechanical help

`scripts/statement-audit.lean` flags: `vacuous`, `restates-hypothesis`, `hypotheses-not-needed`, `by-construction`,
`unused-hypothesis`, `closed-example`. Each flag is a question, not a verdict; record the answer.
