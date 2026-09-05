"use client";

/* =========================================================
   ANIMATION LAB — intro statement, "Beyond the Beyond"
   =========================================================

   Markup ported from html-templates/final/05-blue-city.html
   (titled "Intro Statement, Combined" in the source — not a city
   banner despite the filename, see the note this caused earlier in
   the session). No <img> background — the scrubbed <canvas> is the
   background here, same swap as every other section, referencing the
   same moment the template's own still (frame 253) was pulled from.

   Promoted into the shared SECTIONS array as SECTIONS[4]
   ("05-intro-statement"), 2026-08-25, per VJ — it used to be kept
   standalone specifically to dodge the index shift that inserting it
   would cause in every other layer file, but that shift has now been
   done (see timeline.ts for the full re-index). Its own opacity/
   position fade comes from useSectionLayer now, same as every other
   section; the enter/exit windows below are read directly off its
   SECTIONS entry instead of the two local frame constants this file
   used to carry.

   The pale wash (.s-intro__media::after in the template) is its own
   element here, not a reuse of .lab-media's shared dark scrim — this
   one goes to ~97% white, which visually dominates over whatever the
   dark scrim underneath is doing while it's active, so there's no
   need to touch that shared scrim's own logic for this.

   Each word reveals in its own opacity stagger on top of the section's
   own overall fade. The virtual enter finish completes the word reveal
   while the background stays pinned. Exit reverses the word order,
   layered on top of, not replacing, the parent's own opacity fade. */

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
  // Phones: skip the per-word opacity stagger entirely — the whole
  // paragraph just rides the section's own fade. Same idea as
  // GlanceLayer's mobileSolid.
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
