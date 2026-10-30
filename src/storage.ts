import type { Operation, Fact } from "./math";
import type { Records } from "./mastery";
import type { RewardSettings } from "./rewards";
export type Settings = RewardSettings & {
  nickname: string;
  addition: boolean;
  subtraction: boolean;
  bonusEnabled: boolean;
  maxOperand: number;
  maxMinuend: number;
  sound: boolean;
};
export type Attempt = {
  fact: Fact;
  correct: boolean;
  seconds: number;
  given: string;
};
export type Session = {
  id: string;
  date: string;
  op: Operation;
  correct: number;
  total: number;
  attempts: Attempt[];
  minutes: number;
  bonus: boolean;
  record: boolean;
};
export type BonusResult = {
  id: string;
  date: string;
  numbers: number[];
  correct: boolean;
  minutes: number;
};
export type Data = {
  bonusHistory?: BonusResult[];
  version: 1;
  settings: Settings;
  records: Records;
  sessions: Session[];
  daily: { date: string; minutes: number; sessions: number };
  bests: Record<Operation, number>;
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function fresh(): Data {
  return {
    version: 1,
    bonusHistory: [],
    settings: {
      nickname: "",
      addition: true,
      subtraction: true,
      bonusEnabled: true,
      maxOperand: 9,
      maxMinuend: 18,
      sound: false,
      completion: 5,
      tier70: 2,
      tier85: 4,
      tier95: 5,
      improvement: 2,
      bonus: 2,
      dailyLimit: 20,
      rewardedSessions: 2,
    },
    records: {},
    sessions: [],
    daily: { date: today(), minutes: 0, sessions: 0 },
    bests: { addition: 0, subtraction: 0 },
  };
}
export function normalize(d: Data): Data {
  if (d.daily.date !== today())
    return { ...d, daily: { date: today(), minutes: 0, sessions: 0 } };
  return d;
}
const nonnegative = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && n >= 0;
export function valid(d: unknown): d is Data {
  try {
    const v = d as Data;
    if (
      !v ||
      v.version !== 1 ||
      !v.settings ||
      !Array.isArray(v.sessions) ||
      !v.records ||
      typeof v.records !== "object" ||
      Array.isArray(v.records) ||
      !v.daily ||
      !v.bests
    )
      return false;
    if (
      v.bonusHistory !== undefined &&
      (!Array.isArray(v.bonusHistory) ||
        !v.bonusHistory.every(
          (b) =>
            b &&
            typeof b.id === "string" &&
            typeof b.date === "string" &&
            Array.isArray(b.numbers) &&
            b.numbers.length === 3 &&
            b.numbers.every(nonnegative) &&
            typeof b.correct === "boolean" &&
            nonnegative(b.minutes),
        ))
    )
      return false;
    const defaults = fresh().settings;
    if (
      !Object.entries(defaults).every(
        ([key, value]) =>
          typeof v.settings[key as keyof Settings] === typeof value &&
          (typeof value !== "number" ||
            nonnegative(v.settings[key as keyof Settings])),
      )
    )
      return false;
    if (
      v.settings.maxOperand < 1 ||
      v.settings.maxOperand > 12 ||
      !Number.isInteger(v.settings.maxOperand) ||
      v.settings.maxMinuend > 24 ||
      !Number.isInteger(v.settings.maxMinuend)
    )
      return false;
    if (
      !nonnegative(v.daily.minutes) ||
      !nonnegative(v.daily.sessions) ||
      typeof v.daily.date !== "string" ||
      !nonnegative(v.bests.addition) ||
      !nonnegative(v.bests.subtraction)
    )
      return false;
    const factValid = (f: Fact) =>
      f &&
      typeof f.id === "string" &&
      (f.op === "addition" || f.op === "subtraction") &&
      nonnegative(f.a) &&
      nonnegative(f.b) &&
      nonnegative(f.answer) &&
      f.answer === (f.op === "addition" ? f.a + f.b : f.a - f.b);
    return (
      v.sessions.every(
        (s) =>
          s &&
          typeof s.id === "string" &&
          typeof s.date === "string" &&
          (s.op === "addition" || s.op === "subtraction") &&
          nonnegative(s.correct) &&
          nonnegative(s.total) &&
          s.correct <= s.total &&
          nonnegative(s.minutes) &&
          typeof s.bonus === "boolean" &&
          typeof s.record === "boolean" &&
          Array.isArray(s.attempts) &&
          s.attempts.every(
            (a) =>
              a &&
              factValid(a.fact) &&
              typeof a.correct === "boolean" &&
              typeof a.given === "string" &&
              nonnegative(a.seconds),
          ),
      ) &&
      Object.values(v.records).every(
        (r) =>
          r &&
          nonnegative(r.attempts) &&
          nonnegative(r.correct) &&
          nonnegative(r.incorrect) &&
          nonnegative(r.streak) &&
          typeof r.last === "string" &&
          Array.isArray(r.times) &&
          r.times.every(nonnegative) &&
          Array.isArray(r.days) &&
          r.days.every((x) => typeof x === "string") &&
          Array.isArray(r.sessions) &&
          r.sessions.every((x) => typeof x === "string"),
      )
    );
  } catch {
    return false;
  }
}
export function load(storage: Pick<Storage, "getItem"> = localStorage): Data {
  try {
    const d = JSON.parse(storage.getItem("math-minutes-v1") ?? "null");
    return valid(d) ? normalize(d) : fresh();
  } catch {
    return fresh();
  }
}
export function save(
  d: Data,
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  try {
    storage.setItem("math-minutes-v1", JSON.stringify(d));
    return true;
  } catch {
    return false;
  }
}
