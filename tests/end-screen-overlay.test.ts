import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/components/AnimationLab/styles/01-shared-shell.css", import.meta.url),
  "utf8",
);
const timeline = readFileSync(
  new URL("../src/components/AnimationLab/timeline.ts", import.meta.url),
  "utf8",
);
const endScreen = readFileSync(
  new URL("../src/components/AnimationLab/EndScreenLayer.tsx", import.meta.url),
  "utf8",
);

test("desktop end screen uses a bottom-to-top dark readability overlay", () => {
  assert.match(
    styles,
    /@media \(min-width: 1101px\)[\s\S]*\.s-end-screen__overlay[\s\S]*linear-gradient\(\s*0deg[\s\S]*rgba\(3, 18, 24, 0\.82\)/,
  );
  assert.match(styles, /\.s-end-screen__copy[\s\S]*z-index: 1/);
});

test("desktop end screen keeps content stationary while its overlay exits downward", () => {
  assert.match(
    timeline,
    /"19-end-screen":\s*\{\s*exit:\s*\{\s*frames:\s*\[1085,\s*1110\],\s*to:\s*\{\s*y:\s*0\s*\}/,
  );
  assert.match(endScreen, /s-end-screen__overlay/);
  assert.match(endScreen, /overlay\.style\.transform = `translateY\(\$\{4 \* exitProgress\}vh\)`/);
});
