"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Entrance primitives shared by every slide.
 *
 * Each slide remounts when it becomes current, so a plain `initial`/`animate`
 * pair replays on every visit without any orchestration. Children are staggered
 * from a parent `Stagger`, which is what makes a slide assemble itself rather
 * than appearing all at once.
 *
 * Everything degrades to an instant, static render under prefers-reduced-motion
 * — not a faster animation, none at all.
 */

const RISE: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

const STATIC: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1 },
};

/** Parent that sequences its `Reveal` children. */
export function Stagger({
  children,
  className = "",
  delay = 0.1,
  step = 0.085,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  step?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: reduce
            ? {}
            : { delayChildren: delay, staggerChildren: step },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/** One staggered element. */
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={reduce ? STATIC : RISE}>
      {children}
    </motion.div>
  );
}

/**
 * A number that counts up to its value.
 *
 * Eased rather than linear, so it decelerates into the final figure instead of
 * stopping dead. Under reduced motion the final value renders immediately —
 * a counting number is motion whether or not it moves across the screen.
 */
export function CountUp({
  value,
  duration = 1.5,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / (duration * 1000));
      // easeOutExpo: fast start, long settle.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduce]);

  return <span className={`tabular-nums ${className}`}>{display.toLocaleString()}</span>;
}

/** A bar that grows to its share. */
export function GrowBar({
  share,
  color,
  delay = 0,
}: {
  /** 0..1 */
  share: number;
  color: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const width = `${Math.max(1.5, share * 100)}%`;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={reduce ? { width } : { width: 0 }}
        animate={{ width }}
        transition={
          reduce ? { duration: 0 } : { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }
        }
      />
    </div>
  );
}
