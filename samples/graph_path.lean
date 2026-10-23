


inductive Reach : Nat → Nat → Prop where
  | edge12 : Reach 1 2
  | edge23 : Reach 2 3
  | edge34 : Reach 3 4
  | edge45 : Reach 4 5
  | edge56 : Reach 5 6
  | trans {a b c : Nat} : Reach a b → Reach b c → Reach a c

theorem path_1_to_6 : Reach 1 6 := by
  apply Reach.trans
  · exact Reach.edge12
  · apply Reach.trans
    · exact Reach.edge23
    · apply Reach.trans
      · exact Reach.edge34
      · apply Reach.trans
        · exact Reach.edge45
        · exact Reach.edge56
