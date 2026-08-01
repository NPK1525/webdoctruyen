# Keep Advanced Tag Panel Open Design

## Goal

Keep the advanced-search tag panel open while users cycle tag states. Close it
only when they press the Dismiss button or click outside the panel and trigger.

## Root Cause

The tag click handler rerenders its tag container synchronously. This removes
the clicked button from the DOM before the same click bubbles to the document
outside-click handler. `panel.contains(event.target)` then returns `false`, so
the panel is closed even though the click originated inside it.

## Design

- Stop propagation in the tag button click handler before rerendering tags.
- Keep the existing include → exclude → neutral state cycle unchanged.
- Keep the document outside-click handler unchanged.
- Keep the Dismiss button behavior unchanged.
- Do not change tag filtering, query serialization, API calls, or panel layout.

## Verification

- Add a focused JavaScript contract test requiring tag clicks to stop
  propagation before rerendering.
- Retain existing tests for tag state cycling, complete taxonomy display, and
  query serialization.
- Run the complete JavaScript test suite and backend Release build.
