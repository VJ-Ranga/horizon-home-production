import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  compactCarouselTargetScrollPx,
  compactSpecialTargetScrollPx,
  compactTransitionDurationMs,
  readerConsumesScroll,
  nextCompactSectionFrame,
} from "../src/components/AnimationLab/compactNavigation.ts";

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

test("first six compact sections use a 15fps transition budget", () => {
  assert.equal(compactTransitionDurationMs(50, 90), 2667);
  assert.equal(compactTransitionDurationMs(161, 255), 6267);
  assert.equal(compactTransitionDurationMs(255, 275), 1333);
  assert.equal(compactTransitionDurationMs(275, 335), 550);
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
