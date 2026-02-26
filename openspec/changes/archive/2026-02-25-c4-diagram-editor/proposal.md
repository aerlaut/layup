## Why

Software architecture teams lack a purpose-built visual editor for C4 diagrams that makes navigating between abstraction levels intuitive. Existing tools are either generic diagramming tools that don't understand C4 semantics, or text-based tools that sacrifice visual clarity. A canvas-first editor with native C4 hierarchy traversal will make architectural documentation faster and more accessible.

## What Changes

- Introduce a new web application: a canvas-based C4 diagram editor
- Support all four C4 model levels: Context, Container, Component, and Code
- Enable drill-down navigation: double-click a component/container to enter its inner diagram
- Enable drill-up navigation: breadcrumb or back gesture to return to parent level
- Provide C4-typed elements: Person, Software System, Container, Component, with relationship arrows
- Allow labeling of elements and relationships (title, description, technology)
- Persist the diagram state in a structured format (JSON)

## Capabilities

### New Capabilities

- `canvas-editor`: The main canvas surface where users drag, drop, resize, and connect C4 elements
- `c4-elements`: The set of C4-typed shapes (Person, System, Container, Component) with their visual representations and metadata fields
- `hierarchy-navigation`: Drill-down (double-click into) and drill-up (breadcrumb back) transitions between C4 levels, maintaining parent-child relationships between diagrams
- `relationship-editor`: Drawing and labeling directed relationships between elements, including label, description, and technology annotations
- `diagram-persistence`: Save and load diagram state as structured JSON, representing the full multi-level C4 hierarchy

### Modified Capabilities

## Impact

- New standalone web application (no existing codebase impacted)
- Dependencies: canvas rendering library (e.g., Svelte Flow or Konva.js), Svelte, TypeScript
- Produces a client-side app with JSON-based diagram persistence (local storage or file export initially)
