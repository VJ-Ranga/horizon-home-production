import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/AnimationLab/GlanceLayer.tsx", import.meta.url),
  "utf8",
);

test("glance navigation pills use the section animation as one group", () => {
  assert.doesNotMatch(source, /pillRefs/);
  assert.match(source, /pillsRef/);
  assert.match(source, /PILLS_WINDOW/);
  assert.match(source, /PILLS_EXIT_WINDOW/);
});
