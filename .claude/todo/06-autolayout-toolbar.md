# Task: Wire auto-layout into the Toolbar

## Motivation

The toolbar is the right place to trigger auto-layout — it already hosts import/export actions that follow the same pattern of async operations + undo snapshot + store update. Adding the "Auto-layout" button here is consistent with the existing UX.

**Prerequisite tasks:** `04-autolayout-engine.md` and `05-autolayout-dialog.md` must be complete first.

## Steps

### Modify `src/components/Toolbar.svelte`

#### 1. New imports

```ts
import AutoLayoutDialog from './AutoLayoutDialog.svelte';
import { applyAutoLayout, DEFAULT_LAYOUT_OPTIONS } from '../stores/autoLayout';
import type { LayoutOptions } from '../stores/autoLayout';
```

#### 2. New state

```ts
let showAutoLayoutDialog = $state(false);
```

#### 3. Handler

```ts
async function handleAutoLayoutConfirm(options: LayoutOptions) {
  showAutoLayoutDialog = false;
  const currentState = get(diagramStore);
  pushUndo(currentState);
  const newState = await applyAutoLayout(currentState, options);
  diagramStore.set(newState);
}
```

#### 4. Add button in `toolbar-right`

Place the "Auto-layout" button between the Redo button and the Export JSON button:

```svelte
<button onclick={() => showAutoLayoutDialog = true} title="Automatically arrange nodes">
  Auto-layout
</button>
```

#### 5. Render dialog

At the bottom of the component (alongside the existing `ImportNodeDialog` block):

```svelte
{#if showAutoLayoutDialog}
  <AutoLayoutDialog
    onConfirm={handleAutoLayoutConfirm}
    onCancel={() => showAutoLayoutDialog = false}
  />
{/if}
```

## Notes

- The `pushUndo` call must happen **before** `applyAutoLayout` (not after), so the pre-layout positions are the undo target — the same pattern used in `handleImportNodeConfirm`.
- `applyAutoLayout` is async; the handler is `async` to await it. This is identical to the existing `handleImport` pattern in the toolbar.
- No loading state is needed for typical diagram sizes — ELK is fast enough (sub-100ms for diagrams with <100 nodes) that the UI won't feel blocked. If this becomes a concern, a loading indicator can be added later.
- The dialog remembers last used options via `DEFAULT_LAYOUT_OPTIONS` as the initial state — no persistence of user preferences is needed at this stage.
