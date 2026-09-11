import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hero = readFileSync(
  new URL("../src/components/AnimationLab/HeroLayer.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/AnimationLab/styles/07-hero.css", import.meta.url),
  "utf8",
);

test("AI Guided Exploration is the prominent hero CTA", () => {
  assert.match(hero, /className="btn btn--ghost s-hero__cta s-hero__cta--report"/);
  assert.match(hero, /className="btn btn--light s-hero__cta s-hero__cta--ai"/);
  assert.match(styles, /\.s-hero__cta--report\s*\{\s*width: 15\.99vw;\s*\}/);
  assert.match(styles, /\.s-hero__cta--ai\s*\{\s*width: 17\.21vw;\s*\}/);
});
