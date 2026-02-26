## 1. Data Model & Store

- [x] 1.1 Extend `C4Edge` interface in `types.ts` with `sourceHandle`, `targetHandle`, `markerStart`, `markerEnd`, `lineStyle`, and `waypoints` fields
- [x] 1.2 Update `addEdge` in `diagramStore.ts` to capture `sourceHandle` and `targetHandle` from the Connection object, and set defaults for `markerStart: 'none'`, `markerEnd: 'arrow'`, `lineStyle: 'solid'`, `waypoints: []`
- [x] 1.3 Update `DiagramCanvas.svelte` `handleConnect` to pass `sourceHandle` and `targetHandle` from the Connection object to the new edge

## 2. SVG Marker Definitions

- [x] 2.1 Add SVG `<defs>` block inside the SvelteFlow component with marker definitions for `arrow` and `dot` (both start and end variants)
- [x] 2.2 Verify markers render correctly at different zoom levels using `markerUnits="strokeWidth"`

## 3. Edge Rendering (C4Edge.svelte)

- [x] 3.1 Update `C4Edge.svelte` to read `markerStart`, `markerEnd`, and `lineStyle` from edge data and apply them to `BaseEdge`
- [x] 3.2 Implement `stroke-dasharray` styling: solid (none), dashed (`8 4`), dotted (`2 2`)
- [x] 3.3 Implement waypoint-based path rendering — when waypoints exist, compute a smooth path through source → waypoints → target instead of using `getBezierPath`
- [x] 3.4 Add double-click handler on edge path to insert a new waypoint at the clicked position
- [x] 3.5 Render draggable waypoint handles on the edge and implement drag-to-reposition
- [x] 3.6 Implement waypoint deletion via right-click context action and Delete/Backspace key

## 4. Properties Panel

- [ ] 4.1 Add start marker dropdown (arrow/dot/none) to the edge section of `PropertiesPanel.svelte`
- [ ] 4.2 Add end marker dropdown (arrow/dot/none) to the edge section of `PropertiesPanel.svelte`
- [ ] 4.3 Add line style dropdown (solid/dashed/dotted) to the edge section of `PropertiesPanel.svelte`
- [ ] 4.4 Wire dropdowns to call `updateEdge` store action with the selected values

## 5. Edge-to-Flow Mapping

- [ ] 5.1 Update `toFlowEdge` mapping in `DiagramCanvas.svelte` to pass `sourceHandle`, `targetHandle`, `markerStart`, `markerEnd`, `lineStyle`, and `waypoints` through to @xyflow edge props
- [ ] 5.2 Ensure @xyflow receives `sourceHandle` and `targetHandle` so edges route to the correct handle positions

## 6. Backward Compatibility & Persistence

- [ ] 6.1 Verify that existing saved diagrams (without new fields) load and render correctly with default values
- [ ] 6.2 Verify that new edge fields persist to localStorage and survive page reload
- [ ] 6.3 Verify that JSON export/import preserves all new edge fields including waypoints

## 7. Integration Testing

- [ ] 7.1 Test creating edges between different handle combinations (right→left, bottom→top, left→right) and verify correct routing
- [ ] 7.2 Test all marker combinations (arrow/dot/none × start/end) render correctly
- [ ] 7.3 Test all line styles (solid/dashed/dotted) render correctly
- [ ] 7.4 Test waypoint add/move/delete workflow end-to-end
- [ ] 7.5 Run `npm run build` and `npm run check` to verify no type errors or build failures
