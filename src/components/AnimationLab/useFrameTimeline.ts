"use client";

/* =========================================================
   ANIMATION LAB — the frame driver
   =========================================================

   One requestAnimationFrame loop produces the current frame and
   pushes it to subscribers. Which clock it reads depends on the
   phase:

     "entry"   a real timer. The page autoplays from the intro
               handoff to the hero's settled frame. Scroll is
               locked by AnimationLab for the whole of it.

     "scroll"  window.scrollY, mapped onto SCROLL_FIRST_FRAME ->
               SCROLL_LAST_FRAME via timeline.ts's frameForScrollPx —
               piecewise, not straight-line: it holds flat through
               every section's hold budget instead of advancing.

   The phase moves entry -> scroll exactly once and never goes back:
   the entry is a page-load event, not a scroll position, so
   scrolling to the top does not replay it — the same as any site
   whose intro plays once.

   Subscribers write straight to the DOM (element.style.*). React
   never re-renders on frame change: at 60fps a state update per
   frame would be dozens of renders a second for a couple of style
   properties. Home/ScrollScrubber.tsx paints from inside its rAF
   for the same reason.
   ========================================================= */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ENTRY_DURATION_MS,
  ENTRY_FRAMES,
  HERO_SETTLED_FRAME,
  frameForScrollPx,
  readPxPerFrame,
  scrollPxForFrame,
  totalScrollPx,
  partById,
  partStateAt,
  sectionLayerStateAt,
  type SectionTimeline,
} from "./timeline";
import { limitMobileFrame } from "./mobileFrameGuard";

export type Phase = "entry" | "scroll";

type Listener = (frame: number, phase: Phase, scrollPx: number) => void;

export interface FrameDriver {
  subscribe: (listener: Listener) => () => void;
  /** Latest frame, for anything outside the loop. */
  current: () => number;
  /** Current phase, likewise. */
  phase: () => Phase;
}

export const FrameContext = createContext<FrameDriver | null>(null);

/** The driver's write side. Only useFrameDriver's loop calls this. */
interface WritableFrameDriver extends FrameDriver {
  emit: (frame: number, phase: Phase, scrollPx: number) => void;
}

function useFrameDriverOrThrow(): FrameDriver {
  const driver = useContext(FrameContext);
  if (!driver) {
    throw new Error("Frame hooks must be used inside <AnimationLab>.");
  }
  return driver;
}

/**
 * Owns the rAF loop and the phase. Called once, by AnimationLab.
 *
 * `skipEntry` is for reduced motion: the entry never runs, the page
 * opens already settled at frame 50 and scroll is live immediately.
 *
 * `ready` gates the entry on its frames being decoded. Autoplay runs
 * on a clock, so unlike scrubbing it cannot wait for a slow frame —
 * it would simply play past it and show stale images. Until `ready`
 * the page holds on the handoff frame.
 */
export function useFrameDriver(skipEntry: boolean, ready: boolean): FrameDriver {
  // useState's lazy initialiser, not useRef: this object is read
  // during render (it goes into context), and a ref must not be.
  // Its state lives in the closure, so its identity is stable and
  // context consumers never re-render.
  const [driver] = useState<WritableFrameDriver>(() => {
    const listeners = new Set<Listener>();
    let frame = ENTRY_FRAMES[0];
    let phase: Phase = "entry";
    let scrollPx = 0;

    return {
      subscribe: (listener) => {
        listeners.add(listener);
        // Push current values immediately, so an element mounting
        // mid-entry is never left in its default state for a tick.
        listener(frame, phase, scrollPx);
        return () => {
          listeners.delete(listener);
        };
      },
      current: () => frame,
      phase: () => phase,
      emit: (nextFrame, nextPhase, nextScrollPx) => {
        frame = nextFrame;
        phase = nextPhase;
        scrollPx = nextScrollPx;
        for (const listener of listeners) listener(nextFrame, nextPhase, nextScrollPx);
      },
    };
  });

  useEffect(() => {
    let rafId = 0;
    let lastFrame = Number.NaN;
    let lastScrollPx = Number.NaN;
    let lastPhase: Phase | null = null;

    /* Reduced motion, or a reload after the entry has already been
       seen: open settled and scrollable. */
    let phase: Phase = skipEntry ? "scroll" : "entry";
    let entryStart = 0;

    // Read once, not per tick: it only changes via the ?px= override,
    // which is fixed for the life of the page. Matches AnimationLab's
    // own useState(readPxPerFrame) — both must agree or the spacer
    // height and the frame this loop computes fall out of sync.
    const pxPerFrame = readPxPerFrame();
    const isCompactViewport = window.matchMedia("(max-width: 1100px)").matches;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);

      let frame: number;
      let scrollPx = 0;

      if (phase === "entry") {
        // Hold on the handoff frame until the entry's frames are
        // decoded. The clock does not start until they are.
        if (!ready) {
          driver.emit(ENTRY_FRAMES[0], phase, scrollPx);
          return;
        }

        // First ready tick sets the origin, so a slow first paint
        // does not eat part of the entry.
        if (entryStart === 0) entryStart = now;

        const elapsed = now - entryStart;
        const t = Math.min(elapsed / ENTRY_DURATION_MS, 1);
        frame = ENTRY_FRAMES[0] + t * (ENTRY_FRAMES[1] - ENTRY_FRAMES[0]);

        if (t >= 1) {
          // Land exactly on the settled frame, then hand over. The
          // page is now loaded and idle; nothing moves until scroll.
          frame = HERO_SETTLED_FRAME;
          phase = "scroll";
        }
      } else {
        const scrollable =
          document.documentElement.scrollHeight - window.innerHeight;
        const progress =
          scrollable > 0
            ? Math.min(Math.max(window.scrollY / scrollable, 0), 1)
            : 0;
        scrollPx = progress * totalScrollPx(pxPerFrame);
        frame = frameForScrollPx(scrollPx, pxPerFrame);

        // A mobile touch flick can move the page across several short
        // section windows between rAF samples. Limit only the emitted
        // frame so every section gets a chance to settle; the browser's
        // actual scroll position and the visual progress bar stay native.
        if (
          isCompactViewport &&
          phase === lastPhase &&
          Number.isFinite(lastFrame)
        ) {
          const limitedFrame = limitMobileFrame(lastFrame, frame);
          if (limitedFrame !== frame) {
            frame = limitedFrame;
            scrollPx = scrollPxForFrame(frame, pxPerFrame);
          }
        }
      }

      // Sub-hundredth-of-a-frame changes are below anything the eye
      // or the canvas can show; skipping them keeps the loop cheap.
      // A phase change always goes through, however small the move.
      if (
        phase === lastPhase &&
        Math.abs(frame - lastFrame) < 0.01 &&
        Math.abs(scrollPx - lastScrollPx) < 0.01
      ) return;
      lastFrame = frame;
      lastScrollPx = scrollPx;
      lastPhase = phase;

      driver.emit(frame, phase, scrollPx);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [driver, skipEntry, ready]);

  return driver;
}

/** Run `fn` on every frame change. `fn` is read from a ref, so the
    caller need not memoise it. */
export function useFrameEffect(fn: Listener): void {
  const driver = useFrameDriverOrThrow();
  const held = useRef(fn);

  // Kept current in an effect, not during render. Declared before
  // the subscription effect so it has run by the time subscribe()
  // fires its first call.
  useEffect(() => {
    held.current = fn;
  });

  useEffect(
    () =>
      driver.subscribe((frame, phase, scrollPx) =>
        held.current(frame, phase, scrollPx)
      ),
    [driver]
  );
}

/**
 * The one hook a section layer needs. Attach the returned ref to the
 * layer's root; its opacity and offset are then driven by the
 * section's own windows in timeline.ts.
 *
 * Adding sections 3-15 later means adding config, not calling this
 * hook differently.
 */
export function useSectionLayer(
  section: SectionTimeline,
  options: { interactiveDuringEnter?: boolean } = {}
): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  useFrameEffect((frame, _phase, scrollPx) => {
    const element = ref.current;
    if (!element) return;

    const state = sectionLayerStateAt(section, frame, scrollPx, readPxPerFrame());

    element.style.opacity = String(state.opacity);
    element.style.transform = `translate3d(${state.x}vw, ${state.y}vh, 0)`;
    // "auto"/"visible", NOT "". lab.css hides layers marked
    // data-initial-hidden for the first paint, and that rule sets
    // BOTH visibility and pointer-events. Writing "" removes the
    // inline declaration and lets the stylesheet apply again — the
    // layer would fade in on schedule and then either vanish or,
    // worse, stay visible but permanently click-dead. Inline has to
    // state both outright.
    element.style.pointerEvents =
      state.interactive || (options.interactiveDuringEnter && state.opacity > 0.001)
        ? "auto"
        : "none";
    element.style.visibility = state.opacity <= 0.001 ? "hidden" : "visible";
  });

  return ref;
}

/**
 * One element inside the hero, revealing on its own window during
 * the ENTRY phase. It multiplies onto whatever the section layer is
 * doing, being a child of it — so the reveal and the later scroll
 * exit compose without either knowing about the other.
 *
 * `partId` is looked up in HERO_PARTS, so the windows stay in
 * timeline.ts alongside every other frame number.
 */
export function useRevealPart<T extends HTMLElement>(
  partId: string
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const part = partById(partId);

  useFrameEffect((frame) => {
    const element = ref.current;
    if (!element) return;

    const state = partStateAt(part, frame);

    element.style.opacity = String(state.opacity);
    // The CSS `translate` property, NOT `transform`. Several hero
    // elements are centred with transform: translateX(-50%), read
    // straight off their PSD bounding boxes; writing transform here
    // would wipe that out and shift them half their width.
    // `translate` is a separate property that composes with it.
    element.style.translate = `${state.x}vw ${state.y}vh`;
    element.style.pointerEvents = state.interactive ? "" : "none";
    // "visible", NOT "". lab.css hides these elements for the first
    // paint (see the entry first-paint block there), and writing ""
    // removes the inline declaration, letting that rule apply again —
    // the element would fade up and then vanish. The inline value has
    // to state visibility outright.
    element.style.visibility = state.opacity <= 0.001 ? "hidden" : "visible";
  });

  return ref;
}
