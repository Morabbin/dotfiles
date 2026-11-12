# Wiring the checks into CI

A step list that has worked; adapt names and paths. Run fast steps on every change, slow ones nightly or behind a
flag.

## Every change (seconds to a few minutes)

1. **Toolchain pin**: every package's `lean-toolchain` matches one root pin.
2. **Hygiene grep**: no `sorry`, `admit`, `native_decide`, `axiom` in sources (allowlist only generated challenge
   files, whose `sorry` bodies are the point).
3. **Build**: `lake build` of every package, warnings that mean `sorry` treated as errors.
4. **Axiom audit**: an in-Lean script over every relied-on theorem, failing on any axiom outside the three standard
   ones, and comparing the names it checked with the names declared.
5. **Statement audit** (`scripts/statement-audit.lean`): flags compared with a committed reasons file
   (`{"theorem", "shape", "how", "why"}` per flag, plus the count audited). Fail on a flag with no reason, on a
   reason whose flag is gone, and on a changed count. Run the self-test seeds too.
6. **Challenge freshness**: regenerate the comparator challenge and diff with the committed one. A diff fails the
   step until committed, so every statement change is reviewed as a diff.
7. **Trusted register**: generated list of partial/IO/extern/implemented_by/unsafe declarations equals the
   committed register.

## On demand / nightly (minutes)

8. `lake comparator --config comparator.json --paranoid` (all kernels, named theorems vs challenge).
9. `lake check --paranoid` on each package (whole environment, all kernels, axioms).
10. Mutation testing of the definitions the theorems are about: a mutant the build still accepts is a behaviour no
    theorem constrains; classify survivors and either add a theorem or record why not.

## Review rule to add to CONTRIBUTING

A change to what a theorem states (a diff in the challenge), a new statement-audit flag, or a new trusted
declaration is called out in the PR description and reviewed against `statement-review.md`. "It compiles" and "the
kernels accept it" are reported, never offered as evidence that the statement is right.
