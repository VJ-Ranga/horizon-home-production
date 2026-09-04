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

   Reveal: the section's own opacity/offset now controls the title and
   all five cards as one compact group. Icon draw-in is kept as the
   template's own on-mount CSS animation plus hover-redraw — same
   precedent as every other section's card badges. */

import { useEffect, useRef } from "react";
import { SECTIONS, progressBetween, easeOut } from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";
import LottieIcon from "./LottieIcon";

const GOVERNANCE_CARDS = SECTIONS[10];
const TITLE_WINDOW: [number, number] = [535, 538];
const CARDS_WINDOW: [number, number] = [537, 540];

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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  useFrameEffect((frame) => {
    const entering = frame < GOVERNANCE_CARDS.settledFrame;
    const titleT = entering ? easeOut(progressBetween(frame, TITLE_WINDOW[0], TITLE_WINDOW[1])) : 1;
    const cardsT = entering ? easeOut(progressBetween(frame, CARDS_WINDOW[0], CARDS_WINDOW[1])) : 1;

    if (titleRef.current) {
      titleRef.current.style.opacity = String(titleT);
      titleRef.current.style.transform = `translateY(${10 * (1 - titleT)}px)`;
    }
    if (cardsRef.current) {
      cardsRef.current.style.opacity = String(cardsT);
      cardsRef.current.style.transform = `translateY(${18 * (1 - cardsT)}px)`;
    }
  });

  useFrameEffect((frame) => {
    const element = ref.current;
    if (!element) return;

    const scrollUnlocked = frame >= GOVERNANCE_CARDS.settledFrame &&
      frame <= (GOVERNANCE_CARDS.exit?.frames[1] ?? GOVERNANCE_CARDS.settledFrame);
    element.classList.toggle("is-scrollable", scrollUnlocked);
    // Only fence Lenis off while the section is actually holding and its
    // content is scrollable — otherwise the enter/exit swipe has nowhere
    // to go (Lenis ignored, root not yet overflow:auto) and the page
    // stalls on this section. `contain` on the child lets a swipe past
    // the inner top/bottom edge fall through to advance the timeline.
    if (scrollUnlocked && element.scrollHeight > element.clientHeight) {
      element.setAttribute("data-lenis-prevent", "");
    } else {
      element.removeAttribute("data-lenis-prevent");
      element.scrollTop = 0;
    }
  });

  useEffect(() => () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove("is-scrollable");
    el.removeAttribute("data-lenis-prevent");
  }, [ref]);

  return (
    <div
      className="lab-layer s-govcards"
      ref={ref}
      data-section={GOVERNANCE_CARDS.id}
      data-initial-hidden="true"
      aria-hidden="true"
    >
      <div className="s-govcards__content" data-lenis-prevent>
        <h1 className="s-govcards__title" ref={titleRef}>
          Driving Sustainable Value Creation Through Effective Governance
        </h1>

        <div className="s-govcards__cards" ref={cardsRef}>
          {CARDS.map((card, index) => (
            <div
              key={index}
              // eslint-disable-line react/no-array-index-key
              className="s-govcards__card lab-shine"
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
