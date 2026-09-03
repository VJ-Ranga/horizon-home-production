import assert from "node:assert/strict";
import test from "node:test";
import { limitMobileFrame } from "../src/components/AnimationLab/mobileFrameGuard.ts";

test("limits a large forward frame jump to the mobile step budget", () => {
  assert.equal(limitMobileFrame(100, 180), 102);
});

test("limits a large backward frame jump by the same budget", () => {
  assert.equal(limitMobileFrame(180, 100), 178);
});

test("does not change a frame delta inside the budget", () => {
  assert.equal(limitMobileFrame(100, 101.5), 101.5);
});
