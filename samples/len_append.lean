theorem len_append (xs ys : List Nat) : (xs ++ ys).length = xs.length + ys.length := by
  induction xs with
  | nil =>
    simp
  | cons x xs ih =>
    simp [ih]
    omega
