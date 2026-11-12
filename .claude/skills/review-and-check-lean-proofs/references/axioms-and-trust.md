# Axioms, trusted code and environment tricks

## Axioms

`#print axioms thm` lists every axiom the proof depends on, transitively. A clean result is a subset of
`propext`, `Classical.choice`, `Quot.sound`.

| Seen | Means |
|---|---|
| `sorryAx` | a `sorry` or an elaboration error admitted somewhere |
| `Lean.ofReduceBool`, `Lean.trustCompiler` | `native_decide` or `decide +kernel`-style trust in compiled code |
| any other name | an `axiom` declared somewhere in the imports |

Audit in a script that fails the build (iterate over the theorems with `Lean.collectAxioms`), and compare the list
it checked against the list of theorems declared, so a theorem it misses is noticed.

An axiom audit that runs inside the same elaborated environment is only as trustworthy as that environment: a
metaprogram in the imports can add declarations without the kernel (`addDecl` with a disabled check, debug options)
or fake an audit command. Replay the export outside it (`lake check`, `lake comparator`, external kernels).

## Grep list (fail CI on these outside an allowlist)

- `sorry`, `admit`, `native_decide`, `decide +kernel` (where policy forbids it), `axiom`, `opaque` with `implemented_by`
- `unsafe`, `@[implemented_by]`, `@[extern]`: run-time code no theorem sees. Each needs a reason and a register entry
- `partial def`: opaque to proofs; theorems cannot see its body
- `set_option debug.*`, `set_option maxRecDepth` in odd places, `set_option trace.*` left in (noise, not unsoundness)
- metaprogramming in proof-adjacent code: `macro_rules`, `notation`, `syntax`, `elab`, `run_cmd`, `#eval` with side
  effects, `local instance`/`attribute [local instance]` that changes how a statement elaborates

## Trusted register

Keep a committed list of every declaration whose correctness is assumed, not proved (partial, IO, extern,
implemented_by, unsafe, external tools), each with what it does, why it is trusted, and how it is tested. Generate it
from the elaborated environment and fail CI when the code and the register disagree.

## Comparator (statement lock)

`lake comparator` (Lean 4.35+):

```json
{
  "challenge_module": "Challenge",
  "solution_module": "MyLib",
  "theorem_names": ["MyLib.Spec.thm1", "MyLib.Spec.thm2"],
  "permitted_axioms": ["propext", "Quot.sound", "Classical.choice"]
}
```

The challenge module states each theorem with `sorry`; generate it from statement files with
`scripts/make-challenge.lean` and add it as a non-default `lean_lib` in the lakefile. Comparator builds and exports
both sides in a sandbox, checks each named theorem's type is identical (every constant it uses compared too), checks
axioms, and replays the solution through the kernel (`--paranoid`: five more kernels). Exit 0 accepted, 1 rejected,
2 could not start.

What it adds over an in-process axiom audit: the check runs on the export, not in the environment that built it;
proofs and anything they import cannot change what the challenge's statement means; committing the challenge makes
every statement change a visible diff. What it cannot see: definitions both sides import are the same constants, so a
definition that does not mean what its name says passes. That stays a review question.
