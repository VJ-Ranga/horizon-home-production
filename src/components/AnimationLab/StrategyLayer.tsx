"use client";

/* Foreground port of final/15 Horizon of Progress.html. The template image is omitted;
   the shared video canvas supplies the boat background. The
   .s-strategy__scrim radial dark vignette was removed 2026-08-25 per VJ.

   ONE CONTINUOUS PAGE (VJ, 2026-08-31): the content — title, five
   Strategic Pillars, three Risks & Opportunities — is taller than one
   viewport. It used to be two viewport "pages" that snapped A -> B;
   now the whole .s-strategy__panel simply glides up by exactly its
   overflow (scrollHeight - viewport) as the reader scrolls through the
   section's virtual pinned budget. The background advances to the pin
   frame first, then stays fixed while the panel completes its movement
   and the layer exits.

   The glide is scroll-driven, not frame-derived: it reads raw
   window.scrollY (the same coordinate space scrollPxForFrame uses)
   from the px where the pin frame begins, across the virtual span,
   eased toward the target with EASE 0.12 in its own rAF loop. */

import { useEffect, useRef } from "react";
import { SECTIONS, readPxPerFrame, scrollPxForFrame } from "./timeline";
import { useSectionLayer } from "./useFrameTimeline";

const STRATEGY = SECTIONS[16];
// The scroll distance over which the panel glides from its top to its
// fully-scrolled-up position. See the scrollThrough doc comment in
// timeline.ts (leadPx/tailPx are 0 now, so scrollPx is the whole sweep).
const EASE = 0.12;
// Breathing room kept below the last CTA when the panel is fully
// glided up, so it never sits flush against the viewport edge.
const BOTTOM_PAD = 64;

const PILLARS = [
  {
    title: "Market Growth",
    copy: "Strategic global expansion, product innovation and tech investment drive Haycarb’s market growth and value added carbon leadership.",
    metrics: [["LKR 67.1 Bn", "Revenue"], ["16%", "Market Share"]],
  },
  {
    title: "Innovation Led Growth",
    copy: "Haycarb advanced its innovation efforts by enhancing R&D capabilities, fostering a learning culture and applying data driven insights to support future growth.",
    metrics: [["14", "New Products Introduced"], ["LKR 261 Mn", "Investment in R&D"]],
  },
  {
    title: "Global Supply Chain",
    copy: "Haycarb strengthened supply chain resilience through regional diversification, sustainable sourcing and strategic partnerships across key raw material markets.",
    metrics: [["LKR 19 Mn", "Investment in Supplier Development"], ["> 500", "Number of Suppliers"]],
  },
  {
    title: "Purpose Driven Committed Teams",
    copy: "Teams are empowered through fair pay, wellbeing and growth, fostering innovation, collaboration and accountability to drive long term value and ESG goals.",
    metrics: [["64,893", "Total Training Hours"], ["2,084", "No of Employees"]],
  },
  {
    title: "ESG Mindset",
    copy: "Haycarb PLC’s ESG strategy focuses on sustainable innovation, and environmental stewardship across all operations and communities.",
    metrics: [["77%", "Energy Requirements Fulfilled Through Renewable Energy"], ["61%", "Proportion of Charcoal Sustainably Sourced"]],
  },
];

const RISKS = [
  {
    className: "s-strategy__risk--coral",
    icon: "business",
    title: "Business Risks",
    items: ["Raw material procurement risk", "Interest rate risk", "Compliance risk", "Geopolitical dynamics", "Cyber Security risk"],
  },
  {
    className: "s-strategy__risk--sage",
    icon: "sustainability",
    title: "Sustainability Related Risks",
    items: ["Environmental compliance and regulatory tightening risk", "Workforce capability and skilled labour availability risk", "Occupational health and safety risk"],
  },
  {
    className: "s-strategy__risk--lilac",
    icon: "climate",
    title: "Climate Related Risks and Opportunities",
    items: ["Climate risk to raw material supply", "Climate related water risk arising from changes in water availability, water quality and hydrological variability", "Opportunity for scaling renewable energy adoption driven by fossil fuel price volatility and supply disruption", "Opportunity due to growing market demand for value added carbons used in energy storage and advanced water & air purification"],
  },
];

const ESG_EXPLORE_URL = "/pdf/home/17-strategy/Strategy.pdf";
const RISKS_EXPLORE_URL = "/pdf/home/17-strategy/Risks%20and%20Opportunities.pdf";
const PILLAR_ICON_FILES = [
  "Web Icons-19.svg",
  "Web Icons-20.svg",
  "Web Icons-21.svg",
  "Web Icons-22.svg",
  "Web Icons-23.svg",
] as const;
const RISK_ICON_FILES = {
  business: "Web Icons-24.svg",
  sustainability: "Web Icons-25.svg",
  climate: "Web Icons-26.svg",
} as const;

function ChartIcon({ file }: { file: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/strategy/web-icons/${encodeURIComponent(file)}`} alt="" aria-hidden="true" />;
}

function RiskIcon({ type }: { type: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/strategy/web-icons/${encodeURIComponent(RISK_ICON_FILES[type as keyof typeof RISK_ICON_FILES])}`} alt="" aria-hidden="true" />;
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M15 3v4h4M9 12h6M9 16h4" />
    </svg>
  );
}

export default function StrategyLayer() {
  const ref = useSectionLayer(STRATEGY);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId = 0;
    let current: number | null = null;
    const pxPerFrame = readPxPerFrame();
    // The px position where the virtual pinned panel movement begins.
    const pinFrame = STRATEGY.scrollThrough!.pinFrame ?? STRATEGY.settledFrame;
    const leadPx = (pinFrame - STRATEGY.settledFrame) * pxPerFrame;
    const exitPx =
      (STRATEGY.scrollThrough!.virtualExitFrames ?? 0) * pxPerFrame;
    // Phones: the panel is much taller than the pinned budget, so a glide
    // that only uses the 60-frame virtual span races the finger (~3.7x).
    // Design is fixed, so widen the runway instead — begin the glide at
    // the settle (adding the pre-pin lead) rather than at the pin. The
    // exit span is still held back so the glide finishes before the fade.
    // Desktop keeps the original pin-to-virtual-span mapping exactly.
    const mobile =
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 700px)").matches;
    const startPx = scrollPxForFrame(
      mobile ? STRATEGY.settledFrame : pinFrame,
      pxPerFrame,
    );
    const sweepPx = mobile
      ? STRATEGY.scrollThrough!.scrollPx - exitPx
      : STRATEGY.scrollThrough!.scrollPx - leadPx - exitPx;
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ease = reduceMotion ? 1 : EASE;

    const tick = () => {
      rafId = requestAnimationFrame(tick);
      const panel = panelRef.current;
      if (!panel) return;

      const target =
        sweepPx > 0
          ? Math.min(Math.max((window.scrollY - startPx) / sweepPx, 0), 1)
          : 0;
      if (current === null) current = target;
      current += (target - current) * ease;
      if (Math.abs(target - current) < 0.0004) current = target;

      // Glide the whole panel up by exactly its overflow, so t = 1
      // lands its bottom edge (last CTA + BOTTOM_PAD) at the viewport
      // bottom. No snapping — one continuous move.
      const overflow = Math.max(
        panel.scrollHeight - window.innerHeight + BOTTOM_PAD,
        0
      );
      panel.style.transform = `translate3d(0, ${(-current * overflow).toFixed(2)}px, 0)`;
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div
      className="lab-layer s-strategy"
      ref={ref}
      data-section={STRATEGY.id}
      data-initial-hidden="true"
      aria-labelledby="strategy-title"
    >
      <div className="s-strategy__panel" ref={panelRef}>
        <header className="s-strategy__header">
          <h1 className="s-strategy__title" id="strategy-title">Our Strategy and Risks &amp; Opportunities</h1>
        </header>

        <section aria-labelledby="pillars-title">
          <h2 className="s-strategy__section-title" id="pillars-title">Strategic Pillars</h2>
          <div className="s-strategy__pillars">
            {PILLARS.map((pillar, index) => (
              <article className="s-strategy__card s-strategy__pillar" key={pillar.title}>
                <div className="s-strategy__icon"><ChartIcon file={PILLAR_ICON_FILES[index]} /></div>
                <h3 className="s-strategy__card-title">{pillar.title}</h3>
                <p className="s-strategy__card-copy">{pillar.copy}</p>
                <hr className="s-strategy__rule" />
                {pillar.metrics.map(([value, label]) => (
                  <div key={label}>
                    <p className="s-strategy__metric">{value}</p>
                    <p className="s-strategy__metric-label">{label}</p>
                  </div>
                ))}
              </article>
            ))}
          </div>
        </section>

        <div className="s-strategy__actions s-strategy__actions--pillars">
          <a className="s-strategy__cta" href={ESG_EXPLORE_URL} target="_blank" rel="noopener noreferrer">
            <FileIcon />
            Explore More
          </a>
        </div>

        <section aria-labelledby="risks-title">
          <h2 className="s-strategy__section-title" id="risks-title">Risks and Opportunities</h2>
          <div className="s-strategy__risks">
            {RISKS.map((risk) => (
              <article className={`s-strategy__card s-strategy__risk ${risk.className}`} key={risk.title}>
                <div className="s-strategy__risk-head">
                  <span className={`s-strategy__risk-icon s-strategy__risk-icon--${risk.icon}`}><RiskIcon type={risk.icon} /></span>
                  <h3 className="s-strategy__card-title">{risk.title}</h3>
                </div>
                <ul className="s-strategy__risk-list">{risk.items.map((item) => <li key={item}>{item}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>

        <div className="s-strategy__actions s-strategy__actions--risks">
          <a className="s-strategy__cta" href={RISKS_EXPLORE_URL} target="_blank" rel="noopener noreferrer">
            <FileIcon />
            Explore More
          </a>
        </div>
      </div>
    </div>
  );
}
