# Task 15 — Implement Undo / Redo

## Motivation

The application currently has no undo/redo capability. Every store mutation is
irreversible. For a diagramming tool this is a significant UX gap — accidental
deletions, misplaced nodes, and unwanted edits have no recovery path short of
re-importing a previously exported file.

The existing immutable update pattern in `diagramStore.ts` (`withLevel`,
`withCurrentLevel`) already produces a new `DiagramState` on every change,
which is the ideal foundation for a snapshot-based undo history.

## Design

### Strategy: snapshot ring-buffer on `diagramStore`

Keep a fixed-size array of past `DiagramState` snapshots. Each user action that
modifies the diagram pushes the previous state onto the undo stack. Undo pops
from the stack, pushes the current state to the redo stack, and restores the
popped state. Redo reverses this.

```
undoStack: DiagramState[]   (capped at MAX_UNDO_DEPTH)
redoStack: DiagramState[]   (cleared on any non-undo/redo mutation)
```

### What is tracked

Only mutations to `diagramStore` (node/edge/annotation CRUD, position updates).
Navigation (drill-down/up), selection, and `pendingNodeType` changes are
**excluded** — these are transient UI state, not content edits.

Debounced position updates (drag) should be coalesced: rapid successive position
updates (within 300ms) collapse into a single undo step so dragging is undone
as a single action.

### Keyboard shortcut

- `Cmd/Ctrl+Z` — Undo
- `Cmd/Ctrl+Shift+Z` or `Cmd/Ctrl+Y` — Redo

## Files to change

- `src/stores/undoHistory.ts` — **create new file** (undo/redo store + actions)
- `src/stores/diagramStore.ts` — wrap CRUD actions to snapshot before mutation
- `src/components/Toolbar.svelte` — add Undo/Redo buttons + keyboard handler
- `src/App.svelte` or `src/components/Shell.svelte` — wire global keyboard shortcut

## Task details

### Step 1 — Create `src/stores/undoHistory.ts`

```ts
import { writable, get } from 'svelte/store';
import type { DiagramState } from '../types';

const MAX_UNDO_DEPTH = 50;

export const undoStack = writable<DiagramState[]>([]);
export const redoStack = writable<DiagramState[]>([]);

export const canUndo = derived(undoStack, ($s) => $s.length > 0);
export const canRedo = derived(redoStack, ($s) => $s.length > 0);

/**
 * Call before every user-initiated mutation to snapshot the current state.
 * Clears the redo stack (a new edit invalidates undone history).
 */
export function pushUndo(snapshot: DiagramState): void {
  undoStack.update((stack) => {
    const next = [...stack, snapshot];
    return next.length > MAX_UNDO_DEPTH ? next.slice(next.length - MAX_UNDO_DEPTH) : next;
  });
  redoStack.set([]);
}

export function undo(currentState: DiagramState): DiagramState | null {
  const stack = get(undoStack);
  if (stack.length === 0) return null;
  const previous = stack[stack.length - 1]!;
  undoStack.update((s) => s.slice(0, -1));
  redoStack.update((s) => [...s, currentState]);
  return previous;
}

export function redo(currentState: DiagramState): DiagramState | null {
  const stack = get(redoStack);
  if (stack.length === 0) return null;
  const next = stack[stack.length - 1]!;
  redoStack.update((s) => s.slice(0, -1));
  undoStack.update((s) => [...s, currentState]);
  return next;
}

/** Clear history (e.g. when loading a new diagram). */
export function clearHistory(): void {
  undoStack.set([]);
  redoStack.set([]);
}
```

### Step 2 — Wrap CRUD actions in `diagramStore.ts`

Create an internal `snapshot()` helper:

```ts
import { pushUndo } from './undoHistory';
import { get } from 'svelte/store';

function snapshot(): void {
  pushUndo(get(diagramStore));
}
```

Prepend `snapshot()` to each user-facing mutation:

```ts
export function addNode(node: C4Node): void {
  snapshot();
  diagramStore.update((s) => { ... });
}

export function updateNode(nodeId: string, patch: Partial<C4Node>): void {
  snapshot();
  diagramStore.update((s) => { ... });
}

export function deleteNode(nodeId: string): void {
  snapshot();
  diagramStore.update((s) => { ... });
}

// ... addEdge, updateEdge, deleteEdge, addAnnotation, updateAnnotation,
//     deleteAnnotation — all get snapshot()

// Position updates: debounce the snapshot separately (see Step 3)
```

**Do NOT snapshot** for: `setSelected`, `setPendingNodeType`, `navigateTo`,
`drillDown`, `drillUp`, `loadDiagram`, `resetDiagram`.

### Step 3 — Debounced snapshot for drag (position updates)

`updateNodePositions` can be called many times per second during a drag.
A naive `snapshot()` before each call would flood the undo stack with micro-steps.

Use a debounced pre-snapshot approach:

```ts
import { debounce } from '../utils/persistence';

const debouncedPositionSnapshot = debounce(() => {
  // Only push a snapshot if the current state differs from the top of the stack
  const current = get(diagramStore);
  const top = get(undoStack).at(-1);
  if (top !== current) pushUndo(current);
}, 300);

export function updateNodePositions(...) {
  debouncedPositionSnapshot();
  diagramStore.update((s) => { ... });
}
```

Apply the same pattern to `updateAnnotationPositions`.

### Step 4 — Expose undo/redo actions from `diagramStore.ts`

```ts
import { undo as undoHistory, redo as redoHistory, clearHistory } from './undoHistory';

export function performUndo(): void {
  const current = get(diagramStore);
  const previous = undoHistory(current);
  if (previous) diagramStore.set(previous);
}

export function performRedo(): void {
  const current = get(diagramStore);
  const next = redoHistory(current);
  if (next) diagramStore.set(next);
}

// Clear history when loading a new diagram:
export function loadDiagram(state: DiagramState): void {
  diagramStore.set(state);
  clearHistory();
}
```

### Step 5 — Wire keyboard shortcuts in `Shell.svelte`

```svelte
<svelte:window onkeydown={handleGlobalKeyDown} />

<script lang="ts">
  import { performUndo, performRedo } from '../stores/diagramStore';
  import { appView } from '../stores/appStore';

  function handleGlobalKeyDown(e: KeyboardEvent) {
    if ($appView.screen !== 'editor') return;
    const isMac = navigator.platform.includes('Mac');
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod) return;

    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      performUndo();
    } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
      e.preventDefault();
      performRedo();
    }
  }
</script>
```

### Step 6 — Add Undo/Redo buttons to `Toolbar.svelte`

```svelte
import { canUndo, canRedo } from '../stores/undoHistory';
import { performUndo, performRedo } from '../stores/diagramStore';

<button onclick={performUndo} disabled={!$canUndo} title="Undo (⌘Z)">↩ Undo</button>
<button onclick={performRedo} disabled={!$canRedo} title="Redo (⌘⇧Z)">↪ Redo</button>
```

## Acceptance criteria

- [ ] `Cmd/Ctrl+Z` undoes the last diagram mutation.
- [ ] `Cmd/Ctrl+Shift+Z` (or `Cmd/Ctrl+Y`) redoes.
- [ ] Toolbar Undo/Redo buttons are disabled when there is nothing to undo/redo.
- [ ] Dragging a node and undoing restores the pre-drag position (coalesced into
      one undo step, not hundreds of micro-steps).
- [ ] Loading a new diagram clears the undo/redo history.
- [ ] Navigation (drill-down/up, level change) is not pushed to the undo stack.
- [ ] Undo stack is capped at 50 entries (oldest entries are dropped).
- [ ] `pnpm check` passes.
- [ ] `pnpm test:run` passes.
