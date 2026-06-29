"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { useState } from "react";

type Model = {
  name: string;
  /** Path under /public; if logo missing/fails it falls back to a text wordmark chip. */
  logo?: string;
  role: string;
};

type Bucket = {
  id: string;
  label: string;
  tagline: string;
  models: Model[];
};

const LOGO_BASE = "/logos/models";

const VIDEO_BUCKET: Bucket = {
  id: "video",
  label: "Video",
  tagline: "Image-to-video & motion",
  models: [
    { name: "Kling 2.6 Pro", logo: `${LOGO_BASE}/kling.svg`, role: "Cinematic image-to-video" },
    { name: "LTX-Video", logo: `${LOGO_BASE}/ltx.svg`, role: "Fast motion synthesis" },
    { name: "LongCat", logo: `${LOGO_BASE}/longcat.svg`, role: "Long-form video" },
  ],
};

const SIDE_BUCKETS: Bucket[] = [
  {
    id: "image",
    label: "Image",
    tagline: "Frames & keyart",
    models: [
      { name: "FLUX", logo: `${LOGO_BASE}/flux.svg`, role: "High-fidelity frames" },
      { name: "SDXL Lightning", logo: `${LOGO_BASE}/sdxl.svg`, role: "Instant draft frames" },
    ],
  },
  {
    id: "llm",
    label: "Brains",
    tagline: "Script & scene planning",
    models: [
      { name: "Gemini 2.5 Flash", logo: `${LOGO_BASE}/gemini.svg`, role: "Story & scene planning" },
      { name: "Llama 3.3 70B", logo: `${LOGO_BASE}/llama.svg`, role: "Script writing" },
      { name: "DeepSeek R1", logo: `${LOGO_BASE}/deepseek.svg`, role: "Reasoning & structure" },
      { name: "Nemotron Ultra", logo: `${LOGO_BASE}/nemotron.svg`, role: "253B heavy lifting" },
    ],
  },
  {
    id: "audio",
    label: "Audio & Voice",
    tagline: "Voiceover & soundtrack",
    models: [
      { name: "ElevenLabs", logo: `${LOGO_BASE}/elevenlabs.svg`, role: "Realistic voiceover" },
      { name: "MiniMax Music", logo: `${LOGO_BASE}/minimax.svg`, role: "Original soundtracks" },
      { name: "Stable Audio", logo: `${LOGO_BASE}/stable-audio.svg`, role: "Sound design" },
      { name: "CassetteAI", logo: `${LOGO_BASE}/cassetteai.svg`, role: "Lofi & loops" },
    ],
  },
];

const TOTAL_MODELS =
  VIDEO_BUCKET.models.length +
  SIDE_BUCKETS.reduce((sum, b) => sum + b.models.length, 0);

const GRAIN_URL =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")";

function ModelLogo({ model, size = 28 }: { model: Model; size?: number }) {
  const [failed, setFailed] = useState(false);
  const showImage = model.logo && !failed;

  if (showImage) {
    return (
      <Image
        src={model.logo as string}
        alt={`${model.name} logo`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="object-contain opacity-70 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-md bg-white/5 font-mono text-[10px] font-bold uppercase tracking-tight text-white/60 transition group-hover:text-coral-light"
    >
      {model.name.slice(0, 2)}
    </span>
  );
}

function ModelRow({ model, size }: { model: Model; size?: number }) {
  return (
    <div className="group flex items-center gap-3.5 rounded-2xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition duration-300 hover:-translate-y-0.5 hover:border-coral-light/30 hover:bg-white/[0.05] hover:shadow-[0_10px_30px_-15px_rgba(255,90,60,0.5)]">
      <ModelLogo model={model} size={size} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white/90">{model.name}</p>
        <p className="truncate text-xs text-white/45">{model.role}</p>
      </div>
    </div>
  );
}

function BucketCard({
  bucket,
  className = "",
}: {
  bucket: Bucket;
  className?: string;
}) {
  return (
    <div
      className={`card-gradient-border group/bucket relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 backdrop-blur-sm transition duration-500 hover:border-white/[0.12] ${className}`}
    >
      <div className="pointer-events-none absolute -inset-px rounded-3xl bg-[radial-gradient(ellipse_at_top,_rgba(255,140,66,0.12),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover/bucket:opacity-100" />
      <div className="relative flex items-baseline justify-between">
        <h3 className="font-display text-lg font-black tracking-tight text-white">
          {bucket.label}
        </h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
          {bucket.tagline}
        </span>
      </div>
      <div className="relative mt-5 space-y-2.5">
        {bucket.models.map((model) => (
          <ModelRow key={model.name} model={model} />
        ))}
      </div>
    </div>
  );
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as const },
  },
};

export default function ModelStackSection() {
  return (
    <section className="relative overflow-hidden bg-[#050508] py-20 md:py-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="new-blob new-blob-a" />
        <div className="new-blob new-blob-c" />
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04]"
        style={{ backgroundImage: GRAIN_URL, backgroundSize: "128px", backgroundRepeat: "repeat" }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-12">
        {/* Side-aligned header — matches Explore / Video sections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-coral">
              The engine room
            </p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase leading-[1.02] tracking-tight text-foreground md:text-5xl">
              Powered by the{" "}
              <span className="bg-gradient-to-r from-coral-light via-softpink to-coral bg-clip-text text-transparent">
                best models
              </span>{" "}
              in the world
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            A full stack of frontier AI — video, image, language, and audio —
            orchestrated so every reel ships at studio quality.
          </p>
        </motion.div>

        {/* Asymmetric bento — featured Video bucket + side stack */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-12"
        >
          {/* Featured: Video — tall hero tile */}
          <motion.div
            variants={itemVariants}
            className="card-gradient-border group/bucket relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] p-7 backdrop-blur-sm transition duration-500 hover:border-white/[0.12] md:p-9 lg:col-span-5 lg:row-span-2"
          >
            <div className="pointer-events-none absolute -inset-px rounded-3xl bg-[radial-gradient(ellipse_at_top_left,_rgba(255,90,60,0.18),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover/bucket:opacity-100" />
            <div className="relative">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-coral-light/70">
                {VIDEO_BUCKET.tagline}
              </p>
              <h3 className="mt-2 font-display text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
                {VIDEO_BUCKET.label}
              </h3>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/50">
                Our flagship layer — turn a single frame into smooth,
                broadcast-grade motion.
              </p>
            </div>
            <div className="relative mt-auto space-y-3 pt-8">
              {VIDEO_BUCKET.models.map((model) => (
                <ModelRow key={model.name} model={model} size={32} />
              ))}
            </div>
          </motion.div>

          {/* Image bucket */}
          <motion.div variants={itemVariants} className="lg:col-span-4">
            <BucketCard bucket={SIDE_BUCKETS[0]} className="h-full" />
          </motion.div>

          {/* Stat tile */}
          <motion.div
            variants={itemVariants}
            className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-coral/20 bg-gradient-to-br from-coral/[0.12] to-transparent p-7 lg:col-span-3"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-coral-light/80">
              Models on tap
            </p>
            <div>
              <p className="font-display text-6xl font-black leading-none tracking-tight text-white">
                {TOTAL_MODELS}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-white/55">
                frontier models working together on every render.
              </p>
            </div>
          </motion.div>

          {/* Brains bucket */}
          <motion.div variants={itemVariants} className="lg:col-span-4">
            <BucketCard bucket={SIDE_BUCKETS[1]} className="h-full" />
          </motion.div>

          {/* Audio bucket */}
          <motion.div variants={itemVariants} className="lg:col-span-3">
            <BucketCard bucket={SIDE_BUCKETS[2]} className="h-full" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
