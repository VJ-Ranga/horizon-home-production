"use client";

/* =========================================================
   ANIMATION LAB — bridge, "A Journey of Possibilities"

   Markup ported from html-templates/01-main-02.html. No <img>
   background — the template's .s-main-start__media is the scrubbed
   canvas here, same swap as every other layer. No <section>/100svh
   sizing — this is a .lab-layer stacked in the shared fixed viewport.

   Timing follows the expanded timeline entry for this section.
   FRAME-MAP'd — see the comment on this section in timeline.ts.

   Reveal ported from html-templates/final/assets/motion.js +
   tokens.css (.horizon-motion-heading/-char) — that version splits
   PER CHARACTER and lets a fixed-duration CSS animation play out on
   its own clock. Two changes made here:

   1. Frame-driven, not time-driven (VJ, 2026-08-23 — "all animation...
      need to work with scrolling"): each word's opacity is written
      per frame from staggerProgressAt (timeline.ts), tied directly to
      scroll position.
   2. Split PER WORD, not per character (VJ, same day — the
      per-character version broke the font's own kerning, since
      wrapping every letter in its own inline-block box stops the
      browser shaping adjacent letter pairs together; it reads as
      "letter spacing" being wrong even though letter-spacing itself
      is untouched). Words keep their internal kerning intact; only
      the gaps between words carry the reveal now. Whitespace between
      words is rendered as plain text, not wrapped, so native spacing
      is untouched too.

   REVEAL_WINDOW follows the section's expanded `enter` (70-90) and
   give the words room to stagger through legibly — widen further if
   the reveal still feels rushed, rather than reaching for a
   fixed-duration animation again. */

import { useEffect, useRef } from "react";
import { SECTIONS, staggerProgressAt } from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const MAIN_START = SECTIONS[1];
const TITLE_TEXT = "A Journey of Possibilities - Shaping Tomorrow, Today";
// Splits on runs of whitespace, KEEPING them as their own tokens so
// spaces remain plain text and the original word-by-word animation is
// preserved without changing the paragraph's layout.
const TOKENS = TITLE_TEXT.split(/(\s+)/);
const WORD_COUNT = TOKENS.filter((token) => token.trim() !== "").length;
const REVEAL_WINDOW: [number, number] = [70, 90];
const EXIT_WINDOW = MAIN_START.exit!.frames;

export default function MainStartLayer() {
  const ref = useSectionLayer(MAIN_START);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  useFrameEffect((frame) => {
    // Reduced motion: leave the CSS fallback (opacity:1, no transform)
    // alone rather than writing inline styles over it every tick.
    if (reducedMotionRef.current) return;

    const entering = frame < EXIT_WINDOW[0];
    for (let index = 0; index < WORD_COUNT; index += 1) {
      const element = wordRefs.current[index];
      if (!element) continue;
      const t = entering
        ? staggerProgressAt(index, WORD_COUNT, frame, REVEAL_WINDOW)
        : 1 - staggerProgressAt(WORD_COUNT - 1 - index, WORD_COUNT, frame, EXIT_WINDOW);
      element.style.opacity = String(t);
      element.style.transform = `translateY(${12 * (1 - t)}px)`;
    }
  });

  let wordIndex = -1;

  return (
    <div
      className="lab-layer s-main-start"
      ref={ref}
      data-section={MAIN_START.id}
      data-initial-hidden="true"
      aria-hidden="true"
    >
      <div className="s-main-start__stage">
        <p className="s-main-start__title--lower">
          {TOKENS.map((token, tokenIndex) => {
            if (token.trim() === "") {
              // eslint-disable-next-line react/no-array-index-key
              return <span key={tokenIndex}>{token}</span>;
            }
            wordIndex += 1;
            const index = wordIndex;
            return (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={tokenIndex}
                ref={(node) => {
                  wordRefs.current[index] = node;
                }}
                className="s-main-start__word"
              >
                {token}
              </span>
            );
          })}
        </p>
      </div>
    </div>
  );
}
