type AudioClip = Pick<HTMLAudioElement, "play" | "pause"> & {
  currentTime?: number;
  muted?: boolean;
  preload?: string;
  load?: () => void;
  addEventListener?: HTMLAudioElement["addEventListener"];
  removeEventListener?: HTMLAudioElement["removeEventListener"];
};

type Timers = Pick<Window, "setTimeout" | "clearTimeout">;

export const HOVER_AUDIO_DELAY_MS = 1000;

/** Fired on window when the financial narration starts / stops, so the
    site-wide background music (BackgroundMusic.tsx) can duck under it. */
export const BGM_DUCK_EVENT = "hz:bgm-duck";
export const BGM_UNDUCK_EVENT = "hz:bgm-unduck";

function emitBgm(name: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(name));
}

/** Owns the one financial narration that may be pending or playing. */
export function createHoverAudioPlayer(
  createAudio: (src: string) => AudioClip,
  timers?: Timers
) {
  let active: AudioClip | null = null;
  let timer: number | null = null;
  let unlocked = false;
  let muted = false;
  const preloaded = new Map<string, AudioClip>();

  function getTimers() {
    if (timers) return timers;
    if (typeof window === "undefined") {
      throw new Error("Hover audio can only be scheduled in a browser.");
    }
    return window;
  }

  function stop() {
    if (timer !== null) getTimers().clearTimeout(timer);
    timer = null;
    if (active) {
      active.pause();
      active.currentTime = 0;
    }
    active = null;
  }

  function prime(clip: AudioClip) {
    const wasMuted = clip.muted;
    clip.muted = true;

    try {
      const playback = clip.play();
      clip.pause();
      return Promise.resolve(playback)
        .catch(() => {})
        .finally(() => {
          clip.muted = wasMuted;
        });
    } catch {
      // Browsers may reject priming even when it is not user-initiated.
      clip.pause();
      clip.muted = wasMuted;
      return Promise.resolve();
    }
  }

  function schedule(src: string) {
    if (muted) {
      stop();
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      stop();
      return;
    }

    const activeTimers = getTimers();
    stop();
    const preloadedClip = preloaded.get(src);
    const clip = preloadedClip ?? createAudio(src);
    if (unlocked && !preloadedClip) {
      preloaded.set(src, clip);
      void prime(clip);
    }
    active = clip;
    timer = activeTimers.setTimeout(() => {
      if (active !== clip) return;
      timer = null;
      // play() rejects when the browser blocks audio before the first
      // user gesture (NotAllowedError), or when stop() pauses the clip
      // while it is still starting up (AbortError). Both are expected
      // here — swallow them rather than let an unhandled rejection
      // reach the dev overlay.
      Promise.resolve(clip.play()).catch(() => {});
    }, HOVER_AUDIO_DELAY_MS);
  }

  /** Play a clip immediately, no hover-intent delay — for click-to-play.
      Still respects the mute toggle; a real click is user-initiated so it
      is not gated on reduced-motion the way hover scheduling is. */
  function play(src: string) {
    if (muted) {
      stop();
      return;
    }
    stop();
    const preloadedClip = preloaded.get(src);
    const clip = preloadedClip ?? createAudio(src);
    if (!preloadedClip) preloaded.set(src, clip);
    active = clip;
    if (clip.currentTime !== undefined) clip.currentTime = 0;
    Promise.resolve(clip.play()).catch(() => {});
  }

  function preload(src: string) {
    if (preloaded.has(src)) return;
    const clip = createAudio(src);
    clip.preload = "auto";
    clip.load?.();
    preloaded.set(src, clip);
  }

  async function unlock() {
    if (unlocked || preloaded.size === 0) return;

    await Promise.all([...preloaded.values()].map((clip) => prime(clip)));
    unlocked = true;
  }

  function setMuted(nextMuted: boolean) {
    muted = nextMuted;
    if (muted) stop();
  }

  return { preload, schedule, play, setMuted, stop, unlock };
}
