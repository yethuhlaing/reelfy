const MARQUEE_ITEMS = [
  "GENERATION",
  "CREATIVITY",
  "PRECISION",
  "TRANSFORM",
] as const;

function MarqueeTrack({ id }: { id: string }) {
  return (
    <>
      {MARQUEE_ITEMS.map((item) => (
        <div
          key={`${id}-${item}`}
          className="flex shrink-0 items-center gap-12 font-display text-4xl font-black uppercase leading-none tracking-widest sm:text-5xl"
        >
          <span>{item}</span>
          <span className="select-none pt-1 text-4xl leading-none text-coral" aria-hidden>
            ✷
          </span>
        </div>
      ))}
    </>
  );
}

export default function MarqueeStrip() {
  return (
    <div
      className="w-full select-none overflow-hidden bg-background py-5"
      id="marquee-section"
    >
      <div
        className="flex w-max animate-marquee-slow items-center gap-12 text-foreground will-change-transform motion-reduce:animate-none"
        aria-hidden
      >
        <MarqueeTrack id="a" />
        <MarqueeTrack id="b" />
      </div>
      <p className="sr-only">{MARQUEE_ITEMS.join(", ")}</p>
    </div>
  );
}
