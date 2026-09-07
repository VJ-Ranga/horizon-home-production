# Mobile Section Reader Design

## Goal

Make Sections 12, 14, 16, 17, and 18 usable on phones without autoplay,
overscroll traps, or automatic jumps through content. Sections 2, 7, and 8 are
out of scope.

## Interaction Contract

- Each target section has a bounded native vertical reader sized to its real
  content plus approximately 40px bottom breathing room.
- Finger movement scrolls the active section directly; one gesture never seeks
  to the section's end or advances multiple cards.
- At the reader's top or bottom edge, the next gesture is released to the
  outer timeline navigation and can enter the adjacent section.
- Section 14 remains a user-controlled card slider. No autoplay or forced card
  sequencing is added.
- Desktop and tablet behavior remain unchanged unless required by shared edge
  handling.

## Implementation Boundary

Use one shared reader selector/edge policy in the compact navigation layer,
with section-specific CSS only where the existing layout has artificial
viewport or minimum-height space. Remove redundant section-specific gesture
interceptors for the target phone paths so native scrolling has one owner.

## Verification

Add source-level regression assertions for the target reader selectors and
edge-release behavior. Run the focused navigation/timing tests and production
build.
