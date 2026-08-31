import type { Metadata } from "next";
import AnimationLab from "@/components/AnimationLab/AnimationLab";

/* The client-facing home page: load screen -> intro shot (LabIntro) ->
   the full scroll experience. Same AnimationLab component as
   /animation-lab, with `intro` on so the default URL plays the intro.
   ?quality=hq and ?debug=1 still work (both opt-in, so a client link
   shows no debug HUD). The intro is skipped automatically under
   prefers-reduced-motion. */

export const metadata: Metadata = {
  title: "Horizon | Haycarb PLC",
  description: "Annual Report 2025/26.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ quality?: string; debug?: string }>;
}) {
  const { quality, debug } = await searchParams;
  return <AnimationLab intro hq={quality === "hq"} debug={debug === "1"} />;
}
