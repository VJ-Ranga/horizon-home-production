import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SECTIONS,
  frameForScrollPx,
  sectionLayerStateAt,
  scrollPxForFrame,
  timelinePolicy,
  totalScrollPx,
} from "../src/components/AnimationLab/timeline.ts";

test("desktop and compact timeline policies are explicit and preserve current values", () => {
  const desktop = timelinePolicy("desktop");
  const compact = timelinePolicy("compact");

  assert.equal(desktop.mode, "desktop");
  assert.equal(compact.mode, "compact");
  assert.notStrictEqual(desktop, compact);
  assert.equal(desktop.frameStepLimit, Infinity);
  assert.equal(compact.frameStepLimit, 2);
});

test("compact frame mapping keeps current timing while desktop uses the legacy timing", () => {
  const pxPerFrame = 14;
  const desktopTotal = totalScrollPx(pxPerFrame, "desktop");
  const compactTotal = totalScrollPx(pxPerFrame, "compact");

  assert.notEqual(compactTotal, desktopTotal);
  assert.notEqual(
    scrollPxForFrame(161, pxPerFrame, "compact"),
    scrollPxForFrame(161, pxPerFrame, "desktop"),
  );

  for (const frame of [50, 161, 350, 700, 1125]) {
    assert.equal(typeof frameForScrollPx(
      scrollPxForFrame(frame, pxPerFrame, "compact"),
      pxPerFrame,
      "compact",
    ), "number");
  }
});

test("compact section-layer state initially mirrors desktop state", () => {
  const section = SECTIONS[1];
  const args = [section, section.settledFrame, 0, 14] as const;

  assert.deepEqual(
    sectionLayerStateAt(...args, "compact"),
    sectionLayerStateAt(...args, "desktop"),
  );
});

test("timeline mode is threaded through the frame driver and effects", () => {
  const source = readFileSync(
    new URL("../src/components/AnimationLab/useFrameTimeline.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /TimelineMode/);
  assert.match(source, /useFrameDriver\([\s\S]*mode: TimelineMode/);
  assert.match(source, /useFrameEffect\(fn: Listener, mode\?: TimelineMode/);
  assert.match(source, /mode\?: TimelineMode,[\s\S]*\): RefObject/);
});

test("direct layer timeline reads use the emitted mode", () => {
  const directReaders = [
    "ApproachLayer.tsx",
    "CityBannerLayer.tsx",
    "CommunityLayer.tsx",
    "DigitalLayer.tsx",
    "EndScreenLayer.tsx",
    "FinancialLayer.tsx",
    "FinancialCapitalLayer.tsx",
    "GovernanceIntroLayer.tsx",
    "GovernanceLayer.tsx",
    "IntroStatementLayer.tsx",
    "LeadershipLayer.tsx",
    "NonFinancialLayer.tsx",
    "OceanBannerLayer.tsx",
    "RiverBannerLayer.tsx",
    "StrategyLayer.tsx",
  ];

  for (const file of directReaders) {
    const contents = readFileSync(
      new URL(`../src/components/AnimationLab/${file}`, import.meta.url),
      "utf8",
    );
    assert.match(contents, /useFrameEffect\(\([^)]*mode\)/, `${file} should receive mode`);
    assert.doesNotMatch(
      contents,
      /virtual(?:Enter|Exit)ProgressAtScrollPx[\s\S]*?readPxPerFrame\(\)\s*\)/,
      `${file} has a virtual timeline read without mode`,
    );
    assert.doesNotMatch(
      contents,
      /scrollPxForFrame[\s\S]*?readPxPerFrame\(\)\s*\)/,
      `${file} has a frame mapping read without mode`,
    );
  }
});
