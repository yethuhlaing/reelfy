'use client'

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useLenis } from "lenis/react";
import { cn } from "@/shared/lib/utils";
import { scrollToSection } from "@/shared/lib/scroll-to-section";
import { AnimatedMobileMenu } from "@/shared/components/animated-mobile-navbar";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { defaultLocale, isLocale } from "@/i18n/config";
import { withLocale } from "@/i18n/locale-path";
import { useLocale } from "@/shared/providers/locale-provider";

const SCROLL_OFFSET = -96;

export default function Navbar() {
  const params = useParams();
  const { t } = useLocale();
  const paramLocale = typeof params?.locale === "string" ? params.locale : defaultLocale;
  const locale = isLocale(paramLocale) ? paramLocale : defaultLocale;
  const navLinks = useMemo(
    () =>
      [
        { label: t("nav.explore"), href: "#explore-cards-section" },
        { label: t("nav.showcase"), href: "#video-bento-grid" },
        { label: t("nav.howItWorks"), href: "#video-section" },
        { label: t("nav.pricing"), href: "#pricing-section" },
      ] as const,
    [t],
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(navLinks[0].label);
  const lenis = useLenis();

  const handleScrollToSection = useCallback(
    (href: string, label: string, closeMenu = false) => {
      setActiveTab(label);

      if (closeMenu) {
        setMobileMenuOpen(false);
      }

      const runScroll = () => {
        scrollToSection(href, lenis, SCROLL_OFFSET);
      };

      if (closeMenu) {
        // Let the mobile menu restore body scroll before Lenis animates.
        requestAnimationFrame(() => {
          requestAnimationFrame(runScroll);
        });
        return;
      }

      runScroll();
    },
    [lenis],
  );

  const desktopLinkClass = (isActive: boolean) =>
    cn(
      "rounded-full px-4 py-2 text-xs font-semibold transition-all duration-300",
      isActive
        ? "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
        : "text-white/70 hover:bg-white/10 hover:text-white",
    );

  return (
    <nav className="absolute top-0 left-0 z-50 w-full px-8 py-6 md:px-16 lg:px-20" id="reelify-nav">
      <div className="flex w-full items-center justify-between">
        <Link
          href={withLocale("/", locale)}
          className="cursor-pointer select-none transition-opacity hover:opacity-80"
        >
          <img
            src="/logos/logo.png"
            alt="Reelify"
            className="h-6 w-auto md:h-8"
          />
        </Link>

        {/* Desktop — glass pill nav (matches hero cards) */}
        <div className="hidden md:flex items-center rounded-full border border-white/15 bg-black/25 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          {navLinks.map(({ label, href }) => {
            const isActive = activeTab === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleScrollToSection(href, label)}
                className={desktopLinkClass(isActive)}
                id={`nav-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <LocaleSwitcher />
          <Link
            href={withLocale("/waitlist", locale)}
            className="inline-block rounded-full bg-black px-6 py-3 text-sm font-extrabold tracking-wide text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            {t("nav.joinWaitlist")}
          </Link>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => handleScrollToSection(navLinks[0].href, navLinks[0].label)}
            className="rounded-full border border-white/20 bg-black/30 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white backdrop-blur-md"
          >
            {t("nav.explore")}
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-full border border-white/15 bg-black/25 p-2 text-white/90 backdrop-blur-md transition-colors hover:bg-white/10"
            id="mobile-menu-toggle"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <AnimatedMobileMenu
        open={mobileMenuOpen}
        onOpenChange={setMobileMenuOpen}
        links={navLinks.map(({ label, href }, index) => ({
          label,
          shape: String((index % 5) + 1),
          onClick: () => handleScrollToSection(href, label, true),
        }))}
        footer={
          <div className="space-y-3">
            <LocaleSwitcher className="w-full justify-center" />
            <Link
              href={withLocale("/waitlist", locale)}
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full rounded-full bg-black py-3.5 text-center text-sm font-extrabold tracking-wide text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
            >
              {t("nav.joinWaitlist")}
            </Link>
          </div>
        }
      />
    </nav>
  );
}
