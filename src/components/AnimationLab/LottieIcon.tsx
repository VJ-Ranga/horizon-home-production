"use client";

import { useEffect, useRef } from "react";
import lottie, { type AnimationItem } from "lottie-web";

type LottieIconProps = {
  file: string;
  label: string;
  directory?: string;
  className?: string;
  groupSecondary?: boolean;
};

function groupSecondaryArtwork(container: HTMLElement) {
  const svg = container.querySelector("svg");
  if (!svg || svg.querySelector(".s-govcards__portfolio-secondary")) return;

  const secondaryPaths = Array.from(svg.querySelectorAll(".secondary"));
  if (secondaryPaths.length < 2) return;

  let commonAncestor: Element | null = secondaryPaths[0].parentElement;
  while (commonAncestor && !secondaryPaths.every((path) => commonAncestor?.contains(path))) {
    commonAncestor = commonAncestor.parentElement;
  }
  if (!commonAncestor) return;

  const secondaryGroups = Array.from(commonAncestor.children).filter((child) =>
    secondaryPaths.some((path) => child.contains(path)),
  );
  if (secondaryGroups.length < 2) return;

  const wrapper = document.createElementNS("http://www.w3.org/2000/svg", "g");
  wrapper.setAttribute("class", "s-govcards__portfolio-secondary");
  commonAncestor.insertBefore(wrapper, secondaryGroups[0]);
  secondaryGroups.forEach((group) => wrapper.appendChild(group));
}

/** Renders one locally supplied icon animation and cleans it up on unmount. */
export default function LottieIcon({
  file,
  label,
  directory = "digital/icons",
  className = "s-digital2__lottie",
  groupSecondary = false,
}: LottieIconProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animation: AnimationItem | null = null;
    let cancelled = false;

    fetch(`/${directory}/${encodeURIComponent(file)}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Icon request failed: ${response.status}`);
        return response.json();
      })
      .then((animationData) => {
        if (cancelled || !containerRef.current) return;
        animation = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData,
        });
        animation.setSpeed(0.8);
        if (groupSecondary) {
          const normalize = () => groupSecondaryArtwork(container);
          normalize();
          animation.addEventListener("DOMLoaded", normalize);
        }
      })
      .catch(() => {
        // The existing CSS/HTML fallback remains visible if an icon cannot load.
      });

    return () => {
      cancelled = true;
      animation?.destroy();
    };
  }, [file, groupSecondary]);

  return <span className={className} ref={containerRef} role="img" aria-label={label} />;
}
