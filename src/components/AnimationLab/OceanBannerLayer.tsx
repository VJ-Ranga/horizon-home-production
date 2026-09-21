"use client";

/* =========================================================
   Section — "Banner — ocean navigation"
   =========================================================

   No <img> background: the scrubbed canvas is the background. No
   <section>/100svh sizing: this is a .lab-layer stacked inside the
   shared fixed viewport.

   Two-paragraph copy block inside .s-ocean__stage / .s-ocean__caption,
   set in the Georgia serif stack used by the other sections.

   Reveal: the section's own opacity/offset comes from useSectionLayer.
   Each paragraph also rises on its own 2-item stagger, from the start
   of the enter through the virtual enter hold. Exit mirrors the
   entrance in reverse: paragraph 2 leads out first. */

import { useEffect, useRef } from "react";
import {
  SECTIONS,
  readPxPerFrame,
  staggerProgressAt,
  virtualEnterProgressAtScrollPx,
  virtualExitProgressAtScrollPx,
} from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const OCEAN = SECTIONS[12];
const SETTLE_FRAME = OCEAN.settledFrame;
const ENTER_START = OCEAN.enter!.frames[0];
const ENTER_END = SETTLE_FRAME + (OCEAN.virtualEnterFrames ?? 0);
const EXIT_START = OCEAN.exit!.frames[0];

// Paragraph windows are derived from the section entry: the enter runs
// from the parent's enter start through the virtual enter hold; the exit
// uses the parent's exit window.
const PARA_ENTER: [number, number] = [ENTER_START, ENTER_END];
const PARA_EXIT: [number, number] = OCEAN.exit!.frames;

const PARAGRAPHS = [
  `Traditional and modern navigation relies on ocean currents, winds, and
   large scale patterns that shape route and efficiency, while mariners use
   the horizon as a constant reference point, guiding direction while
   interpreting the forces that move beneath it.`,
  `Similarly, Haycarb advances through strategic foresight, harnessing its
   key resources and capabilities while maintaining clear alignment with
   its strategic objectives to anticipate change and navigate emerging
   opportunities.`,
];
const WORD_GROUPS = PARAGRAPHS.map((paragraph) => paragraph.trim().split(/\s+/));
const WORD_COUNT = WORD_GROUPS.reduce((total, words) => total + words.length, 0);

export default function OceanBannerLayer() {
  const ref = useSectionLayer(OCEAN);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  // Phones: skip the per-word opacity stagger; the paragraph just rides
  // the section's own fade (see GlanceLayer's mobileSolid).
  const mobileSolidRef = useRef(false);
  useEffect(() => {
    mobileSolidRef.current = window.matchMedia("(max-width: 700px)").matches;
  }, []);

  useFrameEffect((frame, _phase, scrollPx, mode) => {
    if (mobileSolidRef.current) {
      for (let index = 0; index < WORD_COUNT; index += 1) {
        const word = wordRefs.current[index];
        if (word) word.style.opacity = "1";
      }
      return;
    }

    const virtualEnter = virtualEnterProgressAtScrollPx(OCEAN, scrollPx, readPxPerFrame(), mode);
    const virtualExit = virtualExitProgressAtScrollPx(OCEAN, scrollPx, readPxPerFrame(), mode);
    const entering = virtualEnter !== null || frame < EXIT_START;
    const animationFrame = virtualEnter === null
      ? frame
      : SETTLE_FRAME + virtualEnter * (OCEAN.virtualEnterFrames ?? 0);
    const exitAnimationFrame = virtualExit === null
      ? frame
      : EXIT_START + virtualExit * (OCEAN.exit!.frames[1] - EXIT_START);

    for (let index = 0; index < WORD_COUNT; index += 1) {
      const word = wordRefs.current[index];
      if (!word) continue;
      const progress = virtualExit !== null
        ? 1 -
          staggerProgressAt(
            WORD_COUNT - 1 - index,
            WORD_COUNT,
            exitAnimationFrame,
            PARA_EXIT
          )
        : entering
        ? staggerProgressAt(index, WORD_COUNT, animationFrame, PARA_ENTER)
        : frame <= SETTLE_FRAME
        ? 1
        : 1 - staggerProgressAt(WORD_COUNT - 1 - index, WORD_COUNT, exitAnimationFrame, PARA_EXIT);
      word.style.opacity = String(progress);
    }
  });

  return (
    <div
      className="lab-layer s-ocean"
      ref={ref}
      data-section={OCEAN.id}
      data-initial-hidden="true"
      aria-label="Ocean navigation"
    >
      <div className="s-ocean__stage">
        <div className="s-ocean__copy">
          {WORD_GROUPS.map((words, paragraphIndex) => {
            const offset = WORD_GROUPS
              .slice(0, paragraphIndex)
              .reduce((total, group) => total + group.length, 0);
            return (
            <p
              key={paragraphIndex}
              className="s-ocean__caption"
            >
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
