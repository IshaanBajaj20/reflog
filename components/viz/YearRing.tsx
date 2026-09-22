"use client";

import { motion, useReducedMotion } from "motion/react";
import { px } from "@/lib/svg";

/**
 * The whole year as a ring of daily ticks, one spoke per day.
 *
 * The cover has to say "this is about your year" before a single number
 * appears, and a ring of 365 ticks does that in a way a headline cannot: the
 * busy stretches and the quiet ones are visible as texture at a glance. It
 * carries the same data as the contribution grid in a form that frames content
 * rather than sitting beside it.
 */
export function YearRing({
  counts,
  accent,
  size = 320,
  responsive = false,
  className = "",
  children,
}: {
  /** One entry per day, in order. */
  counts: number[];
  accent: string;
  size?: number;
  /** Scale with the viewport, capped at `size`, so tall rings never clip. */
  responsive?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(...counts, 1);
  const centre = size / 2;
  const inner = size * 0.36;
  const outer = size * 0.48;

  return (
    <div
      className={`relative ${className}`}
      style={
        responsive
          ? {
              width: `min(${size}px, 72vw, 42vh)`,
              height: `min(${size}px, 72vw, 42vh)`,
            }
          : { width: size, height: size }
      }
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0" aria-hidden>
        {counts.map((count, day) => {
          const angle = (day / counts.length) * Math.PI * 2 - Math.PI / 2;
          const length = inner + (count / max) * (outer - inner);
          return (
            <motion.line
              key={day}
              x1={px(centre + Math.cos(angle) * inner)}
              y1={px(centre + Math.sin(angle) * inner)}
              x2={px(centre + Math.cos(angle) * length)}
              y2={px(centre + Math.sin(angle) * length)}
              stroke={accent}
              strokeWidth={1.4}
              strokeLinecap="round"
              opacity={px(count === 0 ? 0.12 : 0.35 + (count / max) * 0.55)}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: px(count === 0 ? 0.12 : 0.35 + (count / max) * 0.55) }}
              transition={
                reduce ? { duration: 0 } : { delay: 0.15 + day * 0.0022, duration: 0.3 }
              }
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
