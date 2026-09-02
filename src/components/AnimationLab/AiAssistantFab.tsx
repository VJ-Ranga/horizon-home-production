"use client";

/* =========================================================
   ANIMATION LAB — floating "AI Assistant" button
   =========================================================

   Sticky, bottom-right. Revealed once the hero is fully gone — same
   LOGO_EXIT_FRAMES[1] (70) reveal point IntroNavGate uses for the
   app-wide hamburger, so the two pieces of persistent chrome arrive
   together rather than one popping in ahead of the other. Links out
   to Horizon's own AI Assistant page via the shared HORIZON_ROUTES
   map, same as every other cross-app link in the lab.

   The orb is Horizon (Backend)'s own HaycarbChat/index.jsx loading
   animation (src/app/globals.css's .animate-orb-* rules), ported
   verbatim — same classes, same keyframes, same colour tokens (this
   design system already defines --color-brand-main / --color-teal-2
   identically, see src/styles/tokens/colors.css) — just at FAB size
   instead of the chat page's full 144px. Only the fixed pixel insets
   (glow spread, dot size, core size) were scaled down for a 56px
   button; the animation itself, the layering, and the class names
   are unchanged from the source so it reads as the same assistant
   across both apps. */

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
      aria-label="Chat with our AI Assistant"
    >
      <div className="relative h-14 w-14" style={{ perspective: "800px" }}>
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
