## Context

All four C4 node types (Person, System, Container, Component) currently have exactly two handles: a target handle at the top and a source handle at the bottom. This limits connections to vertical flows. Users need horizontal connections for side-by-side relationships and more flexible diagram layouts.

Each node component in `src/elements/` uses `@xyflow/svelte`'s `<Handle>` component with `Position.Top` and `Position.Bottom`. Adding side handles follows the same pattern.

## Goals / Non-Goals

**Goals:**
- Add left and right handles to all four node types
- Side handles support both source and target connections (users can drag from/to either side)
- Handles are visually consistent with existing top/bottom handles
- No breaking changes to existing edges or connections

**Non-Goals:**
- Custom handle styling or per-node handle configuration
- Handle visibility toggles or conditional handles
- Changing edge routing algorithms
- Smart handle selection (auto-choosing closest handle)

## Decisions

### 1. Side handles are bidirectional (both source and target)

Each side (left, right) gets two handles: one `type="target"` and one `type="source"`. This allows edges to connect in either direction from the sides, matching how users expect to draw horizontal connections.

**Alternative considered**: Single handle per side with `type="source"` only — rejected because it would prevent incoming horizontal connections.

### 2. Use unique handle IDs to disambiguate

With multiple source/target handles per node, xyflow needs unique `id` props on each handle to distinguish them. We'll use descriptive IDs: `top-target`, `bottom-source`, `left-target`, `left-source`, `right-target`, `right-source`.

**Alternative considered**: Relying on position alone — rejected because xyflow requires explicit IDs when a node has multiple handles of the same type.

### 3. Modify all four node components directly

Each node component gets the same four additional `<Handle>` elements. No shared wrapper or abstraction — the change is small enough to duplicate across four files.

**Alternative considered**: Creating a shared `NodeHandles.svelte` wrapper — rejected as over-engineering for adding 4 lines per component.

## Risks / Trade-offs

- **Visual clutter**: More handles visible on each node → Mitigate with CSS to keep side handles subtle (small, semi-transparent until hovered)
- **Overlapping handles on left/right**: Two handles (source + target) at same position → Use slight vertical offset or rely on xyflow's built-in stacking
