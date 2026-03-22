# Task: Lazy cleanup of stale parentNodeId on node selection

## Motivation

A `parentNodeId` becomes "stale" when the parent node it references no longer exists. Although
cascade delete in `deleteNode` prevents most orphaning-by-deletion, stale references can arise
through import (e.g., importing a subtree that references IDs from a different diagram) or
through future reparenting operations (task 01) where a node may be assigned `undefined`.

Rather than enforcing consistency eagerly on every state mutation (expensive, and couples
unrelated operations), stale parentNodeIds are cleaned up lazily: when the user selects a node,
a one-time check is performed and any stale reference is silently cleared.

This matters for the properties panel dropdown (task 02), which would show a blank unselected
option for a stale ID, confusing the user.

---

## Steps

### 1. Add a helper — `src/stores/diagramStore.ts` (or inline in handler)

A small utility that, given a node ID and the current state, returns whether the node's
`parentNodeId` is stale:

```typescript
function isParentStale(state: DiagramState, nodeId: string): boolean {
  const node = state.levels[state.currentLevel].nodes.find((n) => n.id === nodeId);
  if (!node?.parentNodeId) return false; // no parent to check
  const prev = prevLevel(state.currentLevel);
  if (!prev) return false; // context level has no parents
  return !state.levels[prev].nodes.some((n) => n.id === node.parentNodeId);
}
```

This can be a module-private function in `diagramStore.ts`.

---

### 2. Call cleanup in `handleNodeClick` — `src/canvas/canvasHandlers.ts`

After verifying the clicked element is not a boundary node, and before (or immediately after)
calling `setSelected`, check and clean up stale parentNodeId:

```typescript
export function handleNodeClick({ node }: { node: Node; event: MouseEvent | TouchEvent }): void {
  if (isBoundaryId(node.id)) {
    setSelected(fromBoundaryId(node.id));
    return;
  }

  // Lazy stale parent cleanup: if this node's parentNodeId points to a deleted node, clear it.
  const s = get(diagramStore);
  if (isParentStale(s, node.id)) {
    updateNode(node.id, { parentNodeId: undefined });
  }

  setSelected(node.id);
}
```

Import `isParentStale` (or inline the logic) and `updateNode` (already imported).

Notes:
- `updateNode` takes a snapshot, making the cleanup undoable. This is acceptable — the state was
  already inconsistent, and the undo restores the stale reference only temporarily.
- `isParentStale` should be exported from `diagramStore.ts` (or kept private and re-exported as
  needed). It is a pure read — no side effects.
- The check is O(n) over parent-level nodes on each click but parent levels are small in practice.

---

### 3. Optional: also run on diagram load

For diagrams loaded from localStorage that may contain stale IDs (e.g., after manual JSON edits
or import bugs), a sweep at load time would complement the lazy approach. This is optional and
can be done as a migration/normalization pass in `loadDiagram`.

---

## Files changed

- `src/stores/diagramStore.ts` — add `isParentStale` helper
- `src/canvas/canvasHandlers.ts` — extend `handleNodeClick`

## Dependencies

- No dependency on Task 01 or 02.
- Should be implemented before or alongside Task 02, since the dropdown in the properties panel
  will display incorrectly for stale IDs.
