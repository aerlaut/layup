# Task: Node subtree import utility

## Motivation
Once a subtree export file exists (see task 20), the app needs pure utility
functions to parse it, validate it, identify which nodes in the target diagram
are valid parents, remap all IDs to fresh values, and merge the subtree into the
live `DiagramState`. Keeping this logic in a utility module (no Svelte, no store
calls) makes it easy to test in isolation and keeps the UI layer thin.

## What to build

### 1. Create `src/utils/nodeSubtreeImport.ts`

#### `parseNodeSubtreeJSON(text: string): NodeSubtreeExport`

- `JSON.parse` the text; throw a descriptive `ImportError` (reuse the class from
  `persistence.ts`) for malformed JSON or missing fields.
- Validate required fields:
  - `exportType === 'node-subtree'`
  - `version === 1`
  - `rootLevel` is one of the four `C4LevelType` values
  - `levels` is a non-null object with at least the `rootLevel` key
  - `levels[rootLevel].nodes` is a non-empty array
- Throw `ImportError` with a user-readable message on any validation failure.

#### `getValidParentNodes(state: DiagramState, subtree: NodeSubtreeExport): C4Node[]`

- Determine the required parent level: `prevLevel(subtree.rootLevel)`.
- If `prevLevel` is `undefined` (root level is `'context'`), return `[]`
  (no parent needed).
- Otherwise, return all nodes at that level where
  `childTypeIsValid(node.type, subtree.rootLevel)` is true (uses the existing
  helper from `diagramLayout.ts`).
- If the result is empty the caller (UI) should surface an error telling the
  user to first create a compatible parent node.

#### `importNodeSubtree(state: DiagramState, subtree: NodeSubtreeExport, parentNodeId?: string): DiagramState`

Algorithm:
1. **Remap IDs** — build a `Map<string, string>` (old → new) for every node ID
   and every edge ID present across all levels of the subtree. Use the existing
   `generateId()` from `src/utils/id.ts`.
2. **Rewrite levels** — for each level in `subtree.levels`:
   - Rewrite each node: `id → newId`, `parentNodeId → remapped parentNodeId`.
     For the root node specifically, set `parentNodeId` to the supplied
     `parentNodeId` argument (which is already a live ID in the target diagram).
   - Rewrite each edge: `id → newId`, `source → remapped`, `target → remapped`.
3. **Merge into state** — for each rewritten level, spread the rewritten nodes
   and edges onto the corresponding `state.levels[level]`:
   ```ts
   nodes: [...state.levels[level].nodes, ...rewrittenNodes]
   edges: [...state.levels[level].edges, ...rewrittenEdges]
   ```
   Never touch `annotations`.
4. Return the new state (do not mutate the input).

> Note: no position offsetting. Imported nodes keep their original coordinates.
> The user can drag them after import. This keeps the logic simple and avoids
> heuristics about "where to place" the incoming content.

### 2. Re-export from `src/utils/persistence.ts`

```ts
export { parseNodeSubtreeJSON, getValidParentNodes, importNodeSubtree } from './nodeSubtreeImport';
```

## Acceptance criteria
- `parseNodeSubtreeJSON` throws `ImportError` for every invalid input variant
  (wrong exportType, missing levels, unknown rootLevel, etc.).
- `getValidParentNodes` returns an empty array for a context-level subtree and
  a correct filtered list for sub-levels.
- `importNodeSubtree` produces a state where:
  - All imported node/edge IDs are fresh (no collisions with pre-existing IDs).
  - The root node's `parentNodeId` matches the supplied `parentNodeId`.
  - All cross-references within the subtree (edge source/target,
    descendant parentNodeIds) are correctly remapped to the new IDs.
  - No annotations are added or removed.
  - The original `state` object is not mutated.
