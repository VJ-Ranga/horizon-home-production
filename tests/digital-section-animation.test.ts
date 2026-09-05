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

test("digital desktop uses the old word and group stagger animation", () => {
  assert.match(component, /staggerProgressAt/);
  assert.match(component, /groupRefs/);
  assert.match(component, /wordRefs/);
  assert.doesNotMatch(styles, /\.s-digital2__word,\s*\.s-digital2__lead,\s*\.s-digital2__feature\s*\{\s*opacity: 0/);
});

test("digital layer reads the active desktop/compact timing policy", () => {
  assert.match(component, /sectionTimingForMode/);
  assert.match(component, /sectionTimingForMode\(DIGITAL, mode\)/);
  assert.match(component, /staggerProgressAt/);
  assert.match(component, /TITLE_WORD_COUNT/);
  assert.match(component, /GROUP_COUNT/);
});
