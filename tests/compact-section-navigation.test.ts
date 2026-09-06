import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  compactCarouselTargetScrollPx,
  compactSpecialTargetScrollPx,
  compactSpecialTransitionDurationMs,
  compactTransitionDurationMs,
  compactInputDeltaPx,
  readerConsumesScroll,
  nextCompactSectionFrame,
} from "../src/components/AnimationLab/compactNavigation.ts";

test("compact scroll-through sections apply their slowdown to gesture duration", () => {
  assert.equal(compactSpecialTransitionDurationMs(1_862, 14, 1), 25_615);
  assert.equal(compactSpecialTransitionDurationMs(1_862, 14, 2), 51_231);
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

test("large compact gestures target only the adjacent settled section", () => {
  assert.equal(nextCompactSectionFrame(100, [50, 150, 250], 1), 150);
  assert.equal(nextCompactSectionFrame(249, [50, 150, 250], 1), 250);
  assert.equal(nextCompactSectionFrame(249, [50, 150, 250], -1), 150);
  assert.equal(nextCompactSectionFrame(50, [50, 150, 250], -1), null);
});

test("normal compact section jumps are capped at source playback speed", () => {
  assert.equal(compactTransitionDurationMs(50, 90), 7704);
  assert.equal(compactTransitionDurationMs(161, 255), 18104);
  assert.equal(compactTransitionDurationMs(255, 275), 3852);
  assert.equal(compactTransitionDurationMs(275, 335), 11556);
});

test("special compact input is capped without creating an animation tail", () => {
  assert.equal(compactInputDeltaPx(1_000, 1_000, 14), 72.6908);
  assert.equal(compactInputDeltaPx(-1_000, 1_000, 14), -72.6908);
  assert.equal(compactInputDeltaPx(20, 1_000, 14), 20);
  assert.equal(compactInputDeltaPx(1_000, 0, 14), 0);
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
  assert.match(source, /closest\("\[data-lenis-prevent\]"\)/);
  assert.match(source, /targetFrame[\s\S]*settledFrame/);
  assert.match(source, /compactTransitionDurationMs/);
  assert.match(source, /fromScrollY[\s\S]*top: fromScrollY/);
  assert.match(source, /passive:\s*false/);
});
