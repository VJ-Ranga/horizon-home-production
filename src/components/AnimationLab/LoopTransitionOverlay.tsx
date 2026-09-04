"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrameEffect } from "./useFrameTimeline";
import { HERO_SETTLED_FRAME, LOOP_REVEAL_START_FRAME } from "./timeline";

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

    // "cover" is a full mask while the scroll hard-jumps underneath —
    // it must be opaque the instant the loop starts, wherever the
    // trigger fired (on touch that's mid-scroll, not at the last
    // frame). "shade" fades the mask away as the reveal scroll eases
    // frame 32 -> 50.
    if (stage === "cover") {
      shade.style.opacity = "1";
      return;
    }
    const progress =
      (frame - LOOP_REVEAL_START_FRAME) /
      (HERO_SETTLED_FRAME - LOOP_REVEAL_START_FRAME);
    const clamped = Math.min(1, Math.max(0, progress));
    shade.style.opacity = String(1 - clamped);
  });

  // The reset below is a synchronous scroll jump. This must run during the
  // committing render, before the browser paints that jump — especially on
  // touch devices where the next frame-driver emission can arrive too late.
  useLayoutEffect(() => {
    const shade = shadeRef.current;
    if (!shade) return;
    if (stage === "cover") shade.style.opacity = "1";
    if (stage === null) shade.style.opacity = "0";
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
