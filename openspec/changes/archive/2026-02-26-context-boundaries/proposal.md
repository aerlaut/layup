## Why

When users drill into a child diagram, they lose all visual context of the parent level. Sibling containers/systems and their children become invisible, making it hard to understand how the current scope relates to the broader architecture. Showing faded parent boundaries and sibling groups on the canvas preserves spatial context during navigation.

## What Changes

- When viewing a child diagram (e.g., components inside Container A1), the canvas also displays nodes from sibling parent elements (e.g., components inside Container A2) as read-only context
- Parent containers/systems are rendered as faded boundary rectangles that enclose their respective child nodes
- Context nodes (from sibling parents) are visually distinguished — faded/dimmed and non-interactive
- The focused group's boundary is subtly highlighted compared to sibling boundaries
- Users can still only edit/interact with nodes belonging to the currently focused diagram

## Capabilities

### New Capabilities
- `context-boundaries`: Rendering of parent-level grouping boundaries and sibling context nodes when navigated into a child diagram

### Modified Capabilities
- `hierarchy-navigation`: Navigation now needs to communicate which parent node is focused so the canvas can distinguish the active group from sibling context groups

## Impact

- `src/canvas/DiagramCanvas.svelte` — must compose context nodes + boundary nodes alongside current diagram nodes
- `src/stores/diagramStore.ts` — needs a derived store or selector that gathers sibling context (parent diagram nodes, their children, boundary info)
- New Svelte component(s) for rendering boundary rectangles (likely a custom xyflow group/background node)
- `src/types.ts` — may need a flag or wrapper type to distinguish context vs active nodes
- No breaking changes to persistence or existing data model
