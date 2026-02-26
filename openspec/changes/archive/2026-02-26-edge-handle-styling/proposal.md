## Why

Edges currently connect node-to-node without tracking which handle was used, resulting in all edges routing to the same default positions regardless of where the user initiated the connection. Additionally, edges lack visual customization — they always render as solid lines with a fixed arrow marker. This makes complex diagrams harder to read and limits users' ability to express different relationship types visually.

## What Changes

- **Handle-aware connections**: Store `sourceHandle` and `targetHandle` IDs on edges so connections route through the specific handles the user connected
- **Configurable edge markers**: Allow users to set the start and end markers of an edge to arrow, dot, or none (plain line)
- **Configurable line styles**: Allow users to change the edge line style to solid, dashed, or dotted
- **Edge path manipulation**: Allow users to add and move waypoints on edges so they can route edges around nodes for cleaner layouts

## Capabilities

### New Capabilities
- `edge-handle-routing`: Edges connect to and route through specific node handles, storing sourceHandle/targetHandle IDs
- `edge-markers`: Configurable start and end markers for edges (arrow, dot, none)
- `edge-line-styles`: Configurable line styles for edges (solid, dashed, dotted)
- `edge-waypoints`: Users can manipulate edge paths by adding/moving waypoints for custom routing

### Modified Capabilities
- `relationship-editor`: Edge properties panel gains marker and line style controls; edge data model extended with new fields

## Impact

- **Types**: `C4Edge` interface extended with `sourceHandle`, `targetHandle`, `markerStart`, `markerEnd`, `lineStyle`, and `waypoints` fields
- **Store**: `addEdge` must capture handle IDs from Connection object; `updateEdge` handles new properties
- **C4Edge.svelte**: Major rework — dynamic markers, line style rendering, waypoint-based path computation
- **PropertiesPanel.svelte**: New controls for marker type and line style selection
- **DiagramCanvas.svelte**: Pass handle info through connection handler; define SVG marker symbols (arrow, dot)
- **Persistence**: New fields serialize to localStorage/JSON exports; migration needed for existing saved diagrams
