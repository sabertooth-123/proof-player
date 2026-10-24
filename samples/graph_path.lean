def E : List (Nat × Nat) := [(1, 2), (2, 3), (3, 4), (4, 6), (2, 5), (5, 6)]

inductive Reach (E : List (Nat × Nat)) : Nat → Nat → Prop
  | refl (a : Nat) : Reach E a a
  | step {a b c : Nat} : (a, b) ∈ E → Reach E b c → Reach E a c

theorem path_1_6 : Reach E 1 6 := by
  have h12 : (1, 2) ∈ E := by decide
  apply Reach.step h12
  have h25 : (2, 5) ∈ E := by decide
  apply Reach.step h25
  have h56 : (5, 6) ∈ E := by decide
  apply Reach.step h56
  exact Reach.refl 6
