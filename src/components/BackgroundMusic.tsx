"use client";

/* =========================================================
   Site-wide background music.

   One looping track (public/audio/home-bg.mp3) with a speaker
   toggle pinned top-right. Rendered once in the root layout so it
   persists across client-side navigation.

   Autoplay-with-sound is blocked by browsers until the user
   interacts with the page, so on mount we try to play and, if that
   is rejected, arm one-shot listeners for the first pointer / key /
   touch anywhere. The mute state is remembered in localStorage.
   ========================================================= */

import { useCallback, useEffect, useRef, useState } from "react";

const SRC = "/audio/home-bg.mp3";
// Kept deliberately low — background bed, not foreground.
const VOLUME = 0.18;
const STORAGE_KEY = "hz-bg-music-muted";

function readMuted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export default function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Start unmuted unless the visitor muted it on a previous visit. The
  // real <audio muted> is synced in the effect below (SSR-safe).
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);

  // Try to start playback; safe to call repeatedly.
  const tryPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const p = audio.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  }, []);

  // Sync stored preference + volume on mount, then start once the
  // homepage intro has handed off to the first frame.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const savedMuted = readMuted();
    setMuted(savedMuted);
    audio.muted = savedMuted;
    audio.volume = VOLUME;
    setReady(true);

    const root = document.documentElement;

    let started = false;
    let everLocked = false;
    let poll: number | null = null;
    let fallback: number | null = null;

    const onGesture = () => {
      tryPlay();
      if (audioRef.current && !audioRef.current.paused) {
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("keydown", onGesture);
        window.removeEventListener("touchstart", onGesture);
      }
    };

    const start = () => {
      if (started) return;
      started = true;
      if (poll !== null) window.clearInterval(poll);
      if (fallback !== null) window.clearTimeout(fallback);
      tryPlay();
      // If autoplay is still blocked at this point, the first
      // interaction anywhere unlocks it.
      window.addEventListener("pointerdown", onGesture);
      window.addEventListener("keydown", onGesture);
      window.addEventListener("touchstart", onGesture);
    };

    // The Animation Lab keeps `lab-locked` on <html> while the loader /
    // intro shot is playing and drops it at the hand-off to frame 1.
    // Wait for that class to appear and then clear before starting.
    // Pages without the lab (no `.lab` node) just start.
    const check = () => {
      const locked = root.classList.contains("lab-locked");
      if (locked) everLocked = true;
      if (!document.querySelector(".lab")) return start();
      if (everLocked && !locked) return start();
    };
    check();
    if (!started) {
      poll = window.setInterval(check, 200);
      fallback = window.setTimeout(start, 45000); // loader-only safety net
    }

    return () => {
      if (poll !== null) window.clearInterval(poll);
      if (fallback !== null) window.clearTimeout(fallback);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("touchstart", onGesture);
    };
  }, [tryPlay]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !audio.muted;
    audio.muted = next;
    setMuted(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* private mode / storage disabled — non-fatal */
    }
    // Unmuting is also a user gesture, so it's a good moment to make
    // sure the element is actually playing.
    if (!next) tryPlay();
  }, [tryPlay]);

  return (
    <>
      <audio ref={audioRef} src={SRC} loop preload="auto" playsInline />
      <button
        type="button"
        data-bg-music
        onClick={toggle}
        aria-label={muted ? "Unmute background music" : "Mute background music"}
        aria-pressed={muted}
        className="bg-music-toggle"
        style={{ opacity: ready ? 1 : 0 }}
      >
        {muted ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M11 5 6 9H3v6h3l5 4V5z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="m16 9 5 6M21 9l-5 6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M11 5 6 9H3v6h3l5 4V5z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}
