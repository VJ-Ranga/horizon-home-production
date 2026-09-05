"use client";

/* =========================================================
   ANIMATION LAB — the harness
   =========================================================

   The flow it proves, end to end:

     1. (intro plays — NOT BUILT YET, see note below)
     2. entry autoplay, frames 1 -> 50, scroll LOCKED, hero
        elements revealing as the camera pushes forward
     3. frame 50: loaded and idle, like a normal site
     4. scroll unlocks: 50 -> 70 hero exits, 109 -> 118 section 2
        arrives

   NOTE ON STEP 1: the intro itself is not built — PROJECT-LOG has it
   last, because it plays once on load and is a different mechanism
   from everything here. The lab therefore opens at the moment the
   intro would hand over: set-C frame 1, the measured handoff.

   Shape of it:

     LabScrubber        fixed, z1   the carved <canvas>
     .lab-viewport      fixed, z2   section layers, stacked inset:0
     .lab-spacer        in flow     scroll distance for phase 2 only

   Layers stack rather than flow because they share one screen: the
   hero is leaving while section 2 is arriving, over the same video.
   Adding sections 3-15 is adding entries to SECTIONS in timeline.ts
   and one <Layer/> here.

   This is a lab. It does not touch Home/HomePage.tsx.
   ========================================================= */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Lenis from "lenis";
import HeroLogo from "./HeroLogo";
import IntroNavGate from "./IntroNavGate";
import ScrollProgress from "./ScrollProgress";
import AiAssistantFab from "./AiAssistantFab";
import HeroLayer from "./HeroLayer";
import MainStartLayer from "./MainStartLayer";
import ApproachLayer from "./ApproachLayer";
import DigitalLayer from "./DigitalLayer";
import IntroStatementLayer from "./IntroStatementLayer";
import GlanceLayer from "./GlanceLayer";
import FinancialLayer from "./FinancialLayer";
import CityBannerLayer from "./CityBannerLayer";
import GovernanceIntroLayer from "./GovernanceIntroLayer";
import GovernanceLayer from "./GovernanceLayer";
import GovernanceCardsLayer from "./GovernanceCardsLayer";
import LeadershipLayer from "./LeadershipLayer";
import OceanBannerLayer from "./OceanBannerLayer";
import FinancialCapitalLayer from "./FinancialCapitalLayer";
import RiverBannerLayer from "./RiverBannerLayer";
import NonFinancialLayer from "./NonFinancialLayer";
import StrategyLayer from "./StrategyLayer";
import CommunityLayer from "./CommunityLayer";
import EndScreenLayer from "./EndScreenLayer";
import LoopTransitionOverlay from "./LoopTransitionOverlay";
import { beginFrameJump, endFrameJump } from "./mobileFrameGuard";
import LabScrubber from "./LabScrubber";
import LabIntro from "./LabIntro";
import {
  FrameContext,
  useFrameDriver,
  useFrameEffect,
  type Phase,
} from "./useFrameTimeline";
import {
  ENTRY_DURATION_MS,
  ENTRY_FRAMES,
  HANDOFF_FRAME,
  HERO_PARTS,
  HERO_SETTLED_FRAME,
  LAB_FIRST_FRAME,
  LAB_LAST_FRAME,
  LOOP_TRANSITION_DURATION_MS,
  LOOP_COVER_START_FRAME,
  LOOP_REVEAL_START_FRAME,
  loopTargetForBoundary,
  REVEAL_FRAMES,
  frameSrc,
  frameForScrollPx,
  scrollPxForFrame,
  totalScrollPx,
  FRAME_DIR_DEV,
  FRAME_DIR_HQ,
  FRAME_DIR_4K,
  FRAME_DIR_2X,
  FRAME_DIR_2X_HQ,
  FRAME_DIR_4X,
  readPxPerFrame,
  SECTIONS,
  partStateAt,
  sectionStateAt,
  virtualHoldAtScrollPx,
  type SectionTimeline,
} from "./timeline";
import "./lab.css";
import {
  FRAME_DIR_MOBILE,
  FRAME_DIR_TABLET,
  isCompactViewport,
  isPhoneViewport,
} from "./frameDirMobile";

/** Which frame folder a given density/quality combination reads.
    densify 1 is the plain 840 sets and is byte-for-byte the original
    behaviour; every other value is a 1080p-only dense set except 2x,
    which also has an HQ variant. Phones read a 720px re-encode of the
    plain set so the entry-frame preload below (frames 1-50) doesn't
    spike memory before the page is even scrollable — see
    frameDirMobile.ts. */
function resolveFrameDir(
  densify: number,
  hq: boolean,
  fourK: boolean,
  phone: boolean,
  compact: boolean,
): string {
  if (phone) return FRAME_DIR_MOBILE;
  if (compact) return FRAME_DIR_TABLET;
  if (densify === 4) return FRAME_DIR_4X;
  if (densify === 2) return hq ? FRAME_DIR_2X_HQ : FRAME_DIR_2X;
  if (fourK) return FRAME_DIR_4K;
  if (hq) return FRAME_DIR_HQ;
  return FRAME_DIR_DEV;
}

/** HeroLogo.tsx no longer docks to a sticky spot — it fades out with
    the rest of the hero over LOGO_EXIT_FRAMES, same as every other
    hero element, so it's back on by default. */
const SHOW_HERO_LOGO = true;

/* sessionStorage key marking that this browsing session has already seen
   the intro, so returning to `/` from a feature page does not replay it. */
const INTRO_SEEN_KEY = "horizon:intro-seen";

/* The flag never changes within a render pass, so there is nothing to
   subscribe to — useSyncExternalStore is used for its SSR contract, not for
   change notification. */
const subscribeToNothing = () => () => {};
const subscribeToPhoneViewport = (onChange: () => void) => {
  const query = window.matchMedia("(max-width: 700px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const subscribeToCompactViewport = (onChange: () => void) => {
  const query = window.matchMedia("(max-width: 1100px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getPhoneViewportSnapshot = () => isPhoneViewport();
const getServerPhoneViewportSnapshot = () => false;
const getCompactViewportSnapshot = () => isCompactViewport();
const getServerCompactViewportSnapshot = () => false;
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;
const DEFAULT_LOAD_BUFFER = { behind: 2, ahead: 2 };
const DIGITAL_ENTER_FRAME = 141;
const DIGITAL_SETTLED_FRAME = 161;
const DIGITAL_LOAD_BUFFER = { behind: 4, ahead: 4 };

/* Storage throws in private mode / with site data blocked. Failing to read
   must not cost the visitor the intro, so treat it as unseen. Returns a
   boolean, so repeated calls stay Object.is-stable for React. */
function readIntroSeen(): boolean {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

/* The server has no session, so it always renders the intro; React swaps in
   the real value right after hydration. globals.css has already hidden the
   overlay by then, via the blocking script in layout.tsx. */
const readIntroSeenOnServer = () => false;

type LoopTransition = {
  fromFrame: number;
  toFrame: number;
  stage: "cover" | "shade";
};

/** The frames a section actually needs on screen — its enter, hold
    and exit together. Falls back to just the settled frame for a
    section with neither (04-key-data-points). */
function sectionFrameRange(section: SectionTimeline): [number, number] {
  const start = section.enter?.frames[0] ?? section.settledFrame;
  const end = section.exit?.frames[1] ?? section.settledFrame;
  return [start, end];
}

/** Scroll offset in px at which a given frame is showing. Phase 2
    only — frames below SCROLL_FIRST_FRAME are not reachable by
    scrolling, they belong to the entry. Uses the measured document
    scrollable height rather than assuming it matches totalScrollPx
    exactly, the same way the original straight-line version did. */
function scrollYForFrame(frame: number, pxPerFrame: number): number {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const t = scrollPxForFrame(frame, pxPerFrame) / totalScrollPx(pxPerFrame);
  return Math.min(Math.max(t, 0), 1) * scrollable;
}

/* ---------------------------------------------------------
   Lab chrome. Not part of the design — a readout so the flow can
   be checked at a stated frame rather than by eye. Hidden from
   assistive tech and from print.
   --------------------------------------------------------- */
function FrameReadout() {
  const frameRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const holdRef = useRef<HTMLSpanElement>(null);
  const rowRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const pxPerFrameRef = useRef(14);

  useEffect(() => {
    pxPerFrameRef.current = readPxPerFrame();
  }, []);

  useFrameEffect((frame, phase, scrollPx) => {
    if (frameRef.current) frameRef.current.textContent = frame.toFixed(1);
    if (phaseRef.current) {
      phaseRef.current.textContent =
        phase === "entry" ? "entry · autoplay · scroll locked" : "scroll";
    }

    // Refresh the hold readout on the SAME rAF tick as the frame
    // counter. It used to update on native `scroll` events only, which
    // Lenis suppresses — so it would freeze showing a stale hold long
    // after the scroll head had left it.
    if (holdRef.current) {
      const hold = virtualHoldAtScrollPx(scrollPx, pxPerFrameRef.current);
      holdRef.current.textContent = hold
        ? `hold: frame ${hold.frame} · ${hold.remainingFrames}/${hold.totalFrames} virtual frames remaining`
        : "hold: —";
    }

    for (const section of SECTIONS) {
      const element = rowRefs.current[section.id];
      if (!element) continue;
      element.textContent = `${Math.round(
        sectionStateAt(section, frame).opacity * 100
      )}%`;
    }

    for (const part of HERO_PARTS) {
      const element = rowRefs.current[`part:${part.id}`];
      if (!element) continue;
      element.textContent = `${Math.round(
        partStateAt(part, frame).opacity * 100
      )}%`;
    }
  });

  const setRow = (key: string) => (element: HTMLSpanElement | null) => {
    rowRefs.current[key] = element;
  };

  return (
    <aside className="lab-hud" aria-hidden="true">
      <p className="lab-hud__frame">
        frame <span ref={frameRef}>{ENTRY_FRAMES[0].toFixed(1)}</span>
      </p>
      <p className="lab-hud__phase">
        <span ref={phaseRef}>entry · autoplay · scroll locked</span>
      </p>
      <p className="lab-hud__note">
        <span ref={holdRef}>hold: —</span>
      </p>

      {SECTIONS.map((section) => (
        <p className="lab-hud__row" key={section.id}>
          <span className="lab-hud__id">{section.id}</span>
          <span className="lab-hud__val" ref={setRow(section.id)} />
        </p>
      ))}

      <p className="lab-hud__rule">
        entry {ENTRY_FRAMES[0]}&ndash;{ENTRY_FRAMES[1]} &middot; reveal{" "}
        {REVEAL_FRAMES[0]}&ndash;{REVEAL_FRAMES[1]}
        <span className="lab-hud__val">
          {(ENTRY_DURATION_MS / 1000).toFixed(2)}s
        </span>
      </p>
      {HERO_PARTS.map((part) => (
        <p className="lab-hud__row lab-hud__row--sub" key={part.id}>
          <span className="lab-hud__id">
            {part.id}{" "}
            <em>
              {part.enter[0]}&ndash;{part.enter[1]}
            </em>
          </span>
          <span className="lab-hud__val" ref={setRow(`part:${part.id}`)} />
        </p>
      ))}

      <p className="lab-hud__note">
        handoff frame {HANDOFF_FRAME} &middot; settled{" "}
        {SECTIONS.map((s) => s.settledFrame).join(" / ")}
      </p>
    </aside>
  );
}

export default function AnimationLab({
  hq = false,
  fourK = false,
  densify = 1,
  debug = false,
  intro = false,
  loaderOnly = false,
  minimalLoader = false,
}: {
  hq?: boolean;
  /** New-video 4K set, /animation-lab-4k only. Optional and false by
      default, so /animation-lab and ?quality=hq are unaffected. */
  fourK?: boolean;
  /** Frame-density multiplier: 1 (default), 2 or 4. Same timing
      numbers, k times the files drawn — see FRAME_DIR_2X/4X. */
  densify?: number;
  debug?: boolean;
  /** /animation-lab-full, -intro, -loading only: show the load screen
      + intro shot (LabIntro.tsx) before the hero entry. False on every
      other route, and this file behaves exactly as before when it is —
      the only effect is one extra gate on the entry autoplay and one
      extra overlay node. */
  intro?: boolean;
  /** -loading route: hold on the finished load screen, never play the
      intro or release the lab. For tuning the screen in isolation. */
  loaderOnly?: boolean;
  /** -intro route: a small spinner instead of the full 0-100 screen
      while the intro frames decode. */
  minimalLoader?: boolean;
}) {
  /* HQ client-preview mode. Off by default, so a normal load of
     /animation-lab behaves exactly as it did before this existed.
     It changes two things and nothing else: which frame folder is
     read, and the canvas dpr cap. No timing, no layout, no copy. */
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    getMountedSnapshot,
    getServerMountedSnapshot,
  );
  const phoneSnapshot = useSyncExternalStore(
    subscribeToPhoneViewport,
    getPhoneViewportSnapshot,
    getServerPhoneViewportSnapshot,
  );
  const compactSnapshot = useSyncExternalStore(
    subscribeToCompactViewport,
    getCompactViewportSnapshot,
    getServerCompactViewportSnapshot,
  );
  const compact = mounted && compactSnapshot;
  const phone = mounted && phoneSnapshot;
  const frameDir = resolveFrameDir(densify, hq, fourK, phone, compact);
  /* Reduced motion: no intro, no entry motion — the page opens
     already settled at frame 50 with scroll live. Read once, in a
     lazy initialiser, because the driver needs it on its very first
     tick. It affects no rendered output, so it cannot cause a
     hydration mismatch. */
  const [skipEntry] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  /* Preload AND DECODE the entry's frames before the autoplay starts.
     The entry runs on a clock: it cannot slow down for a frame that
     is not ready, so without this it plays against a cold cache and
     shows stale images.

     onload is not enough. It fires once the bytes are in and the
     header is parsed — the pixels may still be undecoded, and the
     decode then happens inside the first drawImage, on the main
     thread, mid-animation. That is exactly the first-run stutter.
     img.decode() resolves only once the bitmap is ready. */
  const [entryReady, setEntryReady] = useState(skipEntry);
  const [mobileLoadProgress, setMobileLoadProgress] = useState(0);

  /* Load screen + intro (LabIntro). Only on the -full / -intro /
     -loading routes, and never under reduced motion. While it is up
     the lab holds on the handoff frame — introDone is fed into the
     same entry gate as entryReady, so this reuses the existing hold
     rather than adding a new phase. */
  const runIntro = intro && !skipEntry;

  /* The intro is a once-per-visit welcome, not a gate on every page view:
     leaving for /ai-assistant or any other feature page and coming back to
     `/` is a full page load, so without this it replays every single time.
     sessionStorage scopes it to the browsing session — a genuinely new
     visit still gets the intro, moving around the site does not.

     This CANNOT be read while rendering. The server has no sessionStorage,
     so a render-time read makes the server emit the overlay and the client
     skip it, which is a hydration mismatch (it threw exactly that before
     being moved here). Instead the overlay is rendered on both sides and
     dropped on mount, and the blocking script in layout.tsx has already
     put `intro-seen` on <html> so globals.css hides it before the first
     paint — no flash of a load screen that is about to disappear. */
  const introSeen = useSyncExternalStore(
    subscribeToNothing,
    readIntroSeen,
    readIntroSeenOnServer,
  );

  const [introDone, setIntroDone] = useState(!runIntro);
  const showIntro = runIntro && !introSeen;
  /* A suppressed intro never mounts, so onDone never fires — the entry gate
     below has to be released here instead, or the lab would hold on the
     handoff frame forever on every return visit. */
  const introComplete = introDone || introSeen;

  useEffect(() => {
    if (skipEntry || !mounted) return;
    let disposed = false;
    let loaded = 0;

    const ready = async () => {
      const frames: number[] = [];
      for (let f = ENTRY_FRAMES[0]; f <= ENTRY_FRAMES[1]; f += 1) frames.push(f);

      await Promise.all(
        frames.map(async (frame) => {
          const image = new Image();
          image.decoding = "async";
          image.src = frameSrc(frame, frameDir);
          try {
            await image.decode();
          } catch {
            // A frame that fails to decode must not stall the page.
            // The scrubber falls back to the nearest frame it has.
          } finally {
            loaded += 1;
            if (compact) {
              setMobileLoadProgress(Math.round((loaded / frames.length) * 100));
            }
          }
        })
      );

      if (!disposed) setEntryReady(true);
    };

    void ready();
    return () => {
      disposed = true;
    };
  }, [skipEntry, frameDir, mounted, phone, compact]);

  /* Scroll pace. PX_PER_FRAME_DEFAULT unless ?px=<n> overrides it,
     so the old 34px inspection pace is one URL away. Read once — it
     sets the page height, which must not change mid-session. */
  const [pxPerFrame] = useState(readPxPerFrame);
  const scrollPx = totalScrollPx(pxPerFrame);

  const driver = useFrameDriver(skipEntry, entryReady && introComplete);
  const [phase, setPhase] = useState<Phase>(skipEntry ? "scroll" : "entry");
  const phaseRef = useRef<Phase>(phase);
  const lenisRef = useRef<Lenis | null>(null);
  const [loopTransition, setLoopTransition] = useState<LoopTransition | null>(null);
  const loopTransitionRef = useRef(false);

  /* Watch for the one entry -> scroll handover. Guarded by a ref so
     the rAF callback does not call setState on every frame. */
  useEffect(
    () =>
      driver.subscribe((_frame, next) => {
        if (phaseRef.current === next) return;
        phaseRef.current = next;
        setPhase(next);
      }),
    [driver]
  );

  /* ---- scroll lock, for the whole entry phase ----
     The hero loads by itself. Nobody scrolls to reveal it, and a
     stray wheel event must not jump the page into the exit. */
  useEffect(() => {
    if (phase !== "entry") return;

    // Browsers restore the previous scroll position on reload, which
    // would drop the page mid-timeline before the entry has run.
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    document.documentElement.classList.add("lab-locked");

    return () => {
      document.documentElement.classList.remove("lab-locked");
      history.scrollRestoration = previousRestoration;
    };
  }, [phase]);

  /* ---- smooth scroll, phase 2 only ----
     Lenis is created only once scroll is live, so there is nothing
     to stop, resume or fight with during the entry. Same options as
     Home/HomePage.tsx. */
  useEffect(() => {
    if (phase !== "scroll") return;
    if (skipEntry) return; // reduced motion: leave native scrolling alone

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      // Keep page-level touch scrolling native. Lenis touch inertia can
      // continue through the loop's reset and expose its return to the hero.
    });
    lenisRef.current = lenis;
    let rafId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [phase, skipEntry]);

  /* Compact touch navigation advances one section per page swipe. Native
     touch scrolling can otherwise carry a fast flick across several section
     windows before the frame limiter catches up. Inner readers keep their
     own edge handoff and are excluded here. */
  useEffect(() => {
    if (phase !== "scroll" || skipEntry || !compact) return;

    let startY: number | null = null;
    let startScrollY = 0;
    let startedInsideReader = false;

    const onTouchStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? null;
      startScrollY = window.scrollY;
      startedInsideReader = Boolean(
        (event.target as HTMLElement | null)?.closest("[data-lenis-prevent]")
      );
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (startedInsideReader || startY === null) return;
      const endY = event.changedTouches[0]?.clientY ?? startY;
      const delta = startY - endY;
      startY = null;
      if (Math.abs(delta) < 24) return;

      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const currentProgress = Math.min(Math.max(startScrollY / scrollable, 0), 1);
      const currentFrame = frameForScrollPx(
        currentProgress * totalScrollPx(pxPerFrame),
        pxPerFrame,
      );
      const sectionFrames = SECTIONS.map((section) => section.settledFrame);
      const targetFrame = delta > 0
        ? sectionFrames.find((frame) => frame > currentFrame + 1)
        : [...sectionFrames].reverse().find((frame) => frame < currentFrame - 1);
      if (targetFrame === undefined) return;

      const targetY = scrollYForFrame(targetFrame, pxPerFrame);
      lenisRef.current?.scrollTo(targetY, { duration: 0.55 });
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [compact, phase, pxPerFrame, skipEntry]);

  /* Reset compact readers at the edge matching travel direction whenever a
     new section becomes active. Reverse entry therefore starts at the
     reader's bottom instead of restoring a stale middle position. */
  const compactSectionRef = useRef<string | null>(null);
  const compactFrameRef = useRef(HANDOFF_FRAME);
  useEffect(() => {
    if (phase !== "scroll" || !compact) return;

    return driver.subscribe((frame, ph) => {
      if (ph !== "scroll") return;
      const previousFrame = compactFrameRef.current;
      compactFrameRef.current = frame;
      const active = SECTIONS.find((section) => {
        const [start, end] = sectionFrameRange(section);
        return frame >= start && frame <= end;
      });
      if (!active || active.id === compactSectionRef.current) return;

      const direction = frame >= previousFrame ? 1 : -1;
      compactSectionRef.current = active.id;
      document
        .querySelectorAll<HTMLElement>(
          ".lab-layer[data-lenis-prevent], .lab-layer [data-lenis-prevent]",
        )
        .forEach((reader) => {
          reader.scrollTop = direction > 0
            ? 0
            : Math.max(reader.scrollHeight - reader.clientHeight, 0);
        });
    });
  }, [compact, driver, phase]);

  /* ---- infinite loop, phase 2 only ----
     "loop test/assets/main.js"'s boundary reset, ported here: scroll
     past either end and it wraps to the other, so the section pass
     (hero -> ... -> community) repeats instead of dead-ending at the
     last frame. No sequence math needed here the way the loop test
     page needed it — frame is already a straight function of
     scrollY / scrollable via frameForScrollPx, so resetting scrollY
     to 0 or to `scrollable` alone is enough to land back on
     SCROLL_FIRST_FRAME / SCROLL_LAST_FRAME.

     Direction-tracked like the loop test page: only wraps when the
     boundary is reached while still moving toward it, so a scroll
     that merely rubber-bands at the edge does not loop early.
     Skipped under reduced motion, matching loop test's own guard —
     a forced jump is exactly the kind of motion that setting exists
     to suppress. */
  useEffect(() => {
    if (phase !== "scroll") return;
    if (skipEntry) return;
    if (loopTransitionRef.current) return;

    let lastScrollY = window.scrollY;
    let recentering = false;

    const startLoopTransition = () => {
      if (loopTransitionRef.current) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const targetFrame = loopTargetForBoundary(1, reducedMotion);
      if (targetFrame === null) return;

      loopTransitionRef.current = true;
      setLoopTransition({ fromFrame: LAB_LAST_FRAME, toFrame: targetFrame, stage: "cover" });
      lastScrollY = window.scrollY;
    };

    const onWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const coverY = scrollYForFrame(LOOP_COVER_START_FRAME, pxPerFrame);
      if (scrollable > 0 && window.scrollY >= coverY) startLoopTransition();
    };

    // Phones do not dispatch wheel events. Trigger the identical cover
    // transition from an upward finger movement once it reaches the same
    // cover frame, so the reset remains behind the mask instead of becoming
    // visible at the very bottom of the page.
    let lastTouchY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      lastTouchY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const touchY = event.touches[0]?.clientY ?? null;
      if (touchY === null || lastTouchY === null) return;
      const movingDownPage = lastTouchY - touchY > 1;
      lastTouchY = touchY;
      if (!movingDownPage) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const coverY = scrollYForFrame(LOOP_COVER_START_FRAME, pxPerFrame);
      if (scrollable > 0 && window.scrollY >= coverY) startLoopTransition();
    };
    const onTouchEnd = () => {
      lastTouchY = null;
    };

    const onScroll = () => {
      if (recentering) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (loopTransitionRef.current) return;

      const currentScrollY = window.scrollY;
      const direction = currentScrollY >= lastScrollY ? 1 : -1;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const coverY = scrollYForFrame(LOOP_COVER_START_FRAME, pxPerFrame);

      const targetFrame = loopTargetForBoundary(
        direction as -1 | 1,
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
      const nextY = scrollable > 0 && targetFrame !== null && currentScrollY >= scrollable
        ? 0
        : null;

      if (direction > 0 && scrollable > 0 && currentScrollY >= coverY) {
        startLoopTransition();
        return;
      }

      if (nextY !== null) {
        recentering = true;
        startLoopTransition();
        recentering = false;
        return;
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      endFrameJump();
    };
  }, [phase, skipEntry]);

  useEffect(() => {
    if (!loopTransition) return;

    const timer = window.setTimeout(() => {
      if (loopTransition.stage === "cover") {
        lenisRef.current?.stop();
        // The frame driver slew-limits mobile frame steps to 2 a tick so a
        // flick cannot skip a short section. This reset is a ~1090-frame
        // move, so under that limit the phone replays the entire page
        // backwards instead of cutting to the hero. Suspend it until the
        // loop finishes; the scroll below is programmatic, not a gesture.
        beginFrameJump();
        const revealY = scrollYForFrame(LOOP_REVEAL_START_FRAME, pxPerFrame);
        window.scrollTo(0, revealY);
        document.documentElement.scrollTop = revealY;
        document.body.scrollTop = revealY;
        lenisRef.current?.scrollTo(revealY, { immediate: true, force: true });
        setLoopTransition({ ...loopTransition, stage: "shade" });
        return;
      }

      endFrameJump();
      loopTransitionRef.current = false;
      setLoopTransition(null);
      lenisRef.current?.start();
    }, LOOP_TRANSITION_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [loopTransition, pxPerFrame]);

  useEffect(() => {
    if (loopTransition?.stage !== "shade") return;

    const startY = scrollYForFrame(LOOP_REVEAL_START_FRAME, pxPerFrame);
    const endY = scrollYForFrame(HERO_SETTLED_FRAME, pxPerFrame);
    const startedAt = performance.now();
    let frameId = 0;

    const animateReveal = (now: number) => {
      const progress = Math.min(
        1,
        (now - startedAt) / LOOP_TRANSITION_DURATION_MS
      );
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentY = startY + (endY - startY) * eased;
      window.scrollTo(0, currentY);
      lenisRef.current?.scrollTo(currentY, { immediate: true, force: true });
      if (progress < 1) frameId = requestAnimationFrame(animateReveal);
    };

    frameId = requestAnimationFrame(animateReveal);
    return () => cancelAnimationFrame(frameId);
  }, [loopTransition, pxPerFrame]);

  /* ---- loading gate, phase 2 only ----
     Frames load roughly in order (1 -> LAB_LAST_FRAME) in the
     background, so a normal scroll speed stays ahead of the loader.
     A fast scroll or a data-scroll-to jump can outrun it.

     Gating on a whole section's enter/hold/exit turned out to be too
     coarse — it can hold scroll for a long stretch at a section's
     edge. Instead this holds on a small rolling window around
     wherever the user actually is (current frame ± loadBuffer, 2
     each way by default — 5 frames total), so a fast scroll gets
     short catch-up pauses rather than one long one. Sections whose
     panel has more to read per frame of scroll (the tall
     overflow:auto panels in Approach/Digital) declare a wider
     loadBuffer in timeline.ts. */
  const loadedFramesRef = useRef<Set<number>>(new Set());
  const gatedRangeRef = useRef<[number, number] | null>(null);
  const [gated, setGated] = useState(false);

  const isRangeLoaded = (start: number, end: number) => {
    const from = Math.max(start, LAB_FIRST_FRAME);
    const to = Math.min(end, LAB_LAST_FRAME);
    for (let frame = from; frame <= to; frame += 1) {
      if (!loadedFramesRef.current.has(frame)) return false;
    }
    return true;
  };

  /** Which section's loadBuffer applies at this frame — the section
      whose own enter/hold/exit window contains it, else the default. */
  const loadBufferAt = (frame: number) => {
    const section = SECTIONS.find((candidate) => {
      const [start, end] = sectionFrameRange(candidate);
      return frame >= start && frame <= end;
    });
    return section?.loadBuffer ?? DEFAULT_LOAD_BUFFER;
  };

  const handleFrameLoaded = useCallback((frame: number) => {
    loadedFramesRef.current.add(frame);
    const range = gatedRangeRef.current;
    if (range && isRangeLoaded(range[0], range[1])) {
      gatedRangeRef.current = null;
      setGated(false);
    }
  }, []);

  useEffect(
    () =>
      // driver.subscribe, not useFrameEffect: this component is what
      // creates <FrameContext.Provider> below, and a component cannot
      // consume its own provider's value via useContext — only its
      // descendants can. Subscribing to the driver directly sidesteps
      // that; every other consumer here is a child, so they use the
      // hook as normal.
      driver.subscribe((frame, ph) => {
        if (ph !== "scroll") return;

        // Recomputed every tick, not just once on the rising edge:
        // lenis.stop() below only takes effect on the *next* render
        // pass, so scroll can keep drifting a little after the gate
        // engages. Re-checking each tick keeps the required window
        // tracking wherever the frame actually settles, instead of
        // staying pinned to whatever was sampled the instant gating
        // started.
        const rounded = Math.round(frame);
        const wasGated = gatedRangeRef.current !== null;

        // Digital must arrive freely. Do not let its wider buffer create a
        // loading pause during 141-160; the first loading hold is the
        // settled frame itself.
        if (
          rounded >= DIGITAL_ENTER_FRAME &&
          rounded < DIGITAL_SETTLED_FRAME
        ) {
          gatedRangeRef.current = null;
          if (wasGated) setGated(false);
          return;
        }

        const isDigitalSettled = rounded === DIGITAL_SETTLED_FRAME;
        const buffer = isDigitalSettled
          ? DIGITAL_LOAD_BUFFER
          : loadBufferAt(rounded);
        const range: [number, number] = [
          rounded - buffer.behind,
          rounded + buffer.ahead,
        ];
        const stillNeeded = !isRangeLoaded(range[0], range[1]);

        gatedRangeRef.current = stillNeeded ? range : null;
        if (stillNeeded && !wasGated) setGated(true);
        else if (!stillNeeded && wasGated) setGated(false);
      }),
    [driver]
  );

  useEffect(() => {
    if (!gated) return;

    lenisRef.current?.stop();
    document.documentElement.classList.add("lab-gated");

    return () => {
      lenisRef.current?.start();
      document.documentElement.classList.remove("lab-gated");
    };
  }, [gated]);

  /* The hero's "Explore the Journey" has no anchor to jump to here —
     section 2 is a scroll position, not a document node. Any element
     with data-scroll-to="<frame>" scrolls to that frame. Inert
     during the entry, when there is nowhere to scroll. */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.(
        "[data-scroll-to]"
      );
      if (!target) return;

      event.preventDefault();
      if (phaseRef.current !== "scroll") return;

      const frame = Number(target.getAttribute("data-scroll-to"));
      if (!Number.isFinite(frame)) return;

      const y = scrollYForFrame(frame, pxPerFrame);
      if (lenisRef.current) lenisRef.current.scrollTo(y, { duration: 1.4 });
      else window.scrollTo({ top: y, behavior: "smooth" });
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pxPerFrame]);

  return (
    <FrameContext.Provider value={driver}>
      <main
        className="lab"
        data-phase={phase}
        data-ready={entryReady}
        data-gated={gated}
        data-loop-transition={loopTransition ? "active" : "idle"}
      >
        {SHOW_HERO_LOGO && <HeroLogo />}
        <IntroNavGate />
        <ScrollProgress />
        <AiAssistantFab />

        {/* Poster = whatever frame the page opens on, so the first
            paint is already the right image: the handoff frame for a
            normal load, the settled frame under reduced motion. */}
        <LabScrubber
          posterFrame={skipEntry ? HERO_SETTLED_FRAME : HANDOFF_FRAME}
          hq={hq}
          fourK={fourK}
          densify={densify}
          onFrameLoaded={handleFrameLoaded}
        />

        <div className="lab-viewport">
          <HeroLayer />
          <MainStartLayer />
          <ApproachLayer />
          <DigitalLayer />
          <IntroStatementLayer />
          <GlanceLayer />
          <CityBannerLayer />
          <FinancialLayer />
          <GovernanceIntroLayer />
          <GovernanceLayer />
          <GovernanceCardsLayer />
          <LeadershipLayer />
          <OceanBannerLayer />
          <FinancialCapitalLayer />
          <RiverBannerLayer />
          <NonFinancialLayer />
          <StrategyLayer />
          <CommunityLayer />
          <EndScreenLayer />
        </div>

        <LoopTransitionOverlay stage={loopTransition?.stage ?? null} />

        {/* Shown only while the loading gate above is holding scroll
            for an under-loaded section. */}
        <div className="lab-loading" aria-hidden="true">
          <span className="lab-loading__ring" />
        </div>

        {compact && !skipEntry && !entryReady && (
          <div
            className="lab-mobile-loading"
            data-mobile-loading
            role="status"
            aria-live="polite"
          >
            <span className="lab-mobile-loading__ring" aria-hidden="true" />
            <p>Preparing mobile experience</p>
            <span>{mobileLoadProgress}%</span>
          </div>
        )}

        {/* Load screen + intro shot. Only mounted on the -full /
            -intro / -loading routes; onDone releases the entry gate. */}
        {showIntro && (
          <LabIntro
            loaderOnly={loaderOnly}
            minimal={minimalLoader}
            onDone={() => {
              setIntroDone(true);
              try {
                window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
              } catch {
                /* Nothing to do: the intro just replays next time. */
              }
            }}
          />
        )}

        {debug && <FrameReadout />}

        {/* The scroll distance phase 2 needs. Everything above is
            fixed, so this spacer alone sets the page height. It is
            present during the entry too — the lock is what stops the
            page moving, so no layout shift happens at handover. */}
        <div
          className="lab-spacer"
          style={{ height: `calc(100svh + ${scrollPx}px)` }}
        />
      </main>
    </FrameContext.Provider>
  );
}
