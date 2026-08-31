"use client";

import { useEffect, useRef, useState } from "react";
import { FRAME_COUNT, framePath } from "@/data/home";

const LOAD_CONCURRENCY = 6;

export default function ScrollScrubber() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const images: Array<HTMLImageElement | undefined> = new Array(FRAME_COUNT);
    const loaded: boolean[] = new Array(FRAME_COUNT).fill(false);

    let disposed = false;
    let rafId = 0;
    let currentIndex = -1;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      currentIndex = -1;
    };

    const paint = (index: number) => {
      const image = images[index];
      if (!image || !loaded[index]) return false;

      const ratio = Math.max(
        canvas.width / image.naturalWidth,
        canvas.height / image.naturalHeight
      );
      const width = image.naturalWidth * ratio;
      const height = image.naturalHeight * ratio;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(
        image,
        (canvas.width - width) / 2,
        (canvas.height - height) / 2,
        width,
        height
      );
      return true;
    };

    const nearestLoaded = (target: number) => {
      if (loaded[target]) return target;
      for (let offset = 1; offset < FRAME_COUNT; offset += 1) {
        const back = target - offset;
        if (back >= 0 && loaded[back]) return back;
        const forward = target + offset;
        if (forward < FRAME_COUNT && loaded[forward]) return forward;
      }
      return -1;
    };

    const render = () => {
      rafId = requestAnimationFrame(render);

      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress =
        scrollable > 0
          ? Math.min(Math.max(window.scrollY / scrollable, 0), 1)
          : 0;

      const target = reduceMotion
        ? 0
        : Math.min(FRAME_COUNT - 1, Math.floor(progress * FRAME_COUNT));

      const index = nearestLoaded(target);
      if (index < 0 || index === currentIndex) return;
      if (paint(index)) currentIndex = index;
    };

    const loadFrame = (index: number) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          loaded[index] = true;
          resolve();
        };
        image.onerror = () => resolve();
        image.src = framePath(index);
        images[index] = image;
      });

    const start = async () => {
      await loadFrame(0);
      if (disposed) return;

      resize();
      setReady(true);
      rafId = requestAnimationFrame(render);

      if (reduceMotion) return;

      let next = 1;
      const worker = async () => {
        while (!disposed && next < FRAME_COUNT) {
          const index = next;
          next += 1;
          await loadFrame(index);
        }
      };

      await Promise.all(
        Array.from({ length: LOAD_CONCURRENCY }, () => worker())
      );
    };

    window.addEventListener("resize", resize);
    void start();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 bg-[#0d5470] pointer-events-none"
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
