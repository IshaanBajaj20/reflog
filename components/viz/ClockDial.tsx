"use client";

import { motion, useReducedMotion } from "motion/react";
import { px } from "@/lib/svg";

/**
 * A 24-hour radial histogram of when commits were authored.
 *
 * Radial rather than a bar chart because a day is a cycle: work that runs past
 * midnight reads as continuous here and as two disconnected bars at opposite
 * ends of a linear axis. Midnight sits at the top and the spokes run clockwise,
 * matching every clock face anyone has ever read.
 *
 * Rendered only when enough commits were sampled for the shape to mean
 * anything — the caller decides that; this component just draws what it is given.
 */
export function ClockDial({
  hours,
  accent,
  peakHour,
  size = 260,
  className = "",
}: {
  /** 24 buckets, index = hour. */
  hours: number[];
  accent: string;
  peakHour: number;
  size?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(...hours, 1);
  const centre = size / 2;
  const innerRadius = size * 0.19;
  // The hour labels sit outside the spokes, so the spokes have to stop well
  // short of the viewBox edge or the labels render half outside it.
  const outerRadius = size * 0.38;
  const labelRadius = size * 0.455;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={`h-auto w-full max-w-[min(380px,74vw,40vh)] ${className}`}
      role="img"
      aria-label={`Commits by hour of day, busiest at ${String(peakHour).padStart(2, "0")}:00`}
    >
      {[0, 6, 12, 18].map((hour) => {
        const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
        return (
          <text
            key={hour}
            x={px(centre + Math.cos(angle) * labelRadius)}
            y={px(centre + Math.sin(angle) * labelRadius)}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-white/35 font-mono"
            style={{ fontSize: size * 0.045 }}
          >
            {String(hour).padStart(2, "0")}
          </text>
        );
      })}

      <circle
        cx={centre}
        cy={centre}
        r={innerRadius}
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="1"
      />

      {hours.map((count, hour) => {
        const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
        const length = innerRadius + (count / max) * (outerRadius - innerRadius);
        const isPeak = hour === peakHour;
        return (
          <motion.line
            key={hour}
            x1={px(centre + Math.cos(angle) * innerRadius)}
            y1={px(centre + Math.sin(angle) * innerRadius)}
            x2={px(centre + Math.cos(angle) * length)}
            y2={px(centre + Math.sin(angle) * length)}
            stroke={accent}
            strokeWidth={size * 0.028}
            strokeLinecap="round"
            opacity={px(isPeak ? 1 : 0.32 + (count / max) * 0.4)}
            initial={reduce ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: px(isPeak ? 1 : 0.32 + (count / max) * 0.4) }}
            transition={
              reduce ? { duration: 0 } : { delay: 0.25 + hour * 0.022, duration: 0.4 }
            }
          />
        );
      })}

      <text
        x={centre}
        y={centre}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white font-mono"
        style={{ fontSize: size * 0.11, fontVariantNumeric: "tabular-nums" }}
      >
        {String(peakHour).padStart(2, "0")}
      </text>
    </svg>
  );
}
