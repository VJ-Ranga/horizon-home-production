import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/AnimationLab/AnimationLab.tsx", import.meta.url),
  "utf8",
);

test("mobile touch movement begins the existing loop transition at the cover boundary", () => {
  assert.match(source, /const onTouchMove = \(event: TouchEvent\)/);
  assert.match(source, /window\.addEventListener\("touchmove", onTouchMove, \{ passive: true \}\)/);
  assert.match(source, /window\.removeEventListener\("touchmove", onTouchMove\)/);
});

test("loop cover becomes opaque synchronously before the scroll reset", () => {
  const overlay = readFileSync(
    new URL("../src/components/AnimationLab/LoopTransitionOverlay.tsx", import.meta.url),
    "utf8",
  );

  assert.match(overlay, /useLayoutEffect/);
  assert.match(overlay, /if \(stage === "cover"\) shade\.style\.opacity = "1"/);
});

test("the global mobile timeline uses native touch scrolling", () => {
  assert.doesNotMatch(source, /syncTouch:\s*isMobile/);
  assert.doesNotMatch(source, /syncTouchLerp/);
});
