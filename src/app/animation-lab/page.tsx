import type { Metadata } from "next";
import AnimationLab from "@/components/AnimationLab/AnimationLab";

/* The animation lab. A workbench, not a page of the site — it proves
   the hero -> section 2 transition before that pattern goes anywhere
   near Home/HomePage.tsx, which this route does not touch. */

export const metadata: Metadata = {
  title: "Animation Lab | Horizon Home",
  description:
    "Workbench for the hero to section 2 scroll transition. Not a public page.",
  robots: { index: false, follow: false },
};

/* ?quality=hq swaps in the HQ preview frame set and lifts the canvas
   dpr cap. Read here on the server rather than from window.location,
   because LabScrubber's poster is server-rendered: reading it on the
   client would emit /frames on the server and /frames-hq on the
   client, which is a hydration mismatch. Any other value, or none,
   is the normal dev build.

   ?debug=1 shows the frame/phase/section HUD (FrameReadout) — off by
   default so a client demo link never shows it. */
export default async function AnimationLabPage({
  searchParams,
}: {
  searchParams: Promise<{ quality?: string; debug?: string }>;
}) {
  const { quality, debug } = await searchParams;
  return <AnimationLab hq={quality === "hq"} debug={debug === "1"} />;
}
