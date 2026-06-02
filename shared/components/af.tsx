"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { cn } from "@/shared/lib/utils";

if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
}

export type AnimatedMobileNavLink = {
  label: string;
  shape?: string;
  onClick?: () => void;
  href?: string;
};

type AnimatedMobileMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: AnimatedMobileNavLink[];
  footer?: React.ReactNode;
  className?: string;
};

export function AnimatedMobileMenu({
  open,
  onOpenChange,
  links,
  footer,
  className,
}: AnimatedMobileMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onOpenChange(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  // Shape hover animations only (no revert on menu open/close)
  useEffect(() => {
    if (!containerRef.current || !open) return;

    try {
      if (!gsap.parseEase("main")) {
        CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");
      }
    } catch {
      /* use defaults */
    }

    const root = containerRef.current;
    const menuItems = root.querySelectorAll(".menu-list-item[data-shape]");
    const shapesContainer = root.querySelector(".ambient-background-shapes");
    const cleanups: Array<() => void> = [];

    menuItems.forEach((item) => {
      const shapeIndex = item.getAttribute("data-shape");
      const shape = shapesContainer
        ? shapesContainer.querySelector(`.bg-shape-${shapeIndex}`)
        : null;
      if (!shape) return;

      const shapeEls = shape.querySelectorAll(".shape-element");

      const onEnter = () => {
        shapesContainer
          ?.querySelectorAll(".bg-shape")
          .forEach((s) => s.classList.remove("active"));
        shape.classList.add("active");
        gsap.fromTo(
          shapeEls,
          { scale: 0.5, opacity: 0, rotation: -10 },
          {
            scale: 1,
            opacity: 1,
            rotation: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: "back.out(1.7)",
            overwrite: "auto",
          },
        );
      };

      const onLeave = () => {
        gsap.to(shapeEls, {
          scale: 0.8,
          opacity: 0,
          duration: 0.3,
          ease: "power2.in",
          onComplete: () => shape.classList.remove("active"),
          overwrite: "auto",
        });
      };

      item.addEventListener("mouseenter", onEnter);
      item.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        item.removeEventListener("mouseenter", onEnter);
        item.removeEventListener("mouseleave", onLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [open, links]);

  // Stagger link entrance when menu opens
  useEffect(() => {
    if (!containerRef.current || !open) return;

    const menuLinks = containerRef.current.querySelectorAll(".nav-link");
    const fadeTargets = containerRef.current.querySelectorAll("[data-menu-fade]");

    gsap.fromTo(
      menuLinks,
      { y: 48, opacity: 0, rotate: 4 },
      {
        y: 0,
        opacity: 1,
        rotate: 0,
        duration: 0.55,
        stagger: 0.06,
        ease: "power3.out",
        delay: 0.2,
        clearProps: "transform",
      },
    );

    if (fadeTargets.length) {
      gsap.fromTo(
        fadeTargets,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.45,
          stagger: 0.05,
          ease: "power2.out",
          delay: 0.45,
          clearProps: "all",
        },
      );
    }
  }, [open, links]);

  const closeMenu = () => onOpenChange(false);

  const handleLinkClick = (link: AnimatedMobileNavLink) => {
    link.onClick?.();
    closeMenu();
  };

  if (!mounted) return null;

  const menu = (
    <div
      ref={containerRef}
      className={cn("animated-mobile-nav md:hidden", className)}
      aria-hidden={!open}
    >
      <div
        data-nav={open ? "open" : "closed"}
        className="nav-overlay-wrapper"
      >
        <button
          type="button"
          className="overlay"
          onClick={closeMenu}
          aria-label="Close menu"
          tabIndex={open ? 0 : -1}
        />
        <nav className="menu-content" aria-label="Mobile navigation">
          <div className="menu-bg">
            <div className="backdrop-layer first" />
            <div className="backdrop-layer second" />
            <div className="backdrop-layer" />

            <div className="ambient-background-shapes">
              <svg className="bg-shape bg-shape-1" viewBox="0 0 400 400" fill="none" aria-hidden>
                <circle className="shape-element" cx="80" cy="120" r="40" fill="rgba(213,247,12,0.12)" />
                <circle className="shape-element" cx="300" cy="80" r="60" fill="rgba(213,247,12,0.08)" />
                <circle className="shape-element" cx="200" cy="300" r="80" fill="rgba(255,90,60,0.08)" />
              </svg>
              <svg className="bg-shape bg-shape-2" viewBox="0 0 400 400" fill="none" aria-hidden>
                <path
                  className="shape-element"
                  d="M0 200 Q100 100, 200 200 T 400 200"
                  stroke="rgba(213,247,12,0.18)"
                  strokeWidth="60"
                  fill="none"
                />
              </svg>
              <svg className="bg-shape bg-shape-3" viewBox="0 0 400 400" fill="none" aria-hidden>
                <circle className="shape-element" cx="100" cy="150" r="12" fill="rgba(213,247,12,0.18)" />
                <circle className="shape-element" cx="200" cy="150" r="12" fill="rgba(255,140,66,0.15)" />
              </svg>
              <svg className="bg-shape bg-shape-4" viewBox="0 0 400 400" fill="none" aria-hidden>
                <path
                  className="shape-element"
                  d="M100 100 Q150 50, 200 100 Q250 150, 200 200 Q150 250, 100 200 Q50 150, 100 100"
                  fill="rgba(213,247,12,0.1)"
                />
              </svg>
              <svg className="bg-shape bg-shape-5" viewBox="0 0 400 400" fill="none" aria-hidden>
                <line className="shape-element" x1="0" y1="100" x2="300" y2="400" stroke="rgba(213,247,12,0.12)" strokeWidth="30" />
              </svg>
            </div>
          </div>

          <div className="menu-content-wrapper">
            <button
              type="button"
              className="nav-close-btn"
              onClick={closeMenu}
              aria-label="Close menu"
            >
              <span className="nav-close-label">Close</span>
              <div className="icon-wrap">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="menu-button-icon"
                  aria-hidden
                >
                  <path d="M7.33333 16L7.33333 0L8.66667 0L8.66667 16Z" fill="currentColor" />
                  <path d="M16 8.66667L0 8.66667L0 7.33333L16 7.33333L16 8.66667Z" fill="currentColor" />
                </svg>
              </div>
            </button>

            <ul className="menu-list">
              {links.map((link, index) => {
                const shape = link.shape ?? String((index % 5) + 1);
                const content = (
                  <>
                    <p className="nav-link-text">{link.label}</p>
                    <div className="nav-link-hover-bg" />
                  </>
                );

                return (
                  <li key={link.label} className="menu-list-item" data-shape={shape}>
                    {link.href ? (
                      <a
                        href={link.href}
                        className="nav-link"
                        onClick={() => handleLinkClick(link)}
                      >
                        {content}
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="nav-link"
                        onClick={() => handleLinkClick(link)}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {footer ? <div className="menu-footer">{footer}</div> : null}
          </div>
        </nav>
      </div>
    </div>
  );

  return createPortal(menu, document.body);
}

/** @deprecated Use AnimatedMobileMenu */
export const Component = AnimatedMobileMenu;
