"use client";

/* =========================================================
   ANIMATION LAB — section 10, "Banner — ocean navigation"
   =========================================================

   Markup ported from html-templates/final/Artboard 6.html (titled
   "Ocean navigation" in the source). No <img> background — that
   template's own <img> is the scrubbed canvas here, same swap as
   every other section. No <section>/100svh sizing — this is a
   .lab-layer stacked inside the shared fixed viewport.

   Two-paragraph copy block, reusing the existing .s-ocean__stage /
   .s-ocean__caption structure from the old single-caption version of
   this file (kept as a wrapper around both <p>s rather than
   duplicated per-paragraph) with a font-family added to match the
   template's own serif (Minion, unavailable here — Georgia stack,
   same substitution every other section uses).

   The .s-ocean__scrim gradient (a radial dark vignette behind the
   copy) was removed 2026-08-25 per VJ.

   Reveal: the section's own opacity/offset comes from
   useSectionLayer (standard pattern) inside OCEAN's own enter
   (450-460) / exit (460-475) frames — sits between Leadership and
   Capitals; re-measured against the new cut 2026-08-25 (was 475-485/
   485-500). Each paragraph also rises on its own
   2-item stagger nested inside that same window, same technique as
   IntroStatementLayer.tsx's paragraph rise. Exit mirrors the
   entrance in reverse (standing rule): paragraph 2 leads out first.

   Bug fix, 2026-08-24 (VJ: "those text have animation" — meaning
   they didn't read as animating): PARA_ENTER used to start on the
   exact same frame as the parent's own enter (both at 475), so the
   two opacity ramps multiplied together from zero at the same time —
   visually that reads as one slow blur-in, not a distinct paragraph
   rise, because the compound curve is near-zero for most of the
   window. Offset PARA_ENTER/PARA_EXIT to start a few frames into the
   parent's own ramp instead (same idea as Governance-Cards' title/
   cards windows starting partway into their parent's enter) so the
   parent is already partly visible before the paragraph motion
   starts, giving a two-stage reveal that actually reads as motion. */

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

// Both windows stay strictly inside the section's own enter
// (475-485) / exit (485-500) frames, but start a few frames after
// the parent's own ramp begins — see the bug-fix note above.
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

  useFrameEffect((frame, _phase, scrollPx) => {
    if (mobileSolidRef.current) {
      for (let index = 0; index < WORD_COUNT; index += 1) {
        const word = wordRefs.current[index];
        if (word) word.style.opacity = "1";
      }
      return;
    }

    const virtualEnter = virtualEnterProgressAtScrollPx(OCEAN, scrollPx, readPxPerFrame());
    const virtualExit = virtualExitProgressAtScrollPx(OCEAN, scrollPx, readPxPerFrame());
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
