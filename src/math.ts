export type Operation = "addition" | "subtraction";
export type Fact = {
  id: string;
  op: Operation;
  a: number;
  b: number;
  answer: number;
};
export function facts(op: Operation, max = 9, minuend = 18): Fact[] {
  const result: Fact[] = [];
  for (let a = 0; a <= (op === "addition" ? max : minuend); a++)
    for (let b = 0; b <= max; b++)
      if (op === "addition" || a >= b)
        result.push({
          id: `${op}:${a}:${b}`,
          op,
          a,
          b,
          answer: op === "addition" ? a + b : a - b,
        });
  return result;
}
export const label = (f: Fact) =>
  `${f.a} ${f.op === "addition" ? "+" : "−"} ${f.b}`;
export function strategy(f: Fact): string {
  const { a, b, answer, op } = f;
  if (op === "subtraction") {
    if (a > 10 && b > a - 10)
      return `${a} − ${a - 10} = 10. Then take away ${b - (a - 10)} more to get ${answer}.`;
    return `Think of the related addition fact: ${b} + ${answer} = ${a}.`;
  }
  if (a === b) return `A doubles fact: ${a} + ${a} = ${answer}.`;
  if (a < 10 && a + b > 10)
    return `${a} + ${10 - a} = 10. Add the other ${b - (10 - a)} to get ${answer}.`;
  return `Start at ${Math.max(a, b)} and count on ${Math.min(a, b)} to reach ${answer}.`;
}
export function bonus() {
  return Array.from({ length: 3 }, () => 10 + Math.floor(Math.random() * 90));
}
