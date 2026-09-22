"use client";

import { motion, useReducedMotion } from "motion/react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Commits by weekday, as a companion to the clock dial.
 *
 * The dial answers "what hour", this answers "which day", and together they
 * fill a slide that either one alone leaves half empty. Weekends are drawn at
 * lower opacity rather than being called out in words — a quiet weekend is not
 * a finding worth commenting on.
 */
export function WeekdayBars({
  counts,
  accent,
  className = "",
}: {
  /** 7 buckets, 0 = Sunday. */
  counts: number[];
  accent: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(...counts, 1);

  return (
    <div
      className={`space-y-2 ${className}`}
      role="img"
      aria-label={`Commits by weekday: ${counts
        .map((c, i) => `${DAYS[i]} ${c}`)
        .join(", ")}`}
    >
      {counts.map((count, day) => {
        const weekend = day === 0 || day === 6;
        return (
          <div key={day} className="flex items-center gap-3">
            <span className="w-8 shrink-0 font-mono text-[10px] uppercase tracking-wider text-white/35">
              {DAYS[day]}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: accent, opacity: weekend ? 0.4 : 0.85 }}
                initial={reduce ? { width: `${(count / max) * 100}%` } : { width: 0 }}
                animate={{ width: `${(count / max) * 100}%` }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { delay: 0.35 + day * 0.06, duration: 0.7, ease: [0.16, 1, 0.3, 1] }
                }
              />
            </div>
            <span className="w-9 shrink-0 text-right font-mono text-[10px] tabular-nums text-white/45">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
