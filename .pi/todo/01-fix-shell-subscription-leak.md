# Task 01 — Fix Subscription Leak in Shell.svelte

## Motivation

`Shell.svelte` creates a new `diagramStore` subscription inside a `$effect` block
without ever calling the returned unsubscriber. Because `$effect` can re-run
multiple times during the component's lifetime, a new orphaned subscription
accumulates on every run. In a long-lived session this grows without bound and
each subscription will redundantly call `isNearStorageLimit()`.

## Files to change

- `src/components/Shell.svelte`

## Task details

### Current code (broken)

```svelte
$effect(() => {
  diagramStore.subscribe(() => {
    showStorageWarning = isNearStorageLimit();
  });
});
```

### Fix — option A (preferred): reactive `$derived`

`isNearStorageLimit()` reads `localStorage` synchronously and its result only
changes when the store changes, so a derived expression is the cleanest solution.
Remove the `$effect` block entirely and replace `showStorageWarning` with:

```svelte
<script lang="ts">
  import { diagramStore } from '../stores/diagramStore';
  import { isNearStorageLimit } from '../utils/persistence';
  // ... other imports

  let importError: string | null = $state(null);

  // Recomputed whenever diagramStore changes; no manual subscription needed.
  const showStorageWarning = $derived(
    (() => { $diagramStore; return isNearStorageLimit(); })()
  );
</script>
```

> Note: `$diagramStore` in the derived expression creates a reactive dependency
> on the store, causing re-evaluation on every store update.

### Fix — option B: return the unsubscriber from `$effect`

If a `$derived` is not suitable (e.g., because `showStorageWarning` needs to be
dismissable via user action), keep it as `$state` but clean up properly:

```svelte
let showStorageWarning = $state(false);

$effect(() => {
  // Subscribe and return the cleanup function so Svelte calls it on teardown.
  return diagramStore.subscribe(() => {
    showStorageWarning = isNearStorageLimit();
  });
});
```

### Which option to choose

The storage warning is dismissable (`<button onclick={() => (showStorageWarning = false)}>`),
so the user can hide it even if storage is near the limit. This means the value
cannot be purely derived — a dismissed warning should stay dismissed until the
next page load. **Use option B.**

## Acceptance criteria

- [ ] No `diagramStore.subscribe()` call inside a `$effect` without returning
      the unsubscriber.
- [ ] Dismissing the warning still works correctly (user clicks ×, banner hides).
- [ ] Warning re-appears after reload if storage is still near the limit.
- [ ] Existing tests continue to pass (`pnpm test:run`).
