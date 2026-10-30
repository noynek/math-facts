import type { Fact } from "./math";
export type RecordFact = {
  attempts: number;
  correct: number;
  incorrect: number;
  times: number[];
  days: string[];
  sessions: string[];
  last: string;
  streak: number;
};
export type Records = Record<string, RecordFact>;
export function status(r?: RecordFact): "learning" | "practicing" | "mastered" {
  if (!r || r.correct < 3) return "learning";
  return r.days.length >= 2 &&
    r.sessions.length >= 3 &&
    r.streak >= 5 &&
    r.correct / r.attempts >= 0.85
    ? "mastered"
    : "practicing";
}
export function record(
  records: Records,
  f: Fact,
  correct: boolean,
  seconds: number,
  session: string,
  day: string,
): Records {
  const r = records[f.id] ?? {
    attempts: 0,
    correct: 0,
    incorrect: 0,
    times: [],
    days: [],
    sessions: [],
    last: "",
    streak: 0,
  };
  return {
    ...records,
    [f.id]: {
      attempts: r.attempts + 1,
      correct: r.correct + Number(correct),
      incorrect: r.incorrect + Number(!correct),
      times: [...r.times, seconds].slice(-10),
      days: correct ? [...new Set([...r.days, day])] : r.days,
      sessions: correct ? [...new Set([...r.sessions, session])] : r.sessions,
      last: day,
      streak: correct ? r.streak + 1 : 0,
    },
  };
}
