"use client";

/* =========================================================
   Hero logo
   =========================================================

   One element for the logo's whole lifecycle: fades/slides in during
   the entry (LOGO_ENTER_FRAMES), stays through the settled hero, then
   fades out over LOGO_EXIT_FRAMES with the rest of the hero.

   Rendered as a position: fixed sibling of HeroLayer (in
   AnimationLab.tsx), not a child, so its opacity is driven only by
   its own windows. HeroLayer's stage fills the viewport, so the same
   top/left percentages land in the same spot. */

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
    // centring is a static rule on .lab-hero-logo, untouched by this.
    element.style.translate = `0 ${y}vh`;
    element.style.visibility = opacity > 0.001 ? "visible" : "hidden";
    element.style.pointerEvents = opacity > 0.98 ? "auto" : "none";
  });

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src="/hero/logo-white.png"
      alt="HAYCARB LOGO"
      decoding="async"
      className="lab-hero-logo"
    />
  );
}
