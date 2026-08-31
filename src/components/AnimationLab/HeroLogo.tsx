"use client";

/* =========================================================
   ANIMATION LAB — the logo, end to end
   =========================================================

   ONE element for the logo's whole lifecycle: fades/slides in during
   the entry (same window HERO_PARTS gave it before), sits fully
   settled through the rest of the entry and the start of scroll, then
   fades back out over HERO's own exit window — same as the rest of
   the hero — rather than shrinking to a sticky dock.

   Deliberately NOT a child of HeroLayer's own root. That root's
   opacity is written by useSectionLayer for HERO's exit (frames
   50-70), and a CSS ancestor's opacity holds down every descendant
   regardless of the descendant's own position value — nothing this
   element could do while living inside that subtree would let it
   outlive that fade. Rendered as a sibling of HeroLayer in
   AnimationLab.tsx instead, position: fixed for its entire life
   (which costs nothing: HeroLayer's own stage already fills the full
   viewport, so a fixed element using the same top/left percentages
   lands in exactly the same visual spot the in-flow version would).

   This replaces an earlier version that used TWO elements — this one
   sticky-only, plus HeroLayer's own in-flow logo still fading with
   the rest of the hero — crossfading between them over the exit
   window. That worked, but two elements for one logo was more than
   the effect needed; one element covering the whole lifecycle reads
   the same and is simpler. */

import { useRef } from "react";
import {
  LOGO_ENTER_FRAMES,
  LOGO_ENTER_FROM_Y,
  LOGO_EXIT_FRAMES,
} from "./timeline";
import { useFrameEffect } from "./useFrameTimeline";

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeIn(t: number) {
  return t * t * t;
}

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function progressBetween(frame: number, a: number, b: number) {
  return clamp01((frame - a) / (b - a));
}

export default function HeroLogo() {
  const ref = useRef<HTMLImageElement>(null);

  useFrameEffect((frame) => {
    const element = ref.current;
    if (!element) return;

    const [enterA, enterB] = LOGO_ENTER_FRAMES;
    const [exitA, exitB] = LOGO_EXIT_FRAMES;

    let opacity = 1;
    let y = 0;

    if (frame < enterB) {
      const t = easeOut(progressBetween(frame, enterA, enterB));
      opacity = t;
      y = LOGO_ENTER_FROM_Y * (1 - t);
    } else if (frame > exitA) {
      const t = easeIn(progressBetween(frame, exitA, exitB));
      opacity = 1 - t;
    }

    element.style.opacity = String(opacity);
    // translate's y keeps the entrance's own `translate` convention
    // (see HeroLayer.tsx's own note on why translate, not transform,
    // for PSD-centred elements). translateX(-50%) for horizontal
    // centring lives in lab.css as a static rule on .lab-hero-logo,
    // untouched by this.
    element.style.translate = `0 ${y}vh`;
    element.style.visibility = opacity > 0.001 ? "visible" : "hidden";
    element.style.pointerEvents = opacity > 0.98 ? "auto" : "none";
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src="/hero/logo-white.png"
      alt="Haycarb PLC"
      decoding="async"
      className="lab-hero-logo"
    />
  );
}
