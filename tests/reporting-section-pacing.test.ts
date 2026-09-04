import assert from "node:assert/strict";
import test from "node:test";
import {
  SECTIONS,
  readPxPerFrame,
  scrollPxForFrame,
  sectionLayerStateAt,
} from "../src/components/AnimationLab/timeline.ts";

test("reporting sections reserve readable enter, hold, and exit time", () => {
  for (const id of ["02-main-02", "03-approach", "04-digital", "05-intro-statement"]) {
    const section = SECTIONS.find((item) => item.id === id);
    assert.ok(section, `${id} should exist in the timeline`);
    assert.equal(section.holdFrames, 20, `${id} settled hold`);
    assert.equal(
      section.virtualExitFrames ?? 0,
      id === "03-approach" ? 20 : id === "05-intro-statement" ? 14 : 0,
      `${id} virtual exit`,
    );
    assert.equal(
      section.virtualEnterFrames ?? 0,
      id === "05-intro-statement" ? 10 : 0,
      `${id} virtual enter`,
    );
  }
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
