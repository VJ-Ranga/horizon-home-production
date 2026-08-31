"use client";

/* =========================================================
   ANIMATION LAB — mouse parallax
   =========================================================

   Ports "loop test/assets/interactions.js" onto the lab's fixed
   background box (.lab-media). Same numbers, same behaviour:

     horizontal maximum: 3px
     vertical maximum:   2px
     rotation maximum:   0.2deg
     tilt lerp:  0.05
     cursor lerp: 0.14

   Independent of the frame driver — it never reads or writes
   scrollY/frame state, only appends a transform on top of whatever
   the carve is doing to the same element. Touch pointers are
   ignored so mobile scrolling is untouched, and it turns itself off
   under prefers-reduced-motion. */

import { useEffect, type RefObject } from "react";

function lerp(current: number, target: number, amount: number): number {
  return current + (target - current) * amount;
}

function pointerTarget(clientX: number, clientY: number, width: number, height: number) {
  const normalizedX = (clientX / width - 0.5) * 2;
  const normalizedY = (clientY / height - 0.5) * 2;
  return {
    x: normalizedX * 3,
    y: normalizedY * 2,
    rotateX: normalizedY === 0 ? 0 : normalizedY * -0.2,
    rotateY: normalizedX * 0.2,
  };
}

export function useMouseParallax(mediaRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const follower = document.createElement("span");
    follower.className = "lab-cursor";
    follower.setAttribute("aria-hidden", "true");
    document.body.appendChild(follower);

    const current = { x: 0, y: 0, rotateX: 0, rotateY: 0, cursorX: 0, cursorY: 0 };
    const target = { x: 0, y: 0, rotateX: 0, rotateY: 0, cursorX: 0, cursorY: 0 };
    let pointerInside = false;
    let rafId = 0;

    const resetPointer = () => {
      target.x = 0;
      target.y = 0;
      target.rotateX = 0;
      target.rotateY = 0;
      pointerInside = false;
      follower.classList.remove("is-visible");
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType && event.pointerType !== "mouse") return;
      const next = pointerTarget(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
      target.x = next.x;
      target.y = next.y;
      target.rotateX = next.rotateX;
      target.rotateY = next.rotateY;
      target.cursorX = event.clientX;
      target.cursorY = event.clientY;
      pointerInside = true;
      follower.classList.add("is-visible");
    };

    const animate = () => {
      current.x = lerp(current.x, target.x, 0.05);
      current.y = lerp(current.y, target.y, 0.05);
      current.rotateX = lerp(current.rotateX, target.rotateX, 0.05);
      current.rotateY = lerp(current.rotateY, target.rotateY, 0.05);
      current.cursorX = lerp(current.cursorX, target.cursorX, 0.14);
      current.cursorY = lerp(current.cursorY, target.cursorY, 0.14);

      if (!reducedMotion.matches) {
        media.style.transform = `translate3d(${current.x.toFixed(2)}px, ${current.y.toFixed(2)}px, 0) rotateX(${current.rotateX.toFixed(2)}deg) rotateY(${current.rotateY.toFixed(2)}deg) scale(1.01)`;
      }
      follower.style.transform = `translate3d(${current.cursorX.toFixed(2)}px, ${current.cursorY.toFixed(2)}px, 0) translate(-50%, -50%)`;
      follower.classList.toggle("is-visible", pointerInside);
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", resetPointer);
    window.addEventListener("blur", resetPointer);
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("mouseleave", resetPointer);
      window.removeEventListener("blur", resetPointer);
      follower.remove();
      media.style.transform = "";
    };
  }, [mediaRef]);
}
