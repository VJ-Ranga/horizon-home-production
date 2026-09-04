import assert from "node:assert/strict";
import test from "node:test";
import {
  beginFrameJump,
  endFrameJump,
  limitMobileFrame,
} from "../src/components/AnimationLab/mobileFrameGuard.ts";

test("limits a large forward frame jump to the mobile step budget", () => {
  assert.equal(limitMobileFrame(100, 180), 102);
});

test("limits a large backward frame jump by the same budget", () => {
  assert.equal(limitMobileFrame(180, 100), 178);
});

test("does not change a frame delta inside the budget", () => {
  assert.equal(limitMobileFrame(100, 101.5), 101.5);
});

test("a programmatic jump lands on its target in one step", () => {
  beginFrameJump();
  try {
    assert.equal(limitMobileFrame(1125, 32), 32);
  } finally {
    endFrameJump();
  }
});

test("the step budget is restored once the jump ends", () => {
  beginFrameJump();
  endFrameJump();
  assert.equal(limitMobileFrame(1125, 32), 1123);
});
