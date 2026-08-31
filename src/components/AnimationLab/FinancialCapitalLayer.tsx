"use client";

/* =========================================================
   ANIMATION LAB — section 14, "Capitals Management"
   =========================================================

   Markup ported from html-templates/final/Artboard 7.html — a
   scroll-jack card carousel, structurally unlike every other
   section in this timeline. VJ's own words: "stop move video after
   this fully load and scroll card one by one after finish scarling
   card work like normal section desaper with frams."

   Mechanism (confirmed with VJ before building): scroll drives the
   shared background frame-scrub normally up to this section's own
   settledFrame (490, re-measured 2026-08-25 — was 515), crawling in
   over the last few frames like any other section's hold. AT
   settledFrame the scrub freezes COMPLETELY — not the usual slowed
   crawl, see the `carousel` field on this section's entry in
   timeline.ts and the dedicated zero-frame-movement leg
   buildLegs()/stops() adds for it. Further scroll spends LEAD_PX
   held on card 0, then sweeps the 5 cards, then holds TAIL_PX on the
   last card — VJ, 2026-08-24, after the first pass: "give similar
   time for 1 frame to start scrolling, also once scroll[ing the
   cards is] done, before [the background] start[s] mov[ing again]
   wait 2 or 3 frame". Once the whole budget is spent, normal
   frame-driven scroll resumes past settledFrame and this section
   exits like any other, fading out before the River banner enters.

   Because the frame is genuinely pinned for the whole carousel, the
   card position CANNOT be derived from frame (every card would read
   the same value) — it has to read window.scrollY directly, the
   same coordinate space scrollPxForFrame/frameForScrollPx already
   use (confirmed: the page's only in-flow content is the spacer
   sized to totalScrollPx, so window.scrollY === "px into phase 2"
   exactly, no separate tracking needed). This runs its own rAF loop
   rather than useFrameEffect for that reason — it is not a function
   of frame, it is a function of raw scroll position within the lock.

   Card visual mechanics (opacity/scale/offset by distance from the
   active index, eased glide toward the scroll target) are ported
   from the template's own motion.js-adjacent inline script, same
   EASE=0.09 damping constant, translated to React refs instead of
   direct querySelectorAll.

   The Artboard 7 source shipped 5 identical "Financial Capital"
   placeholder cards. Replaced 2026-08-28 with the 7 real capital
   cards from the spec (PDF p.10-14): Financial, Natural, Social and
   Relationship, Intellectual, Human, Manufactured, Digital — each
   with its own body copy and three stats. carousel.count in
   timeline.ts bumped 5 -> 7 and the sweep scaled to match. Per-card
   "Explore More" buttons from the spec are a separate wiring task
   (local PDFs, see doc/horizon-link-mapping.html) and are not added
   here. Background image is the same asset off every card's photo
   half, matching the source. */

import { useEffect, useRef } from "react";
import { SECTIONS, readPxPerFrame, scrollPxForFrame } from "./timeline";
import { useSectionLayer } from "./useFrameTimeline";

const FINCAP = SECTIONS[13];
const CARD_COUNT = FINCAP.carousel!.count;
const LEAD_PX = FINCAP.carousel!.leadPx;
const TAIL_PX = FINCAP.carousel!.tailPx;
// The middle of the budget, after leadPx and before tailPx — the
// part that actually sweeps card 0 -> last. See the carousel field's
// doc comment in timeline.ts for why lead/tail exist.
const SWEEP_PX = FINCAP.carousel!.scrollPx - LEAD_PX - TAIL_PX;
const EASE = 0.09;

/* Reference stack model — ported from
   public/html-sections/14-financial-capital.html (which is itself a port
   of continuous-scroll-stack-carousel-loading-fixed.html). Each card's
   CENTRE is placed at a fraction of the viewport height: the active card
   mid-screen, the next card parked on the very bottom edge with a
   screen-proportional gap, the one after it already creeping in during
   the same move so the gap can never grow. The outgoing card sinks a
   little and fades fully OUT before the incoming card lands, so it is
   never seen through the now-opaque (ACTIVE_O) active card. Every
   card walks the SAME path for a given distance from the active index,
   so spacing can't drift after repeated transitions. */
const ACTIVE_C = 0.5;
const PREVIEW_C = 0.989;
const QUEUE_C = 1.2;
const ACTIVE_S = 1.0;
const PREVIEW_S = 0.881;
const QUEUE_S = 0.84;
const EXIT_C = 0.57;
const EXIT_S = 0.8;
const ACTIVE_O = 1;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

function stateForRel(rel: number): { c: number; s: number; o: number } {
  if (rel <= 0 && rel >= -1) {
    // active -> sink & vanish (eased fade-out over the first ~42%)
    const te = ease(-rel);
    return {
      c: lerp(ACTIVE_C, EXIT_C, te),
      s: lerp(ACTIVE_S, EXIT_S, te),
      o: ACTIVE_O * (1 - ease(clamp01(-rel / 0.42))),
    };
  }
  if (rel > 0 && rel <= 1) {
    // preview -> active (full while parked, eases to ACTIVE_O as it lands)
    const ta = ease(1 - rel);
    return { c: lerp(PREVIEW_C, ACTIVE_C, ta), s: lerp(PREVIEW_S, ACTIVE_S, ta), o: lerp(1, ACTIVE_O, ta) };
  }
  if (rel > 1 && rel <= 2) {
    // queue -> preview (creeps in during the same move)
    const tq = ease(2 - rel);
    return { c: lerp(QUEUE_C, PREVIEW_C, tq), s: lerp(QUEUE_S, PREVIEW_S, tq), o: 1 };
  }
  if (rel > 2) {
    // waiting below the fold; ramp opacity in over rel 2.0..2.4 rather
    // than snapping 0->1 (that snap flashed the card's top sliver).
    return { c: QUEUE_C + (rel - 2) * 0.28, s: QUEUE_S, o: clamp01(1 - (rel - 2) / 0.4) };
  }
  // already gone, fully covered
  return { c: EXIT_C, s: EXIT_S, o: 0 };
}

// The source wraps only the FIRST stat's number in <em> (a gold
// accent color via .s-fincap__stat strong em) — a deliberate
// highlight, kept here: the first stat of every card renders its
// value in <em>. `money` prefixes "LKR "; `unit` ("Bn" / "Mn" / "%")
// renders in a trailing <small>.
type Stat = { money?: boolean; value: string; unit?: string; label: string };
type Card = { title: string; body: string; link: string; image: string; stats: Stat[] };

// "Explore More" targets: one local report-extract PDF per capital in
// public/pdf/home/14-financial-capital/ (sourced from doc/new pdf crsl).
// All open in a new tab. An empty link would render as plain text (no anchor).
const CARDS: Card[] = [
  {
    title: "Financial Capital",
    body: "Financial resources generated and deployed to sustain operations, drive growth and deliver long term value to stakeholders.",
    link: "/pdf/home/14-financial-capital/financial-capital.pdf",
    image: "/fincap/capitals/financial-capital.png",
    stats: [
      { money: true, value: "67.1", unit: "Bn", label: "Revenue" },
      { money: true, value: "5.9", unit: "Bn", label: "Profit Before Tax" },
      { value: "12.3", unit: "%", label: "ROE" },
    ],
  },
  {
    title: "Natural Capital",
    body: "Natural resources and ecosystems that support our operations, with a focus on responsible use and environmental stewardship.",
    link: "/pdf/home/14-financial-capital/natural-capital.pdf",
    image: "/fincap/capitals/natural-capital.png",
    stats: [
      { value: "77", unit: "%", label: "Renewable Energy usage" },
      { value: "16", unit: "%", label: "Sustainable Water Sourcing" },
      { value: ">36,000", label: "Trees Planted" },
    ],
  },
  {
    title: "Social and Relationship Capital",
    body: "Connections, trust and partnerships built with customers, suppliers, communities and other stakeholders.",
    link: "/pdf/home/14-financial-capital/social-and-relationship-capital.pdf",
    image: "/fincap/capitals/social-and-relationship-capital.png",
    stats: [
      { value: ">600", label: "Customers" },
      { value: ">500", label: "Suppliers" },
      { money: true, value: "52.7", unit: "Mn", label: "Investment in CSR" },
    ],
  },
  {
    title: "Intellectual Capital",
    body: "Knowledge, expertise, innovation and processes that enhance efficiency and drive competitive advantage.",
    link: "/pdf/home/14-financial-capital/intellectual-capital.pdf",
    image: "/fincap/capitals/intellectual-capital.png",
    stats: [
      { money: true, value: "261", unit: "Mn", label: "Investment in R&D" },
      { value: "32", label: "No of Certifications" },
      { value: "14", label: "New Products Launched" },
    ],
  },
  {
    title: "Human Capital",
    body: "Skills, experience and wellbeing of our people, enabling performance, innovation and organisational resilience.",
    link: "/pdf/home/14-financial-capital/human-capital.pdf",
    image: "/fincap/capitals/human-capital.png",
    stats: [
      { value: "2,084", label: "No of Employees" },
      { money: true, value: "5.58", unit: "Bn", label: "Payments to Employees" },
      { value: "64,893", label: "Total Training Hours" },
    ],
  },
  {
    title: "Manufactured Capital",
    body: "Our production facilities, infrastructure and equipment that underpin efficient and high quality operations.",
    link: "/pdf/home/14-financial-capital/manufactured-capital.pdf",
    image: "/fincap/capitals/manufactured-capital.png",
    stats: [
      { money: true, value: "16.17", unit: "Bn", label: "Total Property Plant & Equipment" },
      { money: true, value: "4.15", unit: "Bn", label: "Capital Expenditure" },
      { money: true, value: "1.2", unit: "Bn", label: "Cost Savings Through Lean Initiatives" },
    ],
  },
  {
    title: "Digital Capital",
    body: "Technology, systems and data capabilities that enable digital transformation, innovation and smarter decision making.",
    link: "/pdf/home/14-financial-capital/digital-capital.pdf",
    image: "/fincap/capitals/digital-capital.png",
    stats: [
      { money: true, value: "70.5", unit: "Mn", label: "Investment in Digital Platforms" },
      { money: true, value: "11.7", unit: "Mn", label: "Digital Marketing Spend" },
      { value: "170", unit: "%", label: "Increase in Website Traffic" },
    ],
  },
];

export default function FinancialCapitalLayer() {
  const ref = useSectionLayer(FINCAP, { interactiveDuringEnter: true });
  const cardRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    let rafId = 0;
    let current: number | null = null;
    const pxPerFrame = readPxPerFrame();
    const startPx = scrollPxForFrame(FINCAP.settledFrame, pxPerFrame);
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // damping toward the scroll target (1 = snap, for reduced motion).
    // Named `damp`, not `ease`, so it doesn't shadow the module-level
    // ease() curve that stateForRel() uses.
    const damp = reduceMotion ? 1 : EASE;

    const tick = () => {
      rafId = requestAnimationFrame(tick);

      // Dead zones on each side of the sweep: held at card 0 for the
      // first LEAD_PX (a beat after the freeze before anything moves),
      // held at the last card for the final TAIL_PX (a beat once
      // finished before scroll hands back to the frame timeline).
      const sweepPx = Math.min(Math.max(window.scrollY - startPx - LEAD_PX, 0), SWEEP_PX);
      const target = (sweepPx / SWEEP_PX) * (CARD_COUNT - 1);
      if (current === null) current = target;
      current += (target - current) * damp;
      if (Math.abs(target - current) < 0.0004) current = target;

      // The clipping stage is the whole viewport, so the positioning
      // unit is the viewport height — this keeps the active/next gap in
      // proportion at every screen size and parks the next card on the
      // real bottom edge.
      const V = window.innerHeight || 1;
      const activeIndex = Math.min(Math.max(Math.round(current), 0), CARD_COUNT - 1);

      for (let index = 0; index < CARD_COUNT; index += 1) {
        const card = cardRefs.current[index];
        if (!card) continue;
        const rel = index - current;
        const st = stateForRel(rel);
        // put the card's own centre at st.c of the viewport height; the
        // card is anchored top:0, so subtract half its height.
        const ty = st.c * V - card.offsetHeight / 2;
        card.style.transform = `translate3d(0, ${ty.toFixed(2)}px, 0) scale(${st.s.toFixed(4)})`;
        card.style.opacity = st.o.toFixed(3);
        // later cards sit in front, so the incoming card covers the one
        // it replaces instead of sliding out from behind it.
        card.style.zIndex = String(index + 10);
        card.style.visibility = rel < -0.55 || rel > 2.45 ? "hidden" : "visible";
        if (index === activeIndex) card.removeAttribute("aria-hidden");
        else card.setAttribute("aria-hidden", "true");
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      className="lab-layer s-fincap"
      ref={ref}
      data-section={FINCAP.id}
      data-initial-hidden="true"
      aria-labelledby="fincap-title"
    >
      <div className="s-fincap__stage">
        <header className="s-fincap__intro">
          <h1 className="s-fincap__title" id="fincap-title">
            Capitals Management
          </h1>
          <p className="s-fincap__lede">
            Our capitals form the foundation of sustainable value creation at Haycarb. Through the
            effective management of our capitals we strengthen resilience, drive innovation and
            create long term value for all stakeholders as we continue to move Beyond the Beyond.
          </p>
        </header>

        <section className="s-fincap__cards" aria-label="Capitals Management highlights">
          {CARDS.map((card, index) => (
            <article
              key={index}
              // eslint-disable-line react/no-array-index-key
              className="s-fincap__card"
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
            >
              <div className="s-fincap__card-upper">
                <div
                  className="s-fincap__card-image"
                  style={{ backgroundImage: `url("${card.image}")` }}
                  aria-hidden="true"
                />
                <div className="s-fincap__card-body">
                  <h2>{card.title}</h2>
                  <p>{card.body}</p>
                </div>
                {card.link ? (
                  <a
                    className="btn btn--ghost s-fincap__cta"
                    href={card.link}
                    aria-label={`Explore more: ${card.title}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Explore More</span>
                  </a>
                ) : (
                  <span className="btn btn--ghost s-fincap__cta s-fincap__cta--nolink" aria-hidden="true">
                    <span>Explore More</span>
                  </span>
                )}
              </div>
              <div className="s-fincap__card-lower">
                <div className="s-fincap__rule" />
                <div className="s-fincap__stats">
                  {card.stats.map((stat, statIndex) => (
                    <div className="s-fincap__stat" key={statIndex}>
                      {/* eslint-disable-line react/no-array-index-key */}
                      <strong>
                        {stat.money ? "LKR " : null}
                        {statIndex === 0 ? <em>{stat.value}</em> : stat.value}
                        {stat.unit ? (
                          <small>{stat.unit === "%" ? stat.unit : ` ${stat.unit}`}</small>
                        ) : null}
                      </strong>
                      <span>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
