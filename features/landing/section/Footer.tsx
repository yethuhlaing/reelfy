import Link from "next/link";
import { ArrowRight } from "lucide-react";

const homeLinks = [
  { label: "About Us", href: "#crafting-section" },
  { label: "Featured", href: "#explore-cards-section" },
  { label: "Gallery", href: "#search-section" },
];

const resourceLinks = [
  { label: "Terms & Conditions", href: "#terms" },
  { label: "Privacy Policy", href: "#privacy" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="aileng-footer"
      className="relative w-full overflow-hidden bg-cream text-[var(--accent-ink)]"
    >
      {/* Grain + column grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[length:min(25%,120px)_100%]"
      />

      <div className="relative mx-auto w-full max-w-[1400px] px-4 pt-16 pb-10 sm:px-6 md:pt-20 md:pb-14 lg:px-8">
        {/* Top — 4-column info grid */}
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-0">
          {/* Address + email */}
          <div className="flex flex-col gap-8 sm:col-span-2 lg:col-span-4">
            <div
              className="flex h-3 w-10 overflow-hidden rounded-full"
              aria-hidden
            >
              <span className="h-full w-1/2 bg-[var(--accent-ink)]" />
              <span className="h-full w-1/2 bg-coral" />
            </div>

            <div>
              <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">
                Address
              </p>
              <address className="space-y-0.5 text-sm font-medium not-italic leading-relaxed text-[var(--accent-ink)]/90 md:text-base">
                <span className="block">Sector 7, Metaverse</span>
                <span className="block">Jakarta Megapolis</span>
                <span className="block">12050</span>
              </address>
            </div>

            <a
              href="mailto:info@aileng.com"
              className="font-display text-2xl font-black tracking-tight underline decoration-[var(--accent-ink)] decoration-1 underline-offset-[6px] transition-colors hover:text-coral hover:decoration-coral sm:text-3xl md:text-[2rem]"
            >
              Info@aileng.com
            </a>
          </div>

          {/* Home links */}
          <nav className="lg:col-span-2" aria-label="Home">
            <p className="mb-5 text-xs font-medium tracking-wide text-muted-foreground">
              Home
            </p>
            <ul className="space-y-3 text-sm font-medium md:text-base">
              {homeLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-coral"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Resource links */}
          <nav className="lg:col-span-2" aria-label="Resources">
            <p className="mb-5 text-xs font-medium tracking-wide text-muted-foreground">
              Resource
            </p>
            <ul className="space-y-3 text-sm font-medium md:text-base">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-coral"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Image + CTA */}
          <div className="sm:col-span-2 lg:col-span-4 lg:w-full">
            <div className="relative pb-6">
              <div className="relative min-h-[360px] w-full overflow-hidden rounded-2xl bg-black sm:min-h-[420px]">
                <img
                  src="/logos/logo.png"
                  alt="Reelicy logo"
                  width={991}
                  height={1199}
                  className="absolute inset-0 z-0 h-full w-full object-contain object-center p-8"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <Link
                href="/new"
                className="absolute -bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-3 rounded-full bg-white px-5 py-3.5 text-sm font-semibold text-[var(--accent-ink)] shadow-lg ring-1 ring-black/5 transition-transform hover:scale-[1.02] active:scale-[0.98] sm:left-6 sm:right-6"
              >
                <span>Get Product</span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-ink)] text-coral-foreground">
                  <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Middle — contact + giant wordmark */}
        <div className="mt-20 md:mt-28">
          <div className="mb-6 md:mb-8">
            <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground">
              Contact Us
            </p>
            <a
              href="mailto:hello@aileng.com"
              className="text-sm font-medium transition-colors hover:text-coral md:text-base"
            >
              Hello@aileng.com
            </a>
          </div>

          <div className="relative flex flex-wrap items-start gap-2">
            <h2 className="font-display text-[clamp(3.5rem,18vw,13rem)] font-black uppercase leading-[0.85] tracking-[-0.06em] text-[var(--accent-ink)]">
              AILENG
              <span className="text-[var(--accent-ink)]">.</span>
            </h2>
            <span
              className="mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[var(--accent-ink)] text-xs font-bold md:mt-4 md:h-14 md:w-14 md:text-sm"
              aria-label="Registered trademark"
            >
              ®
            </span>
          </div>
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="relative bg-coral py-4 text-coral-foreground">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-3 px-4 text-[11px] font-medium tracking-wide sm:flex-row sm:gap-4 sm:px-6 sm:text-xs lg:px-8">
          <p className="text-center sm:text-left">
            ©{currentYear} AILENG. All Right Reserved.
          </p>
          <p className="text-center opacity-95">
            Sector 7, Metaverse Jakarta Megapolis 12050
          </p>
          <div className="flex items-center gap-8 sm:gap-12">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80"
            >
              Instagram
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80"
            >
              Facebook
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
