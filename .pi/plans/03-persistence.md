# Task 03 — Persistence & Migration

## Files

- `src/utils/remapIds.ts`
- `src/utils/persistence.ts`

## Context

This task updates the import/export pipeline and adds a v1→v2 migration so that diagrams saved with the old format can still be loaded. It can be done in any order relative to tasks 04–06 as long as tasks 01 and 02 are done first.

---

## `src/utils/remapIds.ts` — rewrite

The old version walked the `diagrams` map and remapped `childDiagramId` cross-references. The new version iterates the four fixed `levels` and remaps `parentNodeId` references.

```typescript
import type { DiagramState, C4LevelType } from '../types';
import { generateId } from './id';
import { LEVEL_ORDER } from '../stores/diagramStore';

export function remapIds(state: DiagramState): DiagramState {
  // Build a node ID remap table across all levels
  const nodeIdMap = new Map<string, string>();
  const edgeIdMap = new Map<string, string>();
  const annotIdMap = new Map<string, string>();

  for (const level of LEVEL_ORDER) {
    const d = state.levels[level];
    for (const node  of d.nodes)       nodeIdMap.set(node.id,  generateId());
    for (const edge  of d.edges)       edgeIdMap.set(edge.id,  generateId());
    for (const annot of d.annotations) annotIdMap.set(annot.id, generateId());
  }

  // Rewrite all levels with remapped IDs
  const newLevels: DiagramState['levels'] = {} as DiagramState['levels'];

  for (const level of LEVEL_ORDER) {
    const d = state.levels[level];
    newLevels[level] = {
      ...d,
      nodes: d.nodes.map((n) => ({
        ...n,
        id:           nodeIdMap.get(n.id)!,
        // parentNodeId points to a node at the level above — remap it
        parentNodeId: n.parentNodeId ? nodeIdMap.get(n.parentNodeId) : undefined,
      })),
      edges: d.edges.map((e) => ({
        ...e,
        id:     edgeIdMap.get(e.id)!,
        source: nodeIdMap.get(e.source) ?? e.source,
        target: nodeIdMap.get(e.target) ?? e.target,
      })),
      annotations: d.annotations.map((a) => ({
        ...a,
        id: annotIdMap.get(a.id)!,
      })),
    };
  }

  return {
    ...state,
    levels: newLevels,
    selectedId: null,
    pendingNodeType: null,
  };
}
```

---

## `src/utils/persistence.ts`

### `parseDiagramJSON` — update validation

Replace the `diagrams` / `rootId` / `navigationStack` checks with `levels` / `currentLevel` checks, and add a migration call for v1 data:

```typescript
export function parseDiagramJSON(text: string): DiagramState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError('Invalid JSON file.');
  }

  const state = parsed as DiagramState;
  if (typeof state !== 'object' || state === null) {
    throw new ImportError('JSON is not an object.');
  }
  if (typeof state.version !== 'number') {
    throw new ImportError('Missing or invalid "version" field.');
  }
  if (state.version > SCHEMA_VERSION) {
    throw new ImportError(
      `Diagram was created with a newer version (v${state.version}). Please upgrade layup.`
    );
  }

  // Migrate v1 → v2
  if (state.version === 1) {
    return migrateDiagramStateV1toV2(state as unknown as DiagramStateV1);
  }

  // v2 validation
  if (!state.levels || typeof state.levels !== 'object') {
    throw new ImportError('Missing "levels" map.');
  }
  if (typeof state.currentLevel !== 'string') {
    throw new ImportError('Missing "currentLevel".');
  }
  return state;
}
```

### `DiagramStateV1` type alias

Define a local type alias for the old format to keep the migration function type-safe. Only include the fields you need for migration:

```typescript
// Local type alias for the old v1 format — used only in the migration path
interface DiagramStateV1 {
  version: 1;
  diagrams: Record<string, {
    id: string;
    level: string;
    label: string;
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      position: { x: number; y: number };
      childDiagramId?: string;
      parentNodeId?: string;
      [key: string]: unknown;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      sourceGroupId?: string;
      targetGroupId?: string;
      [key: string]: unknown;
    }>;
    annotations?: Array<{ id: string; [key: string]: unknown }>;
  }>;
  rootId: string;
  navigationStack: string[];
  selectedId: string | null;
  pendingNodeType: unknown;
}
```

### `migrateDiagramStateV1toV2` — the migration function

The v1 model stores nodes in per-parent child diagrams connected via `childDiagramId`. The migration must:

1. Walk the `diagrams` tree to find all nodes, assigning each node a `parentNodeId` based on which parent node's `childDiagramId` pointed to this node's diagram.
2. Assign all nodes to their correct level bucket based on their diagram's `level` field.
3. Collect edges: intra-group edges (stored on child diagrams) go to their natural level. Cross-group edges (stored on a parent diagram with `sourceGroupId`/`targetGroupId`) go to the level of the `sourceGroupId` child diagram (since both endpoints live at that level).
4. Set `currentLevel` to `'context'`.

```typescript
import { LEVEL_ORDER } from '../stores/diagramStore';
import type { C4LevelType, DiagramLevel, DiagramState } from '../types';

function migrateDiagramStateV1toV2(v1: DiagramStateV1): DiagramState {
  // Initialise empty buckets for all four levels
  type LevelBucket = { nodes: DiagramStateV1['diagrams'][string]['nodes']; edges: DiagramStateV1['diagrams'][string]['edges']; annotations: DiagramStateV1['diagrams'][string]['annotations'] };
  const buckets: Record<string, LevelBucket> = {};
  for (const l of LEVEL_ORDER) {
    buckets[l] = { nodes: [], edges: [], annotations: [] };
  }

  // Walk the v1 diagram tree depth-first.
  // parentNodeId is the node in the parent diagram whose childDiagramId === this diagram's id.
  function walk(diagramId: string, parentNodeId: string | undefined): void {
    const diag = v1.diagrams[diagramId];
    if (!diag) return;

    const level = diag.level as C4LevelType;
    if (!buckets[level]) return; // unknown level — skip

    // Collect nodes, tagging each with parentNodeId inherited from the walk
    for (const node of diag.nodes) {
      buckets[level].nodes.push({
        ...node,
        // The first node at the root level has no parentNodeId.
        // Nodes at deeper levels inherit the parentNodeId from the walk.
        parentNodeId: level === 'context' ? undefined : parentNodeId,
      } as DiagramStateV1['diagrams'][string]['nodes'][number]);

      // Recurse into child diagrams
      if (node.childDiagramId) {
        walk(node.childDiagramId, node.id);
      }
    }

    // Collect intra-group edges (no sourceGroupId / targetGroupId)
    for (const edge of diag.edges) {
      if (!edge.sourceGroupId && !edge.targetGroupId) {
        // Intra-level edge: belongs at this diagram's level
        const { sourceGroupId: _s, targetGroupId: _t, ...cleanEdge } = edge;
        buckets[level].edges.push(cleanEdge);
      } else {
        // Cross-group edge: source and target live in sourceGroupId / targetGroupId child diagrams.
        // Find what level those child diagrams are at.
        const srcDiag = edge.sourceGroupId ? v1.diagrams[edge.sourceGroupId] : undefined;
        const edgeLevel = (srcDiag?.level ?? level) as C4LevelType;
        if (buckets[edgeLevel]) {
          const { sourceGroupId: _s, targetGroupId: _t, ...cleanEdge } = edge;
          buckets[edgeLevel].edges.push(cleanEdge);
        }
      }
    }

    // Collect annotations
    for (const annot of diag.annotations ?? []) {
      buckets[level].annotations.push(annot);
    }
  }

  walk(v1.rootId, undefined);

  // Build the v2 DiagramState
  const levels = {} as DiagramState['levels'];
  for (const l of LEVEL_ORDER) {
    levels[l as C4LevelType] = {
      level: l as C4LevelType,
      nodes:       buckets[l].nodes       as DiagramState['levels'][C4LevelType]['nodes'],
      edges:       buckets[l].edges       as DiagramState['levels'][C4LevelType]['edges'],
      annotations: (buckets[l].annotations ?? []) as DiagramState['levels'][C4LevelType]['annotations'],
    };
  }

  return {
    version: 2, // SCHEMA_VERSION
    levels,
    currentLevel: 'context',
    selectedId: null,
    pendingNodeType: null,
  };
}
```

### `extractSubtree` / `exportLevelJSON` — redesign

The old `extractSubtree` walked the `childDiagramId` graph to collect a sub-tree rooted at a specific diagram ID. In v2 there is no such graph.

Replace with a function that exports all levels from `currentLevel` downward, preserving only edges whose both endpoints exist in the exported nodes:

```typescript
export function extractFromLevel(
  state: DiagramState,
  fromLevel: C4LevelType
): DiagramState {
  const { LEVEL_ORDER } = await import('../stores/diagramStore'); // or inline the array
  const levelIdx = LEVEL_ORDER.indexOf(fromLevel);

  const levelsToInclude = LEVEL_ORDER.slice(levelIdx) as C4LevelType[];

  // Build the new levels — copy levels at or below fromLevel as-is, empty out higher levels
  const newLevels = {} as DiagramState['levels'];
  for (const l of LEVEL_ORDER) {
    if (levelsToInclude.includes(l as C4LevelType)) {
      newLevels[l as C4LevelType] = state.levels[l as C4LevelType];
    } else {
      newLevels[l as C4LevelType] = { level: l as C4LevelType, nodes: [], edges: [], annotations: [] };
    }
  }

  return {
    version: state.version,
    levels: newLevels,
    currentLevel: fromLevel,
    selectedId: null,
    pendingNodeType: null,
  };
}

export function exportLevelJSON(state: DiagramState, fromLevel: C4LevelType, name?: string): void {
  const subtree = extractFromLevel(state, fromLevel);
  exportDiagramJSON(subtree, name);
}
```

### `Toolbar.svelte` call-site for `exportLevelJSON`

`handleExportLevel` in `Toolbar.svelte` currently passes `diagram.id`. After this change it passes `$diagramStore.currentLevel` (or the derived `currentLevel` store). Update this call-site as part of task 06 (UI components).

### `migrateFromLegacy` in `persistence.ts`

This function migrates from the very old single-diagram `layup_diagram` localStorage key to the `AppState` format. It calls `parseDiagramJSON`-like validation. Since `parseDiagramJSON` now calls the v1→v2 migration automatically, `migrateFromLegacy` does not need explicit changes — it will get the migration for free as long as the raw state it reads still looks like a v1 `DiagramState`.

Verify this by checking that `migrateFromLegacy` reads the raw JSON and assigns it to `diagram.state`. That state will be v1 format, and when it is later loaded via `openDiagram` → `loadDiagram`, it will be treated as v1 and migrated. If the legacy state is loaded directly without going through `parseDiagramJSON`, add an explicit call to `migrateDiagramStateV1toV2` in `migrateFromLegacy` as a safety net.
