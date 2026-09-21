"use client";

/* =========================================================
   Section — intro statement, "Beyond the Beyond"
   =========================================================

   No <img> background: the scrubbed <canvas> is the background.
   Opacity/position fade comes from useSectionLayer; the enter/exit
   windows are read from this section's SECTIONS entry.

   The pale wash is its own element, not the shared dark scrim on
   .lab-media: it goes to ~97% white, which dominates the dark scrim
   underneath while active.

   Each word reveals in its own opacity stagger on top of the section's
   overall fade. The virtual enter finishes the word reveal while the
   background stays pinned. Exit reverses the word order, layered on
   top of the parent's own opacity fade. */

import { useEffect, useRef } from "react";
import {
  SECTIONS,
  readPxPerFrame,
  staggerProgressAt,
  virtualEnterProgressAtScrollPx,
  virtualExitProgressAtScrollPx,
} from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const INTRO = SECTIONS[4];
const ENTER_FRAMES = INTRO.enter!.frames;
const EXIT_FRAMES = INTRO.exit!.frames;
const PARAGRAPHS = [
  `Beyond the Beyond reflects the mindset that drives Haycarb
   forward. In a world of evolving challenges and emerging
   opportunities, we look beyond conventional boundaries to
   create sustainable value for our stakeholders.`,
  `From advancing sustainable carbon innovation and strengthening
   global partnerships to driving environmental stewardship and
   empowering communities, we continue to turn ambition into
   action, shaping a future that reaches beyond expectations and
   beyond the horizon.`,
];
const WORD_GROUPS = PARAGRAPHS.map((paragraph) => paragraph.trim().split(/\s+/));
const WORD_COUNT = WORD_GROUPS.reduce((total, words) => total + words.length, 0);

export default function IntroStatementLayer() {
  const ref = useSectionLayer(INTRO);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  // Compact viewports skip the per-word opacity stagger entirely — the
  // paragraph stays readable while the section itself fades and moves.
  const mobileSolidRef = useRef(false);
  useEffect(() => {
    mobileSolidRef.current = window.matchMedia("(max-width: 1100px)").matches;
  }, []);

  useFrameEffect((frame, _phase, scrollPx, mode) => {
    if (mobileSolidRef.current) {
      for (let index = 0; index < WORD_COUNT; index += 1) {
        const word = wordRefs.current[index];
        if (word) word.style.opacity = "1";
      }
      return;
    }

    const virtualEnter = virtualEnterProgressAtScrollPx(
      INTRO,
      scrollPx,
      readPxPerFrame(),
      mode,
    );
    const virtualExit = virtualExitProgressAtScrollPx(
      INTRO,
      scrollPx,
      readPxPerFrame(),
      mode,
    );
    const entering = virtualEnter !== null || frame < INTRO.settledFrame;
    const animationFrame = virtualEnter === null
      ? frame
      : INTRO.settledFrame + virtualEnter * (INTRO.virtualEnterFrames ?? 0);

    for (let index = 0; index < WORD_COUNT; index += 1) {
      const word = wordRefs.current[index];
      // Exit reverses the entrance order — the last word to arrive is
      // the first to leave — by staggering on the count minus index.
      const t = virtualExit !== null
        ? 1 - staggerProgressAt(
            WORD_COUNT - 1 - index,
            WORD_COUNT,
            virtualExit * (INTRO.virtualExitFrames ?? 0),
            [0, INTRO.virtualExitFrames ?? 0]
          )
        : entering
        ? staggerProgressAt(index, WORD_COUNT, animationFrame, [
            ENTER_FRAMES[0],
            ENTER_FRAMES[1] + (INTRO.virtualEnterFrames ?? 0),
          ])
        : frame <= INTRO.settledFrame
        ? 1
        : 1 - staggerProgressAt(WORD_COUNT - 1 - index, WORD_COUNT, frame, EXIT_FRAMES);
      if (word) word.style.opacity = String(t);
    }

  });

  return (
    <div
      className="lab-layer s-intro"
      ref={ref}
      data-section={INTRO.id}
      data-initial-hidden="true"
      aria-hidden="true"
    >
      <div className="s-intro__media" aria-hidden="true" />
      <div className="s-intro__stage">
        <div className="s-intro__statement">
          {WORD_GROUPS.map((words, paragraphIndex) => {
            const offset = WORD_GROUPS
              .slice(0, paragraphIndex)
              .reduce((total, group) => total + group.length, 0);
            return (
              <p key={paragraphIndex}>
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
