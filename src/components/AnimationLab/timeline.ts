/* =========================================================
   ANIMATION LAB — the timeline model
   =========================================================

   THE PAGE HAS TWO PHASES. They are driven by different clocks and
   must not be confused.

     PHASE 1  "entry"   AUTOPLAY, scroll locked.
                        Runs on a real clock, at the footage's own
                        speed, from the intro handoff to the hero's
                        settled frame. The hero elements reveal
                        during it. The user does nothing.

     PHASE 2  "scroll"  Scroll-driven, from the settled frame on.
                        Hero exits, section 2 arrives.

   Between them the page is simply LOADED AND IDLE at frame 50, like
   any normal site. Nothing moves until the user scrolls.

   The hero entry is NOT scroll animation. Nobody has to scroll to
   load the hero.

   ---------------------------------------------------------
   FRAME NUMBERING — read this before touching anything.

   THREE frame sets exist in this project, with different rates and
   different start times, so THE SAME NUMBER MEANS A DIFFERENT
   MOMENT in each. Never carry a number between them unconverted.

     A. video/Intro-frames/   240 frames, Intro.mp4,  0 -> 22.700s
                              240/22.70    = 10.5727 fps
     B. video/full-frames/    240 frames, Full.mp4,   0 -> 161.367s
                              240/161.3667 =  1.4873 fps   <- COARSE
   C. public/frames/        1125 frames, final 4K edit after intro
                              5.1922 fps                   <- THIS FILE

   Everything here, and in FRAME-MAP.md, is set C, 1-based.
   src/data/home.ts framePath() takes a 0-BASED index into set C;
   that conversion happens in one place only, frameSrc() below.

   ---------------------------------------------------------
   THE INTRO HANDOFF — measured 2026-08-19.

   Intro-frames/frame_0240.webp (the intro's final frame) diffed
   against full-frames 30-35. Mean absolute difference /255:

       30: 16.79   31: 15.18   32: 13.92
       33: 11.52   34: 10.86 <- closest   35: 17.79

   So the handoff is FULL-FRAME 34 (set B) — a clean minimum, with
   the rise at 35 being the cut.

   Set B samples only 1.4873 times a second, though, so its frames
   sit 0.67s apart and 34 is merely the last sample before the cut:
   t = 33/1.4873 = 22.188s, half a second before the intro ends.

   Resolved against the source timeline instead, by pulling Full.mp4
   at its true 30fps across 21.8-23.6s and diffing every frame:

       true handoff  t = 22.667s   (next best 22.700s)

   Into set C, whose frame 1 is t 22.700s:

       (22.667 - 22.700) x 5.1922 + 1  =  frame 0.83

   ==> THE HANDOFF IS SET-C FRAME 1, within 0.17 of a frame.

   Set C was deliberately cut starting at 22.700s so that its first
   frame IS the handover. Full-frame 34 and set-C frame 1 are the
   same moment in the video, named by two sets of different density.
   ========================================================= */

/** Set-C frame the intro hands over to. Measured — see above. */
export const HANDOFF_FRAME = 1;

/** Set-C frame where the hero is fully loaded. Measured, FRAME-MAP.md. */
export const HERO_SETTLED_FRAME = 50;

/** Last frame the lab runs to — the full post-intro new-video timeline. */
export const LAB_LAST_FRAME = 1125;

/* ---------------------------------------------------------
   PHASE 1 — the automatic entry
   --------------------------------------------------------- */

/** Autoplay window: intro handoff -> hero settled. */
export const ENTRY_FRAMES: [number, number] = [
  HANDOFF_FRAME,
  HERO_SETTLED_FRAME,
];

/** Playback rate of the current post-intro source timeline. */
export const SET_C_FPS = 5.1922;

/** Playback multiplier. 1.0 = the footage's real speed, which is 9.44
    REAL SECONDS of locked scroll — measured as far too slow for a
    hero load.

    Raising it shortens the entry AND makes it smoother, because the
    frame count is fixed: displayed fps = 5.1922 x ENTRY_SPEED.

        speed  duration  displayed fps
          1      9.44s      5.2      unwatchable
          3      3.15s     15.6      still steps
        > 4      2.36s     20.8      chosen
          5      1.89s     26.0      film rate, but very brief

    4 is the top of the 2.3-3.2s target and the smoothest option the
    current 49 frames can give. The ceiling here is FRAME COUNT, not
    speed — see the note on density below. */
export const ENTRY_SPEED = 2;

/* ---------------------------------------------------------
   MEASURED: why 20.8fps is the ceiling, and what would lift it.

   Consecutive-frame change across the entry window (mean abs
   difference, full resolution):

     shipped 720 set, 49 frames in the window   9.06
     whole clip, from PROJECT-LOG                3.10

   The entry is ~3x more active than the clip average — it is the
   camera's hardest forward push, right after the intro.

   Fitting  change = grain + motion x spacing  over test extractions
   of the same window at 49 / 73 / 145 frames:

     compression + grain floor  6.32   constant, does not judder
     motion                    15.08 per second of spacing

   So the part that actually steps is the motion component:

     frames in window   displayed fps @2.4s   motion per shown frame
        49 (shipped)          20.4                   2.90
        73                    30.0                   1.98
       145                    60.0                   0.99

   ==> A 73-frame entry-only set would run the same 2.4s at 30fps
   with the per-frame step cut by a third. 145 is wasteful. Proposed,
   not built — see PROJECT-LOG.
   --------------------------------------------------------- */

export const ENTRY_DURATION_MS =
  ((ENTRY_FRAMES[1] - ENTRY_FRAMES[0]) / SET_C_FPS / ENTRY_SPEED) * 1000;

/* ---------------------------------------------------------
   PHASE 2 — scroll
   --------------------------------------------------------- */

/** Scroll begins at the settled hero. Frames before it are never
    reachable by scrolling — they belong to the entry. */
export const SCROLL_FIRST_FRAME = HERO_SETTLED_FRAME;
export const SCROLL_LAST_FRAME = LAB_LAST_FRAME;

/** Duration of the optional downward-only end-to-start cinematic bridge. */
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

/** Scroll distance per frame. 34 was an inspection speed and made
    the page feel heavy — 3,060px, 2.8 screens, to get through 90
    frames. What each value costs, at a 1080px viewport:

        px/frame  hero exit 50-70   whole scroll 50-140
           34         680px (0.63 screens)  3060px (2.8 screens)
        >  14         280px (0.26 screens)  1260px (1.2 screens)
            8         160px (0.15 screens)   720px (0.7 screens)

    14 is chosen: the top of the 8-14 range, because at 8 the entire
    remaining page is under one screen of scroll and a single flick
    crosses the hero exit, the gap and section 2 together.

    Override for inspection with ?px=<n> — see PX_PER_FRAME_DEFAULT
    and readPxPerFrame() below. */
export const PX_PER_FRAME_DEFAULT = 14;

/** Debug override: /animation-lab?px=34 restores the old inspection
    pace without a rebuild. Falls back to the default off-browser. */
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

   So every non-hero section gets extra scroll room at its own
   settledFrame before scroll continues: enter, hold, exit — the same
   shape for a caption banner as for a dense dashboard. Decided
   2026-08-21: one fixed budget for all of them, not sized per
   section, so it stays one number to retune.

   REVISED same day: a dead-flat freeze read as broken, not settled.
   The hold now CRAWLS — the footage still creeps forward, just very
   slowly, through HOLD_CRAWL_FRAMES on each side of settledFrame (8
   frames total) instead of pinning at a single frame.

   HOLD_CRAWL_SLOWDOWN is how much slower than normal scrubbing that
   crawl is (VJ: 12.5x read as stuck, not slow — dropped to 6x). Scroll
   budget is derived from it rather than a raw pixel count, so "make
   the crawl Nx slower" stays a one-number change instead of redoing
   the pixel math by hand each time. It's PX_PER_FRAME_DEFAULT the
   budget scales off, not the (rare) ?px= override — the crawl's
   sluggishness is a content-pacing choice, it shouldn't quietly
   change just because someone loaded the page in inspection mode. */
export const HOLD_CRAWL_FRAMES = 4;
export const HOLD_CRAWL_SLOWDOWN = 6;
export const HOLD_SCROLL_PX =
  HOLD_CRAWL_FRAMES * 2 * PX_PER_FRAME_DEFAULT * HOLD_CRAWL_SLOWDOWN;

/** One section's hold, resolved to numbers. slowdown/rampFrames come
    from the section's own overrides, defaulting to the shared crawl
    (6x, no ramp — the old hard-cut behaviour) for every section that
    doesn't set them. */
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
let stopsCache: Stop[] | null = null;
function stops(): Stop[] {
  if (!stopsCache) {
    const crawlStops: Stop[] = SECTIONS.filter(
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
    const carouselStops: Stop[] = SECTIONS.filter((section) => section.carousel).map(
      (section) => ({
        kind: "carousel",
        sectionId: section.id,
        frame: section.settledFrame,
        scrollPx: section.carousel!.scrollPx,
        virtualEnterFrames: section.virtualEnterFrames ?? 0,
        virtualExitFrames: section.virtualExitFrames ?? 0,
      })
    );
    const scrollThroughStops: Stop[] = SECTIONS.filter(
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
    stopsCache = [...crawlStops, ...carouselStops, ...scrollThroughStops].sort(
      (a, b) => a.frame - b.frame
    );
  }
  return stopsCache;
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
    `pxPerFrame` parameter — same as the original HOLD_SCROLL_PX did.
    It's a content-pacing choice, not something that should quietly
    change because someone loaded the page with a ?px= override. */
function buildLegs(pxPerFrame: number): Leg[] {
  const legs: Leg[] = [];
  let frame = SCROLL_FIRST_FRAME;

  for (const stop of stops()) {
    if (stop.kind === "carousel") {
      // Bug fix, 2026-08-24 (VJ: "start point need to fix... it have
      // 1 or 2 fram issue so fully stop"): scrolling in at full,
      // uncrawled pace right up to the exact freeze frame then
      // hard-cutting to pinned read as not-quite-stopped. Give it the
      // same crawl-in every other section's hold gets (decelerate
      // over HOLD_CRAWL_FRAMES beforehand) so it visibly settles
      // before the freeze, not just after. No crawl-OUT on the other
      // side — the freeze itself is the "settle", already far longer
      // than a normal hold's crawl.
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
      legs.splice(legs.length - (crawlEnd > stop.frame ? 1 : 0), 0, {
        frameStart: stop.frame,
        frameEnd: stop.frame,
        pxPerFrame: 0,
        pxSpan: stop.virtualEnterFrames * pxPerFrame,
        virtualEnter: { sectionId: stop.sectionId, totalFrames: stop.virtualEnterFrames },
      });
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
export function frameForScrollPx(px: number, pxPerFrame: number): number {
  let consumed = 0;
  for (const leg of buildLegs(pxPerFrame)) {
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
  pxPerFrame: number
): {
  frame: number;
  totalFrames: number;
  elapsedFrames: number;
  remainingFrames: number;
} | null {
  let consumed = 0;
  for (const leg of buildLegs(pxPerFrame)) {
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
  pxPerFrame: number
): number | null {
  let consumed = 0;
  for (const leg of buildLegs(pxPerFrame)) {
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
        section.exit &&
        frameForScrollPx(px, pxPerFrame) < section.exit.frames[1]
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
  pxPerFrame: number
): number | null {
  let consumed = 0;
  for (const leg of buildLegs(pxPerFrame)) {
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
export function scrollPxForFrame(frame: number, pxPerFrame: number): number {
  let consumed = 0;
  for (const leg of buildLegs(pxPerFrame)) {
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
export function totalScrollPx(pxPerFrame: number): number {
  return scrollPxForFrame(SCROLL_LAST_FRAME, pxPerFrame);
}

/** Every frame file the lab needs: the entry's plus the scroll's. */
export const LAB_FIRST_FRAME = ENTRY_FRAMES[0];
export const LAB_FRAME_COUNT = LAB_LAST_FRAME - LAB_FIRST_FRAME + 1;

/** The regular set: 1942x1080 q90. Full post-intro new-video timeline. */
export const FRAME_DIR_DEV = "/frames";

/** The HQ client-preview set: 2590x1440 q95. Full post-intro timeline,
    reached ONLY through /animation-lab?quality=hq. */
export const FRAME_DIR_HQ = "/frames-hq";

/** 4K set from the NEW video (Haycarb AI Final Video.mp4), 3884x2160,
    extracted at the same 5.1922 fps and renumbered from 1 so it shares
    the numbering below. Served only on /animation-lab-4k — the two
    routes above are untouched by its existence. Separate route rather
    than another ?quality= value because the new video is a different
    edit: its frame N is NOT guaranteed to be the same moment as the
    old sets' frame N, so the section frame numbers in SECTIONS may not
    land the same way. Keeping it on its own URL means finding that out
    cannot break the working ones. */
export const FRAME_DIR_4K = "/frames-4k";

/** 2x-density sets from the full post-intro source timeline, at exactly
    10.3844 fps (2 x SET_C_FPS). They share this timeline's logical
    frame numbers; the dense route simply has two files per frame. */
export const FRAME_DIR_2X = "/frames-2x";
export const FRAME_DIR_2X_HQ = "/frames-2x-hq";

/** 4x-density set, 1080p only (VJ, 2026-08-25: "same way 4x only for
    1080"). Same start, 20.7688 fps (4 x SET_C_FPS), trimmed by 196 so
    file 1 lands on the 840-sets' frame 1 — the general rule is
    `file = k*N - (k-1)`, so at k=4 the light set's frame 1 sits at
    dense frame 197. Quarter-frame scroll resolution; still no timeline
    of its own. */
export const FRAME_DIR_4X = "/frames-4x";

/** The intro shot — 240 frames, public/frames-intro (2590x1440): the
    opening camera push from the new final 4K video through the visual
    handoff into set-C frame 1. Loaded only by LabIntro.tsx on the
    /animation-lab-full, -intro and -loading routes — every other
    route never touches it. */
export const FRAME_DIR_INTRO = "/frames-intro";
export const INTRO_FRAME_COUNT = 240;
/** 240 frames across the new video's 30.815s opening ≈ 7.79 fps —
    its real speed, so the last intro frame lands on the new set-C
    frame-1 visual handoff. */
export const INTRO_FPS = INTRO_FRAME_COUNT / 30.815;

/** 1-based intro frame number -> file. Same padded naming as
    frameSrc(), different folder. */
export function introFrameSrc(frame: number): string {
  return `${FRAME_DIR_INTRO}/frame_${String(frame).padStart(4, "0")}.webp`;
}


/** 1-based set-C frame number -> file. Both sets share the numbering,
    the 22.700s start and the 5.192308 fps rate, so a frame number
    means the same moment in either — only the pixels differ. */
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

/** Per-item stagger, purely a function of `frame` — the frame-driven
    replacement for the CSS animation-delay staggers ported from
    motion.js (per-character title reveal, per-card/feature rise-in).
    `count` items share `window`, each getting its own slice with a
    little overlap so neighbours don't read as discrete steps; item 0
    starts at window[0], the last item finishes at window[1].

    Unlike a CSS animation (fixed real-world duration, decoupled from
    scroll once triggered), this ties every item's progress directly
    to the frame the user has scrolled to — scroll fast and the
    stagger visibly catches up/skips ahead with you, scroll slowly and
    it plays out slowly, scroll backward and it reverses. If a window
    feels too tight for its item count, the fix is to widen `window`
    (more frames = more scroll distance = more room), not to add a
    fixed-duration animation back. */
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
  /** The "fully loaded" frame — measured, from FRAME-MAP.md. */
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
      Omit (0) for the old hard-cut behaviour. */
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
      lead/tail buffers. VJ (2026-08-24): "after u stop give similar
      time for 1 frame to start scrolling, also scroll done and
      before start move wait 2 or 3 frame" — leadPx/tailPx exist
      specifically for that pause on each side. */
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

export const SECTIONS: SectionTimeline[] = [
  {
    id: "01-hero",
    label: "Hero — Beyond the Beyond",
    settledFrame: HERO_SETTLED_FRAME,
    // No section-level enter: the hero arrives during the entry
    // phase, element by element — see HERO_PARTS.
    exit: {
      // FRAME-MAP: hero animation window 50 -> 70. The camera's own
      // hold is 62-65, so the exit rides through the hold and is
      // finished before the camera moves off.
      frames: [50, 70],
      to: { y: -6 },
    },
    // Keep the fully loaded hero on frame 50 for ten virtual frames
    // of scroll before its exit starts. No image files are duplicated.
    holdFrames: 10,
    holdCrawlFrames: 0,
  },
  {
    id: "02-main-02",
    label: "Bridge — A Journey of Possibilities",
    // Not FRAME-MAP'd: no camera hold near here, this is a short title
    // card invented to bridge the hero's exit (ends 70) and the
    // approach panel's enter (starts 109). Frame 74 is only where
    // html-templates/01-main-02.html took its static preview still
    // from — the window below is a design choice, not a measurement.
    //
    // Everything here — enter, the crawl hold at 85, exit and the
    // speed ramp back to normal — is deliberately finished by frame
    // 93, well ahead of the approach panel's own enter at 109: the
    // bridge card gets its slow, readable moment and gets out of the
    // way cleanly rather than lingering into the next section's
    // arrival.
    settledFrame: 90,
    enter: { frames: [70, 90], from: { y: 4 } },
    exit: { frames: [91, 105], to: { y: -4 } },
    holdFrames: 10,
    // Half speed, not the shared 6x — a lighter touch is enough for a
    // short title card that is already fading out again 7 frames
    // after its settle, unlike a data-dense panel.
    holdSlowdown: 2,
    // Ramps 89 -> 93 (crawlEnd = 85 + HOLD_CRAWL_FRAMES) back to full
    // scroll speed over 3 short linear steps, landing on normal pace
    // exactly as the card's own exit finishes at 92.
    holdRampFrames: 4,
  },
  {
    id: "03-approach",
    label: "Our Approach to Reporting — Physical Report",
    settledFrame: 134,
    enter: {
      // FRAME-MAP: the book's leading edge slides in at 109, the
      // composition is settled at 118. The panel arrives with it.
      frames: [114, 134],
      from: { y: 5 },
    },
    holdFrames: 10,
    virtualExitFrames: 10,
    exit: {
      // FRAME-MAP: window 118 -> 135, camera holds 123-128.
      frames: [145, 158],
      to: { y: -5 },
    },
    // The panel is a tall overflow:auto list (5 items + CTA) — more
    // to read per frame of scroll than the default window covers.
    loadBuffer: { behind: 4, ahead: 4 },
  },
  {
    id: "04-digital",
    label: "The Next Horizon of Intelligent Reporting",
    settledFrame: 161,
    enter: {
      // FRAME-MAP: tablet starts entering left at 136, fully arrived
      // (both elements in position) at 150.
      frames: [141, 161],
      from: { y: 5 },
    },
    holdFrames: 10,
    exit: {
      // FRAME-MAP: composition intact to 166, animation window 150-170.
      frames: [161, 176],
      to: { y: -5 },
    },
    // Taller than 02-approach's panel — features grid + interactive
    // grid + CTA, same overflow:auto scrollbar.
    loadBuffer: { behind: 4, ahead: 4 },
  },
  {
    id: "05-intro-statement",
    label: "Intro Statement — Beyond the Beyond",
    // Promoted from a standalone, non-SECTIONS layer (IntroStatementLayer.tsx)
    // to a real entry, 2026-08-25, per VJ. Its own hardcoded ENTER_FRAMES/
    // EXIT_FRAMES (246-254/254-265, tuned against the OLD cut, so Glance
    // settled at 266) are gone — the component now reads its window from
    // this entry via useSectionLayer, same as every other section.
    //
    // Re-measured against the new cut, 2026-08-25: 06-key-data-points now
    // settles at 233 (enter starts 224). This entry keeps the same
    // proportions the old numbers had — an 8-frame enter, an 11-frame exit
    // that ends 4 frames INTO the next section's own enter (a deliberate
    // crossfade, not a bug) — resolved backward from the new enter start:
    //   exit ends   224 + 4  = 228
    //   exit spans  228 - 11 = 217  (= settledFrame)
    //   enter spans 217 - 8  = 209
    settledFrame: 255,
    enter: { frames: [245, 255], from: {} },
    exit: { frames: [255, 269], to: {} },
    virtualEnterFrames: 10,
    holdFrames: 10,
    virtualExitFrames: 14,
  },
  {
    id: "06-key-data-points",
    label: "Key Data Points — Haycarb at a Glance",
    // FRAME-MAP: the third measured camera hold, 268-273, previously
    // unassigned ("holds found at 62-65, 123-128, 268-273 ... I can
    // map the remaining sections this way whenever you want"). Same
    // rule as every other section: settled a little before the hold,
    // hold left as runway. This section has no video background of
    // its own (see GlanceLayer) — it's an opaque light panel that
    // fully covers the canvas by the time it's settled, so the hard
    // cut to the city footage at 196-203 is hidden behind it well
    // before either is on screen at the same time.
    //
    // TEMPORARY, 2026-08-23: settledFrame moved 266 -> 270 per VJ,
    // while the 04-key-data-points.html template itself is still
    // being reworked — not a remeasurement of the camera hold above,
    // just a placeholder shift.
    //
    // 2026-08-24: ported from the richer 06-glance.html (title,
    // quote, 4 stats+counters, note, video card, 4 pills). First pass
    // widened this to enter:[240,270] to give the internal stagger
    // room, but that also pulled the SECTION's own opacity fade back
    // to 240 — 30 frames before the camera hold, so the layer was
    // visibly showing far too early (VJ: "that section load after
    // fram 261 befor that laver show it"). Corrected: the parent's
    // own visibility now starts at 261, matching the hold; the child
    // stagger windows in GlanceLayer.tsx pack their overlapping
    // staggers into that same short span instead (same technique as
    // Governance's 5 stat cards fitting inside a tight parent
    // window) rather than the parent starting early. Exit keeps a
    // small hold (270-273) before it starts, same as
    // Governance-Cards, to avoid a snap at the settle frame.
    settledFrame: 275,
    enter: { frames: [263, 275], from: { y: 6 } },
    exit: { frames: [279, 302], to: { y: -6 } },
    holdFrames: 10,
    // VJ 2026-08-28: this section's reveal (238-247) went by too fast.
    // Its enter is 9 frames wide — well past the default +/-4 crawl
    // half-width (243-251), so most of the reveal was running at full
    // scroll speed. Widen the crawl to 9 so the whole 238-256 span sits
    // in the slow zone; at the shared 6x crawl pace that also roughly
    // doubles the scroll distance spent on this section.
    holdCrawlFrames: 9,
  },
  {
    id: "07-banner-city",
    label: "Banner — City Skyline",
    // Template 05-banner-city.html: the supplied still identified frame
    // 320 in the OLD cut as the fully established skyline/caption
    // composition. Re-measured against the new cut, 2026-08-25 (VJ):
    // settledFrame 295, exit finished by 315 — well clear of the shot
    // cut into the boardroom footage at ~322-325.
    settledFrame: 335,
    enter: { frames: [322, 335], from: { y: 4 } },
    exit: { frames: [335, 371], to: { y: -4 } },
    virtualEnterFrames: 10,
    holdFrames: 10,
    virtualExitFrames: 10,
  },
  {
    id: "08-financial",
    label: "Financial Highlights",
    // Same hold every other section gets now (see THE HOLD above).
    // This was the section that motivated it — a dense static
    // dashboard needs real reading time — but the behavior isn't
    // special-cased to it anymore.
    //
    // 2026-08-25 (VJ: "it just came and go", then "loading in 325,
    // fully load 338"): unlike every other section, exit here does
    // NOT touch settledFrame. The ±4-frame crawl (HOLD_CRAWL_FRAMES,
    // 334-342) only slows scroll pace, it doesn't pause opacity — so
    // an exit starting exactly at settledFrame means the section
    // scrolls off partly at normal, non-crawled speed right after
    // barely finishing its enter. Enter is 325 -> 338 (visibly still
    // loading through the second half of the crawl, fully loaded
    // exactly on cue at 338); exit doesn't start until 344, after the
    // crawl zone ends at 342 — a real flat-opacity plateau from 338
    // to 344 instead of a momentary peak.
    settledFrame: 436,
    enter: { frames: [410, 436], from: { y: 5 } },
    exit: { frames: [448, 454], to: { y: -5 } },
    holdFrames: 20,
    virtualExitFrames: 20,
  },
  {
    id: "09-governance-intro",
    label: "Governance intro — transition to Lighthouse",
    // NEW breaker (audit gap G2), inserted 2026-08-27 per VJ: a text
    // bridge between Financial Highlights and Corporate Governance,
    // over the lighthouse shot. settledFrame 382 (VJ). Windows sit in
    // the ~354-390 gap between 08-financial's exit (…354) and
    // 09→10-governance's enter (390…). Inserting this shifted every
    // downstream id and SECTIONS[n] index by one.
    settledFrame: 511,
    enter: { frames: [490, 511], from: { y: 4 } },
    exit: { frames: [511, 520], to: { y: -4 } },
    virtualEnterFrames: 10,
    holdFrames: 10,
    virtualExitFrames: 20,
  },
  {
    id: "10-governance",
    label: "Corporate Governance",
    // Re-measured against the new cut, 2026-08-25: the lighthouse shot
    // only runs new frames ~378-417 (was ~69 frames in the old cut,
    // now ~40) — not enough distinct footage to give this section,
    // 10-governance-cards AND 11-leadership their own separate settle
    // point the way every other section gets one. VJ: "stop in fream
    // 394 ... in same fream (still stop) load 10-governance-cards
    // after 09 go", then "add 11-leadership also before 415 fream".
    // All three settle within ~20 frames of each other, deep inside
    // this one still-mostly-static shot, sequenced entirely by their
    // own opacity (not by the background moving) — see the other two
    // sections' own notes. Exit shortened to 7 frames (was 10) to
    // leave 10-governance-cards enough room of its own.
    settledFrame: 533,
    enter: { frames: [520, 533], from: { y: 4 } },
    exit: { frames: [533, 540], to: { y: -4 } },
    virtualEnterFrames: 15,
    holdFrames: 10,
    virtualExitFrames: 20,
  },
  {
    id: "11-governance-cards",
    label: "Driving Sustainable Value Creation Through Effective Governance",
    // NEW section, inserted 2026-08-24 per VJ ("add this as a new 8").
    // Was a standalone layer outside this array at first (avoiding an
    // index shift on everything after it), then moved in here properly
    // on request, so it shows in the debug HUD like every other
    // section — everything from here down had its own id/array index
    // bumped by one to make room.
    //
    // Re-measured 2026-08-25 alongside 09-governance and
    // 11-leadership (see their own notes): settledFrame 403, still
    // inside the ~378-417 lighthouse shot. Enter starts at 397, 4
    // frames before Governance's own exit finishes (401) — "slowly
    // start" while Governance is still fading out, not cut in after a
    // gap. Exit shortened to 6 frames so Leadership has room to settle
    // before 415.
    settledFrame: 540,
    enter: { frames: [535, 540], from: { y: 6 } },
    exit: { frames: [540, 550], to: { y: -6 } },
    virtualEnterFrames: 20,
    holdFrames: 10,
    virtualExitFrames: 20,
  },
  {
    id: "12-leadership",
    label: "Our Approach to Reporting — Artboard 5",
    // Was its own, later video slot (settled 442) before VJ asked to
    // squeeze it onto the same lighthouse shot as 09/10, fully loaded
    // before frame 415 ("add that section also using ur technic" —
    // same shared-shot, opacity-only sequencing as the other two, see
    // 09-governance's own note). Settles at 411, enter overlaps
    // 10-governance-cards' own exit tail by 2 frames (same "slowly
    // start" crossfade). Exit is allowed to run past the shot's own
    // ~417 end (into 419) since that's just a fade-out, not a hold —
    // scroll resumes at normal pace into 12-banner-ocean well after.
    settledFrame: 555,
    enter: { frames: [543, 555], from: { x: 4 } },
    exit: { frames: [555, 575], to: { x: 4 } },
    virtualEnterFrames: 20,
    holdFrames: 10,
    virtualExitFrames: 10,
  },
  {
    id: "13-banner-ocean",
    label: "Banner — ocean navigation",
    // 2026-08-24: briefly moved to settle at 285 (right after Key Data
    // Points) per a misheard frame number, then corrected back here —
    // "sorry it is fram 485 soo sorry bro". Content (Artboard 6.html)
    // stays wired up in OceanBannerLayer.tsx; only the position moved
    // back to between Leadership and Capitals, close to (not exactly)
    // its original template-measured settledFrame of 503. Enter/exit
    // sit in the gap between Leadership's own exit (457) and Capitals'
    // own enter (550), same plain-gap pattern as the rest of this
    // timeline's banner boundaries.
    settledFrame: 650,
    enter: { frames: [642, 650], from: { y: 4 } },
    exit: { frames: [650, 665], to: { y: -4 } },
    virtualEnterFrames: 20,
    holdFrames: 10,
    virtualExitFrames: 20,
  },
  {
    id: "14-financial-capital",
    label: "Capitals Management",
    // NEW section, 2026-08-24, ported from html-templates/final/
    // Artboard 7.html — a 5-card scroll-jack carousel, distinct from
    // every other section in this timeline. VJ's own words: "stop
    // move video after this fully load and scroll card one by one
    // after finish scarling card work like normal section desaper
    // with frams." Confirmed mechanism: scroll drives the background
    // frame-scrub normally up to settledFrame; AT settledFrame the
    // scrub freezes completely (not just slowed, unlike every other
    // section's crawl hold — see the `carousel` field and
    // buildLegs/stops in this file) while further scroll instead
    // drives the 5-card carousel in FinancialCapitalLayer.tsx; once
    // that scrollPx budget is spent, frame-driven scroll resumes and
    // this section exits exactly like any other, fading out as
    // normal before the River banner enters. That file reads
    // FINCAP.settledFrame live (scrollPxForFrame(FINCAP.settledFrame,
    // ...) as its zero point), so retiming this entry alone moves the
    // freeze point correctly — no duplicate number to keep in sync.
    //
    // Re-measured against the new cut, 2026-08-25: settledFrame 490
    // (was 515), sits after Ocean's exit (475) and before the River
    // banner enters (594 as of this writing — see 14-banner-river).
    // Exit only starts advancing once the carousel budget is spent,
    // since the frame is pinned at 490 until then.
    settledFrame: 675,
    enter: { frames: [665, 675], from: { y: 4 } },
    exit: { frames: [675, 693], to: { y: -4 } },
    virtualEnterFrames: 20,
    virtualExitFrames: 20,
    // leadPx ~1 crawl-speed frame (14 * HOLD_CRAWL_SLOWDOWN), tailPx
    // ~2.5 — see the carousel field's own doc comment for why these
    // exist. scrollPx is the full budget: leadPx + the sweep + tailPx.
    // Sweep was 1920px for the original 5 cards (480px/gap); scaled to
    // 2880px for the 7 capital cards (2026-08-28) to hold that same
    // per-card scroll distance.
    carousel: { count: 7, scrollPx: 90 + 2880 + 240, leadPx: 90, tailPx: 240 },
  },
  {
    id: "15-banner-river",
    label: "Banner — mountain river",
    // Artboard 8: fully loaded at frame 613 in the OLD cut. Re-measured
    // against the new cut, 2026-08-25: settledFrame 590.
    settledFrame: 830,
    enter: { frames: [816, 830], from: { y: 4 } },
    exit: { frames: [830, 841], to: { y: -4 } },
    holdFrames: 10,
  },
  {
    id: "16-nonfinancial",
    label: "Non-Financials",
    // Non-Financials: fully loaded at frame 635 in the OLD cut.
    // Re-measured against the new cut, 2026-08-25: settledFrame 620.
    settledFrame: 860,
    enter: { frames: [850, 860], from: { y: 4 } },
    exit: { frames: [860, 875], to: { y: -4 } },
    holdFrames: 10,
    virtualEnterFrames: 20,
    virtualExitFrames: 20,
  },
  {
    id: "17-strategy",
    label: "Strategy, Risks & Opportunities",
    // final/15 Horizon of Progress.html: overlay starts at 650, fully
    // loaded at 670 in the OLD cut; re-measured to 704 on 2026-08-25.
    //
    // The content — title, five Strategic Pillars, three Risks &
    // Opportunities — is taller than one viewport. VJ 2026-08-31: it is
    // now ONE continuous page, not two viewport "pages" snapped A -> B.
    // `scrollThrough` gives it a scroll budget past settledFrame across
    // which StrategyLayer.tsx glides the whole .s-strategy__panel up by
    // exactly its overflow. Then the real exit window below fades the
    // layer out, same as every other section — no scroll-jack, no
    // snapping.
    //
    // Pin-after-30 design (VJ 2026-08-31): §17 settles, advances through
    // 43 real frames to pinFrame, then keeps the background on that frame
    // while the panel completes over 60 virtual frames and fades away over
    // another 30 virtual frames. There is no hold phase. The section exit
    // runs while that background remains pinned, and section 18 enters at
    // 1015.
    //
    // Moved 2026-09-02: enter 870, settles 890 (was 860/875). Everything
    // after settledFrame shifted with it so the scroll-through is
    // untouched — these four numbers are locked together:
    //   pinFrame - settledFrame must stay 43. StrategyLayer derives the
    //     panel glide as scrollPx - (pinFrame - settledFrame)*px -
    //     virtualExitFrames*px, so changing the gap silently rescales the
    //     glide (28 would have made it 75 virtual frames, not 60).
    //   exit[0] must equal pinFrame. The real frame is pinned there for
    //     the whole glide, so an earlier exit would fade the panel out
    //     while it is still moving.
    //   exit width must stay virtualExitFrames (30).
    // Only the enter window changed shape: 15 frames -> 20, as asked.
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
    // final/16-Community Impact.html: enters at 686 and settles at 690
    // in the OLD cut. Re-measured against the new cut, 2026-08-25:
    // settledFrame 780. Exit keeps the original's 15-frame gap after
    // settledFrame (705 was 15 past 690) — that gap is how far normal
    // frame-driven scroll has to travel, AFTER the carousel's own
    // scrollPx budget is spent and frame resumes advancing, before
    // reaching the exit window; it isn't part of the carousel itself
    // (which is pure px, unaffected by this frame move — see
    // CommunityLayer.tsx, reads COMMUNITY.settledFrame live).
    settledFrame: 1020,
    enter: { frames: [1015, 1020], from: { y: 4 } },
    exit: { frames: [1038, 1054], to: { y: -4 } },
    // Same stop-scroll rule as section 11: lead pause, card sweep, tail
    // pause, then normal frame scrolling resumes. Sweep is 584px per gap;
    // seven spec stories therefore need six gaps (3504px).
    carousel: { count: 7, scrollPx: 168 + 3504 + 84, leadPx: 168, tailPx: 84 },
    virtualEnterFrames: 10,
    virtualExitFrames: 10,
  },
  {
    id: "19-end-screen",
    label: "End screen message",
    // Moved 45 frames earlier (was settled 1100, enter [1080, 1100], exit
    // [1100, 1125]). The whole window shifts, so the 20-frame reveal and
    // 25-frame exit keep the pace they had; only their position changes.
    // It now crossfades with 18-community's exit [1038, 1054] instead of
    // leaving the 26-frame dead gap that sat between them.
    //
    // LAB_LAST_FRAME stays 1125: that is the number of files in
    // public/frames/, not a marker for this section, so shortening it to
    // match the new exit would drop the last 45 frames of footage.
    settledFrame: 1055,
    enter: { frames: [1035, 1055], from: { y: 4 } },
    holdFrames: 10,
    exit: { frames: [1055, 1080], to: { y: -4 } },
    // 20 crawl frames each side of settledFrame at half scroll speed,
    // instead of the shared 4-frame/6x default. The 20 after settledFrame
    // are the ask: the end screen keeps moving but takes twice the scroll
    // to get through 1055 -> 1075. The same 20 land on the way in, which
    // is what the enter window [1035, 1055] already spans — per the rule
    // that a reveal wider than crawlFrames otherwise plays out at full
    // scroll speed outside the slow zone.
    holdCrawlFrames: 20,
    holdSlowdown: 2,
    // Virtual frames pinned at settledFrame, same pattern as 18-community:
    // 10 held after the word-by-word reveal completes (the dark overlay
    // finishes filling here), then 10 more that drive the reversed exit
    // before real frame scrolling resumes.
    virtualEnterFrames: 10,
    virtualExitFrames: 10,
  },
];

/** Keep the background frame aligned with the shared frame timeline. */
export function backgroundFrameForFrame(frame: number): number {
  return frame;
}

/** Blend out Section 17's pinned still instead of hard-cutting to frame 1009. */
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

/** State for a layer while its entrance may be split across real and
    virtual frames. Once the virtual entrance completes, use the settled
    frame instead of replaying the real entrance at half opacity. */
export function sectionLayerStateAt(
  section: SectionTimeline,
  frame: number,
  scrollPx: number,
  pxPerFrame: number
): ElementState {
  const virtualEnter = virtualEnterProgressAtScrollPx(section, scrollPx, pxPerFrame);
  const virtualExit = virtualExitProgressAtScrollPx(section, scrollPx, pxPerFrame);
  const [enterStart, enterEnd] = section.enter?.frames ?? [frame, frame];
  const [exitStart, exitEnd] = section.exit?.frames ?? [frame, frame];
  const combinedEnter = 0.5 + (virtualEnter ?? 0) * 0.5;

  if (virtualExit !== null && section.exit) {
    return sectionStateAt(
      section,
      exitStart + (exitEnd - exitStart) * virtualExit
    );
  }

  if (virtualEnter !== null && section.virtualEnterFrames && frame <= section.settledFrame) {
    return sectionStateAt(
      section,
      enterStart + (enterEnd - enterStart) * combinedEnter
    );
  }

  return sectionStateAt(section, frame);
}

/* =========================================================
   THE HERO REVEAL — during the entry autoplay
   =========================================================

   The elements arrive one after another while the camera pushes
   forward, all settled by frame 50. Every window below is INSIDE
   ENTRY_FRAMES, so the whole reveal happens on the clock, with
   scroll locked. None of it is scroll-driven.

   Order is VJ's: brand/logo, wordmark, video card, scroll CTA,
   buttons.

   TIGHTENED 2026-08-19: the reveal was spread across frames 6-50,
   which read as lazy. It now sits in the LAST 20 FRAMES (30-50) —
   at ENTRY_SPEED 4 that is 0.96s in total, each element taking about
   0.5s with a 0.1s stagger between starts. The background keeps
   moving from the handoff throughout; only the elements are late.

   THE WINDOWS ARE A DESIGN CHOICE, NOT A MEASUREMENT. The PSD is a
   single settled state and says nothing about order or timing. Only
   the two ends are measured: the handoff at frame 1 and the settled
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
   both rise into place from below). Confirmed correct by VJ
   2026-08-23 after a same-day round trip through a reversed version
   ("came down from above") and back — bottom-to-up is the intended
   behavior, do not flip this again without explicit instruction. The
   wordmark is deliberately NOT here: its enter window would tie its
   motion to the frame clock, and it stops advancing at
   HERO_SETTLED_FRAME (50), whereas the wordmark needs to keep
   animating well past that on its own clock. Instead HeroLayer
   triggers it directly at WORDMARK_EMERGE_FRAME, below, and a CSS
   keyframe in lab.css (".s-hero__wordmark--emerge") takes it from
   there — see that rule for why it cannot double-fire. */
/* scroll/actions carry their own exit, matching HERO's own exit
   window (50-70) so they finish leaving exactly as the rest of the
   hero does. Direction is DOWN (positive y) — the reverse of their
   own entrance, which came from below — rather than fading with the
   parent's -6vh upward drift like brand/video do. brand/video get no
   exit entry here on purpose: "like normal" is the parent's own
   fade, nothing extra.

   logo is NOT here at all (moved out 2026-08-23) — it used to fade
   with the rest of the hero like brand/video, but now needs to keep
   existing, shrunk and fixed, well past HERO's own exit. A part
   inside this array is a child of HeroLayer's fading root and so
   cannot outlive that fade no matter what state it is given — see
   HeroLogo.tsx, which reimplements this same enter window
   (LOGO_ENTER_FRAMES/LOGO_ENTER_FROM_Y below) independently as a
   sibling of HeroLayer instead. */
export const HERO_PARTS: PartTimeline[] = [
  { id: "brand", enter: [31, 37], from: { y: -1.2 } },
  { id: "video", enter: [33, 39], from: { y: -1.4 } },
  {
    id: "scroll",
    enter: [38, 45],
    from: { y: 1.6 },
    // to.y has to clear the PARENT's own exit (HERO's section-level
    // exit shifts the whole stage -6vh over this same window) before
    // this element's own offset reads as downward at all — at +2.4 it
    // was still net upward (2.4 - 6 = -3.6), which is why "up and
    // disappear" was what actually showed despite the positive value
    // here. +9 nets +3vh of real downward drift on top of the
    // parent's own -6vh, so this now visibly sinks while the rest of
    // the hero drifts up around it.
    exit: { frames: [50, 70], to: { y: 9 } },
  },
  {
    id: "actions",
    enter: [40, 48],
    from: { y: 2.0 },
    exit: { frames: [50, 70], to: { y: 10 } },
  },
];

/** The logo's own entrance — the same window/offset it had inside
    HERO_PARTS before it moved out to HeroLogo.tsx. Kept here so both
    ends of its lifecycle (entrance and the later fade-out,
    LOGO_EXIT_FRAMES below) live alongside every other frame number in
    this file. */
export const LOGO_ENTER_FRAMES: [number, number] = [30, 36];
export const LOGO_ENTER_FROM_Y = -1.6;

/** The span the reveal actually occupies — the last 20 frames of the
    entry. Frames 1-29 are background only: the camera keeps pushing
    forward with nothing on top, then the composition assembles. */
export const REVEAL_FRAMES: [number, number] = [30, 50];

/** Frame at which HeroLayer fires the wordmark's emerge animation.
    It starts during the final hero reveal and completes before the
    expanded frame-70 settle/handoff, so it cannot pop in after scroll
    begins. The CSS animation is intentionally shorter than the old
    2.6s duration to fit this entry window. */
export const WORDMARK_EMERGE_FRAME = 30;

/** The wordmark's exit — same window as HERO's own exit (50-70), same
    "reverse of the entrance" shape (scale down + blur back up, fading
    out) as hero-wordmark-emerge in lab.css runs it in, just the other
    way. Unlike the emerge, this MUST be frame-driven rather than a
    fixed-duration CSS animation: exit happens during the scroll
    phase, where the user can scroll back and forth freely, and only a
    pure function of frame stays correct under that — see the
    useFrameEffect in HeroLayer.tsx that switches control from the CSS
    animation to this the moment frame first passes 50. */
export const WORDMARK_EXIT_FRAMES: [number, number] = [50, 70];

/** The logo's own fade-out window, matching WORDMARK_EXIT_FRAMES and
    the hero section's own exit (also [50, 70]) — the logo now leaves
    with the rest of the hero instead of shrinking to a sticky dock.
    HeroLogo.tsx and IntroNavGate.tsx (which unhides the app-wide
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
    // Reverses hero-wordmark-emerge's from-scale (0.46) in lab.css.
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

   THE PSD IS A SINGLE STATIC STATE. It says nothing about how the
   carve arrives or how it leaves. Both of the movements below are
   invented, agreed with VJ, and should be revisited if a PSD ever
   turns up that contradicts them:

     ENTRY  (1 -> 40)   full-bleed -> the PSD carve.
                        Decision 2026-08-19. The handoff from the
                        intro is full-bleed video, and the carve
                        FORMS as the hero builds in, rather than
                        being there from the first frame.

     EXIT   (50 -> 70)  the PSD carve -> full-bleed.
                        Decision 2026-08-19, unchanged.

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

    Returns the target OBJECT ITSELF at t = 1 rather than computing
    it, so the settled state is bit-exact rather than
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
