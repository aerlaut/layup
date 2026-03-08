# Task 03 — Centralize Node Type Classification

## Motivation

Sets and arrays that classify `C4NodeType` values into groups are defined
independently in at least four places:

| Location | Symbols |
|---|---|
| `src/stores/diagramStore.ts` | `UML_CLASS_TYPES` (Set), `ERD_NODE_TYPES` (Set) |
| `src/components/PropertiesPanel.svelte` | `UML_CLASS_TYPES` (Array), `ERD_NODE_TYPES` (Array) |
| `src/canvas/canvasHandlers.ts` | `NON_DRILLABLE_TYPES` (Set — includes UML + ERD + person) |
| `src/canvas/canvasDragDrop.ts` | `NODE_DEFAULT_LABELS` (Record, all C4NodeTypes) |

Adding a new node type (e.g., a "sequence diagram" element) requires touching all
these files. Missing any one silently breaks drill-down, boundary sizing,
properties rendering, or the palette. Centralizing the classifications into a
single utility makes the type system self-consistent and easy to extend.

## Files to change

- `src/utils/nodeTypes.ts` — **create new file**
- `src/stores/diagramStore.ts` — import from `nodeTypes.ts`, remove local sets
- `src/components/PropertiesPanel.svelte` — import from `nodeTypes.ts`, remove local arrays
- `src/canvas/canvasHandlers.ts` — import from `nodeTypes.ts`, remove local set
- `src/canvas/canvasDragDrop.ts` — import from `nodeTypes.ts`, remove local record

## Task details

### Step 1 — Create `src/utils/nodeTypes.ts`

```ts
import type { AnnotationType, C4NodeType } from '../types';

// ─── UML / ERD groupings ──────────────────────────────────────────────────────

export const UML_CLASS_TYPES = new Set<C4NodeType>([
  'class', 'abstract-class', 'interface', 'enum', 'record',
]);

export const ERD_NODE_TYPES = new Set<C4NodeType>([
  'erd-table', 'erd-view',
]);

/**
 * Node types that cannot be drilled into. UML and ERD nodes expose their
 * internal structure natively (member / column lists). Person nodes are
 * excluded by long-standing C4 convention.
 */
export const NON_DRILLABLE_TYPES = new Set<C4NodeType>([
  'person',
  ...UML_CLASS_TYPES,
  ...ERD_NODE_TYPES,
]);

// ─── Default labels used when placing a node from the palette ─────────────────

export const NODE_DEFAULT_LABELS: Record<C4NodeType, string> = {
  person:            'Person',
  'external-person': 'External Person',
  system:            'Software System',
  'external-system': 'External System',
  container:         'Container',
  database:          'Database',
  component:         'Component',
  'db-schema':       'Schema',
  class:             'Class',
  'abstract-class':  'Abstract Class',
  interface:         'Interface',
  enum:              'Enum',
  record:            'Record',
  'erd-table':       'Table',
  'erd-view':        'View',
};

export const ANNOTATION_DEFAULT_LABELS: Record<AnnotationType, string> = {
  group:   'Group',
  note:    'Note',
  package: 'Package',
};
```

### Step 2 — Update `diagramStore.ts`

Remove the local `UML_CLASS_TYPES` and `ERD_NODE_TYPES` const declarations and
import them from `nodeTypes.ts`:

```ts
import { UML_CLASS_TYPES, ERD_NODE_TYPES } from '../utils/nodeTypes';
```

### Step 3 — Update `PropertiesPanel.svelte`

Remove the local `UML_CLASS_TYPES` and `ERD_NODE_TYPES` array declarations and
import the Sets from `nodeTypes.ts`. Update membership checks from
`array.includes(x)` to `set.has(x)`:

```ts
import { UML_CLASS_TYPES, ERD_NODE_TYPES } from '../utils/nodeTypes';

const isUmlClassNode = $derived(selectedNode ? UML_CLASS_TYPES.has(selectedNode.type) : false);
const isErdNode      = $derived(selectedNode ? ERD_NODE_TYPES.has(selectedNode.type) : false);
```

### Step 4 — Update `canvasHandlers.ts`

Remove the local `NON_DRILLABLE_TYPES` Set and import from `nodeTypes.ts`:

```ts
import { NON_DRILLABLE_TYPES } from '../utils/nodeTypes';
```

Remove the now-redundant comment block explaining the set members.

### Step 5 — Update `canvasDragDrop.ts`

Remove the local `NODE_DEFAULT_LABELS` and `ANNOTATION_DEFAULT_LABELS` records
and import from `nodeTypes.ts`:

```ts
import { NODE_DEFAULT_LABELS, ANNOTATION_DEFAULT_LABELS } from '../utils/nodeTypes';
```

## Acceptance criteria

- [ ] `src/utils/nodeTypes.ts` exists with all four exports.
- [ ] No duplicate type-group definitions remain in any other file.
- [ ] `pnpm check` passes (no TypeScript errors).
- [ ] `pnpm test:run` passes.
- [ ] Palette drag-and-drop correctly labels new nodes.
- [ ] Drill-down is blocked for UML/ERD/person nodes as before.
- [ ] PropertiesPanel shows UML member editor and ERD column editor for the
      correct node types.
