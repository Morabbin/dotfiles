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

## Pitfalls

- **Path dependencies outside the project.** The sandbox binds `/` read-only and covers home directories, so a
  `path = "../other"` dependency under `$HOME` is invisible ("package directory not found"). Run from a checkout
  outside `$HOME` (for example a copy under `/srv` or `/opt`), or move the dependency inside the project.
- **Time.** Measured on a ~80k-declaration export: `lake check` about 2 minutes, `--paranoid` about 7 minutes (the
  external kernels dominate). Run `--paranoid` nightly or on demand, the plain checks on every change.
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
