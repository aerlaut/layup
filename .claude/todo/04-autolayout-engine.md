# Task: Auto-layout engine (autoLayout.ts)

## Motivation

Layup's current layout code (`diagramLayout.ts`) only resolves overlaps with a greedy push algorithm — it doesn't use edge information or produce aesthetically arranged diagrams. Adding an ELK-based layout engine gives users a way to automatically arrange diagrams with edge-aware placement and minimal crossings.

This task covers installing `elkjs` and writing the pure layout function. The UI wiring is a separate task.

## Steps

### 1. Install dependency

```bash
npm install elkjs
```

Use `elkjs/lib/elk.bundled.js` to avoid Vite needing to serve the `.wasm` file separately:

```ts
import ELK from 'elkjs/lib/elk.bundled.js';
```

### 2. Define types in `src/stores/autoLayout.ts`

```ts
export type LayoutDirection = 'right' | 'down';
export type LayoutStyle     = 'flow' | 'compact';
export type LayoutSpacing   = 'tight' | 'normal' | 'loose';

export interface LayoutOptions {
  direction: LayoutDirection;
  style:     LayoutStyle;
  spacing:   LayoutSpacing;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  direction: 'right',
  style:     'flow',
  spacing:   'normal',
};
```

### 3. Implement `applyAutoLayout(state, options): Promise<DiagramState>`

The function reads the current level's nodes and edges from `DiagramState` and returns a new `DiagramState` with updated positions.

**Spacing presets** (map `LayoutSpacing` → ELK values):

| Preset | `elk.spacing.nodeNode` | `elk.layered.spacing.nodeNodeBetweenLayers` | `elk.padding` (all sides) |
|--------|------------------------|---------------------------------------------|---------------------------|
| tight  | 20                     | 30                                          | 20                        |
| normal | 30                     | 50                                          | 40 (= `BOUNDARY_PADDING`) |
| loose  | 50                     | 80                                          | 60                        |

**Direction map**: `'right'` → `'RIGHT'`, `'down'` → `'DOWN'`.

#### Context level (flat — no boundary groups)

Build a flat ELK graph:
- `children`: one ELK node per `C4Node` with `width: NODE_DEFAULT_WIDTH`, `height: computeNodeHeight(n)`
- `edges`: `{ id, sources: [e.source], targets: [e.target] }` for each `C4Edge`
- `layoutOptions`: `elk.algorithm: 'layered'`, direction, spacing values

After `elk.layout()`, read `elkChild.x / elkChild.y` and write back to `node.position`.

#### Boundary-group levels (container / component / code)

Build a compound ELK graph. Two styles:

**Flow style** (`elk.algorithm: 'layered'` + `elk.hierarchyHandling: 'INCLUDE_CHILDREN'`):
- Root `layoutOptions`: `algorithm: layered`, direction, spacing, `hierarchyHandling: INCLUDE_CHILDREN`
- Each boundary group parent → ELK parent node with its own `padding` and `layoutOptions`
- Children nested inside their ELK parent node
- All cross-group edges included at root level (ELK routes them with INCLUDE_CHILDREN)
- Orphan nodes (no `parentNodeId`) included as top-level children of root

After layout, for each child node:
- `absolutePos = { x: elkParent.x + elkChild.x, y: elkParent.y + elkChild.y }`
- Write back to `node.position` in the store

**Compact style** (`elk.algorithm: 'elk.rectpacking'` per group):
- Run ELK once per boundary group with `rectpacking`, packing the group's children
- Place the groups themselves using the existing `resolveBoundaryOverlaps` call (no edge awareness between groups — rectpacking doesn't support it)
- Orphan nodes are left at their existing positions

#### Write-back

Return a new `DiagramState` with updated node positions at `state.currentLevel`:
```ts
return {
  ...state,
  levels: {
    ...state.levels,
    [state.currentLevel]: {
      ...state.levels[state.currentLevel],
      nodes: updatedNodes,
    },
  },
};
```

Do not call `resolveBoundaryOverlaps` after — ELK already ensures no overlaps.

## Notes

- `applyAutoLayout` is async (ELK returns a Promise). The caller (Toolbar) handles the async.
- Import `computeNodeHeight`, `NODE_DEFAULT_WIDTH`, `BOUNDARY_PADDING` from existing modules — do not duplicate constants.
- The `childTypeIsValid` check from `diagramLayout.ts` determines which parent-level nodes become ELK compound parents.
- The function must be a pure transform (`DiagramState → Promise<DiagramState>`) — no store access inside it.
