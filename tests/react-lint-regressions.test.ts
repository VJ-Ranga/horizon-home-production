import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (name: string) =>
  readFileSync(`src/components/AnimationLab/${name}`, "utf8");

test("word-indexed animation markup does not mutate counters during render", () => {
  for (const name of ["ApproachLayer.tsx", "GovernanceLayer.tsx", "MainStartLayer.tsx"]) {
    const contents = source(name);
    assert.doesNotMatch(contents, /(?:titleWordIndex|wordIndex)\s*\+=\s*1/);
  }
});

test("mobile frame source uses an external viewport snapshot", () => {
  const contents = source("LabScrubber.tsx");
  assert.match(contents, /useSyncExternalStore/);
  assert.doesNotMatch(contents, /const \[mounted, setMounted\] = useState\(false\)/);
});

test("leadership video controller is created after refs mount", () => {
  const contents = source("LeadershipLayer.tsx");
  assert.doesNotMatch(contents, /const \[videoDialog\] = useState\(\(\) =>/);
  assert.match(contents, /videoDialogRef\.current = createVideoDialogController/);
});

test("compact readers claim the first gesture and release at scroll edges", () => {
  const glance = source("GlanceLayer.tsx");
  const financial = source("FinancialLayer.tsx");
  assert.match(glance, /onTouchStart[\s\S]*setAttribute\("data-lenis-prevent"/);
  assert.match(financial, /readerConsumes[\s\S]*touchmove/);
  assert.match(financial, /data-lenis-prevent/);
});

test("mobile scroll-through panels do not stop short after a swipe", () => {
  const leadership = source("LeadershipLayer.tsx");
  const strategy = source("StrategyLayer.tsx");
  assert.doesNotMatch(leadership, /mobileCurrentRef\.current \+= \(targetPx - mobileCurrentRef\.current\) \* EASE/);
  assert.match(strategy, /const ease = mobile \|\| reduceMotion \? 1 : EASE/);
});

test("approach exits as one shared visual fade", () => {
  const contents = source("ApproachLayer.tsx");
  assert.match(contents, /const sharedExitProgress/);
  assert.match(contents, /const t = entering[\s\S]*sharedExitProgress/);
});

test("normal animation route has a mobile-only frame loader", () => {
  const contents = source("AnimationLab.tsx");
  assert.match(contents, /data-mobile-loading/);
  assert.match(contents, /phone[\s\S]*entryReady[\s\S]*mobileLoadProgress/);
  assert.match(contents, /FRAME_DIR_MOBILE/);
  assert.doesNotMatch(contents, /mobile-loading[\s\S]*video/);
});

test("compact navigation snaps one page swipe to one section", () => {
  const contents = source("AnimationLab.tsx");
  assert.match(contents, /Compact outer navigation advances one section per gesture/);
  assert.match(contents, /nextCompactSectionFrame/);
  assert.match(contents, /compactNavigationLockRef/);
  assert.match(contents, /passive: false/);
  assert.match(contents, /closest\("\[data-lenis-prevent\]"\)/);
  assert.match(contents, /reader\.scrollTop = direction > 0[\s\S]*scrollHeight - reader\.clientHeight/);
  assert.match(contents, /\.lab-layer\[data-lenis-prevent\], \.lab-layer \[data-lenis-prevent\]/);
});

test("tablet compact mode does not fall back to desktop frames", () => {
  const scrubber = source("LabScrubber.tsx");
  const harness = source("AnimationLab.tsx");
  const timeline = source("useFrameTimeline.ts");
  assert.match(scrubber, /FRAME_DIR_TABLET/);
  assert.match(scrubber, /max-width: 1100px/);
  assert.match(harness, /FRAME_DIR_TABLET/);
  assert.match(harness, /isCompactViewport/);
  assert.match(timeline, /TimelineMode/);
});

test("phone frame loading uses a bounded window and last-painted fallback", () => {
  const scrubber = source("LabScrubber.tsx");
  assert.match(scrubber, /PHONE_WINDOW_AHEAD/);
  assert.match(scrubber, /PHONE_WINDOW_BACK/);
  assert.match(scrubber, /PHONE_WINDOW_KEEP/);
  assert.match(scrubber, /painted\.current/);
  const lab = source("AnimationLab.tsx");
  assert.match(lab, /compact && !isSettledFrame\(rounded\)/);
});

test("frame-driven community rail has one transform owner", () => {
  const community = source("CommunityLayer.tsx");
  const styles = source("styles/18-community.css");
  assert.match(community, /ResizeObserver/);
  assert.doesNotMatch(styles, /\.s-community__stories[^}]*transition:\s*transform/);
});

test("compact scrolling does not start the desktop Lenis loop", () => {
  const lab = source("AnimationLab.tsx");
  assert.match(lab, /if \(phase !== "scroll" \|\| skipEntry \|\| compact\) return;/);
  assert.match(lab, /window\.scrollTo\(\{ top: targetY, behavior: "smooth" \}\)/);
});

test("desktop frame fallback preserves the last painted frame", () => {
  const scrubber = source("LabScrubber.tsx");
  assert.match(scrubber, /const offset = resolveOffset\(backgroundFrame, true\);/);
});

test("Lenis is advanced by the frame driver before scroll sampling", () => {
  const timeline = source("useFrameTimeline.ts");
  const lab = source("AnimationLab.tsx");
  assert.match(timeline, /beforeScrollRead/);
  assert.match(lab, /useFrameDriver\(\s*skipEntry,\s*entryReady && introComplete,\s*beforeScrollRead,\s*compact \? "compact" : "desktop",?\s*\)/);
  assert.doesNotMatch(lab, /const raf = \(time: number\) => \{\s*lenis\.raf\(time\)/);
});

test("digital section settles at 161 and exits over 20 frames", () => {
  const contents = readFileSync("src/components/AnimationLab/timeline.ts", "utf8");
  const digital = contents.match(
    /id: "04-digital"[\s\S]*?loadBuffer: \{ behind: 4, ahead: 4 \}/,
  )?.[0];
  assert.ok(digital);
  assert.match(digital, /settledFrame: 161/);
  assert.match(digital, /enter:[\s\S]*?frames: \[141, 161\]/);
  assert.doesNotMatch(digital, /virtualEnterFrames/);
  assert.match(digital, /exit:[\s\S]*?frames: \[161, 181\]/);
  assert.match(digital, /loadBuffer: \{ behind: 4, ahead: 4 \}/);
  assert.match(
    source("AnimationLab.tsx"),
    /DIGITAL_ENTER_FRAME[\s\S]*DIGITAL_SETTLED_FRAME[\s\S]*rounded >= DIGITAL_ENTER_FRAME[\s\S]*rounded < DIGITAL_SETTLED_FRAME/,
  );
  assert.match(source("DigitalLayer.tsx"), /staggerProgressAt/);
  assert.match(source("DigitalLayer.tsx"), /CHAR_WINDOW: \[number, number\] = \[141, 161\]/);
});
