"use client";

/* =========================================================
   ANIMATION LAB — section 1, the hero
   =========================================================

   Markup ported from html-templates/01-hero.html, which is FINAL
   (mean diff 2.36/255 against the PSD export). Class names are kept
   byte-identical so the two can be diffed against each other, and
   the CSS in lab.css is that file's CSS copied across.

   Two differences from the template, both structural, neither
   visual:

   1. No <img> background. The template's .s-hero__media is the
      scrubbed <canvas> here — see LabScrubber. The template always
      anticipated this swap.
   2. No <section> wrapper or 100svh sizing. Every lab layer is
      inset:0 inside one fixed viewport, so the layers stack.

   The narrow-viewport rules from the template are carried over in
   lab.css but are NOT exercised by the lab — see the notes at the
   foot of that file.
   ========================================================= */

import { useRef } from "react";
import {
  HERO_SETTLED_FRAME,
  LAB_LAST_FRAME,
  LOOP_REVEAL_START_FRAME,
  SECTIONS,
  WORDMARK_EMERGE_FRAME,
  wordmarkExitStateAt,
} from "./timeline";
import {
  useFrameEffect,
  useRevealPart,
  useSectionLayer,
} from "./useFrameTimeline";

const HERO = SECTIONS[0];
const POPUP_CLOSE_AFTER_FRAMES = 5;

// "Theme" video from the client's resource list (AR Crossword Puzzle
// PDF, Resources appendix). Loaded into the iframe only while the
// dialog is open, and cleared on close so it stops playing.
const HERO_VIDEO_SRC =
  "https://www.youtube.com/embed/xytAX3yFm4Y?autoplay=1&rel=0";

export default function HeroLayer() {
  const ref = useSectionLayer(HERO);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoFrameRef = useRef<HTMLIFrameElement>(null);
  const currentFrameRef = useRef(HERO_SETTLED_FRAME);
  const dialogOpenedAtFrameRef = useRef<number | null>(null);
  const wordmarkRef = useRef<HTMLHeadingElement>(null);
  const previousFrameRef = useRef(HERO_SETTLED_FRAME);

  useFrameEffect((frame) => {
    currentFrameRef.current = frame;
    const openedAt = dialogOpenedAtFrameRef.current;
    if (
      dialogRef.current?.open &&
      openedAt !== null &&
      Math.abs(frame - openedAt) >= POPUP_CLOSE_AFTER_FRAMES
    ) {
      dialogRef.current.close();
      dialogOpenedAtFrameRef.current = null;
    }
  });

  /* Fires ".s-hero__wordmark--emerge" once, at WORDMARK_EMERGE_FRAME
     (a few frames before the hero settles at 50) — not through
     useRevealPart, because that hook ties motion to the frame clock,
     and the frame clock stops advancing at 50 while this animation
     needs to keep running past that on its own.

     Guarded by triggeredRef rather than re-checking the class on the
     DOM, and the frame >= condition is scoped to phase === "entry":
     that phase runs exactly once per page load and never recurs, so
     scrolling back through the hero later, or the infinite-loop
     wrap (AnimationLab.tsx), can revisit this frame number during
     the SCROLL phase without ever matching this branch again. Under
     reduced motion the entry never runs at all — the immediate
     `phase === "scroll"` branch below covers that case instead, once. */
  const wordmarkTriggeredRef = useRef(false);
  useFrameEffect((frame, phase) => {
    if (wordmarkTriggeredRef.current) return;
    const due = phase === "entry" ? frame >= WORDMARK_EMERGE_FRAME : phase === "scroll";
    if (!due) return;

    wordmarkTriggeredRef.current = true;
    wordmarkRef.current?.classList.add("s-hero__wordmark--emerge");
  });

  /* The reverse: once the user actually scrolls past the settle
     (frame > 50), this takes over from the CSS emerge animation and
     drives the wordmark's opacity/scale/blur directly as a pure
     function of frame — see wordmarkExitStateAt. That has to be
     JS-driven rather than another fixed-duration CSS animation: exit
     happens during the scroll phase, where the user can scroll back
     and forth freely, and only a frame-driven function stays correct
     under that (a CSS animation has no notion of "scroll partway
     back").

     Guarded to only act once frame is PAST 50, not from the moment
     phase flips to "scroll": phase flips the instant frame reaches
     50, while the emerge animation is 2.6s long and only barely
     started (WORDMARK_EMERGE_FRAME=48 fires ~96ms of entry-time
     earlier) — taking over immediately would cut it off almost
     before it plays. Waiting for real scroll past 50 lets it run
     its full slow bloom for as long as the user lingers before
     scrolling away. */
  const exitTakenOverRef = useRef(false);
  useFrameEffect((frame) => {
    const element = wordmarkRef.current;
    if (!element) return;

    const wrapped =
      previousFrameRef.current > LAB_LAST_FRAME - 20 &&
      frame < LOOP_REVEAL_START_FRAME;
    previousFrameRef.current = frame;

    if (wrapped) {
      exitTakenOverRef.current = false;
      wordmarkTriggeredRef.current = true;
      element.classList.remove("s-hero__wordmark--emerge");
      element.style.animation = "";
      element.style.opacity = "";
      element.style.transform = "";
      element.style.filter = "";
      element.style.visibility = "";
      void element.offsetWidth;
      element.classList.add("s-hero__wordmark--emerge");
      return;
    }

    if (frame > HERO_SETTLED_FRAME) {
      if (!exitTakenOverRef.current) {
        exitTakenOverRef.current = true;
        element.style.animation = "none";
      }
    } else if (exitTakenOverRef.current) {
      // Scrolled back up to fully settled (or the loop wrapped) —
      // hand back to a plain, static "fully visible" style. Keep the
      // animation disabled: clearing it would restart the CSS reveal
      // and make the center wordmark pop in again on reverse scroll.
      exitTakenOverRef.current = false;
      element.style.animation = "none";
      element.style.opacity = "1";
      element.style.transform = "translateX(-50%) scale(1)";
      element.style.filter = "";
      element.style.visibility = "visible";
    }

    if (!exitTakenOverRef.current) return;

    const state = wordmarkExitStateAt(frame);
    element.style.opacity = String(state.opacity);
    element.style.transform = `translateX(-50%) scale(${state.scale})`;
    element.style.filter = state.blurPx > 0 ? `blur(${state.blurPx}px)` : "";
  });

  /* The reveal. Each element arrives on its own window inside
     HERO_REVEAL (34 -> 50), cascading rather than appearing together.
     Windows live in timeline.ts with every other frame number.

     These hooks write the CSS `translate` property, never `transform`
     — the wordmark, scroll cue and button row are centred with
     transform: translateX(-50%) taken from their PSD bounding boxes.
     The logo is NOT here — see HeroLogo.tsx, rendered as its own
     sibling of this whole layer rather than a child of it. */
  const brandRef = useRevealPart<HTMLDivElement>("brand");
  const videoRef = useRevealPart<HTMLDivElement>("video");
  const scrollRef = useRevealPart<HTMLButtonElement>("scroll");
  const actionsRef = useRevealPart<HTMLDivElement>("actions");

  return (
    <div className="lab-layer s-hero__stage" ref={ref} data-section={HERO.id}>
      {/* Top-left */}
      <div className="s-hero__brand" ref={brandRef}>
        <p className="s-hero__brand-line s-hero__brand-line--1">
          <span className="s-hero__brand-name">HAYCARB PLC</span>
          <span className="s-hero__brand-sep" aria-hidden="true">
            |
          </span>
          <span className="s-hero__brand-report">Annual Report 2025/26</span>
        </p>
        <p className="s-hero__brand-line s-hero__brand-line--2">
          Shaping the Future of Activated Carbon
        </p>
      </div>

      {/* Top-right. The play disc is baked into the thumbnail — the card
          is cropped straight off the PSD canvas. TODO(interactive stage):
          a clean plate, so the disc becomes a real hover/focus target. */}
      <div className="s-hero__video" ref={videoRef}>
        <button
          type="button"
          className="s-hero__video-card"
          aria-haspopup="dialog"
          aria-controls="summary-video-dialog"
          onClick={() => {
            dialogOpenedAtFrameRef.current = currentFrameRef.current;
            if (videoFrameRef.current) videoFrameRef.current.src = HERO_VIDEO_SRC;
            dialogRef.current?.showModal();
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="s-hero__video-thumb"
            src="/hero/video-card-psd.png"
            alt=""
            decoding="async"
          />
          <span className="visually-hidden">
            Watch the Annual Report Theme video
          </span>
        </button>
        <p className="s-hero__video-caption">Watch Annual Report Theme</p>
      </div>

      {/* Ported from html-templates/final/01-hero.html unchanged: native
          <dialog>, closed by the backdrop click or the form's own submit. */}
      <dialog
        ref={dialogRef}
        className="s-hero__video-dialog"
        id="summary-video-dialog"
        aria-labelledby="summary-video-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        onClose={() => {
          dialogOpenedAtFrameRef.current = null;
          if (videoFrameRef.current) videoFrameRef.current.src = "";
        }}
      >
        <h2 id="summary-video-title">Summary Video</h2>
        <iframe
          ref={videoFrameRef}
          className="s-hero__video-embed"
          title="Annual Report Theme video"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
        <form method="dialog">
          <button
            className="s-hero__video-dialog-close"
            type="submit"
            aria-label="Close video"
          >
            ×
          </button>
        </form>
      </dialog>

      {/* Centre. Custom lettering, so it is an image; it carries the h1.
          Not driven by useRevealPart like its siblings — the trigger
          above adds --emerge at WORDMARK_EMERGE_FRAME and lab.css's
          keyframe runs from there on its own clock. */}
      <h1 className="s-hero__wordmark" ref={wordmarkRef}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/beyond-wordmark.png"
          alt="Beyond the Beyond"
          decoding="async"
        />
      </h1>

      {/* Lower-centre. In the template this is an anchor to #02-approach.
          There is nothing to jump to in the lab — section 2 is a scroll
          position, not a document node — so it scrolls to section 2's
          settled frame instead. */}
      <button
        ref={scrollRef}
        type="button"
        className="s-hero__scroll"
        data-scroll-to={String(SECTIONS[1].settledFrame)}
      >
        Explore the Journey
      </button>

      {/* Bottom-centre. Only the first pill carries the PSD's glow ring. */}
      <div className="s-hero__actions btn-row btn-row--center" ref={actionsRef}>
        <a
          className="btn btn--light s-hero__cta s-hero__cta--report"
          href="/pdf/home/01-hero/Annual%20Report%202025-26.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            className="btn-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
          </svg>
          <span>Download Annual Report</span>
        </a>
        <a
          className="btn btn--ghost s-hero__cta s-hero__cta--ai"
          href="https://horizon-ten-pi.vercel.app/chat"
          target="_blank"
          rel="noopener noreferrer"
        >
          {/* One large four-point sparkle with a single smaller one
              below-left, as the PSD draws it. */}
          <svg className="btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M15 2.2c.9 4.6 2.2 5.9 6.8 6.8-4.6.9-5.9 2.2-6.8 6.8-.9-4.6-2.2-5.9-6.8-6.8 4.6-.9 5.9-2.2 6.8-6.8z" />
            <path d="M6.6 14.2c.5 2.6 1.2 3.3 3.8 3.8-2.6.5-3.3 1.2-3.8 3.8-.5-2.6-1.2-3.3-3.8-3.8 2.6-.5 3.3-1.2 3.8-3.8z" />
          </svg>
          <span>AI Guided Exploration</span>
        </a>
      </div>
    </div>
  );
}
