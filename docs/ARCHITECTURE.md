# Architecture

## Purpose

Layup is a browser-based [C4 model](https://c4model.com/) diagram editor. Users create and navigate hierarchical software architecture diagrams across four levels: Context → Container → Component → Code. All state is persisted locally in `localStorage`; there is no backend.

## Tech Stack

| Tool | Role |
|---|---|
| Svelte 5 | UI framework (runes-era reactive model) |
| TypeScript | Type system — all core types live in `src/types.ts` |
| Vite | Build tool and dev server |
| @xyflow/svelte | Canvas graph rendering (nodes, edges, pan/zoom) |
| AJV | JSON schema validation for import/export |
| Vitest | Unit testing |

## Directory Layout

```
src/
├── types.ts            # All shared TypeScript types (single source of truth)
├── App.svelte          # Root component; mounts Shell or HomeScreen
├── stores/             # Svelte stores — all application state
│   ├── appStore.ts         # AppState: projects, account, active view
│   ├── diagramStore.ts     # DiagramState: nodes, edges, current level
│   ├── diagramNavigation.ts # Level traversal helpers (drillDown, drillUp)
│   ├── diagramLayout.ts    # Boundary grouping, overlap resolution, childTypeIsValid()
│   └── undoHistory.ts      # Undo/redo stack
├── canvas/             # Canvas rendering and interaction
│   ├── DiagramCanvas.svelte # xyflow surface
│   ├── flowSync.ts         # Syncs diagramStore ↔ xyflow internal state
│   ├── canvasHandlers.ts   # User interaction (click, select, connect)
│   ├── canvasDragDrop.ts   # Drag-and-drop placement and boundary validation
│   └── positionUtils.ts    # Position math
├── components/         # UI chrome (palette, properties panel, toolbar, dialogs)
├── elements/           # Svelte node/edge components rendered by xyflow
│   └── *Node.svelte, C4Edge.svelte
├── screens/            # Full-page views (HomeScreen, DiagramCard, ProjectCard)
└── utils/              # Pure helpers (id generation, persistence, colors, constants)

schema/                 # JSON schemas (generated via `npm run schema`)
│   ├── diagram.schema.json      # Full DiagramState — for tools that produce complete diagram files
│   └── nodeSubtree.schema.json  # NodeSubtreeExport — for tools that produce Import Node files
docs/                   # Project documentation
```

## Core Data Model

All types are defined in `src/types.ts`.

```
AppState
  version: number                    ← schema version for migration
  account: Account
  projects: Record<id, Project>
    └── diagrams: Record<id, DiagramMeta>
          └── state: DiagramState
                version: number
                currentLevel: C4LevelType
                levels: Record<C4LevelType, DiagramLevel>
                  └── nodes: C4Node[]
                      edges: C4Edge[]
                      annotations: Annotation[]
```

**C4 levels** (fixed, always present): `context | container | component | code`

**C4 node types** by level:
- context: `person`, `external-person`, `system`, `external-system`
- container: `container`, `database`
- component: `component`, `db-schema`
- code: `class`, `abstract-class`, `interface`, `enum`, `record`, `erd-table`, `erd-view`

**Annotations** (`group | note | package`) are free-floating canvas elements stored separately from C4 nodes. They have no `parentNodeId` and are never part of the C4 hierarchy.

## State & Data Flow

Two primary stores:

- **`appState`** — owns projects, account, and the diagram metadata tree
- **`diagramStore`** — owns the active `DiagramState` (nodes, edges for all levels)
- **`appView`** — tracks which screen is shown (`home` | `editor`)

Data flow:
```
User interaction
  → canvasHandlers / canvasDragDrop
  → store mutations (diagramStore.update / appStore actions)
  → derived stores recompute (breadcrumbs, contextBoundaries, projectList…)
  → components re-render
  → persistence.ts debounces write to localStorage
```

**xyflow bridge**: `flowSync.ts` translates between `diagramStore`'s node/edge arrays and xyflow's internal graph state. Changes in either direction are synced through this module.

## Key Invariants

These are non-obvious rules that must be maintained when modifying diagram state:

1. **Valid node hierarchy** — `childTypeIsValid(parentType, childType)` in `diagramLayout.ts` enforces which node types may be nested. Never skip this check when placing or importing nodes.

2. **Annotations are separate** — `Annotation` objects have no `parentNodeId`, are never drilled into, and are excluded from `NodeSubtreeExport`. Do not treat them as `C4Node`s.

3. **Non-drillable types** — `NON_DRILLABLE_TYPES` (`person`, all UML class types, all ERD types) cannot be drilled into. These node types expose their internal structure via `members`/`columns` fields instead.

4. **Schema versions** — `DiagramState.version` and `AppState.version` exist for migration. Do not remove these fields or reset them to a lower value.

5. **Subtree export edge exclusion** — When exporting a node subtree, edges at the root level are excluded (they connect outside the subtree). Edges at descendant levels are included only when both endpoints are within the subtree.

6. **Boundary grouping is derived** — `contextBoundaries` is a derived store; it is never written directly. Boundary boxes are recomputed from node positions on every state change.
