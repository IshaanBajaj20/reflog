"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { squarify } from "@/lib/treemap";

export type TreemapLanguage = {
  language: string;
  share: number;
  /** Corrected for a vendored library — marked rather than silently ranked. */
  inflated?: boolean;
};

/**
 * Language share as a treemap.
 *
 * Bars force the eye along a baseline and leave a long tail of rows too short
 * to read. A treemap shows the whole at once, and a 0.4% language is a visible
 * sliver instead of nothing. Cells scale up from their own centre in order of
 * size, so the big languages land first and the composition resolves outward.
 *
 * A cell corrected for vendored-library inflation gets a hatched overlay rather
 * than being quietly ranked or quietly dropped.
 */
export function LanguageTreemap({
  languages,
  accent,
  className = "",
}: {
  languages: TreemapLanguage[];
  accent: string;
  className?: string;
}) {
  const reduce = useReducedMotion();

  /**
   * Squarify optimises for squareness in the space it is told about, so it has
   * to be told the real one. Laying out for a fixed 1.45 and rendering into a
   * 2.2-wide box produced cells stretched well away from square — exactly what
   * the algorithm exists to avoid.
   */
  const container = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(1.45);
  useEffect(() => {
    const node = container.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setAspect(width / height);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rects = squarify(
    languages.map((l) => ({ key: l.language, value: l.share })),
    aspect,
  );
  const byKey = new Map(languages.map((l) => [l.language, l]));
  const max = Math.max(...languages.map((l) => l.share), 0.0001);

  return (
    <div
      ref={container}
      className={`relative w-full overflow-hidden rounded-2xl ring-1 ring-white/10 ${className}`}
      role="img"
      aria-label={`Language breakdown: ${languages
        .slice(0, 5)
        .map((l) => `${l.language} ${Math.round(l.share * 100)}%`)
        .join(", ")}`}
    >
      {rects.map((rect, i) => {
        const language = byKey.get(rect.key);
        const weight = 0.18 + (rect.value / max) * 0.62;
        // Hide the label when the cell is too small to hold it legibly.
        const roomy = rect.width * aspect > 0.24 && rect.height > 0.13;
        return (
          <motion.div
            key={rect.key}
            className="absolute overflow-hidden"
            style={{
              left: `${rect.x * 100}%`,
              top: `${rect.y * 100}%`,
              width: `${rect.width * 100}%`,
              height: `${rect.height * 100}%`,
              padding: "2px",
            }}
            initial={reduce ? false : { opacity: 0, scale: 0.72 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              reduce
                ? { duration: 0 }
                : { delay: 0.2 + i * 0.055, duration: 0.5, ease: [0.16, 1, 0.3, 1] }
            }
          >
            <div
              className="relative flex h-full w-full flex-col justify-end overflow-hidden rounded-[6px] p-2 sm:p-3"
              style={{ backgroundColor: accent, opacity: weight }}
            >
              {language?.inflated ? (
                <span
                  aria-hidden
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, rgba(0,0,0,0.5) 0 4px, transparent 4px 9px)",
                  }}
                />
              ) : null}
              {roomy ? (
                <div className="relative">
                  <p className="truncate font-mono text-[11px] font-medium text-[#05060a] sm:text-sm">
                    {rect.key}
                  </p>
                  <p className="font-mono text-[10px] tabular-nums text-[#05060a]/70 sm:text-xs">
                    {formatShare(rect.value)}
                  </p>
                </div>
              ) : null}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function formatShare(share: number): string {
  const pct = share * 100;
  return pct < 1 ? `${pct.toFixed(1)}%` : `${Math.round(pct)}%`;
}
