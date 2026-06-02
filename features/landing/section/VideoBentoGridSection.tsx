"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

type BentoTile = {
  id: string;
  video: string;
  title?: string;
  href?: string;
  className: string;
  overlay?: "gradient" | "dark" | "light" | "none";
};

const TILES: BentoTile[] = [
  {
    id: "create",
    video: "/videos/1.mp4",
    title: "CREATE",
    href: "/new",
    className:
      "min-h-[440px] md:col-span-1 md:row-span-2 lg:col-span-5 lg:row-span-2 lg:row-start-1 lg:col-start-1 lg:min-h-0",
    overlay: "gradient",
  },
  {
    id: "motion",
    video: "/videos/2.mp4",
    title: "MOTION",
    className:
      "min-h-[280px] md:col-span-1 lg:col-span-3 lg:row-start-1 lg:col-start-6 lg:min-h-0",
    overlay: "dark",
  },
  {
    id: "frame",
    video: "/videos/3.mp4",
    className:
      "min-h-[280px] md:col-span-1 lg:col-span-4 lg:row-start-1 lg:col-start-9 lg:min-h-0",
    overlay: "light",
  },
  {
    id: "prompt",
    video: "/videos/4.mp4",
    title: "IMAGINE",
    className:
      "min-h-[280px] md:col-span-1 lg:col-span-3 lg:row-start-2 lg:col-start-6 lg:min-h-0",
    overlay: "dark",
  },
  {
    id: "flow",
    video: "/videos/5.mp4",
    title: "FLOW",
    className:
      "min-h-[280px] md:col-span-1 lg:col-span-4 lg:row-start-2 lg:col-start-9 lg:min-h-0",
    overlay: "dark",
  },
  {
    id: "clip",
    video: "/videos/6.mp4",
    title: "CUT",
    className:
      "min-h-[280px] md:col-span-1 lg:col-span-5 lg:row-start-3 lg:col-start-1 lg:min-h-0",
    overlay: "gradient",
  },
  {
    id: "workspace",
    video: "/videos/7.mp4",
    title: "From story to screen",
    href: "/dashboard",
    className:
      "min-h-[320px] md:col-span-2 lg:col-span-7 lg:col-start-6 lg:row-start-3 lg:min-h-0",
    overlay: "gradient",
  },
  {
    id: "story",
    video: "/videos/8.mp4",
    title: "STORY",
    className:
      "min-h-[400px] md:col-span-2 md:row-span-2 lg:col-span-6 lg:row-span-2 lg:row-start-4 lg:col-start-1 lg:min-h-0",
    overlay: "dark",
  },
  {
    id: "scene",
    video: "/videos/9.mp4",
    title: "SCENE",
    className:
      "min-h-[340px] md:col-span-1 lg:col-span-6 lg:row-start-4 lg:col-start-7 lg:min-h-0",
    overlay: "gradient",
  },
  {
    id: "vibe",
    video: "/videos/10.mp4",
    className:
      "min-h-[340px] md:col-span-1 lg:col-span-6 lg:row-start-5 lg:col-start-7 lg:min-h-0",
    overlay: "light",
  },
  {
    id: "draft",
    video: "/videos/11.mp4",
    title: "DRAFT",
    className:
      "min-h-[380px] md:col-span-1 lg:col-span-4 lg:row-start-6 lg:col-start-1 lg:min-h-0",
    overlay: "dark",
  },
  {
    id: "pulse",
    video: "/videos/12.mp4",
    title: "PULSE",
    className:
      "min-h-[380px] md:col-span-1 lg:col-span-5 lg:row-start-6 lg:col-start-5 lg:min-h-0",
    overlay: "gradient",
  },
  {
    id: "reel",
    video: "/videos/13.mp4",
    title: "REEL",
    className:
      "min-h-[380px] md:col-span-1 lg:col-span-3 lg:row-start-6 lg:col-start-10 lg:min-h-0",
    overlay: "dark",
  },
];

function BentoVideoCard({ tile }: { tile: BentoTile }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, []);

  const playOnHover = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const start = () => {
      void video.play().catch(() => {});
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      start();
      return;
    }

    video.preload = "auto";

    const onReady = () => start();
    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("canplay", onReady, { once: true });

    if (video.networkState !== HTMLMediaElement.NETWORK_LOADING) {
      video.load();
    }
  }, []);

  const pauseOnLeave = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }, []);

  const overlayClass =
    tile.overlay === "light"
      ? "from-white/80 via-white/20 to-transparent"
      : tile.overlay === "dark"
        ? "from-black/80 via-black/30 to-black/10"
        : tile.overlay === "gradient"
          ? "from-black/70 via-black/20 to-transparent"
          : "";

  const inner = (
    <>
      <video
        ref={videoRef}
        src={tile.video}
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 z-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        aria-hidden
      />

      {tile.overlay !== "none" && tile.overlay && (
        <div
          className={`pointer-events-none absolute inset-0 z-[1] ${overlayClass}`}
          aria-hidden
        />
      )}

      <div className="pointer-events-none relative z-10 flex h-full min-h-[inherit] flex-col justify-end p-5 md:p-6">
        <div className="flex items-end justify-between gap-3">
          {tile.title ? (
            <p
              className={`font-display font-black uppercase leading-[0.9] tracking-tight ${
                tile.overlay === "light"
                  ? "text-[#0b0b0f] text-2xl md:text-3xl"
                  : "text-2xl text-white md:text-4xl"
              } ${tile.id === "create" ? "text-4xl md:text-6xl lg:text-7xl" : ""}`}
            >
              {tile.title}
            </p>
          ) : (
            <span />
          )}

          {tile.href && (
            <span className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition-colors group-hover:bg-coral group-hover:border-coral">
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            </span>
          )}
        </div>
      </div>
    </>
  );

  const className = `video-bento-card group relative overflow-hidden rounded-2xl bg-[#0a0a0a] md:rounded-3xl ${tile.className}`;
  const hoverHandlers = {
    onPointerEnter: playOnHover,
    onPointerLeave: pauseOnLeave,
    onFocus: playOnHover,
    onBlur: pauseOnLeave,
  };

  if (tile.href) {
    return (
      <Link href={tile.href} className={className} {...hoverHandlers}>
        {inner}
      </Link>
    );
  }

  return (
    <article className={className} {...hoverHandlers}>
      {inner}
    </article>
  );
}

export default function VideoBentoGridSection() {
  return (
    <section
      id="video-bento-grid"
      className="w-full bg-background px-4 py-16 md:px-8 md:py-24 lg:px-12"
      aria-labelledby="video-bento-heading"
    >
      <div className="mx-auto max-w-[1680px]">
        <div className="mb-8 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-coral">
              Showcase
            </p>
            <h2
              id="video-bento-heading"
              className="mt-2 font-display text-3xl font-black uppercase tracking-tight text-white md:text-4xl"
            >
              Built in motion
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/55">
            Real outputs from the studio — portraits, scenes, and story frames
            in one grid.
          </p>
        </div>

        <div className="video-bento-grid grid grid-cols-1 gap-4 md:grid-cols-2 md:grid-rows-[repeat(9,auto)] md:gap-4 lg:grid-cols-12 lg:grid-rows-[minmax(280px,1fr)_minmax(280px,1fr)_minmax(300px,1.05fr)_minmax(360px,1fr)_minmax(340px,1fr)_minmax(420px,1.2fr)] lg:gap-5">
          {TILES.map((tile) => (
            <BentoVideoCard key={tile.id} tile={tile} />
          ))}
        </div>
      </div>
    </section>
  );
}
