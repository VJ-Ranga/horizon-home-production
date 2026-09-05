"use client";

/* =========================================================
   ANIMATION LAB — section 7, "Corporate Governance"
   =========================================================

   Markup ported from html-templates/final/07-governance.html,
   replacing the earlier 07-governance.html (card-list layout with a
   separate eyebrow/CTA) port wholesale. The new template is much
   simpler: one combined heading ("Corporate Governance - Key
   highlights", no separate eyebrow) and 5 stat cards with counting
   numbers, no CTA at all. Class names below are new (this app's own
   naming, not the template's terse `.stat`/`.page` — those would
   collide too easily with other sections' generic-sounding classes)
   but the layout/values are byte-for-byte the source's.

   No <img> background — the scrubbed <canvas> is the background here,
   same swap as every other section. The template's own dark gradient
   overlay (`.page:before`) was ported once as its own scrim div, then
   dropped per VJ (2026-08-23) — the shared canvas/scrim underneath is
   enough on its own here.

   Reveal is fully frame-driven (standing rule this session — "all
   animation... need to work with scrolling"), not the template's
   fixed-duration CSS/JS animations:
   - Title splits PER WORD (not per character — character-splitting
     broke font kerning earlier this session, see MainStartLayer.tsx),
     staggered via staggerProgressAt.
   - Each stat card rises in staggered, same helper.
   - Each stat's NUMBER counts up as a direct function of frame
     (Math.floor(target * progress)), not the template's
     requestAnimationFrame-over-500ms-wall-clock counter — so the
     count is exactly in sync with scroll position, reversible if
     scrolled backward, same as everything else. (Briefly removed
     2026-09-03 on the "numbers don't fully appear" note, then
     restored per VJ — the fix for that is the longer hold, holdFrames
     30 in timeline.ts, not dropping the count.)

   Exit is its own reverse stagger for words/stats/counters (standing
   rule), not just riding the parent's own opacity fade from
   useSectionLayer — the first version only had the entrance windows,
   so past frame 408 every word/stat sat at "fully in" (t=1) forever
   while only the parent faded, which meant no per-item motion or
   counter reversal on the way out at all. Now EXIT_WINDOW drives a
   genuine reverse: words leave in reverse order, cards sink back
   down, counters count back down to 0 — same shape as the entrance,
   played backward, layered on top of the parent's fade. */

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
// MUST stay inside the parent's own enter window, both ends — see
// the original reasoning below, numbers re-measured 2026-08-25 when
// this section was squeezed onto the new cut's much shorter
// lighthouse shot (enter 390-394, only 4 frames, see timeline.ts).
// Starting earlier has the stagger resolve while the parent is still
// at opacity 0 (its own enter hasn't started), so by the time the
// section is actually visible the words have already finished
// internally — no perceptible stagger, just a pop. Ending later than
// the parent's own settle crosses the frame this file's own
// entering/exiting switch happens on, causing a snap right at the
// settle frame instead of a clean finish.
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
  // Phones: no title/stat stagger and no counter count-up — every word
  // and card solid, every number at its final value, once.
  const mobileSolidRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    mobileSolidRef.current = window.matchMedia("(max-width: 700px)").matches;
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
