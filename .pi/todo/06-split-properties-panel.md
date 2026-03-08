# Task 06 — Split PropertiesPanel into Sub-components

## Motivation

`PropertiesPanel.svelte` is ~600 lines and handles the editing UI for three
distinct element types (nodes, edges, annotations) plus two highly specialised
inline editors (UML class members and ERD table columns). The component uses
deeply nested `{#if}` blocks and long handler chains, making it hard to extend,
test in isolation, or understand at a glance.

Decomposing it into focused sub-components improves:
- **Readability** — each file has a single, clear purpose.
- **Extensibility** — adding a new node-type-specific editor (e.g. sequence
  diagram steps) only requires a new sub-component, not surgery on a god file.
- **Testability** — sub-components can be unit-tested without setting up the full
  selection infrastructure.

## Files to change

- `src/components/PropertiesPanel.svelte` — becomes a thin dispatcher
- `src/components/properties/NodeProperties.svelte` — **create**
- `src/components/properties/EdgeProperties.svelte` — **create**
- `src/components/properties/AnnotationProperties.svelte` — **create**
- `src/components/properties/UmlMemberEditor.svelte` — **create**
- `src/components/properties/ErdColumnEditor.svelte` — **create**

> All sub-components live in a new `src/components/properties/` directory.

## Task details

### Component responsibilities

#### `PropertiesPanel.svelte` (router / shell)

- Reads `$selectedElement` from `diagramStore`.
- Renders exactly one of: `<NodeProperties>`, `<EdgeProperties>`,
  `<AnnotationProperties>`, or the empty-state message.
- Passes the selected element as a prop to the appropriate sub-component.
- Contains no editing logic or handlers of its own.

```svelte
<script lang="ts">
  import { selectedElement } from '../stores/diagramStore';
  import NodeProperties from './properties/NodeProperties.svelte';
  import EdgeProperties from './properties/EdgeProperties.svelte';
  import AnnotationProperties from './properties/AnnotationProperties.svelte';

  const sel = $derived($selectedElement);
</script>

{#if sel?.type === 'node'}
  <NodeProperties node={sel.node} level={sel.level} />
{:else if sel?.type === 'edge'}
  <EdgeProperties edge={sel.edge} level={sel.level} />
{:else if sel?.type === 'annotation'}
  <AnnotationProperties annotation={sel.annotation} level={sel.level} />
{:else}
  <div class="panel-empty">
    <p>Select an element or relationship to edit its properties.</p>
  </div>
{/if}
```

#### `NodeProperties.svelte`

Props: `node: C4Node`, `level: C4LevelType`

Responsibilities:
- Renders label, description, technology (conditional on type), and color fields.
- Uses `UML_CLASS_TYPES` / `ERD_NODE_TYPES` (from `nodeTypes.ts`, see Task 03)
  to conditionally render `<UmlMemberEditor>` or `<ErdColumnEditor>`.
- Calls `updateNode` and `deleteNode` from `diagramStore`.
- Owns the panel header ("Element" + type chip).

#### `EdgeProperties.svelte`

Props: `edge: C4Edge`, `level: C4LevelType`

Responsibilities:
- Renders label, description, technology fields.
- Renders relationship preset selector.
- Renders start/end marker selectors, line type, line style.
- Renders color picker.
- Renders multiplicity/role ends grid.
- Calls `updateEdge` and `deleteEdge`.
- Owns the panel header ("Relationship").

#### `AnnotationProperties.svelte`

Props: `annotation: Annotation`, `level: C4LevelType`

Responsibilities:
- Renders label field, optional text textarea (for `note` type only).
- Renders color picker.
- Calls `updateAnnotation` and `deleteAnnotation`.
- Owns the panel header ("Annotation" + type chip).

#### `UmlMemberEditor.svelte`

Props: `nodeId: string`, `members: ClassMember[]`, `nodeType: C4NodeType`

Responsibilities:
- Renders the full member list (attribute + operation rows).
- Handles add, update, delete, reorder for both kinds.
- Derives `isEnumNode`, `isAbstractNode` from `nodeType`.
- Calls `updateNode` with the new members array.
- Self-contained; does not know about `selectedElement`.

#### `ErdColumnEditor.svelte`

Props: `nodeId: string`, `columns: TableColumn[]`

Responsibilities:
- Renders the full column list editor.
- Handles add, update, delete, reorder.
- Calls `updateNode` with the new columns array.
- Self-contained; does not know about `selectedElement`.

### Shared styles

Move shared CSS rules (`.panel`, `.panel-header`, `.panel-body`, `.field`,
`.color-swatches`, `.swatch`, `.color-custom`, `.danger-btn`, `.panel-empty`)
into a dedicated CSS file or into `app.css` under a `.properties-panel` namespace,
so sub-components can reuse them without duplication.

Alternatively, copy shared rules into a `properties/_shared.css` file and import
it in each sub-component's `<style>` block (Vite handles CSS modules or raw
imports from Svelte `<style>` with `@import`).

## Acceptance criteria

- [ ] `PropertiesPanel.svelte` is under 40 lines.
- [ ] Each sub-component file is under 200 lines.
- [ ] Node properties panel: label, description, tech (where applicable), color
      all update the store correctly.
- [ ] UML member editor: add/update/reorder/delete attributes and operations.
- [ ] ERD column editor: add/update/reorder/delete columns, all flags (PK, FK,
      NN, UQ, default).
- [ ] Edge properties panel: all fields + preset selector work.
- [ ] Annotation properties panel: label, text (note only), color, delete work.
- [ ] `pnpm check` passes.
- [ ] `pnpm test:run` passes.
