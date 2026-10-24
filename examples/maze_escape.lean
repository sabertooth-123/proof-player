def Maze : List (Nat × Nat) :=
  [(1, 2), (2, 3), (3, 4), (2, 5), (5, 6), (6, 9), (4, 7), (7, 8), (8, 11),
   (5, 10), (10, 11), (9, 12), (11, 12), (12, 13), (6, 3)]

inductive Path (E : List (Nat × Nat)) : Nat → Nat → Prop
  | here (a : Nat) : Path E a a
  | step {a b c : Nat} : (a, b) ∈ E → Path E b c → Path E a c

theorem escape : Path Maze 1 13 := by
  have e1 : (1, 2) ∈ Maze := by decide
  apply Path.step e1
  have e2 : (2, 5) ∈ Maze := by decide
  apply Path.step e2
  have e3 : (5, 10) ∈ Maze := by decide
  apply Path.step e3
  have e4 : (10, 11) ∈ Maze := by decide
  apply Path.step e4
  have e5 : (11, 12) ∈ Maze := by decide
  apply Path.step e5
  have e6 : (12, 13) ∈ Maze := by decide
  apply Path.step e6
  exact Path.here 13
