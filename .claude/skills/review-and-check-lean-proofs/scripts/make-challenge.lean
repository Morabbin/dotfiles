import Lean

/-! Writes a comparator challenge from a statement file: each `theorem` body replaced by `sorry`.

`lake comparator` (Lean 4.35+) judges a *solution* module against a *challenge* module that states theorems with
`sorry` proofs: on exports built in a sandbox, each named solution theorem must have exactly the challenge's statement
(every constant the statement uses identical in both), use only permitted axioms, and pass the kernel(s).

This program copies a statement file, parsed by Lean's own parser (the file is elaborated, so every notation in scope
parses), replacing each `theorem`'s body by `sorry` (also under `open X in`), and renames the statement modules'
imports so the challenge imports its own copies. Everything else is copied as written. Commit the output: a diff in
it is a change to what a theorem states, and a check that regenerates and diffs it is a statement lock.

  lake env lean --run make-challenge.lean OUTDIR SRCROOT FROM_PREFIX TO_PREFIX FILE
  e.g. lake env lean --run make-challenge.lean Challenge MyLib/ MyLib.Spec Challenge.Spec MyLib/Spec/Foo.lean
       writes Challenge/Spec/Foo.lean, with `import MyLib.Spec.X` turned into `import Challenge.Spec.X`

Run it once per file, in a fresh process each time: importing a second module set into one process is not reliable.

Limits: a statement file that a non-statement module the challenge needs imports (directly or not) cannot be copied
(its names would clash); private declarations get module-specific names and will not match; the definitions the
statements use come from the same modules in both, so the comparator cannot catch a definition that does not mean
what its name says. -/

open Lean Elab

/-- The `theorem` nodes of a command, at any depth (theorems do not nest, so none is inside another's body). -/
partial def theoremsIn (stx : Syntax) : Array Syntax :=
  if stx.getKind == ``Parser.Command.theorem then #[stx]
  else stx.getArgs.foldl (fun acc a => acc ++ theoremsIn a) #[]

/-- The text of one statement file with each theorem's body (its `declVal`) replaced by `sorry`. -/
def stripProofs (path : System.FilePath) : IO (String × Nat) := do
  let input ← IO.FS.readFile path
  let inputCtx := Parser.mkInputContext input path.toString
  let (header, parserState, messages) ← Parser.parseHeader inputCtx
  let (env, messages) ← processHeader header {} messages inputCtx (trustLevel := 1024)
  let s ← IO.processCommands inputCtx parserState (Command.mkState env messages {})
  for m in s.commandState.messages.toList do
    if m.severity == .error then throw <| IO.userError s!"{path}: {← m.toString}"
  -- the byte ranges of the theorem bodies, in order
  let mut cuts : Array (String.Pos.Raw × String.Pos.Raw) := #[]
  for cmd in s.commands do
    -- a theorem may sit under a command combinator (`open X in theorem …`): look through the whole command
    for decl in theoremsIn cmd do
      let val := decl[3]
      match val.getPos? (canonicalOnly := true), val.getTailPos? (canonicalOnly := true) with
      | some a, some b => cuts := cuts.push (a, b)
      | _, _ => throw <| IO.userError s!"{path}: a theorem body without a position"
  cuts := cuts.qsort (fun x y => x.1 < y.1)
  let mut out := ""
  let mut at_ : String.Pos.Raw := 0
  for (a, b) in cuts do
    out := out ++ String.Pos.Raw.extract input at_ a ++ ":=\n  sorry"
    at_ := b
  out := out ++ String.Pos.Raw.extract input at_ input.rawEndPos
  return (out, cuts.size)

unsafe def main (args : List String) : IO UInt32 := do
  let [outDir, srcRoot, fromPre, toPre, f] := args
    | IO.eprintln "usage: make-challenge OUTDIR SRCROOT FROM_PREFIX TO_PREFIX FILE"; return 2
  initSearchPath (← findSysroot)
  enableInitializersExecution
  let (text, n) ← stripProofs f
  let rel := ((f.dropPrefix? srcRoot).map (·.toString)).getD f
  let text := (text.replace ("import " ++ fromPre ++ "\n") ("import " ++ toPre ++ "\n")).replace
    ("import " ++ fromPre ++ ".") ("import " ++ toPre ++ ".")
  let header := "-- Generated from " ++ f ++ ": the statements, every proof `sorry`. " ++
    "Do not edit: a diff here is a change to what a theorem states.\n"
  let dest := System.FilePath.mk outDir / rel
  if let some p := dest.parent then IO.FS.createDirAll p
  IO.FS.writeFile dest (header ++ text)
  IO.println s!"{f}: {n} theorems"
  return 0
