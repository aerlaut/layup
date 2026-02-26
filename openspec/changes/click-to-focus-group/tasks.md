## 1. Store Actions & Focus State

- [ ] 1.1 Add `switchFocusToGroup(parentNodeId: string)` action to `diagramStore.ts` — sets `focusedParentNodeId` to the given parent node, replaces the last `navigationStack` entry with the group's `childDiagramId`, clears `selectedId`
- [ ] 1.2 Add `clearGroupFocus()` action to `diagramStore.ts` — sets `focusedParentNodeId` to null, keeps navigation stack unchanged, clears `selectedId`, and clears `pendingNodeType` to null
- [ ] 1.3 Update `contextBoundaries` derived store to handle null `focusedParentNodeId` — when null, set `isFocused: true` for all groups (the "no focus" / "all focused" state)

## 2. Canvas Click Handlers

- [ ] 2.1 Update `handleNodeClick` in `DiagramCanvas.svelte` — when a `ctx-*` node is clicked, determine which group it belongs to using `contextBoundaries`, and call `switchFocusToGroup` with the corresponding `parentNodeId`
- [ ] 2.2 Update `handlePaneClick` in `DiagramCanvas.svelte` — skip pending-node-type placement when `focusedParentNodeId` is null (no-focus mode). Use `screenToFlowPosition` to convert click coordinates and check if the click falls within any unfocused boundary's bounding box. If so, call `switchFocusToGroup` for that boundary's group. If outside all boundaries, call `clearGroupFocus()`.
- [ ] 2.3 Update `handleConnect` in `DiagramCanvas.svelte` — reject connections (early return) when `focusedParentNodeId` is null (no-focus mode)
- [ ] 2.4 Verify that clicking a context node switches focus to its group, the previously-focused group becomes unfocused, and the clicked node is selected
- [ ] 2.5 Verify that clicking inside an unfocused boundary area (not on a node) switches focus to that group
- [ ] 2.6 Verify that clicking outside all boundaries enters no-focus mode with all groups rendered equally
- [ ] 2.7 Verify that node placement and edge creation are disabled in no-focus mode (pending node type cleared, connections rejected)

## 3. Visual Rendering Updates

- [ ] 3.1 Update the `$effect` in `DiagramCanvas.svelte` that builds flow nodes — in the "all focused" state (`focusedParentNodeId === null`), render all groups' nodes as active (not as context nodes with `ctx-` prefix and reduced opacity), or remove the `context-node` class so they render at full opacity
- [ ] 3.2 Verify that in no-focus mode, all boundaries show focused styling and all nodes render at full opacity
- [ ] 3.3 Verify that clicking a group after no-focus mode restores single-focus rendering (one focused group, others unfocused)
