# Task 08 — Fix Mixed `get()` / `$store` Reactivity in DiagramCanvas

## Motivation

In `DiagramCanvas.svelte`, the `$effect` that rebuilds SvelteFlow nodes/edges
mixes two different reactivity patterns:

```ts
$effect(() => {
  const result = buildFlowData(
    get(diagramStore),    // ← imperative, NON-reactive read
    $currentDiagram,      // ← reactive store subscription
    $contextBoundaries,
    $selectedId,
  );
  nodes = result.nodes;
  edges = result.edges;
});
```

`get(diagramStore)` performs an imperative read that does **not** register
`diagramStore` as a reactive dependency of the `$effect`. This means that if
`diagramStore` updates in a way that alters only the raw state (e.g. a field
that is not surfaced by any of the three derived stores passed below it), the
effect will not re-run and the canvas will show stale data.

In practice, all relevant changes likely propagate through `$currentDiagram`,
`$contextBoundaries`, or `$selectedId` — but this is an implicit, fragile
assumption. Making it explicit removes the risk entirely.

## Files to change

- `src/canvas/DiagramCanvas.svelte`

## Task details

### Option A — Replace `get(diagramStore)` with `$diagramStore`

This is the simplest fix. Import the store and use the reactive auto-subscribe
syntax:

```svelte
<script lang="ts">
  import {
    diagramStore,        // ← already imported
    currentDiagram,
    contextBoundaries,
    selectedId,
  } from '../stores/diagramStore';

  // ...

  $effect(() => {
    const result = buildFlowData(
      $diagramStore,        // ← now reactive
      $currentDiagram,
      $contextBoundaries,
      $selectedId,
    );
    nodes = result.nodes;
    edges = result.edges;
  });
</script>
```

`$diagramStore` is a superset of what `$currentDiagram`, `$contextBoundaries`,
and `$selectedId` track, so the effect will now have a single, broad dependency
that covers all cases. The three derived stores can then be removed from the
effect parameters (they are still used elsewhere in the component).

### Option B — Drop the `$effect` and use a `$derived`

Since `buildFlowData` is a pure function (after Task 11 makes it truly pure),
a `$derived` is semantically cleaner:

```ts
const flowData = $derived(buildFlowData(
  $diagramStore,
  $currentDiagram,
  $contextBoundaries,
  $selectedId,
));

// Then bind nodes/edges directly from the derived value:
// nodes = flowData.nodes  ← but this requires nodes to also be derived, not $state
```

This option requires that `nodes` and `edges` not be passed as `bind:nodes` to
SvelteFlow (they need to remain `$state` for SvelteFlow to write back drag
positions). So `$derived` alone is not sufficient here — a `$effect` that
_reads_ a derived and writes to `$state` is the correct Svelte 5 pattern.

**Use Option A for now.** It is a two-line change with zero risk.

### Cleanup

After the fix, verify that `get` from `'svelte/store'` is no longer imported
in `DiagramCanvas.svelte`. If no other use remains, remove the import.

## Acceptance criteria

- [ ] `get(diagramStore)` is replaced with `$diagramStore` in the `$effect`.
- [ ] No orphaned `get` import if it is no longer used.
- [ ] `pnpm check` passes.
- [ ] `pnpm test:run` passes.
- [ ] Canvas correctly reflects store changes (add node, delete node, edit label,
      change level) — spot-check manually.
