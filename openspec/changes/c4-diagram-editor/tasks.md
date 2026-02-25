## 1. Project Setup

- [x] 1.1 Initialize Svelte + TypeScript project with Vite (`npm create vite@latest` with Svelte template)
- [x] 1.2 Install Svelte Flow (`@xyflow/svelte`), and set up basic app shell with CSS reset
- [x] 1.3 Define the core TypeScript types: `DiagramLevel`, `C4Node`, `C4Edge`, `C4NodeType`, `C4LevelType`
- [x] 1.4 Set up Svelte writable store (`diagramStore`) with initial state shape and empty action functions
- [x] 1.5 Scaffold folder structure: `components/`, `canvas/`, `elements/`, `stores/`, `utils/`

## 2. Data Model & State

- [x] 2.1 Implement reducer actions: `ADD_NODE`, `UPDATE_NODE`, `DELETE_NODE`, `ADD_EDGE`, `UPDATE_EDGE`, `DELETE_EDGE`
- [x] 2.2 Implement reducer actions: `CREATE_CHILD_DIAGRAM`, `DRILL_DOWN`, `DRILL_UP`, `NAVIGATE_TO`
- [x] 2.3 Implement reducer actions: `LOAD_DIAGRAM`, `RESET_DIAGRAM`
- [x] 2.4 Write helper selectors: `getCurrentDiagram()`, `getDiagramById()`, `getBreadcrumbPath()`
- [x] 2.5 Add schema versioning constant and include it in the state root

## 3. Persistence

- [x] 3.1 Implement `saveToLocalStorage(state)` and `loadFromLocalStorage()` utilities
- [x] 3.2 Wire auto-save: subscribe to `diagramStore` changes and debounce writes to localStorage
- [x] 3.3 Restore state from localStorage on app init (fall back to empty root diagram if none found)
- [x] 3.4 Implement `exportDiagramJSON(state)` — triggers browser file download of `diagram.json`
- [x] 3.5 Implement `importDiagramJSON(file)` — parses file, validates schema version, dispatches `LOAD_DIAGRAM`
- [x] 3.6 Implement localStorage size check and display a warning banner when usage exceeds 4MB

## 4. Canvas Shell

- [x] 4.1 Create `<DiagramCanvas>` component wrapping Svelte Flow with pan/zoom enabled
- [x] 4.2 Configure Svelte Flow with `nodeTypes` and `edgeTypes` maps (initially empty custom types)
- [x] 4.3 Wire Svelte Flow `nodes` and `edges` from `getCurrentDiagram()` store value
- [x] 4.4 Handle Svelte Flow `on:nodeschange` and `on:edgeschange` to dispatch position/deletion updates
- [x] 4.5 Handle canvas click-to-deselect by dispatching deselect on background click

## 5. C4 Element Nodes

- [x] 5.1 Build `<PersonNode>` custom Svelte Flow node with person icon, label
- [x] 5.2 Build `<SystemNode>` custom Svelte Flow node with rectangle, label, description
- [x] 5.3 Build `<ContainerNode>` custom Svelte Flow node with rectangle, label, description, technology badge
- [x] 5.4 Build `<ComponentNode>` custom Svelte Flow node styled differently from Container, with same fields
- [x] 5.5 Register all node types in Svelte Flow `nodeTypes` map
- [x] 5.6 Add a drill-in visual indicator (e.g., small arrow icon) on drillable elements that have a child diagram

## 6. Properties Panel

- [x] 6.1 Build `<PropertiesPanel>` sidebar component that appears when an element or edge is selected
- [x] 6.2 Wire panel fields (label, description, technology) to dispatch `UPDATE_NODE` or `UPDATE_EDGE`
- [x] 6.3 Support inline label editing on double-click for Person nodes (non-drillable)

## 7. Element Palette

- [x] 7.1 Build `<ElementPalette>` component listing available C4 element types
- [x] 7.2 Filter palette entries based on current diagram level (Context: Person + System; Container level: Container; Component level: Component)
- [x] 7.3 Implement click-to-place: clicking a palette item then clicking canvas places a new node at that position via `ADD_NODE`

## 8. Relationship Editor

- [x] 8.1 Create custom Svelte Flow edge type `<C4Edge>` with directed arrowhead and label display
- [x] 8.2 Register `C4Edge` in Svelte Flow `edgeTypes` map
- [x] 8.3 Handle Svelte Flow `on:connect` to dispatch `ADD_EDGE` with default empty label/description/technology
- [x] 8.4 Wire relationship deletion through Svelte Flow `on:edgeschange` delete events
- [x] 8.5 Show relationship fields (label, description, technology) in the properties panel when an edge is selected

## 9. Hierarchy Navigation

- [x] 9.1 Implement `on:nodedblclick` handler: if node is drillable, dispatch `DRILL_DOWN` (creating child if needed); if Person, enter label edit mode
- [x] 9.2 Build `<BreadcrumbBar>` component that renders the navigation stack as clickable path items
- [x] 9.3 Wire breadcrumb clicks to dispatch `NAVIGATE_TO` with the target diagram ID
- [x] 9.4 Add a Back button (and Escape key handler) that dispatches `DRILL_UP`
- [x] 9.5 Disable/hide Back button when at root diagram
- [x] 9.6 Implement drill-down CSS transition: zoom into clicked element, crossfade to child canvas
- [x] 9.7 Implement drill-up CSS transition: crossfade back to parent canvas

## 10. Toolbar & Export UI

- [x] 10.1 Build top `<Toolbar>` component with: diagram title, Back button, breadcrumb area, Export JSON button, Import JSON button
- [x] 10.2 Wire Export JSON button to `exportDiagramJSON`
- [x] 10.3 Wire Import JSON button to file input → `importDiagramJSON`
- [x] 10.4 Show import error toast/message when JSON is invalid

## 11. Polish & Validation

- [x] 11.1 Verify palette filtering is correct at all four C4 levels
- [x] 11.2 Verify breadcrumb correctly reflects drill depth after navigation and on reload
- [x] 11.3 Verify export → import round-trip preserves all nodes, edges, and child diagrams
- [x] 11.4 Add basic responsive layout so the app is usable on wide desktop screens
- [ ] 11.5 Manual smoke test: build a 3-level C4 diagram (Context → Container → Component) and verify all interactions
