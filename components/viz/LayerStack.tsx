"use client";

import { motion, useReducedMotion } from "motion/react";

export type StackLayer = { key: string; label: string; active: boolean; evidence: number };

/**
 * The stack, drawn as a stack.
 *
 * Breadth is the one stat with an obvious physical form — infrastructure at the
 * bottom, interface at the top — so it is drawn as slabs in that order rather
 * than as a row of pills. Layers the developer works in are lit and lettered;
 * the rest stay as dim outlines, present so the shape of what they *do* cover
 * is legible against the whole. Slabs settle in from the bottom up, which is
 * the order things actually get built in.
 *
 * No layer is ever labelled missing, weak or incomplete. Nobody works in all
 * six, and a deck that implies otherwise is scoring people.
 */
export function LayerStack({
  layers,
  accent,
  className = "",
}: {
  /** Bottom-first: infrastructure through to interface. */
  layers: StackLayer[];
  accent: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const maxEvidence = Math.max(...layers.map((l) => l.evidence), 1);

  return (
    <div
      className={`flex h-full w-full flex-col-reverse gap-1.5 ${className}`}
      role="img"
      aria-label={`Works across ${layers.filter((l) => l.active).length} of ${layers.length} layers: ${layers
        .filter((l) => l.active)
        .map((l) => l.label)
        .join(", ")}`}
    >
      {layers.map((layer, i) => {
        const fill = layer.active ? 0.3 + (layer.evidence / maxEvidence) * 0.55 : 0;
        return (
          <motion.div
            key={layer.key}
            className="relative flex min-h-[2.25rem] flex-1 items-center overflow-hidden rounded-lg px-4 sm:px-5"
            style={{
              border: layer.active
                ? `1px solid ${accent}55`
                : "1px dashed rgba(255,255,255,0.12)",
            }}
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduce ? { duration: 0 } : { delay: 0.25 + i * 0.08, duration: 0.5, ease: "easeOut" }
            }
          >
            {layer.active ? (
              <motion.span
                aria-hidden
                className="absolute inset-y-0 left-0"
                style={{ backgroundColor: accent, opacity: fill }}
                initial={reduce ? { width: "100%" } : { width: 0 }}
                animate={{ width: "100%" }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { delay: 0.35 + i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }
                }
              />
            ) : null}
            <span
              className={`relative font-mono text-xs tracking-wide sm:text-sm ${
                layer.active ? "font-medium text-[#05060a]" : "text-white/25"
              }`}
            >
              {layer.label}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
