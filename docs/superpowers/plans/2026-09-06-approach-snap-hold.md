# Section 3 Mobile Snap-and-Hold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Section 3 use a mobile/tablet snap-and-hold transition with a frame-driven fade/slide content reveal, while preserving the existing desktop transition.

**Architecture:** Keep the shared background timeline and desktop timing unchanged. Compact mode will omit Section 3's virtual exit tail so the next swipe resumes background motion immediately after the hold. `ApproachLayer` will keep its existing frame-driven content stagger for fade/slide entrance and use the real exit window for the fade/slide exit rather than a virtual exit crawl.

**Tech Stack:** Next.js, React, TypeScript, Node's built-in test runner.

## Global Constraints

- Change Section 3 only; do not alter other section timing policies.
- Preserve desktop `virtualExitFrames: 20`.
- Preserve frame-driven, reversible animation; do not add CSS-only timing animations.
- Verify with the full test suite and production build.

---

### Task 1: Lock Section 3 timing policy with tests

**Files:**
- Modify: `tests/reporting-section-pacing.test.ts`
- Modify: `tests/timeline-mode-policy.test.ts`

**Interfaces:**
- Consumes: `sectionTimingForMode()` and Section 3 timeline data.
- Produces: Regression coverage proving compact has no virtual exit tail and desktop retains 20 frames.

- [ ] **Step 1: Write the failing assertions**

Assert compact Section 3 has zero effective virtual exit frames, desktop has 20, and frame mapping differs after the desktop-only tail.

- [ ] **Step 2: Run the focused tests**

Run: `node --experimental-strip-types --test tests/reporting-section-pacing.test.ts tests/timeline-mode-policy.test.ts`

Expected: the new compact snap-and-hold expectation fails before the implementation is complete.

### Task 2: Implement compact snap-and-hold timing

**Files:**
- Modify: `src/components/AnimationLab/timeline.ts:1139-1158`

**Interfaces:**
- Consumes: `DESKTOP_TIMING_OVERRIDES` and `sectionTimingForMode()`.
- Produces: Base compact Section 3 timing with no `virtualExitFrames`; desktop override continues to provide `virtualExitFrames: 20`.

- [ ] **Step 1: Remove the base Section 3 virtual exit value**

Leave the desktop override unchanged:

```ts
"03-approach": { holdFrames: 10, virtualExitFrames: 20 },
```

The base Section 3 object must not define `virtualExitFrames`, so compact mode resolves it as zero while desktop receives the override.

- [ ] **Step 2: Run the focused tests**

Run: `node --experimental-strip-types --test tests/reporting-section-pacing.test.ts tests/timeline-mode-policy.test.ts`

Expected: all focused tests pass.

### Task 3: Preserve Section 3 fade/slide content choreography

**Files:**
- Modify: `src/components/AnimationLab/ApproachLayer.tsx` only if focused browser inspection shows the real exit window needs adjustment.
- Test: `tests/reporting-section-pacing.test.ts`

**Interfaces:**
- Consumes: compact timing from `sectionTimingForMode()` and existing `GROUP_WINDOW`/`CHAR_WINDOW` frame-driven transforms.
- Produces: Section 3 content fades/slides in during its settled hold and fades/slides out before the next compact section begins.

- [ ] **Step 1: Verify existing frame-driven content behavior**

The current layer already applies opacity and `translateY` to title words and grouped content. With compact virtual exit removed, it must use the real `exit.frames` path instead of the virtual exit path.

- [ ] **Step 2: Add a regression assertion if behavior is not already covered**

Assert the compact policy does not create a virtual exit progress span for Section 3 while the section still retains its real exit window.

- [ ] **Step 3: Run all tests and build**

Run: `node --experimental-strip-types --test tests/*.test.ts`

Run: `pnpm build`

Expected: 80 or more tests pass with zero failures and Next.js production build succeeds.
