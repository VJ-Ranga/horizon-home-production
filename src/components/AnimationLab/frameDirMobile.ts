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

/** The project's own phone breakpoint (max-width: 700px in lab.css). */
export function isPhoneViewport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(max-width: 700px)").matches;
  } catch {
    return false;
  }
}
