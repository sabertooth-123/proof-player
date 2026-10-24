// Tiny helpers for reading Lean's printed terms. Pure string functions.

const OPEN = "([{";
const CLOSE = ")]}";

/** Split `s` on `sep`, but only where bracket depth is 0. */
export function splitTopLevel(s: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let last = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) depth--;
    else if (depth === 0 && s.startsWith(sep, i)) {
      parts.push(s.slice(last, i));
      last = i + sep.length;
      i = last - 1;
    }
  }
  parts.push(s.slice(last));
  return parts.map((p) => p.trim());
}

function matchingBracket(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (OPEN.includes(text[i])) depth++;
    else if (CLOSE.includes(text[i])) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** Outermost list literals in `text`, each as its element strings.
 *  "[3, 1, 2].reverse ++ [4]" -> [["3","1","2"], ["4"]] */
export function findListLiterals(text: string): string[][] {
  const out: string[][] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "[") {
      const end = matchingBracket(text, i);
      if (end === -1) break;
      const inner = text.slice(i + 1, end).trim();
      out.push(inner === "" ? [] : splitTopLevel(inner, ","));
      i = end + 1;
    } else i++;
  }
  return out;
}

/** Split a target at its first top-level "=" (not <=, >=, !=, :=, ==, =>). */
export function splitSides(target: string): [string, string | null] {
  let depth = 0;
  for (let i = 0; i < target.length; i++) {
    const c = target[i];
    if (OPEN.includes(c)) depth++;
    else if (CLOSE.includes(c)) depth--;
    else if (depth === 0 && c === "=") {
      const prev = target[i - 1] ?? " ";
      const next = target[i + 1] ?? " ";
      if (!"<>!:=".includes(prev) && next !== "=" && next !== ">") {
        return [target.slice(0, i).trim(), target.slice(i + 1).trim()];
      }
    }
  }
  return [target.trim(), null];
}
