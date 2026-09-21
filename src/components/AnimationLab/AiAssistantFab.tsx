"use client";

/* =========================================================
   Floating "AI Assistant" button
   =========================================================

   Fixed bottom-right. Revealed once the hero is fully gone
   (LOGO_EXIT_FRAMES[1]), the same point the music toggle appears. Links
   to Horizon's AI Assistant page via the shared HORIZON_ROUTES map.

   The orb is the Horizon chat's loading animation (.animate-orb-* in
   styles/01-shared-shell.css) — same classes, keyframes and colour
   tokens (see src/styles/tokens/colors.css), so it reads as the same
   assistant across both apps. Only the fixed pixel insets (glow spread,
   dot size, core size) are scaled down for a 56px button. */

import { useRef } from "react";
import { LOGO_EXIT_FRAMES } from "./timeline";
import { useFrameEffect } from "./useFrameTimeline";
import { HORIZON_ROUTES, horizonUrl } from "@/lib/horizon";

const REVEAL_FRAME = LOGO_EXIT_FRAMES[1]; // 70 — hero fully gone

export default function AiAssistantFab() {
  const rootRef = useRef<HTMLAnchorElement>(null);

  useFrameEffect((frame, phase) => {
    const root = rootRef.current;
    if (!root) return;
    const visible = phase === "scroll" && frame >= REVEAL_FRAME;
    root.style.opacity = visible ? "1" : "0";
    root.style.pointerEvents = visible ? "auto" : "none";
  });

  return (
    <a
      ref={rootRef}
      href={horizonUrl(HORIZON_ROUTES.aiAssistant)}
      target="_blank"
      rel="noopener noreferrer"
      className="lab-ai-fab"
    >
      {/* Left of the orb, DOM order first so it reads before the icon —
          collapsed to zero width until hover/focus, so it never affects
          layout at rest. The orb stays visually anchored to the fixed
          right edge; this is what grows leftward on hover, not it. */}
      <span className="lab-ai-fab__label">AI Guided Exploration</span>
      <div className="lab-ai-fab__orb" style={{ perspective: "800px" }}>
        <div className="animate-orb-pulse absolute -inset-1 rounded-full bg-brand-main/40 blur-md" />
        <div className="animate-orb-spin absolute inset-0 rounded-full border-2 border-teal-2/90 border-t-transparent">
          <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-2 shadow-[0_0_6px_2px_rgba(91,178,200,0.85)]" />
        </div>
        <div className="animate-orb-rotate-x absolute inset-1 rounded-full border-2 border-white/60 border-b-transparent">
          <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 translate-y-1/2 rounded-full bg-white shadow-[0_0_6px_2px_rgba(255,255,255,0.7)]" />
        </div>
        <div className="animate-orb-rotate-y absolute inset-2 rounded-full border-2 border-brand-main/80 border-t-transparent">
          <span className="absolute left-1/2 top-0 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-main shadow-[0_0_6px_2px_rgba(20,115,133,0.85)]" />
        </div>
        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_4px_rgba(140,224,240,0.8)]" />
      </div>
    </a>
  );
}
