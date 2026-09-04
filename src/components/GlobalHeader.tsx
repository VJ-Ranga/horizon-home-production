"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HORIZON_ROUTES, horizonUrl } from "@/lib/horizon";

// This app owns the domain root; Horizon is a separate deployment on its own
// host, so every link out to it is absolute. "Home" stays relative: it is here.
const menuLinks = [
  { name: "Home", path: "/" },
  { name: "AI Guided Exploration", path: horizonUrl(HORIZON_ROUTES.aiAssistant) },
  { name: "User Profiles", path: horizonUrl(HORIZON_ROUTES.userProfiles) },
  { name: "Gamified Exploration", path: horizonUrl(HORIZON_ROUTES.crosswordPuzzle) },
  { name: "Sustainability Dashboard", path: horizonUrl(HORIZON_ROUTES.dashboard) },
  { name: "Interactive Charts & Reports", path: horizonUrl(HORIZON_ROUTES.tailorMade) },
];

const darkPages = ['/ai-assistant', '/user-profiles'];
const whiteBarPages = ['/sustainability-dashboard', '/tailor-made-for-you', '/crossword-puzzle', '/leaderboard'];
const fixedPages = ['/user-profiles'];

export default function GlobalHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isLightBg = !darkPages.some((p) => pathname.startsWith(p));
  const useWhiteBars = whiteBarPages.some((p) => pathname === p);
  const useFixed = fixedPages.some((p) => pathname.startsWith(p));
  const barColor = useWhiteBars ? 'bg-white' : isLightBg ? 'bg-[#147385]' : 'bg-white';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Phones only (styled in globals.css): a frosted bar behind the
          fixed hamburger + music toggle so scrolling content doesn't
          collide with the bare icons. Decorative, pointer-events none. */}
      <div className="mobile-topbar-scrim" aria-hidden="true" />

      <button
        type="button"
        data-global-nav
        onClick={() => setIsOpen(!isOpen)}
        className={`${useFixed ? 'fixed' : 'absolute'} top-0 left-0 z-[9999] bg-transparent p-4 transition-colors duration-300`}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        <span className="flex flex-col justify-center items-center w-7 h-7 gap-1.5">
          <span
            className={`block w-7 h-0.5 ${isOpen ? 'bg-white' : barColor} rounded-full transition-all duration-500 ease-in-out ${
              isOpen ? "rotate-45 translate-y-[4px]" : ""
            }`}
          />
          <span
            className={`block w-7 h-0.5 ${isOpen ? 'bg-white' : barColor} rounded-full transition-all duration-500 ease-in-out ${
              isOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block w-7 h-0.5 ${isOpen ? 'bg-white' : barColor} rounded-full transition-all duration-500 ease-in-out ${
              isOpen ? "-rotate-45 -translate-y-[4px]" : ""
            }`}
          />
        </span>
      </button>

      <nav
        data-global-nav
        className={`!fixed !inset-0 !w-screen !h-screen !z-[999] overflow-hidden transition-transform duration-700 ease-in-out ${
          isOpen
            ? "translate-y-0 md:translate-y-0 translate-x-0"
            : "-translate-y-full md:-translate-y-full -translate-x-full"
        } ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        {/* Background Image */}
        <div
          className="!absolute !inset-0 !w-full !h-full !z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ backgroundImage: "url('/images/mega-menu-bgjpeg.jpeg')" }}
        />

        {/* Scrollable Content */}
        <div className="relative z-10 w-full h-full overflow-y-auto flex flex-col justify-start">
          {/* HEADER: Close (Left) + Logo (Right) */}
          <div className="sticky top-0 w-full flex justify-between items-start px-4 py-4 md:px-8 md:py-8 z-20">
            {/* Close button area - spacer for hamburger */}
            <div className="w-7 h-7" />

            {/* Logo (Right) */}
            <img
              src="/images/logo.png"
              alt="Haycarb"
              className="!h-16 sm:!h-20 md:!h-24 lg:!h-32 xl:!h-40 max-md:!h-20 w-auto object-contain mt-4 mr-4 md:mt-6 md:mr-8 lg:mt-8 lg:mr-10"
            />
          </div>

          <div className="!absolute !top-[120px] md:!top-[160px] !left-0 !w-full !px-6 md:!pr-12 md:!pl-[96px] !flex !flex-col !gap-6 md:!gap-8 !z-[60] !pointer-events-auto">
            {menuLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={handleLinkClick}
                className="group !relative !z-[70] !cursor-pointer !font-sans text-white !text-xl max-md:!text-2xl md:!text-2xl lg:!text-3xl !font-medium tracking-tight hover:text-[var(--color-heading-start)] transition-colors duration-300 flex items-center justify-start gap-2 max-md:w-full"
              >
                {link.name}
                {pathname === link.path && (
                  <span className="flex-shrink-0 ml-2 inline-flex items-center">
                    <svg
                      className="!w-4 !h-4 md:!w-5 md:!h-5 text-[var(--color-heading-start)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2.5"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Credit, pinned to the bottom-right of the panel, on the logo's
              right inset so it sits under the logo rather than the links.
              Watermark weight: a flat 12px at 30% white, two lines, no size
              step at md. pointer-events-auto because the nav itself only
              enables them while open. */}
          <p className="!absolute !bottom-0 !right-0 !w-full !px-6 !pb-6 md:!pr-12 md:!pl-12 md:!pb-8 !z-[60] !pointer-events-auto !text-center md:!text-right !font-sans !text-[12px] !leading-relaxed text-white/50">
            <span className="block">© 2026. Haycarb PLC, All Rights Reserved.</span>
            <span className="block">
              Concept &amp; Design by{" "}
              <a
                href="https://luxeeye.au/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-white/60 transition-colors duration-300"
              >
                Luxe Eye.
              </a>
            </span>
          </p>
        </div>
      </nav>
    </>
  );
}
