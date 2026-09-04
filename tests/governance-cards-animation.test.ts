import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/AnimationLab/GovernanceCardsLayer.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/components/AnimationLab/lab.css", import.meta.url),
  "utf8",
);

test("governance cards use the section reveal as one group", () => {
  assert.doesNotMatch(source, /staggerProgressAt/);
  assert.doesNotMatch(source, /virtualEnterProgressAtScrollPx/);
  assert.doesNotMatch(source, /wordRefs|cardRefs/);
  assert.match(source, /titleRef/);
  assert.match(source, /cardsRef/);
  assert.match(source, /TITLE_WINDOW/);
  assert.match(source, /CARDS_WINDOW/);
  assert.match(source, /className="s-govcards__title"/);
  assert.match(source, /className="s-govcards__cards"/);
  assert.doesNotMatch(styles, /\.s-govcards__card\s*\{[^}]*opacity:\s*0/);
});
