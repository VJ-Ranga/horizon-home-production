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
