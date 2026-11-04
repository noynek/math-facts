export type Entry = {
  id: string;
  date: string;
  kind:
    | "earned"
    | "used"
    | "contribution"
    | "correction"
    | "purchase"
    | "settings"
    | "legacy";
  note: string;
  minutes: number;
  cents: number;
  points: number;
  source?: string;
};
export type Bank = {
  openingConfirmed: boolean;
  config: {
    mode: "time" | "savings" | "both" | "none";
    minutesPerPoint: number;
    centsPerPoint: number;
    minuteCap: number;
    centCap: number;
  };
  entries: Entry[];
  goal: { name: string; target: number; image: string; purchased: boolean };
};
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export function newBank(): Bank {
  return {
    openingConfirmed: true,
    config: {
      mode: "time",
      minutesPerPoint: 1,
      centsPerPoint: 5,
      minuteCap: 20,
      centCap: 1000,
    },
    entries: [],
    goal: {
      name: "My next big build",
      target: 4000,
      image: "",
      purchased: false,
    },
  };
}
export const balances = (bank: Bank) =>
  bank.entries.reduce(
    (a, e) => ({ minutes: a.minutes + e.minutes, cents: a.cents + e.cents }),
    { minutes: 0, cents: 0 },
  );
export function award(
  bank: Bank,
  points: number,
  date: string,
  source: string,
  note: string,
): Bank {
  if (bank.entries.some((e) => e.source === source)) return bank;
  const earned = bank.entries
    .filter(
      (e) => e.date === date && (e.kind === "earned" || e.kind === "legacy"),
    )
    .reduce(
      (a, e) => ({ minutes: a.minutes + e.minutes, cents: a.cents + e.cents }),
      { minutes: 0, cents: 0 },
    );
  const c = bank.config;
  const minutes =
    c.mode === "savings" || c.mode === "none"
      ? 0
      : Math.max(
          0,
          Math.min(
            Math.round(points * c.minutesPerPoint),
            c.minuteCap - earned.minutes,
          ),
        );
  const cents =
    c.mode === "time" || c.mode === "none"
      ? 0
      : Math.max(
          0,
          Math.min(
            Math.round(points * c.centsPerPoint),
            c.centCap - earned.cents,
          ),
        );
  return {
    ...bank,
    entries: [
      ...bank.entries,
      {
        id: source,
        date,
        source,
        kind: "earned",
        note,
        minutes,
        cents,
        points,
      },
    ],
  };
}
export function transaction(
  bank: Bank,
  date: string,
  kind: Entry["kind"],
  minutes: number,
  cents: number,
  note: string,
): Bank {
  if (!note.trim())
    throw Error("Add a note so this change is clear in the history.");
  if (!Number.isSafeInteger(minutes) || !Number.isSafeInteger(cents))
    throw Error(
      "Enter whole minutes and dollar amounts with up to two decimal places.",
    );
  const balance = balances(bank);
  if (
    !Number.isSafeInteger(balance.minutes + minutes) ||
    !Number.isSafeInteger(balance.cents + cents)
  )
    throw Error("That amount is too large.");
  if (balance.minutes + minutes < 0 || balance.cents + cents < 0)
    throw Error("This change would make a balance negative.");
  return {
    ...bank,
    entries: [
      ...bank.entries,
      {
        id: crypto.randomUUID(),
        date,
        kind,
        minutes,
        cents,
        note: note.trim(),
        points: 0,
      },
    ],
  };
}
export function migrateBank(d: {
  sessions: { id: string; date: string; minutes: number }[];
  bonusHistory?: { id: string; date: string; minutes: number }[];
}): Bank {
  const entries = [
    ...d.sessions.map((s) => ({
      ...s,
      note: "Previously earned practice time",
    })),
    ...(d.bonusHistory ?? []).map((s) => ({
      ...s,
      note: "Previously earned bonus time",
    })),
  ].map((s) => ({
    id: `legacy:${s.id}`,
    date: s.date,
    kind: "legacy" as const,
    note: s.note,
    minutes: s.minutes,
    cents: 0,
    points: 0,
  }));
  return { ...newBank(), openingConfirmed: entries.length === 0, entries };
}
export function validBank(b: Bank): boolean {
  try {
    return (
      !!b &&
      typeof b.openingConfirmed === "boolean" &&
      ["time", "savings", "both", "none"].includes(b.config.mode) &&
      [
        b.config.minutesPerPoint,
        b.config.centsPerPoint,
        b.config.minuteCap,
        b.config.centCap,
      ].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 1000000) &&
      typeof b.goal.name === "string" &&
      Number.isSafeInteger(b.goal.target) &&
      b.goal.target > 0 &&
      typeof b.goal.purchased === "boolean" &&
      typeof b.goal.image === "string" &&
      (!b.goal.image ||
        /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
          b.goal.image,
        )) &&
      b.goal.image.length <= 600000 &&
      Array.isArray(b.entries) &&
      b.entries.every(
        (e) =>
          e &&
          typeof e.id === "string" &&
          typeof e.date === "string" &&
          typeof e.note === "string" &&
          [
            "earned",
            "used",
            "contribution",
            "correction",
            "purchase",
            "settings",
            "legacy",
          ].includes(e.kind) &&
          [e.minutes, e.cents, e.points].every(Number.isSafeInteger) &&
          e.points >= 0 &&
          (e.source === undefined || typeof e.source === "string"),
      ) &&
      new Set(b.entries.map((e) => e.id)).size === b.entries.length &&
      Number.isSafeInteger(balances(b).minutes) &&
      Number.isSafeInteger(balances(b).cents) &&
      balances(b).minutes >= 0 &&
      balances(b).cents >= 0
    );
  } catch {
    return false;
  }
}
