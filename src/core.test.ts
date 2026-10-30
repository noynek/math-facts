import { describe, it, expect } from "vitest";
import { facts, strategy } from "./math";
import { select } from "./adaptive";
import { record, status } from "./mastery";
import { rewards, bonusReward } from "./rewards";
import { fresh, load, save, normalize, today, valid } from "./storage";
describe("curriculum", () => {
  it("generates every addition fact and expanded range", () => {
    expect(facts("addition")).toHaveLength(100);
    expect(facts("addition", 12)).toHaveLength(169);
    for (const f of facts("addition")) expect(f.answer).toBe(f.a + f.b);
  });
  it("generates nonnegative subtraction with correct bounds", () => {
    for (const f of facts("subtraction")) {
      expect(f.a).toBeLessThanOrEqual(18);
      expect(f.b).toBeLessThanOrEqual(9);
      expect(f.answer).toBeGreaterThanOrEqual(0);
      expect(f.answer).toBe(f.a - f.b);
    }
  });
  it("offers mathematically grounded strategies", () => {
    expect(
      strategy({ id: "", op: "addition", a: 8, b: 5, answer: 13 }),
    ).toContain("10");
    expect(
      strategy({ id: "", op: "subtraction", a: 14, b: 6, answer: 8 }),
    ).toContain("take away 2");
  });
});
describe("adaptive practice", () => {
  it("avoids exact consecutive facts and handles empty categories", () => {
    const pool = facts("addition");
    for (let i = 0; i < 100; i++)
      expect(select(pool, {}, pool[0]).id).not.toBe(pool[0].id);
    expect(pool).toContainEqual(select(pool, {}, undefined, () => 0.99));
  });
  it("selects review categories in the intended proportions", () => {
    const pool = facts("addition").slice(0, 3);
    let records = {};
    for (let i = 0; i < 6; i++) {
      records = record(
        records,
        pool[1],
        true,
        2,
        `s${i}`,
        `2026-10-${(i % 2) + 1}`,
      );
      records = record(records, pool[2], true, 2, "one", "2026-10-01");
    }
    expect(select(pool, records, undefined, () => 0.1).id).toBe(pool[0].id);
    expect(select(pool, records, undefined, () => 0.7).id).toBe(pool[2].id);
    expect(select(pool, records, undefined, () => 0.9).id).toBe(pool[1].id);
  });
});
describe("mastery", () => {
  it("requires multiple sessions and days, allows slow correct answers", () => {
    const f = facts("addition")[0];
    let r = {};
    for (let i = 0; i < 6; i++) r = record(r, f, true, 25, "one", "2026-10-01");
    expect(status(r[f.id as keyof typeof r])).toBe("practicing");
    r = record(r, f, true, 25, "two", "2026-10-02");
    r = record(r, f, true, 25, "three", "2026-10-02");
    expect(status(r[f.id as keyof typeof r])).toBe("mastered");
    r = record(r, f, false, 1, "four", "2026-10-02");
    expect(status(r[f.id as keyof typeof r])).toBe("practicing");
  });
});
describe("rewards", () => {
  const s = fresh().settings;
  it("uses highest accuracy tier only", () => {
    expect(
      rewards({ correct: 19, total: 20 }, undefined, false, s, 0, 0).minutes,
    ).toBe(10);
    expect(
      rewards({ correct: 17, total: 20 }, undefined, true, s, 0, 0).minutes,
    ).toBe(11);
  });
  it("respects daily and session caps", () => {
    expect(
      rewards({ correct: 20, total: 20 }, undefined, true, s, 19, 0).minutes,
    ).toBe(1);
    expect(
      rewards({ correct: 20, total: 20 }, undefined, true, s, 0, 2).minutes,
    ).toBe(0);
  });
  it("requires accurate improvement", () => {
    expect(
      rewards(
        { correct: 18, total: 20 },
        { correct: 16, total: 18 },
        false,
        s,
        0,
        0,
      ).minutes,
    ).toBe(11);
    expect(
      rewards(
        { correct: 12, total: 20 },
        { correct: 10, total: 12 },
        false,
        s,
        0,
        0,
      ).minutes,
    ).toBe(5);
  });
});
describe("persistence", () => {
  it("round trips versioned progress", () => {
    let value = "";
    const store = {
      getItem: () => value,
      setItem: (_: string, v: string) => {
        value = v;
      },
    };
    const d = fresh();
    d.settings.nickname = "Alex";
    expect(save(d, store)).toBe(true);
    expect(load(store)).toEqual(d);
  });
  it("recovers from corruption and invalid imports", () => {
    expect(load({ getItem: () => "{broken" })).toEqual(fresh());
    expect(valid({ version: 5 })).toBe(false);
    const d = fresh();
    d.settings.maxOperand = 999;
    expect(valid(d)).toBe(false);
  });
  it("resets daily counters while retaining accomplishments", () => {
    const d = fresh();
    d.daily = { date: "2000-01-01", minutes: 20, sessions: 2 };
    d.bests.addition = 14;
    const restored = normalize(d);
    expect(restored.daily).toEqual({ date: today(), minutes: 0, sessions: 0 });
    expect(restored.bests.addition).toBe(14);
  });
  it("reports unavailable storage", () => {
    expect(
      save(fresh(), {
        setItem: () => {
          throw Error();
        },
      }),
    ).toBe(false);
  });
});

describe("standalone bonus rewards", () => {
  it("uses only the bonus and respects both daily caps", () => {
    const s = fresh().settings;
    expect(bonusReward(true, s, 0, 0)).toBe(2);
    expect(bonusReward(true, s, 19, 0)).toBe(1);
    expect(bonusReward(true, s, 0, 2)).toBe(0);
    expect(bonusReward(false, s, 0, 0)).toBe(0);
    expect(bonusReward(true, s, 20, 0)).toBe(0);
  });
});
