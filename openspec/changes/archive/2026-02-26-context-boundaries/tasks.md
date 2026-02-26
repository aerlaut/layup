## 1. Types and Store

- [x] 1.1 Add `BoundaryGroup` type to `src/types.ts` with fields: `parentNodeId`, `parentLabel`, `isFocused`, `childNodes` array, and `boundingBox` (x, y, width, height)
- [x] 1.2 Track focused parent node ID in `DiagramState` — update `drillDown` to record which parent node was entered, and `drillUp`/`navigateTo` to clear it
- [x] 1.3 Create `contextBoundaries` derived store in `src/stores/diagramStore.ts` that computes `BoundaryGroup[]` from the parent diagram's nodes and their child diagrams when below root level

## 2. Boundary Node Component

- [x] 2.1 Create `src/elements/BoundaryNode.svelte` — a custom xyflow node type that renders a faded rectangle with the parent label. Accept `isFocused` in data to control opacity/tint styling
- [x] 2.2 Register `boundary` node type in `DiagramCanvas.svelte`'s `nodeTypes`

## 3. Canvas Integration

- [x] 3.1 Update `DiagramCanvas.svelte` to subscribe to `contextBoundaries` and merge boundary group nodes + context child nodes into the xyflow `nodes` array alongside the active diagram's nodes
- [x] 3.2 Set `selectable: false`, `draggable: false`, `connectable: false` on all context nodes and boundary nodes
- [x] 3.3 Compute bounding box for each boundary group from its child node positions (with padding), or use a minimum size for empty groups
- [x] 3.4 Set `parentId` on context child nodes to their boundary group node ID so xyflow handles containment

## 4. Styling

- [x] 4.1 Add `.context-node` CSS class with `opacity: 0.35` and `pointer-events: none` to `src/app.css` or a scoped style
- [x] 4.2 Style focused boundary with `opacity: 0.5`, subtle border, and light background tint; sibling boundaries with `opacity: 0.25` and dashed border

## 5. Testing and Verification

- [x] 5.1 Verify drilling into a container shows sibling container boundaries with correct labels and enclosed context nodes
- [x] 5.2 Verify context nodes are non-interactive (not selectable, not draggable, not connectable)
- [x] 5.3 Verify focused boundary is visually distinguished from sibling boundaries
- [x] 5.4 Verify boundaries resize when active nodes are moved
- [x] 5.5 Verify no boundaries appear at root level
- [x] 5.6 Verify only one level of parent context is shown (not grandparent)
