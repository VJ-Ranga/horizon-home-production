# Mobile Tablet Audit Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a standalone, evidence-based phone/tablet audit report that separates shared desktop logic, compact logic, phone overrides, tablet overrides, section timing, symptoms, root causes, fixes, and validation status.

**Architecture:** Add one self-contained HTML report at `code-audit/mobile-tablet-audit.html`. Keep its audit data in a JavaScript array inside the file so section rows and detail cards share one source of truth; use inline CSS and vanilla JavaScript to avoid a build dependency. Do not modify application behavior or desktop code.

**Tech Stack:** HTML5, inline CSS, vanilla JavaScript, current `timeline.ts` and AnimationLab source as audit evidence.

## Global Constraints

- Scope is phone `<=700px` and tablet `701–1100px` only; desktop is reference-only and frozen.
- Report must explain the shared timeline versus phone/tablet-specific assets, layout, and interaction logic.
- Report must cover all 19 sections and explicitly document enter, settled, hold, virtual, exit, carousel, and scroll-through values.
- Report must distinguish observed evidence from open real-device validation.
- No application source files are changed by this report task.

---

### Task 1: Build the standalone audit report

**Files:**
- Create: `code-audit/mobile-tablet-audit.html`
- Reference: `src/components/AnimationLab/timeline.ts`
- Reference: `src/components/AnimationLab/AnimationLab.tsx`
- Reference: `src/components/AnimationLab/frameDirMobile.ts`
- Reference: `src/components/AnimationLab/mobileFrameGuard.ts`
- Reference: `src/components/AnimationLab/StrategyLayer.tsx`
- Reference: `src/components/AnimationLab/FinancialCapitalLayer.tsx`
- Reference: `src/components/AnimationLab/CommunityLayer.tsx`

**Interfaces:**
- The report data array contains one object per section with `id`, `label`, `settled`, `enter`, `hold`, `virtual`, `exit`, `mode`, `shared`, `phone`, `tablet`, `symptom`, `cause`, `fix`, and `status` fields.
- The report renders the overview table and detail cards from that array.
- The device filter buttons show `phone`, `tablet`, or `both` findings without page reload.

- [ ] **Step 1: Add the report shell and shared/phone/tablet model**

Create the standalone page with:
- Header chips for phone, tablet, compact shared logic, and desktop frozen scope.
- Sticky table of contents.
- A device model section explaining shared timeline values, compact ownership, phone assets, and tablet assets.
- A “what is shared / what is separate” comparison table.

- [ ] **Step 2: Add the 19-section data model and overview table**

Encode the current values from `timeline.ts`, including:
- Sections 08, 12, and 16 as park-and-hold sections.
- Sections 14 and 18 as seven-card carousels with exact pixel budgets.
- Section 17 as the 1,862px scroll-through with slowdown `2`, pin frame `933`, and 30 virtual exit frames.
- Section 19 as a 20-frame half-speed crawl.

- [ ] **Step 3: Add per-section findings and special-section deep dives**

Render detail cards that explain, in plain language:
- Why short frame windows can disappear during a fast native flick.
- Why compact outer gestures are controlled rather than fully native.
- Why inner readers can trap or release gestures at directional edges.
- Why carousel and scroll-through budgets need separate handling.
- Why phone and tablet currently share timing but use different frame/video assets.

- [ ] **Step 4: Add problems, recommendations, and validation matrix**

Include prioritized recommendations without changing source:
- Keep one compact scroll owner.
- Validate fixed one-section transitions on real iOS Safari and Android Chrome.
- Measure frame decode, dropped frames, scroll duration, and last-painted frame.
- Treat phone and tablet separately for asset memory and layout tests.
- Do not change desktop until client feedback.

- [ ] **Step 5: Add filtering and accessibility behavior**

Implement vanilla JavaScript filters for `Phone`, `Tablet`, `Shared`, `High risk`, and `Open`. Ensure buttons have accessible pressed state, keyboard focus styles, and no dependency on external assets.

- [ ] **Step 6: Verify the report**

Run:
- `git diff --check`
- Serve with `python3 -m http.server 4311 --directory code-audit`
- Check page title, section count (`19`), device filters, special-section cards, and no console errors except a missing optional favicon.
