## Context

This is a greenfield web application. There is no existing codebase. The editor must render a canvas where users visually assemble C4 architecture diagrams across up to four nested levels: Context → Container → Component → Code. The central UX challenge is making hierarchy traversal feel seamless—users should always know where they are and be able to navigate freely.

C4 diagrams are hierarchical: a Software System in a Context diagram contains a set of Containers; each Container contains Components; each Component can contain Code-level elements. The data model must encode this tree.

## Goals / Non-Goals

**Goals:**
- Canvas-based drag-and-drop editor for C4 elements
- All four C4 levels supported with visually distinct element types
- Double-click to drill into a container/component and see its inner diagram
- Breadcrumb navigation to traverse back up the hierarchy
- Directed relationship arrows with label, description, technology annotations
- Persist diagram state as JSON (local storage + file export/import)
- Svelte + TypeScript, Svelte Flow as the canvas library

**Non-Goals:**
- Real-time collaboration (no multiplayer in v1)
- Backend / cloud sync (client-side only in v1)
- Code-level auto-generation from source code
- Export to image/PDF in v1
- Version history / undo beyond browser session

## Decisions

### 1. Canvas Library: Svelte Flow

**Decision**: Use [Svelte Flow](https://svelteflow.dev/) (`@xyflow/svelte`) as the canvas rendering engine.

**Rationale**: Svelte Flow is the official Svelte port of the XYFlow library, purpose-built for node-edge graph UIs. It provides: draggable nodes, connectable edges, zoom/pan, custom node components, and a well-maintained API that mirrors React Flow's design. Alternatives:
- *Konva.js*: Lower-level, requires more manual work for edges and interaction.
- *Cytoscape.js*: Powerful but designed for graph analysis, not diagram editing UX.
- *draw.io embed*: No custom C4 semantics, harder to own the data model.

Svelte Flow's custom node API allows C4-specific shapes with metadata fields without fighting the library. Its Svelte-native event model (`on:nodeclick`, `on:nodedblclick`, `on:connect`) integrates cleanly with Svelte's reactivity.

### 2. Hierarchy Data Model: Nested Diagram Tree

**Decision**: Model the diagram as a tree of `DiagramLevel` nodes, where each C4 element can own a child `DiagramLevel`.

```ts
type DiagramLevel = {
  id: string;
  level: "context" | "container" | "component" | "code";
  nodes: C4Node[];
  edges: C4Edge[];
};

type C4Node = {
  id: string;
  type: "person" | "system" | "container" | "component" | "code-element";
  label: string;
  description?: string;
  technology?: string;
  position: { x: number; y: number };
  childDiagramId?: string; // reference to a nested DiagramLevel
};
```

The root is always a Context-level diagram. Each drillable node carries a `childDiagramId` pointing to its inner diagram.

**Rationale**: A flat map of diagrams keyed by ID, referenced by `childDiagramId`, is simpler to serialize and navigate than a deeply nested tree. Navigation state is just a stack of diagram IDs.

### 3. Navigation: ID Stack

**Decision**: Maintain a `navigationStack: string[]` in a Svelte writable store. The current diagram is `stack[stack.length - 1]`. Drill-down pushes, drill-up pops.

**Rationale**: A stack naturally models depth-first hierarchy traversal. The breadcrumb is derived by mapping the stack to diagram labels. No router needed—this is pure in-memory state.

### 4. State Management: Svelte Writable Store

**Decision**: Use a Svelte writable store with exported action functions for global diagram state. No external state library in v1.

**Rationale**: The data model is a single JSON tree. A custom writable store with named update functions (`addNode`, `deleteNode`, `addEdge`, `setChildDiagram`, `drillDown`, `drillUp`, `loadDiagram`) is idiomatic Svelte and keeps dependencies minimal. Svelte's built-in `$store` auto-subscription syntax eliminates boilerplate compared to React Context.

### 5. Persistence: localStorage + JSON file export/import

**Decision**: Auto-save diagram state to `localStorage` on every change. Provide explicit "Export JSON" and "Import JSON" buttons.

**Rationale**: No backend in v1. localStorage gives persistence across browser sessions. JSON export/import allows sharing and backup. File format is the canonical `DiagramLevel` tree.

## Risks / Trade-offs

- **Svelte Flow bundle size** (~200KB gzipped) is significant for a single-page app → acceptable for a desktop-targeted tool; Svelte's compiler output partially offsets this vs. a React equivalent
- **Deep hierarchies** (e.g., 4+ levels) may make the navigation stack hard to follow → mitigate with a clear breadcrumb showing full path
- **localStorage size limits** (~5MB) may be hit for very large diagrams → warn user when approaching limit; JSON export is the escape hatch
- **Double-click conflict with node selection** in Svelte Flow → use the `on:nodedblclick` event exclusively for drill-down; single-click handles selection
- **C4 level enforcement**: The model allows any element at any level, but C4 has strict semantics (e.g., only Containers inside a System). Enforce this in the UI by filtering the element palette based on current level → reduces user confusion

## Migration Plan

N/A — greenfield application. No migration needed.

## Open Questions

- Should Code-level diagrams show a simplified class/sequence diagram, or just a generic node-edge graph? (Recommend: generic node-edge for v1, typed code elements in v2)
- Should the app support multiple top-level Context diagrams (i.e., a project with several systems), or always a single root? (Recommend: single root for v1, multi-root in v2)
