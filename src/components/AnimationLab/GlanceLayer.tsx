"use client";

/* =========================================================
   ANIMATION LAB — section 5, "Haycarb at a Glance"
   =========================================================

   Markup ported from html-templates/final/06-glance.html (class
   root .s-glance2, replacing the old simpler .s-glance layout this
   file used to carry — see git history for that version). Kept the
   source's own documented inconsistency of setting the title in
   --font-ui rather than the project serif; reproduced as drawn, not
   "corrected" to match the other sections (see lab.css).

   No <img> background — the scrubbed <canvas> is the background
   here, same swap as every other section.

   Reveal: the section's own opacity/offset comes from
   useSectionLayer (standard pattern). Every internal block (title,
   quote, 4 stats+counters, note, video card, 4 pills) gets its own
   frame-driven stagger via staggerProgressAt, all windows kept
   strictly inside this section's own enter (240-270) / exit
   (273-292) frames — same lesson as the Governance bug: a child
   stagger that resolves before the parent is visible, or crosses
   the settle frame, reads as broken even though the math is right.
   GLANCE's own enter window was widened from a tight 2-frame slot to
   30 frames specifically to give this richer content room (see the
   comment on this section's entry in timeline.ts). Title is
   per-WORD split, not per-character (kerning). Counters are
   frame-driven (Math.floor(target * t)), not the source's
   requestAnimationFrame wall-clock version, same conversion as
   GovernanceLayer.tsx's stat cards. Exit mirrors the entrance in
   reverse, block by block (standing rule): pills (last in) exit
   first, title (first in) exits last.

   The ambient ring pulse behind the play button is the one thing
   NOT converted to frame-driven — it's a continuous decorative loop
   (2.8s infinite), not a scroll reveal, same precedent as every
   other section's purely-decorative always-on motion. Video dialog
   is ported the same way HeroLayer.tsx's own popup works: a
   dialogRef and showModal(), loading a YouTube embed
   (SUMMARY_VIDEO_SRC below) — same as HeroLayer's popup now does. */

import { useRef } from "react";
import { SECTIONS, staggerProgressAt, progressBetween, easeOut } from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const GLANCE = SECTIONS[5];
const EXIT_START = GLANCE.exit!.frames[0];
const POPUP_CLOSE_AFTER_FRAMES = 5;

const TITLE_TEXT = "Haycarb at a Glance";
const TITLE_TOKENS = TITLE_TEXT.split(/(\s+)/);
const TITLE_WORD_COUNT = TITLE_TOKENS.filter((token) => token.trim() !== "").length;

// All windows below stay strictly inside the section's own enter
// (261-270) / exit (273-292) frames — see the file header for why.
// The parent's own visibility only starts at 261 (matching the
// camera hold), so these overlap heavily rather than running in
// sequence — same technique as Governance's 5 stat cards packing
// into a tight parent window.
const TITLE_WINDOW: [number, number] = [263, 269];
const QUOTE_WINDOW: [number, number] = [265, 270];
const STATS_WINDOW: [number, number] = [266, 272];
const VIDEO_WINDOW: [number, number] = [266, 272];
const NOTE_WINDOW: [number, number] = [269, 273];
const PILLS_WINDOW: [number, number] = [270, 275];

const TITLE_EXIT_WINDOW: [number, number] = [296, 302];
const QUOTE_EXIT_WINDOW: [number, number] = [291, 297];
const STATS_EXIT_WINDOW: [number, number] = [283, 291];
const NOTE_EXIT_WINDOW: [number, number] = [281, 287];
const VIDEO_EXIT_WINDOW: [number, number] = [281, 289];
const PILLS_EXIT_WINDOW: [number, number] = [279, 285];

const STATS = [
  { target: 16, unit: "%", label: "Global Market Share" },
  { target: 50, unit: "+", label: "Years of Industry Experience" },
  { target: 1500, unit: "+", label: "Sustainable Solutions" },
  { target: 50, unit: "+", label: "Countries Served Worldwide" },
];

const PILLS = [
  { label: "Haycarb in Focus", icon: "Web Icons-09.svg", href: "/pdf/home/06-key-data-points/Haycarb%20in%20Focus.pdf" },
  { label: "Products", icon: "Web Icons-10.svg", href: "/pdf/home/06-key-data-points/Products.pdf" },
  { label: "Awards", icon: "Web Icons-11.svg", href: "/pdf/home/06-key-data-points/Awards.pdf" },
  { label: "Milestones", icon: "Web Icons-12.svg", href: "/pdf/home/06-key-data-points/Milestones%20-%2053%20Years%20of%20Resilience%2C%20Growth%20and%20Value%20Creation.pdf" },
];

function fadeRiseAt(
  frame: number,
  entering: boolean,
  enterWindow: [number, number],
  exitWindow: [number, number]
): number {
  return entering
    ? easeOut(progressBetween(frame, enterWindow[0], enterWindow[1]))
    : 1 - easeOut(progressBetween(frame, exitWindow[0], exitWindow[1]));
}

// "Annual report summary" video from the client's resource list (AR
// Crossword Puzzle PDF, Resources appendix). Loaded into the iframe
// only while the dialog is open; cleared on close so it stops playing.
const SUMMARY_VIDEO_SRC =
  "https://www.youtube.com/embed/-eC8tVsda08?autoplay=1&rel=0";

export default function GlanceLayer() {
  const ref = useSectionLayer(GLANCE);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoFrameRef = useRef<HTMLIFrameElement>(null);
  const currentFrameRef = useRef(GLANCE.settledFrame);
  const dialogOpenedAtFrameRef = useRef<number | null>(null);

  const titleWordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const statRefs = useRef<Array<HTMLLIElement | null>>([]);
  const statValueRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const noteRef = useRef<HTMLParagraphElement>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const pillRefs = useRef<Array<HTMLLIElement | null>>([]);

  useFrameEffect((frame) => {
    currentFrameRef.current = frame;
    const openedAt = dialogOpenedAtFrameRef.current;
    if (
      dialogRef.current?.open &&
      openedAt !== null &&
      Math.abs(frame - openedAt) >= POPUP_CLOSE_AFTER_FRAMES
    ) {
      dialogRef.current.close();
      dialogOpenedAtFrameRef.current = null;
    }

    const entering = frame < EXIT_START;

    for (let index = 0; index < TITLE_WORD_COUNT; index += 1) {
      const element = titleWordRefs.current[index];
      if (!element) continue;
      const t = entering
        ? staggerProgressAt(index, TITLE_WORD_COUNT, frame, TITLE_WINDOW)
        : 1 -
          staggerProgressAt(
            TITLE_WORD_COUNT - 1 - index,
            TITLE_WORD_COUNT,
            frame,
            TITLE_EXIT_WINDOW
          );
      element.style.opacity = String(t);
      element.style.transform = `translateY(${12 * (1 - t)}px)`;
    }

    if (quoteRef.current) {
      const t = fadeRiseAt(frame, entering, QUOTE_WINDOW, QUOTE_EXIT_WINDOW);
      quoteRef.current.style.opacity = String(t);
      quoteRef.current.style.transform = `translateY(${10 * (1 - t)}px)`;
    }

    for (let index = 0; index < STATS.length; index += 1) {
      const card = statRefs.current[index];
      const valueEl = statValueRefs.current[index];
      const t = entering
        ? staggerProgressAt(index, STATS.length, frame, STATS_WINDOW)
        : 1 - staggerProgressAt(STATS.length - 1 - index, STATS.length, frame, STATS_EXIT_WINDOW);
      if (card) {
        card.style.opacity = String(t);
        card.style.transform = `translateY(${18 * (1 - t)}px)`;
      }
      if (valueEl) {
        valueEl.textContent = String(Math.floor(STATS[index].target * Math.min(Math.max(t, 0), 1)));
      }
    }

    if (noteRef.current) {
      const t = fadeRiseAt(frame, entering, NOTE_WINDOW, NOTE_EXIT_WINDOW);
      noteRef.current.style.opacity = String(t);
      noteRef.current.style.transform = `translateY(${8 * (1 - t)}px)`;
    }

    if (videoRef.current) {
      const t = fadeRiseAt(frame, entering, VIDEO_WINDOW, VIDEO_EXIT_WINDOW);
      videoRef.current.style.opacity = String(t);
      videoRef.current.style.transform = `translateY(${20 * (1 - t)}px)`;
    }

    for (let index = 0; index < PILLS.length; index += 1) {
      const element = pillRefs.current[index];
      if (!element) continue;
      const t = entering
        ? staggerProgressAt(index, PILLS.length, frame, PILLS_WINDOW)
        : 1 - staggerProgressAt(PILLS.length - 1 - index, PILLS.length, frame, PILLS_EXIT_WINDOW);
      element.style.opacity = String(t);
      element.style.transform = `translateY(${14 * (1 - t)}px)`;
    }
  });

  let titleWordIndex = -1;

  return (
    <div
      className="lab-layer s-glance2"
      ref={ref}
      data-section={GLANCE.id}
      data-initial-hidden="true"
      aria-labelledby="glance2-title"
    >
      {/* data-lenis-prevent: this stage scrolls internally on mobile
          (overflow-y:auto in lab.css); without it Lenis eats the touch
          and scrubs the timeline instead of scrolling the content. */}
      <div className="s-glance2__stage" data-lenis-prevent>
        <h2 className="s-glance2__title" id="glance2-title">
          {TITLE_TOKENS.map((token, tokenIndex) => {
            if (token.trim() === "") {
              // eslint-disable-next-line react/no-array-index-key
              return <span key={tokenIndex}>{token}</span>;
            }
            titleWordIndex += 1;
            const index = titleWordIndex;
            return (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={tokenIndex}
                ref={(node) => {
                  titleWordRefs.current[index] = node;
                }}
                className="s-glance2__word"
              >
                {token}
              </span>
            );
          })}
        </h2>

        <blockquote className="s-glance2__quote" ref={quoteRef}>
          As a global activated carbon manufacturer, Haycarb is driven by technical
          excellence, customer centricity, innovation and sustainable business
          practices, looking beyond conventional boundaries to advance activated
          carbon solutions and create lasting value.
        </blockquote>

        <div className="s-glance2__body">
          <div className="s-glance2__left">
            <ul className="s-glance2__stats" aria-label="Haycarb highlights">
              {STATS.map((stat, index) => (
                <li
                  key={stat.label}
                  className="s-glance2__stat lab-shine"
                  ref={(node) => {
                    statRefs.current[index] = node;
                  }}
                >
                  <p className="s-glance2__stat-value">
                    <span
                      ref={(node) => {
                        statValueRefs.current[index] = node;
                      }}
                    >
                      0
                    </span>
                    <span className="s-glance2__stat-unit">{stat.unit}</span>
                  </p>
                  <p className="s-glance2__stat-label">{stat.label}</p>
                </li>
              ))}
            </ul>

            <p className="s-glance2__note" ref={noteRef}>
              Together, these strengths reflect the scale and capabilities behind
              our ability to serve diverse industries and evolving needs.
            </p>
          </div>

          <div
            className="s-glance2__video"
            ref={videoRef}
            tabIndex={0}
            role="button"
            aria-haspopup="dialog"
            aria-controls="glance-summary-dialog"
            aria-label="Play annual report summary video"
            onClick={() => {
              dialogOpenedAtFrameRef.current = currentFrameRef.current;
              if (videoFrameRef.current) videoFrameRef.current.src = SUMMARY_VIDEO_SRC;
              dialogRef.current?.showModal();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                dialogOpenedAtFrameRef.current = currentFrameRef.current;
                if (videoFrameRef.current) videoFrameRef.current.src = SUMMARY_VIDEO_SRC;
                dialogRef.current?.showModal();
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/glance/report-mockup.webp"
              alt="Beyond the Beyond annual report book preview on a desert horizon"
              decoding="async"
            />
            <span className="s-glance2__play" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m8 5 11 7-11 7V5Z" />
              </svg>
            </span>
            <div className="s-glance2__video-copy">
              <p className="s-glance2__video-eyebrow">Annual Report Summary</p>
              <p className="s-glance2__video-title">Impact in Brief</p>
            </div>
          </div>
        </div>

        <dialog
          ref={dialogRef}
          className="s-glance2__video-dialog"
          id="glance-summary-dialog"
          aria-label="Annual Report Summary video"
          onClick={(event) => {
            if (event.target === dialogRef.current) dialogRef.current?.close();
          }}
          onClose={() => {
            dialogOpenedAtFrameRef.current = null;
            if (videoFrameRef.current) videoFrameRef.current.src = "";
          }}
        >
          <iframe
            ref={videoFrameRef}
            title="Annual Report Summary video"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
          <form method="dialog">
            <button
              className="s-glance2__video-dialog-close"
              type="submit"
              aria-label="Close video"
            >
              ×
            </button>
          </form>
        </dialog>

        <ul className="s-glance2__pills" aria-label="Haycarb at a Glance links">
          {PILLS.map((pill, index) => (
            <li
              key={pill.label}
              ref={(node) => {
                pillRefs.current[index] = node;
              }}
            >
              <a
                className="btn btn--watch s-glance2__pill"
                href={pill.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={pill.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/glance/web-icons/${encodeURIComponent(pill.icon)}`} alt="" aria-hidden="true" />
                {pill.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
