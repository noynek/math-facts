export type RewardSettings = {
  completion: number;
  tier70: number;
  tier85: number;
  tier95: number;
  improvement: number;
  bonus: number;
  dailyLimit: number;
  rewardedSessions: number;
};
export type Score = { correct: number; total: number };
export const accuracy = (s: Score) => (s.total ? s.correct / s.total : 0);
export function rewards(
  s: Score,
  previous: Score | undefined,
  bonus: boolean,
  settings: RewardSettings,
  earned: number,
  count: number,
) {
  const a = accuracy(s);
  const lines: [string, number][] = [
    ["Practice completed", settings.completion],
  ];
  const tier =
    a >= 0.95
      ? settings.tier95
      : a >= 0.85
        ? settings.tier85
        : a >= 0.7
          ? settings.tier70
          : 0;
  if (tier) lines.push([`${Math.round(a * 100)}% accuracy`, tier]);
  if (
    previous &&
    a >= 0.85 &&
    s.correct >= previous.correct + 2 &&
    a >= accuracy(previous) - 0.05
  )
    lines.push(["Personal improvement", settings.improvement]);
  if (bonus) lines.push(["Bonus challenge", settings.bonus]);
  const requested = lines.reduce((sum, [, n]) => sum + n, 0);
  const minutes =
    count >= settings.rewardedSessions
      ? 0
      : Math.max(0, Math.min(requested, settings.dailyLimit - earned));
  return { lines, minutes, limited: minutes < requested };
}
