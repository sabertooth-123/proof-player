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

const T = (a: number, b: number) => `Path [(1, 2), (2, 3), (3, 4)] ${a} ${b}`;
export const mockGraph: Goal[][] = [
  [g(T(1, 4))],
  [g(T(2, 4), undefined, [["h1", "Edge (1, 2)"]])],
  [g(T(3, 4), undefined, [["h1", "Edge (1, 2)"], ["h2", "Edge (2, 3)"]])],
  [],
];
