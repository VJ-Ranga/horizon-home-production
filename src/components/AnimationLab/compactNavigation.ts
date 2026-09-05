export const COMPACT_TRANSITION_FPS = 15;
export const COMPACT_CONTROLLED_END_FRAME = 255;
const DEFAULT_COMPACT_TRANSITION_MS = 550;
const SETTLED_FRAME_EPSILON = 0.25;

export function compactCarouselTargetScrollPx(
  currentFrame: number,
  currentScrollPx: number,
  direction: 1 | -1,
  carouselFrame: number,
  carouselStartPx: number,
  carouselBudgetPx: number,
): number | null {
  if (Math.abs(currentFrame - carouselFrame) > SETTLED_FRAME_EPSILON) return null;

  const carouselEndPx = carouselStartPx + carouselBudgetPx;
  if (direction > 0 && currentScrollPx < carouselEndPx - 1) return carouselEndPx;
  if (direction < 0 && currentScrollPx > carouselStartPx + 1) return carouselStartPx;
  return null;
}

export function readerConsumesScroll(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  direction: 1 | -1,
): boolean {
  const maxScrollTop = Math.max(scrollHeight - clientHeight, 0);
  return direction > 0 ? scrollTop < maxScrollTop - 1 : scrollTop > 1;
}

export function nextCompactSectionFrame(
  currentFrame: number,
  settledFrames: number[],
  direction: 1 | -1,
): number | null {
  const candidates = direction > 0
    ? settledFrames.filter((frame) => frame > currentFrame + SETTLED_FRAME_EPSILON)
    : settledFrames.filter((frame) => frame < currentFrame - SETTLED_FRAME_EPSILON).reverse();
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
