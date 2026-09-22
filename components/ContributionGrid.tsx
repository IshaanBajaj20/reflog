"use client";

import { motion, useReducedMotion } from "motion/react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type CalendarWeek = { date: string; count: number }[];

/**
 * The contribution graph, in the slide's own colours.
 *
 * Sized in fractions rather than fixed pixels, so all 53 weeks always fit the
 * viewport and the graph never scrolls sideways — on a phone the cells are
 * about 5px and the thing reads as a density texture, which is exactly what it
 * is at that size. Tinted to the slide accent rather than GitHub's green: it is
 * recognisable from its shape, and borrowing another product's palette in the
 * middle of a deck with its own would look like a screenshot.
 *
 * Cells wash in diagonally, so the year fills the way it was lived — left to
 * right — instead of appearing all at once.
 */
export function ContributionGrid({
  weeks,
  levels,
  accent,
  className = "",
}: {
  weeks: CalendarWeek[];
  levels: [number, number, number, number];
  accent: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  // Month label positions: the first week whose Sunday starts a new month.
  const labels: { column: number; month: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, column) => {
    const first = week[0];
    if (!first) return;
    const month = Number(first.date.slice(5, 7)) - 1;
    if (month !== lastMonth) {
      labels.push({ column, month });
      lastMonth = month;
    }
  });

  const total = weeks.reduce((sum, w) => sum + w.reduce((s, d) => s + d.count, 0), 0);

  // Height is a function of width here: 53 columns of square cells over 7 rows
  // works out at roughly 0.135 x the width. Bounding the WIDTH therefore bounds
  // the height without ever clipping a cell, which capping max-height would.
  return (
    <figure className={className} style={{ maxWidth: "min(100%, 150vh)" }}>
      <div
        className="grid gap-[2px] sm:gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
        role="img"
        aria-label={`Contribution calendar: ${total.toLocaleString()} contributions across the year`}
      >
        {weeks.map((week, column) => (
          <div key={column} className="grid grid-rows-7 gap-[2px] sm:gap-[3px]">
            {Array.from({ length: 7 }, (_, row) => {
              const day = week[row];
              if (!day) return <span key={row} className="aspect-square" />;
              const level = intensity(day.count, levels);
              return (
                <motion.span
                  key={row}
                  className="aspect-square rounded-[1.5px] sm:rounded-[2px]"
                  style={{
                    backgroundColor: level === 0 ? "rgba(255,255,255,0.055)" : accent,
                    opacity: level === 0 ? 1 : 0.28 + level * 0.18,
                  }}
                  initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                  animate={{
                    opacity: level === 0 ? 1 : 0.28 + level * 0.18,
                    scale: 1,
                  }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          // Diagonal wash: column dominates, row offsets slightly.
                          delay: 0.25 + column * 0.008 + row * 0.012,
                          duration: 0.35,
                          ease: "easeOut",
                        }
                  }
                />
              );
            })}
          </div>
        ))}
      </div>

      <div
        aria-hidden
        className="mt-2 hidden grid-flow-col font-mono text-[9px] uppercase tracking-[0.14em] text-white/35 sm:grid"
        style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}
      >
        {labels.map(({ column, month }) => (
          <span key={column} style={{ gridColumnStart: column + 1, gridColumnEnd: "span 4" }}>
            {MONTHS[month]}
          </span>
        ))}
      </div>
    </figure>
  );
}

function intensity(count: number, levels: [number, number, number, number]): number {
  if (count <= 0) return 0;
  if (count < levels[1]) return 1;
  if (count < levels[2]) return 2;
  if (count < levels[3]) return 3;
  return 4;
}
