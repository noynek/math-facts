import type { Fact } from "./math";
import { status, type Records } from "./mastery";
export function select(
  pool: Fact[],
  records: Records,
  previous?: Fact,
  random = Math.random,
): Fact {
  const available = pool.filter((f) => f.id !== previous?.id);
  const choices = available.length ? available : pool;
  const roll = random();
  const category =
    roll < 0.6 ? "learning" : roll < 0.85 ? "practicing" : "mastered";
  const group = choices.filter((f) => status(records[f.id]) === category);
  const candidates = group.length ? group : choices;
  // Unseen facts get a substantial weight; mistakes, slower answers and related families get extra review.
  const weights = candidates.map((f) => {
    const r = records[f.id];
    if (!r) return 8;
    const avg = r.times.reduce((a, b) => a + b, 0) / r.times.length;
    const family =
      previous && [previous.a, previous.b, previous.answer].includes(f.answer);
    return (
      1 +
      4 / (r.attempts + 1) +
      (r.incorrect / r.attempts) * 3 +
      Math.min(avg / 10, 2) +
      (family ? 0.5 : 0)
    );
  });
  let target = random() * weights.reduce((a, b) => a + b, 0);
  return (
    candidates.find((_, i) => (target -= weights[i]) <= 0) ??
    candidates[candidates.length - 1]
  );
}
