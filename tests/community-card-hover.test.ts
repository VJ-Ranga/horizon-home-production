import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL(
    "../src/components/AnimationLab/styles/18-community.css",
    import.meta.url,
  ),
  "utf8",
);

test("community cards use a dark overlay without hover motion", () => {
  assert.doesNotMatch(styles, /\.s-community__card:hover \.s-community__card-image\s*\{\s*transform:/);
  assert.match(
    styles,
    /@media \(min-width: 1101px\)[\s\S]*\.s-community__card::after[\s\S]*rgba\(3, 18, 24, 0\.28\)[\s\S]*rgba\(3, 18, 24, 0\.92\)/,
  );
  assert.match(styles, /rgba\(43, 155, 161, 0\.12\)/);
  assert.doesNotMatch(styles, /\.s-community__card:hover::after/);
});
