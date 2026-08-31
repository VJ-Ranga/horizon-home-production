"use client";

import { useEffect, useRef } from "react";
import { useFrameEffect } from "./useFrameTimeline";
import {
  HERO_SETTLED_FRAME,
  LAB_LAST_FRAME,
  LOOP_COVER_START_FRAME,
  LOOP_REVEAL_START_FRAME,
} from "./timeline";

/** A simple single-pass white shade. It covers the final scene, stays white
    while the incoming frames play underneath, then fades away at frame 50. */
export default function LoopTransitionOverlay({
  stage,
}: {
  stage: "cover" | "shade" | null;
}) {
  const shadeRef = useRef<HTMLDivElement>(null);

  useFrameEffect((frame) => {
    const shade = shadeRef.current;
    if (!shade || stage === null) return;

    const progress = stage === "cover"
      ? (frame - LOOP_COVER_START_FRAME) /
        (LAB_LAST_FRAME - LOOP_COVER_START_FRAME)
      : (frame - LOOP_REVEAL_START_FRAME) /
        (HERO_SETTLED_FRAME - LOOP_REVEAL_START_FRAME);
    const clamped = Math.min(1, Math.max(0, progress));
    shade.style.opacity = String(stage === "cover" ? clamped : 1 - clamped);
  });

  useEffect(() => {
    if (stage === null && shadeRef.current) shadeRef.current.style.opacity = "0";
  }, [stage]);

  return (
    <div
      ref={shadeRef}
      className="lab-loop-transition"
      data-stage={stage ?? "idle"}
      aria-hidden="true"
    />
  );
}
