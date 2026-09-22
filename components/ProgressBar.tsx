/**
 * Segmented progress, one segment per slide.
 *
 * Deliberately not a timer. Instagram's bars fill on a clock because a story is
 * a passive thing you watch; these slides carry numbers people want to read at
 * their own pace, and auto-advancing away from someone's own contribution count
 * is the fastest way to make the deck feel like it is not about them.
 */
export function ProgressBar({
  count,
  index,
  onSelect,
  labels,
}: {
  count: number;
  index: number;
  onSelect: (index: number) => void;
  labels: string[];
}) {
  return (
    <div
      className="story-progress absolute inset-x-0 top-0 z-20 mx-auto flex max-w-5xl gap-1.5"
      role="tablist"
      aria-label="Slides"
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          role="tab"
          aria-selected={i === index}
          aria-label={`Slide ${i + 1} of ${count}: ${labels[i] ?? ""}`}
          onClick={() => onSelect(i)}
          className="group h-6 flex-1 cursor-pointer bg-transparent p-0"
        >
          <span className="block h-[3px] w-full overflow-hidden rounded-full bg-white/20 transition group-hover:bg-white/30">
            <span
              className="block h-full rounded-full bg-white transition-[width] duration-300 ease-out"
              style={{ width: i < index ? "100%" : i === index ? "100%" : "0%" }}
            />
          </span>
        </button>
      ))}
    </div>
  );
}
