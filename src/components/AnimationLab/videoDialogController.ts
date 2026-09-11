import { notifyPopupVideo } from "./popupVideoAudio";

type DialogElement = Pick<HTMLDialogElement, "close" | "open" | "showModal">;
type VideoFrameElement = Pick<HTMLIFrameElement, "src">;

export function createVideoDialogController({
  closeAfterFrames,
  getCurrentFrame,
  getDialog,
  getVideoFrame,
  src,
}: {
  closeAfterFrames: number;
  getCurrentFrame: () => number;
  getDialog: () => DialogElement | null;
  getVideoFrame: () => VideoFrameElement | null;
  src: string;
}) {
  let openedAtFrame: number | null = null;
  let popupOpen = false;

  function open() {
    const dialog = getDialog();
    const videoFrame = getVideoFrame();
    if (!dialog || !videoFrame || dialog.open) return;

    openedAtFrame = getCurrentFrame();
    videoFrame.src = src;
    dialog.showModal();
    popupOpen = true;
    notifyPopupVideo("open");
  }

  function sync(currentFrame: number) {
    const dialog = getDialog();
    if (
      dialog?.open &&
      openedAtFrame !== null &&
      Math.abs(currentFrame - openedAtFrame) >= closeAfterFrames
    ) {
      dialog.close();
      openedAtFrame = null;
    }
  }

  function handleClose() {
    openedAtFrame = null;
    if (popupOpen) {
      popupOpen = false;
      notifyPopupVideo("close");
    }
    const videoFrame = getVideoFrame();
    if (videoFrame) videoFrame.src = "";
  }

  return { handleClose, open, sync };
}
