"use client";

/* =========================================================
   ANIMATION LAB — the menu
   =========================================================

   The hamburger button and full-screen overlay are ported from
   horizon/src/components/GlobalHeader.tsx — same animation, same
   glass overlay, same Tailwind classes. Works unmodified here because
   horizon-home's own tokens (src/styles/tokens/colors.css) already
   define --color-glass-strong and --color-heading-start identically
   to horizon's, being the same design system.

   The links themselves are horizon's own, verbatim — not a custom
   list of this page's sections. This is the same menu the horizon
   project shows, not a separate one, so it points at that app's
   deployed Horizon app rather than data-scroll-to
   buttons into this page.

   Gated on frame, not on phase: stays fully hidden until frame >=
   LOGO_EXIT_FRAMES[1] (70) — the exact frame HeroLogo.tsx finishes
   fading out with the rest of the hero — so the hamburger visibly
   arrives right as the logo leaves, never competing with the hero's
   own reveal or sitting there unexplained during the entry.
   Frame-driven rather than phase-driven also means it is naturally
   correct if the user scrolls back above frame 70 (it hides again) or
   the loop wraps (scrollY resets to frame 50, well below the
   threshold). */

import { useEffect, useState } from "react";
import { LOGO_EXIT_FRAMES } from "./timeline";
import { useFrameEffect } from "./useFrameTimeline";

const MENU_REVEAL_FRAME = LOGO_EXIT_FRAMES[1];

const HORIZON_ORIGIN = "https://horizon-ten-pi.vercel.app";

/* horizon/src/components/GlobalHeader.tsx's own menuLinks, unchanged. */
const menuLinks = [
  { name: "Home", href: `${HORIZON_ORIGIN}/` },
  { name: "AI Assistant", href: `${HORIZON_ORIGIN}/chat` },
  { name: "Crossword Puzzle", href: `${HORIZON_ORIGIN}/puzzle` },
  { name: "Tailor made for you", href: `${HORIZON_ORIGIN}/tailor-made-for-you` },
  { name: "User Profiles", href: `${HORIZON_ORIGIN}/user-profile` },
];

export default function LabMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useFrameEffect((frame) => {
    const due = frame >= MENU_REVEAL_FRAME;
    setRevealed((prev) => (prev === due ? prev : due));
  });

  // Closes the overlay if it were somehow open while not revealed —
  // e.g. the user scrolled back above frame 80 with the menu open.
  useEffect(() => {
    if (!revealed) setIsOpen(false);
  }, [revealed]);

  useEffect(() => {
    document.documentElement.classList.toggle("lab-menu-open", isOpen);
    return () => document.documentElement.classList.remove("lab-menu-open");
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleLinkClick = () => setIsOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        data-revealed={revealed}
        className="lab-menu__hamburger fixed top-6 left-6 z-[9999] bg-transparent hover:bg-white/10 rounded-full p-3 transition-colors duration-300"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-expanded={isOpen}
      >
        <span className="flex flex-col justify-center items-center w-7 h-7 gap-1.5">
          <span
            className={`block w-7 h-0.5 bg-white rounded-full transition-all duration-500 ease-in-out ${
              isOpen ? "rotate-45 translate-y-[4px]" : ""
            }`}
          />
          <span
            className={`block w-7 h-0.5 bg-white rounded-full transition-all duration-500 ease-in-out ${
              isOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-7 h-0.5 bg-white rounded-full transition-all duration-500 ease-in-out ${
              isOpen ? "-rotate-45 -translate-y-[4px]" : ""
            }`}
          />
        </span>
      </button>

      <nav
        className={`fixed inset-0 z-[9998] bg-glass-strong backdrop-blur-3xl transition-transform duration-700 ease-in-out ${
          isOpen ? "translate-y-0 translate-x-0" : "-translate-y-full -translate-x-full"
        } ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div className="flex flex-col justify-center h-full pl-12 sm:pl-20 overflow-y-auto">
          {menuLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={handleLinkClick}
              className="group py-2 font-sans text-white text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight hover:text-[var(--color-heading-start)] transition-colors duration-300"
            >
              {link.name}
            </a>
          ))}
        </div>
      </nav>
    </>
  );
}
