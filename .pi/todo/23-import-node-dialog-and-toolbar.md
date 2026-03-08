# Task: Import Node dialog and toolbar button

## Motivation
The import side of the node subtree feature requires a file picker entry point
(in the toolbar, consistent with the existing "Import JSON" button) and a dialog
that presents the list of valid parent nodes when the subtree's root is not at
the context level. This task wires the utilities from tasks 20–21 into the UI.

## What to build

### 1. Create `src/components/ImportNodeDialog.svelte`

A modal dialog component with the following props/state:

```ts
interface Props {
  subtree: NodeSubtreeExport;
  validParents: C4Node[];       // from getValidParentNodes(); empty = no parent needed
  onConfirm: (parentNodeId: string | undefined) => void;
  onCancel: () => void;
}
```

**Layout:**
- Header: "Import Node Subtree"
- Body:
  - A one-line summary of what is being imported:
    `Importing "<root node label>" (<rootLevel> level) with N descendant node(s).`
    - Root node label = `subtree.levels[subtree.rootLevel]!.nodes[0]!.label`
    - Descendant count = total node count across all levels minus 1
  - If `validParents.length > 0`: a labelled `<select>` dropdown:
    - Label: "Place under parent"
    - Options: one per valid parent, display `node.label (node.type)`
    - No blank/placeholder option — the first parent is pre-selected
  - If `validParents.length === 0` (context-level import): a note:
    `This node will be placed at the top-level Context view.`
  - If the caller passes `validParents = []` but `subtree.rootLevel !== 'context'`:
    show an error state instead:
    `No compatible parent nodes found. Please add a valid parent node to this diagram first.`
    In this state the Confirm button is disabled.
- Footer: "Cancel" and "Import" buttons.

**Behaviour:**
- "Cancel" calls `onCancel()`.
- "Import" calls `onConfirm(selectedParentId)` where `selectedParentId` is
  `undefined` for context-level imports or the currently selected option value.

### 2. Modify `src/components/Toolbar.svelte`

**State additions:**
```ts
import {
  parseNodeSubtreeJSON,
  getValidParentNodes,
  importNodeSubtree,
  ImportError,
} from '../utils/persistence';
import { get } from 'svelte/store';
import type { NodeSubtreeExport, C4Node } from '../types';
import ImportNodeDialog from './ImportNodeDialog.svelte';

let nodeFileInput: HTMLInputElement | undefined = $state();
let pendingSubtree: NodeSubtreeExport | null = $state(null);
let pendingValidParents: C4Node[] = $state([]);
let showImportNodeDialog = $state(false);
```

**File picker handler:**
```ts
async function handleNodeFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const subtree = parseNodeSubtreeJSON(text);
    const parents = getValidParentNodes(get(diagramStore), subtree);
    pendingSubtree = subtree;
    pendingValidParents = parents;
    showImportNodeDialog = true;
    importError = null;
  } catch (err) {
    importError = err instanceof ImportError ? err.message : 'Failed to import node.';
  }
  (e.target as HTMLInputElement).value = '';
}
```

**Dialog confirm handler:**
```ts
function handleImportNodeConfirm(parentNodeId: string | undefined) {
  if (!pendingSubtree) return;
  snapshot(); // push undo before mutation (import the existing `snapshot` helper or call pushUndo directly)
  const newState = importNodeSubtree(get(diagramStore), pendingSubtree, parentNodeId);
  loadDiagram(newState);
  showImportNodeDialog = false;
  pendingSubtree = null;
}
```

> `loadDiagram` clears undo history; instead call `diagramStore.set(newState)` to
> preserve undo. Import the `diagramStore` directly for the set, and call
> `pushUndo` from `undoHistory` before the mutation.

**Template additions:**
- A hidden file input (accepts `.json`), bound to `nodeFileInput`, with
  `onchange={handleNodeFileChange}`.
- An "Import Node" button in `.toolbar-right` next to the existing
  "Import JSON" button: `onclick={() => nodeFileInput?.click()}`.
- Conditionally render the dialog:
  ```html
  {#if showImportNodeDialog && pendingSubtree}
    <ImportNodeDialog
      subtree={pendingSubtree}
      validParents={pendingValidParents}
      onConfirm={handleImportNodeConfirm}
      onCancel={() => { showImportNodeDialog = false; pendingSubtree = null; }}
    />
  {/if}
  ```

The dialog should render as a modal overlay (fixed full-screen backdrop + centred
card) — follow the same visual pattern as `ConfirmDialog.svelte`.

## Acceptance criteria
- "Import Node" button appears in the toolbar to the right of "Import JSON".
- Selecting a valid `.json` subtree export file opens the dialog.
- For a context-level subtree the dialog shows the "top-level Context" note and
  no parent dropdown; clicking Import adds the nodes.
- For a non-context-level subtree the dialog shows the parent dropdown populated
  with compatible nodes from the target diagram.
- If no compatible parents exist the Import button is disabled and an error note
  is shown.
- After confirming, the imported nodes appear in the diagram and the action is
  undoable (Ctrl+Z removes the imported nodes).
- Cancelling the dialog makes no changes to the diagram.
- Selecting an invalid file (not a subtree export) shows an error message
  consistent with the existing `importError` display mechanism in the toolbar.
