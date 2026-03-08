# Task 14 — Split `diagramStore.ts` into Focused Modules

## Motivation

`src/stores/diagramStore.ts` is a ~500-line file that serves as: a state store,
a geometry/layout engine, a CRUD service, a navigation controller, a derived
selector library, and an import/merge utility. This breadth makes the file long,
hard to navigate, and causes unrelated concerns to share the same module scope.

Splitting it into focused modules improves discoverability ("where do I add a new
action?" has a clear answer), reduces cognitive load when working on a single
concern, and makes each module independently testable.

## Files to change (overview)

| New file | Responsibility |
|---|---|
| `src/stores/diagramStore.ts` | Store definition, derived stores, CRUD actions, state management |
| `src/stores/diagramLayout.ts` | Geometry: `computeNodeHeight`, `computeBoundingBox`, `resolveNodeOverlaps`, `resolveBoundaryOverlaps` |
| `src/stores/diagramNavigation.ts` | Level helpers: `LEVEL_ORDER`, `LEVEL_LABELS`, `nextLevel`, `prevLevel`, `drillDown`, `drillUp`, `navigateTo` |

> This is a **refactor, not a rewrite**. All public exports must remain
> importable from their current paths OR a barrel re-export must be added to
> avoid breaking every consumer.

## Task details

### Step 1 — Extract `src/stores/diagramNavigation.ts`

Move out:

```ts
export const LEVEL_ORDER: C4LevelType[] = [...]
export const LEVEL_LABELS: Record<C4LevelType, string> = {...}
export function nextLevel(level: C4LevelType): C4LevelType | undefined
export function prevLevel(level: C4LevelType): C4LevelType | undefined
export function drillDown(): void
export function drillUp(): void
export function navigateTo(level: C4LevelType): void
```

`drillDown`, `drillUp`, and `navigateTo` call `diagramStore.update(...)` — they
need to import `diagramStore` from the store file. Since `diagramStore` is
defined in `diagramStore.ts`, the navigation module imports from there (one-way
dependency: navigation → store).

### Step 2 — Extract `src/stores/diagramLayout.ts`

Move out:

```ts
export function computeNodeHeight(node: C4Node): number
// (internal) function computeBoundingBox(...)
// (internal) function nodesOverlap(...)
// (internal) function pushNodeAway(...)
// (internal) function resolveNodeOverlaps(...)
// (internal) function bboxOverlap(...)
// (internal) function resolveBoundaryOverlaps(state: DiagramState): DiagramState
```

`computeBoundingBox` is currently used both internally (by `resolveBoundaryOverlaps`)
and externally (by the `contextBoundaries` derived store). Export it.
`resolveNodeOverlaps` is used internally by `updateNodePositions`. Export it too
for testability.

This module has **no imports from the store** — it only uses types and constants.
It is a pure utility library.

### Step 3 — Update `diagramStore.ts`

After extraction:
- Import layout helpers from `diagramLayout.ts`.
- Import navigation helpers from `diagramNavigation.ts`.
- Import `LEVEL_ORDER` from `diagramNavigation.ts` (needed for `remapIdsFlat` /
  merge, and for derived stores).

The `diagramStore.ts` file should remain the single source of the `diagramStore`
writable, all derived stores, and all CRUD action functions.

### Step 4 — Preserve public API with barrel re-exports (optional but recommended)

To avoid touching every import in the codebase at once, add re-exports from
`diagramStore.ts` for anything that moved:

```ts
// diagramStore.ts
export { LEVEL_ORDER, LEVEL_LABELS, nextLevel, prevLevel,
         drillDown, drillUp, navigateTo } from './diagramNavigation';
export { computeNodeHeight } from './diagramLayout';
```

This means existing consumer imports (`from '../stores/diagramStore'`) continue
working unchanged. The re-exports can be cleaned up in a follow-up task once all
consumers are migrated.

### Step 5 — Update tests

- `tests/stores/diagramStore.test.ts` — no changes if re-exports are in place.
- Consider adding `tests/stores/diagramLayout.test.ts` with focused geometry tests
  (overlap resolution, boundary box computation) now that the module is isolated.

## Recommended order of sub-tasks

1. Extract `diagramNavigation.ts` (no dependency on layout).
2. Extract `diagramLayout.ts` (no dependency on store or navigation).
3. Update `diagramStore.ts` to import from both new modules.
4. Add re-exports to `diagramStore.ts` for public API continuity.
5. Run `pnpm check` and `pnpm test:run`.
6. (Optional) Migrate consumers away from re-exports in a follow-up.

## Acceptance criteria

- [ ] `diagramNavigation.ts` exists with level helpers and navigation actions.
- [ ] `diagramLayout.ts` exists with geometry utilities.
- [ ] `diagramStore.ts` is under 300 lines.
- [ ] All existing public exports are still importable from `diagramStore.ts`
      (either directly or via re-export).
- [ ] `pnpm check` passes with no TypeScript errors.
- [ ] `pnpm test:run` passes.
- [ ] All canvas operations work correctly: add node, delete node, drill down/up,
      boundary drag, overlap resolution.
