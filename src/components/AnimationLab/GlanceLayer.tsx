"use client";

/* =========================================================
   ANIMATION LAB — section 5, "Haycarb at a Glance"
   =========================================================

   Markup ported from html-templates/final/06-glance.html (class
   root .s-glance2, replacing the old simpler .s-glance layout this
   file used to carry — see git history for that version). Kept the
   source's own documented inconsistency of setting the title in
   --font-ui rather than the project serif; reproduced as drawn, not
   "corrected" to match the other sections (see lab.css).

   No <img> background — the scrubbed <canvas> is the background
   here, same swap as every other section.

   Reveal: the section's own opacity/offset comes from
   useSectionLayer (standard pattern). Internal content gets focused
   frame-driven group reveals, all windows kept
   strictly inside this section's own enter (240-270) / exit
   (273-292) frames — same lesson as the Governance bug: a child
   stagger that resolves before the parent is visible, or crosses
   the settle frame, reads as broken even though the math is right.
   GLANCE's own enter window was widened from a tight 2-frame slot to
   30 frames specifically to give this richer content room (see the
   comment on this section's entry in timeline.ts). Counters are
   frame-driven (Math.floor(target * t)), not the source's
   requestAnimationFrame wall-clock version, same conversion as
   GovernanceLayer.tsx's stat cards. Exit mirrors the entrance in
   reverse, block by block (standing rule), while the pill row stays as
   one group under the section-level reveal so the complete navigation set
   appears together.

   The ambient ring pulse behind the play button is the one thing
   NOT converted to frame-driven — it's a continuous decorative loop
   (2.8s infinite), not a scroll reveal, same precedent as every
   other section's purely-decorative always-on motion. Video dialog
   is ported the same way HeroLayer.tsx's own popup works: a
   dialogRef and showModal(), loading a YouTube embed
   (SUMMARY_VIDEO_SRC below) — same as HeroLayer's popup now does. */

import { useEffect, useRef } from "react";
import { SECTIONS, progressBetween, easeOut } from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";

const GLANCE = SECTIONS[5];
const EXIT_START = GLANCE.exit!.frames[0];
const POPUP_CLOSE_AFTER_FRAMES = 5;

// All windows below stay strictly inside the section's own enter
// (261-270) / exit (273-292) frames — see the file header for why.
// The parent's own visibility only starts at 261 (matching the
// camera hold), so these overlap heavily rather than running in
// sequence — same technique as Governance's 5 stat cards packing
// into a tight parent window.
const TITLE_WINDOW: [number, number] = [263, 266];
const QUOTE_WINDOW: [number, number] = [265, 268];
const BODY_WINDOW: [number, number] = [267, 271];
const PILLS_WINDOW: [number, number] = [271, 275];

const TITLE_EXIT_WINDOW: [number, number] = [296, 302];
const QUOTE_EXIT_WINDOW: [number, number] = [291, 297];
const BODY_EXIT_WINDOW: [number, number] = [283, 291];
const PILLS_EXIT_WINDOW: [number, number] = [279, 285];

const STATS = [
  { target: 16, unit: "%", label: "Global Market Share" },
  { target: 50, unit: "+", label: "Years of Industry Experience" },
  { target: 1500, unit: "+", label: "Sustainable Solutions" },
  { target: 50, unit: "+", label: "Countries Served Worldwide" },
];

const PILLS = [
  { label: "Haycarb in Focus", icon: "Web Icons-09.svg", href: "/pdf/home/06-key-data-points/Haycarb%20in%20Focus.pdf" },
  { label: "Products", icon: "Web Icons-10.svg", href: "/pdf/home/06-key-data-points/Products.pdf" },
  { label: "Awards", icon: "Web Icons-11.svg", href: "/pdf/home/06-key-data-points/Awards.pdf" },
  { label: "Milestones", icon: "Web Icons-12.svg", href: "/pdf/home/06-key-data-points/Milestones%20-%2053%20Years%20of%20Resilience%2C%20Growth%20and%20Value%20Creation.pdf" },
];

function fadeRiseAt(
  frame: number,
  entering: boolean,
  enterWindow: [number, number],
  exitWindow: [number, number]
): number {
  return entering
    ? easeOut(progressBetween(frame, enterWindow[0], enterWindow[1]))
    : 1 - easeOut(progressBetween(frame, exitWindow[0], exitWindow[1]));
}

// "Annual report summary" video from the client's resource list (AR
// Crossword Puzzle PDF, Resources appendix). Loaded into the iframe
// only while the dialog is open; cleared on close so it stops playing.
const SUMMARY_VIDEO_SRC =
  "https://www.youtube.com/embed/-eC8tVsda08?autoplay=1&rel=0";

export default function GlanceLayer() {
  const ref = useSectionLayer(GLANCE);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoFrameRef = useRef<HTMLIFrameElement>(null);
  const currentFrameRef = useRef(GLANCE.settledFrame);
  const dialogOpenedAtFrameRef = useRef<number | null>(null);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const quoteRef = useRef<HTMLQuoteElement>(null);
  const statValueRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLUListElement>(null);
  const mobileSolidRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mobileSolidRef.current = window.matchMedia("(max-width: 700px)").matches;
  }, []);

  // The stage scrolls internally on <=1100px. `data-lenis-prevent` stops
  // Lenis scrubbing the timeline while you read it — but hardcoded on it
  // also swallows the gesture that should hand back to the page at the
  // reader's edges (the "can't scroll up after coming back" / "sometimes
  // won't move" bug on real phones). Instead decide per gesture: prevent
  // ONLY when the reader can actually consume the scroll in the
  // direction the finger is going. At either edge, in the direction that
  // would leave the reader, let it through so the timeline moves.
  // Desktop (>1100) keeps the attribute always on, exactly as before.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const compact = window.matchMedia("(max-width: 1100px)");

    const readerConsumes = (dir: number) => {
      const max = stage.scrollHeight - stage.clientHeight;
      if (max <= 4) return false;
      if (dir > 0) return stage.scrollTop < max - 1; // scrolling down
      if (dir < 0) return stage.scrollTop > 1; // scrolling up
      return false;
    };
    const apply = (dir: number) => {
      if (!compact.matches) {
        stage.setAttribute("data-lenis-prevent", "");
        return;
      }
      if (readerConsumes(dir)) stage.setAttribute("data-lenis-prevent", "");
      else stage.removeAttribute("data-lenis-prevent");
    };

    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
      if (compact.matches && stage.scrollHeight - stage.clientHeight > 4) {
        // Claim the first move before Lenis can advance the page timeline.
        // The next move releases this only when the reader is at its edge.
        stage.setAttribute("data-lenis-prevent", "");
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? touchY;
      apply(touchY - y); // finger up = positive = scrolling content down
      touchY = y;
    };
    const onWheel = (e: WheelEvent) => apply(e.deltaY);

    apply(0);
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: true });
    stage.addEventListener("wheel", onWheel, { passive: true });
    const onMediaChange = () => apply(0);
    compact.addEventListener("change", onMediaChange);
    return () => {
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("wheel", onWheel);
      compact.removeEventListener("change", onMediaChange);
    };
  }, []);

  useFrameEffect((frame) => {
    currentFrameRef.current = frame;
    const mobileSolid = mobileSolidRef.current;
    const openedAt = dialogOpenedAtFrameRef.current;
    if (
      dialogRef.current?.open &&
      openedAt !== null &&
      Math.abs(frame - openedAt) >= POPUP_CLOSE_AFTER_FRAMES
    ) {
      dialogRef.current.close();
      dialogOpenedAtFrameRef.current = null;
    }

    const entering = frame < EXIT_START;

    if (titleRef.current) {
      const t = mobileSolid
        ? 1
        : fadeRiseAt(frame, entering, TITLE_WINDOW, TITLE_EXIT_WINDOW);
      titleRef.current.style.opacity = String(t);
      titleRef.current.style.transform = `translateY(${12 * (1 - t)}px)`;
    }

    if (quoteRef.current) {
      const t = mobileSolid
        ? 1
        : fadeRiseAt(frame, entering, QUOTE_WINDOW, QUOTE_EXIT_WINDOW);
      quoteRef.current.style.opacity = String(t);
      quoteRef.current.style.transform = `translateY(${10 * (1 - t)}px)`;
    }

    const bodyT = mobileSolid
      ? 1
      : fadeRiseAt(frame, entering, BODY_WINDOW, BODY_EXIT_WINDOW);
    if (bodyRef.current) {
      bodyRef.current.style.opacity = String(bodyT);
      bodyRef.current.style.transform = `translateY(${18 * (1 - bodyT)}px)`;
    }

    for (let index = 0; index < STATS.length; index += 1) {
      const valueEl = statValueRefs.current[index];
      if (valueEl) {
        valueEl.textContent = String(
          mobileSolid
            ? STATS[index].target
            : Math.floor(STATS[index].target * Math.min(Math.max(bodyT, 0), 1)),
        );
      }
    }

    if (pillsRef.current) {
      const t = mobileSolid
        ? 1
        : fadeRiseAt(frame, entering, PILLS_WINDOW, PILLS_EXIT_WINDOW);
      pillsRef.current.style.opacity = String(t);
      pillsRef.current.style.transform = `translateY(${14 * (1 - t)}px)`;
    }

  });

  return (
    <div
      className="lab-layer s-glance2"
      ref={ref}
      data-section={GLANCE.id}
      data-initial-hidden="true"
      aria-labelledby="glance2-title"
    >
      {/* data-lenis-prevent is applied/removed by the effect above, not
          hardcoded: it must let go at the reader's bottom edge and when
          the content fits, or a real-phone touch gets trapped. */}
      <div className="s-glance2__stage" ref={stageRef}>
        <h2 className="s-glance2__title" id="glance2-title" ref={titleRef}>
          Haycarb at a Glance
        </h2>

        <blockquote className="s-glance2__quote" ref={quoteRef}>
          As a global activated carbon manufacturer, Haycarb is driven by technical
          excellence, customer centricity, innovation and sustainable business
          practices, looking beyond conventional boundaries to advance activated
          carbon solutions and create lasting value.
        </blockquote>

        <div className="s-glance2__body" ref={bodyRef}>
          <div className="s-glance2__left">
            <ul className="s-glance2__stats" aria-label="Haycarb highlights">
              {STATS.map((stat, index) => (
                <li
                  key={stat.label}
                  className="s-glance2__stat lab-shine"
                >
                  <p className="s-glance2__stat-value">
                    <span
                      ref={(node) => {
                        statValueRefs.current[index] = node;
                      }}
                    >
                      0
                    </span>
                    <span className="s-glance2__stat-unit">{stat.unit}</span>
                  </p>
                  <p className="s-glance2__stat-label">{stat.label}</p>
                </li>
              ))}
            </ul>

            <p className="s-glance2__note">
              Together, these strengths reflect the scale and capabilities behind
              our ability to serve diverse industries and evolving needs.
            </p>
          </div>

          <div
            className="s-glance2__video"
            tabIndex={0}
            role="button"
            aria-haspopup="dialog"
            aria-controls="glance-summary-dialog"
            aria-label="Play annual report summary video"
            onClick={() => {
              dialogOpenedAtFrameRef.current = currentFrameRef.current;
              if (videoFrameRef.current) videoFrameRef.current.src = SUMMARY_VIDEO_SRC;
              dialogRef.current?.showModal();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                dialogOpenedAtFrameRef.current = currentFrameRef.current;
                if (videoFrameRef.current) videoFrameRef.current.src = SUMMARY_VIDEO_SRC;
                dialogRef.current?.showModal();
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/glance/report-mockup.webp"
              alt="Beyond the Beyond annual report book preview on a desert horizon"
              decoding="async"
            />
            <span className="s-glance2__play" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="m8 5 11 7-11 7V5Z" />
              </svg>
            </span>
            <div className="s-glance2__video-copy">
              <p className="s-glance2__video-eyebrow">Annual Report Summary</p>
              <p className="s-glance2__video-title">Impact in Brief</p>
            </div>
          </div>
        </div>

        <dialog
          ref={dialogRef}
          className="s-glance2__video-dialog"
          id="glance-summary-dialog"
          aria-label="Annual Report Summary video"
          onClick={(event) => {
            if (event.target === dialogRef.current) dialogRef.current?.close();
          }}
          onClose={() => {
            dialogOpenedAtFrameRef.current = null;
            if (videoFrameRef.current) videoFrameRef.current.src = "";
          }}
        >
          <iframe
            ref={videoFrameRef}
            title="Annual Report Summary video"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
          <form method="dialog">
            <button
              className="s-glance2__video-dialog-close"
              type="submit"
              aria-label="Close video"
            >
              ×
            </button>
          </form>
        </dialog>

        <ul className="s-glance2__pills" ref={pillsRef} aria-label="Haycarb at a Glance links">
          {PILLS.map((pill) => (
            <li
              key={pill.label}
            >
              <a
                className="btn btn--watch s-glance2__pill"
                href={pill.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={pill.label}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/glance/web-icons/${encodeURIComponent(pill.icon)}`} alt="" aria-hidden="true" />
                {pill.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
