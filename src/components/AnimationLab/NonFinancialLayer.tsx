"use client";

/* Artboard 9 foreground only. Its river image and overlay are omitted because
   the shared video canvas supplies the background for this frame.

   Copy is from the spec (PDF p.15, "Non-Financial Highlights"): the intro
   paragraph verbatim and one static reporting card per bullet. */

import { useEffect } from "react";
import { SECTIONS } from "./timeline";
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

  useFrameEffect((frame) => {
    const element = ref.current;
    if (!element) return;

    const scrollUnlocked = frame >= NONFINANCIAL.settledFrame &&
      frame <= (NONFINANCIAL.exit?.frames[0] ?? NONFINANCIAL.settledFrame);
    element.classList.toggle("is-scrollable", scrollUnlocked);
    if (!scrollUnlocked) element.scrollTop = 0;
  });

  useEffect(() => () => {
    ref.current?.classList.remove("is-scrollable");
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
          {CARDS.map((card) => (
            <article
              className="s-nonfinancial9__card"
              key={card.title}
            >
              <img className="s-nonfinancial9__card-image" src={card.image} alt="" />
              <div className="s-nonfinancial9__content">
                <div>
                  <h2>{card.title}</h2>
                  <p>{card.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
