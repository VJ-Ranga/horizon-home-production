"use client";

/* =========================================================
   ANIMATION LAB — section 2, "Our Approach to Reporting"
   =========================================================

   Markup ported from html-templates/final/03-approach-c2.html
   (variant C2: centred composition, Horizon-teal glass cards),
   replacing the earlier 02-approach.html port wholesale. Class names
   are kept byte-identical (s-approach2__*) so the two can be diffed
   against each other, and the CSS in lab.css is that file's CSS
   copied across.

   Differences from the template, all structural, none visual:

   1. No .s-approach2__media / background <img>. The template's own
      background is the scrubbed <canvas> here, same swap as every
      other section — see LabScrubber.
   2. No <section> wrapper, position/min-height/overflow or its own
      teal background — .lab-layer already provides inset:0 inside
      the shared fixed viewport and the teal ground sits on .lab
      itself. Section-root rules stay in the template only.

   Card copy is unchanged from the previous 02-approach.html port —
   same five items, same order, same icons — this is a visual/layout
   replacement, not a content one.

   Reveal: frame-driven (VJ, 2026-08-23 — "all animation... need to
   work with scrolling"), same staggerProgressAt helper as
   MainStartLayer.tsx/DigitalLayer.tsx, not a fixed-duration CSS
   animation. Title splits PER WORD, not per character (same day,
   separate fix — per-character spans broke the font's kerning between
   adjacent letters, which read as broken letter-spacing; words keep
   their internal kerning intact). Title's words get their own
   CHAR_WINDOW; kicker, lead, all five cards and the CTA row share
   GROUP_WINDOW as an 8-item stagger — each item's opacity/translateY
   written per frame, so the reveal tracks scroll position exactly
   (scrub back and it un-reveals, fast-scroll and it visibly races to
   keep up). Both windows are wider than the section's own `enter`
   (109-118) specifically to give this many items room — widen further
   if it still feels rushed, rather than reaching for a CSS animation.
   This is layered ON TOP of the section's own enter fade from
   useSectionLayer, not a replacement for it. */

import { useEffect, useRef } from "react";
import {
  SECTIONS,
  readPxPerFrame,
  sectionTimingForMode,
  staggerProgressAt,
  virtualExitProgressAtScrollPx,
} from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const APPROACH = SECTIONS[2];
const TITLE_TEXT = "Our Approach to Reporting";
// Splits on whitespace runs, KEEPING them as their own tokens (the
// capturing group) so spacing between words renders as plain text,
// not a wrapped span — see MainStartLayer.tsx for the same pattern.
const TITLE_TOKENS = TITLE_TEXT.split(/(\s+)/);
const TITLE_WORD_COUNT = TITLE_TOKENS.filter((token) => token.trim() !== "").length;
const TITLE_WORD_INDEX_BY_TOKEN = TITLE_TOKENS.map((token, tokenIndex) =>
  token.trim() === ""
    ? -1
    : TITLE_TOKENS.slice(0, tokenIndex).filter((item) => item.trim() !== "").length
);
const CHAR_WINDOW: [number, number] = [114, 134];
// 0 kicker, 1 lead, 2-6 the five cards (left-to-right, row 1 then row
// 2), 7 the CTA row.
const GROUP_WINDOW: [number, number] = [114, 134];
const GROUP_COUNT = 8;

// Popup follows the same dialogRef/showModal pattern as HeroLayer.tsx
// and GlanceLayer.tsx's own video dialogs. "Watch the Highlights"
// video from VJ, 2026-09-01. Loaded into the iframe only while the
// dialog is open, cleared on close so it stops playing.
const POPUP_CLOSE_AFTER_FRAMES = 5;
const HIGHLIGHTS_VIDEO_SRC =
  "https://www.youtube.com/embed/m4GztUvo9J0?autoplay=1&rel=0";

export default function ApproachLayer() {
  const ref = useSectionLayer(APPROACH);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const groupRefs = useRef<Array<HTMLElement | null>>([]);
  const reducedMotionRef = useRef(false);
  // Phones: no title/group stagger — force everything solid, once.
  const mobileSolidRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoFrameRef = useRef<HTMLIFrameElement>(null);
  const currentFrameRef = useRef(APPROACH.settledFrame);
  const dialogOpenedAtFrameRef = useRef<number | null>(null);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    mobileSolidRef.current = window.matchMedia("(max-width: 700px)").matches;
  }, []);

  useFrameEffect((frame, _phase, scrollPx, mode) => {
    const timedApproach = sectionTimingForMode(APPROACH, mode);
    const exitWindow = timedApproach.exit?.frames ?? [timedApproach.settledFrame, timedApproach.settledFrame];
    const virtualExitWindow: [number, number] = [0, timedApproach.virtualExitFrames ?? 0];
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

    if (mobileSolidRef.current) {
      for (let index = 0; index < TITLE_WORD_COUNT; index += 1) {
        const element = wordRefs.current[index];
        if (element) {
          element.style.opacity = "1";
          element.style.transform = "none";
        }
      }
      for (let index = 0; index < GROUP_COUNT; index += 1) {
        const element = groupRefs.current[index];
        if (element) {
          element.style.opacity = "1";
          element.style.transform = "none";
        }
      }
      return;
    }

    if (reducedMotionRef.current) return;

    const virtualExit = virtualExitProgressAtScrollPx(
      timedApproach,
      scrollPx,
      readPxPerFrame(),
      mode,
    );
    const entering = virtualExit === null && frame < exitWindow[0];
    const sharedExitProgress = virtualExit !== null
      ? 1 - staggerProgressAt(
          0,
          1,
           virtualExit * virtualExitWindow[1],
           virtualExitWindow,
         )
      : 1 - staggerProgressAt(0, 1, frame, exitWindow);
    for (let index = 0; index < TITLE_WORD_COUNT; index += 1) {
      const element = wordRefs.current[index];
      if (!element) continue;
       const t = entering
         ? staggerProgressAt(index, TITLE_WORD_COUNT, frame, CHAR_WINDOW)
         : mode === "desktop" && virtualExit !== null
         ? 1 - staggerProgressAt(TITLE_WORD_COUNT - 1 - index, TITLE_WORD_COUNT, virtualExit * virtualExitWindow[1], virtualExitWindow)
         : sharedExitProgress;
      element.style.opacity = String(t);
      element.style.transform = `translateY(${12 * (1 - t)}px)`;
    }

    for (let index = 0; index < GROUP_COUNT; index += 1) {
      const element = groupRefs.current[index];
      if (!element) continue;
       const t = entering
         ? staggerProgressAt(index, GROUP_COUNT, frame, GROUP_WINDOW)
         : mode === "desktop" && virtualExit !== null
         ? 1 - staggerProgressAt(GROUP_COUNT - 1 - index, GROUP_COUNT, virtualExit * virtualExitWindow[1], virtualExitWindow)
         : sharedExitProgress;
      element.style.opacity = String(t);
      element.style.transform = `translateY(${18 * (1 - t)}px)`;
    }
  });

  /* data-initial-hidden: this layer's markup is in the SSR output and
     useSectionLayer cannot run until after the first paint, so without
     it the section flashes on load. Every section layer that is NOT on
     screen at the opening frame needs the marker; the hero does not,
     because it is present from frame 1. See lab.css. */
  return (
    <div
      className="lab-layer s-approach2"
      ref={ref}
      data-section={APPROACH.id}
      data-initial-hidden="true"
      aria-labelledby="approach2-title"
    >
      <div className="s-approach2__stage" data-lenis-prevent>
        <div className="s-approach2__col">
          <h2 className="s-approach2__title" id="approach2-title">
            {TITLE_TOKENS.map((token, tokenIndex) => {
              if (token.trim() === "") {
                // eslint-disable-next-line react/no-array-index-key
                return <span key={tokenIndex}>{token}</span>;
              }
              const index = TITLE_WORD_INDEX_BY_TOKEN[tokenIndex];
              return (
                <span
                  // eslint-disable-next-line react/no-array-index-key
                  key={tokenIndex}
                  ref={(node) => {
                    wordRefs.current[index] = node;
                  }}
                  className="s-approach2__word"
                >
                  {token}
                </span>
              );
            })}
          </h2>
          <p
            className="s-approach2__kicker"
            ref={(node) => {
              groupRefs.current[0] = node;
            }}
          >
            Key Features of This Year&rsquo;s Annual Report
          </p>
          <p
            className="s-approach2__lead"
            ref={(node) => {
              groupRefs.current[1] = node;
            }}
          >
            Evolving our reporting to deliver greater transparency, clarity
            and accessibility for our stakeholders.
          </p>

          {/* Cards 1-2 are the reporting standards adopted this year;
              cards 3-5 are how the report itself is presented. The two
              <ul>s carry that division for assistive tech via
              visually-hidden headings; visually this reads as one
              continuous 2-then-3 block, as the artboard draws it. */}
          <div className="s-approach2__groups">
            <section className="s-approach2__group">
              <h3 className="visually-hidden">What we report</h3>
              <ul className="s-approach2__grid s-approach2__grid--pair">
                <li>
                  <button
                    type="button"
                    className="s-approach2__card"
                    aria-describedby="approach2-card1-body"
                    ref={(node) => {
                      groupRefs.current[2] = node;
                    }}
                  >
                    <span className="s-approach2__card-inner">
                      <span className="s-approach2__face s-approach2__face--front">
                        <span className="s-approach2__badge" aria-hidden="true">
                          <img src="/approach/sustainability-reporting-enhancements.webp" alt="" />
                        </span>
                        <h3 className="s-approach2__card-label">
                          Sustainability Reporting Enhancements
                        </h3>
                      </span>
                      <span className="s-approach2__face s-approach2__face--back">
                        <p className="s-approach2__card-body" id="approach2-card1-body">
                          Early adoption of GRI 102 &amp; 103 (Energy &amp; Emissions
                          Standards) and expanded disclosures on SLFRS S1 &amp; S2 with
                          independent assurance
                        </p>
                      </span>
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="s-approach2__card"
                    aria-describedby="approach2-card2-body"
                    ref={(node) => {
                      groupRefs.current[3] = node;
                    }}
                  >
                    <span className="s-approach2__card-inner">
                      <span className="s-approach2__face s-approach2__face--front">
                        <span className="s-approach2__badge" aria-hidden="true">
                          <img src="/approach/financial-reporting-improvements.webp" alt="" />
                        </span>
                        <h3 className="s-approach2__card-label">
                          Financial Reporting Improvements
                        </h3>
                      </span>
                      <span className="s-approach2__face s-approach2__face--back">
                        <p className="s-approach2__card-body" id="approach2-card2-body">
                          Early adoption of SLFRS 18 with improved presentation and
                          expanded disclosures
                        </p>
                      </span>
                    </span>
                  </button>
                </li>
              </ul>
            </section>

            <section className="s-approach2__group">
              <h3 className="visually-hidden">How we present it</h3>
              <ul className="s-approach2__grid s-approach2__grid--trio">
                <li>
                  <button
                    type="button"
                    className="s-approach2__card"
                    aria-describedby="approach2-card3-body"
                    ref={(node) => {
                      groupRefs.current[4] = node;
                    }}
                  >
                    <span className="s-approach2__card-inner">
                      <span className="s-approach2__face s-approach2__face--front">
                        <span className="s-approach2__badge" aria-hidden="true">
                          <img src="/approach/corporate-governance-presentation.webp" alt="" />
                        </span>
                        <h3 className="s-approach2__card-label">
                          Corporate Governance Presentation
                        </h3>
                      </span>
                      <span className="s-approach2__face s-approach2__face--back">
                        <p className="s-approach2__card-body" id="approach2-card3-body">
                          More visual, streamlined corporate governance reporting
                        </p>
                      </span>
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="s-approach2__card"
                    aria-describedby="approach2-card4-body"
                    ref={(node) => {
                      groupRefs.current[5] = node;
                    }}
                  >
                    <span className="s-approach2__card-inner">
                      <span className="s-approach2__face s-approach2__face--front">
                        <span className="s-approach2__badge" aria-hidden="true">
                          <img src="/approach/accessibility-advancements.webp" alt="" />
                        </span>
                        <h3 className="s-approach2__card-label">
                          Accessibility Advancements
                        </h3>
                      </span>
                      <span className="s-approach2__face s-approach2__face--back">
                        <p className="s-approach2__card-body" id="approach2-card4-body">
                          Braille reporting and sign language, integrated video content
                        </p>
                      </span>
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="s-approach2__card"
                    aria-describedby="approach2-card5-body"
                    ref={(node) => {
                      groupRefs.current[6] = node;
                    }}
                  >
                    <span className="s-approach2__card-inner">
                      <span className="s-approach2__face s-approach2__face--front">
                        <span className="s-approach2__badge" aria-hidden="true">
                          <img src="/approach/report-structure.webp" alt="" />
                        </span>
                        <h3 className="s-approach2__card-label">Concise Report Structure</h3>
                      </span>
                      <span className="s-approach2__face s-approach2__face--back">
                        <p className="s-approach2__card-body" id="approach2-card5-body">
                          Commitment to concise reporting despite the inclusion of
                          additional disclosures, while maintaining a consistent
                          Annual Report structure year on year
                        </p>
                      </span>
                    </span>
                  </button>
                </li>
              </ul>
            </section>
          </div>

          <div
            className="s-approach2__cta-row"
            ref={(node) => {
              groupRefs.current[7] = node;
            }}
          >
            {/* Spec (AR Crossword Puzzle PDF p.2): this section's two
                buttons are "Explore More" and "Watch Key Highlights"
                — not the hero's "Download Annual Report". */}
            <a
              className="btn s-approach2__cta"
              href="/pdf/home/03-approach/Our%20Approach%20to%20Reporting.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Explore More</span>
            </a>
            <button
              type="button"
              className="btn btn--watch s-approach2__cta"
              aria-haspopup="dialog"
              aria-controls="approach-highlights-dialog"
              aria-label="Watch Key Highlights"
              onClick={() => {
                dialogOpenedAtFrameRef.current = currentFrameRef.current;
                if (videoFrameRef.current) videoFrameRef.current.src = HIGHLIGHTS_VIDEO_SRC;
                dialogRef.current?.showModal();
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="m8 5 11 7-11 7V5Z" />
              </svg>
              <span>Watch Key Highlights</span>
            </button>
          </div>

          {/* Popup, same dialogRef/showModal pattern as HeroLayer.tsx
              and GlanceLayer.tsx's own video dialogs. */}
          <dialog
            ref={dialogRef}
            className="s-approach2__video-dialog"
            id="approach-highlights-dialog"
            aria-label="Watch Key Highlights video"
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
              className="s-approach2__video-embed"
              title="Watch Key Highlights video"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
            <form method="dialog">
              <button
                className="s-approach2__video-dialog-close"
                type="submit"
                aria-label="Close video"
              >
                ×
              </button>
            </form>
          </dialog>
        </div>
      </div>

      <span className="s-approach2__scrollbar" aria-hidden="true" />
    </div>
  );
}
