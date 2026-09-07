# Mobile Native Section Readers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mobile readers in Sections 12, 14, 16, 17, and 18 move naturally within their content, release only at real content edges, and avoid autoplay or section-length padding.

**Architecture:** The compact navigation layer will identify the target section roots as native readers and only intercept an outward gesture when the reader is at its edge. Leadership and Strategy will stop applying frame-driven content transforms on phones; their natural content height plus 40px padding will define the reader range. The Capitals slider will retain its existing card renderer but stop using section-jump logic for gestures inside the slider.

**Tech Stack:** React 19, TypeScript, CSS, Node test runner, Next.js build.

## Global Constraints

- Sections 2, 7, and 8 are out of scope.
- Finger movement must never seek to a section end or advance multiple cards.
- Section 14 remains user-controlled with no autoplay.
- Desktop and tablet behavior remain unchanged.
- Target readers get approximately 40px bottom breathing room, not artificial full-viewport minimum space.

---

### Task 1: Lock Native Reader Contracts With Tests

**Files:**
- Modify: `tests/compact-section-navigation.test.ts`
- Modify: `tests/react-lint-regressions.test.ts`
- Modify: `tests/reporting-section-pacing.test.ts`

**Interfaces:**
- Tests consume the existing `readerConsumesScroll`, timeline source, and layer source strings.
- Tests produce regression coverage for target reader selectors, edge release, and the absence of mobile auto-seek paths.

- [ ] **Step 1: Add failing assertions**

Assert that compact navigation recognizes `.s-leadership5`, `.s-fincap`, `.s-nonfinancial9`, `.s-strategy`, and `.s-community` as native reader roots, and assert that phone Leadership/Strategy layers do not write frame-driven `translate3d` transforms.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
node --experimental-strip-types --test tests/compact-section-navigation.test.ts tests/react-lint-regressions.test.ts tests/reporting-section-pacing.test.ts
```

Expected: the new reader-contract assertions fail against the current section-specific implementations.

- [ ] **Step 3: Keep the assertions narrow**

Do not assert exact CSS formatting. Assert behavior markers: target selector membership, `readerConsumesScroll` edge semantics, and no phone-only frame transform owner for native readers.

- [ ] **Step 4: Re-run to preserve the failing baseline**

Run the same command and record the specific failing assertion names before implementation.

---

### Task 2: Centralize Compact Native Reader Handoff

**Files:**
- Modify: `src/components/AnimationLab/AnimationLab.tsx`
- Modify: `src/components/AnimationLab/compactNavigation.ts`

**Interfaces:**
- `nativeCompactReaderSelector(): string` returns the target root selector used by touchstart and wheel handling.
- `readerConsumesScroll(scrollTop, clientHeight, scrollHeight, direction): boolean` remains the single edge predicate.

- [ ] **Step 1: Add the shared selector helper**

Create one exported selector constant/helper containing the five target roots and the existing reader selectors. Use it for both touch and wheel event target lookup so the two paths cannot diverge.

- [ ] **Step 2: Remove target-section special auto-seeking**

Do not call `compactSpecialTargetScrollPx` for Sections 12, 16, or 17 when the gesture begins inside their native root. While the reader can consume movement, allow the browser to scroll it. At an outward edge, call normal adjacent-section navigation only.

- [ ] **Step 3: Preserve the existing Capitals card slider path**

Keep Section 14's existing card budget/rendering untouched except for preventing the outer handler from converting an inside-slider gesture into a multi-section jump. Do not add timers, autoplay, or forced card targets.

- [ ] **Step 4: Run the focused tests**

Run the Task 1 command. Expected: all new and existing navigation tests pass.

---

### Task 3: Make Leadership and Strategy Content Native on Phones

**Files:**
- Modify: `src/components/AnimationLab/LeadershipLayer.tsx`
- Modify: `src/components/AnimationLab/StrategyLayer.tsx`
- Modify: `src/components/AnimationLab/styles/17-leadership-replacement-strategy.css`
- Modify: `src/components/AnimationLab/styles/13-leadership.css`

**Interfaces:**
- Phone layout owns movement through native overflow; frame effects may continue to update visibility/background state but must not translate the content body/panel on phones.

- [ ] **Step 1: Remove Leadership phone transform ownership**

On `max-width: 700px`, stop writing `body.style.transform`. Make the Leadership root the native vertical reader, preserve its natural content height, and add only `padding-bottom: 40px`.

- [ ] **Step 2: Remove Strategy phone transform ownership**

On `max-width: 700px`, stop writing the panel `translate3d`. Make the Strategy root scrollable, let the panel remain in normal flow, and add only 40px bottom padding.

- [ ] **Step 3: Keep non-phone paths unchanged**

Retain existing tablet and desktop transforms, layout, and timeline behavior.

- [ ] **Step 4: Run focused tests and build**

Run:

```bash
node --experimental-strip-types --test tests/compact-section-navigation.test.ts tests/react-lint-regressions.test.ts tests/reporting-section-pacing.test.ts
pnpm build
```

Expected: all tests pass and TypeScript/build validation succeeds.

---

### Task 4: Normalize Section Heights and Reachability

**Files:**
- Modify: `src/components/AnimationLab/styles/15-financial-capital.css`
- Modify: `src/components/AnimationLab/styles/11-nonfinancial-carousel.css`
- Modify: `src/components/AnimationLab/styles/18-community.css`
- Modify: `src/app/globals.css`

**Interfaces:**
- Target root readers use `max-height: 100dvh`, `overflow-y: auto`, native touch scrolling, and 40px bottom padding only where needed.

- [ ] **Step 1: Remove artificial mobile minimum-height/empty tail rules**

Change only target mobile selectors that create excess blank travel. Do not alter desktop declarations or Sections 2, 7, and 8.

- [ ] **Step 2: Add the same edge handoff behavior to Section 18**

Ensure the community reader releases an outward gesture at `scrollTop === 0` or `scrollTop === maxScrollTop` instead of trapping the page.

- [ ] **Step 3: Verify the target selectors have one scroll owner**

Search for duplicate `preventDefault`, `scrollTo`, `scrollTop`, and transform writes affecting the five target roots. Remove only duplicates that compete with the shared native reader policy.

- [ ] **Step 4: Run the full test suite and build**

Run:

```bash
pnpm test
pnpm build
```

Expected: all tests pass and the production build completes successfully.

---

### Task 5: Verify, Review, and Push

**Files:**
- Review only: all files modified in Tasks 1-4.

- [ ] **Step 1: Inspect the final diff**

Run:

```bash
git diff --check
git diff --stat
git status --short
```

Confirm no unrelated End Screen, debug asset, or generated files are staged.

- [ ] **Step 2: Commit the implementation**

```bash
git add src/components/AnimationLab/AnimationLab.tsx src/components/AnimationLab/compactNavigation.ts src/components/AnimationLab/LeadershipLayer.tsx src/components/AnimationLab/StrategyLayer.tsx src/components/AnimationLab/styles/17-leadership-replacement-strategy.css src/components/AnimationLab/styles/13-leadership.css src/components/AnimationLab/styles/15-financial-capital.css src/components/AnimationLab/styles/11-nonfinancial-carousel.css src/components/AnimationLab/styles/18-community.css src/app/globals.css tests/compact-section-navigation.test.ts tests/react-lint-regressions.test.ts tests/reporting-section-pacing.test.ts
git commit -m "fix: normalize mobile section readers"
```

- [ ] **Step 3: Push and verify**

```bash
git push origin main
```

Expected: `origin/main` points to the new implementation commit.
