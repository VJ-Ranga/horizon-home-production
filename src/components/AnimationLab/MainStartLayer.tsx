"use client";

/* =========================================================
   Bridge — "A Journey of Possibilities"
   =========================================================

   No <img> background: the scrubbed canvas is the background. No
   <section>/100svh sizing: this is a .lab-layer stacked in the shared
   fixed viewport.

   Reveal is frame-driven, not time-driven: each word's opacity is
   written per frame from staggerProgressAt (timeline.ts), so it tracks
   scroll position.

   The text splits per word, not per character: wrapping every letter
   in its own inline-block breaks the font's kerning. Whitespace between
   words is plain text, so native spacing is untouched.

   REVEAL_WINDOW follows the section's `enter` window. Widen it if the
   reveal feels rushed. */

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
const WORD_INDEX_BY_TOKEN = TOKENS.map((token, tokenIndex) =>
  token.trim() === ""
    ? -1
    : TOKENS.slice(0, tokenIndex).filter((item) => item.trim() !== "").length
);
const REVEAL_WINDOW: [number, number] = [70, 90];
const EXIT_WINDOW = MAIN_START.exit!.frames;

export default function MainStartLayer() {
  const ref = useSectionLayer(MAIN_START);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const reducedMotionRef = useRef(false);
  // Phones: no per-word stagger — force every word solid, once.
  const mobileSolidRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    mobileSolidRef.current = window.matchMedia("(max-width: 700px)").matches;
  }, []);

  useFrameEffect((frame) => {
    if (mobileSolidRef.current) {
      for (let index = 0; index < WORD_COUNT; index += 1) {
        const element = wordRefs.current[index];
        if (element) {
          element.style.opacity = "1";
          element.style.transform = "none";
        }
      }
      return;
    }

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
            const index = WORD_INDEX_BY_TOKEN[tokenIndex];
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
