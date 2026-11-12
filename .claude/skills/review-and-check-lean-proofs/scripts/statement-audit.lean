-- Replace with the root module(s) of the library being audited.
import YourLib

/-! Statement audit: does each claimed theorem say something?

A theorem the kernel accepts can still claim less than it seems to: the statement is not the proof, and checking that
the statement means what the prose says is the reviewer's job. This file reads theorems from the elaborated
environment and looks for six shapes of a statement that says less than it reads:

* `vacuous`: the hypotheses contradict each other, so the theorem holds of nothing (`contradiction`, `omega` or
  `simp_all` proves `False` from them).
* `restates-hypothesis`: the conclusion is one of the hypotheses (`assumption` closes it).
* `hypotheses-not-needed`: the conclusion holds with every hypothesis dropped (`rfl`, `trivial`, `omega` or `simp`
  proves it without them), so the hypotheses only narrow the claim. This also catches a conclusion that is true
  because a type has only one value.
* `by-construction`: no hypotheses, and the conclusion holds by `rfl` or `trivial`: true by unfolding definitions.
* `unused-hypothesis`: a hypothesis the proof never uses, looking through a proof that cites another theorem.
* `closed`: no binders at all: a statement about fixed values, a worked example rather than a general claim.

A shape is not a fault by itself; each flag needs a reviewer's reason. Attempts are bounded by heartbeats, so a shape
a bounded search cannot show is not found: passing the audit does not show the statement means what its prose says.

Run: `AUDIT_MODULES=MyLib.Spec AUDIT_NAME_PREFIX=spec_ lake env lean statement-audit.lean`. Output: one JSON line per
flag between `-- statement-audit begin` and `-- statement-audit end <count>`. Self-test: append the seeds from
`statement-audit-seeds.lean` before the final `#eval` and check each seed gets exactly its expected shapes. -/

open Lean Meta Elab

-- the whole run is long; each tactic attempt has its own budget (`closes`)
set_option maxHeartbeats 0

/-- The audited theorems: every theorem declared in a module whose name starts with one of the prefixes in the
environment variable `AUDIT_MODULES` (comma-separated, e.g. `MyLib.Spec,MyLib.Main`), optionally only those whose
last name component starts with `AUDIT_NAME_PREFIX` (e.g. `spec_`), plus the self-test seeds (`AuditSeed.*`). -/
private def audited : MetaM (Array Name) := do
  let env ← getEnv
  let mods := ((← IO.getEnv "AUDIT_MODULES").getD "").splitOn "," |>.filter (· ≠ "") |>.map String.toName
  let namePre := (← IO.getEnv "AUDIT_NAME_PREFIX").getD ""
  let inMods (n : Name) : Bool := match env.getModuleIdxFor? n with
    | some i => let m := env.header.moduleNames[i.toNat]!; mods.any (·.isPrefixOf m)
    | none => false
  let lastOk (n : Name) : Bool := match n with
    | .str _ s => s.startsWith namePre
    | _ => false
  let thms := env.constants.fold (init := #[]) fun acc n info =>
    if info matches .thmInfo _ && !isPrivateName n && !n.isInternal && lastOk n && inMods n then acc.push n else acc
  let seeds := env.constants.map₂.foldl (init := #[]) fun acc n info =>
    if (`AuditSeed).isPrefixOf n && info matches .thmInfo _ then acc.push n else acc
  return (thms ++ seeds).qsort Name.lt

/-- Runs a tactic on a goal, within a heartbeat budget; true when it closes the goal with no error. -/
private def closes (goal : Expr) (tac : String) (budget : Nat := 4000) : MetaM Bool := do
  let env ← getEnv
  let stx ← match Parser.runParserCategory env `tactic s!"({tac})" with
    | .ok s => pure s
    | .error e => throwError "statement-audit: tactic {tac} does not parse: {e}"
  let saved ← saveState
  Core.resetMessageLog
  -- the goal is closed (its binders are in it), so it is posed in an empty local context: the caller's binders,
  -- hypotheses among them, must not be in scope for `assumption` or `contradiction`
  let attempt : MetaM Bool := withLCtx {} {} do
    let mv ← mkFreshExprMVar goal
    let rest ← withTheReader Core.Context (fun c => { c with maxHeartbeats := budget * 1000 }) <|
      Core.withCurrHeartbeats <| Term.TermElabM.run' <| Term.withoutErrToSorry do
        let gs ← Tactic.run mv.mvarId! (Tactic.evalTactic stx)
        Term.synthesizeSyntheticMVarsNoPostponing
        pure gs
    let v ← instantiateMVars mv
    -- a tactic can log an error and admit the goal rather than throw: any logged error is a failure
    let errs := (← Core.getMessageLog).hasErrors
    return rest.isEmpty && !errs && !v.hasSorry && !v.hasSyntheticSorry && !v.hasExprMVar
  -- a timeout is a runtime exception, which a plain `try` does not catch
  let ok ← tryCatchRuntimeEx attempt (fun _ => pure false)
  saved.restore
  return ok

/-- The first of the tactics that closes the goal. -/
private def firstCloser (goal : Expr) (tacs : List String) : MetaM (Option String) := do
  for t in tacs do
    if ← closes goal t then return some t
  return none

/-- Whether binder `i` of theorem `c` (counting every binder of its type) is used by its proof. A proof that is, under
its binders, a theorem applied to arguments uses binder `i` exactly when an argument that mentions it is at a binder
the cited theorem uses (or is not a bare binder); any other proof uses it when its value mentions it. -/
private partial def binderUsed (c : Name) (i : Nat) (depth : Nat := 8) : MetaM Bool := do
  let some (.thmInfo t) := (← getEnv).find? c | return true
  lambdaTelescope t.value fun xs body => do
    -- a proof with fewer lambdas than binders (eta-reduced): the missing ones are passed on implicitly
    if h : i < xs.size then
      let x := xs[i]
      if !body.containsFVar x.fvarId! then
        -- not in the body: used only if a later binder's type needs it (a dependent hypothesis)
        for y in xs[i+1:] do
          if (← inferType y).containsFVar x.fvarId! then return true
        return false
      if depth == 0 then return true
      let f := body.getAppFn
      match f with
      | .const d _ =>
        if (← getEnv).find? d matches some (.thmInfo _) then
          let args := body.getAppArgs
          for j in [0:args.size] do
            let a := args[j]!
            if a.containsFVar x.fvarId! then
              if a == x then
                if ← binderUsed d j (depth - 1) then return true
              else return true
          return false
        else return true
      | _ => return true
    else
      -- an eta-reduced proof `orig a b`: binder `i` is the cited theorem's binder after the arguments given
      match body.getAppFn with
      | .const d _ =>
        if depth > 0 && (← getEnv).find? d matches some (.thmInfo _) then
          binderUsed d (body.getAppNumArgs + (i - xs.size)) (depth - 1)
        else return true
      | _ => return true

private def jsonStr (s : String) : String := "\"" ++ (s.replace "\\" "\\\\" |>.replace "\"" "\\\"") ++ "\""

#eval show MetaM Unit from do
  let names ← audited
  IO.println "-- statement-audit begin"
  let mut n := 0
  for c in names do
    n := n + 1
    let some (.thmInfo t) := (← getEnv).find? c | continue
    let mut flags : Array (String × String) := #[]
    let r ← forallTelescope t.type fun xs concl => do
      let mut flags : Array (String × String) := #[]
      let mut hyps : Array Expr := #[]
      let mut idx : Array Nat := #[]
      for h : k in [0:xs.size] do
        let x := xs[k]
        if ← isProp (← inferType x) then
          -- an instance argument that is a proposition (`[Fact p]`) counts as a hypothesis too
          hyps := hyps.push x; idx := idx.push k
      let data := xs.filter (fun x => !hyps.contains x)
      if hyps.size > 0 then
        -- the hypotheses contradict each other
        let gFalse ← mkForallFVars xs (mkConst ``False)
        if let some tac ← firstCloser gFalse ["intros; contradiction", "intros; omega", "intros; simp_all"] then
          flags := flags.push ("vacuous", tac)
        -- the conclusion is one of the hypotheses
        let gSelf ← mkForallFVars xs concl
        if ← closes gSelf "intros; assumption" then flags := flags.push ("restates-hypothesis", "assumption")
        -- the conclusion holds without them (only when the conclusion does not depend on a hypothesis)
        if !(hyps.any fun h => concl.containsFVar h.fvarId!) then
          let gBare ← mkForallFVars data concl
          if let some tac ← firstCloser gBare ["intros; rfl", "intros; trivial", "intros; omega", "intros; simp"] then
            flags := flags.push ("hypotheses-not-needed", tac)
        -- a hypothesis the proof does not use
        for k in idx do
          if concl.containsFVar xs[k]!.fvarId! then continue
          unless ← binderUsed c k do
            flags := flags.push ("unused-hypothesis", toString (← xs[k]!.fvarId!.getUserName))
      else if xs.isEmpty then
        -- a statement about fixed values: a worked example, not a claim about every input
        flags := flags.push ("closed", "no binders")
      else
        let gBare ← mkForallFVars data concl
        if let some tac ← firstCloser gBare ["intros; rfl", "intros; trivial"] then
          flags := flags.push ("by-construction", tac)
      return flags
    flags := r
    for (kind, how) in flags do
      IO.println s!"\{\"theorem\": {jsonStr (toString c)}, \"shape\": {jsonStr kind}, \"how\": {jsonStr how}}"
  IO.println s!"-- statement-audit end {n}"
