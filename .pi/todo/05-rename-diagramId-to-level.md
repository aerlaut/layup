# Task 05 — Rename `diagramId` → `level` on `SelectedElementResult`

## Motivation

The `SelectedNodeResult`, `SelectedEdgeResult`, and `SelectedAnnotationResult`
interfaces in `diagramStore.ts` expose a field called `diagramId` whose type is
`C4LevelType` (e.g. `'context'`, `'container'`). The name `diagramId` implies a
string identifier, not a level discriminant, and directly contradicts the type.

`PropertiesPanel.svelte` reads `sel.diagramId` and passes it as the `level`
argument to `updateAnnotation`. This works at runtime, but any developer reading
the call site would need to trace back through the type to understand that a
"diagram ID" is actually a level key. The mismatch is a semantic bug waiting to
cause a real bug when the data model evolves.

## Files to change

- `src/stores/diagramStore.ts` — rename field in interfaces and in the derived store
- `src/components/PropertiesPanel.svelte` — update all reads of `.diagramId`

## Task details

### Step 1 — Update interfaces in `diagramStore.ts`

```ts
// Before:
export interface SelectedNodeResult       { type: 'node';       node: C4Node;       diagramId: C4LevelType }
export interface SelectedEdgeResult       { type: 'edge';       edge: C4Edge;       diagramId: C4LevelType }
export interface SelectedAnnotationResult { type: 'annotation'; annotation: Annotation; diagramId: C4LevelType }

// After:
export interface SelectedNodeResult       { type: 'node';       node: C4Node;       level: C4LevelType }
export interface SelectedEdgeResult       { type: 'edge';       edge: C4Edge;       level: C4LevelType }
export interface SelectedAnnotationResult { type: 'annotation'; annotation: Annotation; level: C4LevelType }
```

### Step 2 — Update the `selectedElement` derived store

In the same file, find the three return statements that construct the result
objects and rename the field:

```ts
// Before:
if (annotation) return { type: 'annotation', annotation, diagramId: $s.currentLevel };
if (node)       return { type: 'node',       node,       diagramId: $s.currentLevel };
if (edge)       return { type: 'edge',       edge,       diagramId: $s.currentLevel };

// After:
if (annotation) return { type: 'annotation', annotation, level: $s.currentLevel };
if (node)       return { type: 'node',       node,       level: $s.currentLevel };
if (edge)       return { type: 'edge',       edge,       level: $s.currentLevel };
```

### Step 3 — Update `PropertiesPanel.svelte`

Replace all reads of `.diagramId` with `.level`:

```ts
// Before:
const diagramId = $derived(sel?.diagramId ?? null);

// After:
const level = $derived(sel?.level ?? null);
```

Then update all callsites inside the component that reference `diagramId`:

```ts
// In every handler that currently checks `if (!selectedNode || !diagramId)`
// and passes `diagramId` to store functions like updateAnnotation(diagramId, ...)
// → replace with `level`
```

Specifically, `updateAnnotation` and `deleteAnnotation` receive `diagramId` today
as their first argument. After this rename, pass `level` instead. No functional
change occurs — only naming.

### Step 4 — Search for remaining references

```bash
grep -rn "diagramId" src/
```

Ensure no remaining references exist outside of comments.

## Acceptance criteria

- [ ] `SelectedNodeResult`, `SelectedEdgeResult`, `SelectedAnnotationResult` all
      use `level: C4LevelType` (no `diagramId` field).
- [ ] `PropertiesPanel.svelte` uses `level` everywhere.
- [ ] `pnpm check` passes (TypeScript will catch any missed references).
- [ ] `pnpm test:run` passes.
- [ ] Annotation editing (label, text, color, delete) still works in the UI.
