import { transaction, newBank, type Bank } from "./bank";
import { today, type Data } from "./storage";
export type Preset = "time" | "savings" | "both" | "none";
export const presetNames: Record<Preset, string> = {
  time: "Game time",
  savings: "Save for something",
  both: "A little of both",
  none: "Practice only",
};
export function presetConfig(mode: Preset, cents = 5): Bank["config"] {
  return {
    mode,
    minutesPerPoint: 1,
    centsPerPoint: cents,
    minuteCap: 20,
    centCap: 1000,
  };
}
export function applyPreset(data: Data, mode: Preset, cents = 5): Data {
  const bank = data.bank ?? newBank();
  return {
    ...data,
    settings: {
      ...data.settings,
      completion: 5,
      tier70: 2,
      tier85: 4,
      tier95: 5,
      improvement: 2,
      bonus: 2,
      dailyLimit: 20,
      rewardedSessions: 2,
    },
    bank: transaction(
      { ...bank, config: presetConfig(mode, cents) },
      today(),
      "settings",
      0,
      0,
      `Applied ${presetNames[mode]} preset. Future earnings only.`,
    ),
  };
}
