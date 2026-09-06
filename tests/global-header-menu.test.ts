import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const header = readFileSync(
  new URL("../src/components/GlobalHeader.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../src/app/globals.css", import.meta.url),
  "utf8",
);

test("desktop menu credit is fully white while compact keeps the muted base", () => {
  assert.match(header, /desktop-menu-credit[\s\S]*text-white\/50/);
  assert.match(styles, /@media \(min-width: 1101px\)[\s\S]*\.desktop-menu-credit[\s\S]*color: #ffffff !important/);
});
