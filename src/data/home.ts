export const FRAME_COUNT = 720;

export const FRAME_ASPECT = 1600 / 892;

export const SCROLL_LENGTH_VH = 600;

export function framePath(index: number): string {
  return `/frames/frame_${String(index + 1).padStart(4, "0")}.webp`;
}
