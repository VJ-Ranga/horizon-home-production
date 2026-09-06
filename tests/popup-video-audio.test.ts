import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const backgroundMusic = readFileSync(
  new URL("../src/components/BackgroundMusic.tsx", import.meta.url),
  "utf8",
);

test("background music pauses for popup videos and resumes only when it was playing", () => {
  assert.match(backgroundMusic, /data-bg-music-audio/);
  assert.match(backgroundMusic, /horizon:popup-video/);
  assert.match(backgroundMusic, /audio\.pause\(\)/);
  assert.match(backgroundMusic, /resumeAfterPopupRef/);
  assert.match(backgroundMusic, /popupOpenRef/);
  assert.match(backgroundMusic, /state === "close"[\s\S]*resumeAfterPopupRef\.current/);
  assert.match(backgroundMusic, /resumeAfterPopupRef\.current = false;[\s\S]*tryPlay\(\)/);
  assert.match(backgroundMusic, /if \(!next && !popupOpenRef\.current\) tryPlay\(\)/);
});

for (const file of ["HeroLayer.tsx", "ApproachLayer.tsx", "GlanceLayer.tsx"]) {
  test(`${file} notifies background music when its popup opens and closes`, () => {
    const source = readFileSync(
      new URL(`../src/components/AnimationLab/${file}`, import.meta.url),
      "utf8",
    );
    assert.match(source, /notifyPopupVideo\("open"\)/);
    assert.match(source, /notifyPopupVideo\("close"\)/);
  });
}
