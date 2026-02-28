<script lang="ts">
  import { updateNode } from '../stores/diagramStore';
  import { NODE_DEFAULT_COLORS } from '../utils/colors';

  let {
    id,
    data,
  }: {
    id: string;
    data: { label: string; color?: string };
    [key: string]: unknown;
  } = $props();

  const borderColor = $derived(data.color ?? NODE_DEFAULT_COLORS['group']);
  const bgColor = $derived(`${borderColor}12`);

  let editing = $state(false);
  let editValue = $state('');
  let inputEl = $state<HTMLInputElement | undefined>(undefined);

  function startEdit(e: MouseEvent) {
    // Only start edit on direct click of the label area — don't steal canvas dblclicks
    e.stopPropagation();
    editing = true;
    editValue = data.label;
    setTimeout(() => inputEl?.select(), 0);
  }

  function commitEdit() {
    if (editing && editValue.trim()) {
      updateNode(id, { label: editValue.trim() });
    }
    editing = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') editing = false;
  }
</script>

<!--
  GroupNode renders as a draggable, resizable boundary box.
  It uses no Handles — groups are not connectable.
  The `nodrag` class on the label keeps the SvelteFlow drag from triggering
  when the user clicks the label to edit it.
-->
<div
  class="group-node"
  style="border-color: {borderColor}; background: {bgColor};"
  role="group"
>
  <div class="group-label-area nodrag" ondblclick={startEdit}>
    {#if editing}
      <input
        bind:this={inputEl}
        class="group-label-input"
        style="color: {borderColor};"
        bind:value={editValue}
        onblur={commitEdit}
        onkeydown={handleKeyDown}
        onclick={(e) => e.stopPropagation()}
      />
    {:else}
      <span class="group-label" style="color: {borderColor};">{data.label}</span>
    {/if}
  </div>
</div>

<style>
  .group-node {
    width: 100%;
    height: 100%;
    border: 2px dashed;
    border-radius: 10px;
    position: relative;
    /* Render behind regular nodes */
    z-index: -1;
    pointer-events: all;
    /* NodeResizer requires a min size */
    min-width: 200px;
    min-height: 160px;
    box-sizing: border-box;
  }

  .group-label-area {
    position: absolute;
    top: 8px;
    left: 14px;
    cursor: text;
  }

  .group-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    user-select: none;
  }

  .group-label-input {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    background: transparent;
    border: none;
    border-bottom: 1px solid currentColor;
    outline: none;
    padding: 0;
    width: 120px;
  }
</style>
