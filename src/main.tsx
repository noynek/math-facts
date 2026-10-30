import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  facts,
  label,
  strategy,
  bonus,
  type Fact,
  type Operation,
} from "./math";
import { select } from "./adaptive";
import { record, status } from "./mastery";
import { accuracy, rewards } from "./rewards";
import {
  load,
  save,
  normalize,
  fresh,
  today,
  valid,
  type Data,
  type Attempt,
  type Session,
  type Settings,
} from "./storage";
import "./style.css";
function App() {
  const [data, setData] = useState(load);
  const [screen, setScreen] = useState("home");
  const [op, setOp] = useState<Operation>("addition");
  const [answer, setAnswer] = useState("");
  const [problem, setProblem] = useState<Fact>();
  const [warm, setWarm] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [remaining, setRemaining] = useState(120);
  const [bonusNumbers, setBonusNumbers] = useState<number[]>([]);
  const [bonusTry, setBonusTry] = useState(0);
  const [result, setResult] = useState<Session>();
  const [breakdown, setBreakdown] = useState<ReturnType<typeof rewards>>();
  const [review, setReview] = useState(false);
  const [gate, setGate] = useState("");
  const [notice, setNotice] = useState("");
  const [reset, setReset] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const started = useRef(0);
  const deadline = useRef(0);
  const sessionId = useRef("");
  const finishing = useRef(false);
  const latest = useRef(attempts);
  latest.current = attempts;
  useEffect(() => {
    if (!save(data))
      setNotice(
        "Your browser could not save progress. Export a backup from the parent dashboard.",
      );
  }, [data]);
  useEffect(() => {
    const refresh = () => setData((d) => normalize(d));
    window.addEventListener("focus", refresh);
    const t = setInterval(refresh, 60000);
    return () => {
      window.removeEventListener("focus", refresh);
      clearInterval(t);
    };
  }, []);
  useEffect(() => {
    input.current?.focus();
  }, [problem, screen, feedback]);
  useEffect(() => {
    if (!data.settings[op])
      setOp(data.settings.addition ? "addition" : "subtraction");
  }, [data.settings.addition, data.settings.subtraction, op]);
  useEffect(() => {
    if (screen !== "speed") return;
    const tick = () => {
      const left = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0 && !finishing.current) {
        finishing.current = true;
        afterSpeed();
      }
    };
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [screen]);
  const pool = facts(op, data.settings.maxOperand, data.settings.maxMinuend);
  const mastered = (operation: Operation) =>
    facts(operation, data.settings.maxOperand, data.settings.maxMinuend).filter(
      (f) => status(data.records[f.id]) === "mastered",
    ).length;
  function next(records = data.records, prev = problem) {
    setProblem(select(pool, records, prev));
    setAnswer("");
    started.current = Date.now();
  }
  function start() {
    sessionId.current = crypto.randomUUID();
    finishing.current = false;
    setWarm(0);
    setAttempts([]);
    setFeedback("");
    setReview(false);
    setData((d) => normalize(d));
    next();
    setScreen("warm");
  }
  function speed() {
    deadline.current = Date.now() + 120000;
    setRemaining(120);
    setFeedback("");
    next();
    setScreen("speed");
  }
  function afterSpeed() {
    if (data.settings.bonusEnabled) {
      setBonusNumbers(bonus());
      setBonusTry(0);
      setFeedback("");
      setAnswer("");
      setScreen("bonus");
    } else finish(false);
  }
  function finish(won: boolean) {
    const list = latest.current;
    const score = {
      correct: list.filter((a) => a.correct).length,
      total: list.length,
    };
    setData((old) => {
      const d = normalize(old);
      const previous = [...d.sessions].reverse().find((s) => s.op === op);
      const reward = rewards(
        score,
        previous,
        won,
        d.settings,
        d.daily.minutes,
        d.daily.sessions,
      );
      const isRecord = accuracy(score) >= 0.85 && score.correct > d.bests[op];
      const s: Session = {
        ...score,
        id: sessionId.current,
        date: today(),
        op,
        attempts: list,
        minutes: reward.minutes,
        bonus: won,
        record: isRecord,
      };
      setResult(s);
      setBreakdown(reward);
      return {
        ...d,
        sessions: [...d.sessions, s],
        daily: {
          date: today(),
          minutes: d.daily.minutes + reward.minutes,
          sessions: d.daily.sessions + 1,
        },
        bests: { ...d.bests, [op]: isRecord ? score.correct : d.bests[op] },
      };
    });
    setScreen("results");
  }
  function chime() {
    if (!data.settings.sound) return;
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      oscillator.frequency.value = 660;
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.15);
      oscillator.onended = () => void ctx.close();
    } catch {
      /* Sound is optional. */
    }
  }
  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!answer || feedback) return;
    if (screen === "bonus") {
      if (Number(answer) === bonusNumbers.reduce((a, b) => a + b, 0)) {
        chime();
        finish(true);
      } else if (bonusTry === 0) {
        setBonusTry(1);
        setFeedback(
          "Try adding the ones first, then the tens. Remember to carry a group of ten!",
        );
        setAnswer("");
      } else finish(false);
      return;
    }
    if (!problem) return;
    if (screen === "speed" && Date.now() >= deadline.current) return;
    const correct = Number(answer) === problem.answer;
    const seconds = (Date.now() - started.current) / 1000;
    const records = record(
      data.records,
      problem,
      correct,
      seconds,
      sessionId.current,
      today(),
    );
    setData((d) => ({ ...d, records }));
    if (correct) chime();
    if (screen === "warm") {
      setWarm(warm + 1);
      setFeedback(
        correct
          ? "That’s it! Nicely done."
          : `${label(problem)} = ${problem.answer}. ${strategy(problem)}`,
      );
    } else {
      setAttempts((a) => [
        ...a,
        { fact: problem, correct, seconds, given: answer },
      ]);
      next(records);
    }
  }
  function setting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setData((d) => ({ ...d, settings: { ...d.settings, [key]: value } }));
  }
  const keypad = (
    <div className="keypad">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "Go ↵"].map(
        (k) => (
          <button
            type="button"
            key={k}
            className={k === "Go ↵" ? "go" : ""}
            onClick={() => {
              if (k === "Go ↵") submit();
              else
                setAnswer((a) =>
                  k === "⌫" ? a.slice(0, -1) : (a + k).slice(0, 4),
                );
              input.current?.focus();
            }}
            aria-label={k === "⌫" ? "Backspace" : k}
          >
            {k}
          </button>
        ),
      )}
    </div>
  );
  const answerForm = (
    <form onSubmit={submit}>
      <label className="sr-only" htmlFor="answer">
        Your answer
      </label>
      <input
        id="answer"
        ref={input}
        value={answer}
        onChange={(e) =>
          setAnswer(e.target.value.replace(/\D/g, "").slice(0, 4))
        }
        inputMode="numeric"
        autoComplete="off"
        placeholder="?"
        disabled={!!feedback}
      />
      {keypad}
    </form>
  );
  return (
    <>
      <header>
        <button
          className="brand"
          onClick={() => {
            if (["warm", "speed", "bonus"].includes(screen)) {
              if (
                !confirm(
                  "Leave this practice? This session will not earn minutes.",
                )
              )
                return;
            }
            setScreen("home");
          }}
        >
          <span className="brand-icon">
            m<span>+</span>
          </span>
          math minutes<span className="brand-dot">•</span>
        </button>
        <span className="header-note">LITTLE PRACTICE. BIG PROGRESS.</span>
        <button
          className="parent-link"
          onClick={() => {
            if (
              ["warm", "speed", "bonus"].includes(screen) &&
              !confirm("Leave this practice session?")
            )
              return;
            setScreen("gate");
          }}
        >
          Parent space ↗
        </button>
      </header>
      <main>
        {notice && (
          <p role="alert" className="notice">
            {notice}
          </p>
        )}
        {screen === "home" && (
          <>
            <div className="home-heading">
              <div>
                <p className="eyebrow">A LITTLE EVERY DAY GOES A LONG WAY</p>
                <h1>
                  Small steps.
                  <br />
                  <span>Big math energy.</span>
                </h1>
                <p className="intro">
                  Hey
                  {data.settings.nickname
                    ? `, ${data.settings.nickname}`
                    : " there"}
                  ! Ready to grow your math skills?
                  <br />A few minutes of practice can take you far.
                </p>
              </div>
              <div className="minutes-card">
                <span className="tiny-star">✧</span>
                <p>YOUR GAME TIME TODAY</p>
                <div className="minute-number">
                  {data.daily.minutes}
                  <span>min</span>
                </div>
                <div className="meter">
                  <i
                    style={{
                      width: `${Math.min(100, (data.daily.minutes / Math.max(1, data.settings.dailyLimit)) * 100)}%`,
                    }}
                  />
                </div>
                <small>
                  of {data.settings.dailyLimit} minutes you can earn
                </small>
                <div className="earned-note">
                  A little practice. A little play. ✓
                </div>
              </div>
            </div>
            <section className="practice-section">
              <div className="section-top">
                <h2>What will you practice?</h2>
                <span>YOUR NEXT LITTLE WIN STARTS HERE</span>
              </div>
              <div className="operations">
                {(["addition", "subtraction"] as Operation[]).map(
                  (operation) => (
                    <button
                      key={operation}
                      disabled={!data.settings[operation]}
                      className={`operation ${operation} ${op === operation ? "selected" : ""}`}
                      onClick={() => setOp(operation)}
                      aria-pressed={op === operation}
                    >
                      <div className="operation-top">
                        <span className="math-symbol">
                          {operation === "addition" ? "+" : "−"}
                        </span>
                        <span className="radio">
                          {op === operation ? "✓" : ""}
                        </span>
                      </div>
                      <h3>
                        {operation === "addition" ? "Addition" : "Subtraction"}
                      </h3>
                      <p>
                        {operation === "addition"
                          ? "Put numbers together. Build confidence."
                          : "Find the difference. Discover your rhythm."}
                      </p>
                      <div className="op-stats">
                        <span>
                          <b>{data.bests[operation]}</b> personal best
                          <small>correct in 2 minutes</small>
                        </span>
                        <span>
                          <b>{mastered(operation)}</b> facts mastered
                          <small>one fact at a time</small>
                        </span>
                      </div>
                      {!data.settings[operation] && (
                        <small>Paused by parent</small>
                      )}
                    </button>
                  ),
                )}
              </div>
              <div className="start-row">
                <div className="session-outline">
                  <span>① Warm up</span>
                  <i>→</i>
                  <span>② Two-minute round</span>
                  <i>→</i>
                  <span>③ Bonus & rewards</span>
                  <small>About 4–6 minutes · Go at your own pace</small>
                </div>
                <button
                  className="primary"
                  disabled={
                    !data.settings.addition && !data.settings.subtraction
                  }
                  onClick={() => {
                    if (!data.settings[op]) {
                      setOp(
                        data.settings.addition ? "addition" : "subtraction",
                      );
                      return;
                    }
                    start();
                  }}
                >
                  Let’s practice <span>→</span>
                </button>
              </div>
            </section>
            <div className="bottom-note">
              <span>✦</span>
              <p>
                <b>Progress over perfection.</b> Every fact you practice helps
                your brain grow.
                <br />
                Take your time, do your best, and watch those little wins add
                up.
              </p>
            </div>
          </>
        )}
        {["warm", "speed", "bonus"].includes(screen) && (
          <section className={`game panel ${screen === "bonus" ? "bonus-game" : ""}`}>
            <div className="game-top">
              <span className="eyebrow">
                {screen === "warm"
                  ? `WARM UP · ${Math.min(warm + 1, 5)} OF 5`
                  : screen === "speed"
                    ? `${op.toUpperCase()} · ${attempts.length} COMPLETED`
                    : "A LITTLE EXTRA CHALLENGE"}
              </span>
              <span className="timer">
                {screen === "speed"
                  ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
                  : "No timer. Take your time."}
              </span>
            </div>
            <h1>
              {screen === "warm"
                ? "Let’s warm up."
                : screen === "speed"
                  ? "You’ve got this."
                  : "Give your brain a stretch."}
            </h1>
            <p>
              {screen === "bonus"
                ? "Start with the ones, then add the tens. Scratch paper is welcome!"
                : screen === "warm"
                  ? "Five little problems to get your brain ready."
                  : "Accuracy first. Find your own rhythm."}
            </p>
            {screen === "speed" && (
              <progress
                max={120}
                value={remaining}
                aria-label="Seconds remaining"
              />
            )}
            {screen === "bonus" ? (
              <div className="column-addition">
                <div className="place-labels" aria-hidden="true"><span>Tens</span><span>Ones</span></div>
                <div className="equation stacked-equation" role="math" aria-label={bonusNumbers.join(" plus ")}>
                  {bonusNumbers.map((number, index) => (
                    <div className="addition-row" key={index} aria-hidden="true">
                      <span className="addition-sign">{index === bonusNumbers.length - 1 ? "+" : ""}</span>
                      <span>{Math.floor(number / 10)}</span><span>{number % 10}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="equation">{problem && label(problem)} <span>=</span></div>
            )}
            {feedback ? (
              <div className="feedback" role="status">
                <p>{feedback}</p>
                <button
                  className="primary"
                  autoFocus
                  onClick={() => {
                    if (screen === "bonus") {
                      setFeedback("");
                      input.current?.focus();
                    } else if (warm >= 5) speed();
                    else {
                      setFeedback("");
                      next();
                    }
                  }}
                >
                  {screen === "bonus"
                    ? "Try again"
                    : warm >= 5
                      ? "Start two-minute round →"
                      : "Next problem →"}
                </button>
              </div>
            ) : (
              answerForm
            )}
            {screen === "bonus" && (
              <button className="text-button" onClick={() => finish(false)}>
                Skip bonus and see my results →
              </button>
            )}
          </section>
        )}
        {screen === "results" && result && breakdown && (
          <section className="panel results">
            <p className="eyebrow">ANOTHER LITTLE WIN IN THE BOOKS</p>
            <h1>Look at you grow!</h1>
            <p>You showed up, practiced, and made progress.</p>
            <div className="reward-orb">
              +{result.minutes}
              <small>game minutes earned</small>
            </div>
            <div className="result-stats">
              <div>
                <b>{result.correct}</b>correct answers
              </div>
              <div>
                <b>{Math.round(accuracy(result) * 100)}%</b>accuracy
              </div>
              <div>
                <b>{data.daily.minutes}</b>minutes today
              </div>
            </div>
            {result.record && (
              <p className="success">✦ A new {op} personal best!</p>
            )}
            {result.bonus && (
              <p className="success">You solved the bonus challenge!</p>
            )}
            <div className="reward-lines">
              {breakdown.lines.map(([name, n]) => (
                <div key={name}>
                  <span>{name}</span>
                  <b>+{n} min</b>
                </div>
              ))}
              {breakdown.limited && (
                <p>
                  Today’s reward limit applies. Extra practice always helps your
                  brain grow!
                </p>
              )}
              <div>
                <b>Added to today’s game time</b>
                <b>{result.minutes} min</b>
              </div>
            </div>
            <button className="text-button" onClick={() => setReview(!review)}>
              {review ? "Hide review" : "Review missed problems"} (
              {result.attempts.filter((a) => !a.correct).length})
            </button>
            {review && (
              <div className="review">
                {result.attempts
                  .filter((a) => !a.correct)
                  .map((a, i) => (
                    <p key={i}>
                      <b>
                        {label(a.fact)} = {a.fact.answer}
                      </b>
                      <br />
                      {strategy(a.fact)}
                    </p>
                  ))}
                {result.attempts.every((a) => a.correct) && (
                  <p>No missed problems this round!</p>
                )}
              </div>
            )}
            <button className="primary" onClick={() => setScreen("home")}>
              All done for now ✓
            </button>
          </section>
        )}
        {screen === "gate" && (
          <section className="panel gate">
            <p className="eyebrow">FOR THE GROWN-UPS</p>
            <h1>Parent space</h1>
            <p>
              To continue, what is 12 + 9?
              <br />
              This little gate prevents accidental changes; it isn’t a password.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (gate === "21") {
                  setScreen("parent");
                  setGate("");
                } else setNotice("Try the parent gate again.");
              }}
            >
              <input
                aria-label="Parent gate answer"
                value={gate}
                onChange={(e) => setGate(e.target.value)}
                inputMode="numeric"
              />
              <button className="primary">Continue →</button>
            </form>
          </section>
        )}
        {screen === "parent" && (
          <section className="parent">
            <p className="eyebrow">THE BIGGER PICTURE</p>
            <h1>A little practice adds up.</h1>
            <p>
              Progress is saved on this browser. Game minutes are a record for
              you to manage.
            </p>
            <div className="parent-grid">
              {(["addition", "subtraction"] as Operation[]).map((operation) => {
                const sessions = data.sessions.filter(
                  (s) => s.op === operation,
                );
                const recent = sessions.slice(-5);
                const all = recent.flatMap((s) => s.attempts);
                const avg = all.length
                  ? all.reduce((a, b) => a + b.seconds, 0) / all.length
                  : 0;
                return (
                  <article className="panel" key={operation}>
                    <h2>
                      {operation === "addition" ? "Addition" : "Subtraction"}
                    </h2>
                    <p>
                      <b>{mastered(operation)}</b> mastered ·{" "}
                      <b>{data.bests[operation]}</b> best correct score
                    </p>
                    <p>Recent average response: {avg.toFixed(1)}s</p>
                    <h3>Last five rounds</h3>
                    {recent.length ? (
                      recent.map((s) => (
                        <p className="history-line" key={s.id}>
                          <span>{s.date}</span>
                          <b>
                            {s.correct}/{s.total} ·{" "}
                            {Math.round(accuracy(s) * 100)}%
                          </b>
                        </p>
                      ))
                    ) : (
                      <p>Your first practice will appear here.</p>
                    )}
                    <h3>Facts to grow</h3>
                    <div className="fact-chips">
                      {facts(
                        operation,
                        data.settings.maxOperand,
                        data.settings.maxMinuend,
                      )
                        .filter(
                          (f) =>
                            data.records[f.id] &&
                            status(data.records[f.id]) !== "mastered",
                        )
                        .sort((a, b) => {
                          const x = data.records[a.id],
                            y = data.records[b.id];
                          return (
                            y.incorrect / y.attempts - x.incorrect / x.attempts
                          );
                        })
                        .slice(0, 8)
                        .map((f) => (
                          <span key={f.id}>{label(f)}</span>
                        ))}
                    </div>
                  </article>
                );
              })}
            </div>
            <section className="panel settings">
              <h2>Make it yours</h2>
              <label>
                Child’s nickname
                <input
                  maxLength={30}
                  value={data.settings.nickname}
                  onChange={(e) => setting("nickname", e.target.value)}
                />
              </label>
              <div className="settings-grid">
                {(
                  ["addition", "subtraction", "bonusEnabled", "sound"] as const
                ).map((key) => (
                  <label className="check" key={key}>
                    <input
                      type="checkbox"
                      checked={data.settings[key]}
                      onChange={(e) => setting(key, e.target.checked)}
                    />
                    {
                      {
                        addition: "Addition practice",
                        subtraction: "Subtraction practice",
                        bonusEnabled: "Optional bonus challenges",
                        sound: "Gentle answer sound",
                      }[key]
                    }
                  </label>
                ))}
                {(
                  [
                    ["maxOperand", "Largest operand / subtrahend", 1, 12],
                    [
                      "maxMinuend",
                      "Largest subtraction starting number",
                      0,
                      24,
                    ],
                    ["dailyLimit", "Maximum game minutes per day", 0, 240],
                    ["rewardedSessions", "Rewarded sessions per day", 0, 20],
                    ["completion", "Session completion minutes", 0, 60],
                    ["tier70", "70% accuracy minutes", 0, 60],
                    ["tier85", "85% accuracy minutes", 0, 60],
                    ["tier95", "95% accuracy minutes", 0, 60],
                    ["improvement", "Improvement bonus minutes", 0, 60],
                    ["bonus", "Bonus challenge minutes", 0, 60],
                  ] as const
                ).map(([key, text, min, max]) => (
                  <label key={key}>
                    {text}
                    <input
                      type="number"
                      min={min}
                      max={max}
                      value={data.settings[key]}
                      onChange={(e) =>
                        setting(
                          key,
                          Math.max(
                            min,
                            Math.min(max, Math.floor(Number(e.target.value))),
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <p>
                Changes save automatically. Mastery needs at least five
                consecutive correct answers, three sessions, and two practice
                days. Personal records and improvement bonuses require at least
                85% accuracy.
              </p>
              <h3>Progress & backups</h3>
              <div className="backup-actions">
                <button
                  className="secondary"
                  onClick={() => {
                    const url = URL.createObjectURL(
                      new Blob([JSON.stringify(data, null, 2)], {
                        type: "application/json",
                      }),
                    );
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `math-minutes-${today()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export progress ↓
                </button>
                <label className="secondary import">
                  Import progress ↑
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      try {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const imported: unknown = JSON.parse(await file.text());
                        if (!valid(imported)) throw Error();
                        if (
                          confirm("Replace current progress with this backup?")
                        ) {
                          setData(normalize(imported));
                          setNotice("Progress imported successfully.");
                        }
                      } catch {
                        setNotice(
                          "That backup could not be read. Choose a Math Minutes JSON export.",
                        );
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  className="text-button danger"
                  onClick={() => setReset(true)}
                >
                  Reset progress
                </button>
              </div>
              {reset && (
                <div role="alert" className="notice">
                  <p>
                    Erase all saved practice, records, and settings on this
                    browser? Export a backup first if you want to keep them.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => {
                      setData(fresh());
                      setReset(false);
                    }}
                  >
                    Yes, erase progress
                  </button>{" "}
                  <button className="secondary" onClick={() => setReset(false)}>
                    Keep my progress
                  </button>
                </div>
              )}
            </section>
            <section className="panel">
              <h2>Session history</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Practice</th>
                      <th>Correct</th>
                      <th>Accuracy</th>
                      <th>Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.sessions].reverse().map((s) => (
                      <tr key={s.id}>
                        <td>{s.date}</td>
                        <td>{s.op}</td>
                        <td>
                          {s.correct}/{s.total}
                        </td>
                        <td>{Math.round(accuracy(s) * 100)}%</td>
                        <td>{s.minutes} min</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.sessions.length && <p>No sessions yet. A fresh start!</p>}
            </section>
          </section>
        )}
      </main>
      <footer>
        <span>math minutes</span>
        <p>Built for little wins, every day.</p>
        <span>Private by design · Saved on this device</span>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
