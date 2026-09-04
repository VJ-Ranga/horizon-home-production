import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/AnimationLab/GlanceLayer.tsx", import.meta.url),
  "utf8",
);

test("glance content reveals by complete groups", () => {
  assert.doesNotMatch(component, /titleWordRefs|statRefs|noteRef|videoRef/);
  assert.match(component, /titleRef/);
  assert.match(component, /bodyRef/);
  assert.match(component, /pillsRef/);
  assert.match(component, /BODY_WINDOW/);
  assert.match(component, /PILLS_WINDOW/);
  assert.doesNotMatch(component, /staggerProgressAt/);
});
