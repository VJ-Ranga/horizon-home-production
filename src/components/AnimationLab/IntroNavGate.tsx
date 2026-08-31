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

/* The frame the hamburger appears on, and stays visible from. */
const REVEAL_FRAME = 60;

export default function IntroNavGate() {
  useFrameEffect((frame) => {
    document.documentElement.classList.toggle(
      "lab-nav-hidden",
      frame < REVEAL_FRAME,
    );
  });

  useEffect(
    () => () => document.documentElement.classList.remove("lab-nav-hidden"),
    [],
  );

  return null;
}
