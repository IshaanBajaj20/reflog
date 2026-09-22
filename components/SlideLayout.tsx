import type { ReactNode } from "react";
import { PALETTES, type PaletteName } from "@/lib/palette";
import { SlideBackground, type BackgroundVariant } from "./SlideBackground";

/**
 * The frame every slide sits in — and deliberately little more than that.
 *
 * It owns the background, the safe-area padding and the chapter label. It does
 * NOT own composition: alignment, type scale and where things sit are each
 * slide's own business, because a shared content template is what made every
 * chapter read as the same slide in a different colour.
 *
 * `bleed` drops the measured column entirely, for slides whose visual should
 * run to the edges of the viewport.
 */
export function SlideLayout({
  palette,
  background = "orbs",
  eyebrow,
  chapter,
  bleed = false,
  children,
  footer,
}: {
  palette: PaletteName;
  background?: BackgroundVariant;
  eyebrow?: string;
  /** Chapter number, shown as a quiet numeral beside the eyebrow. */
  chapter?: number;
  /** Let the content run to the viewport edges instead of a measured column. */
  bleed?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="relative flex h-full w-full flex-col overflow-hidden">
      <SlideBackground palette={PALETTES[palette]} variant={background} />

      <div
        className={`slide-frame relative flex h-full w-full flex-col ${
          bleed ? "slide-frame--bleed" : "mx-auto max-w-6xl"
        }`}
      >
        {eyebrow ? (
          <p
            className={`flex shrink-0 items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.32em] text-white/45 sm:text-xs ${
              bleed ? "px-6 sm:px-10" : ""
            }`}
          >
            {chapter !== undefined ? (
              <span
                className="text-[10px] tabular-nums"
                style={{ color: PALETTES[palette].accent }}
              >
                {String(chapter).padStart(2, "0")}
              </span>
            ) : null}
            <span>{eyebrow}</span>
          </p>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col pt-5 sm:pt-7">{children}</div>

        {footer ? <div className="shrink-0 pt-4">{footer}</div> : null}
      </div>
    </section>
  );
}

/**
 * Headline, clipped to the slide's gradient.
 *
 * Three voices, chosen per chapter so the deck does not speak in one tone the
 * whole way through: `display` is the tight grotesk default, `serif` is
 * editorial and used where a chapter should feel written rather than measured,
 * and `mono` is technical, for the chapters that are about systems.
 */
export function Headline({
  palette,
  voice = "display",
  children,
  className = "",
}: {
  palette: PaletteName;
  voice?: "display" | "serif" | "mono";
  children: ReactNode;
  className?: string;
}) {
  const [from, to] = PALETTES[palette].headline;
  const voiceClass = {
    display: "font-semibold tracking-[-0.03em] leading-[0.98]",
    serif: "font-[family-name:var(--font-serif)] font-normal tracking-[-0.01em] leading-[1.06]",
    mono: "font-mono font-medium uppercase tracking-[-0.01em] leading-[1.1]",
  }[voice];

  return (
    <h2
      className={`text-balance bg-clip-text text-transparent ${voiceClass} ${className}`}
      style={{ backgroundImage: `linear-gradient(135deg, ${from} 12%, ${to} 88%)` }}
    >
      {children}
    </h2>
  );
}

/** A number set in mono, the deck's one recurring typographic gesture. */
export function Stat({
  value,
  label,
  className = "",
}: {
  value: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="font-mono text-2xl font-medium tabular-nums text-white sm:text-3xl lg:text-4xl">
        {value}
      </p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45 sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}

/**
 * The row of secondary numbers that closes most slides.
 *
 * It exists as much for composition as for information: a headline and a chart
 * alone leave the bottom of a tall frame empty, and a rail of supporting facts
 * gives the eye somewhere to land after the main figure.
 */
export function DetailRail({
  items,
  accent,
  className = "",
}: {
  items: { value: ReactNode; label: string }[];
  accent: string;
  className?: string;
}) {
  return (
    <dl
      className={`grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-5 sm:grid-cols-4 sm:gap-x-10 ${className}`}
    >
      {items.map((item) => (
        <div key={item.label}>
          <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
            {item.label}
          </dt>
          <dd
            className="mt-1.5 font-mono text-lg font-medium tabular-nums sm:text-xl lg:text-2xl"
            style={{ color: accent }}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Small annotated note, for the caveats that keep the deck honest. */
export function Footnote({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-lg text-pretty font-mono text-[11px] leading-relaxed text-white/35">
      {children}
    </p>
  );
}
