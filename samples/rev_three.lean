theorem rev_three : [1, 2, 3].reverse = [3, 2, 1] := by
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rfl
