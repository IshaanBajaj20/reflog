export type Day = { date: string; contributionCount: number };

export type Streak = { days: number; start: string | null; end: string | null };

export type Cadence = {
  activeDays: number;
  totalDays: number;
  longestStreak: Streak;
  currentStreak: Streak;
  busiestDay: Day | null;
  /** Share of weeks in the window with at least one contribution, 0..1. */
  weeklyConsistency: number;
  /** Months (0-11) → contributions, for the shape of the year. */
  byMonth: number[];
};

/**
 * Derives cadence from the contribution calendar.
 *
 * `upTo` bounds everything to days that have actually happened, so a wrapped
 * generated in September is not scored against three months of future zeroes.
 */
export function computeCadence(days: Day[], upTo: Date = new Date()): Cadence {
  const cutoff = upTo.toISOString().slice(0, 10);
  const elapsed = days
    .filter((d) => d.date <= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date));

  const byMonth = new Array<number>(12).fill(0);
  let activeDays = 0;
  let busiestDay: Day | null = null;

  let runLength = 0;
  let runStart: string | null = null;
  let longest: Streak = { days: 0, start: null, end: null };

  for (const day of elapsed) {
    const month = Number(day.date.slice(5, 7)) - 1;
    if (month >= 0 && month < 12) byMonth[month] += day.contributionCount;

    if (day.contributionCount > 0) {
      activeDays += 1;
      if (!busiestDay || day.contributionCount > busiestDay.contributionCount) {
        busiestDay = day;
      }
      if (runLength === 0) runStart = day.date;
      runLength += 1;
      if (runLength > longest.days) {
        longest = { days: runLength, start: runStart, end: day.date };
      }
    } else {
      runLength = 0;
      runStart = null;
    }
  }

  // The run still open at the end of the window is the current streak.
  const current: Streak =
    runLength > 0
      ? { days: runLength, start: runStart, end: elapsed[elapsed.length - 1]?.date ?? null }
      : { days: 0, start: null, end: null };

  // Consistency is measured in weeks, not days. Nobody commits every day, and
  // scoring people as if they should is exactly the gamification this avoids.
  let weeks = 0;
  let activeWeeks = 0;
  for (let i = 0; i < elapsed.length; i += 7) {
    const week = elapsed.slice(i, i + 7);
    if (week.length === 0) continue;
    weeks += 1;
    if (week.some((d) => d.contributionCount > 0)) activeWeeks += 1;
  }

  return {
    activeDays,
    totalDays: elapsed.length,
    longestStreak: longest,
    currentStreak: current,
    busiestDay,
    weeklyConsistency: weeks === 0 ? 0 : activeWeeks / weeks,
    byMonth,
  };
}
