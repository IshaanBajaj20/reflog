"use client";

import { ContributionGrid, type CalendarWeek } from "@/components/ContributionGrid";
import { CountUp, Reveal, Stagger } from "@/components/motion";
import { Footnote, Headline, SlideLayout, Stat } from "@/components/SlideLayout";
import { StoryContainer, type Slide } from "@/components/StoryContainer";
import { ClockDial } from "@/components/viz/ClockDial";
import { Iceberg } from "@/components/viz/Iceberg";
import { LanguageTreemap } from "@/components/viz/LanguageTreemap";
import { LayerStack } from "@/components/viz/LayerStack";
import { RepoTimeline } from "@/components/viz/RepoTimeline";
import { WeekdayBars } from "@/components/viz/WeekdayBars";
import { YearRing } from "@/components/viz/YearRing";
import { PALETTES } from "@/lib/palette";

/**
 * Milestone 4 harness. Placeholder numbers, real visuals and real density —
 * the point is to check that a slide fills its frame before data is wired in.
 */

/** A plausible year: bursty weekdays, quieter weekends, a summer dip. */
const demoDays: number[] = Array.from({ length: 371 }, (_, i) => {
  const weekday = i % 7;
  const week = Math.floor(i / 7);
  const weekend = weekday === 0 || weekday === 6;
  const summerDip = week > 28 && week < 34;
  const wobble = Math.floor(Math.abs(Math.sin(week * 3.1 + weekday * 1.7)) * 9);
  return summerDip ? Math.max(0, wobble - 6) : Math.max(0, (weekend ? 1 : 7) + wobble - 3);
});

const demoWeeks: CalendarWeek[] = Array.from({ length: 53 }, (_, w) =>
  Array.from({ length: 7 }, (_, d) => ({
    date: new Date(Date.UTC(2026, 0, 4 + w * 7 + d)).toISOString().slice(0, 10),
    count: demoDays[w * 7 + d] ?? 0,
  })),
);

/** Monthly totals, which give the iceberg its personal silhouette. */
const demoMonthly = Array.from({ length: 12 }, (_, m) =>
  demoDays.slice(m * 31, (m + 1) * 31).reduce((a, b) => a + b, 0),
);

const demoHours = [
  2, 1, 0, 0, 0, 0, 1, 3, 9, 26, 41, 52, 44, 30, 55, 61, 48, 33, 21, 17, 24, 30, 19, 7,
];
const demoWeekdays = [46, 268, 301, 284, 259, 213, 61];

/**
 * Each chapter is composed on its own terms. The shared pieces are the frame,
 * the grain and the vignette — everything else (alignment, type voice, whether
 * the visual is boxed or bled to the edges, what the background even is) varies,
 * because a single template recoloured seven times reads as one slide shown
 * seven times.
 */
const slides: Slide[] = [
  /* -- COVER ----------------------------------------------------------------
     Symmetric title card. Everything centred, the ring holding the name in its
     middle. The only slide in the deck that is axially symmetrical.            */
  {
    id: "cover",
    label: "Cover",
    render: () => (
      <SlideLayout palette="cover" background="spotlight" eyebrow="Reflog · 2026">
        <Stagger className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
          <Reveal>
            <YearRing counts={demoDays} accent={PALETTES.cover.accent} size={340} responsive>
              <div className="flex flex-col items-center gap-3">
                <div className="h-20 w-20 rounded-full bg-white/10 ring-1 ring-white/20" />
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
                  Ishaan Bajaj
                </p>
              </div>
            </YearRing>
          </Reveal>
          <Reveal>
            <Headline palette="cover" className="type-hero mt-6">
              A year of building.
            </Headline>
          </Reveal>
          <Reveal>
            <p className="mt-4 max-w-sm text-pretty text-sm text-white/45">
              365 ticks. One per day.
            </p>
          </Reveal>
        </Stagger>
      </SlideLayout>
    ),
  },

  /* -- 01 CONTRIBUTIONS -----------------------------------------------------
     The number is the slide. It bleeds off the left edge at a size nothing else
     in the deck comes near, the grid runs along the floor, everything else is
     small and bottom-anchored. No centred block anywhere.                      */
  {
    id: "contributions",
    label: "Contributions",
    render: () => (
      <SlideLayout
        palette="contributions"
        background="spotlight"
        eyebrow="The work"
        chapter={1}
        bleed
      >
        <Stagger className="flex min-h-0 flex-1 flex-col justify-center gap-5 px-6 sm:px-10">
          <Reveal>
            <p className="max-w-[26ch] text-pretty font-mono text-[11px] leading-relaxed text-white/45 sm:text-xs">
              GitHub shows the world 41 of these. The other 2,075 happened inside
              repositories only your team can open.
            </p>
          </Reveal>
          <Reveal>
            <p className="type-numeral -ml-[0.05em] font-mono font-medium text-white">
              <CountUp value={2116} />
            </p>
          </Reveal>
          <Reveal>
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-white/45">
                contributions · 2026
              </p>
              <p className="font-mono text-xs text-white/60">
                8.1 / day &nbsp;·&nbsp; 47-day streak &nbsp;·&nbsp; 41 of 52 weeks
              </p>
            </div>
          </Reveal>
          <Reveal>
            <ContributionGrid
              weeks={demoWeeks}
              levels={[1, 3, 6, 10]}
              accent={PALETTES.contributions.accent}
            />
          </Reveal>
        </Stagger>
      </SlideLayout>
    ),
  },

  /* -- 02 SUBMERGED ---------------------------------------------------------
     Full-bleed vertical. The iceberg IS the slide; type floats over it, pinned
     to the top and bottom edges. Strata background, no blobs.                  */
  {
    id: "submerged",
    label: "Below the surface",
    render: () => (
      <SlideLayout
        palette="submerged"
        background="strata"
        eyebrow="What nobody saw"
        chapter={2}
        bleed
      >
        <div className="relative min-h-0 flex-1">
          <Iceberg
            monthly={demoMonthly}
            publicCount={41}
            privateCount={2075}
            accent={PALETTES.submerged.accent}
            className="h-full"
          />
          <Stagger className="pointer-events-none absolute inset-0 flex flex-col justify-between px-6 py-2 sm:px-10">
            <Reveal>
              <Headline
                palette="submerged"
                voice="serif"
                className="type-display max-w-[14ch] italic"
              >
                Two percent of it showed.
              </Headline>
            </Reveal>
            <Reveal>
              <p className="max-w-xs text-pretty font-mono text-[11px] leading-relaxed text-white/50">
                Every other year-in-review measures the tip and calls that your year. The
                shape is drawn from your own months — nobody else has this one.
              </p>
            </Reveal>
          </Stagger>
        </div>
      </SlideLayout>
    ),
  },

  /* -- 03 WORKING HOURS -----------------------------------------------------
     Radial and centred, with the four facts pushed out to the corners around
     the dial. Reads like an instrument panel.                                  */
  {
    id: "clock",
    label: "Working hours",
    render: () => (
      <SlideLayout palette="timeline" background="orbs" eyebrow="When you work" chapter={3}>
        <Stagger className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-center gap-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-x-10 lg:gap-y-8">
          <div className="hidden lg:flex lg:flex-col lg:items-end lg:gap-10 lg:text-right">
            <Reveal>
              <Stat value="15:00" label="peak hour" />
            </Reveal>
            <Reveal>
              <Stat value="9%" label="on weekends" />
            </Reveal>
          </div>

          <Reveal className="flex min-h-0 justify-center">
            <ClockDial
              hours={demoHours}
              accent={PALETTES.timeline.accent}
              peakHour={15}
              size={380}
            />
          </Reveal>

          <div className="hidden lg:flex lg:flex-col lg:gap-10">
            <Reveal>
              <Stat value="Tuesday" label="busiest day" />
            </Reveal>
            <Reveal>
              <Stat value="1,240" label="commits read" />
            </Reveal>
          </div>

          <Reveal className="w-full lg:col-span-3">
            <WeekdayBars counts={demoWeekdays} accent={PALETTES.timeline.accent} />
          </Reveal>

          <Reveal className="w-full lg:hidden">
            <p className="flex flex-wrap justify-center gap-x-5 gap-y-1 font-mono text-[11px] text-white/50">
              <span>peak 15:00</span>
              <span>·</span>
              <span>busiest Tue</span>
              <span>·</span>
              <span>9% weekends</span>
              <span>·</span>
              <span>1,240 commits read</span>
            </p>
          </Reveal>
        </Stagger>
      </SlideLayout>
    ),
  },

  /* -- 04 LANGUAGES ---------------------------------------------------------
     The treemap runs edge to edge and becomes the background. Type is a small
     block overlaid in the corner, the way a map legend sits on a map.          */
  {
    id: "languages",
    label: "Languages",
    render: () => (
      <SlideLayout
        palette="languages"
        background="bare"
        eyebrow="What you wrote"
        chapter={4}
        bleed
      >
        <div className="relative min-h-0 flex-1">
          <Reveal className="h-full">
            <LanguageTreemap
              accent={PALETTES.languages.accent}
              className="h-full !rounded-none !ring-0"
              languages={[
                { language: "Python", share: 0.42 },
                { language: "TypeScript", share: 0.22 },
                { language: "Go", share: 0.14 },
                { language: "C++", share: 0.08, inflated: true },
                { language: "SQL", share: 0.06 },
                { language: "HCL", share: 0.04 },
                { language: "Shell", share: 0.025 },
                { language: "Dockerfile", share: 0.01 },
                { language: "Lua", share: 0.005 },
              ]}
            />
          </Reveal>
          <Stagger className="pointer-events-none absolute right-0 top-0 m-4 max-w-xs rounded-xl bg-[#05060a]/85 p-5 ring-1 ring-white/10 backdrop-blur-md sm:m-6">
            <Reveal>
              <Headline palette="languages" voice="mono" className="type-title">
                11 languages
              </Headline>
            </Reveal>
            <Reveal>
              <p className="mt-3 text-pretty font-mono text-[11px] leading-relaxed text-white/55">
                Area is share of bytes written. 24.6 MB in total. The hatched cell is a
                bundled library — shown, not credited to you.
              </p>
            </Reveal>
          </Stagger>
        </div>
      </SlideLayout>
    ),
  },

  /* -- 05 TIMELINE ----------------------------------------------------------
     Bottom-anchored, the squares standing on the floor of the slide like a
     skyline. Headline sits up in the empty sky above them.                     */
  {
    id: "timeline",
    label: "Timeline",
    render: () => (
      <SlideLayout
        palette="featured"
        background="horizon"
        eyebrow="Seven years of repositories"
        chapter={5}
      >
        <Stagger className="flex min-h-0 flex-1 flex-col justify-between gap-8">
          <Reveal>
            <Headline palette="featured" className="type-hero max-w-[16ch]">
              Seventy projects,
              <br />
              one square each.
            </Headline>
          </Reveal>
          <div className="space-y-5">
            <Reveal>
              <RepoTimeline
                accent={PALETTES.featured.accent}
                years={[
                  { year: 2020, publicRepos: 4, privateRepos: 1 },
                  { year: 2021, publicRepos: 6, privateRepos: 3 },
                  { year: 2022, publicRepos: 3, privateRepos: 7 },
                  { year: 2023, publicRepos: 2, privateRepos: 11 },
                  { year: 2024, publicRepos: 3, privateRepos: 14 },
                  { year: 2025, publicRepos: 1, privateRepos: 9 },
                  { year: 2026, publicRepos: 1, privateRepos: 5 },
                ]}
              />
            </Reveal>
            <Reveal>
              <p className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-white/45">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-[2px]"
                    style={{ backgroundColor: PALETTES.featured.accent }}
                  />
                  public
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-[2px]"
                    style={{ border: `1.5px solid ${PALETTES.featured.accent}` }}
                  />
                  private — counted, never named
                </span>
              </p>
            </Reveal>
          </div>
        </Stagger>
      </SlideLayout>
    ),
  },

  /* -- 06 BREADTH -----------------------------------------------------------
     Blueprint. Mono headline, technical register, the stack running the full
     width with the label sitting above it rather than beside it.               */
  {
    id: "breadth",
    label: "Breadth",
    render: () => (
      <SlideLayout palette="breadth" background="grid" eyebrow="The stack you own" chapter={6}>
        <Stagger className="flex min-h-0 flex-1 flex-col justify-center gap-7">
          <Reveal>
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-white/10 pb-5">
              <Headline palette="breadth" voice="mono" className="type-display">
                Four layers deep
              </Headline>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                4 / 6 surveyed
              </p>
            </div>
          </Reveal>
          <Reveal>
            <LayerStack
              accent={PALETTES.breadth.accent}
              className="w-full"
              layers={[
                { key: "infra", label: "Infrastructure", active: true, evidence: 2.1 },
                { key: "backend", label: "Backend", active: true, evidence: 3.4 },
                { key: "ml", label: "ML & data", active: false, evidence: 0.3 },
                { key: "tooling", label: "Tooling & systems", active: true, evidence: 1.6 },
                { key: "mobile", label: "Mobile", active: false, evidence: 0.1 },
                { key: "frontend", label: "Frontend", active: true, evidence: 2.8 },
              ]}
            />
          </Reveal>
          <Reveal>
            <Footnote>
              Inferred from languages weighted by volume, plus repository topics. Nobody
              works in all six.
            </Footnote>
          </Reveal>
        </Stagger>
      </SlideLayout>
    ),
  },

  /* -- OUTRO ----------------------------------------------------------------
     Quiet on purpose. After six dense chapters the closing line gets space and
     the editorial serif, and it is the only slide with no chart on it.         */
  {
    id: "outro",
    label: "Outro",
    render: () => (
      <SlideLayout palette="outro" background="horizon" eyebrow="That was your year">
        <Stagger className="flex min-h-0 flex-1 flex-col justify-center gap-10">
          <Reveal>
            <Headline
              palette="outro"
              voice="serif"
              className="type-hero max-w-[22ch]"
            >
              Two thousand commits nobody will ever see, and a system that runs because of
              them.
            </Headline>
          </Reveal>
          <Reveal>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="relative z-30 rounded-full bg-white px-6 py-3 font-mono text-sm font-medium text-[#05060a] transition hover:opacity-90"
                onClick={() => alert("Share comes in milestone 7.")}
              >
                Share your year
              </button>
              <button
                type="button"
                className="relative z-30 rounded-full border border-white/20 px-6 py-3 font-mono text-sm text-white/80 transition hover:border-white/40"
                onClick={() => alert("PNG export comes in milestone 7.")}
              >
                Save as image
              </button>
            </div>
          </Reveal>
        </Stagger>
      </SlideLayout>
    ),
  },
];

export default function DemoPage() {
  return <StoryContainer slides={slides} />;
}
