import { describe, it, expect } from "vitest";
import { award, balances, newBank, transaction, validBank } from "./bank";
import { fresh, normalize, load, save, valid } from "./storage";
describe("reward bank", () => {
  it("banks unused time across calendar days without retroactive rate changes", () => {
    let b = award(newBank(), 10, "2026-11-01", "one", "Addition");
    b = {
      ...b,
      config: {
        ...b.config,
        mode: "both",
        minutesPerPoint: 2,
        centsPerPoint: 5,
      },
    };
    b = award(b, 10, "2026-11-02", "two", "Subtraction");
    expect(balances(b)).toEqual({ minutes: 30, cents: 50 });
    expect(b.entries[0].minutes).toBe(10);
  });
  it("caps each currency independently and spending does not reopen caps", () => {
    let b = newBank();
    b.config = {
      mode: "both",
      minutesPerPoint: 1,
      centsPerPoint: 10,
      minuteCap: 12,
      centCap: 150,
    };
    b = award(b, 10, "2026-11-01", "one", "Practice");
    b = transaction(b, "2026-11-01", "used", -8, 0, "Played a game");
    b = award(b, 10, "2026-11-01", "two", "Practice");
    expect(b.entries.at(-1)).toMatchObject({ minutes: 2, cents: 50 });
    expect(balances(b)).toEqual({ minutes: 4, cents: 150 });
  });
  it("awards savings only and is idempotent for duplicate source IDs", () => {
    let b = newBank();
    b.config.mode = "savings";
    b = award(b, 10, "2026-11-01", "one", "Practice");
    b = award(b, 10, "2026-11-01", "one", "Practice");
    expect(b.entries).toHaveLength(1);
    expect(balances(b)).toEqual({ minutes: 0, cents: 50 });
  });
  it("records contributions, purchases and reversible corrections with notes", () => {
    let b = transaction(
      newBank(),
      "2026-11-01",
      "contribution",
      0,
      1500,
      "Birthday contribution",
    );
    b = transaction(b, "2026-11-02", "purchase", 0, -1000, "Purchased Lego");
    expect(balances(b).cents).toBe(500);
    expect(() =>
      transaction(b, "2026-11-02", "purchase", 0, -1000, "Another purchase"),
    ).toThrow();
    expect(() =>
      transaction(b, "2026-11-02", "correction", 1, 0, ""),
    ).toThrow();
    b = transaction(
      b,
      "2026-11-02",
      "correction",
      0,
      100,
      "Correct purchase amount",
    );
    expect(b.entries).toHaveLength(3);
    expect(balances(b).cents).toBe(600);
  });
  it("migrates old histories once, preserving practice and prompting opening confirmation", () => {
    const d = fresh();
    d.version = 1;
    delete d.bank;
    d.bonusHistory = [
      {
        id: "old",
        date: "2026-11-01",
        numbers: [10, 20, 30],
        correct: true,
        minutes: 2,
      },
    ];
    const migrated = normalize(d);
    expect(migrated.version).toBe(2);
    expect(migrated.bank!.openingConfirmed).toBe(false);
    expect(balances(migrated.bank!).minutes).toBe(2);
    expect(normalize(migrated).bank!.entries).toHaveLength(1);
    expect(migrated.bonusHistory).toEqual(d.bonusHistory);
  });
  it("round trips the ledger, goal photo, and rate configuration through exports", () => {
    const d = fresh();
    d.bank!.goal.image = "data:image/png;base64,YQ==";
    d.bank = award(d.bank!, 10, "2026-11-01", "one", "Practice");
    let raw = "";
    const store = {
      getItem: () => raw,
      setItem: (_: string, v: string) => {
        raw = v;
      },
    };
    expect(save(d, store)).toBe(true);
    expect(load(store).bank).toEqual(d.bank);
    expect(valid(JSON.parse(raw))).toBe(true);
  });
  it("rejects malformed ledgers and external images", () => {
    const b = newBank();
    b.goal.image = "https://tracker.example/image.jpg";
    expect(validBank(b)).toBe(false);
    b.goal.image = "";
    b.config.centsPerPoint = NaN;
    expect(validBank(b)).toBe(false);
  });
  it("only resets daily point counters and retains bank balances", () => {
    const d = fresh();
    d.daily = { date: "2000-01-01", minutes: 20, sessions: 2 };
    d.bank = award(d.bank!, 10, "2000-01-01", "one", "Practice");
    expect(normalize(d).daily.minutes).toBe(0);
    expect(balances(normalize(d).bank!).minutes).toBe(10);
  });
});
