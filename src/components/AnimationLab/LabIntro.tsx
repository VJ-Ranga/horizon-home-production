"use client";

/* =========================================================
   ANIMATION LAB — the load screen + intro
   =========================================================

   An OVERLAY, not part of the frame driver. It renders on top of a
   fully-mounted <AnimationLab> that is holding on the handoff frame
   (HANDOFF_FRAME) with scroll locked. Sequence:

     1. "playing"  the 240 intro frames scrubbed on this component's
                   own <canvas> at INTRO_FPS. There is no load screen:
                   playback starts on mount and the frames stream in
                   underneath it. Skippable — click, key, wheel, or
                   the Skip button.
     2. "leaving"  the overlay fades out; onDone() releases the lab's
                   entry autoplay (which was gated on this, reusing
                   the same hold the slow-decode path already uses),
                   then the node removes itself.

   The frames are 66MB, so waiting for all of them before the first
   paint meant a long dead screen. They are all still requested up
   front, but playback no longer waits for them: the clock is clamped
   to the highest contiguously-decoded frame, so the intro starts on
   frame 1 and HOLDS whenever it catches up with the download,
   resuming where it left off. It never skips ahead and never shows
   an undrawn frame.

   loaderOnly keeps the old "loading" screen, reached only from
   /animation-lab-loading for tuning that screen in isolation: it
   waits for the full decode, parks with the bar full, and never
   calls onDone, so the lab underneath stays on the handoff frame.

   Nothing here touches timeline.ts's scroll math or the page height.
   With none of the -full / -intro / -loading routes active this file
   is never imported. */

import { useCallback, useEffect, useRef, useState } from "react";
import { INTRO_FRAME_COUNT, INTRO_FPS, introFrameSrc } from "./timeline";

type Stage = "loading" | "playing" | "leaving";

/* How long a decode may hold a loaded frame before it is used anyway. */
const DECODE_GRACE_MS = 300;

export default function LabIntro({
  loaderOnly = false,
  minimal = false,
  onDone,
}: {
  loaderOnly?: boolean;
  minimal?: boolean;
  onDone: () => void;
}) {
  // No load screen: the intro is already playing on mount. loaderOnly is the
  // one path that still shows the old screen.
  const [stage, setStage] = useState<Stage>(loaderOnly ? "loading" : "playing");
  const [pct, setPct] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  /* Highest frame number (1-based) decoded with no gap before it. The clock
     never advances past this, so playback holds instead of skipping. */
  const readyRef = useRef(0);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setStage("leaving");
    onDone(); // the lab entry autoplay may start now, under the fade
    window.setTimeout(() => {
      if (rootRef.current) rootRef.current.style.display = "none";
    }, 650);
  }, [onDone]);

  /* ---- preload the intro frames, tracking contiguous readiness ---- */
  useEffect(() => {
    let disposed = false;
    let loaded = 0;
    const images: HTMLImageElement[] = new Array(INTRO_FRAME_COUNT);
    const decoded: boolean[] = new Array(INTRO_FRAME_COUNT).fill(false);

    imagesRef.current = images;
    readyRef.current = 0;

    /* Mark frame i usable and extend the contiguous-ready run. Idempotent:
       decode-settle and the grace timer race to call it. */
    const settle = (i: number) => {
      if (disposed || decoded[i]) return;
      decoded[i] = true;
      while (readyRef.current < INTRO_FRAME_COUNT && decoded[readyRef.current]) {
        readyRef.current += 1;
      }
      loaded += 1;
      setPct(Math.round((loaded / INTRO_FRAME_COUNT) * 100));
    };

    /* Every frame is requested up front, exactly as before. Nothing here may
       depend on another frame having finished: an earlier windowed version
       pumped the next request from each settle, and when a request hung with
       no load and no error event the whole queue deadlocked behind it. */
    for (let i = 0; i < INTRO_FRAME_COUNT; i += 1) {
      const img = new Image();
      img.decoding = "async";
      images[i] = img;

      img.onload = () => {
        /* Prefer decoding before the frame is painted, but never wait on it
           indefinitely — decode() can fail to settle under this many parallel
           decodes, and a frame stuck undecoded would block the ready run and
           freeze playback. The image is loaded either way, so the worst case
           is one synchronous decode inside drawImage. */
        const guard = window.setTimeout(() => settle(i), DECODE_GRACE_MS);
        void img
          .decode()
          .catch(() => {})
          .finally(() => {
            window.clearTimeout(guard);
            settle(i);
          });
      };
      // A frame that 404s or fails must not block the run; paint() skips any
      // image that never got pixels, so the previous frame simply holds.
      img.onerror = () => settle(i);

      img.src = introFrameSrc(i + 1);
    }

    return () => {
      disposed = true;
    };
  }, []);

  /* ---- play the intro on a clock ---- */
  useEffect(() => {
    if (stage !== "playing") return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = () => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    size();
    window.addEventListener("resize", size);

    const paint = (n: number) => {
      const img = imagesRef.current[Math.min(n, INTRO_FRAME_COUNT) - 1];
      if (!img || !img.naturalWidth) return;
      const ratio = Math.max(
        canvas.width / img.naturalWidth,
        canvas.height / img.naturalHeight,
      );
      const w = img.naturalWidth * ratio;
      const h = img.naturalHeight * ratio;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    };

    let rafId = 0;
    let last = 0;
    let played = 1; // current position, in frames, fractional

    /* Advance by real elapsed time, but never past the frames we actually
       have. When the loader falls behind, `played` stops moving and the last
       good frame stays up; when it catches up, playback resumes from there
       rather than jumping to where the wall clock would have been. */
    const tick = (now: number) => {
      if (last === 0) last = now;
      const dt = (now - last) / 1000;
      last = now;

      played = Math.min(played + dt * INTRO_FPS, Math.max(1, readyRef.current));
      paint(Math.round(played));

      if (played >= INTRO_FRAME_COUNT) {
        finish();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    paint(1);
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", size);
    };
  }, [stage, finish]);

  /* ---- skip affordances, only while the intro is playing ---- */
  useEffect(() => {
    if (stage !== "playing") return;
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [stage, finish]);

  return (
    <div
      ref={rootRef}
      className="lab-intro"
      data-stage={stage}
      data-variant={minimal ? "minimal" : "full"}
      role="presentation"
    >
      {stage !== "loading" ? (
        <canvas ref={canvasRef} className="lab-intro__canvas" aria-hidden="true" />
      ) : null}

      {stage === "loading" ? (
        <>
          <div
            className="lab-intro__bar"
            style={{ ["--pct" as string]: String(pct / 100) }}
          >
            <span className="lab-intro__bar-fill" />
          </div>
          {minimal ? (
            <span className="lab-intro__spinner" aria-hidden="true" />
          ) : (
            <div className="lab-intro__loader">
              <p className="lab-intro__label">Loading</p>
            </div>
          )}
        </>
      ) : null}

      {stage === "playing" ? (
        <button type="button" className="lab-intro__skip" onClick={finish}>
          Skip
        </button>
      ) : null}
    </div>
  );
}
