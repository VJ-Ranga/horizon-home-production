# Compact Section Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure fast phone/tablet gestures advance at most one section while preserving inner reader scrolling and edge handoff.

**Architecture:** Keep section targeting in `AnimationLab.tsx`, using the shared frame timeline and settled frames. Add a compact outer-gesture lock that intercepts only gestures outside `[data-lenis-prevent]`; inner readers retain their current handlers and scroll behavior. Use a direction-only target and a bounded transition lock so input magnitude and momentum cannot skip sections.

**Tech Stack:** Next.js 16, React 19, TypeScript, native touch/wheel events, Node test runner.

## Global Constraints

- Desktop navigation and timing remain unchanged.
- Inner content readers remain normally scrollable, including existing edge handoff.
- Mobile/tablet outer gestures advance at most one section.
- Use existing `SECTIONS`, `sectionFrameRange`, `frameForScrollPx`, `scrollYForFrame`, and `settledFrame` values as the timeline source of truth.
- Do not add dependencies or change section markup/CSS.

---

### Task 1: Add compact navigation regression tests

**Files:**
- Modify: `tests/react-lint-regressions.test.ts`
- Create: `tests/compact-section-navigation.test.ts`

**Interfaces:**
- Tests inspect the compact navigation source and the pure direction/target behavior exposed through source-level invariants, matching the repository's existing test style.

- [ ] **Step 1: Write failing tests for direction-only navigation and locking**

Add tests that require `AnimationLab.tsx` to contain:

```ts
assert.match(source, /compactNavigationLockRef/);
assert.match(source, /event\.preventDefault\(\)/);
assert.match(source, /closest\("\[data-lenis-prevent\]"\)/);
assert.match(source, /targetFrame.*settledFrame/);
assert.match(source, /wheel.*passive: false/);
```

Also require a focused helper test fixture or exported pure helper with these cases:

```ts
assert.equal(nextCompactSectionFrame(100, [50, 150, 250], 1), 150);
assert.equal(nextCompactSectionFrame(249, [50, 150, 250], 1), 250);
assert.equal(nextCompactSectionFrame(249, [50, 150, 250], -1), 150);
assert.equal(nextCompactSectionFrame(50, [50, 150, 250], -1), null);
```

- [ ] **Step 2: Run the focused tests and confirm failure**

Run:

```bash
node --experimental-strip-types --test tests/compact-section-navigation.test.ts tests/react-lint-regressions.test.ts
```

Expected: FAIL because the compact lock, non-passive wheel listener, and direction-only helper do not yet exist.

- [ ] **Step 3: Commit the failing tests**

```bash
git add tests/compact-section-navigation.test.ts tests/react-lint-regressions.test.ts
git commit -m "test: define compact section navigation behavior"
```

### Task 2: Implement one-section-per-gesture navigation

**Files:**
- Modify: `src/components/AnimationLab/AnimationLab.tsx:532-585`
- Create or modify: `src/components/AnimationLab/compactNavigation.ts`

**Interfaces:**
- `nextCompactSectionFrame(currentFrame: number, settledFrames: number[], direction: 1 | -1): number | null` returns the nearest settled frame strictly ahead or behind the current frame.
- The compact effect owns `compactNavigationLockRef`, touch gesture state, wheel lock state, and the programmatic scroll target.

- [ ] **Step 1: Add the pure target helper**

Implement:

```ts
export function nextCompactSectionFrame(
  currentFrame: number,
  settledFrames: number[],
  direction: 1 | -1,
): number | null {
  const candidates = direction > 0
    ? settledFrames.filter((frame) => frame > currentFrame + 1)
    : settledFrames.filter((frame) => frame < currentFrame - 1).reverse();
  return candidates[0] ?? null;
}
```

- [ ] **Step 2: Replace the outer touch handler with a locked gesture flow**

For touch gestures that do not start inside `[data-lenis-prevent]`:

```ts
if (compactNavigationLockRef.current) {
  event.preventDefault();
  return;
}
```

Use the touch direction only, call `preventDefault()` during the outer gesture, compute the current shared frame from `startScrollY`, find one target settled frame, set the lock, and call `scrollTo(targetY, { duration: 0.55 })`. Do not derive the target from the touch delta magnitude.

- [ ] **Step 3: Add wheel handling for tablet/trackpad input**

Register the compact outer wheel listener with `{ passive: false }`. Ignore wheel events whose target is inside `[data-lenis-prevent]`. For outer wheel input, call `preventDefault()`, classify `deltaY` as `1` or `-1`, and target only one adjacent settled frame. While locked, prevent default and ignore further wheel momentum.

- [ ] **Step 4: Release the lock safely**

Release the lock when the driver reports the requested target frame, or after a bounded `900ms` safety timeout. Clear all timers and listeners in the effect cleanup. Reset the requested target when compact mode or scroll phase changes.

- [ ] **Step 5: Run focused tests**

Run:

```bash
node --experimental-strip-types --test tests/compact-section-navigation.test.ts tests/react-lint-regressions.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the implementation**

```bash
git add src/components/AnimationLab/AnimationLab.tsx src/components/AnimationLab/compactNavigation.ts tests/compact-section-navigation.test.ts tests/react-lint-regressions.test.ts
git commit -m "fix: lock compact navigation to one section"
```

### Task 3: Verify compact overlap and full behavior

**Files:**
- Modify only if a verified regression is found: relevant AnimationLab component or test file.

- [ ] **Step 1: Run all automated tests**

```bash
node --experimental-strip-types --test tests/*.test.ts
pnpm exec tsc --noEmit --incremental false
```

Expected: all tests pass and TypeScript exits successfully.

- [ ] **Step 2: Build the production app**

```bash
pnpm build
```

Expected: Next.js production build completes successfully.

- [ ] **Step 3: Verify phone and tablet manually**

At `/animation-lab`, test viewport widths `390px` and `768px`:

1. Perform a very fast upward outer swipe/wheel burst. Confirm exactly one section changes.
2. Repeat input during the transition. Confirm it does not skip another section.
3. Scroll an inner reader. Confirm it reaches its edge normally.
4. Gesture again at the reader edge. Confirm exactly one section changes.
5. Check first/last section boundaries for invalid jumps or overlap.
6. Confirm only one `.lab-layer` is visible at each settled section.

- [ ] **Step 4: Run formatting/error checks**

```bash
git diff --check
pnpm exec eslint src/components/AnimationLab/AnimationLab.tsx src/components/AnimationLab/compactNavigation.ts tests/compact-section-navigation.test.ts tests/react-lint-regressions.test.ts
```

Expected: no errors; existing non-blocking warnings may remain.
