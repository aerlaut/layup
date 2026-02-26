## Why

When zoomed into a group, sibling groups and their nodes are faded out and completely non-interactive (opacity 0.35, pointer-events: none). This prevents users from selecting nodes in other groups, creating cross-group edges at the same level, or navigating by double-clicking outside the focused group. Additionally, there is no overlap prevention for nodes or group boundaries, leading to visual clutter when nodes are dragged on top of each other.

## What Changes

- **Remove fading/disabling of context nodes**: Sibling group nodes become fully interactive (selectable, connectable) instead of dimmed and pointer-events-disabled
- **Cross-group edge creation**: Allow creating edges between nodes of different groups at the same hierarchy level
- **Background double-click zoom-out**: Double-clicking the pane background (outside any group boundary) navigates up one level
- **Node overlap prevention**: When a node is moved to overlap another node within the same group, automatically reposition the overlapped node to eliminate the collision
- **Group boundary overlap prevention**: Ensure group boundaries do not overlap each other; reposition or resize as needed when contents change

## Capabilities

### New Capabilities
- `cross-group-edges`: Allow creating and rendering edges between nodes belonging to different groups at the same diagram level
- `node-overlap-prevention`: Automatically resolve node overlaps within a group when a node is moved on top of another
- `boundary-overlap-prevention`: Prevent group boundaries from overlapping each other by repositioning when contents change

### Modified Capabilities
- `context-boundaries`: Context nodes and boundaries become fully interactive instead of faded and disabled
- `hierarchy-navigation`: Double-clicking outside any group boundary triggers zoom-out to parent level

## Impact

- **canvas/DiagramCanvas.svelte**: Context node rendering (remove `pointer-events: none`, `selectable: false`, `connectable: false`), pane double-click handler, edge connection handler for cross-group edges
- **canvas/FlowHelper.svelte**: May need updates for cross-group edge routing
- **app.css**: Remove `.context-node` opacity/pointer-events styles
- **elements/BoundaryNode.svelte**: Boundary styling updates for interactive state
- **stores/diagramStore.ts**: Edge creation across groups, overlap resolution logic, boundary overlap prevention, navigation on background double-click
- **types.ts**: Possible edge type extensions for cross-group references
