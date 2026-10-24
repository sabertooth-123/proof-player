// HAND-SHAPED mock data in the contract format, only for previewing M3's work.
// Real traces come from M4's extractor. Do not ship these as "real Lean output".
import type { Goal } from "../types/proof";

const g = (target: string, caseName?: string, hyps: [string, string][] = []): Goal => ({
  caseName,
  hypotheses: hyps.map(([n, type]) => ({ names: n.split(" "), type })),
  target,
});

export const mockList: Goal[][] = [
  [g("[3, 1, 2].reverse = [2, 1, 3]")],
  [g("[1, 2].reverse ++ [3] = [2, 1, 3]")],
  [g("[2].reverse ++ [1] ++ [3] = [2, 1, 3]")],
  [g("[2] ++ [1] ++ [3] = [2, 1, 3]")],
  [],
];

const xsys: [string, string] = ["xs ys", "List Nat"];
export const mockGoal: Goal[][] = [
  [g("(xs ++ ys).length = xs.length + ys.length", undefined, [xsys])],
  [
    g("([] ++ ys).length = [].length + ys.length", "nil", [["ys", "List Nat"]]),
    g("((x :: xs) ++ ys).length = (x :: xs).length + ys.length", "cons", [
      ["x", "Nat"], ["xs ys", "List Nat"],
      ["ih", "(xs ++ ys).length = xs.length + ys.length"],
    ]),
  ],
  [
    g("((x :: xs) ++ ys).length = (x :: xs).length + ys.length", "cons", [
      ["x", "Nat"], ["xs ys", "List Nat"],
      ["ih", "(xs ++ ys).length = xs.length + ys.length"],
    ]),
  ],
  [],
];

// Same shape as the real graph_path trace: proved edges are hypotheses, target is `Reach E n 6`.
export const mockGraph: Goal[][] = [
  [g("Reach E 1 6")],
  [g("Reach E 2 6", undefined, [["h12", "(1, 2) ∈ E"]])],
  [g("Reach E 5 6", undefined, [["h12", "(1, 2) ∈ E"], ["h25", "(2, 5) ∈ E"]])],
  [],
];
