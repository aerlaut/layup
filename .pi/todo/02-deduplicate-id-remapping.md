# Task 02 — Deduplicate ID Remapping Logic

## Motivation

Two functions perform essentially the same job — remapping all IDs inside a
`DiagramState` to freshly generated ones while preserving internal cross-references
(`parentNodeId`, edge `source`/`target`):

| Function | Location | Used by |
|---|---|---|
| `remapIds` | `src/utils/remapIds.ts` | exported public API, used in tests |
| `remapIdsFlat` | `src/stores/diagramStore.ts` | `mergeImportedDiagram` (private) |

They were written at different times and are functionally identical. Having two
implementations means a bug fix or an extension (e.g. remapping a new field like
`waypoints` source/target IDs) must be applied twice. This is a clear DRY
violation.

## Files to change

- `src/stores/diagramStore.ts` — remove `remapIdsFlat`, update `mergeImportedDiagram`
- `src/utils/remapIds.ts` — no change needed (already correct)

## Task details

### Step 1 — Import `remapIds` into `diagramStore.ts`

Add the import at the top of the store:

```ts
import { remapIds } from '../utils/remapIds';
```

### Step 2 — Replace `remapIdsFlat` call in `mergeImportedDiagram`

Current code:

```ts
export function mergeImportedDiagram(imported: DiagramState): void {
  const remapped = remapIdsFlat(imported);
  // ...
}
```

Updated code:

```ts
export function mergeImportedDiagram(imported: DiagramState): void {
  const remapped = remapIds(imported);
  // ...
}
```

### Step 3 — Delete the `remapIdsFlat` function

Remove the entire private `remapIdsFlat` function from `diagramStore.ts`
(roughly 40 lines in the `Import/merge` section).

### Step 4 — Verify behavioural equivalence

Before deleting, confirm that `remapIdsFlat` and `remapIds` produce structurally
equivalent output:

- Both remap node IDs, edge IDs, annotation IDs.
- Both remap `parentNodeId` cross-references.
- Both remap edge `source` and `target`.
- Both reset `selectedId` and `pendingNodeType` to null.
- `remapIdsFlat` resets `currentLevel`; `remapIds` preserves it (from `...state`). Check whether `mergeImportedDiagram` depends on `currentLevel` being reset — it does not, since it reads `s.currentLevel` from the existing store state, not from the remapped import. **No behaviour change.**

## Acceptance criteria

- [ ] `remapIdsFlat` is deleted from `diagramStore.ts`.
- [ ] `mergeImportedDiagram` calls `remapIds` from `src/utils/remapIds.ts`.
- [ ] `pnpm test:run` passes (especially `tests/stores/mergeImport.test.ts` and
      `tests/utils/remapIds.test.ts`).
- [ ] Manually verify that merging an imported diagram in the UI produces
      correct, non-colliding IDs.
