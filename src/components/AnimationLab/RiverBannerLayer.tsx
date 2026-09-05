"use client";

/* Artboard 8 foreground only. The template background is supplied by the
   shared scrubbed video canvas and is intentionally not rendered here. */

import { useEffect, useRef } from "react";
import {
  SECTIONS,
  readPxPerFrame,
  staggerProgressAt,
  virtualEnterProgressAtScrollPx,
} from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const RIVER = SECTIONS[14];

/* Windows are DERIVED from the section entry, never hardcoded — they
   were literals ([816, 830] / [830, 841]) that silently went stale the
   moment the section was retimed on 2026-09-03.

   The word-by-word reveal runs during the 40 virtualEnterFrames, not
   the real enter: 780 -> 800 the panel fades in empty, then the
   background pins at 800 and the copy writes on across a virtual
   800 -> 840 span (virtualEnterProgressAtScrollPx maps the pinned
   scroll distance onto that range). Exit is the real 800 -> 820
   window, reversed. Same technique as GovernanceLayer.tsx. */
const VIRTUAL_ENTER_FRAMES = RIVER.virtualEnterFrames ?? 0;
const ENTER_WINDOW: [number, number] = [
  RIVER.settledFrame,
  RIVER.settledFrame + VIRTUAL_ENTER_FRAMES,
];
const EXIT_WINDOW: [number, number] =
  RIVER.exit?.frames ?? [RIVER.settledFrame, RIVER.settledFrame];
const PARAGRAPHS = [
  "Light does not always travel in a linear path. Through atmospheric refraction, shifts in temperature and air density cause light to bend, subtly altering perception and revealing a broader spectrum of what exists, while what is seen is shaped by conditions that constantly adjust as the environment changes.",
  "Similarly, Haycarb adapts to evolving market dynamics, climate realities and supply chain shifts with agility and intent, embedding ESG principles to strengthen resilience, support sustainable growth and create long term value.",
];
const TOKEN_GROUPS = PARAGRAPHS.map((paragraph) => paragraph.split(/(\s+)/));
const WORD_GROUPS = TOKEN_GROUPS.map((tokens, paragraphIndex) => {
  const offset = TOKEN_GROUPS.slice(0, paragraphIndex).reduce(
    (count, group) => count + group.filter((token) => token.trim() !== "").length,
    0,
  );
  return tokens.map((token, tokenIndex) => ({
    token,
    wordIndex:
      token.trim() === ""
        ? null
        : offset + tokens.slice(0, tokenIndex).filter((item) => item.trim() !== "").length,
  }));
});
const WORD_COUNT = WORD_GROUPS.reduce(
  (count, tokens) => count + tokens.filter((item) => item.wordIndex !== null).length,
  0,
);

export default function RiverBannerLayer() {
  const ref = useSectionLayer(RIVER);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  // Phones: skip the per-word opacity/translate stagger; the paragraph
  // just rides the section's own fade (see GlanceLayer's mobileSolid).
  const mobileSolidRef = useRef(false);
  useEffect(() => {
    mobileSolidRef.current = window.matchMedia("(max-width: 700px)").matches;
  }, []);

  useFrameEffect((frame, _phase, scrollPx, mode) => {
    if (mobileSolidRef.current) {
      for (let index = 0; index < WORD_COUNT; index += 1) {
        const word = wordRefs.current[index];
        if (word) {
          word.style.opacity = "1";
          word.style.transform = "none";
        }
      }
      return;
    }

    const virtualEnter = virtualEnterProgressAtScrollPx(
      RIVER,
      scrollPx,
      readPxPerFrame(),
      mode,
    );
    // While the 40 virtual frames are under the scroll head, drive the
    // stagger off that 0..1 progress mapped onto 800 -> 840. Before
    // then (real enter, frame < 800) the words stay hidden — the panel
    // arrives empty. After (frame past 800, no virtual span) it is the
    // reverse-stagger exit.
    const entering = virtualEnter !== null || frame < RIVER.settledFrame;
    const animFrame =
      virtualEnter !== null
        ? RIVER.settledFrame + virtualEnter * VIRTUAL_ENTER_FRAMES
        : frame;

    for (let index = 0; index < WORD_COUNT; index += 1) {
      const word = wordRefs.current[index];
      if (!word) continue;
      const progress = entering
        ? staggerProgressAt(index, WORD_COUNT, animFrame, ENTER_WINDOW)
        : 1 - staggerProgressAt(WORD_COUNT - 1 - index, WORD_COUNT, frame, EXIT_WINDOW);
      word.style.opacity = String(progress);
      word.style.transform = `translateY(${12 * (1 - progress)}px)`;
    }
  });

  return (
    <div
      className="lab-layer s-banner-river"
      ref={ref}
      data-section={RIVER.id}
      data-initial-hidden="true"
      aria-label="Beyond the Beyond narrative"
    >
      <div className="s-banner-river__body">
        {WORD_GROUPS.map((tokens, paragraphIndex) => (
          <p className="s-banner-river__copy" key={PARAGRAPHS[paragraphIndex]}>
            {tokens.map(({ token, wordIndex }, tokenIndex) => {
              if (wordIndex === null) return token;
              return (
                <span
                  className="s-banner-river__word"
                  key={`${paragraphIndex}-${tokenIndex}`}
                  ref={(node) => {
                    wordRefs.current[wordIndex] = node;
                  }}
                >
                  {token}
                </span>
              );
            })}
          </p>
        ))}
      </div>
    </div>
  );
}
