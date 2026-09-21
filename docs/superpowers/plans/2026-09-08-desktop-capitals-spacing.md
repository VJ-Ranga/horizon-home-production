# Desktop Capitals Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Widen the Section 14 intro copy and add 30px of desktop-only space before the capital card.

**Architecture:** Add one desktop media-query override in the existing Section 14 stylesheet. Compact tablet and phone rules remain unchanged.

**Tech Stack:** CSS, Next.js animation lab, Playwright browser verification.

## Global Constraints

- Desktop means `min-width: 1101px`.
- Tablet and phone layout must remain unchanged.
- Do not change card animation, timeline values, or copy.

---

### Task 1: Add Desktop Intro Spacing

**Files:**
- Modify: `src/components/AnimationLab/styles/15-financial-capital.css`

- [ ] **Step 1: Add the desktop-only overrides**

Add after the base Section 14 rules and before the compact media query:

```css
@media (min-width: 1101px) {
  .s-fincap__intro {
    width: 100%;
    bottom: calc(50% + clamp(120px, 19.2svh, 200px) + 50px);
  }

  .s-fincap__lede {
    max-width: none;
  }
}
```

- [ ] **Step 2: Verify desktop and laptop viewports**

Run the app and inspect Section 14 at `1440x900` and `1366x768`. Confirm the intro copy is wider and the card-to-copy gap is approximately 30px larger.

- [ ] **Step 3: Verify compact protection**

Inspect at `1024x768` and `390x844`. Confirm the compact rules still control the intro width and spacing.

- [ ] **Step 4: Run checks**

Run `pnpm build` and `git diff --check`. Expected: build succeeds and diff check has no output.
