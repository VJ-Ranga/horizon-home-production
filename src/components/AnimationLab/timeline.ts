/* =========================================================
   Timeline model for the scroll experience.

   Two phases, driven by different clocks:

     "entry"   Autoplay with scroll locked. Runs on a timer from the
               intro hand-off (frame 1) to the settled hero (frame 50)
               while the hero elements reveal.

     "scroll"  Scroll-driven from the settled hero onward.

   Frame numbers are 1-based indexes into public/frames (5.1922 fps).
   Frame 1 is the visual hand-off from the intro video.
   ========================================================= */

export type TimelineMode = "desktop" | "compact";

export interface TimelinePolicy {
  mode: TimelineMode;
  frameStepLimit: number;
}

/** Per-mode timeline behaviour. Compact limits how many frames a single
    tick may advance, so a touch flick cannot skip short sections. */
export function timelinePolicy(mode: TimelineMode): TimelinePolicy {
  switch (mode) {
    case "compact":
      return { mode, frameStepLimit: 2 };
    case "desktop":
      return { mode, frameStepLimit: Infinity };
  }
}

/** Frame the intro video hands over to. */
export const HANDOFF_FRAME = 1;

/** Frame where the hero is fully loaded. */
export const HERO_SETTLED_FRAME = 50;

/** Last frame of the timeline (number of files in public/frames). */
export const LAB_LAST_FRAME = 1125;

/* ---------------------------------------------------------
   PHASE 1 — the automatic entry
   --------------------------------------------------------- */

/** Autoplay window: intro handoff -> hero settled. */
export const ENTRY_FRAMES: [number, number] = [
  HANDOFF_FRAME,
  HERO_SETTLED_FRAME,
];

/** Frame rate of public/frames. */
export const SET_C_FPS = 5.1922;

/** Entry playback multiplier. 1 = the footage's real speed.
    Displayed fps = SET_C_FPS x ENTRY_SPEED. */
export const ENTRY_SPEED = 2;

export const ENTRY_DURATION_MS =
  ((ENTRY_FRAMES[1] - ENTRY_FRAMES[0]) / SET_C_FPS / ENTRY_SPEED) * 1000;

/* ---------------------------------------------------------
   PHASE 2 — scroll
   --------------------------------------------------------- */

/** Scroll begins at the settled hero. Frames before it are never
    reachable by scrolling — they belong to the entry. */
export const SCROLL_FIRST_FRAME = HERO_SETTLED_FRAME;
export const SCROLL_LAST_FRAME = LAB_LAST_FRAME;

/** End-to-start loop transition (desktop, downward only). */
export const LOOP_TRANSITION_FRAMES = 20;
export const LOOP_TRANSITION_DURATION_MS = 900;
export const LOOP_COVER_START_FRAME = LAB_LAST_FRAME - 10;
export const LOOP_REVEAL_START_FRAME = HERO_SETTLED_FRAME - 18;

/**
 * The loop is intentionally one-way. Scrolling down past the end starts a
 * new pass at the first normal scroll frame; scrolling up to the beginning
 * remains a hard stop so frame 1 stays the intro handoff.
 */
export function loopTargetForBoundary(
  direction: -1 | 1,
  reducedMotion: boolean
): number | null {
  return direction === 1 && !reducedMotion ? SCROLL_FIRST_FRAME : null;
}

/** Scroll distance per frame, in px. Lower values let a single flick
    cross several sections. Can be overridden with ?px=<n>. */
export const PX_PER_FRAME_DEFAULT = 14;

/** Reads the ?px=<n> override. Falls back to the default on the server. */
export function readPxPerFrame(): number {
  if (typeof window === "undefined") return PX_PER_FRAME_DEFAULT;
  const raw = new URLSearchParams(window.location.search).get("px");
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : PX_PER_FRAME_DEFAULT;
}

export const PX_PER_FRAME = PX_PER_FRAME_DEFAULT;

/* ---------------------------------------------------------
   THE HOLD — every section except the hero

   The hero settles during its own timed autoplay (ENTRY_FRAMES),
   before scroll even starts, so its settled state already has all
   the time it needs. Every OTHER section settles by scrolling, and a
   continuous scrub means the footage has already moved on by the
   time a panel is fully visible — there's no real moment to read it.

   So every non-hero section gets extra scroll room around its
   settledFrame: the footage keeps creeping forward, slowly, through
   HOLD_CRAWL_FRAMES on each side of settledFrame instead of freezing.

   HOLD_CRAWL_SLOWDOWN is how much slower than normal scrubbing that
   crawl is. The budget scales off PX_PER_FRAME_DEFAULT, not the ?px=
   override, because it is a content-pacing choice. */
export const HOLD_CRAWL_FRAMES = 4;
export const HOLD_CRAWL_SLOWDOWN = 6;
export const HOLD_SCROLL_PX =
  HOLD_CRAWL_FRAMES * 2 * PX_PER_FRAME_DEFAULT * HOLD_CRAWL_SLOWDOWN;

/** One section's hold, resolved to numbers. slowdown/rampFrames come
    from the section's own overrides, defaulting to the shared crawl
    (6x, no ramp). */
interface CrawlStop {
  kind: "crawl";
  sectionId: string;
  frame: number;
  slowdown: number;
  rampFrames: number;
  /** Extra virtual-frame duration pinned at the exact settled frame.
      This adds scroll time only; it never duplicates image files. */
  holdFrames: number;
  /** Virtual exit time at the same pinned frame, after the static hold. */
  virtualExitFrames: number;
  virtualEnterFrames: number;
  /** Half-width of the crawl, in frames, each side of `frame`.
      Defaults to the shared HOLD_CRAWL_FRAMES. A section whose own
      reveal is wider than that needs to widen this too, or most of its
      animation happens outside the slow zone at full scroll speed. */
  crawlFrames: number;
}

/** A carousel section's stop: pure scroll-in-place, zero frame
    movement, for `scrollPx` — see SectionTimeline.carousel. */
interface CarouselStop {
  kind: "carousel";
  sectionId: string;
  frame: number;
  scrollPx: number;
  virtualEnterFrames: number;
  virtualExitFrames: number;
}

/** A scroll-through section's stop: like a carousel's lock, but the
    scrub keeps ADVANCING at `slowdown`x pace through the middle span
    instead of freezing, then ramps back to full over `rampFrames`.
    See SectionTimeline.scrollThrough. */
interface ScrollThroughStop {
  kind: "scrollThrough";
  sectionId: string;
  frame: number;
  scrollPx: number;
  slowdown: number;
  rampFrames: number;
  leadPx: number;
  tailPx: number;
  /** Optional split: 1x pace from `frame` up to this frame, then
      `slowdown`x for the rest of the budget. Undefined = whole
      through-span at `slowdown`x. */
  slowFromFrame?: number;
  /** Optional frame at which the background/frame timeline pins while the
      section's independent panel continues through the remaining budget. */
  pinFrame?: number;
  virtualExitFrames: number;
}

type Stop = CrawlStop | CarouselStop | ScrollThroughStop;

/** Every section's stop (crawl hold or carousel lock), in ascending
    settledFrame order. The hero joins only when it has a virtual hold.
    Computed lazily (not at module top level) because SECTIONS is
    declared further down this file; by the time anything calls
    totalScrollPx/frameForScrollPx/scrollPxForFrame, the whole module
    has finished loading. */
const stopsCache: Partial<Record<TimelineMode, Stop[]>> = {};
function stops(mode: TimelineMode = "desktop"): Stop[] {
  if (!stopsCache[mode]) {
    const timedSections = SECTIONS.map((section) => sectionTimingForMode(section, mode));
    const crawlStops: Stop[] = timedSections.filter(
      (section) =>
        !section.carousel &&
        !section.scrollThrough &&
        (section.id !== "01-hero" || (section.holdFrames ?? 0) > 0)
    ).map((section) => ({
      kind: "crawl",
      sectionId: section.id,
      frame: section.settledFrame,
      slowdown: section.holdSlowdown ?? HOLD_CRAWL_SLOWDOWN,
      rampFrames: section.holdRampFrames ?? 0,
      crawlFrames: section.holdCrawlFrames ?? HOLD_CRAWL_FRAMES,
      holdFrames: section.holdFrames ?? 0,
      virtualExitFrames: section.virtualExitFrames ?? 0,
      virtualEnterFrames: section.virtualEnterFrames ?? 0,
    }));
    const carouselStops: Stop[] = timedSections.filter(
      (section) => section.carousel && !(mode === "compact" && section.id === "14-financial-capital")
    ).map(
      (section) => ({
        kind: "carousel",
        sectionId: section.id,
        frame: section.settledFrame,
        scrollPx: section.carousel!.scrollPx,
        virtualEnterFrames: section.virtualEnterFrames ?? 0,
        virtualExitFrames: section.virtualExitFrames ?? 0,
      })
    );
    const scrollThroughStops: Stop[] = timedSections.filter(
      (section) => section.scrollThrough
    ).map((section) => ({
      kind: "scrollThrough",
      sectionId: section.id,
      frame: section.settledFrame,
      scrollPx: section.scrollThrough!.scrollPx,
      slowdown: section.scrollThrough!.slowdown,
      rampFrames: section.scrollThrough!.rampFrames,
      leadPx: section.scrollThrough!.leadPx,
      tailPx: section.scrollThrough!.tailPx,
      slowFromFrame: section.scrollThrough!.slowFromFrame,
      pinFrame: section.scrollThrough!.pinFrame,
      virtualExitFrames: section.scrollThrough!.virtualExitFrames ?? 0,
    }));
    stopsCache[mode] = [...crawlStops, ...carouselStops, ...scrollThroughStops].sort(
      (a, b) => a.frame - b.frame
    );
  }
  return stopsCache[mode]!;
}

/** How many short linear steps a speed ramp is built from. Each step
    is its own constant-pace leg — not a single curve — so the ramp
    stays exactly invertible the same way the crawl already is,
    while still reading as an eased ease-out rather than one cut. */
const RAMP_STEPS = 3;

/** One constant-pace stretch of the scroll <-> frame mapping.
    frameStart..frameEnd advances at a fixed px per frame — UNLESS
    frameStart === frameEnd, which marks a carousel's pure scroll-in-
    place leg: `pxSpan` px are spent at zero frame movement, pinned
    at frameStart, instead of anything derived from pxPerFrame. */
interface Leg {
  frameStart: number;
  frameEnd: number;
  pxPerFrame: number;
  pxSpan?: number;
  /** Present only for a virtual frame hold, never for a carousel lock. */
  virtualHoldFrames?: number;
  virtualExit?: { sectionId: string; totalFrames: number };
  virtualEnter?: { sectionId: string; totalFrames: number };
}

/** Builds the full piecewise mapping as a flat list of legs: normal
    pace, then for each stop — either a crawl (crawlStart..crawlEnd at
    the hold's own fixed, content-paced speed, then its ramp steps if
    it has any) or a carousel (a single zero-frame-movement leg
    spending its whole scrollPx budget pinned at that frame) — then
    normal pace again, repeating per stop, ending in one final
    normal-pace tail to SCROLL_LAST_FRAME.

    frameForScrollPx and scrollPxForFrame both just walk this same
    list, one by px and one by frame, so they cannot drift apart into
    inconsistent inverses of each other.

    The crawl/ramp legs are paced off PX_PER_FRAME_DEFAULT, not the
    `pxPerFrame` parameter, so a ?px= override does not change them. */
function buildLegs(pxPerFrame: number, mode: TimelineMode = "desktop"): Leg[] {
  // Both modes currently share the same piecewise mapping.
  const policy = timelinePolicy(mode);
  if (policy.mode === "compact") {
    return buildCurrentLegs(pxPerFrame, mode);
  }
  return buildCurrentLegs(pxPerFrame, mode);
}

function buildCurrentLegs(pxPerFrame: number, mode: TimelineMode = "desktop"): Leg[] {
  const legs: Leg[] = [];
  let frame = SCROLL_FIRST_FRAME;

  for (const stop of stops(mode)) {
    if (stop.kind === "carousel") {
      // Crawl in over HOLD_CRAWL_FRAMES so the footage visibly settles
      // before the freeze. No crawl-out: the freeze itself is the settle.
      const crawlStart = Math.max(frame, stop.frame - HOLD_CRAWL_FRAMES);
      if (crawlStart > frame) {
        legs.push({ frameStart: frame, frameEnd: crawlStart, pxPerFrame });
      }
      if (stop.frame > crawlStart) {
        legs.push({
          frameStart: crawlStart,
          frameEnd: stop.frame,
          pxPerFrame: PX_PER_FRAME_DEFAULT * HOLD_CRAWL_SLOWDOWN,
        });
      }
      if (stop.virtualEnterFrames > 0) {
        legs.push({
          frameStart: stop.frame,
          frameEnd: stop.frame,
          pxPerFrame: 0,
          pxSpan: stop.virtualEnterFrames * pxPerFrame,
          virtualEnter: { sectionId: stop.sectionId, totalFrames: stop.virtualEnterFrames },
        });
      }
      legs.push({
        frameStart: stop.frame,
        frameEnd: stop.frame,
        pxPerFrame: 0,
        pxSpan: stop.scrollPx,
      });
      if (stop.virtualExitFrames > 0) {
        legs.push({
          frameStart: stop.frame,
          frameEnd: stop.frame,
          pxPerFrame: 0,
          pxSpan: stop.virtualExitFrames * pxPerFrame,
          virtualExit: {
            sectionId: stop.sectionId,
            totalFrames: stop.virtualExitFrames,
          },
        });
      }
      frame = stop.frame;
      continue;
    }

    if (stop.kind === "scrollThrough") {
      // Like a carousel's lock, but the scrub keeps MOVING. Crawl-in
      // over the last few frames (same as the carousel) so it visibly
      // settles, then: a frozen lead beat, the through-scroll at
      // `slowdown` pace while the pages travel, a frozen tail beat,
      // then a ramp back to full pace.
      const crawlStart = Math.max(frame, stop.frame - HOLD_CRAWL_FRAMES);
      if (crawlStart > frame) {
        legs.push({ frameStart: frame, frameEnd: crawlStart, pxPerFrame });
      }
      if (stop.frame > crawlStart) {
        legs.push({
          frameStart: crawlStart,
          frameEnd: stop.frame,
          pxPerFrame: PX_PER_FRAME_DEFAULT * HOLD_CRAWL_SLOWDOWN,
        });
      }
      legs.push({
        frameStart: stop.frame,
        frameEnd: stop.frame,
        pxPerFrame: 0,
        pxSpan: stop.leadPx,
      });
      const sweepPx = stop.scrollPx - stop.leadPx - stop.tailPx;
      if (stop.pinFrame && stop.pinFrame > stop.frame) {
        const pinFrame = stop.pinFrame;
        const fastPx = (pinFrame - stop.frame) * PX_PER_FRAME_DEFAULT;
        legs.push({
          frameStart: stop.frame,
          frameEnd: pinFrame,
          pxPerFrame: PX_PER_FRAME_DEFAULT,
        });
        const virtualExitPx = stop.virtualExitFrames * pxPerFrame;
        const pinnedPx = Math.max(sweepPx - fastPx - virtualExitPx, 0);
        legs.push({
          frameStart: pinFrame,
          frameEnd: pinFrame,
          pxPerFrame: 0,
          pxSpan: pinnedPx,
          virtualHoldFrames: pinnedPx / pxPerFrame,
        });
        if (virtualExitPx > 0) {
          legs.push({
            frameStart: pinFrame,
            frameEnd: pinFrame,
            pxPerFrame: 0,
            pxSpan: virtualExitPx,
            virtualExit: { sectionId: stop.sectionId, totalFrames: stop.virtualExitFrames },
          });
        }
        frame = pinFrame;
      } else if (stop.slowFromFrame && stop.slowFromFrame > stop.frame) {
        // Two-pace through-scroll: full 1x from settledFrame up to
        // slowFromFrame, then `slowdown`x for whatever budget is left.
        const fastFrames = stop.slowFromFrame - stop.frame;
        const fastPx = fastFrames * PX_PER_FRAME_DEFAULT;
        legs.push({
          frameStart: stop.frame,
          frameEnd: stop.slowFromFrame,
          pxPerFrame: PX_PER_FRAME_DEFAULT,
        });
        const slowPx = Math.max(sweepPx - fastPx, 0);
        const slowFrames = slowPx / (PX_PER_FRAME_DEFAULT * stop.slowdown);
        legs.push({
          frameStart: stop.slowFromFrame,
          frameEnd: stop.slowFromFrame + slowFrames,
          pxPerFrame: PX_PER_FRAME_DEFAULT * stop.slowdown,
        });
        frame = stop.slowFromFrame + slowFrames;
      } else {
        const throughFrames = sweepPx / (PX_PER_FRAME_DEFAULT * stop.slowdown);
        legs.push({
          frameStart: stop.frame,
          frameEnd: stop.frame + throughFrames,
          pxPerFrame: PX_PER_FRAME_DEFAULT * stop.slowdown,
        });
        frame = stop.frame + throughFrames;
      }
      legs.push({
        frameStart: frame,
        frameEnd: frame,
        pxPerFrame: 0,
        pxSpan: stop.tailPx,
      });
      if (stop.rampFrames > 0) {
        const stepFrames = stop.rampFrames / RAMP_STEPS;
        for (let step = 0; step < RAMP_STEPS; step += 1) {
          const t0 = step / RAMP_STEPS;
          const t1 = (step + 1) / RAMP_STEPS;
          const speed0 = stop.slowdown - (stop.slowdown - 1) * t0;
          const speed1 = stop.slowdown - (stop.slowdown - 1) * t1;
          legs.push({
            frameStart: frame,
            frameEnd: frame + stepFrames,
            pxPerFrame: PX_PER_FRAME_DEFAULT * ((speed0 + speed1) / 2),
          });
          frame += stepFrames;
        }
      }
      continue;
    }

    const crawlStart = Math.max(frame, stop.frame - stop.crawlFrames);
    const crawlEnd = stop.frame + stop.crawlFrames;

    if (crawlStart > frame) {
      legs.push({ frameStart: frame, frameEnd: crawlStart, pxPerFrame });
    }
    if (stop.holdFrames > 0) {
      if (stop.frame > crawlStart) {
        legs.push({
          frameStart: crawlStart,
          frameEnd: stop.frame,
          pxPerFrame: PX_PER_FRAME_DEFAULT * stop.slowdown,
        });
      }
      if (stop.virtualEnterFrames > 0) {
        legs.push({
          frameStart: stop.frame,
          frameEnd: stop.frame,
          pxPerFrame: 0,
          pxSpan: stop.virtualEnterFrames * pxPerFrame,
          virtualEnter: { sectionId: stop.sectionId, totalFrames: stop.virtualEnterFrames },
        });
      }
      legs.push({
        frameStart: stop.frame,
        frameEnd: stop.frame,
        pxPerFrame: 0,
        pxSpan: stop.holdFrames * pxPerFrame,
        virtualHoldFrames: stop.holdFrames,
      });
      if (stop.virtualExitFrames > 0) {
        legs.push({
          frameStart: stop.frame,
          frameEnd: stop.frame,
          pxPerFrame: 0,
          pxSpan: stop.virtualExitFrames * pxPerFrame,
          virtualExit: {
            sectionId: stop.sectionId,
            totalFrames: stop.virtualExitFrames,
          },
        });
      }
      if (crawlEnd > stop.frame) {
        legs.push({
          frameStart: stop.frame,
          frameEnd: crawlEnd,
          pxPerFrame: PX_PER_FRAME_DEFAULT * stop.slowdown,
        });
      }
    } else {
      legs.push({
        frameStart: crawlStart,
        frameEnd: crawlEnd,
        pxPerFrame: PX_PER_FRAME_DEFAULT * stop.slowdown,
      });
    }
    if (stop.virtualEnterFrames > 0 && stop.holdFrames === 0) {
      const last = legs.pop();
      if (last && last.frameStart < stop.frame && last.frameEnd > stop.frame) {
        legs.push({ ...last, frameEnd: stop.frame });
        legs.push({
          frameStart: stop.frame,
          frameEnd: stop.frame,
          pxPerFrame: 0,
          pxSpan: stop.virtualEnterFrames * pxPerFrame,
          virtualEnter: { sectionId: stop.sectionId, totalFrames: stop.virtualEnterFrames },
        });
        legs.push({ ...last, frameStart: stop.frame });
      } else {
        if (last) legs.push(last);
        legs.push({
          frameStart: stop.frame,
          frameEnd: stop.frame,
          pxPerFrame: 0,
          pxSpan: stop.virtualEnterFrames * pxPerFrame,
          virtualEnter: { sectionId: stop.sectionId, totalFrames: stop.virtualEnterFrames },
        });
      }
    }
    frame = crawlEnd;

    if (stop.rampFrames > 0) {
      const stepFrames = stop.rampFrames / RAMP_STEPS;
      for (let step = 0; step < RAMP_STEPS; step += 1) {
        // Speed eases linearly from the crawl's slowdown down to 1x
        // across the ramp; each step's pace is that line's average
        // over its own short stretch, so the whole ramp reads as one
        // continuous deceleration rather than RAMP_STEPS separate
        // jerks.
        const t0 = step / RAMP_STEPS;
        const t1 = (step + 1) / RAMP_STEPS;
        const speed0 = stop.slowdown - (stop.slowdown - 1) * t0;
        const speed1 = stop.slowdown - (stop.slowdown - 1) * t1;
        legs.push({
          frameStart: frame,
          frameEnd: frame + stepFrames,
          pxPerFrame: PX_PER_FRAME_DEFAULT * ((speed0 + speed1) / 2),
        });
        frame += stepFrames;
      }
    }
  }

  legs.push({ frameStart: frame, frameEnd: SCROLL_LAST_FRAME, pxPerFrame });
  return legs;
}

/** Scroll position (px into phase 2) -> frame. Walks buildLegs' flat
    list, each leg at its own constant pace (a carousel leg pins its
    frame for the whole of its span instead). */
export function frameForScrollPx(
  px: number,
  pxPerFrame: number,
  mode: TimelineMode = "desktop",
): number {
  let consumed = 0;
  for (const leg of buildLegs(pxPerFrame, mode)) {
    const pinned = leg.frameStart === leg.frameEnd;
    const span = pinned ? leg.pxSpan ?? 0 : (leg.frameEnd - leg.frameStart) * leg.pxPerFrame;
    if (px <= consumed + span) {
      return pinned ? leg.frameStart : leg.frameStart + (px - consumed) / leg.pxPerFrame;
    }
    consumed += span;
  }
  return SCROLL_LAST_FRAME;
}

/** Debug readout for a virtual hold currently under the scroll position.
    The background remains pinned at its frame; the elapsed/remaining
    values express that extra scroll distance as frame-equivalent time. */
export function virtualHoldAtScrollPx(
  px: number,
  pxPerFrame: number,
  mode: TimelineMode = "desktop",
): {
  frame: number;
  totalFrames: number;
  elapsedFrames: number;
  remainingFrames: number;
} | null {
  let consumed = 0;
  for (const leg of buildLegs(pxPerFrame, mode)) {
    const pinned = leg.frameStart === leg.frameEnd;
    const span = pinned
      ? leg.pxSpan ?? 0
      : (leg.frameEnd - leg.frameStart) * leg.pxPerFrame;
    if (leg.virtualHoldFrames && px >= consumed && px < consumed + span) {
      const elapsedFrames = Math.min(
        leg.virtualHoldFrames,
        Math.floor((px - consumed) / pxPerFrame)
      );
      return {
        frame: leg.frameStart,
        totalFrames: leg.virtualHoldFrames,
        elapsedFrames,
        remainingFrames: leg.virtualHoldFrames - elapsedFrames,
      };
    }
    consumed += span;
  }
  return null;
}

/** Virtual exit progress for one section. A completed virtual exit remains
    complete until the section's ordinary exit window has passed, so scrolling
    through the following real frames cannot make its UI reappear. */
export function virtualExitProgressAtScrollPx(
  section: SectionTimeline,
  px: number,
  pxPerFrame: number,
  mode: TimelineMode = "desktop",
): number | null {
  const timedSection = sectionTimingForMode(section, mode);
  let consumed = 0;
  for (const leg of buildLegs(pxPerFrame, mode)) {
    const pinned = leg.frameStart === leg.frameEnd;
    const span = pinned
      ? leg.pxSpan ?? 0
      : (leg.frameEnd - leg.frameStart) * leg.pxPerFrame;
    if (leg.virtualExit?.sectionId === section.id) {
      if (px >= consumed && px < consumed + span) {
        return Math.min(1, Math.max(0, (px - consumed) / span));
      }
      if (
        px >= consumed + span &&
        timedSection.exit &&
        frameForScrollPx(px, pxPerFrame, mode) < timedSection.exit.frames[1]
      ) {
        return 1;
      }
      return null;
    }
    consumed += span;
  }
  return null;
}

/** Progress through a section's pinned virtual enter phase. */
export function virtualEnterProgressAtScrollPx(
  section: SectionTimeline,
  px: number,
  pxPerFrame: number,
  mode: TimelineMode = "desktop",
): number | null {
  let consumed = 0;
  for (const leg of buildLegs(pxPerFrame, mode)) {
    const pinned = leg.frameStart === leg.frameEnd;
    const span = pinned ? leg.pxSpan ?? 0 : (leg.frameEnd - leg.frameStart) * leg.pxPerFrame;
    if (leg.virtualEnter?.sectionId === section.id) {
      return px >= consumed && px < consumed + span
        ? Math.min(1, Math.max(0, (px - consumed) / span))
        : null;
    }
    consumed += span;
  }
  return null;
}

/** Frame -> scroll position (px into phase 2). Inverse of
    frameForScrollPx — same leg list, so the two stay exact inverses
    of each other. A carousel leg's own frame (frameStart===frameEnd)
    resolves to the px where that leg BEGINS — the start of the lock,
    since a pinned frame has no single "position" within the leg. */
export function scrollPxForFrame(
  frame: number,
  pxPerFrame: number,
  mode: TimelineMode = "desktop",
): number {
  let consumed = 0;
  for (const leg of buildLegs(pxPerFrame, mode)) {
    const pinned = leg.frameStart === leg.frameEnd;
    if (frame <= leg.frameEnd) {
      return pinned ? consumed : consumed + (frame - leg.frameStart) * leg.pxPerFrame;
    }
    consumed += pinned ? leg.pxSpan ?? 0 : (leg.frameEnd - leg.frameStart) * leg.pxPerFrame;
  }
  return consumed;
}

/** Total scroll distance phase 2 needs. Just scrollPxForFrame at the
    very last frame — reusing the same segment-by-segment logic
    guarantees this stays the exact inverse of frameForScrollPx
    instead of a separate formula that could drift out of sync with
    it (the crawl reshuffles how much of the normal-pace budget each
    hold "spends", so a hand-derived total is easy to get wrong). */
export function totalScrollPx(
  pxPerFrame: number,
  mode: TimelineMode = "desktop",
): number {
  return scrollPxForFrame(SCROLL_LAST_FRAME, pxPerFrame, mode);
}

/** Every frame file the page needs: the entry's plus the scroll's. */
export const LAB_FIRST_FRAME = ENTRY_FRAMES[0];
export const LAB_FRAME_COUNT = LAB_LAST_FRAME - LAB_FIRST_FRAME + 1;

/** The regular set: 1942x1080 q90. */
export const FRAME_DIR_DEV = "/frames";

/** HQ set: 2590x1440 q95. Used only with ?quality=hq. */
export const FRAME_DIR_HQ = "/frames-hq";

/** 4K set: 3884x2160 at the same 5.1922 fps, numbered from 1. Used only
    when the `fourK` prop is set. */
export const FRAME_DIR_4K = "/frames-4k";

/** 2x-density sets at 10.3844 fps (2 x SET_C_FPS). Same logical frame
    numbers, two files per frame. */
export const FRAME_DIR_2X = "/frames-2x";
export const FRAME_DIR_2X_HQ = "/frames-2x-hq";

/** 4x-density set, 1080p only, 20.7688 fps (4 x SET_C_FPS). File for
    logical frame N is `k*N - (k-1)`. */
export const FRAME_DIR_4X = "/frames-4x";

/** Intro shot as 240 frames in public/frames-intro (2590x1440), ending on
    the hand-off into frame 1. */
export const FRAME_DIR_INTRO = "/frames-intro";
export const INTRO_FRAME_COUNT = 240;
/** 240 frames over the 30.815s intro ≈ 7.79 fps (real speed). */
export const INTRO_FPS = INTRO_FRAME_COUNT / 30.815;

/** 1-based intro frame number -> file. Same padded naming as
    frameSrc(), different folder. */
export function introFrameSrc(frame: number): string {
  return `${FRAME_DIR_INTRO}/frame_${String(frame).padStart(4, "0")}.webp`;
}


/** 1-based frame number -> file. Every set shares the numbering, so a
    frame number means the same moment in any of them. */
export function frameSrc(
  frame: number,
  dir: string = FRAME_DIR_DEV
): string {
  return `${dir}/frame_${String(frame).padStart(4, "0")}.webp`;
}

/* ---------------------------------------------------------
   Easing. Enter uses ease-out (arrives and settles), exit uses
   ease-in (leans away). Deliberately plain cubics rather than a
   bezier sampler — these are judged by eye against the footage,
   and a named cubic is easier to reason about than four numbers.
   --------------------------------------------------------- */
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Position of `frame` inside [a, b], clamped to 0..1. */
export function progressBetween(frame: number, a: number, b: number): number {
  if (b === a) return frame < a ? 0 : 1;
  return clamp01((frame - a) / (b - a));
}

/** Per-item stagger, purely a function of `frame`.
    `count` items share `window`, each getting its own slice with a
    little overlap so neighbours don't read as discrete steps; item 0
    starts at window[0], the last item finishes at window[1].

    Unlike a CSS animation (fixed real-world duration, decoupled from
    scroll once triggered), this ties every item's progress directly
    to the frame the user has scrolled to — scroll fast and the
    stagger visibly catches up/skips ahead with you, scroll slowly and
    it plays out slowly, scroll backward and it reverses. If a window
    feels too tight for its item count, widen `window`. */
export function staggerProgressAt(
  index: number,
  count: number,
  frame: number,
  window: [number, number],
  overlap = 0.1
): number {
  const [start, end] = window;
  const span = end - start;
  if (span <= 0 || count <= 1) return easeOut(progressBetween(frame, start, end));

  // Fraction of each item's own slice that overlaps the next. Keep the
  // default low so every item visibly loads in order across the full
  // assigned window instead of bunching near its beginning.
  const perItem = span / count;
  const itemStart = start + index * perItem * (1 - overlap);
  const itemEnd = itemStart + Math.max(perItem, span * 0.12);
  return easeOut(progressBetween(frame, itemStart, itemEnd));
}

/* --------------------------------------------------------- */

/** Offset in percent of viewport: x -> vw, y -> vh. */
export interface Offset {
  x?: number;
  y?: number;
}

export interface SectionTimeline {
  id: string;
  label: string;
  /** The frame where the section is fully shown. */
  settledFrame: number;
  /** Omit when the section is already present when scroll begins. */
  enter?: { frames: [number, number]; from: Offset };
  /** Omit for the last section. */
  exit?: { frames: [number, number]; to: Offset };
  /** How many frames around the current scroll position the loading
      gate requires before letting scroll continue through this
      section. Omit for the default (2 behind, 2 ahead) — widen it
      for a section whose panel has more to read per frame of scroll
      (e.g. a tall overflow:auto panel), where the default window is
      too easy to outrun. See AnimationLab.tsx's loading gate. */
  loadBuffer?: { behind: number; ahead: number };
  /** Overrides HOLD_CRAWL_SLOWDOWN for this section's hold. Omit for
      the shared default (6x). Lower = a gentler crawl. */
  holdSlowdown?: number;
  /** Overrides HOLD_CRAWL_FRAMES (4) — the half-width of the crawl in
      frames each side of settledFrame. Widen it when a section's own
      reveal is wider than +/-4 frames, otherwise most of that reveal
      runs outside the slow zone at full scroll speed and the slowdown
      does nothing for it. */
  holdCrawlFrames?: number;
  /** Virtual frame-equivalent pause at the exact settled frame. It
      adds scroll duration only; no frame image is copied or created. */
  holdFrames?: number;
  /** After `holdFrames`, keep the same background frame pinned while this
      section's existing UI exits over this many virtual frame-equivalents. */
  virtualExitFrames?: number;
  /** After the real enter ends, keep its final background frame pinned while
      the UI completes the remaining half of the entrance. */
  virtualEnterFrames?: number;
  /** Extra frames appended right after this section's crawl, during
      which scroll speed eases from the crawl's pace back up to full
      pace in a few short linear steps rather than snapping instantly.
      Omit (0) for a hard cut. */
  holdRampFrames?: number;
  /** Scroll-lock carousel, e.g. FinancialCapitalLayer.tsx. When set,
      this section gets its own short crawl-in (not the normal
      two-sided crawl hold, see stops()/buildLegs) then, at
      settledFrame, the background frame-scrub freezes completely
      (not just slowed) for `scrollPx` of extra scroll distance —
      `leadPx` of which is a dead zone before the carousel starts
      responding, then the actual `count`-item sweep, then `tailPx`
      of dead zone once it's finished, before normal frame-driven
      scroll resumes past settledFrame exactly as any other section's
      exit would. The section itself reads raw scroll position (via
      scrollPxForFrame(settledFrame, ...) as the zero point, same
      coordinate space window.scrollY already is — see
      FinancialCapitalLayer.tsx) to drive the sweep and its own
      lead/tail buffers. leadPx/tailPx give a short pause before the
      first card moves and after the last card lands. */
  carousel?: { count: number; scrollPx: number; leadPx: number; tailPx: number };
  /** Scroll-through: the section's content is TALLER than one viewport
      — stacked "pages" the reader scrolls between. By default the scrub
      keeps advancing at `slowdown`x pace (2 = half speed) while the pages
      move; with `pinFrame`, it advances to that frame and then freezes
      while the page continues through the remaining budget. `leadPx` / `tailPx` are frozen
      dead-zones each side (same role as carousel's — a beat before the
      pages start moving and after they land). After the budget the
      pace ramps `slowdown` -> 1 over `rampFrames` (same shape as
      `holdRampFrames`), then normal frame-driven scroll and the exit
      window resume. The layer reads raw window.scrollY (zeroed at
      scrollPxForFrame(settledFrame)) to translate its pages — see
      StrategyLayer.tsx. Mutually exclusive with `carousel`. */
  scrollThrough?: {
    scrollPx: number;
    slowdown: number;
    rampFrames: number;
    leadPx: number;
    tailPx: number;
    /** Optional: run the through-scroll at full 1x pace from
        settledFrame up to this frame, then drop to `slowdown`x for the
        remaining budget. Omit to apply `slowdown` across the whole
        span. */
    slowFromFrame?: number;
  pinFrame?: number;
  /** Virtual frame-equivalent exit animation after the pin. */
  virtualExitFrames?: number;
  };
}

export interface ElementState {
  opacity: number;
  x: number;
  y: number;
  /** False once faded, so the layer leaves hit-testing and tab order. */
  interactive: boolean;
}

/** Per-mode timing overrides. Content and asset frame numbers stay shared;
    only pacing varies by mode. */
const DESKTOP_TIMING_OVERRIDES: Record<string, Partial<SectionTimeline>> = {
  "02-main-02": { holdFrames: 10 },
  "03-approach": { holdFrames: 10, virtualExitFrames: 20 },
  "04-digital": {
    holdFrames: 10,
    enter: { frames: [141, 161], from: { y: 5 } },
    exit: { frames: [161, 176], to: { y: -5 } },
  },
  "19-end-screen": {
    exit: { frames: [1085, 1110], to: { y: 0 } },
  },
};

const COMPACT_TIMING_OVERRIDES: Record<string, Partial<SectionTimeline>> = {
  "17-strategy": {
    scrollThrough: undefined,
  },
  "12-leadership": {
    enter: { frames: [553, 555], from: {} },
    exit: { frames: [555, 558], to: { y: 4 } },
    virtualExitFrames: 0,
  },
  "14-financial-capital": {
    virtualExitFrames: 0,
  },
  "18-community": {
    carousel: undefined,
    virtualEnterFrames: 0,
    virtualExitFrames: 0,
  },
  "19-end-screen": {
    enter: { frames: [1040, 1055], from: { y: 4 } },
  },
};

export function sectionTimingForMode(
  section: SectionTimeline,
  mode: TimelineMode = "desktop",
): SectionTimeline {
  const overrides = mode === "desktop"
    ? DESKTOP_TIMING_OVERRIDES
    : COMPACT_TIMING_OVERRIDES;
  const override = overrides[section.id];
  const timedSection = override ? { ...section, ...override } : section;
  return timedSection;
}

/**
 * Virtual exit time is UI time, not video-frame time. The background stays
 * pinned at the section's settled frame while this progress walks the
 * section's existing exit window, then real frame scrolling resumes.
 */
export function sectionExitFrameAtVirtualProgress(
  section: SectionTimeline,
  progress: number,
): number {
  const [start, end] = section.exit?.frames ?? [section.settledFrame, section.settledFrame];
  const t = Math.min(1, Math.max(0, progress));
  return start + (end - start) * t;
}

export const SECTIONS: SectionTimeline[] = [
  {
    id: "01-hero",
    label: "Hero — Beyond the Beyond",
    settledFrame: HERO_SETTLED_FRAME,
    // No section-level enter: the hero arrives during the entry phase,
    // element by element (see HERO_PARTS).
    exit: {
      // The exit finishes before the camera moves off its hold.
      frames: [50, 70],
      to: { y: -6 },
    },
    // Keep the settled hero on screen for a short virtual hold before
    // its exit starts.
    holdFrames: 20,
    holdCrawlFrames: 0,
  },
  {
    id: "02-main-02",
    label: "Bridge — A Journey of Possibilities",
    // Short title card between the hero exit and the Approach panel.
    // Enter, hold, exit and the speed ramp all finish before the next
    // section enters.
    settledFrame: 90,
    enter: { frames: [70, 90], from: { y: 4 } },
    exit: { frames: [91, 105], to: { y: -4 } },
    holdFrames: 20,
    // A lighter crawl than the shared 6x: this card is short.
    holdSlowdown: 2,
    // Ease back to full scroll speed after the crawl.
    holdRampFrames: 4,
  },
  {
    id: "03-approach",
    label: "Our Approach to Reporting — Physical Report",
    settledFrame: 134,
    enter: {
      // The panel arrives with the book sliding into frame.
      frames: [114, 134],
      from: { y: 5 },
    },
    holdFrames: 20,
    // The UI finishes while the background stays pinned, before the
    // next section enters.
    exit: {
      frames: [145, 158],
      to: { y: -5 },
    },
    // Tall overflow:auto panel: more to read per frame of scroll, so a
    // wider load window.
    loadBuffer: { behind: 4, ahead: 4 },
  },
  {
    id: "04-digital",
    label: "The Next Horizon of Intelligent Reporting",
    settledFrame: 161,
    enter: {
      // The background parks at settledFrame before the content settles
      // and the exit begins.
      frames: [141, 161],
      from: { y: 5 },
    },
    holdFrames: 20,
    exit: {
      frames: [161, 181],
      to: { y: -5 },
    },
    // Taller panel than Approach, so a wider load window.
    loadBuffer: { behind: 4, ahead: 4 },
  },
  {
    id: "05-intro-statement",
    label: "Intro Statement — Beyond the Beyond",
    // The exit ends a few frames into the next section's enter — a
    // deliberate crossfade.
    settledFrame: 255,
    enter: { frames: [245, 255], from: {} },
    exit: { frames: [255, 269], to: {} },
    virtualEnterFrames: 10,
    holdFrames: 20,
    holdCrawlFrames: 0,
    virtualExitFrames: 14,
  },
  {
    id: "06-key-data-points",
    label: "Key Data Points — Haycarb at a Glance",
    // Light-themed panel with no background of its own; it covers the
    // canvas while shown, hiding the cut into the city footage.
    // The section's own fade starts with the camera hold; GlanceLayer's
    // child staggers fit inside that short window.
    settledFrame: 275,
    enter: { frames: [263, 275], from: { y: 6 } },
    exit: { frames: [279, 280], to: { y: -6 } },
    holdFrames: 20,
    virtualExitFrames: 20,
    // Wider crawl so the whole reveal runs inside the slow zone.
    holdCrawlFrames: 9,
  },
  {
    id: "07-banner-city",
    label: "Banner — City Skyline",
    // Caption over the city skyline, clear of the cut into the
    // boardroom footage.
    settledFrame: 335,
    enter: { frames: [322, 335], from: { y: 4 } },
    exit: { frames: [335, 371], to: { y: -4 } },
    virtualEnterFrames: 10,
    holdFrames: 20,
    virtualExitFrames: 10,
  },
  {
    id: "08-financial",
    label: "Financial Highlights",
    // No scroll-driven reveal. The frame scrubs to settledFrame with the
    // panel hidden, then holds. The panel reveals with a short CSS
    // transition (see FinancialLayer.tsx) and is clickable only while
    // parked. holdCrawlFrames is widened to cover the enter window.
    settledFrame: 436,
    enter: { frames: [408, 436], from: {} },
    exit: { frames: [448, 454], to: { y: -5 } },
    holdFrames: 60,
    holdCrawlFrames: 16,
    virtualExitFrames: 20,
  },
  {
    id: "09-governance-intro",
    label: "Governance intro — transition to Lighthouse",
    // Text bridge between Financial Highlights and Corporate Governance,
    // over the lighthouse shot.
    settledFrame: 511,
    enter: { frames: [490, 511], from: { y: 4 } },
    exit: { frames: [511, 520], to: { y: -4 } },
    virtualEnterFrames: 10,
    holdFrames: 20,
    virtualExitFrames: 20,
  },
  {
    id: "10-governance",
    label: "Corporate Governance",
    // Sections 09-11 share the short lighthouse shot, so they are
    // sequenced by their own opacity rather than by the background
    // moving. holdFrames gives the stat cards time to be read.
    settledFrame: 533,
    enter: { frames: [520, 533], from: { y: 4 } },
    exit: { frames: [533, 540], to: { y: -4 } },
    virtualEnterFrames: 15,
    holdFrames: 30,
    virtualExitFrames: 20,
  },
  {
    id: "11-governance-cards",
    label: "Driving Sustainable Value Creation Through Effective Governance",
    // Enters while Corporate Governance is still fading out (crossfade).
    settledFrame: 540,
    enter: { frames: [535, 540], from: { y: 6 } },
    exit: { frames: [540, 550], to: { y: -6 } },
    virtualEnterFrames: 20,
    holdFrames: 40,
    virtualExitFrames: 20,
  },
  {
    id: "12-leadership",
    label: "Our Approach to Reporting — Artboard 5",
    // Park-and-hold: a short enter inside the crawl, then a long pinned
    // hold and a virtual exit. No virtualEnterFrames — that path makes
    // the layer jump back at its own settle frame.
    settledFrame: 555,
    enter: { frames: [553, 555], from: { y: 4 } },
    exit: { frames: [555, 575], to: { y: 4 } },
    holdFrames: 60,
    virtualExitFrames: 20,
  },
  {
    id: "13-banner-ocean",
    label: "Banner — ocean navigation",
    // Caption between Leadership and Capitals.
    settledFrame: 650,
    enter: { frames: [642, 650], from: { y: 4 } },
    exit: { frames: [650, 665], to: { y: -4 } },
    virtualEnterFrames: 20,
    holdFrames: 20,
    virtualExitFrames: 20,
  },
  {
    id: "14-financial-capital",
    label: "Capitals Management",
    // Scroll-lock carousel (see FinancialCapitalLayer.tsx). The
    // background freezes at settledFrame while scroll drives the cards,
    // then normal scrolling resumes and the section exits.
    // FinancialCapitalLayer reads settledFrame live, so retiming here is
    // enough.
    settledFrame: 675,
    enter: { frames: [665, 675], from: { y: 4 } },
    exit: { frames: [675, 693], to: { y: -4 } },
    virtualEnterFrames: 20,
    virtualExitFrames: 20,
    // scrollPx = leadPx + card sweep + tailPx.
    carousel: { count: 7, scrollPx: 90 + 2880 + 240, leadPx: 90, tailPx: 240 },
  },
  {
    id: "15-banner-river",
    label: "Banner — mountain river",
    // The background pins at settledFrame while the copy writes on over
    // virtualEnterFrames (RiverBannerLayer maps that progress onto its
    // word stagger).
    //
    // holdFrames must be > 0 when virtualEnterFrames is set: without it
    // buildLegs puts the pinned leg before the crawl-out and the footage
    // steps backwards. holdCrawlFrames 0 removes the slow crawl around
    // the hold.
    settledFrame: 782,
    enter: { frames: [762, 782], from: { y: 4 } },
    exit: { frames: [782, 802], to: { y: -4 } },
    virtualEnterFrames: 40,
    holdFrames: 20,
    holdCrawlFrames: 0,
  },
  {
    id: "16-nonfinancial",
    label: "Non-Financials",
    // Same park-and-hold model as 12-leadership. The intro and cards
    // reveal with a CSS transition while data-revealed is set (see
    // NonFinancialLayer.tsx) and reverse when the section leaves.
    settledFrame: 845,
    enter: { frames: [843, 845], from: {} },
    exit: { frames: [857, 863], to: { y: -4 } },
    holdFrames: 60,
    virtualExitFrames: 20,
  },
  {
    id: "17-strategy",
    label: "Strategy, Risks & Opportunities",
    // Content is taller than one viewport. The background advances to
    // pinFrame, then stays pinned while StrategyLayer.tsx glides the
    // panel up by its overflow and the layer exits.
    //
    // Keep these in step: exit[0] must equal pinFrame, the exit width
    // must equal virtualExitFrames, and scrollPx is built from
    // (pinFrame - settledFrame) — StrategyLayer derives the glide from it.
    settledFrame: 890,
    enter: { frames: [870, 890], from: { y: 4 } },
    exit: { frames: [933, 963], to: { y: -4 } },
    scrollThrough: {
      scrollPx: 43 * PX_PER_FRAME_DEFAULT + 60 * PX_PER_FRAME_DEFAULT + 30 * PX_PER_FRAME_DEFAULT,
      slowdown: 2,
      rampFrames: 0,
      leadPx: 0,
      tailPx: 0,
      pinFrame: 933,
      virtualExitFrames: 30,
    },
  },
  {
    id: "18-community",
    label: "Community Impact",
    // Stop-scroll carousel, same as 14-financial-capital (see
    // CommunityLayer.tsx, which reads settledFrame live).
    settledFrame: 1020,
    enter: { frames: [1015, 1020], from: { y: 4 } },
    exit: { frames: [1038, 1040], to: { y: -4 } },
    // Lead pause, card sweep, tail pause. Seven stories need six gaps.
    carousel: { count: 7, scrollPx: 168 + 3504 + 84, leadPx: 168, tailPx: 84 },
    virtualEnterFrames: 10,
    virtualExitFrames: 10,
  },
  {
    id: "19-end-screen",
    label: "End Message Screen",
    // LAB_LAST_FRAME stays at the file count; it is not tied to this
    // section's exit.
    settledFrame: 1055,
    enter: { frames: [1040, 1055], from: { y: 4 } },
    exit: { frames: [1075, 1100], to: { y: 0 } },
    // Hold on the settled frame, then resume normal frame movement.
    holdFrames: 20,
    holdSlowdown: 2,
    holdRampFrames: 4,
    // The end screen stays fully shown during the hold.
  },
];

/** Keep the background frame aligned with the shared frame timeline. */
export function backgroundFrameForFrame(frame: number): number {
  return frame;
}

/** Background crossfade between two frames. Currently unused: always null. */
export function backgroundTransitionAtFrame(
  _frame: number
): { from: number; to: number; progress: number } | null {
  void _frame;
  return null;
}

/** A section's visual state at a given frame. Pure — no DOM, no React. */
export function sectionStateAt(
  section: SectionTimeline,
  frame: number
): ElementState {
  let opacity = 1;
  let x = 0;
  let y = 0;

  if (section.enter && frame < section.enter.frames[1]) {
    const [a, b] = section.enter.frames;
    const t = easeOut(progressBetween(frame, a, b));
    opacity = t;
    x = (section.enter.from.x ?? 0) * (1 - t);
    y = (section.enter.from.y ?? 0) * (1 - t);
  } else if (section.exit && frame > section.exit.frames[0]) {
    const [a, b] = section.exit.frames;
    const t = easeIn(progressBetween(frame, a, b));
    opacity = 1 - t;
    x = (section.exit.to.x ?? 0) * t;
    y = (section.exit.to.y ?? 0) * t;
  }

  return { opacity, x, y, interactive: opacity > 0.98 };
}

/** State for a layer while its entrance may include extra virtual time. */
export function sectionLayerStateAt(
  section: SectionTimeline,
  frame: number,
  scrollPx: number,
  pxPerFrame: number,
  mode: TimelineMode = "desktop",
): ElementState {
  const timedSection = sectionTimingForMode(section, mode);
  const virtualEnter = virtualEnterProgressAtScrollPx(timedSection, scrollPx, pxPerFrame, mode);
  const virtualExit = virtualExitProgressAtScrollPx(timedSection, scrollPx, pxPerFrame, mode);

  if (virtualExit !== null && timedSection.exit) {
    return sectionStateAt(
      timedSection,
      sectionExitFrameAtVirtualProgress(timedSection, virtualExit)
    );
  }

  if (virtualEnter !== null && timedSection.virtualEnterFrames && frame <= timedSection.settledFrame) {
    // The real enter already reaches the settled frame. A virtual enter is
    // extra scroll/read time, not a second half-opacity entrance.
    return sectionStateAt(
      timedSection,
      timedSection.settledFrame
    );
  }

  return sectionStateAt(timedSection, frame);
}

/* =========================================================
   THE HERO REVEAL — during the entry autoplay
   =========================================================

   The elements arrive one after another while the camera pushes
   forward, all settled by frame 50. Every window below is INSIDE
   ENTRY_FRAMES, so the whole reveal happens on the clock, with
   scroll locked. None of it is scroll-driven.

   Order: brand/logo, wordmark, video card, scroll CTA, buttons.
   The reveal sits in the last 20 frames of the entry (REVEAL_FRAMES).

   The windows are a design choice; the PSD only defines the settled
   state at frame 50.

   The opening frames are bare on purpose — the handover from the
   intro reads better with the camera moving alone before anything
   appears.
   ========================================================= */

export interface PartTimeline {
  id: string;
  /** Frames over which this element arrives. Inside ENTRY_FRAMES. */
  enter: [number, number];
  from: Offset;
  /** Optional — mirrors SectionTimeline's own enter/exit shape. Parts
      without one just stay fully present once entered, fading only
      because the whole section (their parent) fades around them —
      that is "like normal" for brand/logo/video. A part WITH one gets
      its own additional motion during the given scroll frame window,
      independent of and composing with the parent's fade. */
  exit?: { frames: [number, number]; to: Offset };
}

/* Choreography: top section first (logo, brand, video — all fall into
   place from above), then the bottom row (scroll cue, action buttons —
   both rise into place from below). The
   wordmark is deliberately NOT here: its enter window would tie its
   motion to the frame clock, and it stops advancing at
   HERO_SETTLED_FRAME (50), whereas the wordmark needs to keep
   animating well past that on its own clock. Instead HeroLayer
   triggers it directly at WORDMARK_EMERGE_FRAME, below, and a CSS
   keyframe in styles/01-shared-shell.css (".s-hero__wordmark--emerge")
   takes it from there. */
/* scroll/actions carry their own exit, matching HERO's own exit
   window (50-70) so they finish leaving exactly as the rest of the
   hero does. Direction is DOWN (positive y) — the reverse of their
   own entrance, which came from below — rather than fading with the
   parent's -6vh upward drift like brand/video do. brand/video get no
   exit entry: they simply fade with the parent.

   The logo is rendered by HeroLogo.tsx as a sibling of HeroLayer, so
   it is not listed here (see LOGO_ENTER_FRAMES below). */
export const HERO_PARTS: PartTimeline[] = [
  { id: "brand", enter: [31, 37], from: { y: -1.2 } },
  { id: "video", enter: [33, 39], from: { y: -1.4 } },
  {
    id: "scroll",
    enter: [38, 45],
    from: { y: 1.6 },
    // to.y must outweigh the parent's -6vh exit drift to read as
    // downward: +9 nets +3vh, so this sinks while the hero drifts up.
    exit: { frames: [50, 70], to: { y: 9 } },
  },
  {
    id: "actions",
    enter: [40, 48],
    from: { y: 2.0 },
    exit: { frames: [50, 70], to: { y: 10 } },
  },
];

/** The logo's entrance, used by HeroLogo.tsx. Kept here with every
    other frame number. */
export const LOGO_ENTER_FRAMES: [number, number] = [30, 36];
export const LOGO_ENTER_FROM_Y = -1.6;

/** The span the reveal actually occupies — the last 20 frames of the
    entry. Frames 1-29 are background only: the camera keeps pushing
    forward with nothing on top, then the composition assembles. */
export const REVEAL_FRAMES: [number, number] = [30, 50];

/** Frame at which HeroLayer fires the wordmark's emerge animation.
    It starts during the hero reveal and finishes before the hero
    exit, so it cannot pop in after scroll begins. */
export const WORDMARK_EMERGE_FRAME = 30;

/** The wordmark's exit — same window as HERO's own exit (50-70), same
    "reverse of the entrance" shape (scale down + blur back up, fading
    out) as hero-wordmark-emerge, just the other way. Unlike the emerge, this MUST be frame-driven rather than a
    fixed-duration CSS animation: exit happens during the scroll
    phase, where the user can scroll back and forth freely, and only a
    pure function of frame stays correct under that — see the
    useFrameEffect in HeroLayer.tsx that switches control from the CSS
    animation to this the moment frame first passes 50. */
export const WORDMARK_EXIT_FRAMES: [number, number] = [50, 70];

/** The logo's own fade-out window, matching WORDMARK_EXIT_FRAMES and
    the hero section's own exit — the logo leaves with the rest of the
    hero. HeroLogo.tsx and IntroNavGate.tsx (which unhides the app-wide
    GlobalHeader the instant this finishes) both read this. */
export const LOGO_EXIT_FRAMES: [number, number] = [50, 70];

export function wordmarkExitStateAt(frame: number): {
  opacity: number;
  scale: number;
  blurPx: number;
} {
  const [a, b] = WORDMARK_EXIT_FRAMES;
  if (frame <= a) return { opacity: 1, scale: 1, blurPx: 0 };
  const t = easeIn(progressBetween(frame, a, b));
  return {
    opacity: 1 - t,
    // Reverses hero-wordmark-emerge's from-scale (0.46).
    scale: 1 - t * (1 - 0.46),
    blurPx: t * 4,
  };
}

export function partById(id: string): PartTimeline {
  const part = HERO_PARTS.find((candidate) => candidate.id === id);
  if (!part) throw new Error(`Unknown hero part "${id}".`);
  return part;
}

/** An element's state at a given frame. Pure. Past its enter window,
    a part with no `exit` is fully present and the section's own fade
    takes over untouched — same as ever. A part WITH an `exit` gets
    its own additional opacity/offset on top of that once frame enters
    its exit window, mirroring sectionStateAt's enter/exit shape. */
export function partStateAt(part: PartTimeline, frame: number): ElementState {
  const [a, b] = part.enter;

  if (frame < b) {
    const t = easeOut(progressBetween(frame, a, b));
    return {
      opacity: t,
      x: (part.from.x ?? 0) * (1 - t),
      y: (part.from.y ?? 0) * (1 - t),
      interactive: t > 0.98,
    };
  }

  if (part.exit && frame > part.exit.frames[0]) {
    const [ea, eb] = part.exit.frames;
    const t = easeIn(progressBetween(frame, ea, eb));
    return {
      opacity: 1 - t,
      x: (part.exit.to.x ?? 0) * t,
      y: (part.exit.to.y ?? 0) * t,
      interactive: t < 0.02,
    };
  }

  return { opacity: 1, x: 0, y: 0, interactive: true };
}

/* ---------------------------------------------------------
   THE CARVE — an ANIMATION ASSUMPTION, not from the PSD.

   The hero's artwork is masked to the top 85.19% with elliptical
   bottom corners, leaving the teal band its CTAs sit on. Those three
   numbers ARE measured, off the PSD mask layer "Rectangle 1 copy":
   flat bottom edge at y=1840 of 2160 = 85.19%; corners sweeping
   600px across and 346px up = 15.63% and 18.80%. An elliptical
   radius, not a circular one — a circle does not match the curve.

   The PSD is a single static state, so how the carve arrives and
   leaves is a design choice:

     ENTRY  (ENTRY_CARVE_FRAMES)  full-bleed -> the PSD carve. The
                                  intro hands over full-bleed, and the
                                  carve forms as the hero builds in.

     EXIT   (CARVE_FRAMES)        the PSD carve -> full-bleed.

   Between them, frames 40-50 HOLD at the PSD values. That hold is
   deliberate: the carve finishes ten frames before the hero settles,
   so the composition is at rest by frame 50 rather than still
   moving into it. At frame 50 the carve is EXACTLY the PSD's — see
   the exactness note on carveAt().

   Both movements ease out, so the shape decelerates into place
   rather than arriving at a constant rate.
   --------------------------------------------------------- */

/** The PSD's own mask geometry. The settled hero state, measured. */
export const CARVE_SETTLED = { height: 85.19, radiusX: 15.63, radiusY: 18.8 };

/** Phone settled carve. The PSD percentages are read against a wide
    canvas; on a tall narrow viewport the same numbers become a big
    stretched sweep with a fat teal band under the buttons. Phones get
    a shorter band (88% height) and a small gentle curve instead. */
export const CARVE_SETTLED_MOBILE = { height: 88, radiusX: 7, radiusY: 5 };

/** Phone settled carve. On a phone the hero CTAs are a stacked column
    that reaches higher up the screen, and the teal band should sit
    behind BOTH pills, not just clip the lower one — so phones get a
    taller band (lower height %) than tablets. */
export const CARVE_SETTLED_PHONE = { height: 78, radiusX: 7, radiusY: 5 };

/** Viewport at/below which carveAt() uses CARVE_SETTLED_MOBILE.
    Covers phones AND tablets: on any portrait-ish viewport the wide
    PSD carve leaves a fat static teal slab under the buttons, so the
    whole mobile+tablet range gets the shorter band + gentle curve.
    Desktop (> 1100px) keeps the measured PSD carve. */
export const CARVE_MOBILE_MAX_WIDTH = 1100;

/** Viewport at/below which carveAt() uses CARVE_SETTLED_PHONE instead
    of CARVE_SETTLED_MOBILE. Matches the hero's `@media (max-width: 780px)`
    stacked-CTA layout. */
export const CARVE_PHONE_MAX_WIDTH = 780;

/** Full-bleed: no band, no corners. Both the entry's start and the
    exit's end — the carve returns to where it came from. */
export const CARVE_OPEN = { height: 100, radiusX: 0, radiusY: 0 };

/** Frames over which the carve FORMS, during the entry autoplay.
    Ends at 40, ten frames before the hero settles. */
export const ENTRY_CARVE_FRAMES: [number, number] = [1, 40];

/** Frames over which the carve OPENS again. Matches the hero's exit. */
export const CARVE_FRAMES: [number, number] = [50, 70];

export interface Carve {
  height: number;
  radiusX: number;
  radiusY: number;
}

/** Interpolate between two carve shapes.

    Returns the target values at t = 1 rather than computing them, so
    the settled state is bit-exact rather than
    85.19000000000001. Frame 50 has to match the static hero
    precisely — it is the state the PSD was measured against. */
function carveBetween(from: Carve, to: Carve, t: number): Carve {
  if (t >= 1) return { ...to };
  if (t <= 0) return { ...from };
  return {
    height: from.height + (to.height - from.height) * t,
    radiusX: from.radiusX + (to.radiusX - from.radiusX) * t,
    radiusY: from.radiusY + (to.radiusY - from.radiusY) * t,
  };
}

/**
 * The carve's shape at a given frame. Pure.
 *
 * Three regions, in frame order:
 *   1 -> 40    forming, full-bleed to the PSD carve
 *   40 -> 50   held at the PSD carve   (exactly)
 *   50 -> 70   opening, PSD carve back to full-bleed
 *   70 +       full-bleed
 */
export function carveAt(frame: number, mobile = false, phone = false): Carve {
  const settled = phone
    ? CARVE_SETTLED_PHONE
    : mobile
      ? CARVE_SETTLED_MOBILE
      : CARVE_SETTLED;

  if (frame < CARVE_FRAMES[0]) {
    const t = easeOut(
      progressBetween(frame, ENTRY_CARVE_FRAMES[0], ENTRY_CARVE_FRAMES[1])
    );
    return carveBetween(CARVE_OPEN, settled, t);
  }

  const t = easeOut(progressBetween(frame, CARVE_FRAMES[0], CARVE_FRAMES[1]));
  return carveBetween(settled, CARVE_OPEN, t);
}
