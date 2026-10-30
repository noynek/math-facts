import { useEffect, useRef, useState } from "react";

type Cell = "hundreds" | "tens" | "ones" | "carryHundreds" | "carryTens";
const names: Record<Cell, string> = {
  hundreds: "Hundreds answer",
  tens: "Tens answer",
  ones: "Ones answer",
  carryHundreds: "Carry into hundreds",
  carryTens: "Carry into tens",
};
export function BonusWorkspace({
  numbers,
  onSubmit,
  disabled,
}: {
  numbers: number[];
  onSubmit: (answer: string) => void;
  disabled: boolean;
}) {
  const [digits, setDigits] = useState<Record<Cell, string>>({
    hundreds: "",
    tens: "",
    ones: "",
    carryHundreds: "",
    carryTens: "",
  });
  const [active, setActive] = useState<Cell>("ones");
  const refs = useRef<Partial<Record<Cell, HTMLInputElement | null>>>({});
  useEffect(() => {
    refs.current.ones?.focus();
  }, []);
  useEffect(() => {
    if (!disabled) refs.current[active]?.focus();
  }, [disabled]);
  function enter(cell: Cell, value: string) {
    setDigits((d) => ({ ...d, [cell]: value.replace(/\D/g, "").slice(-1) }));
  }
  function field(cell: Cell) {
    return (
      <input
        ref={(el) => {
          refs.current[cell] = el;
        }}
        aria-label={names[cell]}
        className={`${cell.startsWith("carry") ? "carry-cell" : "answer-cell"} ${active === cell ? "active-cell" : ""}`}
        inputMode="numeric"
        autoComplete="off"
        value={digits[cell]}
        placeholder={cell.startsWith("carry") ? "" : "?"}
        disabled={disabled}
        onFocus={() => setActive(cell)}
        onChange={(e) => enter(cell, e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            const row: Cell[] = cell.startsWith("carry")
              ? ["carryHundreds", "carryTens"]
              : ["hundreds", "tens", "ones"];
            const next =
              row[row.indexOf(cell) + (e.key === "ArrowLeft" ? -1 : 1)];
            if (next) {
              setActive(next);
              refs.current[next]?.focus();
            }
          }
        }}
      />
    );
  }
  return (
    <form
      className="bonus-workspace"
      onSubmit={(e) => {
        e.preventDefault();
        if (digits.ones !== "" && digits.tens !== "")
          onSubmit(`${digits.hundreds || "0"}${digits.tens}${digits.ones}`);
      }}
    >
      <div className="paper-grid">
        <div className="place-headings">
          <span>Hundreds</span>
          <span>Tens</span>
          <span>Ones</span>
        </div>
        <div className="carry-row">
          {field("carryHundreds")}
          {field("carryTens")}
          <span aria-hidden="true" />
        </div>
        <div
          className="equation digit-equation"
          role="math"
          aria-label={numbers.join(" plus ")}
        >
          {numbers.map((n, i) => (
            <div className="paper-number" key={i} aria-hidden="true">
              <span className="paper-plus">
                {i === numbers.length - 1 ? "+" : ""}
              </span>
              <span />
              <span>{Math.floor(n / 10)}</span>
              <span>{n % 10}</span>
            </div>
          ))}
        </div>
        <div className="answer-row">
          {field("hundreds")}
          {field("tens")}
          {field("ones")}
        </div>
      </div>
      <p className="workspace-help">
        Tap a box to write in it. Small boxes hold carried digits.
        <br />
        Start in Ones; leave Hundreds blank if you don’t need it.
      </p>
      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "Check ↵"].map(
          (key) => (
            <button
              key={key}
              type={key === "Check ↵" ? "submit" : "button"}
              className={key === "Check ↵" ? "go" : ""}
              disabled={disabled}
              aria-label={key === "⌫" ? "Backspace" : key}
              onClick={() => {
                if (key !== "Check ↵") {
                  enter(active, key === "⌫" ? "" : key);
                  refs.current[active]?.focus();
                }
              }}
            >
              {key}
            </button>
          ),
        )}
      </div>
    </form>
  );
}
