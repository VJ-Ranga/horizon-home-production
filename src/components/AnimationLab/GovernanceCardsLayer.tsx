"use client";

/* =========================================================
   ANIMATION LAB — governance cards, "Driving sustainable value
   creation through effective governance"
   =========================================================

   Markup ported from html-templates/final/07-governance-cards.html.
   All five cards carry the SAME placeholder copy in the source
   ("Inclusive Business Practices") — the designer copy-pasted card
   one, same pattern as the Approach section's own placeholder cards
   before those were finalized. Ported verbatim, not a mistake
   introduced here.

   Slotted into SECTIONS — VJ asked for it "as a new 8" so it shows
   in the debug HUD like every other section, after an earlier
   version kept it standalone specifically to avoid the array-index
   shift this caused. Moved again, SECTIONS[8] -> SECTIONS[10], on
   2026-08-25 when 05-intro-statement was promoted into the array
   ahead of it — this file's own id/index just rides along with
   whatever the current SECTIONS position is; no meaning is attached
   to the number itself. Currently SECTIONS[10] ("10-governance-cards").

   No <img> background — the scrubbed <canvas> is the background here,
   same swap as every other section.

   Reveal: the section's own opacity/offset now comes from
   useSectionLayer (standard pattern), same as everywhere else. The
   title's per-word stagger and each card's stagger stay custom, same
   staggerProgressAt helper as GovernanceLayer.tsx — word-not-character
   split (kerning), both windows kept strictly inside this section's
   own enter/exit frames (learned from the earlier Governance bug:
   starting before the parent is visible wastes the stagger unseen,
   ending past the settle frame causes a snap). Icon draw-in is the
   one exception, kept as the template's own on-mount CSS animation
   plus hover-redraw — same precedent as every other section's card
   badges (ApproachLayer.tsx, DigitalLayer.tsx). Exit mirrors the
   entrance in reverse (standing rule). */

import { useEffect, useRef } from "react";
import {
  SECTIONS,
  readPxPerFrame,
  staggerProgressAt,
  virtualEnterProgressAtScrollPx,
  virtualExitProgressAtScrollPx,
} from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";
import LottieIcon from "./LottieIcon";

const GOVERNANCE_CARDS = SECTIONS[10];

const TITLE_TEXT = "Driving Sustainable Value Creation Through Effective Governance";
const TITLE_TOKENS = TITLE_TEXT.split(/(\s+)/);
const TITLE_WORD_COUNT = TITLE_TOKENS.filter((token) => token.trim() !== "").length;
const SETTLE_FRAME = GOVERNANCE_CARDS.settledFrame;
const ENTER_START = GOVERNANCE_CARDS.enter?.frames[0] ?? SETTLE_FRAME;
const ENTER_END = SETTLE_FRAME + (GOVERNANCE_CARDS.virtualEnterFrames ?? 0);
const TITLE_WINDOW: [number, number] = [ENTER_START, ENTER_END];
const TITLE_EXIT_WINDOW: [number, number] = GOVERNANCE_CARDS.exit?.frames ?? [SETTLE_FRAME, SETTLE_FRAME];
const CARDS_WINDOW: [number, number] = [ENTER_START + 2, ENTER_END];
const CARDS_EXIT_WINDOW: [number, number] = GOVERNANCE_CARDS.exit?.frames ?? [SETTLE_FRAME, SETTLE_FRAME];

const CARDS = [
  {
    label: "Inclusive Business Practices",
    file: "Inclusive business practices.json",
  },
  {
    label: "ESG Integration and Sustainability Focus",
    file: "ESG integration and sustainability focus.json",
  },
  {
    label: "Portfolio Optimisation",
    file: "Portfolio optimisation.json",
  },
  {
    label: "Customer Centricity",
    file: "Customer centricity.json",
  },
  {
    label: "Building Inspired Teams",
    file: "Building inspired teams.json",
  },
];

export default function GovernanceCardsLayer() {
  const ref = useSectionLayer(GOVERNANCE_CARDS);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  useFrameEffect((frame, _phase, scrollPx) => {
    const virtualEnter = virtualEnterProgressAtScrollPx(
      GOVERNANCE_CARDS,
      scrollPx,
      readPxPerFrame()
    );
    const virtualExit = virtualExitProgressAtScrollPx(
      GOVERNANCE_CARDS,
      scrollPx,
      readPxPerFrame()
    );
    const entering = virtualEnter !== null || frame < SETTLE_FRAME;
    const animationFrame = virtualEnter === null
      ? frame
      : SETTLE_FRAME + virtualEnter * (GOVERNANCE_CARDS.virtualEnterFrames ?? 0);
    const exitAnimationFrame = virtualExit === null
      ? frame
      : (GOVERNANCE_CARDS.exit?.frames[0] ?? SETTLE_FRAME) +
        virtualExit * ((GOVERNANCE_CARDS.exit?.frames[1] ?? SETTLE_FRAME) - (GOVERNANCE_CARDS.exit?.frames[0] ?? SETTLE_FRAME));

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

    for (let index = 0; index < CARDS.length; index += 1) {
      const element = cardRefs.current[index];
      if (!element) continue;
      const t = virtualExit !== null
        ? 1 -
          staggerProgressAt(
            CARDS.length - 1 - index,
            CARDS.length,
            exitAnimationFrame,
            CARDS_EXIT_WINDOW
          )
        : entering
        ? staggerProgressAt(index, CARDS.length, animationFrame, CARDS_WINDOW)
        : frame <= SETTLE_FRAME
        ? 1
        : 1 -
          staggerProgressAt(
            CARDS.length - 1 - index,
            CARDS.length,
            exitAnimationFrame,
            CARDS_EXIT_WINDOW
          );
      element.style.opacity = String(t);
      element.style.transform = `translateY(${25 * (1 - t)}px)`;
    }
  });

  useFrameEffect((frame) => {
    const element = ref.current;
    if (!element) return;

    const scrollUnlocked = frame >= GOVERNANCE_CARDS.settledFrame &&
      frame <= (GOVERNANCE_CARDS.exit?.frames[1] ?? GOVERNANCE_CARDS.settledFrame);
    element.classList.toggle("is-scrollable", scrollUnlocked);
    if (!scrollUnlocked) element.scrollTop = 0;
  });

  useEffect(() => () => {
    ref.current?.classList.remove("is-scrollable");
  }, [ref]);

  let titleWordIndex = -1;

  return (
    <div
      className="lab-layer s-govcards"
      ref={ref}
      data-section={GOVERNANCE_CARDS.id}
      data-initial-hidden="true"
      aria-hidden="true"
    >
      <div className="s-govcards__content">
        <h1 className="s-govcards__title">
          {TITLE_TOKENS.map((token, tokenIndex) => {
            if (token.trim() === "") {
              // eslint-disable-next-line react/no-array-index-key
              return <span key={tokenIndex}>{token}</span>;
            }
            titleWordIndex += 1;
            const index = titleWordIndex;
            return (
              <span
                // eslint-disable-next-line react/no-array-index-key
                key={tokenIndex}
                ref={(node) => {
                  wordRefs.current[index] = node;
                }}
                className="s-govcards__word"
              >
                {token}
              </span>
            );
          })}
        </h1>

        <div className="s-govcards__cards">
          {CARDS.map((card, index) => (
            <div
              key={index}
              // eslint-disable-line react/no-array-index-key
              className="s-govcards__card lab-shine"
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
            >
              <div className="s-govcards__badge">
                <LottieIcon
                  file={card.file}
                  label={card.label}
                  directory="governance/icons"
                  className="s-govcards__lottie"
                  groupSecondary={index === 2}
                />
              </div>
              <p>
                {card.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
