# Digital Settled-Frame Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Digital section 4 reach frame 161, hold the background there while its content assets load, then resume normal scrolling with a minimal 20-frame exit.

**Architecture:** Extend the existing frame loading gate rather than adding a second scroll system. Digital declares a settled-frame load gate; `AnimationLab` freezes Lenis when the active frame reaches 161 and releases it when the required Digital range is decoded. The timeline changes the Digital exit window from `161 → 176` to `161 → 181`, while `DigitalLayer` keeps its existing independent enter/settle/exit animation.

**Tech Stack:** React 19, TypeScript, Lenis, existing AnimationLab timeline and frame cache.

## Global Constraints

- Do not double the global frame count.
- Preserve normal desktop wheel and trackpad scrolling.
- Do not change the mobile-only loader behavior.
- Keep the existing Digital content animation and section markup.
- Use existing frame loading callbacks and tests; do not add a new animation library.

---

### Task 1: Lock Digital’s settled frame and exit window

**Files:**
- Modify: `src/components/AnimationLab/timeline.ts:1061-1078`
- Test: `tests/react-lint-regressions.test.ts`

**Interfaces:**
- Consumes: `SECTIONS` timeline data used by `sectionFrameRange`, `loadBufferAt`, and `useSectionLayer`.
- Produces: Digital section metadata with settled frame `161`, a load hold at that frame, and exit window `161 → 181`.

- [ ] **Step 1: Write the failing regression test**

Add this test to `tests/react-lint-regressions.test.ts`:

```ts
test("digital section settles at 161 and exits over 20 frames", () => {
  const contents = readFileSync("src/components/AnimationLab/timeline.ts", "utf8");
  const digital = contents.match(
    /id: "04-digital"[\s\S]*?loadBuffer: \{ behind: 4, ahead: 4 \}/,
  )?.[0];
  assert.ok(digital);
  assert.match(digital, /settledFrame: 161/);
  assert.match(digital, /exit:[\s\S]*?frames: \[161, 181\]/);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --experimental-strip-types --test tests/react-lint-regressions.test.ts`

Expected: the new Digital exit assertion fails because the current endpoint is `176`.

- [ ] **Step 3: Update the Digital timeline window**

Change only the Digital exit frame pair:

```ts
exit: {
  frames: [161, 181],
  to: { y: -5 },
},
```

Keep `settledFrame: 161`, `holdFrames: 20`, and the existing `loadBuffer` unchanged.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --experimental-strip-types --test tests/react-lint-regressions.test.ts`

Expected: all tests pass.

### Task 2: Add a Digital settled-frame loading gate

**Files:**
- Modify: `src/components/AnimationLab/timeline.ts:1061-1078`
- Modify: `src/components/AnimationLab/AnimationLab.tsx:679-771`
- Test: `tests/react-lint-regressions.test.ts`

**Interfaces:**
- Consumes: `handleFrameLoaded`, `loadedFramesRef`, `gatedRangeRef`, and the existing Lenis stop/start lifecycle.
- Produces: a gate that holds the scroll head at Digital frame `161` until the Digital frame window is decoded.

- [ ] **Step 1: Write the failing gate regression**

Add these assertions to the Digital test:

```ts
assert.match(digital, /loadBuffer: \{ behind: 4, ahead: 4 \}/);
assert.match(
  source("AnimationLab.tsx"),
  /DIGITAL_SETTLED_FRAME|04-digital|gatedRangeRef[\s\S]*161/,
);
```

- [ ] **Step 2: Run the focused test and verify the gate assertion fails**

Run: `node --experimental-strip-types --test tests/react-lint-regressions.test.ts`

Expected: the new explicit Digital settled-frame gate assertion fails.

- [ ] **Step 3: Implement the smallest gate change**

In `AnimationLab.tsx`, define a named Digital gate constant near the existing loading-gate constants:

```ts
const DIGITAL_SETTLED_FRAME = 161;
const DIGITAL_LOAD_BUFFER = { behind: 4, ahead: 4 };
```

In the driver subscription, when the rounded frame reaches the Digital settled frame and the Digital range is not loaded, use:

```ts
const isDigitalSettled = rounded === DIGITAL_SETTLED_FRAME;
const buffer = isDigitalSettled ? DIGITAL_LOAD_BUFFER : loadBufferAt(rounded);
```

Keep the current `gatedRangeRef` and `lenisRef.current?.stop()` behavior so the background remains painted at frame `161` and only scroll progression pauses. Do not hide `DigitalLayer` or add a second frame driver.

- [ ] **Step 4: Run focused tests and static checks**

Run:

```bash
node --experimental-strip-types --test tests/react-lint-regressions.test.ts
npx tsc --noEmit
npx eslint src/components/AnimationLab/AnimationLab.tsx src/components/AnimationLab/DigitalLayer.tsx
git diff --check
```

Expected: tests pass, TypeScript exits successfully, changed files have no errors, and diff check is clean.

### Task 3: Verify desktop behavior and regression scope

**Files:**
- Modify: none
- Test: `tests/react-lint-regressions.test.ts`

**Interfaces:**
- Consumes: the completed timeline and loading-gate behavior.
- Produces: verification evidence that the change is desktop-focused and does not alter mobile loader selection.

- [ ] **Step 1: Run the production build**

Run: `npx next build`

Expected: compilation, TypeScript, static generation, and route optimization complete successfully.

- [ ] **Step 2: Confirm mobile loader coverage remains green**

Run: `node --experimental-strip-types --test tests/react-lint-regressions.test.ts`

Expected: the mobile-only frame loader test and all existing regression tests pass.

- [ ] **Step 3: Review the final diff**

Run: `git diff --stat && git diff --check`

Expected: only the Digital timeline/gate and regression test are changed for this request; unrelated existing work remains untouched.
