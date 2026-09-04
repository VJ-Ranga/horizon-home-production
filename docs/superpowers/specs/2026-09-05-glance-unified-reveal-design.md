# Section 06 Unified Reveal

## Goal

Make the Haycarb at a Glance section feel like one solid composition when it enters and exits the timeline.

## Design

The existing section-level animation remains the single entrance and exit animation for the heading, description, stat cards, video card, and resource buttons. Individual child opacity and vertical translations are removed from those elements.

The stat values retain their frame-driven count-up behavior. This preserves the useful data animation without making the cards appear at different times.

Hover, focus, dialog, responsive layout, and reduced-motion behavior remain unchanged.

## Scope

Only `GlanceLayer.tsx` and its focused regression test are changed. Other sections and the shared timeline are not modified.

## Verification

Run TypeScript validation, whitespace validation, and the focused source regression check. The existing ESLint issue in `GlanceLayer.tsx` is unrelated to this change.
