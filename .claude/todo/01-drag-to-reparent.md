# Task: Drag-to-reparent nodes between boundary groups

## Motivation

At non-context levels, nodes belong to a boundary group via `parentNodeId`. Currently, dragging
a node only updates its position — `parentNodeId` never changes. This means a node created inside
one system's boundary is permanently locked to that system, even if the user drags it visually
into another system's boundary or out into open space.

This task enables drag-to-reparent: when a node is dragged to a new position at a non-context
level, its `parentNodeId` is updated to reflect whichever boundary group it lands in. Dropping
outside all boundaries orphans the node (`parentNodeId: undefined`), which is intentional and
supported (see task 03 for lazy stale-parent cleanup).

---

## Steps

### 1. Add `reparentNode` store action — `src/stores/diagramStore.ts`

Add a new exported function after the existing `updateNode`:

```typescript
export function reparentNode(
  nodeId: string,
  newParentNodeId: string | undefined,
  position: { x: number; y: number }
): void {
  snapshot();
  diagramStore.update((s) =>
    resolveBoundaryOverlaps(
      withCurrentLevel(s, (d) => ({
        ...d,
        nodes: d.nodes.map((n) =>
          n.id === nodeId ? { ...n, parentNodeId: newParentNodeId, position } : n
        ),
      }))
    )
  );
}
```

This atomically updates both `parentNodeId` and `position` in a single undo step, then
recomputes boundary overlap resolution.

---

### 2. Extend `makeHandleNodeDragStop` — `src/canvas/canvasHandlers.ts`

Import `reparentNode` from the store. After building `nodeUpdates` (the array of
`{ id, position }` objects with absolute positions), and before calling
`updateNodePositions`, intercept any node whose `parentNodeId` should change.

Logic (only at non-context levels):

```typescript
// After building nodeUpdates, before calling updateNodePositions:
if (s.currentLevel !== 'context') {
  const reparentUpdates: Array<{ id: string; newParentNodeId: string | undefined; position: { x: number; y: number } }> = [];
  const remainingPositionUpdates: typeof nodeUpdates = [];

  for (const update of nodeUpdates) {
    const c4node = s.levels[s.currentLevel].nodes.find((n) => n.id === update.id);
    if (!c4node) { remainingPositionUpdates.push(update); continue; }

    const targetGroup = boundaries.find((g) => {
      const bb = g.boundingBox;
      return (
        update.position.x >= bb.x && update.position.x <= bb.x + bb.width &&
        update.position.y >= bb.y && update.position.y <= bb.y + bb.height
      );
    });

    const newParentNodeId = targetGroup?.parentNodeId; // undefined if dropped outside all boundaries
    if (newParentNodeId !== c4node.parentNodeId) {
      reparentUpdates.push({ id: update.id, newParentNodeId, position: update.position });
    } else {
      remainingPositionUpdates.push(update);
    }
  }

  for (const r of reparentUpdates) {
    reparentNode(r.id, r.newParentNodeId, r.position);
  }
  if (remainingPositionUpdates.length > 0) {
    updateNodePositions(remainingPositionUpdates);
  }
} else {
  // Context level: position-only updates as before
  if (nodeUpdates.length > 0) updateNodePositions(nodeUpdates);
}
```

Key notes:
- Boundary drag (dragging the boundary box itself) is handled in the `boundaryDrags` block
  above this code and must remain unchanged — boundary drags translate children, not reparent.
- Annotation updates are already split out before this point and are unaffected.
- `boundaries` is already retrieved via `get(contextBoundaries)` earlier in the handler.

---

### 3. No flowSync changes needed

`flowSync.ts` already handles orphan nodes (nodes without a `boundaryAssignment`) by rendering
them as free-floating nodes at their absolute position. No changes required.

---

## Files changed

- `src/stores/diagramStore.ts` — add `reparentNode` action
- `src/canvas/canvasHandlers.ts` — extend `makeHandleNodeDragStop`

## Dependencies

- Task 03 (lazy stale parent cleanup) is a natural companion but not a hard dependency.
- Task 02 (properties panel dropdown) can reuse `reparentNode` if position adjustment is needed,
  but can also just call `updateNode` directly.
