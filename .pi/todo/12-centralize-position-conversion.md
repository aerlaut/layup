# Task 12 — Centralize Position Conversion Utilities

## Motivation

Boundary nodes in SvelteFlow use **relative positioning**: a child node's
`position` is relative to its boundary parent's top-left corner. The Svelte
store, however, keeps **absolute coordinates** for all nodes. This means two
inverse conversions must be performed and kept in perfect sync:

| Direction | Where | How |
|---|---|---|
| Absolute → Relative (for rendering) | `flowSync.ts` `buildFlowData` | `relativeX = node.x - boundary.x` |
| Relative → Absolute (after drag) | `canvasHandlers.ts` `makeHandleNodeDragStop` | `absoluteX = node.x + boundary.x` |

These two conversions are currently written inline in separate files with no
shared abstraction. If the convention changes (e.g. to include a margin offset),
both must be updated in lockstep — a silent consistency requirement that is not
enforced by types or tests.

## Files to change

- `src/canvas/positionUtils.ts` — **create new file**
- `src/canvas/flowSync.ts` — use `toRelativePosition`
- `src/canvas/canvasHandlers.ts` — use `toAbsolutePosition`

## Task details

### Step 1 — Create `src/canvas/positionUtils.ts`

```ts
/** Conversion utilities for absolute ↔ boundary-relative node positions. */

export interface Point { x: number; y: number }

/**
 * Convert an absolute canvas position to a position relative to a boundary
 * rectangle's top-left corner.
 *
 * Used by `flowSync.ts` when producing SvelteFlow nodes inside boundary groups.
 */
export function toRelativePosition(absolute: Point, boundaryOrigin: Point): Point {
  return {
    x: absolute.x - boundaryOrigin.x,
    y: absolute.y - boundaryOrigin.y,
  };
}

/**
 * Convert a boundary-relative position back to an absolute canvas position.
 *
 * Used by `canvasHandlers.ts` after a drag event to write back to the store.
 */
export function toAbsolutePosition(relative: Point, boundaryOrigin: Point): Point {
  return {
    x: relative.x + boundaryOrigin.x,
    y: relative.y + boundaryOrigin.y,
  };
}
```

### Step 2 — Update `flowSync.ts`

```ts
import { toRelativePosition } from './positionUtils';

// Before (inside boundary assignment loop):
boundaryAssignments.set(child.id, {
  parentId: boundaryId,
  relativeX: child.position.x - bb.x,
  relativeY: child.position.y - bb.y,
});

// After:
const rel = toRelativePosition(child.position, { x: bb.x, y: bb.y });
boundaryAssignments.set(child.id, {
  parentId: boundaryId,
  relativeX: rel.x,
  relativeY: rel.y,
});
```

> This assumes Task 11 (pure `buildFlowData`) is done first, since the
> refactored version uses the `boundaryAssignments` Map. If doing this task
> independently, apply the same change to whichever position calculation exists.

### Step 3 — Update `canvasHandlers.ts`

```ts
import { toAbsolutePosition } from './positionUtils';

// Before:
nodeUpdates.push({
  id: n.id,
  position: {
    x: n.position.x + boundaryFlowNode.position.x,
    y: n.position.y + boundaryFlowNode.position.y,
  },
});

// After:
nodeUpdates.push({
  id: n.id,
  position: toAbsolutePosition(n.position, boundaryFlowNode.position),
});
```

### Step 4 — Add unit tests

```ts
// tests/canvas/positionUtils.test.ts
import { toRelativePosition, toAbsolutePosition } from '../../src/canvas/positionUtils';

describe('position round-trip', () => {
  it('toRelativePosition is the inverse of toAbsolutePosition', () => {
    const absolute = { x: 350, y: 200 };
    const origin   = { x: 100, y: 80 };
    const relative = toRelativePosition(absolute, origin);
    const roundtrip = toAbsolutePosition(relative, origin);
    expect(roundtrip).toEqual(absolute);
  });

  it('toRelativePosition at origin equals absolute', () => {
    expect(toRelativePosition({ x: 50, y: 30 }, { x: 0, y: 0 })).toEqual({ x: 50, y: 30 });
  });
});
```

## Acceptance criteria

- [ ] `src/canvas/positionUtils.ts` exists with `toRelativePosition` and
      `toAbsolutePosition`.
- [ ] `flowSync.ts` uses `toRelativePosition`.
- [ ] `canvasHandlers.ts` uses `toAbsolutePosition`.
- [ ] No inline arithmetic for position conversion remains in either file.
- [ ] Unit tests for round-trip correctness pass.
- [ ] `pnpm test:run` passes.
- [ ] Dragging a child node inside a boundary group, releasing, and re-opening
      the diagram produces the correct persisted position (no drift).
