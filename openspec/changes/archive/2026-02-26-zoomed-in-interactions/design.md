## Context

When users drill into a group, sibling group nodes are rendered at 35% opacity with `pointer-events: none`, making them completely non-interactive. Edges are scoped per-diagram with no cross-group support. There is no overlap prevention for nodes or boundaries. Navigation up requires the toolbar/breadcrumb — there is no canvas-based zoom-out gesture.

The current implementation lives primarily in:
- `DiagramCanvas.svelte` — context node rendering, edge connection handler, double-click handler
- `diagramStore.ts` — navigation stack, edge creation, node position updates
- `app.css` — `.context-node` opacity and pointer-events styles
- `BoundaryNode.svelte` — boundary visual styling

## Goals / Non-Goals

**Goals:**
- Make context nodes fully interactive (selectable, connectable) while still visually distinguishable from active nodes
- Support creating edges between nodes in different groups at the same hierarchy level
- Allow double-clicking outside any group boundary to navigate up one level
- Prevent node overlap within a group by automatically repositioning displaced nodes
- Prevent group boundary overlap by repositioning boundaries when their contents change

**Non-Goals:**
- Auto-layout or force-directed graph algorithms — only simple collision resolution
- Cross-level edges (edges between nodes at different hierarchy depths)
- Animated node repositioning during overlap resolution
- Resizing nodes to fit content

## Decisions

### 1. Context node interactivity model
**Decision**: Remove `pointer-events: none`, `selectable: false`, and `connectable: false` from context nodes. Keep a subtle visual distinction (slightly reduced opacity ~0.7 instead of 0.35, or a muted border color) so users can still tell which group is focused.

**Rationale**: The user needs to select and connect to these nodes. Full interactivity is required. A lighter visual distinction (vs the current heavy fade) preserves the "you are editing this group" context without blocking interaction.

**Alternative considered**: Make context nodes selectable but not connectable — rejected because cross-group edges require connectable context nodes.

### 2. Cross-group edge storage
**Decision**: Store cross-group edges on the parent diagram level (the diagram that contains the group nodes). Add `sourceGroupId` and `targetGroupId` fields to `C4Edge` to track which groups the source/target nodes belong to. When rendering a zoomed-in view, collect edges from the parent level where either source or target belongs to a visible group.

**Rationale**: Edges between groups are relationships at the parent level conceptually. Storing them on the parent diagram keeps the data model clean — child diagrams remain self-contained. The parent diagram already has visibility into all sibling groups.

**Alternative considered**: Store edges on both child diagrams (duplicated) — rejected due to sync complexity.

### 3. Background double-click zoom-out
**Decision**: In the `onpaneclick` or pane double-click handler, check if the click target is outside all boundary rectangles. If so, call `drillUp()`. Use `handleDblClick` existing logic — if no `.svelte-flow__node` is found under the click and we're not at root level, trigger zoom-out.

**Rationale**: This reuses the existing double-click handler pattern. The check is simple: if the double-click doesn't hit any node (active or context) and we're deeper than root, navigate up.

### 4. Node overlap resolution strategy
**Decision**: On `nodedragstop`, check if the moved node's bounding box overlaps any sibling node in the same group. If overlap is detected, push the overlapped node away from the moved node along the axis of least overlap. Apply this iteratively (max 10 passes) to handle chain displacements.

**Rationale**: Simple push-away is predictable and fast. Users can see where nodes end up and adjust. Iterative resolution handles cascading overlaps without complex algorithms.

**Alternative considered**: Grid snapping — rejected because it constrains free placement. Force-directed layout — rejected as too complex and unpredictable for manual diagrams.

### 5. Boundary overlap prevention
**Decision**: After node positions change (drag stop, node add), recompute all boundary bounding boxes. If any two boundaries overlap, shift the smaller (fewer nodes) boundary away from the larger one along the axis of least overlap. This runs on the parent diagram level since boundaries represent parent-level groups.

**Rationale**: Boundaries are derived from node positions, so resolving boundary overlap means adjusting the positions of all nodes within a group. Moving the smaller group minimizes disruption.

## Risks / Trade-offs

- **[Overlap resolution can cascade]** → Mitigation: cap iterations at 10, accept minor overlap if unresolved. Log a warning for debugging.
- **[Cross-group edge routing may cross boundaries visually]** → Mitigation: Accept default bezier routing for now; advanced routing is a non-goal.
- **[Performance with many context nodes]** → Mitigation: Context nodes are already rendered; making them interactive adds minimal overhead since SvelteFlow handles event delegation.
- **[Accidental zoom-out on background double-click]** → Mitigation: Only trigger on true pane background (not on boundaries or nodes). Users can navigate back easily via breadcrumb.
