import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { nextCompactSectionFrame } from "../src/components/AnimationLab/compactNavigation.ts";

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

test("compact outer navigation prevents native momentum and locks transitions", () => {
  assert.match(source, /compactNavigationLockRef/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /closest\("\[data-lenis-prevent\]"\)/);
  assert.match(source, /targetFrame[\s\S]*settledFrame/);
  assert.match(source, /passive:\s*false/);
});
