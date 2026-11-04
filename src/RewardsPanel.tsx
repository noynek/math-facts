import { applyPreset, presetNames, type Preset } from "./presets";
import {
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { balances, money, newBank, transaction, type Bank } from "./bank";
import { today, type Data } from "./storage";
export function GoalCard({ bank }: { bank: Bank }) {
  const balance = balances(bank);
  const goal = bank.goal;
  if (bank.config.mode === "time" || bank.config.mode === "none") return null;
  return (
    <article className="panel goal-card">
      {goal.image && <img src={goal.image} alt={goal.name} />}
      <div>
        <p className="eyebrow">WORKING TOWARD</p>
        <h2>{goal.name}</h2>
        <strong>
          {goal.purchased ? money(goal.target) : money(balance.cents)}{" "}
          <small>of {money(goal.target)}</small>
        </strong>
        <progress
          aria-label="Savings goal progress"
          max={goal.target}
          value={
            goal.purchased ? goal.target : Math.min(goal.target, balance.cents)
          }
        />
        <p>
          {goal.purchased
            ? "Purchased — enjoy your reward!"
            : balance.cents >= goal.target
              ? "Goal reached! Ask your grown-up to celebrate."
              : `${money(goal.target - balance.cents)} to go. Every little practice adds up.`}
        </p>
      </div>
    </article>
  );
}
export function RewardsPanel({
  data,
  onChange,
  children,
}: {
  data: Data;
  onChange: Dispatch<SetStateAction<Data>>;
  children?: ReactNode;
}) {
  const bank = data.bank ?? newBank();
  const balance = balances(bank);
  const legacyMinutes = bank.entries
    .filter((e) => e.kind === "legacy")
    .reduce((s, e) => s + e.minutes, 0);
  const [tab, setTab] = useState<"rewards" | "activity" | "advanced">(
    "rewards",
  );
  const [preset, setPreset] = useState<Preset>(bank.config.mode);
  const [pace, setPace] = useState(
    bank.config.centsPerPoint === 5
      ? "steady"
      : bank.config.centsPerPoint === 10
        ? "faster"
        : "custom",
  );
  const [customRate, setCustomRate] = useState(bank.config.centsPerPoint / 100);
  const cents =
    pace === "steady"
      ? 5
      : pace === "faster"
        ? 10
        : Math.round(customRate * 100);
  const saving = preset === "savings" || preset === "both";
  const [applied, setApplied] = useState("");
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("use");
  const [opening, setOpening] = useState("");
  const [period, setPeriod] = useState("all");
  function update(next: Bank) {
    onChange({ ...data, bank: next });
    setError("");
  }
  function config(key: keyof Bank["config"], value: string | number) {
    const next = { ...bank, config: { ...bank.config, [key]: value } };
    update(
      transaction(
        next,
        today(),
        "settings",
        0,
        0,
        `Reward setting changed: ${{ mode: "reward type", minutesPerPoint: "minutes per point", centsPerPoint: "cents per point", minuteCap: "daily minute cap", centCap: "daily savings cap (cents)" }[key]} = ${value}. Future earnings only.`,
      ),
    );
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (period === "week" ? 6 : 29));
  const cutoffDate = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
  const entries = [...bank.entries].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  let runningMinutes = 0,
    runningCents = 0;
  const rows = entries
    .map((e) => {
      runningMinutes += e.minutes;
      runningCents += e.cents;
      return { ...e, runningMinutes, runningCents };
    })
    .filter((e) => period === "all" || e.date >= cutoffDate);
  const activity = [
    ...data.sessions.map((s) => ({
      date: s.date,
      description: `${s.op}: ${s.correct}/${s.total} correct (${s.total ? Math.round((s.correct / s.total) * 100) : 0}%)`,
    })),
    ...(data.bonusHistory ?? []).map((s) => ({
      date: s.date,
      description: `Bonus challenge: ${s.correct ? "solved" : "practiced"}`,
    })),
  ];
  return (
    <section className="panel settings reward-controls">
      <h2>Rewards & balances</h2>
      <p>
        Available: <b>{balance.minutes} game minutes</b> ·{" "}
        <b>{money(balance.cents)} savings</b>. Unused rewards carry forward;
        daily earning caps reset each local calendar day.
      </p>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {!bank.openingConfirmed && (
        <div className="notice">
          <h3>Confirm the opening time balance</h3>
          <p>
            We found {legacyMinutes} minutes in historical earnings. The app did
            not record how much was played. Enter the unused balance you want to
            keep; all historical awards remain in the ledger.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                const n = Number(opening);
                if (!opening || !Number.isSafeInteger(n) || n < 0)
                  throw Error("Enter a nonnegative whole-minute balance.");
                update({
                  ...transaction(
                    bank,
                    today(),
                    "correction",
                    n - legacyMinutes,
                    0,
                    "Parent confirmed unused opening game time",
                  ),
                  openingConfirmed: true,
                });
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label>
              Unused opening minutes
              <input
                type="number"
                min="0"
                required
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
              />
            </label>
            <button className="secondary">Confirm opening balance</button>
          </form>
        </div>
      )}
      <nav className="reward-tabs" aria-label="Parent reward sections">
        {(["rewards", "activity", "advanced"] as const).map((t) => (
          <button
            type="button"
            className={tab === t ? "selected" : ""}
            aria-pressed={tab === t}
            key={t}
            onClick={() => setTab(t)}
          >
            {
              {
                rewards: "Rewards",
                activity: "Activity & balances",
                advanced: "Advanced settings",
              }[t]
            }
          </button>
        ))}
      </nav>
      {tab === "rewards" && (
        <>
          <h3>Choose a reward plan</h3>
          <p>
            Current plan: <b>{presetNames[bank.config.mode]}</b>. Preview a
            preset, then apply it when you’re ready.
          </p>
          <div className="preset-grid">
            {(Object.keys(presetNames) as Preset[]).map((p) => (
              <button
                type="button"
                key={p}
                className={`preset-card ${preset === p ? "selected" : ""}`}
                aria-pressed={preset === p}
                onClick={() => {
                  setPreset(p);
                  setApplied("");
                }}
              >
                <b>{presetNames[p]}</b>
                <span>
                  {
                    {
                      time: "Bank game minutes until they’re used.",
                      savings: "Build savings toward a pictured goal.",
                      both: "Earn minutes and savings together.",
                      none: "Track learning without earning rewards.",
                    }[p]
                  }
                </span>
              </button>
            ))}
          </div>
          {saving && (
            <>
              <label>
                Earning pace
                <select
                  aria-label="Earning pace"
                  value={pace}
                  onChange={(e) => {
                    setPace(e.target.value);
                    setApplied("");
                  }}
                >
                  <option value="steady">
                    Steady — about $0.50 per typical session
                  </option>
                  <option value="faster">
                    Faster — about $1 per typical session
                  </option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              {pace === "custom" && (
                <label>
                  Dollars per practice point
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step=".01"
                    value={customRate}
                    onChange={(e) =>
                      setCustomRate(
                        Math.max(0, Math.min(10000, Number(e.target.value))),
                      )
                    }
                  />
                </label>
              )}
            </>
          )}
          <div className="preset-preview">
            <h3>Before you apply</h3>
            <p>
              {preset === "none"
                ? "Practice will earn no time or savings. Existing rewards remain available."
                : `A typical 10-point session earns ${preset !== "savings" ? "10 game minutes" : ""}${preset === "both" ? " and " : ""}${saving ? money(cents * 10) + " savings" : ""}. Accuracy and improvement affect actual awards.`}
            </p>
            {saving && (
              <p>
                A {money(bank.goal.target)} goal takes approximately{" "}
                {cents > 0
                  ? Math.ceil(
                      Math.max(0, bank.goal.target - balance.cents) /
                        (cents * 10),
                    )
                  : "∞"}{" "}
                more typical sessions at this pace, before daily caps.
              </p>
            )}
            <p>
              Future practice only. Existing balances, goal photo, and history
              stay intact.
            </p>
            <details>
              <summary>What this preset changes</summary>
              <p>
                This preset sets completion to 5 points, accuracy bonuses to 2 /
                4 / 5 points, and improvement and bonus challenges to 2 points
                each. Limits: 20 points and 2 rewarded sessions per day; 20 game
                minutes and $10 savings per day. Changes apply to future
                practice only. Balances, goal photo, and history stay intact.
              </p>
            </details>
            <button
              className="primary"
              onClick={() => {
                onChange((previous) => applyPreset(previous, preset, cents));
                setApplied("Preset applied. Existing rewards are unchanged.");
              }}
            >
              Apply preset
            </button>
            {applied && <p role="status">{applied}</p>}
          </div>
          {(bank.config.mode === "savings" ||
            bank.config.mode === "both" ||
            balance.cents > 0 ||
            bank.goal.purchased) && (
            <>
              <h3>Your savings goal</h3>
              <div className="settings-grid">
                <label>
                  Goal name
                  <input
                    maxLength={80}
                    value={bank.goal.name}
                    onChange={(e) =>
                      update({
                        ...bank,
                        goal: { ...bank.goal, name: e.target.value },
                      })
                    }
                  />
                </label>
                <label>
                  Goal price ($)
                  <input
                    type="number"
                    min=".01"
                    max="100000"
                    step=".01"
                    value={bank.goal.target / 100}
                    onChange={(e) =>
                      update({
                        ...bank,
                        goal: {
                          ...bank.goal,
                          target: Math.max(
                            1,
                            Math.round(Number(e.target.value) * 100),
                          ),
                        },
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Goal photo (stored on this device)
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    try {
                      if (
                        !["image/png", "image/jpeg", "image/webp"].includes(
                          file.type,
                        ) ||
                        file.size > 10000000
                      )
                        throw Error(
                          "Choose a PNG, JPEG, or WebP image smaller than 10 MB.",
                        );
                      const bitmap = await createImageBitmap(file);
                      const canvas = document.createElement("canvas");
                      const ratio = Math.min(
                        1,
                        600 / Math.max(bitmap.width, bitmap.height),
                      );
                      canvas.width = Math.max(
                        1,
                        Math.round(bitmap.width * ratio),
                      );
                      canvas.height = Math.max(
                        1,
                        Math.round(bitmap.height * ratio),
                      );
                      canvas
                        .getContext("2d")!
                        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
                      bitmap.close();
                      const image = canvas.toDataURL("image/jpeg", 0.75);
                      onChange((previous) => ({
                        ...previous,
                        bank: {
                          ...previous.bank!,
                          goal: { ...previous.bank!.goal, image },
                        },
                      }));
                      setError("");
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                />
              </label>
              {bank.goal.image && (
                <button
                  className="text-button"
                  onClick={() =>
                    update({ ...bank, goal: { ...bank.goal, image: "" } })
                  }
                >
                  Remove photo
                </button>
              )}
              <p>
                At 10 practice points per session:{" "}
                {money(bank.config.centsPerPoint * 10)} per session,
                approximately{" "}
                {bank.config.centsPerPoint > 0
                  ? Math.ceil(
                      Math.max(0, bank.goal.target - balance.cents) /
                        (bank.config.centsPerPoint * 10),
                    )
                  : "∞"}{" "}
                more sessions. This estimate assumes savings are enabled and
                daily caps allow the full award. A $100 goal requires ten times
                the work of a $10 goal at the same rate.
              </p>
              <GoalCard
                bank={{ ...bank, config: { ...bank.config, mode: "savings" } }}
              />
              <button
                className="secondary"
                disabled={
                  bank.goal.purchased || balance.cents < bank.goal.target
                }
                onClick={() => {
                  if (
                    confirm(
                      `Record the purchase of ${bank.goal.name} for ${money(bank.goal.target)}?`,
                    )
                  ) {
                    update({
                      ...transaction(
                        bank,
                        today(),
                        "purchase",
                        0,
                        -bank.goal.target,
                        `Purchased ${bank.goal.name}`,
                      ),
                      goal: { ...bank.goal, purchased: true },
                    });
                  }
                }}
              >
                Record goal purchase
              </button>
              {bank.goal.purchased && (
                <button
                  className="text-button"
                  onClick={() =>
                    update({
                      ...bank,
                      goal: {
                        ...bank.goal,
                        purchased: false,
                        name: "My next goal",
                        image: "",
                      },
                    })
                  }
                >
                  Set up next goal
                </button>
              )}
            </>
          )}
        </>
      )}
      {tab === "advanced" && (
        <>
          <h3>Custom reward rules</h3>
          <p>
            Use these controls when presets don’t fit your family. Changes save
            immediately and affect future awards only.
          </p>
          <label>
            Reward type
            <select
              aria-label="Reward type"
              value={bank.config.mode}
              onChange={(e) => config("mode", e.target.value)}
            >
              <option value="time">Game time</option>
              <option value="savings">Savings toward a goal</option>
              <option value="both">Both time and savings</option>
              <option value="none">Practice only</option>
            </select>
          </label>
          <div className="settings-grid">
            {(
              [
                ["minutesPerPoint", "Game minutes per practice point", false],
                ["centsPerPoint", "Dollars per practice point", true],
                ["minuteCap", "Daily game-minute earning cap", false],
                ["centCap", "Daily savings earning cap ($)", true],
              ] as const
            ).map(([key, label, dollars]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  min="0"
                  max={dollars ? 10000 : 1000000}
                  step={dollars ? ".01" : "1"}
                  value={bank.config[key] / (dollars ? 100 : 1)}
                  onChange={(e) =>
                    config(
                      key,
                      Math.max(
                        0,
                        Math.min(
                          1000000,
                          Math.round(
                            Number(e.target.value) * (dollars ? 100 : 1),
                          ),
                        ),
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <p>
            Practice points use the completion, accuracy, improvement, and bonus
            amounts below. The daily point cap and rewarded-session limit apply
            before conversion. Rates and caps affect future awards only. Each
            currency has its own daily cap; using a reward does not reopen that
            day’s earning allowance.
          </p>
          {children}
        </>
      )}
      {tab === "activity" && (
        <>
          <h3>Record spending, contributions, or corrections</h3>
          <p>
            Corrections require a note and preserve every prior entry. Savings
            belong to the child’s reward bank; changing the pictured goal does
            not erase them.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                if (
                  (kind === "use" || kind === "time-correction") &&
                  !bank.openingConfirmed
                )
                  throw Error("Confirm the opening balance first.");
                const n = Number(amount);
                if (!amount || !Number.isFinite(n) || n === 0)
                  throw Error("Enter a nonzero amount.");
                const isMinutes = kind === "use" || kind === "time-correction";
                if (isMinutes && !Number.isInteger(n))
                  throw Error("Enter whole minutes.");
                if ((kind === "use" || kind === "contribution") && n < 0)
                  throw Error("Enter a positive amount.");
                const cents = isMinutes ? 0 : Math.round(n * 100);
                const minutes = isMinutes ? (kind === "use" ? -n : n) : 0;
                update(
                  transaction(
                    bank,
                    today(),
                    kind === "use"
                      ? "used"
                      : kind === "contribution"
                        ? "contribution"
                        : "correction",
                    minutes,
                    cents,
                    note,
                  ),
                );
                setAmount("");
                setNote("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label>
              Entry type
              <select
                aria-label="Entry type"
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  setAmount("");
                }}
              >
                <option value="use">Game minutes used</option>
                <option value="contribution">
                  Parent savings contribution ($)
                </option>
                <option value="time-correction">
                  Time correction (+/− minutes)
                </option>
                <option value="money-correction">
                  Savings correction (+/− dollars)
                </option>
              </select>
            </label>
            <div className="settings-grid">
              <label>
                Amount
                <input
                  required
                  type="number"
                  step={
                    kind === "use" || kind === "time-correction" ? "1" : ".01"
                  }
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <label>
                Explanation
                <input
                  required
                  maxLength={200}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>
            <button className="secondary">Record entry</button>
          </form>
          <h3>Activity & reward ledger</h3>
          <label>
            Report period
            <select
              aria-label="Report period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="all">All time</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          </label>
          <p>
            {rows
              .filter((e) => e.kind === "earned" || e.kind === "legacy")
              .reduce((s, e) => s + e.minutes, 0)}{" "}
            minutes earned ·{" "}
            {money(
              rows
                .filter((e) => e.kind === "earned")
                .reduce((s, e) => s + e.cents, 0),
            )}{" "}
            savings earned in this period.{" "}
            {rows
              .filter((e) => e.kind === "used")
              .reduce((s, e) => s - e.minutes, 0)}{" "}
            minutes used ·{" "}
            {money(
              rows
                .filter((e) => e.kind === "purchase")
                .reduce((s, e) => s - e.cents, 0),
            )}{" "}
            spent on goals.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date / activity</th>
                  <th>Points</th>
                  <th>Time change</th>
                  <th>Savings change</th>
                  <th>Time balance</th>
                  <th>Savings balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.date}
                      <br />
                      {e.note}
                    </td>
                    <td>{e.points || "—"}</td>
                    <td>
                      {e.minutes > 0 ? "+" : ""}
                      {e.minutes} min
                    </td>
                    <td>{money(e.cents)}</td>
                    <td>{e.runningMinutes} min</td>
                    <td>{money(e.runningCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p>No reward entries in this period.</p>}
          <details>
            <summary>Practice activity in this period</summary>
            {activity
              .filter((a) => period === "all" || a.date >= cutoffDate)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((a, i) => (
                <p key={i}>
                  {a.date} · {a.description}
                </p>
              ))}
          </details>
        </>
      )}
    </section>
  );
}
