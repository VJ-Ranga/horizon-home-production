"use client";

import { useEffect, useRef } from "react";
import {
  SECTIONS,
  readPxPerFrame,
  staggerProgressAt,
  virtualEnterProgressAtScrollPx,
  virtualExitProgressAtScrollPx,
} from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const CITY = SECTIONS[6];
const CAPTIONS = [
  "The horizon shifts as we move, revealing new perspectives and greater clarity with every step forward. Guided by position and precision, it continually reframes what lies ahead.",
  "Similarly, Haycarb’s financial performance builds on a strong foundation, guided by clarity and precision as we advance towards sustained growth and lasting value.",
];
const WORD_GROUPS = CAPTIONS.map((caption) => caption.split(/\s+/));
const WORD_COUNT = WORD_GROUPS.reduce((total, words) => total + words.length, 0);

export default function CityBannerLayer() {
  const ref = useSectionLayer(CITY);
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

    const virtualEnter = virtualEnterProgressAtScrollPx(CITY, scrollPx, readPxPerFrame());
    const virtualExit = virtualExitProgressAtScrollPx(CITY, scrollPx, readPxPerFrame());
    const entering = virtualEnter !== null || frame < CITY.exit!.frames[0];
    const animationFrame = virtualEnter === null
      ? frame
      : CITY.settledFrame + virtualEnter * (CITY.virtualEnterFrames ?? 0);
    for (let index = 0; index < WORD_COUNT; index += 1) {
      const word = wordRefs.current[index];
      if (!word) continue;
      const progress = virtualExit !== null
        ? 1 - staggerProgressAt(
            WORD_COUNT - 1 - index,
            WORD_COUNT,
            virtualExit * (CITY.virtualExitFrames ?? 0),
            [0, CITY.virtualExitFrames ?? 0]
          )
        : entering
        ? staggerProgressAt(index, WORD_COUNT, animationFrame, [
            CITY.enter!.frames[0],
            CITY.enter!.frames[1] + (CITY.virtualEnterFrames ?? 0),
          ])
        : frame <= CITY.settledFrame
        ? 1
        : 1 - staggerProgressAt(WORD_COUNT - 1 - index, WORD_COUNT, frame, CITY.exit!.frames);
      word.style.opacity = String(progress);
    }
  });

  return (
    <div
      className="lab-layer s-city"
      ref={ref}
      data-section={CITY.id}
      data-initial-hidden="true"
      aria-labelledby="city-caption"
    >
      <div className="s-city__stage">
        <div className="s-city__copy">
          {WORD_GROUPS.map((words, paragraphIndex) => {
            const offset = WORD_GROUPS
              .slice(0, paragraphIndex)
              .reduce((total, group) => total + group.length, 0);
            return (
              <p className="s-city__caption" id={paragraphIndex === 0 ? "city-caption" : undefined} key={paragraphIndex}>
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
