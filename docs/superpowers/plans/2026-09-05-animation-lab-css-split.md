# Animation Lab CSS Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the monolithic Animation Lab stylesheet with readable shared, layout, and section-owned CSS files without changing selectors, cascade order, or visual behavior.

**Architecture:** Keep `lab.css` as a short compatibility entrypoint that imports ordered files from `styles/`. Move rules by ownership: shared tokens/base first, animation shell/layout second, then section-specific blocks. Preserve source order during extraction and keep responsive overrides with the section they modify unless they are shared across multiple sections.

**Tech Stack:** Next.js 16, React 19, global CSS.

## Global Constraints

- Do not rename existing CSS selectors.
- Do not change CSS declarations during the extraction pass.
- Keep `lab.css` import order deterministic.
- Do not change mobile/tablet animation behavior in this refactor.
- Verify with tests, TypeScript, production build, and diff checks.

---

### Task 1: Establish the stylesheet entrypoint and shared files

- **Files:**
- Create: `src/components/AnimationLab/styles/00-bridges.css`
- Create: `src/components/AnimationLab/styles/01-shared-shell.css`
- Modify: `src/components/AnimationLab/lab.css`

**Work:** Move only shared custom properties, reset-like lab rules, `.lab-*` shell rules, canvas/media/layer positioning, navigation, loading, and loop-transition rules. Preserve their original relative order in the new files. Leave section selectors in the original order for the next task.

**Verification:** `git diff --check`; compare computed selector/declaration counts before and after; run the focused test suite.

### Task 2: Move section-owned rules

- **Files:**
- Create: `src/components/AnimationLab/styles/02-main-start.css` through `20-lab-chrome.css`
- Modify: `src/components/AnimationLab/lab.css`

**Work:** Move each `.s-*` block and its directly associated media-query overrides into the matching numbered section file. Keep generic shared selectors in `01-shared-shell.css`; do not duplicate them into sections. Preserve the original file order in `lab.css` imports.

**Verification:** Search for duplicate selectors across the new files; run `npx eslint src tests`, `npx tsc --noEmit`, and all Node tests.

### Task 3: Validate the refactor and update documentation

**Files:**
- Modify: `code-audit/index.html`
- Test: existing `tests/*.test.ts`

**Work:** Update the audit to report the new stylesheet structure and current verification counts. Do not claim a reduction in total CSS lines unless duplicate removal is measured separately; report the reduced monolithic file size and the new ownership structure.

**Verification:** Run:

```bash
node --experimental-strip-types --test tests/*.test.ts
npx tsc --noEmit
npx next build
npx eslint src tests
git diff --check
```

Expected: 33 tests pass, TypeScript/build succeed, ESLint has zero errors, and only non-blocking warnings remain.
