export default function MarqueeStrip() {
  const marqueeItems = [
    "GENERATION",
    "CREATIVITY",
    "PRECISION",
    "TRANSFORM",
    "GENERATION",
    "CREATIVITY",
    "PRECISION",
    "TRANSFORM",
    "GENERATION",
    "CREATIVITY",
    "PRECISION",
    "TRANSFORM",
    "GENERATION",
    "CREATIVITY",
    "PRECISION",
    "TRANSFORM",
  ];

  return (
    <div className="w-full bg-background overflow-hidden py-5 border-b border-border select-none cursor-ew-resize" id="marquee-section">
      <div className="relative flex whitespace-nowrap overflow-x-hidden">
        {/* Double original array for true endless loop scrolling alignment */}
        <div className="animate-marquee-slow flex items-center gap-12 text-foreground">
          {marqueeItems.map((item, index) => (
            <div key={index} className="flex items-center gap-12 font-display text-4xl sm:text-5xl font-black tracking-widest leading-none uppercase">
              <span>{item}</span>
              <span className="text-primary text-4xl select-none leading-none pt-1">✷</span>
            </div>
          ))}
          {/* Loop duplicate */}
          {marqueeItems.map((item, index) => (
            <div key={`dup-${index}`} className="flex items-center gap-12 font-display text-4xl sm:text-5xl font-black tracking-widest leading-none uppercase">
              <span>{item}</span>
              <span className="text-primary text-4xl select-none leading-none pt-1">✷</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
