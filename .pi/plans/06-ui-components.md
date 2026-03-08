# Task 06 — UI Components

## Files

- `src/elements/SystemNode.svelte`
- `src/elements/ExternalSystemNode.svelte`
- `src/elements/ContainerNode.svelte`
- `src/elements/DatabaseNode.svelte`
- `src/elements/DbSchemaNode.svelte`
- `src/elements/ComponentNode.svelte`
- `src/elements/PersonNode.svelte`
- `src/elements/ExternalPersonNode.svelte`
- `src/components/BreadcrumbBar.svelte`
- `src/components/ElementPalette.svelte`
- `src/components/Toolbar.svelte`
- `src/canvas/DiagramCanvas.svelte`

## Context

This is the final task — purely surface-level UI updates. Each change is small and isolated; they can be done in any order within the session.

---

## Node Element Components (8 files)

Each of these components declares a `data` prop that includes `childDiagramId?: string` and uses `{#if data.childDiagramId}` to show a drill-down indicator icon.

**Pattern — apply to all 8 files:**

1. In the `data` prop type, replace `childDiagramId?: string` with `hasChildren?: boolean`.
2. In the template, replace `{#if data.childDiagramId}` with `{#if data.hasChildren}`.

**Files and their exact prop declarations:**

| File | Current prop line |
|------|-------------------|
| `SystemNode.svelte` | `data: { label: string; description?: string; technology?: string; childDiagramId?: string; color?: string }` |
| `ExternalSystemNode.svelte` | same pattern |
| `ContainerNode.svelte` | same pattern |
| `DatabaseNode.svelte` | same pattern |
| `DbSchemaNode.svelte` | same pattern |
| `ComponentNode.svelte` | same pattern |
| `PersonNode.svelte` | nested inside a larger data type — find `childDiagramId?: string` and replace |
| `ExternalPersonNode.svelte` | same as PersonNode |

No other logic in these files needs to change.

---

## `BreadcrumbBar.svelte` — rewrite

The old breadcrumb iterated `$breadcrumbs` which was an array of `{ id: string; label: string }` items keyed by diagram ID. The new breadcrumb iterates level names.

```svelte
<script lang="ts">
  import { breadcrumbs, navigateTo } from '../stores/diagramStore';
  import type { C4LevelType } from '../types';

  let { startIndex = 0 }: { startIndex?: number } = $props();
</script>

{#if $breadcrumbs.length > startIndex}
  <nav class="breadcrumb">
    {#if startIndex > 0}
      <span class="sep">›</span>
    {/if}
    {#each $breadcrumbs.slice(startIndex) as item, i (item.level)}
      {#if i > 0}
        <span class="sep">›</span>
      {/if}
      <button
        class="crumb"
        class:active={startIndex + i === $breadcrumbs.length - 1}
        onclick={() => navigateTo(item.level)}
      >
        {item.label}
      </button>
    {/each}
  </nav>
{/if}
```

The CSS is unchanged. The only differences are:
- `(item.id)` → `(item.level)` as the keyed each key.
- `navigateTo(item.id)` → `navigateTo(item.level)` — now passing a `C4LevelType`.
- The label is now the level name (e.g. "Container") rather than a node label.

---

## `ElementPalette.svelte` — remove `parentNodeType` gating

**Remove** the `parentNodeType` import and the conditional that shows only `db-schema` inside a database.

**Update** `LEVEL_TYPES` to include `db-schema` at the component level:

```typescript
// BEFORE
const LEVEL_TYPES: Record<C4LevelType, C4NodeType[]> = {
  context:   ['person', 'external-person', 'system', 'external-system'],
  container: ['container', 'database'],
  component: ['component'],
  code:      ['class', 'abstract-class', 'interface', 'enum', 'record', 'erd-table', 'erd-view'],
};

// AFTER
const LEVEL_TYPES: Record<C4LevelType, C4NodeType[]> = {
  context:   ['person', 'external-person', 'system', 'external-system'],
  container: ['container', 'database'],
  component: ['component', 'db-schema'],  // db-schema shown alongside component
  code:      ['class', 'abstract-class', 'interface', 'enum', 'record', 'erd-table', 'erd-view'],
};
```

**Update** `allowedC4Types` to remove the `parentNodeType` branch:

```typescript
// BEFORE
const allowedC4Types = $derived((): C4NodeType[] => {
  if (currentLevel === 'component') {
    return $parentNodeType === 'database' ? ['db-schema'] : ['component'];
  }
  return LEVEL_TYPES[currentLevel] ?? [];
});

// AFTER
const allowedC4Types = $derived((): C4NodeType[] => {
  return LEVEL_TYPES[currentLevel] ?? [];
});
```

**Remove** the `import { currentDiagram, parentNodeType } from '../stores/diagramStore'` and replace with:

```typescript
import { currentDiagram } from '../stores/diagramStore';
```

(`currentDiagram` is still needed to derive `currentLevel` via `$currentDiagram?.level ?? 'context'`.)

Alternatively, expose a `currentLevel` derived store from `diagramStore.ts` and import that directly, removing the dependency on `currentDiagram` here.

---

## `Toolbar.svelte` — three changes

### 1. Replace `rootDiagramId` with `'context'`

`rootDiagramId` no longer exists. The toolbar uses it for the "navigate to root" button:

```svelte
<!-- BEFORE -->
onclick={() => navigateTo($rootDiagramId)}

<!-- AFTER -->
onclick={() => navigateTo('context')}
```

Remove the `rootDiagramId` import.

### 2. Update `handleExportLevel`

The old version passed `diagram.id` (a random UUID) to `exportLevelJSON`. The new version passes `currentLevel`:

```typescript
// BEFORE
function handleExportLevel() {
  const diagram = get(currentDiagram);
  exportLevelJSON(get(diagramStore), diagram.id, diagram.label);
}

// AFTER
function handleExportLevel() {
  const state = get(diagramStore);
  const levelLabel = LEVEL_LABELS[state.currentLevel];
  exportLevelJSON(state, state.currentLevel, `${get(activeDiagram)?.name ?? 'diagram'} — ${levelLabel}`);
}
```

Add `import { LEVEL_LABELS } from '../stores/diagramStore'`.

### 3. Remove `currentDiagram` import if no longer used

After the `handleExportLevel` change, check whether `currentDiagram` is still imported and used anywhere in `Toolbar.svelte`. If not, remove it from the import.

---

## `DiagramCanvas.svelte` — two small changes

### 1. Remove `parentDiagram` from `buildFlowData` call (if not done in task 04)

```typescript
// BEFORE
const result = buildFlowData(
  get(diagramStore),
  $currentDiagram,
  $contextBoundaries,
  $parentDiagram,
  $selectedId,
);

// AFTER
const result = buildFlowData(
  get(diagramStore),
  $currentDiagram,
  $contextBoundaries,
  $selectedId,
);
```

Remove the `parentDiagram` import from the import list.

### 2. Update the viewport re-fit `$effect`

Replace the `navigationStack.length` watch with a `currentLevel` watch:

```typescript
// BEFORE
let prevNavStackLength = $state(0);
$effect(() => {
  const currentLength = get(diagramStore).navigationStack.length;
  if (prevNavStackLength !== 0 && currentLength !== prevNavStackLength && flowFitView) {
    flowFitView({ duration: 200 });
  }
  prevNavStackLength = currentLength;
});

// AFTER
let prevLevel = $state<string | null>(null);
$effect(() => {
  const lvl = get(diagramStore).currentLevel;
  if (prevLevel !== null && lvl !== prevLevel && flowFitView) {
    flowFitView({ duration: 200 });
  }
  prevLevel = lvl;
});
```

Also update the `fitView` prop condition:

```svelte
<!-- BEFORE -->
fitView={prevNavStackLength === 0}

<!-- AFTER -->
fitView={prevLevel === null}
```
