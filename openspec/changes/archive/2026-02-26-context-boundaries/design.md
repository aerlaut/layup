## Context

Currently, when a user drills into a node (e.g., double-clicks a Container), the canvas shows only the child diagram's nodes and edges in isolation. The parent level and sibling groups are completely hidden. This makes it difficult to understand spatial relationships across the broader architecture.

The diagram data model stores each `DiagramLevel` independently in a flat `diagrams` map, keyed by ID. Navigation uses a `navigationStack` where the last entry is the active diagram. Each parent node links to its child diagram via `childDiagramId`.

## Goals / Non-Goals

**Goals:**
- Show faded boundary rectangles for the parent-level groupings when inside a child diagram
- Display sibling context nodes (children of other parent nodes at the same level) as dimmed, non-interactive elements
- Visually distinguish the focused group from sibling context groups
- Preserve full interactivity for the focused diagram's nodes and edges

**Non-Goals:**
- Cross-group edges (relationships between nodes in different parent groups) — future enhancement
- Collapsing/expanding context groups interactively
- Showing more than one level of parent context (only the immediate parent level is shown)
- Allowing drag/edit of context nodes

## Decisions

### 1. Context assembly via a derived store

**Decision**: Create a `contextBoundaries` derived store that computes boundary groups from the parent diagram whenever the user is below root level.

**Rationale**: Keeps the computation reactive and decoupled from the canvas component. The store reads the parent diagram (one level up in `navigationStack`), iterates its nodes, and for each node that has a `childDiagramId`, gathers that child diagram's nodes. The result is an array of `BoundaryGroup` objects.

**Alternatives considered**:
- Computing context inline in `DiagramCanvas.svelte` — rejected because it mixes data logic with rendering
- Storing context data persistently — unnecessary since it's fully derivable

### 2. Render boundaries as xyflow group nodes

**Decision**: Use xyflow's built-in group/parent node mechanism. Each boundary is rendered as a node with `type: 'boundary'` positioned behind its children. Context child nodes are rendered as regular flow nodes but with a `contextNode: true` data flag.

**Rationale**: xyflow supports parent-child grouping natively via `parentId` and `extent: 'parent'`. This handles z-ordering and containment automatically. A custom `BoundaryNode.svelte` component renders the faded rectangle with the parent label.

**Alternatives considered**:
- SVG overlays outside xyflow — rejected because positioning would need manual sync with xyflow's viewport transform
- Using xyflow's `Background` component — too limited for dynamic, per-group boundaries

### 3. Context nodes are non-interactive via pointer-events and class styling

**Decision**: Context nodes receive `selectable: false`, `draggable: false`, `connectable: false` in their xyflow node config. A CSS class `.context-node` applies `opacity: 0.35` and `pointer-events: none`.

**Rationale**: Simplest approach — xyflow respects these flags natively. No custom event filtering needed.

### 4. Focused boundary gets subtle highlight

**Decision**: The boundary group corresponding to the active/focused diagram gets a slightly stronger border color and opacity (e.g., `opacity: 0.5` vs `0.25` for siblings), plus a subtle background tint.

**Rationale**: Helps users instantly identify which group they're editing without being visually heavy.

### 5. Boundary positioning uses bounding box of child nodes

**Decision**: Each boundary rectangle is positioned/sized to enclose all its child nodes with padding. If a group has no children yet, use a minimum size with the parent node's original position as reference.

**Rationale**: Dynamic sizing ensures boundaries adapt as nodes are added/moved. The padding gives visual breathing room.

## Risks / Trade-offs

- **Performance with many context nodes** → Mitigated by only showing one parent level of context. For very large diagrams, context nodes could be capped or culled based on viewport.
- **Layout complexity** → Boundary positions are computed from child node positions, which may shift. Using xyflow's `fitView` after context assembly helps. Boundary recalculation on node drag is scoped to the active group only.
- **Visual clutter** → Low opacity and non-interactivity keep context subtle. If users find it distracting, a toggle could be added later (non-goal for now).
- **Empty sibling groups** → Parents with no children yet still show a small boundary placeholder so users know they exist.
