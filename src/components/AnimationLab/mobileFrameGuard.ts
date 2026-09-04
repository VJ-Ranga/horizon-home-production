export const MOBILE_MAX_FRAME_STEP = 2;

/* A deliberate timeline jump — the end-of-page loop reset — must not be
   slew-limited. The limiter exists to stop a touch flick from skipping
   short section windows, but the loop moves ~1090 frames at once: capped
   at 2 frames a tick that becomes ~9 seconds of the whole page replaying
   backwards, which is exactly what it looks like on a phone. Desktop
   never sees it because the limiter is mobile-only.

   Module-level rather than React state: the frame driver reads it inside
   a rAF loop that must see the change on the very next tick, before any
   re-render could deliver it. */
let jumping = false;

/** Suspend the mobile step limit while the timeline is being moved
    programmatically. Always pair with endFrameJump(). */
export function beginFrameJump(): void {
  jumping = true;
}

export function endFrameJump(): void {
  jumping = false;
}

export function isFrameJumping(): boolean {
  return jumping;
}

export function limitMobileFrame(
  currentFrame: number,
  targetFrame: number,
  maxStep = MOBILE_MAX_FRAME_STEP
): number {
  // A programmatic jump lands on its target in one tick.
  if (jumping) return targetFrame;

  const delta = targetFrame - currentFrame;

  if (Math.abs(delta) <= maxStep) return targetFrame;

  return currentFrame + Math.sign(delta) * maxStep;
}
