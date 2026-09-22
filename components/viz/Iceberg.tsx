"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { ICEBERG_HEIGHT, ICEBERG_WIDTH, buildIceberg, toPoints } from "@/lib/iceberg";

/**
 * The submerged year.
 *
 * This is the one picture no competing tool can honestly draw, because it is
 * the only one that measures the part below the line. The reveal is the whole
 * point: the tip arrives first and reads as the entire story, the water settles,
 * and then the mass underneath keeps going, and going, well past where the eye
 * expected it to stop. The number counting up alongside it is the same argument
 * in figures.
 *
 * The silhouette comes from the developer's own monthly counts, so the image is
 * theirs rather than a template with a number typed into it — which is what
 * makes it worth sharing.
 *
 * It is never framed as a deficiency. Work being invisible is a fact about
 * where the work happened, not about the person who did it.
 */
export function Iceberg({
  monthly,
  publicCount,
  privateCount,
  accent,
  className = "",
}: {
  /** 12 monthly contribution counts — drives the silhouette. */
  monthly: number[];
  publicCount: number;
  privateCount: number;
  accent: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const total = publicCount + privateCount;
  const shape = buildIceberg(monthly, total === 0 ? 0.5 : publicCount / total);

  const revealDelay = reduce ? 0 : 0.85;
  const revealDuration = reduce ? 0 : 2.4;

  return (
    <div className={`relative w-full ${className}`}>
      <svg
        viewBox={`0 0 ${ICEBERG_WIDTH} ${ICEBERG_HEIGHT}`}
        // `meet` letterboxes the art; anything painted only inside the viewBox
        // then shows as a visible box against the slide background. The water
        // and light shafts are drawn far outside it for that reason.
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full overflow-visible"
        role="img"
        aria-label={`${privateCount.toLocaleString()} of ${total.toLocaleString()} contributions were in private repositories`}
      >
        <defs>
          {/* Deeper water is darker; the gradient is what gives the descent
              somewhere to descend to. */}
          <linearGradient id={`water-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.16" />
            <stop offset="55%" stopColor="#040610" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#02030a" stopOpacity="0.92" />
          </linearGradient>

          <linearGradient id={`tip-${uid}`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.85" />
          </linearGradient>

          <linearGradient id={`mass-${uid}`} x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.62" />
            <stop offset="60%" stopColor={accent} stopOpacity="0.3" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.12" />
          </linearGradient>

          {/* Wipes downward to expose the true silhouette, rather than scaling
              it — scaling would distort the shape the data produced. */}
          <clipPath id={`reveal-${uid}`}>
            <motion.rect
              x="0"
              width={ICEBERG_WIDTH}
              y={shape.waterline}
              initial={reduce ? { height: ICEBERG_HEIGHT } : { height: 0 }}
              animate={{ height: ICEBERG_HEIGHT }}
              transition={{
                delay: revealDelay,
                duration: revealDuration,
                ease: [0.22, 0.85, 0.28, 1],
              }}
            />
          </clipPath>
        </defs>

        <rect
          x={-ICEBERG_WIDTH * 3}
          y={shape.waterline}
          width={ICEBERG_WIDTH * 7}
          height={ICEBERG_HEIGHT - shape.waterline}
          fill={`url(#water-${uid})`}
        />

        {/* Shafts of light from the surface. */}
        {!reduce &&
          [0.18, 0.44, 0.72].map((x, i) => (
            <motion.polygon
              key={x}
              // Spread across the painted area, not the viewBox, or the shafts
              // end in hard vertical edges where the letterboxing begins.
              points={`${ICEBERG_WIDTH * (x * 5 - 1.8)},${shape.waterline} ${ICEBERG_WIDTH * (x * 5 - 1.8 + 0.3)},${shape.waterline} ${ICEBERG_WIDTH * (x * 5 - 1.8 + 0.85)},${ICEBERG_HEIGHT * 1.1} ${ICEBERG_WIDTH * (x * 5 - 1.8 - 0.25)},${ICEBERG_HEIGHT * 1.1}`}
              fill={accent}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.02, 0.07, 0.02] }}
              transition={{
                duration: 9 + i * 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 1.4,
              }}
            />
          ))}

        <g clipPath={`url(#reveal-${uid})`}>
          <polygon points={toPoints(shape.below)} fill={`url(#mass-${uid})`} />
          <polygon
            points={toPoints(shape.below)}
            fill="none"
            stroke={accent}
            strokeOpacity="0.45"
            strokeWidth="1.5"
          />
        </g>

        {/* The waterline sits above the mass so the surface stays legible. */}
        <motion.line
          x1={-ICEBERG_WIDTH * 3}
          y1={shape.waterline}
          x2={ICEBERG_WIDTH * 4}
          y2={shape.waterline}
          stroke={accent}
          strokeWidth="1.5"
          strokeOpacity="0.8"
          initial={reduce ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={reduce ? { duration: 0 } : { delay: 0.5, duration: 0.7 }}
        />

        <motion.g
          initial={reduce ? false : { opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.7, ease: "easeOut" }}
        >
          <polygon points={toPoints(shape.above)} fill={`url(#tip-${uid})`} />
        </motion.g>
      </svg>

      {/* Labels are positioned against the same viewBox fractions as the art,
          so they stay pinned to the waterline at every screen size. */}
      <div
        className="pointer-events-none absolute inset-x-0 px-6 sm:px-10"
        style={{ top: `${(shape.waterline / ICEBERG_HEIGHT) * 100}%` }}
      >
        <motion.p
          className="-translate-y-[calc(100%+10px)] text-right font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 sm:text-xs"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduce ? 0 : 0.7 }}
        >
          {publicCount.toLocaleString()} in the open
        </motion.p>
        <motion.p
          className="mt-3 text-right font-mono text-[10px] uppercase tracking-[0.2em] sm:text-xs"
          style={{ color: accent }}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduce ? 0 : revealDelay + revealDuration * 0.55 }}
        >
          {privateCount.toLocaleString()} below the surface
        </motion.p>
      </div>
    </div>
  );
}
