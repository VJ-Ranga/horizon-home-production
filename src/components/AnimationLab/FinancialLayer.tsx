"use client";

/* =========================================================
   ANIMATION LAB — section 6, "Financial Highlights"
   =========================================================

   Replaced 2026-08-24 with html-templates/final/Artboard 3.html —
   Artboard 3 is the source of truth for this section now. VJ:
   "it have funtion so check and add need to fully working" — the
   metric-pill click → chart-swap interaction (the artboard's own
   registry: every pill carries data-chart/data-chart-label, click
   swaps the centre chart with a fade-out/pop-in) is ported below as
   React state instead of the source's own vanilla-JS probe/timer,
   same interaction, same 160ms swap delay and 480ms pop-in.

   The probe/fallback half of the source's script (an Image() preload
   that falls back to the default chart if a metric's own file 404s)
   is NOT ported. Every metric has a dedicated chart file. The swap
   choreography (fade out -> swap alt text -> pop in) runs on every
   metric click.

   No background image here — the source's own placeholder
   ("boardroom over city at dusk", TODO'd pending real footage) is
   dropped in favour of the shared scrubbed canvas, same convention
   as every other section (VJ, 2026-08-24: "u fogot to drop backgrnd
   and overlay color"). */

import { Fragment, useEffect, useRef, useState } from "react";
import {
  SECTIONS,
  readPxPerFrame,
  staggerProgressAt,
  virtualEnterProgressAtScrollPx,
  virtualExitProgressAtScrollPx,
} from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";
import { createHoverAudioPlayer } from "./hoverAudio";
import { FinancialActionButton } from "./FinancialActionButton";
import { HORIZON_ROUTES, horizonUrl } from "@/lib/horizon";

const FINANCIAL = SECTIONS[7];
const SWAP_DELAY_MS = 160;
const ENTER_DURATION_MS = 480;

type Metric = readonly [name: string, value: string, chartLabel: string, chart: string, audio: string];

const PERFORMANCE: readonly Metric[] = [
  ["Revenue", "LKR 67.1 Bn", "Revenue — 5-year trend", "/charts/revenue.webp", "/audio/08-financial/revenue.mp3"],
  ["Profit Before Tax", "LKR 5.9 Bn", "Profit before tax — 5-year trend", "/charts/profit-before-tax.webp", "/audio/08-financial/profit-before-tax.mp3"],
  ["Profit After Tax", "LKR 4.3 Bn", "Profit after tax — 5-year trend", "/charts/profit-after-tax.webp", "/audio/08-financial/profit-after-tax.mp3"],
  ["Total Assets", "LKR 63.8 Bn", "Total assets — 5-year trend", "/charts/total-assets.webp", "/audio/08-financial/total-assets.mp3"],
  ["Total Equity", "LKR 29.37 Bn", "Total equity — 5-year trend", "/charts/equity.webp", "/audio/08-financial/total-equity.mp3"],
];

const RATIOS: readonly Metric[] = [
  ["Return on Equity", "12.3%", "Return on equity — 5-year trend", "/charts/return-on-equity.webp", "/audio/08-financial/return-on-equity.mp3"],
  ["Earnings Per Share", "LKR 12.18", "Earnings per share — 5-year trend", "/charts/earnings-per-share.webp", "/audio/08-financial/earnings-per-share.mp3"],
  ["PBT Margin", "8.8%", "PBT margin — 5-year trend", "/charts/pbt-margin.webp", "/audio/08-financial/pbt-margin.mp3"],
  ["Current Ratio", "1.74 times", "Current ratio — 5-year trend", "/charts/current-ratio.webp", "/audio/08-financial/current-ratio.mp3"],
  ["Gearing Ratio", "37.5%", "Gearing ratio — 5-year trend", "/charts/gearing.webp", "/audio/08-financial/gearing-ratio.mp3"],
];

function MetricColumn({
  title,
  label,
  items,
  active,
  onSelect,
  muted,
  onToggleMute,
  revealStart,
  chartPhase,
  showInlineCharts,
}: {
  title: string;
  label: string;
  items: readonly Metric[];
  active: Metric;
  onSelect: (item: Metric) => void;
  muted: boolean;
  onToggleMute: () => void;
  revealStart: number;
  chartPhase: "idle" | "swapping" | "entering";
  showInlineCharts: boolean;
}) {
  const chartClass = chartPhase === "idle" ? "" : ` is-${chartPhase}`;

  return (
    <section className="s-financial2__col" aria-labelledby={label} data-reveal={revealStart}>
      <div className="s-financial2__colhead">
        <h2 className="s-financial2__coltitle" id={label}>
          {title}
        </h2>
        <button
          className="s-financial2__listen"
          type="button"
          aria-label={muted ? "Unmute financial narration" : "Mute financial narration"}
          aria-pressed={muted}
          onClick={onToggleMute}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 10v4h3l4 3V7l-4 3H4Z" />
            {muted ? (
              <path d="m16 10 4 4m0-4-4 4" />
            ) : (
              <path d="M15 9.5a4 4 0 0 1 0 5M17.5 7a7.5 7.5 0 0 1 0 10" />
            )}
          </svg>
        </button>
      </div>
      <ul className="s-financial2__metrics">
        {items.map((item) => {
          const [name, value, chartLabel, chart, audio] = item;
          return (
            <Fragment key={name}>
              <li>
                <button
                  className={`s-financial2__metric${active[0] === name ? " is-active" : ""}`}
                  type="button"
                  data-chart={chart}
                  data-chart-label={chartLabel}
                  data-audio={audio}
                  aria-pressed={active[0] === name}
                  onClick={() => onSelect(item)}
                >
                  <span className="s-financial2__metric-label">{name}</span>
                  <span className="s-financial2__metric-value">{value}</span>
                </button>
              </li>
              {showInlineCharts && active[0] === name && (
                <li className={`s-financial2__inline-chart${chartClass}`}>
                  <figure>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={`s-financial2__chart-img${chartClass}`}
                      src={active[3]}
                      alt={active[2]}
                      decoding="sync"
                    />
                  </figure>
                </li>
              )}
            </Fragment>
          );
        })}
      </ul>
    </section>
  );
}

export default function FinancialLayer() {
  const ref = useSectionLayer(FINANCIAL);
  const [active, setActive] = useState<Metric>(PERFORMANCE[0]);
  const [audioMuted, setAudioMuted] = useState(false);
  const [chartPhase, setChartPhase] = useState<"idle" | "swapping" | "entering">("idle");
  const [showInlineCharts, setShowInlineCharts] = useState(false);
  const [hoverAudio] = useState(() =>
    createHoverAudioPlayer((src) => new Audio(src))
  );
  const swapTimerRef = useRef<number | null>(null);
  const enterTimerRef = useRef<number | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);

  const [revealStartFrame, revealEndFrame] = FINANCIAL.enter!.frames;

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1100px)");
    const update = () => setShowInlineCharts(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useFrameEffect((frame, _phase, scrollPx) => {
    const element = ref.current;
    if (!element) return;
    const virtualEnter = virtualEnterProgressAtScrollPx(
      FINANCIAL,
      scrollPx,
      readPxPerFrame()
    );
    const virtualExit = virtualExitProgressAtScrollPx(
      FINANCIAL,
      scrollPx,
      readPxPerFrame()
    );
    if (virtualExit !== null || frame >= FINANCIAL.exit!.frames[0]) {
      hoverAudio.stop();
    }
    const animationFrame = virtualEnter === null
      ? frame
      : revealEndFrame + virtualEnter * (FINANCIAL.virtualEnterFrames ?? 0);
    element.style.setProperty(
      "--financial-reveal",
      String(
        Math.max(
          0,
          Math.min(1, (animationFrame - revealStartFrame) / (revealEndFrame - revealStartFrame))
        )
      )
    );

    const finishingEnter = virtualEnter !== null || frame < FINANCIAL.settledFrame;
    const titleProgress = virtualExit !== null
      ? 1 - staggerProgressAt(
          1,
          2,
          FINANCIAL.exit!.frames[0] +
            virtualExit * (FINANCIAL.exit!.frames[1] - FINANCIAL.exit!.frames[0]),
          FINANCIAL.exit!.frames
        )
      : finishingEnter
      ? staggerProgressAt(
          0,
          2,
          animationFrame,
          [revealStartFrame, revealEndFrame + (FINANCIAL.virtualEnterFrames ?? 0)]
        )
      : 1 - staggerProgressAt(1, 2, frame, FINANCIAL.exit!.frames);
    const leadProgress = virtualExit !== null
      ? 1 - staggerProgressAt(
          0,
          2,
          FINANCIAL.exit!.frames[0] +
            virtualExit * (FINANCIAL.exit!.frames[1] - FINANCIAL.exit!.frames[0]),
          FINANCIAL.exit!.frames
        )
      : finishingEnter
      ? staggerProgressAt(
          1,
          2,
          animationFrame,
          [revealStartFrame, revealEndFrame + (FINANCIAL.virtualEnterFrames ?? 0)]
        )
      : 1 - staggerProgressAt(0, 2, frame, FINANCIAL.exit!.frames);

    if (titleRef.current) {
      titleRef.current.style.opacity = String(titleProgress);
      titleRef.current.style.transform = `translateY(${10 * (1 - titleProgress)}px)`;
    }
    if (leadRef.current) {
      leadRef.current.style.opacity = String(leadProgress);
      leadRef.current.style.transform = `translateY(${10 * (1 - leadProgress)}px)`;
    }

  });

  // Mirrors the source's probe.onload -> setTimeout(160) -> swap ->
  // requestAnimationFrame -> is-entering choreography, minus the
  // preload probe itself (see file header for why that half isn't
  // needed yet). Timers cleared on unmount and on rapid re-clicks so
  // a fast double-click can't leave two overlapping animations.
  // The click also plays that metric's narration (click-to-play, was
  // hover-to-play) — including a re-click on the already-active metric,
  // which just replays the audio without re-running the chart swap.
  function selectMetric(item: Metric) {
    hoverAudio.play(item[4]);
    if (item[0] === active[0]) return;
    if (swapTimerRef.current) window.clearTimeout(swapTimerRef.current);
    if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);

    setChartPhase("swapping");
    swapTimerRef.current = window.setTimeout(() => {
      setActive(item);
      setChartPhase("entering");
      enterTimerRef.current = window.setTimeout(() => {
        setChartPhase("idle");
      }, ENTER_DURATION_MS);
    }, SWAP_DELAY_MS);
  }

  useEffect(
    () => {
      [...PERFORMANCE, ...RATIOS].forEach((item) => hoverAudio.preload(item[4]));
      const unlockAudio = () => {
        void hoverAudio.unlock();
      };
      document.addEventListener("pointerdown", unlockAudio, { once: true });
      document.addEventListener("pointerup", unlockAudio, { once: true });
      document.addEventListener("touchstart", unlockAudio, { once: true });
      document.addEventListener("keydown", unlockAudio, { once: true });

      return () => {
        if (swapTimerRef.current) window.clearTimeout(swapTimerRef.current);
        if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
        hoverAudio.stop();
        document.removeEventListener("pointerdown", unlockAudio);
        document.removeEventListener("pointerup", unlockAudio);
        document.removeEventListener("touchstart", unlockAudio);
        document.removeEventListener("keydown", unlockAudio);
      };
    },
    [hoverAudio]
  );

  const chartClass = chartPhase === "idle" ? "" : ` is-${chartPhase}`;

  function toggleAudioMuted() {
    const nextMuted = !audioMuted;
    hoverAudio.setMuted(nextMuted);
    setAudioMuted(nextMuted);
  }

  return (
    <section
      className="lab-layer s-financial2"
      ref={ref}
      data-section={FINANCIAL.id}
      data-initial-hidden="true"
      aria-labelledby="financial2-title"
    >
      <div className="s-financial2__stage">
        <header className="s-financial2__head" data-reveal="0">
          <h1 className="s-financial2__title" id="financial2-title" ref={titleRef}>
            Financial Highlights
          </h1>
          <p className="s-financial2__lead" ref={leadRef}>
            The Financials section presents a clear and reliable overview of Haycarb
            PLC&apos;s performance and value creation for the year, supported by independent
            assurances and aligned with global reporting standards.
          </p>
        </header>

        <div className="s-financial2__grid">
          <MetricColumn
            title="Financial Performance"
            label="financial2-perf-title"
            items={PERFORMANCE}
            active={active}
            onSelect={selectMetric}
            muted={audioMuted}
            onToggleMute={toggleAudioMuted}
            revealStart={0.08}
            chartPhase={chartPhase}
            showInlineCharts={showInlineCharts}
          />

          <section
            className={`s-financial2__chartcard${chartClass}`}
            aria-label="Five year chart for the selected metric"
            data-reveal="0.16"
          >
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={`s-financial2__chart-img${chartClass}`}
                src={active[3]}
                alt={active[2]}
                decoding="sync"
              />
            </figure>
          </section>

          <MetricColumn
            title="Financial Ratios"
            label="financial2-ratios-title"
            items={RATIOS}
            active={active}
            onSelect={selectMetric}
            muted={audioMuted}
            onToggleMute={toggleAudioMuted}
            revealStart={0.24}
            chartPhase={chartPhase}
            showInlineCharts={showInlineCharts}
          />
        </div>

        <nav className="s-financial2__actions" aria-label="Financial report actions" data-reveal="0.58">
          <FinancialActionButton
            href="/pdf/home/08-financial/Financial%20Capital.pdf"
            target="_blank"
            icon="/financial/web-icons/Web%20Icons-13.svg"
            variant="light"
          >
            Explore More
          </FinancialActionButton>
          <FinancialActionButton
            href={horizonUrl(HORIZON_ROUTES.tailorMade)}
            target="_blank"
            icon="/financial/web-icons/Web%20Icons-14.svg"
            variant="watch"
          >
            Interactive Charts &amp; Reports
          </FinancialActionButton>
        </nav>
      </div>
    </section>
  );
}
