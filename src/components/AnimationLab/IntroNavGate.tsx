"use client";

/* Headless. Until the timeline reaches REVEAL_FRAME, add
   `lab-nav-hidden` to <html> so the app-wide GlobalHeader hamburger
   stays hidden; from that frame on it is visible for the rest of the
   page. lab.css also pins it, so once shown it stays on screen
   instead of scrolling away with the document.

   GlobalHeader is rendered by the root layout as a SIBLING of
   <AnimationLab>, not a descendant, so it cannot read this tree's
   FrameContext — we signal across the boundary with a class on <html>.
   The matching rule lives in lab.css, which only loads on `/`, so this
   never affects the feature pages. */

import { useEffect } from "react";
import { useFrameEffect } from "./useFrameTimeline";
import { LOGO_EXIT_FRAMES, SECTIONS } from "./timeline";

/* The frame the hamburger appears on, and stays visible from. */
const REVEAL_FRAME = 60;

/* The music toggle stays hidden for the whole hero and only appears
   once the hero has exited (VJ, 2026-09-03: "that sound icon only need
   to show after frame 70"). It used to arrive at frame 50 and park
   under the hero's video card — which owns the top-right corner while
   the hero is up — before docking to that corner at 70. Now it simply
   isn't there until 70, so it never has to share the corner and the
   `lab-music-hero` dock never applies. It controls audio that plays
   for the whole page, so from 70 on it never leaves. */
const MUSIC_REVEAL_FRAME = LOGO_EXIT_FRAMES[1];
const TEAL_NAV_IDS = new Set(["05-intro-statement", "06-key-data-points"]);
const [tealStart, tealEnd] = SECTIONS
  .filter((s) => TEAL_NAV_IDS.has(s.id))
  .reduce<[number, number]>(
    ([lo, hi], s) => [
      Math.min(lo, s.enter?.frames[0] ?? s.settledFrame),
      Math.max(hi, s.exit?.frames[1] ?? s.settledFrame),
    ],
    [Infinity, -Infinity],
  );

export default function IntroNavGate() {
  useFrameEffect((frame) => {
    document.documentElement.classList.toggle(
      "lab-nav-hidden",
      frame < REVEAL_FRAME,
    );
  });

  useFrameEffect((frame) => {
    document.documentElement.classList.toggle(
      "lab-nav-teal",
      frame >= tealStart && frame <= tealEnd,
    );
  });

  useFrameEffect((frame) => {
    document.documentElement.classList.toggle(
      "lab-music-hidden",
      frame < MUSIC_REVEAL_FRAME,
    );
  });

  useEffect(
    () => () => {
      document.documentElement.classList.remove(
        "lab-nav-hidden",
        "lab-nav-teal",
        "lab-music-hidden",
      );
    },
    [],
  );

  return null;
}
