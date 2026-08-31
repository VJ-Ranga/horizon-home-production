"use client";

import { useRef } from "react";
import {
  SECTIONS,
  readPxPerFrame,
  staggerProgressAt,
  virtualEnterProgressAtScrollPx,
  virtualExitProgressAtScrollPx,
} from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const END_SCREEN = SECTIONS[18];
const COPY =
  "Our journey continues as we pursue new possibilities, advance sustainable innovation and create lasting value for our stakeholders.";
const COPY_TOKENS = COPY.split(/(\s+)/);
const WORD_COUNT = COPY_TOKENS.filter((token) => token.trim() !== "").length;

const ENTER_FRAMES = END_SCREEN.enter!.frames;
const EXIT_FRAMES = END_SCREEN.exit!.frames;
const V_ENTER = END_SCREEN.virtualEnterFrames ?? 0;
const V_EXIT = END_SCREEN.virtualExitFrames ?? 0;

export default function EndScreenLayer() {
  const ref = useSectionLayer(END_SCREEN);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useFrameEffect((frame, _phase, scrollPx) => {
    const pxPerFrame = readPxPerFrame();
    const virtualEnter = virtualEnterProgressAtScrollPx(END_SCREEN, scrollPx, pxPerFrame);
    const virtualExit = virtualExitProgressAtScrollPx(END_SCREEN, scrollPx, pxPerFrame);

    const entering = virtualEnter !== null || frame < END_SCREEN.settledFrame;
    // During the pinned virtual-enter frames the real frame is frozen at
    // settledFrame; stretch it forward so the word stagger keeps easing.
    const animationFrame =
      virtualEnter === null
        ? frame
        : END_SCREEN.settledFrame + virtualEnter * V_ENTER;

    // The stagger runs one window wider on entry so the last word still
    // has room to finish inside the virtual-enter hold.
    const enterWindow: [number, number] = [ENTER_FRAMES[0], ENTER_FRAMES[1] + V_ENTER];

    // Exit reverses the entrance order — last word in is first word out.
    const reveal = (position: number) => {
      if (virtualExit !== null) {
        return (
          1 -
          staggerProgressAt(position, WORD_COUNT, virtualExit * V_EXIT, [0, V_EXIT])
        );
      }
      if (entering) {
        return staggerProgressAt(position, WORD_COUNT, animationFrame, enterWindow);
      }
      if (frame <= END_SCREEN.settledFrame) return 1;
      return 1 - staggerProgressAt(position, WORD_COUNT, frame, EXIT_FRAMES);
    };

    let wordIndex = 0;
    for (const token of COPY_TOKENS) {
      if (token.trim() === "") continue;
      const word = wordRefs.current[wordIndex];
      if (word) {
        const forward = wordIndex; // entrance order
        const backward = WORD_COUNT - 1 - wordIndex; // exit order
        const progress =
          virtualExit !== null || (!entering && frame > END_SCREEN.settledFrame)
            ? reveal(backward)
            : reveal(forward);
        word.style.opacity = String(progress);
      }
      wordIndex += 1;
    }

    // Dark gradient overlay tracks the whole copy reveal: it fills as the
    // last word lands, holds through the settled/hold frames, then drains
    // across the virtual-exit frames. The last element to move — entering
    // or leaving — is stagger position WORD_COUNT - 1, so the scrim only
    // reaches its endpoints when every word has.
    if (ref.current) {
      ref.current.style.setProperty("--end-scrim", String(reveal(WORD_COUNT - 1)));
    }
  });

  return (
    <section
      className="lab-layer s-end-screen"
      ref={ref}
      data-section={END_SCREEN.id}
      data-initial-hidden="true"
      aria-label="End screen"
    >
      <p className="s-end-screen__copy">
        {COPY_TOKENS.map((token, tokenIndex) => {
          if (token.trim() === "") {
            // eslint-disable-next-line react/no-array-index-key
            return <span key={tokenIndex}>{token}</span>;
          }
          const wordIndex = COPY_TOKENS
            .slice(0, tokenIndex)
            .filter((item) => item.trim() !== "").length;
          return (
            <span
              // eslint-disable-next-line react/no-array-index-key
              key={tokenIndex}
              ref={(node) => {
                wordRefs.current[wordIndex] = node;
              }}
            >
              {token}
            </span>
          );
        })}
      </p>
    </section>
  );
}
