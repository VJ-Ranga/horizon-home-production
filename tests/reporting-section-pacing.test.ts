import assert from "node:assert/strict";
import test from "node:test";
import {
  SECTIONS,
  frameForScrollPx,
  readPxPerFrame,
  scrollPxForFrame,
  sectionLayerStateAt,
  sectionExitFrameAtVirtualProgress,
  sectionTimingForMode,
  totalScrollPx,
  virtualExitProgressAtScrollPx,
} from "../src/components/AnimationLab/timeline.ts";

test("desktop uses the old smooth timing for sections 2-4 while compact keeps current timing", () => {
  const expectedDesktop = {
    "02-main-02": { hold: 10, exit: 0 },
    "03-approach": { hold: 10, exit: 10 },
    "04-digital": { hold: 10, exit: 0 },
  } as const;

  for (const [id, expected] of Object.entries(expectedDesktop)) {
    const section = SECTIONS.find((item) => item.id === id);
    assert.ok(section, `${id} should exist in the timeline`);
    const desktop = sectionTimingForMode(section, "desktop");
    const compact = sectionTimingForMode(section, "compact");
    assert.equal(desktop.holdFrames, expected.hold, `${id} desktop hold`);
    assert.equal(
      desktop.virtualExitFrames ?? 0,
      expected.exit,
      `${id} desktop virtual exit`,
    );
    assert.equal(compact.holdFrames, 20, `${id} compact hold remains current`);
    if (id === "03-approach") {
      assert.equal(desktop.holdCrawlFrames, undefined, "03 desktop keeps the old shared crawl");
      assert.equal(compact.holdCrawlFrames, undefined, "03 compact keeps the shared crawl");
    }
  }

  assert.deepEqual(sectionTimingForMode(SECTIONS[3], "desktop").exit?.frames, [161, 176]);
  assert.deepEqual(sectionTimingForMode(SECTIONS[3], "desktop").enter?.frames, [141, 161]);
  assert.deepEqual(sectionTimingForMode(SECTIONS[3], "compact").enter?.frames, [141, 161]);
});

test("banner city reserves a 20-frame virtual hold", () => {
  const section = SECTIONS.find((item) => item.id === "07-banner-city");
  assert.ok(section, "07-banner-city should exist in the timeline");
  assert.equal(section.holdFrames, 20);
});

test("financial highlights reserves a 60-frame virtual hold", () => {
  const section = SECTIONS.find((item) => item.id === "08-financial");
  assert.ok(section, "08-financial should exist in the timeline");
  assert.equal(section.holdFrames, 60);
  assert.deepEqual(section.enter?.frames, [408, 436]);
});

test("text bridge sections reserve 20-frame virtual holds", () => {
  for (const id of ["09-governance-intro", "13-banner-ocean", "15-banner-river"]) {
    const section = SECTIONS.find((item) => item.id === id);
    assert.ok(section, `${id} should exist in the timeline`);
    assert.equal(section.holdFrames, 20, `${id} virtual hold`);
  }
});

test("end screen stays fully loaded for 20 real frames without virtual frames", () => {
  const section = SECTIONS.find((item) => item.id === "19-end-screen");
  assert.ok(section, "19-end-screen should exist in the timeline");
  assert.equal(section.holdFrames ?? 0, 0);
  assert.deepEqual(section.exit?.frames, [1075, 1100]);
  assert.equal(section.virtualEnterFrames ?? 0, 0);
  assert.equal(section.virtualExitFrames ?? 0, 0);
});

test("virtual enter does not drop a section after its real enter completes", () => {
  const section = SECTIONS.find((item) => item.id === "05-intro-statement");
  assert.ok(section);
  const pxPerFrame = readPxPerFrame();
  const virtualEnterStart = scrollPxForFrame(section.settledFrame, pxPerFrame);

  const beforeVirtualEnter = sectionLayerStateAt(
    section,
    section.settledFrame,
    virtualEnterStart - 1,
    pxPerFrame,
  );
  const duringVirtualEnter = sectionLayerStateAt(
    section,
    section.settledFrame,
    virtualEnterStart + 1,
    pxPerFrame,
  );

  assert.ok(beforeVirtualEnter.opacity > 0.95);
  assert.ok(duringVirtualEnter.opacity >= beforeVirtualEnter.opacity);
});

test("virtual exit uses the section exit window while the background stays pinned", () => {
  const section = SECTIONS.find((item) => item.id === "03-approach");
  assert.ok(section);
  assert.deepEqual(section.exit?.frames, [145, 158]);

  assert.equal(sectionExitFrameAtVirtualProgress(section, 0), 145);
  assert.equal(sectionExitFrameAtVirtualProgress(section, 0.5), 151.5);
  assert.equal(sectionExitFrameAtVirtualProgress(section, 1), 158);

  const pxPerFrame = readPxPerFrame();
  const totalPx = totalScrollPx(pxPerFrame);
  let pinnedExitPx: number | null = null;
  for (let px = 0; px <= totalPx; px += 1) {
    const progress = virtualExitProgressAtScrollPx(section, px, pxPerFrame);
    if (progress !== null && progress > 0 && progress < 1) {
      pinnedExitPx = px;
      break;
    }
  }

  assert.notEqual(pinnedExitPx, null, "section should expose a virtual exit interval");
  assert.equal(frameForScrollPx(pinnedExitPx!, pxPerFrame), section.settledFrame);
});
