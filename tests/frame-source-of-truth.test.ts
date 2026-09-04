import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sectionFiles = [
  "StrategyLayer.tsx",
  "LeadershipLayer.tsx",
  "FinancialCapitalLayer.tsx",
];

test("section motion reads the shared frame timeline instead of raw page scroll", () => {
  for (const file of sectionFiles) {
    const source = readFileSync(
      new URL(`../src/components/AnimationLab/${file}`, import.meta.url),
      "utf8",
    );

    assert.doesNotMatch(
      source,
      /\(window\.scrollY\s*-/,
      `${file} should use the useFrameEffect scrollPx value for animation`,
    );
  }
});
