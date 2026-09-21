# First Six Compact Timing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the first six post-hero sections a shared compact timing contract of 10 virtual enter frames, 10 hold frames, and 10 virtual exit frames while preserving continuous scroll mapping.

**Architecture:** Add compact-only timing overrides in `timeline.ts`; desktop continues to use its existing timing. Make compact navigation read the same mode-specific section timing so ordinary sections transition using the shared scroll distance rather than treating their virtual timing as separate special gestures. Keep true carousels and scroll-through panels as special budgets.

**Tech Stack:** React 19, TypeScript, Next.js, Node test runner, existing AnimationLab timeline helpers.

## Global Constraints

- Desktop timing and Lenis behavior must not change.
- Compact phone and tablet use the same `14px/frame` continuous timeline mapping.
- Sections 2–6 use `virtualEnterFrames: 10`, `holdFrames: 10`, and `virtualExitFrames: 10` in compact mode.
- Hero frame 50 remains the compact scroll handoff.
- True carousel and scroll-through budgets remain special sections.
- No new dependency is allowed.

---

### Task 1: Add compact timing overrides

**Files:**
- Modify: `src/components/AnimationLab/timeline.ts:1050-1073`
- Test: `tests/compact-section-navigation.test.ts`

**Interfaces:**
- `sectionTimingForMode(section, "compact")` returns a section copy with compact-only virtual timing for `02-main-02` through `06-key-data-points`.
- `sectionTimingForMode(section, "desktop")` keeps the existing desktop overrides unchanged.

- [ ] **Step 1: Write the failing test**

Add a test that imports `sectionTimingForMode` and asserts each first-six section after the hero returns `10`, `10`, and `10` for virtual enter, hold, and virtual exit in compact mode, while the desktop result remains unchanged for `03-approach`.

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/compact-section-navigation.test.ts`

Expected: FAIL because compact timing currently returns the base section unchanged.

- [ ] **Step 3: Implement the minimal override**

Add a `COMPACT_TIMING_OVERRIDES` map containing:

```ts
const COMPACT_TIMING_OVERRIDES: Record<string, Partial<SectionTimeline>> = {
  "02-main-02": { virtualEnterFrames: 10, holdFrames: 10, virtualExitFrames: 10 },
  "03-approach": { virtualEnterFrames: 10, holdFrames: 10, virtualExitFrames: 10 },
  "04-digital": { virtualEnterFrames: 10, holdFrames: 10, virtualExitFrames: 10 },
  "05-intro-statement": { virtualEnterFrames: 10, holdFrames: 10, virtualExitFrames: 10 },
  "06-key-data-points": { virtualEnterFrames: 10, holdFrames: 10, virtualExitFrames: 10 },
};
```

Update `sectionTimingForMode` to merge compact overrides only when `mode === "compact"`; retain the existing desktop branch exactly.

- [ ] **Step 4: Run the focused test**

Run: `node --test tests/compact-section-navigation.test.ts`

Expected: PASS.

### Task 2: Use compact timing in navigation targets

**Files:**
- Modify: `src/components/AnimationLab/AnimationLab.tsx:580-620`
- Test: `tests/compact-section-navigation.test.ts`

**Interfaces:**
- Compact navigation uses `sectionTimingForMode(section, "compact")` when calculating section settled positions and special budgets.
- Carousel and scroll-through sections remain the only special-budget paths.

- [ ] **Step 1: Write the failing regression assertion**

Add a source assertion that the compact navigation block calls `sectionTimingForMode` for compact section timing.

- [ ] **Step 2: Run the focused test**

Run: `node --test tests/compact-section-navigation.test.ts`

Expected: FAIL because the navigation block currently reads raw `SECTIONS` timing.

- [ ] **Step 3: Implement the shared timing read**

Import `sectionTimingForMode`, map the navigation section list to compact-timed sections, and use those values for settled-frame and special-budget calculations. Do not add holds to the special-budget condition; only `carousel` and `scrollThrough` sections remain special.

- [ ] **Step 4: Run focused tests and build**

Run: `node --test tests/compact-section-navigation.test.ts tests/react-lint-regressions.test.ts` and `pnpm build`

Expected: tests pass and Next.js completes TypeScript compilation successfully.

### Task 3: Verify first-six timing invariants

**Files:**
- Modify: `tests/react-lint-regressions.test.ts`

- [ ] **Step 1: Add source-level safeguards**

Assert that compact timing contains all five section IDs and that desktop overrides remain present. Assert that compact navigation retains `event.preventDefault()` and `passive: false` listeners.

- [ ] **Step 2: Run verification**

Run: `node --test tests/compact-section-navigation.test.ts tests/react-lint-regressions.test.ts` and `git diff --check`

Expected: all tests pass and `git diff --check` prints no output.

### Task 4: Final verification

**Files:**
- No additional files.

- [ ] **Step 1: Run the production build**

Run: `pnpm build`

Expected: Next.js compiles successfully and TypeScript completes without errors.

- [ ] **Step 2: Review the final diff**

Run: `git diff --stat`, `git diff --check`, and `git status --short`.

Expected: only the intended timeline, navigation, and test files are modified.
