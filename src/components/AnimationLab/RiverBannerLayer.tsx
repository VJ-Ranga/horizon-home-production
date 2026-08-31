"use client";

/* Artboard 8 foreground only. The template background is supplied by the
   shared scrubbed video canvas and is intentionally not rendered here. */

import { useRef } from "react";
import { SECTIONS, staggerProgressAt } from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const RIVER = SECTIONS[14];
const ENTER_WINDOW: [number, number] = [816, 830];
const EXIT_WINDOW: [number, number] = [830, 841];
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

  useFrameEffect((frame) => {
    const entering = frame < RIVER.settledFrame;

    for (let index = 0; index < WORD_COUNT; index += 1) {
      const word = wordRefs.current[index];
      if (!word) continue;
      const progress = entering
        ? staggerProgressAt(index, WORD_COUNT, frame, ENTER_WINDOW)
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
