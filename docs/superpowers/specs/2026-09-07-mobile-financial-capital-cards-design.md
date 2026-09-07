# Mobile Financial Capital Cards

## Scope

Change Section 14 (`14-financial-capital`) only for compact viewports at or
below 1100px. Desktop keeps the existing pinned card carousel unchanged.

## Behavior

- Tablet and phone render all seven capital cards in normal document flow.
- The page uses ordinary compact navigation; Section 14 no longer presents
  card-by-card animation. Its compact reader owns the vertical card list and
  hands navigation back at the top and bottom edges.
- Cards remain individually readable, with the existing content, links, image
  treatment, and statistics preserved.
- The section's shared background timeline continues its normal enter and exit
  behavior on compact viewports.

## Implementation

- Keep desktop carousel metadata and frame-driven animation unchanged.
- Render the existing card collection as a vertical stack under compact CSS;
  compact frame ticks leave the cards static while the native reader scrolls.
- Keep `.s-fincap` as compact native-reader ownership so gestures hand off at
  the reader edges.
- Add source-level regression tests for compact normal-flow rendering.

## Verification

- Run the focused compact-navigation tests.
- Run the production build.
- Confirm desktop carousel code and timeline behavior are unchanged.
