import { it, expect } from "vitest";
import { applyPreset } from "./presets";
import { fresh, valid } from "./storage";
import { award, balances } from "./bank";
it("applies future presets without changing goal, balances, history, or curriculum", () => {
  const d = fresh();
  d.bank = award(d.bank!, 10, "2026-11-01", "one", "Practice");
  d.settings.maxOperand = 12;
  d.bank.goal.name = "Lego";
  const next = applyPreset(d, "both", 10);
  expect(balances(next.bank!)).toEqual(balances(d.bank));
  expect(next.bank!.entries[0]).toEqual(d.bank.entries[0]);
  expect(next.bank!.goal.name).toBe("Lego");
  expect(next.settings.maxOperand).toBe(12);
  expect(next.bank!.config.centsPerPoint).toBe(10);
  expect(valid(next)).toBe(true);
});
it("practice only awards neither currency and preserves existing balances", () => {
  const d = applyPreset(fresh(), "none");
  const b = award(d.bank!, 10, "2026-11-01", "one", "Practice");
  expect(balances(b)).toEqual({ minutes: 0, cents: 0 });
  expect(valid({ ...d, bank: b })).toBe(true);
});
