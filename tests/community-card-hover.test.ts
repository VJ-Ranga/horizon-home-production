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

test("community cards use the stable non-financial gradient without hover motion", () => {
  assert.doesNotMatch(styles, /\.s-community__card:hover \.s-community__card-image\s*\{\s*transform:/);
  assert.match(styles, /rgba\(43, 155, 161, 0\.12\)/);
  assert.match(styles, /rgba\(0, 91, 119, 0\.78\)/);
  assert.doesNotMatch(styles, /\.s-community__card:hover::after/);
});
