# Refactor: Flat Level Architecture — Overview

## Goal

Replace the current dynamic-graph diagram model (where each drillable node owns a private child `DiagramLevel` linked via `childDiagramId`) with a flat level model (four fixed levels — context, container, component, code — where every node at a level simply carries a `parentNodeId` pointing to its owner at the level above).

## Why

The current model has an impedance mismatch: the data model (one diagram per drilled node) fights the visual model (all sibling groups shown together). The result is cross-diagram edge routing, sibling traversal in every handler, and the inability to drill into nodes outside the currently active boundary group. The flat model makes the data match what the UI already shows.

## Key Decisions

- **Parent assignment on node drop**: Drop inside a boundary group's bounding box → node gets that group's `parentNodeId`. Drop in empty space at a non-context level → rejected (no creation). At context level → always allowed, no parent.
- **Palette at component level**: Show both `component` and `db-schema`; remove the `parentNodeType === 'database'` conditional.
- **Breadcrumb**: Show fixed level names (Context → Container → Component → Code) up to `currentLevel`. No element-level tracking.
- **"Has children" indicator on nodes**: Computed in `flowSync` by checking if any nodes at the next level have `parentNodeId === this node's id`. Passed as `hasChildren: boolean` in the flow node's `data`.

## Task List

| # | File(s) | Description | Depends on |
|---|---------|-------------|------------|
| 01 | `src/types.ts`, `src/utils/constants.ts` | Type system changes — new `DiagramState`, updated `C4Node`/`C4Edge`/`BoundaryGroup`/`DiagramLevel` | — |
| 02 | `src/stores/diagramStore.ts` | Core store rewrite — new selectors, actions, derived stores | 01 |
| 03 | `src/utils/remapIds.ts`, `src/utils/persistence.ts` | Persistence & migration — v1→v2 data migration, updated import/export | 01 |
| 04 | `src/canvas/flowSync.ts` | Rendering pipeline — `buildFlowData` rewrite | 01, 02 |
| 05 | `src/canvas/canvasHandlers.ts`, `src/canvas/canvasDragDrop.ts` | Canvas interaction handlers | 01, 02, 04 |
| 06 | `src/elements/*.svelte`, `src/components/Toolbar.svelte`, `src/components/BreadcrumbBar.svelte`, `src/components/ElementPalette.svelte` | UI components — node drill indicators, toolbar, breadcrumb, palette | 01, 02, 04 |

## Execution Order

Tasks 01 → 02 form a critical path that will leave the app non-functional until 04 is also done. Treat 01+02+04 as a single "restore working state" group for the first session if possible, or accept that the app is broken between sessions 01–04.

Tasks 03, 05, and 06 can each be done independently after 01+02 are complete.

## New Data Model Summary

```typescript
// DiagramState — replaces dynamic diagrams map + navigationStack
interface DiagramState {
  version: number;                           // bumped to 2
  levels: Record<C4LevelType, DiagramLevel>; // four fixed levels
  currentLevel: C4LevelType;                 // replaces navigationStack
  selectedId: string | null;
  pendingNodeType: PaletteItemType | null;
}

// C4Node — parentNodeId replaces childDiagramId
interface C4Node {
  // REMOVED: childDiagramId?: string
  // ADDED:
  parentNodeId?: string; // ID of the owning node at the level above
  // ... all other fields unchanged
}

// C4Edge — sourceGroupId/targetGroupId removed (no longer needed)
interface C4Edge {
  // REMOVED: sourceGroupId?: string
  // REMOVED: targetGroupId?: string
  // ... all other fields unchanged
}

// DiagramLevel — id and label removed (level is the key, label is derived from C4LevelType)
interface DiagramLevel {
  // REMOVED: id: string
  // REMOVED: label: string
  level: C4LevelType;
  nodes: C4Node[];   // ALL nodes at this level across all parent groups
  edges: C4Edge[];   // ALL edges at this level
  annotations: Annotation[];
}

// BoundaryGroup — childDiagramId removed
interface BoundaryGroup {
  parentNodeId: string;
  parentLabel: string;
  childNodes: C4Node[];
  boundingBox: { x: number; y: number; width: number; height: number };
  // REMOVED: childDiagramId?: string
}
```
