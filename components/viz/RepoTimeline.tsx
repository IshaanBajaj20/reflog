"use client";

import { motion, useReducedMotion } from "motion/react";

export type TimelineYear = { year: number; publicRepos: number; privateRepos: number };

/**
 * Repository creation over time, one square per repository.
 *
 * A bar chart would give the same totals, but a square per repo makes the unit
 * countable — you can see that a year was four projects rather than reading a
 * bar against an axis. Private repositories are drawn as outlines: present and
 * counted, never named. That distinction is the whole point of the slide for
 * anyone whose work is mostly closed, and it has to be legible without a key.
 */
export function RepoTimeline({
  years,
  accent,
  className = "",
}: {
  years: TimelineYear[];
  accent: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(...years.map((y) => y.publicRepos + y.privateRepos), 1);
  // Above this, squares get too small to count, so they compress instead.
  const perRow = max > 14 ? 8 : 5;

  let cellIndex = 0;

  return (
    <div
      className={`flex w-full items-end gap-2 sm:gap-3 ${className}`}
      role="img"
      aria-label={years
        .map(
          (y) =>
            `${y.year}: ${y.publicRepos + y.privateRepos} repositories, ${y.privateRepos} private`,
        )
        .join(". ")}
    >
      {years.map((year) => {
        const total = year.publicRepos + year.privateRepos;
        return (
          <div key={year.year} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="flex w-full flex-col-reverse flex-wrap-reverse content-start justify-start gap-[3px]"
              style={{
                minHeight: `min(${Math.ceil(max / perRow) * 14}px, 26vh)`,
              }}
            >
              {Array.from({ length: total }, (_, i) => {
                const isPrivate = i >= year.publicRepos;
                const delay = 0.2 + cellIndex++ * 0.012;
                return (
                  <motion.span
                    key={i}
                    className="h-2.5 w-2.5 rounded-[2px] sm:h-3 sm:w-3"
                    style={
                      isPrivate
                        ? { border: `1.5px solid ${accent}`, opacity: 0.75 }
                        : { backgroundColor: accent, opacity: 0.9 }
                    }
                    initial={reduce ? false : { opacity: 0, scale: 0.3 }}
                    animate={{ opacity: isPrivate ? 0.75 : 0.9, scale: 1 }}
                    transition={reduce ? { duration: 0 } : { delay, duration: 0.3 }}
                  />
                );
              })}
            </div>
            <span className="font-mono text-[10px] tabular-nums text-white/40 sm:text-xs">
              &rsquo;{String(year.year).slice(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
