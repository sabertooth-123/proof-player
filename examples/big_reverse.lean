theorem big_reverse : [1, 2, 3, 4, 5, 6, 7, 8].reverse = [8, 7, 6, 5, 4, 3, 2, 1] := by
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rw [List.reverse_cons]
  rfl
