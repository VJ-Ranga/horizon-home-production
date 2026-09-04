import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const component = readFileSync(
  new URL("../src/components/AnimationLab/DigitalLayer.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/AnimationLab/lab.css", import.meta.url),
  "utf8",
);

test("digital reporting uses one section animation instead of child staggers", () => {
  assert.doesNotMatch(component, /staggerProgressAt/);
  assert.doesNotMatch(component, /groupRefs/);
  assert.doesNotMatch(component, /wordRefs/);
  assert.doesNotMatch(styles, /\.s-digital2__word,\s*\.s-digital2__lead,\s*\.s-digital2__feature\s*\{\s*opacity: 0/);
});
