export const MOBILE_MAX_FRAME_STEP = 2;

export function limitMobileFrame(
  currentFrame: number,
  targetFrame: number,
  maxStep = MOBILE_MAX_FRAME_STEP
): number {
  const delta = targetFrame - currentFrame;

  if (Math.abs(delta) <= maxStep) return targetFrame;

  return currentFrame + Math.sign(delta) * maxStep;
}
