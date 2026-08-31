"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import ScrollScrubber from "./ScrollScrubber";
import { SCROLL_LENGTH_VH } from "@/data/home";

export default function HomePage() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    let rafId = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  return (
    <main className="relative w-full">
      <ScrollScrubber />
      <div style={{ height: `${SCROLL_LENGTH_VH}vh` }} />
    </main>
  );
}
