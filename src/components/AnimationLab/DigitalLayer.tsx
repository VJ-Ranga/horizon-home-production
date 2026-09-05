"use client";

/* =========================================================
   ANIMATION LAB — section 3, "AI-Enabled Digital Report"
   =========================================================

   Markup ported from html-templates/final/04-digital.html, replacing
   the earlier 03-glance.html port wholesale. Class names are kept
   byte-identical (s-digital2__*) so the two can be diffed against
   each other, and the CSS in lab.css is that file's CSS copied
   across.

   Differences from the template, all structural, none visual:

   1. No .s-digital2__media / background <img>. The template's own
      background is the scrubbed <canvas> here, same swap as every
      other section — see LabScrubber. The global scrim already
      applied to .lab-media covers what .s-digital2__media::after's
      --horizon-scrim did in the template, so it isn't repeated here.
   2. No <section> wrapper, position/min-height/overflow or its own
      teal background — .lab-layer already provides inset:0 inside
      the shared fixed viewport.

   Content is unchanged from the previous 03-glance.html port where
   it overlapped (same 8 AI features, same icons) — the interactive
   features list is replaced by the template's own 5-circle profile
   row (all labelled "User Profiles" in the source, verbatim — not a
   typo introduced here).

   Reveal: one simple section-level animation. The shared
   useSectionLayer controller moves and fades the complete panel, so the
   title, lead, and eight features arrive together. This intentionally
   avoids per-word/per-feature frame work: the content is static and needs
   to become readable immediately after the section is ready. */

 import { useRef } from "react";
 import {
  progressBetween,
  SECTIONS,
  readPxPerFrame,
  sectionTimingForMode,
  staggerProgressAt,
  virtualEnterProgressAtScrollPx,
 } from "./timeline";
import { useFrameEffect, useSectionLayer } from "./useFrameTimeline";
import LottieIcon from "./LottieIcon";
import { HORIZON_ROUTES, horizonUrl } from "@/lib/horizon";

const DIGITAL = SECTIONS[3];
const TITLE_TEXT = "The Next Horizon of Intelligent Reporting";
const TITLE_TOKENS = TITLE_TEXT.split(/(\s+)/);
const TITLE_WORD_COUNT = TITLE_TOKENS.filter((token) => token.trim() !== "").length;
const WORD_INDEX_BY_TOKEN = TITLE_TOKENS.map((token, tokenIndex) =>
  token.trim() === ""
    ? -1
    : TITLE_TOKENS.slice(0, tokenIndex).filter((item) => item.trim() !== "").length,
);
const CHAR_WINDOW: [number, number] = [141, 161];
const GROUP_WINDOW: [number, number] = [141, 161];
const GROUP_COUNT = 9;

const FEATURES = [
  {
    label: "Conversational Report Intelligence",
    icon: "Web Icons-01.svg",
    svg: (
      <>
        <path pathLength={1} d="M5 6.5h14M5 12h9M5 17.5h6" />
        <circle cx="18" cy="17" r="3" />
      </>
    ),
  },
  {
    label: "Adaptive Stakeholder Experiences",
    icon: "Web Icons-02.svg",
    svg: (
      <>
        <circle cx="8" cy="8" r="3" />
        <circle cx="16" cy="9" r="2.4" />
        <path
          pathLength={1}
          d="M3.5 19c.4-3 2-4.5 4.5-4.5S12.1 16 12.5 19M13 14.8c2.8-.9 5.1.5 5.5 3.5"
        />
      </>
    ),
  },
  {
    label: "Predictive Intelligence Analytics",
    icon: "Web Icons-03.svg",
    svg: (
      <>
        <path
          pathLength={1}
          d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11"
        />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  },
  {
    label: "Multilingual & Accessible Intelligence",
    icon: "Web Icons-04.svg",
    svg: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path
          pathLength={1}
          d="M3.8 9h16.4M3.8 15h16.4M12 3.5c2.1 2.3 3.1 5.1 3.1 8.5s-1 6.2-3.1 8.5M12 3.5C9.9 5.8 8.9 8.6 8.9 12s1 6.2 3.1 8.5"
        />
      </>
    ),
  },
  {
    label: "AI-Powered Insight Visualisation",
    icon: "Web Icons-05.svg",
    svg: (
      <path
        pathLength={1}
        d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3ZM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16Z"
      />
    ),
  },
  {
    label: "Customised Report Generation",
    icon: "Web Icons-06.svg",
    svg: (
      <path pathLength={1} d="M6 3.5h8l4 4V20.5H6zM14 3.5v4h4M9 13h6M9 16.5h6" />
    ),
  },
  {
    label: "Interactive Impact Intelligence",
    icon: "Web Icons-07.svg",
    svg: <path pathLength={1} d="M5 19V5m0 14h15M8 15l3-4 3 2 5-6" />,
  },
  {
    label: "Gamified Report Exploration",
    icon: "Web Icons-08.svg",
    svg: (
      <>
        <path pathLength={1} d="m8 5 11 7-11 7V5Z" />
        <path pathLength={1} d="M4 5v14" />
      </>
    ),
  },
];

// The "Explore the Digital Experience" quicklinks (PDF p.3). The
// fifth link is the --cta anchor rendered after this list. Same 5
// routes GlobalHeader.tsx's own menu points at, via the same
// HORIZON_ROUTES map.
const PROFILES = [
  {
    label: "AI Guided Exploration",
    file: "AI Guided Exploration.json",
    href: horizonUrl(HORIZON_ROUTES.aiAssistant),
  },
  {
    label: "User Profiles",
    file: "User Profiles.json",
    href: horizonUrl(HORIZON_ROUTES.userProfiles),
  },
  {
    label: "Gamified Exploration",
    file: "Gamified Exploration.json",
    href: horizonUrl(HORIZON_ROUTES.crosswordPuzzle),
  },
  {
    label: "Sustainability Dashboard",
    file: "Sustainability Dashboard.json",
    href: horizonUrl(HORIZON_ROUTES.dashboard),
  },
];

export default function DigitalLayer() {
  const ref = useSectionLayer(DIGITAL);
  const wordRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const groupRefs = useRef<Array<HTMLElement | null>>([]);

  useFrameEffect((frame, _phase, scrollPx, mode) => {
    const timedDigital = sectionTimingForMode(DIGITAL, mode);
    if (mode !== "desktop") {
      wordRefs.current.forEach((element) => {
        if (element) element.style.opacity = "1";
      });
      groupRefs.current.forEach((element) => {
        if (element) element.style.opacity = "1";
      });
      return;
    }

    const virtualEnter = virtualEnterProgressAtScrollPx(
      timedDigital,
      scrollPx,
      readPxPerFrame(),
      mode,
    );
    const realEnter = progressBetween(frame, CHAR_WINDOW[0], CHAR_WINDOW[1]);
    const enterProgress = timedDigital.virtualEnterFrames
      ? virtualEnter === null ? realEnter * 0.5 : 0.5 + virtualEnter * 0.5
      : realEnter;
    const animationFrame = CHAR_WINDOW[0] + (CHAR_WINDOW[1] - CHAR_WINDOW[0]) * enterProgress;
    const exitWindow = timedDigital.exit?.frames ?? [timedDigital.settledFrame, timedDigital.settledFrame];
    const entering = virtualEnter !== null || frame < exitWindow[0];

    for (let index = 0; index < TITLE_WORD_COUNT; index += 1) {
      const element = wordRefs.current[index];
      if (!element) continue;
      const progress = entering
        ? staggerProgressAt(index, TITLE_WORD_COUNT, animationFrame, CHAR_WINDOW)
        : 1 - staggerProgressAt(TITLE_WORD_COUNT - 1 - index, TITLE_WORD_COUNT, frame, exitWindow);
      element.style.opacity = String(progress);
    }

    for (let index = 0; index < GROUP_COUNT; index += 1) {
      const element = groupRefs.current[index];
      if (!element) continue;
      const progress = entering
        ? staggerProgressAt(index, GROUP_COUNT, animationFrame, GROUP_WINDOW)
        : 1 - staggerProgressAt(GROUP_COUNT - 1 - index, GROUP_COUNT, frame, exitWindow);
      element.style.opacity = String(progress);
    }
  });

  return (
    <div
      className="lab-layer s-digital2"
      ref={ref}
      data-section={DIGITAL.id}
      data-initial-hidden="true"
      aria-labelledby="digital2-title"
    >
      <div className="s-digital2__stage">
        <article className="s-digital2__panel" data-lenis-prevent>
          <h2 className="s-digital2__title" id="digital2-title">
            {TITLE_TOKENS.map((token, tokenIndex) => {
              if (token.trim() === "") {
                return <span key={tokenIndex}>{token}</span>;
              }
              const index = WORD_INDEX_BY_TOKEN[tokenIndex];
              return (
                <span key={tokenIndex} ref={(node) => { wordRefs.current[index] = node; }}>
                  {token}
                </span>
              );
            })}
          </h2>

          <p className="s-digital2__lead" ref={(node) => { groupRefs.current[0] = node; }}>
            Reimagining the Annual Report as an intelligent digital experience
            that transforms how stakeholders discover, explore and engage with
            information through AI, personalisation, interactive visualisation
            and enhanced accessibility.
          </p>

          <ul className="s-digital2__features">
            {FEATURES.map((feature, index) => (
              <li
                  key={feature.label}
                  className="s-digital2__feature"
                  ref={(node) => { groupRefs.current[index + 1] = node; }}
                >
                <span className="s-digital2__icon" aria-hidden="true">
                  <img
                    src={`/digital/web-icons/${encodeURIComponent(feature.icon)}`}
                    alt=""
                  />
                </span>
                <span className="s-digital2__feature-label">{feature.label}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <div className="s-digital2__profiles-row">
        <p className="s-digital2__profiles-eyebrow">Explore the Digital Experience</p>
        <ul className="s-digital2__profiles">
          {PROFILES.map((profile, index) => {
            const content = (
              <>
                <span className="s-digital2__avatar s-digital2__avatar--animated">
                  <LottieIcon file={profile.file} label={profile.label} />
                </span>
                <span className="s-digital2__profile-label">{profile.label}</span>
              </>
            );
            return profile.href ? (
              <li key={index} className="s-digital2__profile">
                <a href={profile.href} target="_blank" rel="noopener noreferrer">
                  {content}
                </a>
              </li>
            ) : (
              // eslint-disable-next-line react/no-array-index-key
              <li key={index} className="s-digital2__profile">
                {content}
              </li>
            );
          })}
        </ul>

        <a
          className="s-digital2__profile s-digital2__profile--cta"
          href={horizonUrl(HORIZON_ROUTES.tailorMade)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Interactive Charts &amp; Reports"
        >
          <span className="s-digital2__avatar s-digital2__avatar--animated">
            <LottieIcon file="Interactive Charts & Reports.json" label="Interactive Charts & Reports" />
          </span>
          <span className="s-digital2__profile-label">Interactive Charts &amp; Reports</span>
        </a>
      </div>
    </div>
  );
}
