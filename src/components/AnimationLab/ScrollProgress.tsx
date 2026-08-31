"use client";

/* =========================================================
   ANIMATION LAB — custom scroll progress
   =========================================================

   Stands in for the native scrollbar, hidden globally in lab.css so
   the page doesn't show both. Track is fixed CSS; only the fill's
   height is written here, per frame, as a direct fraction of
   HERO_EXIT_END..SCROLL_LAST_FRAME — reading the same frame value
   everything else in the lab already reads, not a second, independent
   measurement of window.scrollY that could drift out of sync with it.

   A top-anchored FILL, not a moving thumb — grows 0% to 100% as the
   user scrolls, rather than a fixed-size segment travelling down the
   track. Hidden until the hero has fully exited (frame >=
   WORDMARK_EXIT_FRAMES[1], 70) — it has nothing meaningful to show
   before then, since the hero itself isn't part of the ranked
   progress this bar represents. */

import { useRef } from "react";
import { SCROLL_LAST_FRAME, WORDMARK_EXIT_FRAMES } from "./timeline";
import { useFrameEffect } from "./useFrameTimeline";

const PROGRESS_START_FRAME = WORDMARK_EXIT_FRAMES[1]; // 70 — hero fully gone

function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export default function ScrollProgress() {
  const rootRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useFrameEffect((frame, phase) => {
    const root = rootRef.current;
    const fill = fillRef.current;
    if (!root || !fill) return;

    const visible = phase === "scroll" && frame >= PROGRESS_START_FRAME;
    root.style.opacity = visible ? "1" : "0";
    if (!visible) return;

    const progress = clamp01(
      (frame - PROGRESS_START_FRAME) / (SCROLL_LAST_FRAME - PROGRESS_START_FRAME)
    );
    fill.style.height = `${progress * 100}%`;
  });

  return (
    <div ref={rootRef} className="lab-scroll-progress" aria-hidden="true">
      <div ref={fillRef} className="lab-scroll-progress__fill" />
    </div>
  );
}
