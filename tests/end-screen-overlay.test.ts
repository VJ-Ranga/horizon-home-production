import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../src/components/AnimationLab/styles/01-shared-shell.css", import.meta.url),
  "utf8",
);

test("desktop end screen uses a bottom-to-top dark readability overlay", () => {
  assert.match(
    styles,
    /@media \(min-width: 1101px\)[\s\S]*\.s-end-screen::before[\s\S]*linear-gradient\(\s*0deg[\s\S]*rgba\(3, 18, 24, 0\.82\)/,
  );
  assert.match(styles, /\.s-end-screen__copy[\s\S]*z-index: 1/);
});
