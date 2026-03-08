# Task: Export Subtree button in the Node Properties panel

## Motivation
The export action is naturally triggered from the properties panel because the
user has already selected the node they want to export. Adding "Export Subtree"
next to the existing "Delete Element" button makes the action discoverable
without cluttering the toolbar.

## What to build

### Modify `src/components/properties/NodeProperties.svelte`

1. Import the utilities needed:
   ```ts
   import { exportNodeSubtree } from '../../utils/nodeSubtreeExport';
   import { get } from 'svelte/store';
   import { diagramStore } from '../../stores/diagramStore';
   ```

2. Add an `handleExportSubtree` handler:
   ```ts
   function handleExportSubtree() {
     exportNodeSubtree(get(diagramStore), node.id, node.label);
   }
   ```

3. Add the button to the template, directly above or below the existing
   "Delete Element" button (keep them visually grouped in the panel footer):
   ```html
   <button class="secondary-btn" onclick={handleExportSubtree}>
     Export Subtree
   </button>
   ```
   Use the panel's existing `secondary-btn` styling (or add a minimal style if
   one doesn't exist yet) — neutral background, not the red danger style.

## Acceptance criteria
- The "Export Subtree" button appears in the Node Properties panel for every
  node type (there is no reason to restrict it by type).
- Clicking it triggers a JSON file download named `<node-label>-subtree.json`.
- The button is visually distinct from the destructive "Delete Element" button.
- No changes to other panels (EdgeProperties, AnnotationProperties).
