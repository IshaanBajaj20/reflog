"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProgressBar } from "./ProgressBar";

export type Slide = {
  /** Stable key, also used in the URL hash so a slide can be linked to. */
  id: string;
  /** Short name for the progress bar's accessible label. */
  label: string;
  render: () => React.ReactNode;
};

const SWIPE_DISTANCE = 60;
const SWIPE_VELOCITY = 350;

/**
 * Tap, swipe and keyboard navigation over a deck of slides.
 *
 * The interaction model is Instagram Stories — tap the left edge to go back,
 * anywhere else to go forward — but it is layered over real semantics rather
 * than replacing them: the whole deck is a labelled region, the progress bar is
 * a tablist of real buttons, and every action has a keyboard equivalent. Tap
 * zones are invisible but focusable elements exist behind them, so the deck is
 * fully operable without a pointer.
 */
export function StoryContainer({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  /** -1 or 1, so the exiting slide leaves in the direction of travel. */
  const [direction, setDirection] = useState(1);
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, next));
      setDirection(clamped >= index ? 1 : -1);
      setIndex(clamped);
    },
    [index, slides.length],
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const previous = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case "ArrowRight":
        case "PageDown":
          event.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          event.preventDefault();
          previous();
          break;
        case " ":
          // Space advances, but not while a button has focus — there it activates.
          if ((event.target as HTMLElement)?.tagName !== "BUTTON") {
            event.preventDefault();
            next();
          }
          break;
        case "Home":
          event.preventDefault();
          go(0);
          break;
        case "End":
          event.preventDefault();
          go(slides.length - 1);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [go, next, previous, slides.length]);

  /**
   * Hash sync, in this order for a reason.
   *
   * React runs effects in declaration order, so when the writer was declared
   * first it stamped `#cover` over the incoming hash before the reader ever
   * looked at it — every deep link silently landed on slide one. The reader
   * goes first and flips `hydrated`, and the writer stays quiet until then.
   */
  const hydrated = useRef(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const found = slides.findIndex((s) => s.id === hash);
    if (found > 0) setIndex(found);
    hydrated.current = true;
  }, [slides]);

  useEffect(() => {
    if (!hydrated.current) return;
    const id = slides[index]?.id;
    if (id) history.replaceState(null, "", `#${id}`);
  }, [index, slides]);

  // A push-and-recede rather than a slide: the outgoing slide falls back and
  // blurs while the incoming one comes forward, which reads as depth instead of
  // as two panels on a track. Blur is what sells it — without it the scale
  // change alone looks like a stutter.
  const variants = reduceMotion
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        enter: (dir: number) => ({
          opacity: 0,
          x: dir * 64,
          scale: 1.06,
          filter: "blur(14px)",
        }),
        center: { opacity: 1, x: 0, scale: 1, filter: "blur(0px)" },
        exit: (dir: number) => ({
          opacity: 0,
          x: dir * -40,
          scale: 0.94,
          filter: "blur(10px)",
        }),
      };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Your year in code"
      className="relative h-dvh w-full overflow-hidden bg-[#05060a]"
    >
      <ProgressBar
        count={slides.length}
        index={index}
        onSelect={go}
        labels={slides.map((s) => s.label)}
      />

      <AnimatePresence initial={false} mode="popLayout" custom={direction}>
        <motion.div
          key={slides[index].id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={
            reduceMotion
              ? { duration: 0.12 }
              : {
                  x: { type: "spring", stiffness: 260, damping: 30 },
                  scale: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                  filter: { duration: 0.45 },
                  opacity: { duration: 0.3 },
                }
          }
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.14}
          onDragEnd={(_, info) => {
            const far = Math.abs(info.offset.x) > SWIPE_DISTANCE;
            const fast = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
            if (!far && !fast) return;
            if (info.offset.x < 0) next();
            else previous();
          }}
          className="absolute inset-0 h-full w-full touch-pan-y"
          aria-live="polite"
        >
          {slides[index].render()}
        </motion.div>
      </AnimatePresence>

      {/* Tap zones. Real buttons, so they are reachable by keyboard and
          announced by screen readers rather than being dead pixels.
          They sit ABOVE slide content, so any interactive element inside a
          slide — the share button, a profile link — must raise itself with
          `relative z-30` or the tap zone will swallow the click. */}
      <div className="absolute inset-0 z-10 flex">
        <button
          type="button"
          onClick={previous}
          disabled={index === 0}
          aria-label="Previous slide"
          className="h-full w-[28%] cursor-w-resize bg-transparent disabled:cursor-default sm:w-[18%]"
        />
        <button
          type="button"
          onClick={next}
          disabled={index === slides.length - 1}
          aria-label="Next slide"
          className="h-full flex-1 cursor-e-resize bg-transparent disabled:cursor-default"
        />
      </div>

      <p className="story-footer pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden justify-center text-center font-mono text-[10px] uppercase tracking-[0.25em] text-white/25 sm:flex">
        {index + 1} / {slides.length} &nbsp;·&nbsp; arrows to move
      </p>
    </div>
  );
}
