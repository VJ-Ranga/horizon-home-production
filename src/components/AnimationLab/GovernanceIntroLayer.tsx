"use client";

/* =========================================================
   ANIMATION LAB — governance intro breaker (audit gap G2)
   =========================================================

   New section, inserted 2026-08-27 as SECTIONS[8]
   ("09-governance-intro"). A text-only bridge between Financial
   Highlights and Corporate Governance, over the shared scrubbed
   lighthouse frame — no <img> background, same as every other
   section. Structure follows CityBannerLayer: two stacked captions
   (the horizon metaphor, then the "Similarly, Haycarb…" tie-in),
   with word-by-word frame-driven enter and reverse exit layered over
   the section fade from useSectionLayer.

   Inserting this shifted every downstream layer's SECTIONS[n] index
   and every section id by one. */

import { useEffect, useRef } from "react";
import {
  SECTIONS,
  readPxPerFrame,
  staggerProgressAt,
  virtualEnterProgressAtScrollPx,
  virtualExitProgressAtScrollPx,
} from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const GOV_INTRO = SECTIONS[8];
const CAPTIONS = [
  "The horizon remains constant in presence, yet continually changes with perspective, providing a universal reference point wherever we stand.",
  "Similarly, Haycarb’s governance framework provides a consistent foundation across the geographies in which we operate, enabling a unified approach while responding to different operating environments.",
];
const WORD_GROUPS = CAPTIONS.map((caption) => caption.split(/\s+/));
const WORD_COUNT = WORD_GROUPS.reduce((total, words) => total + words.length, 0);

export default function GovernanceIntroLayer() {
  const ref = useSectionLayer(GOV_INTRO);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  // Phones: skip the per-word opacity stagger; the caption just rides
  // the section's own fade (see GlanceLayer's mobileSolid).
  const mobileSolidRef = useRef(false);
  useEffect(() => {
    mobileSolidRef.current = window.matchMedia("(max-width: 700px)").matches;
  }, []);

  useFrameEffect((frame, _phase, scrollPx) => {
    if (mobileSolidRef.current) {
      for (let index = 0; index < WORD_COUNT; index += 1) {
        const word = wordRefs.current[index];
        if (word) word.style.opacity = "1";
      }
      return;
    }

    const virtualEnter = virtualEnterProgressAtScrollPx(GOV_INTRO, scrollPx, readPxPerFrame());
    const virtualExit = virtualExitProgressAtScrollPx(GOV_INTRO, scrollPx, readPxPerFrame());
    const entering = virtualEnter !== null || frame < GOV_INTRO.exit!.frames[0];
    const animationFrame = virtualEnter === null
      ? frame
      : GOV_INTRO.settledFrame + virtualEnter * (GOV_INTRO.virtualEnterFrames ?? 0);

    for (let index = 0; index < WORD_COUNT; index += 1) {
      const word = wordRefs.current[index];
      if (!word) continue;
      const progress = virtualExit !== null
        ? 1 - staggerProgressAt(
            WORD_COUNT - 1 - index,
            WORD_COUNT,
            virtualExit * (GOV_INTRO.virtualExitFrames ?? 0),
            [0, GOV_INTRO.virtualExitFrames ?? 0]
          )
        : entering
        ? staggerProgressAt(index, WORD_COUNT, animationFrame, [
            GOV_INTRO.enter!.frames[0],
            GOV_INTRO.enter!.frames[1] + (GOV_INTRO.virtualEnterFrames ?? 0),
          ])
        : frame <= GOV_INTRO.settledFrame
        ? 1
        : 1 - staggerProgressAt(WORD_COUNT - 1 - index, WORD_COUNT, frame, GOV_INTRO.exit!.frames);
      word.style.opacity = String(progress);
    }
  });

  return (
    <div
      className="lab-layer s-govintro"
      ref={ref}
      data-section={GOV_INTRO.id}
      data-initial-hidden="true"
      aria-labelledby="govintro-caption"
    >
      <div className="s-govintro__stage">
        <div className="s-govintro__copy">
          {WORD_GROUPS.map((words, paragraphIndex) => {
            const offset = WORD_GROUPS
              .slice(0, paragraphIndex)
              .reduce((total, group) => total + group.length, 0);
            return (
              <p className="s-govintro__caption" id={paragraphIndex === 0 ? "govintro-caption" : undefined} key={paragraphIndex}>
                {words.map((word, wordIndex) => (
                  <span key={`${word}-${wordIndex}`}>
                    <span
                      ref={(node) => {
                        wordRefs.current[offset + wordIndex] = node;
                      }}
                    >
                      {word}
                    </span>
                    {wordIndex < words.length - 1 ? " " : ""}
                  </span>
                ))}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
