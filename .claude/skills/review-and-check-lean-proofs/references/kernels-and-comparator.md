# Independent kernels, lake check and lake comparator

## What ships with Lean 4.35+

The release tarball's `bin/` has `leanexport` (the NDJSON exporter), `leanchecker`, `leanchecker-paranoid`,
`lean4lean`, `nanoda_bin`, `con-leche` and `con-ron`, and Lake has two commands that use them:

- `lake check [--paranoid]`: build the default targets, export them, replay through Lean's kernel (and, with
  `--paranoid`, all five external checkers), fail on any non-standard axiom.
- `lake comparator [--config comparator.json] [--paranoid]`: judge named theorems of a solution module against a
  challenge module (see `axioms-and-trust.md`).

Both evaluate the project as untrusted input: config, build, export and kernels run inside `bwrap` (bubblewrap),
with no network after dependency resolution and only `.lake` writable. Install `bubblewrap` (it needs unprivileged
user namespaces or a setuid binary). Exit codes: 0 accepted, 1 rejected, 2 could not start (no `bwrap`, no
`lake-manifest.json`, bad config).

## Which declarations to check: changed theorems and their dependents

Rule (SKILL.md, question 4): all six checkers and the comparator run on every new or changed theorem and on its
dependents, on every change. "Dependents" means every relied-on theorem whose closure of used constants contains a
changed declaration, whether that declaration is a theorem or a definition, instance or lemma.

- **Default: replay the whole relied-on set.** Export the relied-on theorems by name (`lake env leanexport Module --
  name…`, which includes everything they use, plus the comparator's extra names below) and run every checker on that
  export. Any dependent of a change is in it by construction. In a project with a naming convention for relied-on
  theorems (`spec_*`, a `comparator.json` list), that list is the name set.
- **Narrowing (only when the full replay is too slow).** Compute the changed declarations from the diff (every
  declaration in an edited region, including ones a changed macro or notation elaborates differently). Then compute
  the reverse closure: in Lean, for each relied-on theorem `t`, walk `ConstantInfo.getUsedConstantsAsSet` from `t`'s
  constant info transitively and keep `t` if the walk meets a changed name. Export the changed theorems plus that
  dependent set and replay it. Record which set was checked; a narrowed run does not replace the next full one.
- **Run the six explicitly** on each export `F`, with `C` the challenge module exported with the same names (one
  thread and an unlimited stack for nanoda; see below):

  ```
  ulimit -s unlimited
  leanchecker --silent --from-export F
  leanchecker-paranoid --silent --from-export F
  lean4lean --import F
  nanoda_bin nanoda.json   # {"export_file_path": "F", "permitted_axioms": [...], "num_threads": 1,
                           #  "unpermitted_axiom_hard_error": true, "nat_extension": true,
                           #  "string_extension": true}
  con-leche F
  con-ron F
  lake comparator --config comparator.json --challenge-from-export C --solution-from-export F
  ```

  `lake check --paranoid` / `lake comparator --paranoid` run the same six in one command where they fit (no path
  dependency outside the sandbox, no nanoda stack overflow).
- **Every checker must give a verdict.** Exit 0 from each of the seven commands is the pass. A crash, a timeout or a
  missing binary is "not checked", never "accepted"; fix the run or report the theorems as unchecked. Keep each
  checker's log and timing with the run so the verdicts can be cited.
- **Regenerate the challenge first** when a statement changed, so the comparator judges the new statement rather
  than failing on, or silently missing, the old one.

## Pitfalls

- **Path dependencies outside the project.** The sandbox binds `/` read-only and covers home directories, so a
  `path = "../other"` dependency under `$HOME` is invisible ("package directory not found"). Run from a checkout
  outside `$HOME` (for example a copy under `/srv` or `/opt`), or move the dependency inside the project.
- **nanoda stack overflow on large exports.** Inside `lake check --paranoid` / `lake comparator --paranoid`, nanoda runs
  on four threads with a fixed thread stack and can abort ("thread has overflowed its stack", exit 134) on a big
  export; that is a resource failure, not a rejection. `RUST_MIN_STACK` is not passed into the sandbox. Export
  yourself and run it on one thread with the stack limit lifted: `ulimit -s unlimited`, then `nanoda_bin cfg.json`
  with `"num_threads": 1` in the config.
- **Exporting yourself.** `lake env leanexport Module` exports the whole environment; `lake env leanexport Module --
  name…` exports those declarations and everything they use. For `lake comparator --challenge-from-export F
  --solution-from-export G`, include the names the comparator itself exports: `Quot Quot.mk Quot.lift Quot.ind`, the
  permitted axioms, and the kernel primitives (`Nat.add Nat.sub Nat.mul Nat.pow Nat.gcd Nat.div Nat.mod Nat.beq Nat.ble
  Nat.land Nat.lor Nat.xor Nat.shiftLeft Nat.shiftRight String.ofList Char.ofNat List eagerReduce Nat String String.mk
  Char optParam autoParam semiOutParam outParam`), or it reports "Const not found in challenge". This also avoids the
  path-dependency pitfall, since nothing is built in the sandbox. The other checkers take the export directly:
  `leanchecker --silent --from-export F`, `leanchecker-paranoid --silent --from-export F`, `lean4lean --import F`,
  `con-leche F`, `con-ron F`.
- **Time.** Measured on a ~77k-declaration export: `lake check` about 2 minutes, `--paranoid` about 7 minutes (the
  external kernels dominate); a ~22k-declaration export of a large library's theorems took nanoda about 4 minutes on
  one thread. That is the cost of every change that touches a theorem or something one depends on (see "Which
  declarations to check"); run it then, not only nightly. Changes that touch no Lean declaration can skip it.
- **Challenge warnings.** A challenge full of `sorry` prints one warning per theorem; filter them from logs.
- **One import set per process.** Tools that elaborate several files with `processHeader` in one process can see
  stale namespaces; run one process per file.

## Older toolchains

- `lean4checker` (github.com/leanprover/lean4checker): `lake env lean4checker [--fresh] Module` replays a module's
  declarations into a fresh environment through the kernel. `--fresh` replays everything from scratch.
- `lean4export` + `nanoda` (or `lean4lean`): export to a file, then run the external checker on it with a config
  naming the permitted axioms.
- Lean kernel arena: compares which kernels accept a given export; useful to see whether a disagreement is known.

## Reading the result

A kernel acceptance says the export is well typed under that kernel. With several independent kernels agreeing, an
exploit would have to break all of them at once. None of it says the statement is the claim (question 1).
