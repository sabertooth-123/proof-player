theorem goal_tree : ((1 + 1 = 2 ∧ 2 + 2 = 4) ∧ (3 * 3 = 9 ∧ 10 - 4 = 6)) ∧ [1, 2, 3].length = 3 := by
  constructor
  · constructor
    · constructor
      · rfl
      · rfl
    · constructor
      · rfl
      · rfl
  · rfl
