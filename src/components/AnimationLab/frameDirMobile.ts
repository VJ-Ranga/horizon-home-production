/* Phones get a 360x640 portrait re-encode of the /frames set (same 1125
   files, same numbers — a centered 9:16 crop). The scrub canvas on the
   default path renders at dpr 1, i.e. ~375-430 CSS px wide on a phone,
   so this source is sized for the mobile viewport; the full 1942x1080
   frames decode to ~8.4 MB of bitmap EACH and the scrubber holds the
   whole set, which is what puts iOS Safari over its per-tab memory ceiling
   ("A problem repeatedly occurred"). The portrait set decodes to ~0.88
   MB per frame — ~9x less.

   Only the plain `hq:false, fourK:false, densify:1` path is eligible;
   the HQ / 4K / dense preview routes are desktop-only and untouched.
   Read once (it feeds the page height / file mapping, which must not
   change mid-session), and SSR-safe. */

export const FRAME_DIR_MOBILE = "/frames-mobile";
export const MOBILE_INTRO_VIDEO_SRC = "/video-mobile/intro-540x960.mp4";

const FRAME_DIR_DESKTOP = "/frames";
const DESKTOP_INTRO_VIDEO_SRC = "/hero/intro.mp4";
const MOBILE_INTRO_PRELOAD_FRAME_COUNT = 50;
const DESKTOP_INTRO_PRELOAD_FRACTION = 0.25;

export type IntroAssetPlan = {
  frameDir: string;
  preloadFrameCount: number;
  videoSrc: string;
};

/** Mobile loads only the portrait intro assets and the 50-frame hero entry.
    Desktop keeps the existing quarter-timeline preload unchanged. */
export function getIntroAssetPlan(
  phone: boolean,
  totalFrameCount: number,
): IntroAssetPlan {
  if (phone) {
    return {
      frameDir: FRAME_DIR_MOBILE,
      preloadFrameCount: Math.min(
        totalFrameCount,
        MOBILE_INTRO_PRELOAD_FRAME_COUNT,
      ),
      videoSrc: MOBILE_INTRO_VIDEO_SRC,
    };
  }

  return {
    frameDir: FRAME_DIR_DESKTOP,
    preloadFrameCount: Math.max(
      1,
      Math.round(totalFrameCount * DESKTOP_INTRO_PRELOAD_FRACTION),
    ),
    videoSrc: DESKTOP_INTRO_VIDEO_SRC,
  };
}

/** The project's own phone breakpoint (max-width: 700px in lab.css). */
export function isPhoneViewport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(max-width: 700px)").matches;
  } catch {
    return false;
  }
}
