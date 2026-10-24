
theorem list_demo : [1, 2, 3, 4, 5].reverse = [5, 4, 3, 2, 1] := by
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rfl
