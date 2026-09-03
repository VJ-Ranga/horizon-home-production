"use client";

/* =========================================================
   ANIMATION LAB — the background scrubber
   =========================================================

   Home/ScrollScrubber.tsx, with two changes:

   1. It loads only the lab's frame window (1-140, 140 files) rather
      than all 720, so the lab is usable seconds after load. The
      entry's own frames (1-50) are already decoded by AnimationLab
      before the autoplay starts, so those come from cache.
   2. It takes its frame from the shared FrameContext instead of
      reading scroll itself, so the background and the overlay
      layers cannot drift apart — they are the same number.

   It also owns the carve, since the carve is a property of the
   media box. See timeline.ts carveAt() — that shape is an
   animation assumption, not a PSD measurement.
   ========================================================= */

import { useEffect, useRef, useState } from "react";
import {
  LAB_FIRST_FRAME,
  LAB_FRAME_COUNT,
  LAB_LAST_FRAME,
  SECTIONS,
  CARVE_MOBILE_MAX_WIDTH,
  CARVE_PHONE_MAX_WIDTH,
  carveAt,
  frameSrc,
  progressBetween,
  sectionStateAt,
  FRAME_DIR_DEV,
  FRAME_DIR_HQ,
  FRAME_DIR_4K,
  FRAME_DIR_2X,
  FRAME_DIR_2X_HQ,
  FRAME_DIR_4X,
  backgroundFrameForFrame,
  backgroundTransitionAtFrame,
} from "./timeline";
import { FRAME_DIR_MOBILE, isPhoneViewport } from "./frameDirMobile";

/* Haycarb at a Glance is the one section built light-themed — dark
   ink on light stat tiles, no background of its own (VJ, 2026-08-21,
   see GlanceLayer.tsx) — so the scrim below has to fade OUT while it
   is on screen rather than applying everywhere uniformly. Reusing its
   own sectionStateAt opacity curve rather than a second frame-range
   check keeps the scrim's fade exactly in step with Glance's own
   enter/hold/exit, including the easing. */
const GLANCE_SECTION = SECTIONS[5];
const FINANCIAL_SECTION = SECTIONS[7];
// 19-end-screen. The veil used to contract after 16-nonfinancial
// (SECTIONS[15]); it now runs unbroken to the end of the last section,
// so 17/18/19 share one continuous overlay and the end screen no longer
// needs a scrim of its own.
const OVERLAY_END_SECTION = SECTIONS[18];
const OVERLAY_FADE_FRAMES = 20;
import { useFrameEffect } from "./useFrameTimeline";
import { useMouseParallax } from "./useMouseParallax";


/** Which frame folder a given density/quality combination reads.
    densify 1 is the plain 840 sets and is byte-for-byte the original
    behaviour; every other value is a 1080p-only dense set except 2x,
    which also has an HQ variant. */
function resolveFrameDir(
  densify: number,
  hq: boolean,
  fourK: boolean
): string {
  if (densify === 4) return FRAME_DIR_4X;
  if (densify === 2) return hq ? FRAME_DIR_2X_HQ : FRAME_DIR_2X;
  if (fourK) return FRAME_DIR_4K;
  if (hq) return FRAME_DIR_HQ;
  // Phones read the small set — same 1125 files, ~7x less bitmap.
  return isPhoneViewport() ? FRAME_DIR_MOBILE : FRAME_DIR_DEV;
}

const LOAD_CONCURRENCY = 6;

export default function LabScrubber({
  posterFrame,
  hq = false,
  fourK = false,
  densify = 1,
  onFrameLoaded,
}: {
  posterFrame: number;
  hq?: boolean;
  /** New-video 4K set, /animation-lab-4k only. Optional and false by
      default, so every existing caller behaves exactly as before. */
  fourK?: boolean;
  /** Frame-density multiplier: 1 (default, the 840 sets), 2, or 4.
      Draws k times as many files across the SAME frame numbers — see
      FRAME_DIR_2X in timeline.ts. 1 is byte-for-byte the old path. */
  densify?: number;
  /** Fired once per frame, right after it decodes. AnimationLab uses
      this to know when a section's frames are ready to hold scroll
      for — see the scroll gate there. */
  onFrameLoaded?: (frame: number) => void;
}) {
  /* HQ preview only. Both values below are the dev behaviour when hq
     is false, so the default path is byte-for-byte what it was.
     fourK takes precedence when set, and is likewise off by default. */
  const frameDir = resolveFrameDir(densify, hq, fourK);

  /* THE ONLY THING `densify` CHANGES: which FILE a frame maps to.
     Frame numbers everywhere else stay in 840-space. `frame` is
     continuous during scroll, so on a dense route round(k*f - (k-1))
     resolves to intermediate files the 840 set has no equivalent for —
     that is where the extra smoothness comes from, at zero cost to the
     timing config. */
  const denseScale = densify > 1 ? densify : 1;
  const frameToFile = (f: number) =>
    Math.round(f * denseScale - (denseScale - 1));
  const lastFile = frameToFile(LAB_LAST_FRAME);
  const fileCount = lastFile - LAB_FIRST_FRAME + 1;
  const mediaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  /* Frames are held outside React: they are a decode cache, not state. */
  const images = useRef<Array<HTMLImageElement | undefined>>([]);
  const loaded = useRef<boolean[]>([]);
  const painted = useRef(-1);

  useMouseParallax(mediaRef);

  // Read from a ref rather than added to the loading effect's deps:
  // the callback is re-created every AnimationLab render and none of
  // that should restart frame loading.
  const onFrameLoadedRef = useRef(onFrameLoaded);
  useEffect(() => {
    onFrameLoadedRef.current = onFrameLoaded;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    images.current = new Array(fileCount);
    loaded.current = new Array(fileCount).fill(false);

    let disposed = false;

    /* Backing store: CSS pixels (dpr 1) for the dev set, dpr 2 for
       the HQ preview.

       The dev cap exists because drawing more backing store than the
       source can fill buys interpolation, not resolution, at 4x the
       fill rate. That reasoning was written when the frames were
       1600x892 and is kept for the 1920x1080 dev set, where a dpr-2
       canvas on a 1920-wide viewport is still a 2x linear upscale.

       The HQ set is 2560x1440, so at dpr 2 there is real detail to
       put on those pixels — and lifting the cap is the point of the
       preview: measured 2026-08-19, the dev set holds 76-81% of the
       lossless reference's fine detail at a 2560 backing store while
       the HQ set holds 104-106%. Capped at dpr 1 the HQ frames would
       be downscaled and the whole comparison would show nothing.

       Home/ScrollScrubber.tsx already caps at 2 and is untouched. */
    const resize = () => {
      const dpr = hq || fourK ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      painted.current = -1; // force a repaint at the new size
    };

    /* decode(), not onload. onload only means the bytes arrived and
       the header parsed; the pixels may still be undecoded, and that
       decode would then land inside the first drawImage — on the main
       thread, mid-animation. Marking a frame loaded before it is
       decoded is what makes the first pass through stutter. */
    const loadFrame = async (offset: number) => {
      const image = new Image();
      image.decoding = "async";
      image.src = frameSrc(LAB_FIRST_FRAME + offset, frameDir);
      images.current[offset] = image;

      try {
        await image.decode();
        loaded.current[offset] = true;
        /* Report the LOGICAL frame, and it must be an INTEGER:
           AnimationLab's loading gate keeps a Set<number> of frame
           numbers and walks it with `frame += 1`, so a fractional
           value can never match and the gate would stay closed
           forever — scroll locked at the hero. That is exactly what a
           any NON-INTEGER denseScale produces before this round().
           Cost a real debugging session in 2026-08 with a 5.7771
           (native-30fps) set: integer multipliers happened to land
           every k-th file on a whole number and so worked by luck,
           while the fractional one locked scroll at the hero. Keep
           the round() if a non-integer density is ever added back.
           Every logical frame stays covered because there are k >= 1
           files per logical frame. */
        onFrameLoadedRef.current?.(
          Math.round(offset / denseScale) + LAB_FIRST_FRAME
        );
      } catch {
        // Leave it unloaded; nearestLoaded() routes around it.
      }
    };

    const start = async () => {
      await loadFrame(0); // frame 1 — the intro handoff, what you see first
      if (disposed) return;

      resize();
      setReady(true);

      let next = 1;
      const worker = async () => {
        while (!disposed && next < fileCount) {
          const offset = next;
          next += 1;
          await loadFrame(offset);
        }
      };
      await Promise.all(
        Array.from({ length: LOAD_CONCURRENCY }, () => worker())
      );
    };

    window.addEventListener("resize", resize);
    void start();

    return () => {
      disposed = true;
      window.removeEventListener("resize", resize);
    };
    /* hq / frameDir are fixed for the life of the page — they come
       from the server-read query string, so this never actually
       re-runs. Listed so the dependency is honest. */
  }, [hq, fourK, densify, frameDir, denseScale, fileCount]);

  useFrameEffect((frame) => {
    /* ---- the carve ---- */
    const media = mediaRef.current;
    if (media) {
      const vw = typeof window !== "undefined" ? window.innerWidth : Infinity;
      const carve = carveAt(
        frame,
        vw <= CARVE_MOBILE_MAX_WIDTH,
        vw <= CARVE_PHONE_MAX_WIDTH
      );
      media.style.setProperty("--carve-h", `${carve.height}%`);
      media.style.setProperty("--carve-rx", `${carve.radiusX}%`);
      media.style.setProperty("--carve-ry", `${carve.radiusY}%`);

      /* ---- the scrim ---- */
      // 1 everywhere except Glance's own on-screen window, where it
      // fades to 0 in exact lockstep with Glance's own opacity curve.
      const scrimOpacity = 1 - sectionStateAt(GLANCE_SECTION, frame).opacity;
      media.style.setProperty("--scrim-opacity", String(scrimOpacity));

      // The shared veil darkens the long Financial-through-Non-Financials
      // run. Its clip radius grows from the centre on entry and contracts
      // back into the centre after the Non-Financial Highlights section,
      // while the background remains untouched and all section UI stays
      // above it.
      const overlayStart = FINANCIAL_SECTION.enter?.frames[0] ?? frame;
      const overlayEnd = OVERLAY_END_SECTION.exit?.frames[1] ?? frame;
      const fadeIn = progressBetween(frame, overlayStart, overlayStart + OVERLAY_FADE_FRAMES);
      const fadeOut = 1 - progressBetween(frame, overlayEnd - OVERLAY_FADE_FRAMES, overlayEnd);
      const transitionReveal = Math.min(fadeIn, fadeOut);
      media.style.setProperty("--transition-scrim-opacity", String(transitionReveal));
      media.style.setProperty(
        "--transition-scrim-radius",
        `${150 * transitionReveal}%`
      );
    }

    /* ---- the frame ---- */
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const transition = backgroundTransitionAtFrame(frame);
    const backgroundFrame = backgroundFrameForFrame(frame);
    const resolveOffset = (logicalFrame: number) => {
      const clamped = Math.min(
        Math.max(frameToFile(logicalFrame), LAB_FIRST_FRAME),
        lastFile
      );
      const target = clamped - LAB_FIRST_FRAME;
      if (loaded.current[target]) return target;
      for (let step = 1; step < fileCount; step += 1) {
        if (target - step >= 0 && loaded.current[target - step]) return target - step;
        if (target + step < fileCount && loaded.current[target + step]) return target + step;
      }
      return -1;
    };
    const offset = resolveOffset(backgroundFrame);
    const fromOffset = transition ? resolveOffset(transition.from) : -1;
    if (offset < 0 || (transition === null && offset === painted.current)) return;

    const draw = (image: HTMLImageElement, alpha: number) => {
      const ratio = Math.max(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight
      );
      const width = image.naturalWidth * ratio;
      const height = image.naturalHeight * ratio;
      context.globalAlpha = alpha;
      context.drawImage(
        image,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height
      );
    };

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (transition && fromOffset >= 0 && images.current[fromOffset]) {
      draw(images.current[fromOffset]!, 1 - transition.progress);
    }
    const image = images.current[offset];
    if (!image) return;
    draw(image, transition ? transition.progress : 1);
    context.globalAlpha = 1;
    painted.current = offset;
  });

  return (
    <div className="lab-media" ref={mediaRef} aria-hidden="true">
      {/* First paint. A plain <img> in the server markup, so the
          browser can fetch and paint it immediately — the canvas
          cannot show anything until it has decoded a frame, set
          state and had a rAF tick, and until then the screen is flat
          teal. This is the handoff frame during the entry, or the
          settled frame when there is no entry.

          eslint's next/image rule is off here for the same reason as
          the hero art: these are exact-size assets addressed by
          frame number, not responsive images. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="lab-media__poster"
        src={frameSrc(frameToFile(posterFrame), frameDir)}
        alt=""
        fetchPriority="high"
        decoding="async"
      />
      <canvas
        ref={canvasRef}
        className="lab-media__canvas"
        data-ready={ready ? "true" : "false"}
      />
    </div>
  );
}
