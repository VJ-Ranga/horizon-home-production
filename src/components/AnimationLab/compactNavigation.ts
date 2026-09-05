export const COMPACT_TRANSITION_FPS = 15;
export const COMPACT_CONTROLLED_END_FRAME = 255;
const DEFAULT_COMPACT_TRANSITION_MS = 550;

export function nextCompactSectionFrame(
  currentFrame: number,
  settledFrames: number[],
  direction: 1 | -1,
): number | null {
  const candidates = direction > 0
    ? settledFrames.filter((frame) => frame > currentFrame)
    : settledFrames.filter((frame) => frame < currentFrame).reverse();
  return candidates[0] ?? null;
}

export function compactTransitionDurationMs(
  currentFrame: number,
  targetFrame: number,
  frameRate = COMPACT_TRANSITION_FPS,
  controlledEndFrame = COMPACT_CONTROLLED_END_FRAME,
): number {
  if (Math.min(currentFrame, targetFrame) > controlledEndFrame) {
    return DEFAULT_COMPACT_TRANSITION_MS;
  }
  return Math.round((Math.abs(targetFrame - currentFrame) / frameRate) * 1000);
}
