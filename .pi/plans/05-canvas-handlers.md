# Task 05 — Canvas Interaction Handlers

## Files

- `src/canvas/canvasHandlers.ts`
- `src/canvas/canvasDragDrop.ts`

## Context

These two files handle all user interactions with the canvas. They are the most complex consumers of the store's cross-diagram routing logic. In v2 that complexity largely disappears: every operation reads from and writes to `currentLevel`, and there is no need to determine which child diagram an element belongs to.

---

## `canvasHandlers.ts`

### Imports to remove

```typescript
// Remove these — no longer exist in the store
addEdgeToDiagram,
deleteNodeFromDiagram,
deleteEdgeFromDiagram,
updateEdgeInDiagram,
updateNodePositionsInDiagram,
getAnnotationDiagramId,
contextBoundaries,     // no longer needed here
```

### Imports to add

```typescript
import { updateAnnotationPositions, updateNodePositionsInLevel } from '../stores/diagramStore';
```

(`updateNodePositionsInLevel` is the new replacement for `updateNodePositionsInDiagram` — it takes a `C4LevelType` instead of a diagram ID string.)

---

### `handleConnect` — simplify

Old version inspected both endpoints, determined their group membership via `contextBoundaries`, and routed the edge to either the parent diagram or a child diagram. In v2 all edges at a level go to the current level.

```typescript
export function handleConnect(conn: Connection): void {
  storeAddEdge({
    id: generateId(),
    source: conn.source,
    target: conn.target,
    sourceHandle: conn.sourceHandle ?? undefined,
    targetHandle: conn.targetHandle ?? undefined,
    label: '',
    description: '',
    technology: '',
  });
}
```

Remove the entire `if (state.navigationStack.length <= 1)` branch and all group-routing logic.

---

### `handleReconnect` — simplify

Old version checked whether the edge lived on the parent diagram. In v2 all edges are on the current level.

```typescript
export function handleReconnect(oldEdge: Edge, newConnection: Connection): void {
  storeUpdateEdge(oldEdge.id, {
    source: newConnection.source,
    target: newConnection.target,
    sourceHandle: newConnection.sourceHandle ?? undefined,
    targetHandle: newConnection.targetHandle ?? undefined,
  });
}
```

---

### `makeHandleNodeDragStop` — simplify

Old version had to route position updates to different child diagram stores depending on which boundary group a dragged node belonged to. In v2 all nodes at the current level are in the same place.

The only remaining complexity is **boundary drag**: when a `boundary-*` node is dragged, all child nodes of that group need to be translated by the same delta. In v2 these children are identified by `parentNodeId` (not `childDiagramId`), and they live in `currentLevel`, so the position update goes to `currentLevel`.

```typescript
export function makeHandleNodeDragStop(
  getNodes: () => Node[],
): (ev: { targetNode: Node | null; nodes: Node[]; event: MouseEvent | TouchEvent }) => void {
  return ({ nodes: draggedNodes }) => {
    const s = get(diagramStore);
    const boundaries = get(contextBoundaries);
    const allNodes = getNodes();

    const boundaryDrags = draggedNodes.filter((n) => n.id.startsWith('boundary-'));
    const regularDrags  = draggedNodes.filter((n) => !n.id.startsWith('boundary-'));

    // Boundary drags: translate all child nodes by the drag delta
    for (const bNode of boundaryDrags) {
      const parentNodeId = bNode.id.replace('boundary-', '');
      const group = boundaries.find((g) => g.parentNodeId === parentNodeId);
      if (!group || group.childNodes.length === 0) continue;

      const dx = bNode.position.x - group.boundingBox.x;
      const dy = bNode.position.y - group.boundingBox.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;

      const childUpdates = group.childNodes.map((cn) => ({
        id: cn.id,
        position: { x: cn.position.x + dx, y: cn.position.y + dy },
      }));
      // All child nodes are in currentLevel
      updateNodePositions(childUpdates);
    }

    // Regular node drags: annotations vs C4 nodes
    if (regularDrags.length > 0) {
      const annotUpdates: Array<{ id: string; position: { x: number; y: number } }> = [];
      const nodeUpdates:  Array<{ id: string; position: { x: number; y: number } }> = [];

      for (const n of regularDrags) {
        if (ANNOTATION_TYPES.has(n.type ?? '')) {
          annotUpdates.push({ id: n.id, position: n.position });
          continue;
        }

        if (n.parentId?.startsWith('boundary-')) {
          // Node is parented to a boundary rectangle in the flow graph.
          // Its position is relative to the boundary; convert to absolute.
          const boundaryFlowNode = allNodes.find((bn) => bn.id === n.parentId);
          if (!boundaryFlowNode) continue;
          nodeUpdates.push({
            id: n.id,
            position: {
              x: n.position.x + boundaryFlowNode.position.x,
              y: n.position.y + boundaryFlowNode.position.y,
            },
          });
        } else {
          nodeUpdates.push({ id: n.id, position: n.position });
        }
      }

      if (annotUpdates.length > 0) {
        updateAnnotationPositions(s.currentLevel, annotUpdates);
      }
      if (nodeUpdates.length > 0) {
        updateNodePositions(nodeUpdates);
      }
    }
  };
}
```

Note: `updateAnnotationPositions` previously took a diagram ID string. It now takes a `C4LevelType`. Update its signature in `diagramStore.ts` accordingly (it should write to `state.levels[level]` instead of `state.diagrams[diagramId]`).

---

### `handleDelete` — simplify

Old version had to search across the parent diagram and sibling diagrams to find which diagram owned the edge being deleted. In v2 all nodes and edges are at the current level.

```typescript
export function handleDelete({
  nodes: delNodes,
  edges: delEdges,
}: {
  nodes: Node[];
  edges: Edge[];
}): void {
  const s = get(diagramStore);

  for (const n of delNodes) {
    if (n.id.startsWith('boundary-')) continue;
    if (ANNOTATION_TYPES.has(n.type ?? '')) {
      deleteAnnotation(s.currentLevel, n.id);
    } else {
      storeDeleteNode(n.id); // cascade handled inside deleteNode in the store
    }
  }

  for (const e of delEdges) {
    storeDeleteEdge(e.id);
  }
}
```

---

### `makeHandleDblClick` — simplify

Old version: looked up the node in `getCurrentDiagramNodes()`, then called `drillDown(nodeId)`.
New version: `drillDown()` takes no arguments (it just advances the level). The node ID is only needed to check whether the type is non-drillable.

```typescript
export function makeHandleDblClick(
  getScreenToFlowPosition: () => ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined,
  getCurrentLevelNodes: () => Array<{ id: string; type: string }>,
): (e: MouseEvent) => void {
  return (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const nodeEl = target.closest('.svelte-flow__node') as HTMLElement | null;

    if (!nodeEl) {
      // Double-click on empty canvas — drill up if not at context level
      const s = get(diagramStore);
      if (s.currentLevel === 'context') return;
      const screenToFlowPosition = getScreenToFlowPosition();
      if (screenToFlowPosition) {
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const boundaries = get(contextBoundaries);
        const inBoundary = boundaries.some((g) => {
          const bb = g.boundingBox;
          return (
            flowPos.x >= bb.x && flowPos.x <= bb.x + bb.width &&
            flowPos.y >= bb.y && flowPos.y <= bb.y + bb.height
          );
        });
        if (!inBoundary) drillUp();
      }
      return;
    }

    const nodeId = nodeEl.getAttribute('data-id');
    if (!nodeId) return;

    // Find the node in the current level (all nodes are here in v2)
    const c4node = getCurrentLevelNodes().find((n) => n.id === nodeId);
    if (!c4node || NON_DRILLABLE_TYPES.has(c4node.type)) return;

    // Check there is a next level to drill into
    const s = get(diagramStore);
    if (!nextLevel(s.currentLevel)) return;

    drillDown(); // no nodeId argument in v2
  };
}
```

Add `import { nextLevel } from '../stores/diagramStore';` at the top.

Update `DiagramCanvas.svelte` to pass `() => $currentDiagram?.nodes ?? []` as `getCurrentLevelNodes` (same as before — the parameter name changes but the value passed is identical).

---

### `NON_DRILLABLE_TYPES` — no change needed

Keep as is. These are the node types that expose their internal structure inline (UML class, ERD) and should not trigger level navigation when double-clicked. `person` and `external-person` remain non-drillable by existing convention.

---

## `canvasDragDrop.ts`

### `makeHandleDrop` — update parent assignment

Old version called `addNodeToDiagram(targetGroup.childDiagramId, newNode)`. In v2, the node is always added to the current level via `addNode`, but with `parentNodeId` set from the boundary group.

```typescript
export function makeHandleDrop(
  getScreenToFlowPosition: () => ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined,
): (e: DragEvent) => void {
  return (e: DragEvent) => {
    if (!e.dataTransfer) return;
    const screenToFlowPosition = getScreenToFlowPosition();
    if (!screenToFlowPosition) return;

    // ── Annotation drop ───────────────────────────────────────────────────
    const annotationType = e.dataTransfer.getData('application/annotation-type') as AnnotationType | '';
    if (annotationType) {
      e.preventDefault();
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addAnnotation({
        id: generateId(),
        type: annotationType,
        label: ANNOTATION_DEFAULT_LABELS[annotationType],
        text: '',
        position: flowPos,
      });
      return;
    }

    // ── C4 node drop ──────────────────────────────────────────────────────
    const nodeType = e.dataTransfer.getData('application/c4-node-type') as C4NodeType | '';
    if (!nodeType) return;
    e.preventDefault();

    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const s = get(diagramStore);

    if (s.currentLevel === 'context') {
      // Context level: no parent constraint — drop anywhere
      storeAddNode({
        id: generateId(),
        type: nodeType,
        label: NODE_DEFAULT_LABELS[nodeType],
        description: '',
        technology: '',
        position: flowPos,
        // no parentNodeId at context level
      });
    } else {
      // Non-context level: must land inside a boundary group's bounding box
      const boundaries = get(contextBoundaries);
      const targetGroup = boundaries.find((g) => {
        const bb = g.boundingBox;
        return (
          flowPos.x >= bb.x && flowPos.x <= bb.x + bb.width &&
          flowPos.y >= bb.y && flowPos.y <= bb.y + bb.height
        );
      });
      if (!targetGroup) return; // Drop outside any boundary — reject

      storeAddNode({
        id: generateId(),
        type: nodeType,
        label: NODE_DEFAULT_LABELS[nodeType],
        description: '',
        technology: '',
        position: flowPos,
        parentNodeId: targetGroup.parentNodeId, // ← key change
      });
    }
  };
}
```

### Imports to update

Remove `addNodeToDiagram`. Replace with just `addNode as storeAddNode`.

```typescript
import {
  diagramStore,
  addNode as storeAddNode,
  addAnnotation,
  contextBoundaries,
} from '../stores/diagramStore';
```

---

## `db-schema` label

`NODE_DEFAULT_LABELS` in `canvasDragDrop.ts` does not currently include `'db-schema'`. Add it:

```typescript
'db-schema': 'Schema',
```
