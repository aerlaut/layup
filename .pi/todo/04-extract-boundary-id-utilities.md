# Task 04 — Extract Boundary ID Utilities

## Motivation

The string `'boundary-'` is used as an ID prefix for boundary rectangle nodes
rendered by SvelteFlow. It appears as a raw string literal in at least three
separate files:

| File | Usage |
|---|---|
| `src/canvas/flowSync.ts` | `id: \`boundary-${group.parentNodeId}\`` |
| `src/canvas/canvasHandlers.ts` | `n.id.startsWith('boundary-')`, `n.id.replace('boundary-', '')`, `node.id.replace('boundary-', '')` |
| `src/canvas/canvasDragDrop.ts` | `g.parentNodeId === parentNodeId` (indirect, relies on the prefix convention) |

If the prefix ever changes, all callsites must be updated manually. More
importantly, the `replace('boundary-', '')` pattern is fragile — `String.replace`
only removes the first occurrence and does not assert that the prefix exists,
silently returning garbage if called on a non-boundary ID.

Centralizing this into typed utility functions eliminates the magic string and
makes the intent explicit.

## Files to change

- `src/canvas/boundaryId.ts` — **create new file**
- `src/canvas/flowSync.ts` — use utilities
- `src/canvas/canvasHandlers.ts` — use utilities
- `src/canvas/canvasDragDrop.ts` — use utilities (if applicable)

## Task details

### Step 1 — Create `src/canvas/boundaryId.ts`

```ts
/**
 * Utilities for the 'boundary-<parentNodeId>' synthetic node IDs that
 * SvelteFlow uses to render boundary rectangle groups.
 */

const BOUNDARY_PREFIX = 'boundary-';

/** Create a boundary node ID from a parent C4 node ID. */
export function toBoundaryId(parentNodeId: string): string {
  return `${BOUNDARY_PREFIX}${parentNodeId}`;
}

/** Extract the parent C4 node ID from a boundary node ID. */
export function fromBoundaryId(boundaryId: string): string {
  if (!isBoundaryId(boundaryId)) {
    throw new Error(`Not a boundary ID: "${boundaryId}"`);
  }
  return boundaryId.slice(BOUNDARY_PREFIX.length);
}

/** Returns true if the given ID belongs to a boundary rectangle node. */
export function isBoundaryId(id: string): boolean {
  return id.startsWith(BOUNDARY_PREFIX);
}
```

### Step 2 — Update `flowSync.ts`

```ts
import { toBoundaryId } from './boundaryId';

// Before:
const boundaryId = `boundary-${group.parentNodeId}`;

// After:
const boundaryId = toBoundaryId(group.parentNodeId);
```

### Step 3 — Update `canvasHandlers.ts`

```ts
import { isBoundaryId, fromBoundaryId } from './boundaryId';

// Before:
if (n.id.startsWith('boundary-')) { ... }
setSelected(node.id.replace('boundary-', ''));
const boundaryDrags = draggedNodes.filter((n) => n.id.startsWith('boundary-'));
const regularDrags  = draggedNodes.filter((n) => !n.id.startsWith('boundary-'));
const parentNodeId  = bNode.id.replace('boundary-', '');

// After:
if (isBoundaryId(n.id)) { ... }
setSelected(fromBoundaryId(node.id));
const boundaryDrags = draggedNodes.filter((n) => isBoundaryId(n.id));
const regularDrags  = draggedNodes.filter((n) => !isBoundaryId(n.id));
const parentNodeId  = fromBoundaryId(bNode.id);
```

Also update the `n.parentId?.startsWith('boundary-')` check:

```ts
// Before:
if (n.parentId?.startsWith('boundary-')) { ... }

// After:
if (n.parentId && isBoundaryId(n.parentId)) { ... }
```

### Step 4 — Search for any remaining raw `'boundary-'` strings

```bash
grep -rn "boundary-" src/
```

Verify that all remaining occurrences are either in comments/docs or have been
converted to use the utility functions. The CSS class `boundary-node-wrapper`
in `flowSync.ts` is a different concern (a CSS class, not an ID) — leave it as-is.

## Acceptance criteria

- [ ] `src/canvas/boundaryId.ts` exists with `toBoundaryId`, `fromBoundaryId`,
      `isBoundaryId`.
- [ ] No raw `'boundary-'` string literal used for ID construction or parsing
      outside of `boundaryId.ts`.
- [ ] `pnpm check` passes.
- [ ] `pnpm test:run` passes.
- [ ] Boundary drag (moving a boundary rectangle moves its children), boundary
      click (selects parent node), and boundary node deletion all work correctly
      in the UI.
