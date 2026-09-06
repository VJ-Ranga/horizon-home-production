# Mobile Animation Audit

**Project:** Horizon Home / Haycarb Annual Report
**Audit date:** 2026-09-06
**Scope:** Compact/mobile timeline after the mobile implementation was introduced
**Code state audited:** `main` at `9d92363`

## Executive Summary

The mobile implementation currently combines three different timing systems:

1. The shared piecewise frame timeline in `timeline.ts`.
2. Compact navigation durations in `compactNavigation.ts` and `AnimationLab.tsx`.
3. Section-specific raw-scroll readers in carousel and scroll-through layers.

These systems do not always consume the same distance. That produces the reported symptoms:

- Some sections appear stuck because a virtual hold is traversed without a dedicated mobile gesture.
- Some transitions are too fast because a delayed native scroll event is multiplied by the compact input scale.
- Some sections are too slow because transition duration is based on logical frame distance rather than actual piecewise scroll distance.
- Long sections require many full-screen swipes, while short sections can still require a complete navigation lock.
- Fast flicks can put raw `scrollPx` ahead of the emitted, frame-limited visual frame.
- Digital -> Intro Statement (`04 -> 05`) is currently a `161 -> 255` transition and is calculated as approximately `6.03s`.
- Entry startup runs at approximately `10.38fps` because `ENTRY_SPEED` is `2`, while the nearby comments describe a selected speed above `4`.

This document is an audit only. No animation code was changed for this report.

## Measurement Rules

- `PX_PER_FRAME_DEFAULT = 14px`.
- Compact transition rate is `15.5766fps`.
- A "swap" means one large compact swipe/navigation gesture.
- Swipe estimates use approximately `800px` per full mobile swipe. Actual browser touch distance varies.
- Estimated section pixels include normal frame travel, crawl legs, virtual legs, and special carousel/scroll-through budgets where applicable.
- Frame ranges below are the current compact section values. Desktop overrides are not included unless noted.

## Section Map

| # | Section | Settled | Enter | Exit | Virtual E/H/X | Crawl | Est. px | Est. swaps | Status |
|---:|---|---:|---|---|---|---|---:|---:|---|
| 1 | Hero | 50 | autoplay to 50 | 50-70 | 0/20/0 | none | 560 | 1 | Short; expected one swap |
| 2 | Main 02 | 90 | 70-90 | 91-105 | 0/20/0 | 4f at 2x + ramp | 910 | 2 | Short section but over one swap |
| 3 | Approach | 134 | 114-134 | 145-158 | 0/20/20 | 4f at 6x | 1,736 | 3 | Long reader section |
| 4 | Digital | 161 | 141-161 | 161-181 | 0/20/0 | 4f at 6x | 1,680 | 3 | Digital handoff is too long |
| 5 | Intro Statement | 255 | 245-255 | 255-269 | 10/20/14 | none | 952 | 2 | Startup/entry jitter risk |
| 6 | Key Data Points | 275 | 263-275 | 279-280 | 0/20/20 | 9f at 6x | 2,058 | 3 | Large crawl around reveal |
| 7 | Banner City | 335 | 322-335 | 335-371 | 10/20/10 | 4f at 6x | 1,806 | 3 | Long for a banner |
| 8 | Financial Highlights | 436 | 408-436 | 448-454 | 0/60/20 | 16f at 6x | 4,004 | 6 | Very long; frame 420-436 is intentionally slow |
| 9 | Governance Intro | 511 | 490-511 | 511-520 | 10/20/20 | 4f at 6x | 1,680 | 3 | Virtual timing not separately navigated |
| 10 | Governance | 533 | 520-533 | 533-540 | 15/30/20 | 4f at 6x | 1,750 | 3 | Dense hold; needs deliberate pacing |
| 11 | Governance Cards | 540 | 535-540 | 540-550 | 20/40/20 | 4f at 6x | 1,610 | 3 | Dense cards; short real frame range |
| 12 | Leadership | 555 | 553-555 | 555-575 | 0/60/20 | 4f at 6x | 1,988 | 3 | Long content and handoff tail |
| 13 | Banner Ocean | 650 | 642-650 | 650-665 | 20/20/20 | 4f at 6x | 1,722 | 3 | Banner has 60 virtual frames |
| 14 | Capitals Management | 675 | 665-675 | 675-693 | 20/0/20 | carousel 3,210px | 4,442 | 6 | Card carousel; highest priority |
| 15 | Banner River | 782 | 762-782 | 782-802 | 40/20/0 | none | 1,400 | 2 | 40-frame virtual text entry |
| 16 | Non-Financial | 845 | 843-845 | 857-863 | 0/60/20 | 4f at 6x | 1,960 | 3 | Long static/card hold |
| 17 | Strategy | 890 | 870-890 | 933-963 | 0/0/30 | scroll-through 1,862px | 2,702 | 4 | Long panel; content must finish before fade |
| 18 | Community | 1,020 | 1,015-1,020 | 1,038-1,054 | 10/0/10 | carousel 3,756px | 4,862 | 7 | Longest carousel section |
| 19 | End Screen | 1,055 | 1,035-1,055 | 1,075-1,100 | 0/0/0 | 20f at 2x | 1,470 | 2 | End section has long crawl |

## Requested Swap Rules

The desired rule is not "one swipe for every frame range". It is a section policy:

| Transition | Desired mobile action | Current risk |
|---|---|---|
| Hero -> Main 02 | 1 swipe | Main 02 is estimated at 2 swaps |
| Main 02 -> Approach | 1 swipe | Approach has a 20f hold and 20f virtual exit |
| Approach -> Digital | 1 swipe | Digital is estimated at 3 swaps |
| Digital -> Intro Statement | 1 swipe, smooth | Current logical frame distance is 94 frames and transition is about 6.03s |
| Intro -> Key Data | 1 swipe | Virtual enter/hold/exit is not independently navigated |
| Financial Highlights | Multiple intentional swipes or a bounded reading hold | About 4,004px; six full swipes is too long if treated as one lock |
| Leadership -> Ocean | 1 handoff after content is readable | Final content glide and virtual exit tail can feel empty |
| Ocean -> Capitals | Enter in one swipe, then card movement | Capital carousel must not run as an unusable long auto-transition |
| Capitals cards | One controlled card step at a time or a bounded card gesture | Current full carousel budget is 3,210px |
| River -> Non-Financial | 1 swipe | River has 40 virtual enter frames |
| Non-Financial -> Strategy | 1 swipe after card interaction | 80 pinned frame-equivalents create a long section |
| Strategy | 2-4 controlled content gestures | Panel is 1,862px and can feel slow or short at edges |
| Community | One controlled story step at a time | Current carousel budget is 3,756px, about seven swipes |
| Community -> End Screen | 1 handoff | End screen crawl can make the final handoff feel stuck |

The exact final swipe count must be confirmed by interaction testing on the target phone. The estimates above identify where the current mapping cannot provide a predictable one-gesture handoff.

## Defect Register

### M-01: Digital -> Intro transition duration is frame-distance based

**Evidence:** `compactNavigation.ts:98-105`, `AnimationLab.tsx:684-693`.

`compactTransitionDurationMs()` uses:

```text
abs(targetFrame - currentFrame) / 15.5766 * 1000
```

For `161 -> 255`, that is approximately `6.03s`. The actual timeline includes pinned and crawl legs, so logical frame distance is not a reliable duration input.

**Symptom:** stop, long move, stop; the handoff does not feel continuous.

### M-02: Startup runs at approximately 10.38fps

**Evidence:** `timeline.ts:121-131`, `timeline.ts:163-164`.

The selected startup speed is effectively `2`, producing approximately `49 frames / 4.72s = 10.38fps`. The report requirement describes the startup as a 10-20 frame animation with visible stop-go-stop behavior.

**Symptom:** first section startup does not look continuous.

### M-03: Raw scroll and emitted frame can use different positions

**Evidence:** `useFrameTimeline.ts:203-219`.

Compact mode limits the emitted frame during a fast flick but intentionally preserves raw `scrollPx`. Section opacity uses the emitted frame while carousel/scroll-through layers use raw scroll. This creates two clocks.

**Symptoms:** a section can look stuck while its raw content has moved, or content can appear ahead of the background.

### M-04: Virtual holds are not uniformly treated as compact navigation stops

**Evidence:** `AnimationLab.tsx:584-600`.

The current special-section detector handles carousel, scroll-through, and Leadership, but not every section with virtual enter/hold/exit time. Financial, Governance, Glance, and Non-Financial can therefore be crossed as part of an adjacent section transition.

**Symptoms:** some sections are too short, while others feel like a long empty scroll.

### M-05: Capitals Management is a long raw carousel budget

**Evidence:** `timeline.ts:1471-1482`, `FinancialCapitalLayer.tsx`.

The carousel has seven cards and `3,210px` of card budget, before virtual entry/exit and crawl legs. A full transition can require roughly six full swipes. The section must be intentionally split into readable card steps or its distance must be bounded for compact mode.

### M-06: Community is even longer than Capitals Management

**Evidence:** `timeline.ts:1628-1636`, `CommunityLayer.tsx:165-184`.

Community has a `3,756px` carousel budget and mobile start/end dead zones. The visible movement and outer budget do not use exactly the same travel distance.

**Symptoms:** the final cards may feel delayed, and the section can require approximately seven full swipes.

### M-07: Input scale can create too-fast jumps after delayed events

**Evidence:** `compactNavigation.ts:32-40`, `AnimationLab.tsx:656-671`.

The card/Leadership input scale is `4`. A delayed one-second event can produce a maximum movement of approximately `872px`, enough to cross a large portion of a special section in one update.

### M-08: Short sections inherit long virtual timing

Examples include Main 02, Banner City, Governance Intro, and Governance Cards. Their visible frame ranges are short, but their virtual timing can require 2-3 full swipes. This is not automatically wrong, but it must be intentional and documented per section.

## Yesterday vs Current

The major mobile behavior changes were introduced in these commits:

| Commit | Change | Mobile impact |
|---|---|---|
| `6c9749a` | Restored fixed compact transition pacing | Ordinary section jumps used `550ms` |
| `62d83e8` | Added compact section transition pacing | Transition duration became frame-distance based |
| `b1dc614` | Added special section pacing | More sections became scroll-budget driven |
| `f9f6da3` | Slowed Strategy special transition | Strategy became longer to traverse |
| `ef93052` | Added compact input/frame-speed controls | Delayed events can create large deltas |
| `ce1e72c` | Preserved raw scroll while limiting emitted frames | Carousel progress improved, but two clocks were introduced |
| `9d92363` | Current mobile pacing commit | Financial Highlights crawl starts at frame 420 |

## Recommended Fix Order

1. Fix Digital -> Intro duration using actual piecewise scroll distance, not frame delta.
2. Fix startup speed/entry timing and verify the first 10-20 frames at 60Hz.
3. Define one compact section policy: each section must declare one of `single-swipe`, `read-hold`, `card-step`, or `content-scroll`.
4. Make Financial Capital card movement a bounded card-step interaction, not a full 3,210px gesture lock.
5. Apply the same card-step policy to Community.
6. Reconcile raw scroll and emitted frame during fast flicks so layers cannot use conflicting clocks.
7. Add automated mapping tests for every section: expected pixels, expected swipe count, and handoff target.
8. Re-test every section on a 390x844 phone and a tablet width before changing desktop behavior.

## Verification Checklist

- [ ] Hero -> Main 02 completes in one swipe.
- [ ] Main 02 -> Approach completes in one swipe.
- [ ] Approach -> Digital completes in one swipe.
- [ ] Digital -> Intro has no stop-go-stop startup.
- [ ] Financial Highlights frame 420 -> 436 is readable and does not stall beyond its declared budget.
- [ ] Leadership content reaches its bottom before the fade handoff.
- [ ] Capitals cards advance at a usable rate and do not require six full swipes for one transition.
- [ ] River virtual text entry does not create a hidden dead zone.
- [ ] Non-Financial cards remain clickable without trapping outer navigation.
- [ ] Strategy panel reaches its final CTA before exit.
- [ ] Community stories do not require seven full swipes.
- [ ] End Screen handoff is continuous.
- [ ] Desktop behavior remains unchanged.

## Files Reviewed

- `src/components/AnimationLab/timeline.ts`
- `src/components/AnimationLab/compactNavigation.ts`
- `src/components/AnimationLab/AnimationLab.tsx`
- `src/components/AnimationLab/useFrameTimeline.ts`
- `src/components/AnimationLab/FinancialCapitalLayer.tsx`
- `src/components/AnimationLab/LeadershipLayer.tsx`
- `src/components/AnimationLab/StrategyLayer.tsx`
- `src/components/AnimationLab/CommunityLayer.tsx`
- `src/components/AnimationLab/NonFinancialLayer.tsx`
- `src/components/AnimationLab/DigitalLayer.tsx`
- `src/components/AnimationLab/IntroStatementLayer.tsx`
