-- Self-test seeds for statement-audit.lean: paste before its final `#eval`, run, and check that each seed gets
-- exactly the shapes in its comment (and `sound` gets none). A seed that is not flagged means the audit is broken.
namespace AuditSeed
-- expect: vacuous
theorem vacuous : ∀ n : Nat, n < 0 → n = 5 := fun _ h => absurd h (Nat.not_lt_zero _)
-- expect: restates-hypothesis
theorem restates (p : Prop) (h : p) : p := h
-- expect: hypotheses-not-needed (the proof mentions `h`, needlessly)
theorem notNeeded (n : Nat) (h : n > 3) : n + 0 = n := by have := h; rfl
-- expect: by-construction
theorem byConstruction (n : Nat) : (fun x => x) n = n := rfl
-- expect: hypotheses-not-needed, unused-hypothesis
theorem unused (n m : Nat) (_h : n = m) : n + m = m + n := Nat.add_comm n m
-- expect: hypotheses-not-needed, unused-hypothesis (through the cited theorem)
theorem unusedCited (n m : Nat) (h : n = m) : n + m = m + n := unused n m h
-- expect: closed-example
theorem closed : (2 : Nat) + 2 = 4 := rfl
-- expect: no flag
theorem sound (n m : Nat) (h : n ≤ m) : n < m + 1 := Nat.lt_succ_of_le h
end AuditSeed

