# Section 06 Grouped Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Section 06 reveal by complete content groups with short delays, while keeping stat number count-up animation.

**Architecture:** Replace per-word, per-card, and per-video frame reveals in `GlanceLayer.tsx` with group-level refs and shared `fadeRiseAt` progress windows. The title, quote, body area, note, and pill row each receive one animation value; stat card values continue updating from the shared card progress.

**Tech Stack:** React 19, TypeScript, frame-driven timeline utilities, Node source regression tests.

## Global Constraints

- Only Section 06 behavior changes.
- Do not add GSAP or new runtime dependencies.
- All four stat cards must enter together.
- Stat numbers retain frame-driven count-up.
- Resource buttons must enter together.
- Preserve hover, focus, dialog, responsive, and reduced-motion behavior.

---

### Task 1: Add Grouped Animation Regression Coverage

**Files:**
- Modify: `tests/glance-pills-animation.test.ts`
- Create: `tests/glance-grouped-animation.test.ts`

**Interfaces:**
- Consumes: `GlanceLayer.tsx` source text.
- Produces: Regression checks that child stagger refs/windows are absent and group refs/windows are present.

- [ ] **Step 1: Add source assertions**

Assert that `titleWordRefs`, `statRefs`, `noteRef`, and `videoRef` are not used for independent animation, while the grouped reveal implementation contains explicit group refs and group timing windows.

- [ ] **Step 2: Run the focused check**

Run: `node --test tests/glance-grouped-animation.test.ts`

Expected: FAIL before the implementation because the current source still contains individual animation refs.

### Task 2: Implement Grouped Section 06 Reveal

**Files:**
- Modify: `src/components/AnimationLab/GlanceLayer.tsx:17-440`

**Interfaces:**
- Consumes: `useSectionLayer`, `useFrameEffect`, `fadeRiseAt`, and `STATS`.
- Produces: Group-level opacity/translation for title, quote, body, note, and pills; count-up values for all stats.

- [ ] **Step 1: Replace individual refs and timing windows**

Use refs for the complete groups: title element, quote element, body container, note element, and pills list. Keep one shared stats progress value for count-up, without assigning opacity or transform to individual cards.

Use delayed group windows inside the Section 06 entrance and exit ranges:

```ts
const TITLE_WINDOW: [number, number] = [263, 266];
const QUOTE_WINDOW: [number, number] = [265, 268];
const BODY_WINDOW: [number, number] = [267, 271];
const NOTE_WINDOW: [number, number] = [269, 273];
const PILLS_WINDOW: [number, number] = [271, 275];
```

Each group uses `fadeRiseAt(frame, entering, enterWindow, exitWindow)`. The body group uses its progress for card count-up only; all cards remain visually controlled by the body wrapper.

- [ ] **Step 2: Move refs to group elements**

Attach the title ref to the heading, the body ref to the existing body wrapper, the note ref to the note, and the pills ref to the `<ul>`. Remove per-word and per-card animation refs and ref callbacks.

- [ ] **Step 3: Keep count-up behavior**

For each stat value, set only its text content from the shared body progress. Do not set card opacity or transform inside the stats loop.

- [ ] **Step 4: Run TypeScript validation**

Run: `pnpm exec tsc --noEmit --incremental false`

Expected: pass with no TypeScript errors.

### Task 3: Verify the Final Change

**Files:**
- Inspect: `src/components/AnimationLab/GlanceLayer.tsx`
- Inspect: `tests/glance-grouped-animation.test.ts`

- [ ] **Step 1: Run source and whitespace checks**

Run: `git diff --check`

Expected: no output.

- [ ] **Step 2: Inspect the diff**

Confirm only Section 06 animation logic and its focused regression coverage changed; do not revert unrelated worktree changes.

- [ ] **Step 3: Report known tooling limitation**

If the focused TypeScript test cannot run because `tsx` is unavailable, report that limitation while retaining the source regression test for the repository’s available test runner.
