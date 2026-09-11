import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const digital = readFileSync(
  new URL("../src/components/AnimationLab/DigitalLayer.tsx", import.meta.url),
  "utf8",
);
const header = readFileSync(
  new URL("../src/components/GlobalHeader.tsx", import.meta.url),
  "utf8",
);

test("digital experience options use the requested names and order", () => {
  const requestedOrder = [
    "AI Guided Exploration",
    "Adaptive Reports & Charts",
    "Gamified Exploration",
    "Sustainability Dashboard",
    "Stakeholder Based Summary",
  ];

  for (const source of [digital, header]) {
    const positions = requestedOrder.map((label) => source.indexOf(label));
    assert.ok(positions.every((position) => position >= 0));
    assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  }
});
