"use client";

/* Artboard 9 foreground only. Its river image and overlay are omitted because
   the shared video canvas supplies the background for this frame.

   Copy is from the spec (PDF p.15, "Non-Financial Highlights"): the intro
   paragraph verbatim and one static reporting card per bullet. */

import { useEffect, useRef, useState } from "react";
import {
  SECTIONS,
  readPxPerFrame,
  virtualExitProgressAtScrollPx,
} from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const NONFINANCIAL = SECTIONS[15];

const CARDS = [
  {
    title: "S1 & S2 Disclosures",
    body: "Newly obtained independent assurance for S1 and S2 disclosures.",
    image: "/nonfinancial/nf-assurance.jpg",
  },
  {
    title: "GRI Disclosures",
    body: "Early adoption of GRI 102 and 103.",
    image: "/nonfinancial/nf-gri.jpg",
  },
  {
    title: "Green Investments",
    body: "Over LKR 1 Bn invested in green projects.",
    image: "/nonfinancial/nf-green.jpg",
  },
  {
    title: "DEI Policy",
    body: "Development of a new Diversity, Equity and Inclusion (DEI) Policy.",
    image: "/nonfinancial/nf-dei.jpg",
  },
];

export default function NonFinancialLayer() {
  const ref = useSectionLayer(NONFINANCIAL);
  // Which card is expanded. Click a card to open it (closing any other);
  // click it again to close. Replaces the old :hover expand — VJ
  // 2026-09-03: "make it click and action".
  const [openCard, setOpenCard] = useState<number | null>(null);
  const wasRevealedRef = useRef(false);

  const toggleCard = (index: number) =>
    setOpenCard((current) => (current === index ? null : index));

  useFrameEffect((frame, _phase, scrollPx) => {
    const element = ref.current;
    if (!element) return;

    const exitStart =
      NONFINANCIAL.exit?.frames[0] ?? NONFINANCIAL.settledFrame;

    const scrollUnlocked =
      frame >= NONFINANCIAL.settledFrame &&
      frame <= (NONFINANCIAL.exit?.frames[1] ?? exitStart);
    element.classList.toggle("is-scrollable", scrollUnlocked);
    if (!scrollUnlocked) element.scrollTop = 0;

    // Park model (same as 08-financial): the intro + cards reveal with
    // a plain time-based CSS transition — see lab.css's
    // .s-nonfinancial9[data-revealed] block — fired only while the
    // section sits on its virtual hold at settledFrame, and reversed
    // the moment it starts leaving. `frame` is pinned at settledFrame
    // through the whole 40 hold + 20 virtual-exit span, and
    // virtualExitProgressAtScrollPx goes non-null once the pinned exit
    // begins, so this flips true exactly for the readable stretch.
    const virtualExit = virtualExitProgressAtScrollPx(
      NONFINANCIAL,
      scrollPx,
      readPxPerFrame(),
    );
    const revealed =
      virtualExit === null &&
      frame >= NONFINANCIAL.settledFrame &&
      frame < exitStart;
    element.dataset.revealed = revealed ? "true" : "false";

    // Collapse any open card on the way out, so it does not re-enter
    // already expanded next pass. Edge-triggered — one setState, not
    // one per frame.
    if (!revealed && wasRevealedRef.current) setOpenCard(null);
    wasRevealedRef.current = revealed;
  });

  useEffect(() => () => {
    const element = ref.current;
    element?.classList.remove("is-scrollable");
    if (element) delete element.dataset.revealed;
  }, [ref]);

  return (
    <div
      className="lab-layer s-nonfinancial9"
      ref={ref}
      data-section={NONFINANCIAL.id}
      data-initial-hidden="true"
      data-lenis-prevent
      aria-labelledby="nonfinancial9-title"
    >
      <header className="s-nonfinancial9__intro">
        <h1 id="nonfinancial9-title">Non-Financial Highlights</h1>
        <p>
          Our non-financial highlights reflect the progress we are making beyond financial
          performance. From advancing sustainability reporting and environmental stewardship to
          strengthening diversity, inclusion and governance practices, these achievements demonstrate
          Haycarb&apos;s commitment to creating lasting value for people, planet and future
          generations as we continue our journey Beyond the Beyond.
        </p>
      </header>

      <section
        className="s-nonfinancial9__viewport"
        aria-label="Reporting highlights"
      >
        <div className="s-nonfinancial9__rail">
          {CARDS.map((card, index) => {
            const isOpen = openCard === index;
            return (
              <article
                className={`s-nonfinancial9__card${isOpen ? " is-open" : ""}`}
                key={card.title}
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => toggleCard(index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    toggleCard(index);
                  }
                }}
              >
                <img className="s-nonfinancial9__card-image" src={card.image} alt="" />
                <div className="s-nonfinancial9__content">
                  <div>
                    <h2>{card.title}</h2>
                    <p>{card.body}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
