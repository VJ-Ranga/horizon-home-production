export type PopupVideoAudioState = "open" | "close";

export function notifyPopupVideo(state: PopupVideoAudioState): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("horizon:popup-video", { detail: { state } }),
  );
}
