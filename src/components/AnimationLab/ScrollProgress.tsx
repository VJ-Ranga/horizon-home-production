"use client";

/* =========================================================
   Custom scroll progress
   =========================================================

   Stands in for the native scrollbar, which is hidden globally (see
   styles/01-shared-shell.css). Only the fill's height is written here,
   per frame, as a fraction of HERO_EXIT_END..SCROLL_LAST_FRAME — the
   same frame value everything else reads, so it cannot drift from it.

   A top-anchored fill, not a moving thumb. Hidden until the hero has
   fully exited (WORDMARK_EXIT_FRAMES[1]), since the hero is not part of
   the progress this bar represents. */

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
