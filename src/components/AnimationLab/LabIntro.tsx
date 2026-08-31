"use client";

/* =========================================================
   ANIMATION LAB — the load screen + intro
   =========================================================

   An OVERLAY, not part of the frame driver. It renders on top of a
   fully-mounted <AnimationLab> that is holding on the handoff frame
   (HANDOFF_FRAME) with scroll locked. Sequence:

     1. "loading"  project-colour screen: a real 0 -> 100 counter
                   driven by decoded intro frames, plus a thin
                   progress bar pinned to the top edge. The "minimal"
                   variant shows a small spinner instead.
     2. "playing"  the 240 intro frames scrubbed on this component's
                   own <canvas> at INTRO_FPS. Skippable — click, key,
                   wheel, or the Skip button.
     3. "leaving"  the overlay fades out; onDone() releases the lab's
                   entry autoplay (which was gated on this, reusing
                   the same hold the slow-decode path already uses),
                   then the node removes itself.

   loaderOnly: stop at step 1 with the bar full — for tuning the
   screen in isolation on /animation-lab-loading. onDone is never
   called, so the lab underneath stays parked on the handoff frame.

   Nothing here touches timeline.ts's scroll math or the page height.
   With none of the -full / -intro / -loading routes active this file
   is never imported. */

import { useCallback, useEffect, useRef, useState } from "react";
import { INTRO_FRAME_COUNT, INTRO_FPS, introFrameSrc } from "./timeline";

type Stage = "loading" | "playing" | "leaving";

export default function LabIntro({
  loaderOnly = false,
  minimal = false,
  onDone,
}: {
  loaderOnly?: boolean;
  minimal?: boolean;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>("loading");
  const [pct, setPct] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
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

  /* ---- preload + decode the intro frames, tracking real progress ---- */
  useEffect(() => {
    let disposed = false;
    let loaded = 0;
    const images: HTMLImageElement[] = [];

    const bump = () => {
      loaded += 1;
      if (!disposed) setPct(Math.round((loaded / INTRO_FRAME_COUNT) * 100));
    };

    const jobs = Array.from({ length: INTRO_FRAME_COUNT }, (_, i) => {
      const n = i + 1;
      const img = new Image();
      img.decoding = "async";
      img.src = introFrameSrc(n);
      images[n - 1] = img;
      // A frame that fails to decode must not stall the screen.
      return img.decode().catch(() => {}).finally(bump);
    });

    void Promise.all(jobs).then(() => {
      if (disposed) return;
      imagesRef.current = images;
      if (loaderOnly) {
        setPct(100);
        return;
      }
      setStage("playing");
    });

    return () => {
      disposed = true;
    };
  }, [loaderOnly]);

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
    let start = 0;
    const totalMs = (INTRO_FRAME_COUNT / INTRO_FPS) * 1000;

    const tick = (now: number) => {
      if (start === 0) start = now;
      const t = Math.min((now - start) / totalMs, 1);
      paint(Math.max(1, Math.round(t * INTRO_FRAME_COUNT)));
      if (t >= 1) {
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
