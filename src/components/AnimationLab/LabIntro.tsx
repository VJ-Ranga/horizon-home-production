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
     2. "playing"  the intro shot plays as a real <video>
                   (/hero/intro.mp4 — H.264, 1920px wide, CRF 26, no
                   audio) at its native 30fps. This used to be 240
                   webp frames scrubbed on a <canvas> at ~7.8fps
                   (240 / 30.8s) — visibly stepped no matter how the
                   scrub math was tuned, since the frame rate itself
                   was the problem, not the drawing. A muted autoplay
                   video is both smoother (true 30fps) and an order of
                   magnitude smaller (6.7MB vs the old set's 66MB).
                   Skippable — key, wheel, or the Skip button, deliberately
                   NOT a click anywhere (see the skip-affordances effect
                   below for why).
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
import {
  LAB_FIRST_FRAME,
  LAB_FRAME_COUNT,
  frameSrc,
} from "./timeline";
import {
  getIntroAssetPlan,
  type IntroAssetPlan,
} from "./frameDirMobile";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const targetRef = useRef(0); // real progress, 0..100
  const shownRef = useRef(0); // eased value actually on screen
  const mainDoneRef = useRef(false);
  const fullAtRef = useRef(0); // when the bar first reached 100
  const introReadyRef = useRef(false); // intro video can play through

  // No src is rendered until the client knows the viewport. This prevents a
  // phone from starting either the desktop video or desktop-frame preload
  // during hydration and replacing them a moment later.
  const [assetPlan, setAssetPlan] = useState<IntroAssetPlan | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const updateSource = () => {
      setAssetPlan(getIntroAssetPlan(query.matches, LAB_FRAME_COUNT));
    };

    updateSource();
    query.addEventListener("change", updateSource);
    return () => query.removeEventListener("change", updateSource);
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setStage("leaving");
    onDone(); // the lab entry autoplay may start now, under the fade
    window.setTimeout(() => {
      if (rootRef.current) rootRef.current.style.display = "none";
    }, 650);
  }, [onDone]);

  /* ---- preload the asset plan's opening main frames. Desktop keeps its
         original 25% batch; phones use only the 50 mobile hero-entry frames.
         targetRef tracks REAL progress (frames decoded / batch); a wave of
         already-downloaded frames can decode almost together, so the raw
         number lurches. The displayed % is eased toward targetRef below. ---- */
  useEffect(() => {
    if (!assetPlan) return;

    let disposed = false;
    let loaded = 0;

    const bump = () => {
      loaded += 1;
      targetRef.current = Math.min(
        100,
        (loaded / assetPlan.preloadFrameCount) * 100,
      );
    };

    // the batch the % is tied to: main frames 1 .. 25%. Progress is counted
    // on `load` (bytes in, cache warm — the point of the preload) and decode
    // is kicked off best-effort. Gating the count on decode() would freeze
    // the whole screen if the tab is ever backgrounded, since browsers pause
    // image decoding for a hidden document.
    const mainJobs = Array.from(
      { length: assetPlan.preloadFrameCount },
      (_, i) => {
        const img = new Image();
        img.decoding = "async";
        return new Promise<void>((resolve) => {
          let settled = false;
          const settle = () => {
            if (settled) return;
            settled = true;
            bump();
            resolve();
          };
          img.onload = () => {
            void img.decode().catch(() => {});
            settle();
          };
          img.onerror = settle; // a missing frame must not stall the screen
          img.src = frameSrc(LAB_FIRST_FRAME + i, assetPlan.frameDir);
        });
      },
    );

    // The intro video — needed for the "playing" stage, but it loads in
    // the background once the viewport-safe src has been selected
    // and never touches the visible %. introReadyRef flips once it can
    // play through without stalling; the gate below falls back to a
    // grace period if that never fires (e.g. a very slow connection).
    if (!loaderOnly) {
      const video = videoRef.current;
      if (video) {
        const markReady = () => {
          introReadyRef.current = true;
        };
        video.addEventListener("canplaythrough", markReady, { once: true });
      }
    }

    void Promise.all(mainJobs).then(() => {
      if (disposed) return;
      targetRef.current = 100;
      mainDoneRef.current = true;
    });

    return () => {
      disposed = true;
    };
  }, [loaderOnly, assetPlan]);

  /* ---- ease the displayed % toward the real one, so it never lurches,
         then hand over to the intro on a smooth, unhurried beat ---- */
  useEffect(() => {
    if (stage !== "loading") return;
    const startedAt = performance.now();
    const MIN_SWEEP_MS = 1200; // never fill the whole bar faster than this
    const MIN_VISIBLE_MS = 2000; // load screen stays up at least this long
    const HOLD_MS = 500; // sit on 100 for a beat before leaving
    const INTRO_GRACE_MS = 3500; // don't wait on a slow intro video forever
    // On a cold cache the first batch of main frames can take several
    // seconds to arrive, leaving the counter frozen on 0 the whole time.
    // A time-based floor drifts the displayed % up toward the 25% preload
    // mark on its own so the screen always reads as alive; it eases off as
    // it nears 25 (exp curve, never quite reaches it) and real frame
    // progress takes over the moment it overtakes this floor. The floor is
    // capped at the preload fraction — real loading still carries 25→100.
    const CREEP_CEIL = 25;
    const CREEP_TAU = 3200; // ms; ~16% by 3.2s, ~22% by 6.4s, asymptotic to 25

    const id = window.setInterval(() => {
      const now = performance.now();
      const elapsed = now - startedAt;
      const ceil = elapsed < MIN_SWEEP_MS ? 96 : 100;
      const creepFloor = CREEP_CEIL * (1 - Math.exp(-elapsed / CREEP_TAU));
      const target = Math.min(ceil, Math.max(targetRef.current, creepFloor));
      const gap = target - shownRef.current;
      if (gap > 0) {
        shownRef.current = Math.min(
          target,
          shownRef.current + Math.max(1.8, gap * 0.09),
        );
      }
      setPct(Math.floor(shownRef.current));

      if (shownRef.current < 100 || !mainDoneRef.current) return;
      if (fullAtRef.current === 0) fullAtRef.current = now;

      if (loaderOnly) {
        window.clearInterval(id);
        return;
      }

      const sinceFull = now - fullAtRef.current;
      const introReady = introReadyRef.current || sinceFull >= INTRO_GRACE_MS;
      if (introReady && sinceFull >= HOLD_MS && elapsed >= MIN_VISIBLE_MS) {
        window.clearInterval(id);
        setStage("playing"); // .lab-intro__load then crossfades out over the first frame
      }
    }, 1000 / 30);

    return () => window.clearInterval(id);
  }, [stage, loaderOnly]);

  /* ---- play the intro ----
     The video is mounted from first render (not stage-gated) so it has
     the whole "loading" stage to preload; here we just start it once
     "playing" begins. Its own "ended" event calls finish() — no manual
     clock needed, native playback is the clock now.

     Guarded on video.paused, NOT just [stage, finish]: `finish` is a
     useCallback keyed on onDone, and AnimationLab passes onDone as a
     fresh inline arrow every render — so finish's identity is not
     stable, and this effect can re-run while still in the "playing"
     stage. Without the guard that would reset currentTime and call
     play() again mid-playback on every such re-render. */
  useEffect(() => {
    if (stage !== "playing") return;
    const video = videoRef.current;
    if (!video || !video.paused) return;

    video.currentTime = 0;
    // Autoplay can be blocked in rare cases even when muted; if it is,
    // there is nothing to show, so move on rather than stall on black.
    void video.play().catch(() => finish());
  }, [stage, finish]);

  /* ---- skip affordances, only while the intro is playing ----
     Deliberate actions only — keydown and wheel, not pointerdown.
     A global click-anywhere used to be here too, and since the video
     covers almost the whole screen, that meant the very first click
     ANYWHERE (very often one aimed at the Skip button itself) ended
     the intro before the button could register as a distinct,
     visible control — "clicking the video skips it" and "the Skip
     button is missing" were the same bug. The button's own onClick
     below is now the only click-based way to skip. */
  useEffect(() => {
    if (stage !== "playing") return;
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("wheel", skip, { passive: true });
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("wheel", skip);
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
      {/* Mounted from first render without a src; after mount, preload="auto"
          warms only the viewport-safe video before "playing" needs it.
          Sits under the load
          overlay (z-index) until that stage ends, so nothing needs an
          extra visibility toggle. loaderOnly never needs it at all. */}
      {!loaderOnly ? (
        <video
          ref={videoRef}
          className="lab-intro__canvas"
          aria-hidden="true"
          muted
          playsInline
          preload="auto"
          src={assetPlan?.videoSrc}
          onEnded={finish}
        />
      ) : null}

      {/* Load-screen visuals. Kept mounted through the hand-off so they can
          crossfade out over the intro's first frame rather than hard-cut. */}
      <div className="lab-intro__load" data-hidden={stage !== "loading"}>
        {/* background — 1:1 with the live /ai-assistant AuroraBackground
            (see lab.css for the port notes). */}
        <div className="lab-intro__aurora" aria-hidden="true">
          <span className="lab-intro__aurora-base" />
          <span className="lab-intro__fluid lab-intro__fluid--1" />
          <span className="lab-intro__fluid lab-intro__fluid--2" />
          <span className="lab-intro__fluid lab-intro__fluid--3" />
          <span className="lab-intro__fluid lab-intro__fluid--4" />
          <span className="lab-intro__aurora-noise" />
        </div>

        {stage === "loading" ? (
          minimal ? (
            <span className="lab-intro__spinner" aria-hidden="true" />
          ) : (
            <div className="lab-intro__loader">
              <div className="lab-intro__dial">
                <svg
                  className="lab-intro__ring"
                  viewBox="0 0 260 260"
                  aria-hidden="true"
                >
                  <circle
                    className="lab-intro__ring-track"
                    cx="130"
                    cy="130"
                    r="120"
                    pathLength={100}
                  />
                  <circle
                    className="lab-intro__ring-fill"
                    cx="130"
                    cy="130"
                    r="120"
                    pathLength={100}
                    style={{ strokeDashoffset: 100 - pct }}
                  />
                  {/* Bright glowing tip at the arc's leading edge — same
                      comet-head look as the intro video's own opening
                      shot, so the two feel like one visual language.
                      NOT a separate circle animated via transform or
                      cx/cy: both were tried and both drift out of sync
                      with the fill (cx/cy transitions are not reliably
                      animatable across browsers, and repeatedly
                      re-setting transform on an element that already
                      has a CSS transition on transform gets stuck
                      after the first change — reproduced directly,
                      independent of React). Instead this is a second
                      stroke on the SAME circle geometry as ring-fill,
                      with an almost-zero-length dash — same
                      stroke-dashoffset value, same transition, same
                      static -90deg rotate. It is guaranteed to sit
                      exactly at the fill's tip because it is driven by
                      the identical formula through the identical,
                      already-proven-smooth mechanism. */}
                  <circle
                    className="lab-intro__ring-head"
                    cx="130"
                    cy="130"
                    r="120"
                    pathLength={100}
                    style={{ strokeDashoffset: 100 - pct }}
                  />
                </svg>
                <p className="lab-intro__count" aria-live="polite">
                  {pct}
                  <span className="lab-intro__count-pct">%</span>
                </p>
              </div>
              <p className="lab-intro__label">Loading</p>
            </div>
          )
        ) : null}
      </div>

      {stage === "playing" ? (
        <button type="button" className="lab-intro__skip" onClick={finish}>
          Skip
        </button>
      ) : null}
    </div>
  );
}
