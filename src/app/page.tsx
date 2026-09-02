import AnimationLab from "@/components/AnimationLab/AnimationLab";

/* The client-facing home page: load screen -> intro shot (LabIntro) ->
   the full scroll experience. Same AnimationLab component as
   /animation-lab, with `intro` on so the default URL plays the intro.
   ?quality=hq and ?debug=1 still work (both opt-in, so a client link
   shows no debug HUD). The intro is skipped automatically under
   prefers-reduced-motion.

   No metadata export here on purpose: page metadata overrides the
   layout's, so a copy here would silently win over the SEO title and
   description in layout.tsx and have to be kept in step with them. */

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ quality?: string; debug?: string }>;
}) {
  const { quality, debug } = await searchParams;
  return <AnimationLab intro hq={quality === "hq"} debug={debug === "1"} />;
}
