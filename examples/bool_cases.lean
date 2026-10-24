theorem and_comm_bool (a b : Bool) : (a && b) = (b && a) := by
  cases a with
  | false =>
    cases b with
    | false => rfl
    | true => rfl
  | true =>
    cases b with
    | false => rfl
    | true => rfl
