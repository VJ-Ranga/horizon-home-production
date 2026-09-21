import type { Metadata } from "next";
import AnimationLab from "@/components/AnimationLab/AnimationLab";

/* Same scroll experience as `/`, without the intro. Not indexed. */

export const metadata: Metadata = {
  title: "Animation Lab | Horizon Home",
  description:
    "Workbench for the hero to section 2 scroll transition. Not a public page.",
  robots: { index: false, follow: false },
};

/* ?quality=hq swaps in the HQ frame set and lifts the canvas dpr cap.
   Read here on the server rather than from window.location, because
   LabScrubber's poster is server-rendered: reading it on the client
   would emit /frames on the server and /frames-hq on the client, which
   is a hydration mismatch.

   ?debug=1 shows the frame/phase/section HUD (FrameReadout), off by
   default. */
export default async function AnimationLabPage({
  searchParams,
}: {
  searchParams: Promise<{ quality?: string; debug?: string }>;
}) {
  const { quality, debug } = await searchParams;
  return <AnimationLab hq={quality === "hq"} debug={debug === "1"} />;
}
