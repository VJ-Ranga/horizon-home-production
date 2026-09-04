/**
 * Where the Horizon product app lives.
 *
 * Horizon (misfarsiddeek95/horizon) deploys as its own Next app on its own
 * host, so every cross-link from this site is absolute. Point
 * NEXT_PUBLIC_HORIZON_ORIGIN at the deployed Horizon at build time — it is the
 * single place the domain is configured. The fallback is the live report
 * domain, so a build with no env file still points at production.
 */
export const HORIZON_ORIGIN =
  process.env.NEXT_PUBLIC_HORIZON_ORIGIN ?? "https://annualreport.haycarb.com";

/** Horizon's real route names, as of misfarsiddeek95/horizon@main. */
export const HORIZON_ROUTES = {
  aiAssistant: "/ai-assistant",
  userProfiles: "/user-profiles",
  crosswordPuzzle: "/crossword-puzzle",
  dashboard: "/sustainability-dashboard",
  tailorMade: "/tailor-made-for-you",
} as const;

export const horizonUrl = (route: string) => `${HORIZON_ORIGIN}${route}`;
