import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/AnimationLab/IntroNavGate.tsx", import.meta.url),
  "utf8",
);
const animationLabSource = readFileSync(
  new URL("../src/components/AnimationLab/AnimationLab.tsx", import.meta.url),
  "utf8",
);
const globalStyles = readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../src/app/layout.tsx", import.meta.url),
  "utf8",
);
const digitalStyles = readFileSync(
  new URL("../src/components/AnimationLab/styles/04-digital.css", import.meta.url),
  "utf8",
);
const introStatementSource = readFileSync(
  new URL("../src/components/AnimationLab/IntroStatementLayer.tsx", import.meta.url),
  "utf8",
);
const glanceSource = readFileSync(
  new URL("../src/components/AnimationLab/GlanceLayer.tsx", import.meta.url),
  "utf8",
);
const citySource = readFileSync(
  new URL("../src/components/AnimationLab/CityBannerLayer.tsx", import.meta.url),
  "utf8",
);
const financialStyles = readFileSync(
  new URL("../src/components/AnimationLab/styles/16-financial.css", import.meta.url),
  "utf8",
);
const governanceIntroSource = readFileSync(
  new URL("../src/components/AnimationLab/GovernanceIntroLayer.tsx", import.meta.url),
  "utf8",
);
const governanceSource = readFileSync(
  new URL("../src/components/AnimationLab/GovernanceLayer.tsx", import.meta.url),
  "utf8",
);
const governanceCardsSource = readFileSync(
  new URL("../src/components/AnimationLab/GovernanceCardsLayer.tsx", import.meta.url),
  "utf8",
);
const riverSource = readFileSync(
  new URL("../src/components/AnimationLab/RiverBannerLayer.tsx", import.meta.url),
  "utf8",
);
const endScreenSource = readFileSync(
  new URL("../src/components/AnimationLab/EndScreenLayer.tsx", import.meta.url),
  "utf8",
);
const communityStyles = readFileSync(
  new URL("../src/components/AnimationLab/styles/18-community.css", import.meta.url),
  "utf8",
);
const communitySource = readFileSync(
  new URL("../src/components/AnimationLab/CommunityLayer.tsx", import.meta.url),
  "utf8",
);
const strategyStyles = readFileSync(
  new URL("../src/components/AnimationLab/styles/17-leadership-replacement-strategy.css", import.meta.url),
  "utf8",
);
const nonFinancialStyles = readFileSync(
  new URL("../src/components/AnimationLab/styles/11-nonfinancial-carousel.css", import.meta.url),
  "utf8",
);
test("global navigation reveals with the hero at its settled frame", () => {
  assert.match(source, /import \{ HERO_SETTLED_FRAME, LOGO_EXIT_FRAMES, SECTIONS \}/);
  assert.match(source, /const REVEAL_FRAME = HERO_SETTLED_FRAME;/);
  assert.match(source, /useLayoutEffect/);
  assert.match(source, /root\.classList\.add\("lab-nav-hidden", "lab-music-hidden"\)/);
  assert.match(layoutSource, /location\.pathname==='\/'/);
  assert.match(layoutSource, /classList\.add\('lab-nav-hidden','lab-music-hidden'\)/);
  assert.match(globalStyles, /html\.lab-music-hidden \.mobile-topbar-scrim/);
  assert.match(globalStyles, /@media \(max-width: 1100px\)/);
});

test("digital tablet layout does not inherit phone-only breakpoint", () => {
  assert.doesNotMatch(digitalStyles, /@media \(max-width: 780px\)/);
  assert.match(digitalStyles, /@media \(max-width: 700px\)/);
});

test("intro statement uses stable copy reveal across compact viewports", () => {
  assert.match(introStatementSource, /matchMedia\("\(max-width: 1100px\)"\)/);
});

test("next compact sections use stable tablet reveals", () => {
  assert.match(glanceSource, /matchMedia\("\(max-width: 1100px\)"\)/);
  assert.match(citySource, /matchMedia\("\(max-width: 1100px\)"\)/);
  assert.match(financialStyles, /@media \(max-width:1100px\)/);
  assert.doesNotMatch(financialStyles, /@media \(max-width:700px\)/);
});

test("governance tablet reveals stay stable and scroll handoff stays dynamic", () => {
  assert.match(governanceIntroSource, /matchMedia\("\(max-width: 1100px\)"\)/);
  assert.match(governanceSource, /matchMedia\("\(max-width: 1100px\)"\)/);
  assert.doesNotMatch(
    governanceCardsSource,
    /className="s-govcards__content" data-lenis-prevent/,
  );
});

test("final compact sections stay readable and track compact viewport height", () => {
  assert.match(riverSource, /matchMedia\("\(max-width: 1100px\)"\)/);
  assert.match(endScreenSource, /matchMedia\("\(max-width: 1100px\)"\)/);
  assert.match(communityStyles, /@media \(max-width: 1100px\)[\s\S]*height: 100dvh/);
  assert.match(communityStyles, /@media \(max-width: 1100px\)[\s\S]*overflow: auto/);
  assert.match(communityStyles, /@media \(min-width: 701px\) and \(max-width: 1100px\)[\s\S]*padding: clamp\(72px/);
  assert.match(communitySource, /if \(isCompact\) \{[\s\S]*rail\.style\.transform = ""/);
  assert.match(endScreenSource, /mobileSolidRef\.current = mode === "compact"/);
  assert.match(endScreenSource, /if \(mobileSolidRef\.current\)/);
  assert.match(animationLabSource, /tabletEndDwellUntilRef/);
  assert.match(animationLabSource, /!isPhoneViewport\(\)[\s\S]*TABLET_END_READ_DWELL_MS/);
});

test("tablet uses mobile card stacking for final reading sections", () => {
  assert.match(
    nonFinancialStyles,
    /@media \(max-width: 1100px\)[\s\S]*\.s-nonfinancial9__rail \{[^}]*grid-template-columns: 1fr/,
  );
  assert.match(
    strategyStyles,
    /@media \(max-width: 1100px\)[\s\S]*\.s-strategy__pillars,\s*\.lab \.s-strategy__risks \{ grid-template-columns: 1fr; \}/,
  );
  assert.match(
    nonFinancialStyles,
    /@media \(min-width: 701px\) and \(max-width: 1100px\)[\s\S]*\.s-nonfinancial9__intro,[\s\S]*opacity: 1 !important/,
  );
});
