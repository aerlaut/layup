# Task: Define NodeSubtreeExport type and export utility

## Motivation
Users need a way to package a selected C4 node and all of its descendants into a
portable JSON file that can later be imported into another diagram under a
compatible parent. This task establishes the data contract (`NodeSubtreeExport`)
and the pure utility function that produces the export file, with no UI concerns.

## What to build

### 1. Add `NodeSubtreeExport` to `src/types.ts`

```ts
export interface NodeSubtreeLevelData {
  level: C4LevelType;
  nodes: C4Node[];
  edges: C4Edge[];
  // Annotations are intentionally excluded — they are free-floating and have
  // no semantic relationship to the exported node's subtree.
}

export interface NodeSubtreeExport {
  /** Distinguishes this format from a full DiagramState export. */
  exportType: 'node-subtree';
  /** Bump when the format changes in a breaking way. */
  version: 1;
  /** The C4 level at which the root node lives. */
  rootLevel: C4LevelType;
  /**
   * Data for rootLevel and every level below it.
   * levels[rootLevel].nodes[0] is always the root node, with parentNodeId
   * stripped (undefined) so it can be re-parented on import.
   * Edges at rootLevel are excluded because they connect to nodes outside the
   * subtree. Edges at descendant levels are included only when both the source
   * and target node are within the subtree.
   */
  levels: Partial<Record<C4LevelType, NodeSubtreeLevelData>>;
}
```

### 2. Create `src/utils/nodeSubtreeExport.ts`

Implement and export:

```ts
export function buildNodeSubtreeExport(
  state: DiagramState,
  nodeId: string
): NodeSubtreeExport
```

Algorithm:
1. Find the root node in `state.levels` — iterate `LEVEL_ORDER` to locate the
   level that contains a node with the given `nodeId`. Throw if not found.
2. Call the existing `collectDescendants(state, nodeId, rootLevel)` to get a
   `Map<C4LevelType, Set<string>>` of all node IDs at each descendant level
   (the map already includes the root level with `{nodeId}`).
3. For each level present in the descendants map (from rootLevel downward):
   - **nodes**: filter `state.levels[level].nodes` to those whose id is in the set.
   - **edges**: filter `state.levels[level].edges` to those where *both* `source`
     and `target` are in the set for that level. Skip edges at `rootLevel`
     (there is only one node there, so no intra-level edges are possible, but
     apply the filter consistently for correctness).
4. In the root level data, set `parentNodeId: undefined` on the root node.
5. Return a `NodeSubtreeExport` object.

```ts
export function exportNodeSubtree(
  state: DiagramState,
  nodeId: string,
  label?: string
): void
```

- Calls `buildNodeSubtreeExport`, serialises to JSON, and triggers a browser
  download with filename `<label>-subtree.json` (falling back to
  `node-subtree.json`).
- Reuses the same download pattern already used by `exportDiagramJSON` in
  `src/utils/persistence.ts`.

### 3. Re-export from `src/utils/persistence.ts`

Add:
```ts
export { exportNodeSubtree } from './nodeSubtreeExport';
```

## Acceptance criteria
- `buildNodeSubtreeExport` returns a well-formed `NodeSubtreeExport` for a
  node at every level (context, container, component, code).
- The root node's `parentNodeId` is always `undefined` in the export.
- Edges are included at descendant levels only when both endpoints are in the
  subtree; no edges appear at the root level.
- Annotations are never included.
- `exportNodeSubtree` triggers a file download.
