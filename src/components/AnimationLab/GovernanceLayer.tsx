"use client";

/* =========================================================
   Section — "Corporate Governance"
   =========================================================

   One combined heading and 5 stat cards with counting numbers, no CTA.
   Class names are this app's own (the design's generic .stat/.page
   names would collide with other sections).

   No <img> background: the scrubbed <canvas> and the shared scrim are
   the background.

   Reveal is fully frame-driven, so it tracks scroll position:
     - Title splits per word (not per character, to keep kerning),
       staggered via staggerProgressAt.
     - Each stat card rises in on the same helper.
     - Each number counts up as a direct function of frame
       (Math.floor(target * progress)), so it reverses when scrolled back.
       holdFrames in timeline.ts gives the numbers time to be read.

   Exit is its own reverse stagger, layered on top of the parent's fade
   from useSectionLayer: words leave in reverse order, cards sink back
   down, counters count back down to 0. */

import { useEffect, useRef } from "react";
import {
  SECTIONS,
  readPxPerFrame,
  staggerProgressAt,
  virtualEnterProgressAtScrollPx,
  virtualExitProgressAtScrollPx,
} from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const GOVERNANCE = SECTIONS[9];
const TITLE_TEXT = "Corporate Governance - Key Highlights";
const TITLE_TOKENS = TITLE_TEXT.split(/(\s+)/);
const TITLE_WORD_COUNT = TITLE_TOKENS.filter((token) => token.trim() !== "").length;
const TITLE_WORD_INDEX_BY_TOKEN = TITLE_TOKENS.map((token, tokenIndex) =>
  token.trim() === ""
    ? -1
    : TITLE_TOKENS.slice(0, tokenIndex).filter((item) => item.trim() !== "").length
);
// Must stay inside the parent's own enter window, both ends. Starting
// earlier has the stagger resolve while the parent is still at opacity
// 0, so it just pops in. Ending later than the parent's settle crosses
// the entering/exiting switch and snaps at the settle frame.
const SETTLE_FRAME = GOVERNANCE.settledFrame;
const ENTER_START = GOVERNANCE.enter?.frames[0] ?? SETTLE_FRAME;
const ENTER_END = SETTLE_FRAME + (GOVERNANCE.virtualEnterFrames ?? 0);
const TITLE_WINDOW: [number, number] = [ENTER_START, ENTER_END];
const STATS_WINDOW: [number, number] = [ENTER_START + 2, ENTER_END];
const TITLE_EXIT_WINDOW: [number, number] = GOVERNANCE.exit?.frames ?? [SETTLE_FRAME, SETTLE_FRAME];
const STATS_EXIT_WINDOW: [number, number] = GOVERNANCE.exit?.frames ?? [SETTLE_FRAME, SETTLE_FRAME];

const STATS = [
  { target: 14, unit: "", label: "No. of Directors" },
  { target: 57, unit: "%", label: "Non-Executive Directors Representation" },
  { target: 29, unit: "%", label: "Female Board Representation" },
  { target: 0, unit: "", label: "Significant Non-Compliance Incidents" },
  { target: 232, unit: "", label: "Total Audits Conducted on Management Systems" },
];

export default function GovernanceLayer() {
  const ref = useSectionLayer(GOVERNANCE);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const statRefs = useRef<Array<HTMLElement | null>>([]);
  const counterRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const reducedMotionRef = useRef(false);
  // Compact viewports use stable title/stat content and final counters —
  // no stagger or count-up while the section is being read.
  const mobileSolidRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    mobileSolidRef.current = window.matchMedia("(max-width: 1100px)").matches;
  }, []);

  useFrameEffect((frame, _phase, scrollPx, mode) => {
    if (mobileSolidRef.current) {
      for (let index = 0; index < TITLE_WORD_COUNT; index += 1) {
        const element = wordRefs.current[index];
        if (element) {
          element.style.opacity = "1";
          element.style.transform = "none";
        }
      }
      for (let index = 0; index < STATS.length; index += 1) {
        const stat = statRefs.current[index];
        if (stat) {
          stat.style.opacity = "1";
          stat.style.transform = "none";
        }
        const counter = counterRefs.current[index];
        if (counter) counter.textContent = String(STATS[index].target);
      }
      return;
    }

    if (reducedMotionRef.current) return;

    const virtualEnter = virtualEnterProgressAtScrollPx(
      GOVERNANCE,
      scrollPx,
      readPxPerFrame(),
      mode,
    );
    const virtualExit = virtualExitProgressAtScrollPx(
      GOVERNANCE,
      scrollPx,
      readPxPerFrame(),
      mode,
    );
    const entering = virtualEnter !== null || frame < SETTLE_FRAME;
    const animationFrame = virtualEnter === null
      ? frame
      : SETTLE_FRAME + virtualEnter * (GOVERNANCE.virtualEnterFrames ?? 0);
    const exitAnimationFrame = virtualExit === null
      ? frame
      : (GOVERNANCE.exit?.frames[0] ?? SETTLE_FRAME) +
        virtualExit * ((GOVERNANCE.exit?.frames[1] ?? SETTLE_FRAME) - (GOVERNANCE.exit?.frames[0] ?? SETTLE_FRAME));

    for (let index = 0; index < TITLE_WORD_COUNT; index += 1) {
      const element = wordRefs.current[index];
      if (!element) continue;
      const t = virtualExit !== null
        ? 1 -
          staggerProgressAt(
            TITLE_WORD_COUNT - 1 - index,
            TITLE_WORD_COUNT,
            exitAnimationFrame,
            TITLE_EXIT_WINDOW
          )
        : entering
        ? staggerProgressAt(index, TITLE_WORD_COUNT, animationFrame, TITLE_WINDOW)
        : frame <= SETTLE_FRAME
        ? 1
        : 1 -
          staggerProgressAt(
            TITLE_WORD_COUNT - 1 - index,
            TITLE_WORD_COUNT,
            exitAnimationFrame,
            TITLE_EXIT_WINDOW
          );
      element.style.opacity = String(t);
      element.style.transform = `translateY(${15 * (1 - t)}px)`;
    }

    for (let index = 0; index < STATS.length; index += 1) {
      const t = virtualExit !== null
        ? 1 -
          staggerProgressAt(
            STATS.length - 1 - index,
            STATS.length,
            exitAnimationFrame,
            STATS_EXIT_WINDOW
          )
        : entering
        ? staggerProgressAt(index, STATS.length, animationFrame, STATS_WINDOW)
        : frame <= SETTLE_FRAME
        ? 1
        : 1 -
          staggerProgressAt(STATS.length - 1 - index, STATS.length, exitAnimationFrame, STATS_EXIT_WINDOW);

      const stat = statRefs.current[index];
      if (stat) {
        stat.style.opacity = String(t);
        stat.style.transform = `translateY(${20 * (1 - t)}px)`;
      }

      const counter = counterRefs.current[index];
      if (counter) {
        counter.textContent = String(Math.floor(STATS[index].target * t));
      }
    }
  });

  return (
    <div
      className="lab-layer s-governance2"
      ref={ref}
      data-section={GOVERNANCE.id}
      data-initial-hidden="true"
      aria-labelledby="governance2-title"
    >
      <div className="s-governance2__content">
        <h1 className="s-governance2__title" id="governance2-title">
          {TITLE_TOKENS.map((token, tokenIndex) => {
            if (token.trim() === "") {
              // eslint-disable-next-line react/no-array-index-key
              return <span key={tokenIndex}>{token}</span>;
            }
            const index = TITLE_WORD_INDEX_BY_TOKEN[tokenIndex];
            return (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={tokenIndex}
                ref={(node) => {
                  wordRefs.current[index] = node;
                }}
                className="s-governance2__word"
              >
                {token}
              </span>
            );
          })}
        </h1>

        <div className="s-governance2__stats">
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              className="s-governance2__stat"
              ref={(node) => {
                statRefs.current[index] = node;
              }}
            >
              <p className="s-governance2__stat-value">
                <span
                  ref={(node) => {
                    counterRefs.current[index] = node;
                  }}
                >
                  0
                </span>
                {stat.unit && <span className="s-governance2__unit">{stat.unit}</span>}
              </p>
              <p className="s-governance2__stat-label">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
