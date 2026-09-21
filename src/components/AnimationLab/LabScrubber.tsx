"use client";

/* =========================================================
   Background scrubber
   =========================================================

   Paints the current frame onto a <canvas>. The frame comes from the
   shared FrameContext rather than from scroll directly, so the
   background and the section layers cannot drift apart.

   Desktop keeps every frame decoded; phones and tablets keep a
   sliding window around the current frame (see below). The entry
   frames (1-50) are already decoded by AnimationLab.

   Also owns the carve (timeline.ts carveAt()) and the shared scrim.
   ========================================================= */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  LAB_FIRST_FRAME,
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
import {
  FRAME_DIR_MOBILE,
  FRAME_DIR_TABLET,
  isCompactViewport,
  isPhoneViewport,
} from "./frameDirMobile";

/* Haycarb at a Glance is the one section built light-themed — dark
   ink on light stat tiles, no background of its own (see
   GlanceLayer.tsx) — so the scrim below has to fade OUT while it
   is on screen rather than applying everywhere uniformly. Reusing its
   own sectionStateAt opacity curve rather than a second frame-range
   check keeps the scrim's fade exactly in step with Glance's own
   enter/hold/exit, including the easing. */
const GLANCE_SECTION = SECTIONS[5];
const FINANCIAL_SECTION = SECTIONS[7];
// 19-end-screen. The veil runs unbroken to the end of the last section,
// so the closing sections share one overlay.
const OVERLAY_END_SECTION = SECTIONS[18];
const OVERLAY_FADE_FRAMES = 20;
import { useFrameEffect } from "./useFrameTimeline";
import { useMouseParallax } from "./useMouseParallax";


/** Which frame folder a given density/quality combination reads.
    densify 1 is the plain set; 2 and 4 are 1080p dense sets (2x also
    has an HQ variant). */
function resolveFrameDir(
  densify: number,
  hq: boolean,
  fourK: boolean,
  compact: boolean,
  phone: boolean,
): string {
  if (phone) return FRAME_DIR_MOBILE;
  if (compact) return FRAME_DIR_TABLET;
  if (densify === 4) return FRAME_DIR_4X;
  if (densify === 2) return hq ? FRAME_DIR_2X_HQ : FRAME_DIR_2X;
  if (fourK) return FRAME_DIR_4K;
  if (hq) return FRAME_DIR_HQ;
  // Phones read the small set — same 1125 files, ~7x less bitmap.
  return FRAME_DIR_DEV;
}

const LOAD_CONCURRENCY = 6;

/* Phones cannot hold the whole decoded frame set. 1125 360x640 bitmaps
   is ~1 GB of decoded RGBA (the .webp files are tiny, the decode is
   not) and iOS Safari kills the tab for it — "A problem repeatedly
   occurred". So on a phone the loader keeps only a sliding window
   around the frame on screen and drops the rest. Desktop is unchanged:
   it still loads and retains every frame. */
const PHONE_WINDOW_AHEAD = 45;
const PHONE_WINDOW_BACK = 20;
const PHONE_WINDOW_KEEP = 70;
const TABLET_WINDOW_AHEAD = 72;
const TABLET_WINDOW_BACK = 36;
const TABLET_WINDOW_KEEP = 110;
const PHONE_LOAD_CONCURRENCY = 4;
const TABLET_LOAD_CONCURRENCY = 6;

const subscribeToViewport = (onChange: () => void) => {
  const query = window.matchMedia("(max-width: 700px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const subscribeToCompactViewport = (onChange: () => void) => {
  const query = window.matchMedia("(max-width: 1100px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

const getPhoneSnapshot = () => isPhoneViewport();
const getServerPhoneSnapshot = () => false;
const getCompactSnapshot = () => isCompactViewport();
const getServerCompactSnapshot = () => false;
const subscribeToMount = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

export default function LabScrubber({
  posterFrame,
  hidePoster = false,
  hq = false,
  fourK = false,
  densify = 1,
  onFrameLoaded,
}: {
  posterFrame: number;
  /** Home's intro overlay owns first paint; omit the SSR poster beneath it. */
  hidePoster?: boolean;
  hq?: boolean;
  /** Read the 4K frame set. */
  fourK?: boolean;
  /** Frame-density multiplier: 1 (default), 2, or 4. Draws k times as
      many files across the same frame numbers — see FRAME_DIR_2X. */
  densify?: number;
  /** Fired once per frame, right after it decodes. AnimationLab uses
      this to know when a section's frames are ready to hold scroll
      for — see the scroll gate there. */
  onFrameLoaded?: (frame: number) => void;
}) {
  /* `mounted` is false on the server and on the first client render, so
     the poster <img src> below matches between the two (window /
     matchMedia are client-only) — no hydration mismatch. Once it flips
     the frame dir resolves for real and the loader effect starts (it
     bails while !mounted), so a phone never starts on the full set. */
  const mounted = useSyncExternalStore(
    subscribeToMount,
    getMountedSnapshot,
    getServerMountedSnapshot,
  );
  const phoneSnapshot = useSyncExternalStore(
    subscribeToViewport,
    getPhoneSnapshot,
    getServerPhoneSnapshot,
  );
  const compactSnapshot = useSyncExternalStore(
    subscribeToCompactViewport,
    getCompactSnapshot,
    getServerCompactSnapshot,
  );
  const compact = mounted && compactSnapshot;
  const phone = mounted && phoneSnapshot;
  const frameDir = resolveFrameDir(densify, hq, fourK, compact, phone);

  /* `densify` only changes which file a frame maps to; frame numbers
     stay the same everywhere else. `frame` is continuous during scroll,
     so round(k*f - (k-1)) resolves to in-between files, which is where
     the extra smoothness comes from. */
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
  /* The frame offset the user is on RIGHT NOW, written every frame-tick
     regardless of whether the paint succeeds. The phone loader centres
     its sliding window on this; painted.current can't be used because
     it only advances after a successful draw, which needs the frame
     already loaded — a deadlock on the phone's partial cache. */
  const wantedOffset = useRef(0);

  useMouseParallax(mediaRef);

  // Read from a ref rather than added to the loading effect's deps:
  // the callback is re-created every AnimationLab render and none of
  // that should restart frame loading.
  const onFrameLoadedRef = useRef(onFrameLoaded);
  useEffect(() => {
    onFrameLoadedRef.current = onFrameLoaded;
  });

  useEffect(() => {
    // Hold off until the viewport is known, so a phone never starts the
    // full-size set and then restarts on the small one.
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    images.current = new Array(fileCount);
    loaded.current = new Array(fileCount).fill(false);

    let disposed = false;
    const windowAhead = phone ? PHONE_WINDOW_AHEAD : TABLET_WINDOW_AHEAD;
    const windowBack = phone ? PHONE_WINDOW_BACK : TABLET_WINDOW_BACK;
    const windowKeep = phone ? PHONE_WINDOW_KEEP : TABLET_WINDOW_KEEP;
    const compactConcurrency = phone
      ? PHONE_LOAD_CONCURRENCY
      : TABLET_LOAD_CONCURRENCY;

    /* Backing store: dpr 1 for the regular set (a higher dpr would only
       upscale 1080p frames at 4x the fill rate), up to dpr 2 for the
       HQ / 4K sets, which have the detail to fill it. */
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
           forever — scroll locked at the hero. Keep the round() for
           any non-integer density. Every logical frame stays covered because there are k >= 1
           files per logical frame. */
        onFrameLoadedRef.current?.(
          Math.round(offset / denseScale) + LAB_FIRST_FRAME
        );
      } catch {
        // Leave it unloaded; nearestLoaded() routes around it.
      }
    };

    const evictOutsideWindow = (center: number) => {
      for (let i = 0; i < fileCount; i += 1) {
        if (!images.current[i]) continue;
        if (
          i < center - windowKeep ||
          i > center + windowKeep
        ) {
          images.current[i] = undefined;
          loaded.current[i] = false;
        }
      }
    };

    /* Compact loader: keep a device-sized [center-BACK, center+AHEAD]
       decoded window, nearest first, and evict everything past KEEP on
       either side. `center`
       follows painted.current — the frame the scrubber last drew, i.e.
       where the user is. onFrameLoaded still fires the first time each
       frame decodes, so AnimationLab's scroll gate (a Set that only
       grows) still opens section by section and eviction never
       re-closes it. Re-entering an evicted stretch keeps the last drawn
       frame on the canvas for ~one tick until the window refills. */
    const runCompactLoader = async () => {
      while (!disposed) {
        const center = wantedOffset.current;
        evictOutsideWindow(center);
        const lo = Math.max(0, center - windowBack);
        const hi = Math.min(fileCount - 1, center + windowAhead);
        const missing: number[] = [];
        for (let i = lo; i <= hi; i += 1) {
          if (!images.current[i]) missing.push(i);
        }
        missing.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
        for (
          let i = 0;
          i < missing.length && !disposed;
          i += compactConcurrency
        ) {
          const here = wantedOffset.current;
          // Moved far while filling — abandon this pass and rebuild the
          // window around the new position on the next loop.
          if (Math.abs(here - center) > windowAhead) break;
          await Promise.all(
            missing
              .slice(i, i + compactConcurrency)
              .map((off) => loadFrame(off))
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 90));
      }
    };

    const start = async () => {
      await loadFrame(0); // frame 1 — the intro handoff, what you see first
      if (disposed) return;

      resize();
      setReady(true);

      if (compact) {
        await runCompactLoader();
        return;
      }

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
  }, [mounted, compact, phone, hq, fourK, densify, frameDir, denseScale, fileCount]);

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
    wantedOffset.current = Math.min(
      Math.max(frameToFile(backgroundFrame) - LAB_FIRST_FRAME, 0),
      fileCount - 1
    );
    const resolveOffset = (logicalFrame: number, preservePainted = false) => {
      const clamped = Math.min(
        Math.max(frameToFile(logicalFrame), LAB_FIRST_FRAME),
        lastFile
      );
      const target = clamped - LAB_FIRST_FRAME;
      if (loaded.current[target]) return target;
      if (
        preservePainted &&
        painted.current >= 0 &&
        loaded.current[painted.current]
      ) {
        return painted.current;
      }
      if (compact) {
        for (let step = 1; target - step >= 0; step += 1) {
          if (loaded.current[target - step]) return target - step;
        }
        return -1;
      }
      for (let step = 1; step < fileCount; step += 1) {
        if (target - step >= 0 && loaded.current[target - step]) return target - step;
        if (target + step < fileCount && loaded.current[target + step]) return target + step;
      }
      return -1;
    };
    const offset = resolveOffset(backgroundFrame, true);
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
      {!hidePoster && (
        <picture>
          <source
            media="(max-width: 700px)"
            srcSet={frameSrc(frameToFile(posterFrame), FRAME_DIR_MOBILE)}
          />
          <source
            media="(max-width: 1100px)"
            srcSet={frameSrc(frameToFile(posterFrame), FRAME_DIR_TABLET)}
          />
          <img
            className="lab-media__poster"
            src={frameSrc(frameToFile(posterFrame), frameDir)}
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      )}
      <canvas
        ref={canvasRef}
        className="lab-media__canvas"
        data-ready={ready ? "true" : "false"}
      />
    </div>
  );
}
