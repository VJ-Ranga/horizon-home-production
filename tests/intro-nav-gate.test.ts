import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/AnimationLab/IntroNavGate.tsx", import.meta.url),
  "utf8",
);

test("global navigation reveals with the hero at its settled frame", () => {
  assert.match(source, /import \{ HERO_SETTLED_FRAME, LOGO_EXIT_FRAMES, SECTIONS \}/);
  assert.match(source, /const REVEAL_FRAME = HERO_SETTLED_FRAME;/);
});
