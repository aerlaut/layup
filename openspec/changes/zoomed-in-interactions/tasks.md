## 1. Interactive Context Nodes

- [x] 1.1 Remove `pointer-events: none` from `.context-node` in `app.css` and change opacity from 0.35 to 0.7
- [x] 1.2 In `DiagramCanvas.svelte`, remove `selectable: false`, `draggable: false`, `connectable: false` from context node creation
- [x] 1.3 Update `BoundaryNode.svelte` non-focused boundary opacity from 0.25 to a more visible level (e.g., 0.5)
- [x] 1.4 Verify context nodes can be selected, dragged, and connected in the UI

## 2. Cross-Group Edges

- [x] 2.1 Add `sourceGroupId` and `targetGroupId` optional fields to `C4Edge` in `types.ts`
- [x] 2.2 Update `handleConnect` in `DiagramCanvas.svelte` to detect when source/target belong to different groups and store the edge on the parent diagram level with group metadata
- [x] 2.3 In the `$effect` that builds the flow node/edge arrays, collect cross-group edges from the parent diagram and include them in the rendered edges when either source or target group is visible
- [x] 2.4 Map cross-group edge node IDs to the correct flow node IDs (context nodes use `ctx-` prefix)
- [ ] 2.5 Verify cross-group edge creation and rendering from both source and target group perspectives

## 3. Background Double-Click Zoom-Out

- [ ] 3.1 In `handleDblClick` in `DiagramCanvas.svelte`, add a check: if no `.svelte-flow__node` is found under the click target and `navigationStack.length > 1`, call `drillUp()`
- [ ] 3.2 Verify double-clicking background navigates up one level, and does nothing at root

## 4. Node Overlap Prevention

- [ ] 4.1 Create an overlap detection utility function that checks if two node bounding boxes intersect, using node position and dimensions
- [ ] 4.2 Create a `resolveOverlaps` function that pushes overlapped nodes away along the axis of least overlap, with iterative resolution (max 10 passes)
- [ ] 4.3 Integrate `resolveOverlaps` into `handleNodeDragStop` — after updating the moved node's position, run overlap resolution on sibling nodes in the same group
- [ ] 4.4 Verify dragging a node onto another pushes the overlapped node away, including chain displacement

## 5. Boundary Overlap Prevention

- [ ] 5.1 Create a `resolveBoundaryOverlaps` function that detects overlapping boundary bounding boxes and shifts the smaller group's nodes by a uniform offset
- [ ] 5.2 Integrate boundary overlap check after node position changes (drag stop, node add, node overlap resolution)
- [ ] 5.3 Verify moving/adding nodes that cause boundary expansion triggers sibling group repositioning while preserving internal layout
