"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";

const WAITLIST_VIDEOS = ["/videos/14.mp4", "/videos/15.mp4", "/videos/11.mp4"] as const;

const TESTIMONIALS = [
  {
    quote:
      "I shipped a full explainer in an afternoon. Reelify cut my production time from days to minutes.",
    name: "Sarah Chen",
    role: "YouTube Creator",
  },
  {
    quote:
      "Our team uses it for launch videos and social clips. The AI actually understands the story we want to tell.",
    name: "Marcus Rivera",
    role: "Startup Founder",
  },
  {
    quote:
      "I teach online and needed quick concept videos. Reelify is the first tool that feels built for educators.",
    name: "Dr. Amara Okafor",
    role: "Course Creator",
  },
] as const;

function TestimonialCard({
  quote,
  name,
  role,
}: {
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <figure className="w-[280px] max-w-full shrink-0 rounded-2xl border border-border/80 lg:border-none bg-background/70 p-4 backdrop-blur-md">
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-coral">
        {role}
      </span>
      <p className="mt-1 font-display text-sm font-black uppercase tracking-tight text-foreground">
        {name}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{quote}</p>
    </figure>
  );
}

function TestimonialMarquee() {
  const items = [...TESTIMONIALS, ...TESTIMONIALS];

  return (
    <div className="w-full min-w-0 overflow-hidden">
      <div className="flex w-max gap-4 animate-marquee-slow">
        {items.map((item, index) => (
          <TestimonialCard key={`${item.name}-${index}`} {...item} />
        ))}
      </div>
    </div>
  );
}

function WaitlistVideoPanel({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const playCurrent = () => {
      video.src = WAITLIST_VIDEOS[indexRef.current];
      video.muted = true;
      video.load();
      void video.play().catch(() => {});
    };

    const onEnded = () => {
      indexRef.current = (indexRef.current + 1) % WAITLIST_VIDEOS.length;
      playCurrent();
    };

    video.addEventListener("ended", onEnded);
    playCurrent();

    return () => video.removeEventListener("ended", onEnded);
  }, []);

  return (
    <div className={`relative overflow-hidden bg-black ${className ?? ""}`}>
      <video
        ref={videoRef}
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover object-center"
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/35 to-background/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/30" />
      {children}
    </div>
  );
}

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const joinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      toast.success("You're on the list!", {
        description: "We'll be in touch.",
      });
      setEmail("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-clip bg-background lg:grid lg:grid-cols-2">
      {/* Mobile — full-screen video background */}
      <WaitlistVideoPanel className="absolute inset-0 lg:hidden" />

      {/* Left — Waitlist form */}
      <div className="relative z-10 flex min-h-screen min-w-0 flex-col p-8 lg:justify-between lg:bg-background lg:p-12">
        <div>
          <Link href="/" className="inline-block transition-opacity hover:opacity-80">
            <img src="/logos/logo.png" alt="Reelify" className="h-8 w-auto" />
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-8 lg:block lg:flex-none lg:py-0">
          <div className="mx-auto w-full max-w-[420px] rounded-2xl bg-background/70 p-6 backdrop-blur-md lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="mb-10 text-center lg:text-left">
              <h1 className="mb-2 text-3xl font-bold tracking-tight">Join the waitlist</h1>
              <p className="text-sm text-muted-foreground">
                Be the first to know when we launch.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-lg border border-red-900/30 bg-red-950/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={(e) => void joinWaitlist(e)} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="h-12 w-full rounded-lg border border-border bg-background px-4 text-base text-foreground shadow-sm transition-all placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <Button type="submit" disabled={isLoading} size="lg" className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Joining…
                  </>
                ) : (
                  "Join waitlist"
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Mobile — testimonials pinned to bottom */}
        <div className="min-w-0 shrink-0 pb-2 lg:hidden">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-coral">
            What creators are saying
          </p>
          <TestimonialMarquee />
        </div>

        <div className="hidden items-center gap-8 text-sm text-muted-foreground lg:flex">
          <Link href="/settings" className="transition-colors hover:text-foreground">
            Privacy Policy
          </Link>
          <Link href="/settings" className="transition-colors hover:text-foreground">
            Terms of Service
          </Link>
          <a
            href="mailto:support@stickstory.app"
            className="transition-colors hover:text-foreground"
          >
            Contact
          </a>
        </div>
      </div>

      {/* Right — Videos + bottom marquee */}
      <WaitlistVideoPanel className="hidden min-w-0 lg:block">
        <div className="absolute inset-x-0 bottom-0 z-10 min-w-0 w-full overflow-hidden pb-8 xl:pb-10">
          <p className="mb-4 px-8 text-xs font-bold uppercase tracking-[0.22em] text-p xl:px-10">
            What creators are saying
          </p>
          <TestimonialMarquee />
        </div>
      </WaitlistVideoPanel>
    </div>
  );
}
