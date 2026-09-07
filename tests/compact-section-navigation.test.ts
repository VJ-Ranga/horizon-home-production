import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  compactCarouselTargetScrollPx,
  compactSpecialTargetScrollPx,
  compactSpecialTransitionDurationMs,
  compactTransitionDurationMs,
  compactInputDeltaPx,
  COMPACT_TRANSITION_FPS,
  compactScrollSupportThresholdPx,
  compactLeadershipScrollBudgetPx,
  carouselDampingForElapsedMs,
  carouselContentStartPx,
  readerConsumesScroll,
  nextCompactSectionFrame,
} from "../src/components/AnimationLab/compactNavigation.ts";
import { SECTIONS } from "../src/components/AnimationLab/timeline.ts";

test("compact scroll-through sections apply their slowdown to gesture duration", () => {
  assert.equal(compactSpecialTransitionDurationMs(1_862, 14, 1), 8_538);
  assert.equal(compactSpecialTransitionDurationMs(1_862, 14, 2), 17_077);
});

test("compact navigation spends a gesture on pinned holds and scroll-through spans", () => {
  assert.equal(compactSpecialTargetScrollPx(1_000, 1, 1_000, 2_120), 2_120);
  assert.equal(compactSpecialTargetScrollPx(2_120, -1, 1_000, 2_120), 1_000);
  assert.equal(compactSpecialTargetScrollPx(3_000, 1, 1_000, 2_120), null);
});

test("compact navigation spends a gesture on the financial capital carousel", () => {
  const startPx = 10_000;
  const carouselPx = 3_210;

  assert.equal(
    compactCarouselTargetScrollPx(675, startPx, 1, 675, startPx, carouselPx),
    startPx + carouselPx,
  );
  assert.equal(
    compactCarouselTargetScrollPx(675, startPx + carouselPx, -1, 675, startPx, carouselPx),
    startPx,
  );
});

const source = readFileSync(
  new URL("../src/components/AnimationLab/AnimationLab.tsx", import.meta.url),
  "utf8",
);
const compactNavigationSource = readFileSync(
  new URL("../src/components/AnimationLab/compactNavigation.ts", import.meta.url),
  "utf8",
);
const frameDriverSource = readFileSync(
  new URL("../src/components/AnimationLab/useFrameTimeline.ts", import.meta.url),
  "utf8",
);
const approachSource = readFileSync(
  new URL("../src/components/AnimationLab/ApproachLayer.tsx", import.meta.url),
  "utf8",
);
const leadershipSource = readFileSync(
  new URL("../src/components/AnimationLab/LeadershipLayer.tsx", import.meta.url),
  "utf8",
);

test("large compact gestures target only the adjacent settled section", () => {
  assert.equal(nextCompactSectionFrame(100, [50, 150, 250], 1), 150);
  assert.equal(nextCompactSectionFrame(249, [50, 150, 250], 1), 250);
  assert.equal(nextCompactSectionFrame(249, [50, 150, 250], -1), 150);
  assert.equal(nextCompactSectionFrame(50, [50, 150, 250], -1), null);
});

test("normal compact section jumps are capped at source playback speed", () => {
  assert.equal(compactTransitionDurationMs(50, 90), 2568);
  assert.equal(compactTransitionDurationMs(161, 255), 6035);
  assert.equal(compactTransitionDurationMs(255, 275), 1284);
  assert.equal(compactTransitionDurationMs(275, 335), 3852);
});

test("special compact input is capped without creating an animation tail", () => {
  assert.equal(compactInputDeltaPx(1_000, 1_000, 14), 218.0724);
  assert.equal(compactInputDeltaPx(-1_000, 1_000, 14), -218.0724);
  assert.equal(compactInputDeltaPx(20, 1_000, 14), 20);
  assert.equal(compactInputDeltaPx(1_000, 0, 14), 0);
  assert.equal(compactInputDeltaPx(1_000, 1_000, 14, 4), 872.2896);
});

test("scroll-support gestures use one quarter of the viewport as their threshold", () => {
  assert.equal(compactScrollSupportThresholdPx(800), 200);
  assert.equal(compactScrollSupportThresholdPx(0), 0);
});

test("Haycarb at a Glance keeps a 20-frame virtual exit from frames 279 to 280", () => {
  const glance = SECTIONS.find((section) => section.id === "06-key-data-points");
  assert.deepEqual(glance?.exit?.frames, [279, 280]);
  assert.equal(glance?.virtualExitFrames, 20);
});

test("Leadership compact scrolling uses its hold and virtual-exit budget as direct input", () => {
  assert.equal(compactLeadershipScrollBudgetPx(60, 20, 14), 1_120);
});

test("carousel damping keeps the desktop feel when compact frames are slower", () => {
  assert.equal(COMPACT_TRANSITION_FPS, 15.5766);
  assert.ok(Math.abs(carouselDampingForElapsedMs(0.09, 1000 / 60) - 0.09) < 1e-12);
  assert.ok(carouselDampingForElapsedMs(0.09, 200) > 0.09);
  assert.ok(carouselDampingForElapsedMs(0.09, 200) < 1);
});

test("carousel cards begin after the virtual-enter budget", () => {
  assert.equal(carouselContentStartPx(9_450, 20, 14), 9_730);
});

test("inner readers consume gestures only while they have room in that direction", () => {
  assert.equal(readerConsumesScroll(40, 100, 300, 1), true);
  assert.equal(readerConsumesScroll(200, 100, 300, 1), false);
  assert.equal(readerConsumesScroll(40, 100, 300, -1), true);
  assert.equal(readerConsumesScroll(0, 100, 300, -1), false);
});

test("compact outer navigation prevents native momentum and locks transitions", () => {
  assert.match(source, /compactNavigationLockRef/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /COMPACT_NATIVE_READER_SELECTOR/);
  assert.match(source, /targetFrame[\s\S]*settledFrame/);
  assert.match(source, /compactTransitionDurationMs/);
  assert.match(source, /fromScrollY[\s\S]*top: fromScrollY/);
  assert.match(source, /passive:\s*false/);
});

test("target mobile sections share native reader ownership", () => {
  assert.match(compactNavigationSource, /s-leadership5/);
  assert.match(compactNavigationSource, /s-fincap/);
  assert.match(compactNavigationSource, /s-strategy/);
  assert.match(compactNavigationSource, /s-community__stage/);
});

test("compact frame limiting preserves continuous scroll input for pinned sections", () => {
  assert.doesNotMatch(
    frameDriverSource,
    /if \(limitedFrame !== frame\) \{[\s\S]*?scrollPx = scrollPxForFrame\(frame, pxPerFrame, policy\.mode\);/,
  );
});

test("Approach does not consume the first compact swipe as an inner reader", () => {
  assert.doesNotMatch(approachSource, /s-approach2__stage[\s\S]*data-lenis-prevent/);
});

test("Leadership content uses the full compact budget without an empty exit tail", () => {
  assert.match(
    leadershipSource,
    /const glideRoomPx = Math\.max\(budgetPx - exitTailPx \/ 2, 1\);/,
  );
});
