import assert from "node:assert/strict";
import test from "node:test";
import * as mobileAssets from "../src/components/AnimationLab/frameDirMobile.ts";

type IntroAssetPlan = {
  frameDir: string;
  preloadFrameCount: number;
  videoSrc: string;
};

type GetIntroAssetPlan = (
  phone: boolean,
  totalFrameCount: number,
) => IntroAssetPlan;

const getIntroAssetPlan = (
  mobileAssets as typeof mobileAssets & {
    getIntroAssetPlan?: GetIntroAssetPlan;
  }
).getIntroAssetPlan;

test("mobile intro uses only mobile assets and limits its preload to the hero entry", () => {
  assert.equal(typeof getIntroAssetPlan, "function");
  const plan = getIntroAssetPlan!(true, 1125);

  assert.deepEqual(plan, {
    frameDir: "/frames-mobile",
    preloadFrameCount: 50,
    videoSrc: "/video-mobile/intro-540x960.mp4",
  });
});

test("desktop intro retains its existing asset and preload plan", () => {
  assert.equal(typeof getIntroAssetPlan, "function");
  const plan = getIntroAssetPlan!(false, 1125);

  assert.deepEqual(plan, {
    frameDir: "/frames",
    preloadFrameCount: 281,
    videoSrc: "/hero/intro.mp4",
  });
});

test("tablet intro uses the tablet frame and video assets", () => {
  assert.equal(typeof getIntroAssetPlan, "function");
  const plan = getIntroAssetPlan!(false, 1125, true);

  assert.deepEqual(plan, {
    frameDir: "/frames-tablet",
    preloadFrameCount: 50,
    videoSrc: "/video-tablet/intro-1280x800.mp4",
  });
});
