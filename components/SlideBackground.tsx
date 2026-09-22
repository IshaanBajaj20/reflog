import type { Palette } from "@/lib/palette";

/**
 * Backgrounds, by kind rather than by colour.
 *
 * One shape recoloured six times reads as one slide shown six times. Each
 * variant here is a different structure — blobs, strata, a hard spotlight, a
 * blueprint grid, a horizon — so a chapter changes character and not just hue.
 * Grain and vignette are the only things every variant shares, because they are
 * what make the deck feel like one object rather than six.
 */
export type BackgroundVariant =
  | "orbs"
  | "spotlight"
  | "strata"
  | "grid"
  | "horizon"
  | "bare";

export function SlideBackground({
  palette,
  variant = "orbs",
}: {
  palette: Palette;
  variant?: BackgroundVariant;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {variant === "orbs" ? <Orbs palette={palette} /> : null}
      {variant === "spotlight" ? <Spotlight palette={palette} /> : null}
      {variant === "strata" ? <Strata palette={palette} /> : null}
      {variant === "grid" ? <Blueprint palette={palette} /> : null}
      {variant === "horizon" ? <Horizon palette={palette} /> : null}
      {variant === "bare" ? <Bare palette={palette} /> : null}

      <div className="reflog-grain absolute inset-0 opacity-[0.14] mix-blend-overlay" />
      <Vignette variant={variant} />
    </div>
  );
}

/** Drifting blobs. The generalist: depth from parallax. */
function Orbs({ palette }: { palette: Palette }) {
  const [one, two, three] = palette.mesh;
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#05060a",
          backgroundImage: [
            `radial-gradient(130% 95% at 6% 2%, ${one} 0%, transparent 56%)`,
            `radial-gradient(120% 90% at 98% 96%, ${two} 0%, transparent 58%)`,
            `radial-gradient(90% 70% at 50% 45%, ${three} 0%, transparent 72%)`,
          ].join(", "),
        }}
      />
      <div
        className="reflog-orb reflog-orb-a"
        style={{
          top: "-18%",
          left: "-12%",
          width: "72vmax",
          height: "72vmax",
          background: `radial-gradient(circle at 50% 50%, ${three} 0%, transparent 66%)`,
          filter: "blur(80px)",
          opacity: 0.5,
        }}
      />
      <div
        className="reflog-orb reflog-orb-b"
        style={{
          bottom: "-24%",
          right: "-16%",
          width: "64vmax",
          height: "64vmax",
          background: `radial-gradient(circle at 50% 50%, ${one} 0%, transparent 68%)`,
          filter: "blur(95px)",
          opacity: 0.42,
        }}
      />
      <div
        className="reflog-sweep absolute left-1/2 top-1/2 h-[190vmax] w-[190vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.10]"
        style={{
          backgroundImage: `conic-gradient(from 0deg, transparent 0deg, ${three} 70deg, transparent 150deg, ${one} 250deg, transparent 330deg)`,
        }}
      />
    </>
  );
}

/**
 * Near-black with one hard raking light. For the slide where a single number
 * has to be the loudest thing on screen.
 */
function Spotlight({ palette }: { palette: Palette }) {
  const [, , three] = palette.mesh;
  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: "#040508" }} />
      <div
        className="reflog-orb reflog-orb-c"
        style={{
          bottom: "-38%",
          right: "-18%",
          width: "92vmax",
          height: "92vmax",
          background: `radial-gradient(circle at 50% 50%, ${three} 0%, transparent 58%)`,
          filter: "blur(70px)",
          opacity: 0.62,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(28deg, transparent 40%, ${palette.accent}14 62%, transparent 76%)`,
        }}
      />
    </>
  );
}

/**
 * Horizontal depth bands, darkening downward. Water, essentially — used where
 * the slide is about what lies beneath.
 */
function Strata({ palette }: { palette: Palette }) {
  const [one, , three] = palette.mesh;
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${three} 0%, ${one} 34%, #03060f 72%, #01020a 100%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, ${palette.accent}0b 0 2px, transparent 2px 120px)`,
        }}
      />
      <div
        className="reflog-orb reflog-orb-a"
        style={{
          top: "-30%",
          left: "20%",
          width: "80vmax",
          height: "50vmax",
          background: `radial-gradient(ellipse at 50% 50%, ${palette.accent} 0%, transparent 62%)`,
          filter: "blur(90px)",
          opacity: 0.28,
        }}
      />
    </>
  );
}

/** Technical grid. For the slide that is literally about layers of a system. */
function Blueprint({ palette }: { palette: Palette }) {
  const [one, two] = palette.mesh;
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#05060a",
          backgroundImage: `radial-gradient(120% 100% at 80% 10%, ${one} 0%, transparent 62%), radial-gradient(90% 80% at 10% 95%, ${two} 0%, transparent 60%)`,
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: [
            `linear-gradient(to right, ${palette.accent}44 1px, transparent 1px)`,
            `linear-gradient(to bottom, ${palette.accent}44 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: "56px 56px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage: [
            `linear-gradient(to right, ${palette.accent}55 1px, transparent 1px)`,
            `linear-gradient(to bottom, ${palette.accent}55 1px, transparent 1px)`,
          ].join(", "),
          backgroundSize: "280px 280px",
        }}
      />
    </>
  );
}

/** A low sun. For the closing slide, where the register changes. */
function Horizon({ palette }: { palette: Palette }) {
  const [one, two, three] = palette.mesh;
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(to bottom, #02030a 0%, ${one} 46%, ${three} 74%, ${two} 100%)`,
        }}
      />
      <div
        className="reflog-orb reflog-orb-b absolute"
        style={{
          bottom: "-46%",
          left: "50%",
          marginLeft: "-45vmax",
          width: "90vmax",
          height: "90vmax",
          background: `radial-gradient(circle at 50% 50%, ${palette.accent} 0%, transparent 56%)`,
          filter: "blur(80px)",
          opacity: 0.5,
        }}
      />
      <div
        className="absolute inset-x-0 opacity-30"
        style={{
          top: "62%",
          height: "1px",
          backgroundImage: `linear-gradient(to right, transparent, ${palette.accent}, transparent)`,
        }}
      />
    </>
  );
}

/** Almost nothing — for slides where the content is the background. */
function Bare({ palette }: { palette: Palette }) {
  const [one] = palette.mesh;
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: "#05060a",
        backgroundImage: `radial-gradient(140% 110% at 50% 0%, ${one} 0%, transparent 70%)`,
      }}
    />
  );
}

function Vignette({ variant }: { variant: BackgroundVariant }) {
  if (variant === "bare") {
    return (
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(3,4,8,0.72) 0%, transparent 26%, transparent 70%, rgba(3,4,8,0.8) 100%)",
        }}
      />
    );
  }
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: [
          "radial-gradient(78% 62% at 50% 44%, transparent 0%, rgba(3,4,8,0.6) 100%)",
          "linear-gradient(to bottom, rgba(3,4,8,0.6) 0%, transparent 20%, transparent 64%, rgba(3,4,8,0.84) 100%)",
        ].join(", "),
      }}
    />
  );
}
