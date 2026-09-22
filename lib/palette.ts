/**
 * Three colours per slide, plus an accent used for gradient-clipped headlines.
 *
 * Three is the minimum that makes a mesh gradient read as depth rather than as
 * a flat wash: one anchors the top, one the opposite corner, one sits behind
 * the content to lift it off the background. All of them are dark enough that
 * white body text stays comfortably above 7:1 contrast.
 */
export type Palette = {
  /** Mesh colours, ordered: top-left, bottom-right, centre glow. */
  mesh: [string, string, string];
  /** Headline gradient, two stops. */
  headline: [string, string];
  /** Hairlines, labels, bar fills. */
  accent: string;
};

export const PALETTES = {
  cover: {
    mesh: ["#2a1b6b", "#0b1f4d", "#4c1d95"],
    headline: ["#e9e4ff", "#9d8cff"],
    accent: "#a78bfa",
  },
  submerged: {
    // Deep water: almost black at the edges so the descent has somewhere to go.
    mesh: ["#07204a", "#020814", "#0b3a6b"],
    headline: ["#e8f4ff", "#67b4f5"],
    accent: "#38bdf8",
  },
  identity: {
    mesh: ["#0b3b4d", "#08243a", "#0e5a63"],
    headline: ["#e0fbff", "#5eead4"],
    accent: "#2dd4bf",
  },
  contributions: {
    mesh: ["#4a2c08", "#2a1605", "#7c4a10"],
    headline: ["#fff4e0", "#fbbf24"],
    accent: "#f59e0b",
  },
  languages: {
    mesh: ["#0d3b2a", "#07251c", "#155e42"],
    headline: ["#e4fff1", "#4ade80"],
    accent: "#34d399",
  },
  timeline: {
    mesh: ["#11274f", "#0a1730", "#1e3a8a"],
    headline: ["#e6efff", "#7dd3fc"],
    accent: "#38bdf8",
  },
  featured: {
    mesh: ["#4a1233", "#2a0a1e", "#831843"],
    headline: ["#ffe9f3", "#fb7185"],
    accent: "#f43f5e",
  },
  breadth: {
    mesh: ["#331a52", "#1c0e2e", "#5b21b6"],
    headline: ["#f2e9ff", "#c084fc"],
    accent: "#a855f7",
  },
  archetype: {
    mesh: ["#3d2f0a", "#221a05", "#78591a"],
    headline: ["#fff8e6", "#fcd34d"],
    accent: "#fbbf24",
  },
  outro: {
    mesh: ["#1d1b4e", "#0c0b26", "#3730a3"],
    headline: ["#eceaff", "#a5b4fc"],
    accent: "#818cf8",
  },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;
