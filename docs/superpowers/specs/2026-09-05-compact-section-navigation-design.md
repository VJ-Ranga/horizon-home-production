# Compact Section Navigation Design

## Goal

On phone and tablet layouts, a fast outer-page scroll or swipe must advance at
most one animation section. Inner content readers must remain normally
scrollable, including their existing edge handoff to the section timeline.
Desktop navigation and timing remain unchanged.

## Behavior

- Gestures that begin outside an inner reader are treated as section navigation.
- Gesture magnitude does not determine the destination. Only its direction does.
- A forward gesture targets the next section's settled frame.
- A backward gesture targets the previous section's settled frame.
- Additional touch movement, wheel momentum, and repeated wheel events are
  ignored while the section transition is locked.
- The lock is released after the target frame is reached or the transition
  safety timeout expires.
- Gestures that begin inside an inner reader continue to use the reader's
  existing scroll and edge-handoff behavior.
- At the first or last section, a gesture does not produce an invalid target or
  skip through the loop boundary.

## Implementation

The compact navigation effect in `AnimationLab.tsx` owns the outer gesture
lock. It will use non-passive wheel handling where needed to prevent native
wheel momentum from changing the document scroll independently of the target
section. Touch handling will prevent native outer scrolling for gestures that
do not begin in a reader, then perform one programmatic frame-targeted move on
gesture end. Reader-originated gestures remain passive and are not intercepted
by the outer controller.

The target is computed from the current shared frame and the section settled
frames, so the existing desktop/compact timeline policy remains the source of
truth. The implementation will not change section markup, CSS, desktop Lenis,
or compact reader components.

## Testing

- A large forward input advances one section, not multiple sections.
- A large backward input advances one section, not multiple sections.
- Repeated wheel events during a transition produce one target only.
- Reader-originated gestures remain excluded from the outer lock.
- Boundary gestures do not create invalid targets.
- Existing compact timing, virtual-frame, overlap, and desktop tests continue
  to pass.
