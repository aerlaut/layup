## Context

Vasker is a C4 diagramming tool built with Svelte 5 and @xyflow/svelte v1.5.1. Edges currently store only `source` and `target` node IDs — handle IDs from the Connection object are discarded. All edges render as solid bezier curves with a hardcoded arrow marker at the end. There is no way to customize edge appearance or manually route edges.

The @xyflow/svelte library already provides:
- `sourceHandle` and `targetHandle` fields on the Connection object
- SVG marker support via `markerStart` and `markerEnd` props on edges
- Built-in edge path functions: `getBezierPath`, `getSmoothStepPath`, `getStraightPath`
- Edge style props for stroke dasharray

## Goals / Non-Goals

**Goals:**
- Edges route through the exact handles the user connected
- Users can customize edge start/end markers (arrow, dot, none)
- Users can customize edge line style (solid, dashed, dotted)
- Users can manipulate edge routing for cleaner diagram layouts
- Existing diagrams continue to work (backward-compatible migration)

**Non-Goals:**
- Custom marker shapes beyond arrow, dot, and none
- Edge color customization
- Animated edges
- Automatic edge routing / layout algorithms

## Decisions

### 1. Store handle IDs on C4Edge

**Decision**: Extend `C4Edge` with optional `sourceHandle` and `targetHandle` string fields.

**Rationale**: The @xyflow Connection object already provides these values. Storing them lets @xyflow route the edge to the correct handle position automatically — no manual coordinate math needed. Optional fields ensure backward compatibility with existing edges (they'll use @xyflow's default handle selection).

**Alternative considered**: Store handle positions (Left/Right/Top/Bottom) instead of IDs. Rejected because @xyflow needs the handle ID string, not the position, and IDs are more precise when a side has both source and target handles.

### 2. Use SVG marker definitions for arrow and dot

**Decision**: Define reusable SVG `<marker>` elements (arrow, dot) inside the SvelteFlow component's SVG layer. Reference them via `markerStart`/`markerEnd` URL strings on each edge.

**Rationale**: @xyflow's BaseEdge already supports `markerStart` and `markerEnd` props. SVG markers are the standard approach and render efficiently. We need markers for both start and end positions.

**Markers**:
- `arrow`: A filled triangle/chevron pointing in the edge direction
- `dot`: A filled circle at the connection point
- `none`: No marker (omit the prop or set to empty string)

**Alternative considered**: Custom SVG elements positioned manually at edge endpoints. Rejected — SVG markers auto-orient with the path direction, which is exactly what we need.

### 3. Use CSS stroke-dasharray for line styles

**Decision**: Apply line styles via the `style` prop on @xyflow edges, using `stroke-dasharray` CSS values.

**Rationale**: @xyflow edges accept a `style` prop that maps to SVG path styles. `stroke-dasharray` is the standard SVG approach for dashed/dotted lines and works with all edge path types.

**Styles**:
- `solid`: No dasharray (default)
- `dashed`: `stroke-dasharray: 8 4`
- `dotted`: `stroke-dasharray: 2 2`

### 4. Waypoints via smoothstep path with intermediate points

**Decision**: Use a custom edge path that interpolates through user-defined waypoints. Store waypoints as an array of `{x, y}` coordinates on the edge. Users add waypoints by double-clicking the edge path, and drag them to reposition. Delete a waypoint by right-click or selecting and pressing Delete.

**Rationale**: @xyflow doesn't have built-in waypoint support, but custom edge components can compute any SVG path. A series of smoothstep segments through waypoints gives users control over routing while keeping paths visually clean.

**Alternative considered**: Using @xyflow's built-in edge types (bezier, smoothstep, step). These only support source-to-target paths without intermediate control points — insufficient for manual routing.

### 5. Edge property defaults and migration

**Decision**: New fields default to: `markerStart: 'none'`, `markerEnd: 'arrow'`, `lineStyle: 'solid'`, `sourceHandle: undefined`, `targetHandle: undefined`, `waypoints: []`. Existing edges without these fields are treated as having default values (no migration step needed — handled at read time).

**Rationale**: Defaults match current behavior (solid line, arrow at end, auto handle selection). Read-time defaults avoid a data migration step and keep persistence simple.

## Risks / Trade-offs

- **[Waypoint complexity]** → Custom path computation adds complexity to C4Edge.svelte. Mitigate by keeping the path algorithm simple (series of straight segments with rounded corners) and testing with various node layouts.
- **[SVG marker scaling]** → SVG markers can look inconsistent at different zoom levels. Mitigate by using `markerUnits="strokeWidth"` and testing at various zoom levels.
- **[Performance with many waypoints]** → Many waypoints on many edges could slow rendering. Mitigate by limiting waypoints per edge (e.g., max 10) and using efficient SVG path construction.
- **[Backward compatibility]** → Existing saved diagrams lack new fields. Mitigate with read-time defaults so no migration is needed.
