# Task: Parent node dropdown in Properties panel

## Motivation

Drag-to-reparent is the primary interaction for moving nodes between containers, but it requires
the user to drag a node physically near the target boundary. For distant boundaries, overlapping
groups, or cases where precision matters, a properties panel dropdown is a better option.

This task adds a "Parent" `<select>` field to `NodeProperties.svelte` for nodes at non-context
levels. It lists all valid parent candidates from the level above (filtered via
`childTypeIsValid`) plus a "None" option to explicitly orphan the node.

---

## Steps

### 1. Extend `NodeProperties.svelte` — `src/components/properties/NodeProperties.svelte`

Add to the `<script>` block:

```typescript
import { prevLevel } from '../../stores/diagramNavigation';
import { childTypeIsValid } from '../../stores/diagramLayout';

// Derived: valid parent nodes from the level above (empty at context level)
const parentLevel = $derived(prevLevel(level));
const validParents = $derived(
  parentLevel
    ? $diagramStore.levels[parentLevel].nodes.filter((n) =>
        childTypeIsValid(n.type, level)
      )
    : []
);
const showParentField = $derived(validParents.length > 0);
```

Add to the `<div class="panel-body">` block, after the Technology field and before color:

```svelte
{#if showParentField}
  <div class="field">
    <label for="node-parent">Parent</label>
    <select
      id="node-parent"
      value={node.parentNodeId ?? ''}
      onchange={(e) => {
        const val = (e.target as HTMLSelectElement).value;
        updateNode(node.id, { parentNodeId: val || undefined });
      }}
    >
      <option value="">— None —</option>
      {#each validParents as parent (parent.id)}
        <option value={parent.id}>{parent.label}</option>
      {/each}
    </select>
  </div>
{/if}
```

Notes:
- `value={node.parentNodeId ?? ''}` binds the current selection; an empty string maps to "None".
- `updateNode` with `parentNodeId: undefined` removes the parent (orphans the node).
- No position change is made — the node stays at its current canvas position. The user can drag
  it afterward if needed.
- `$diagramStore` is already imported; add the reactive reference (`import { diagramStore }` is
  present, add `$diagramStore` usage in the derived).

### 2. Style (optional)

The `<select>` should pick up existing form styles from `_panel.css`. If the dropdown looks
unstyled, add to `<style>`:

```css
select {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.85rem;
}
```

---

## Files changed

- `src/components/properties/NodeProperties.svelte`

## Dependencies

- No dependency on Task 01. Uses `updateNode` directly (position unchanged).
- Task 03 (lazy stale parent cleanup) would ensure that if a stale `parentNodeId` is present,
  the dropdown shows "None" correctly rather than a blank unmatched selection. Consider
  implementing Task 03 first or alongside this task.
