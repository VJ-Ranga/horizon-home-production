# Mobile Financial Capital Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Section 14 a normal vertically scrolling card list on tablet and mobile while leaving desktop carousel behavior unchanged.

**Architecture:** Keep the existing `CARDS` data and desktop absolute-positioned animation. Add a compact-only normal-flow reader path while the existing compact edge handoff remains the section boundary.

**Tech Stack:** React, TypeScript, CSS media queries, Node test runner, Next.js.

## Global Constraints

- Compact means viewport width `<= 1100px`.
- Desktop carousel behavior must remain unchanged.
- Preserve all existing card content, links, imagery, and statistics.
- Do not modify unrelated worktree changes.

### Task 1: Add Compact Card-Mode Regression Tests

**Files:**
- Modify: `tests/compact-section-navigation.test.ts`
- Test source: `src/components/AnimationLab/FinancialCapitalLayer.tsx`, `src/components/AnimationLab/AnimationLab.tsx`, `src/components/AnimationLab/compactNavigation.ts`

- [ ] **Step 1: Add failing source assertions**

Assert that compact mode has a normal-flow card class/path and a compact frame no-op.

- [ ] **Step 2: Run the focused test**

Run: `node --experimental-strip-types --test tests/compact-section-navigation.test.ts`

Expected: the new assertions fail before implementation.

### Task 2: Implement Compact Normal-Flow Cards

**Files:**
- Modify: `src/components/AnimationLab/FinancialCapitalLayer.tsx`
- Modify: `src/components/AnimationLab/styles/15-financial-capital.css`

- [ ] **Step 1: Render two layout modes**

Keep the existing animated absolute card group for desktop. For compact mode, render the same `CARDS` in a `s-fincap__cards--normal` wrapper with ordinary block-flow cards; keep the intro and card markup/content unchanged.

- [ ] **Step 2: Add compact normal-flow CSS**

At `max-width: 1100px`, make the compact wrapper flow vertically, reset cards from absolute positioning, remove carousel clipping, and use readable spacing. Keep the existing desktop rules outside the media query.

- [ ] **Step 3: Run the focused test**

Run: `node --experimental-strip-types --test tests/compact-section-navigation.test.ts`

Expected: all tests pass.

### Task 3: Verify Build and Desktop Isolation

**Files:**
- No additional files.

- [ ] **Step 1: Run production build**

Run: `pnpm build`

Expected: successful TypeScript compilation and static generation.

- [ ] **Step 2: Check diff boundaries**

Run: `git diff --check` and inspect that only the Section 14 implementation, focused test, and this spec/plan are included.

- [ ] **Step 3: Commit the focused implementation**

Run: `git add src/components/AnimationLab/FinancialCapitalLayer.tsx src/components/AnimationLab/compactNavigation.ts src/components/AnimationLab/AnimationLab.tsx src/components/AnimationLab/styles/15-financial-capital.css tests/compact-section-navigation.test.ts docs/superpowers/specs/2026-09-07-mobile-financial-capital-cards-design.md docs/superpowers/plans/2026-09-07-mobile-financial-capital-cards.md && git commit -m "fix: simplify mobile financial capital cards"`
