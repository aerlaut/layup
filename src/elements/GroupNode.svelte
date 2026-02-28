<script lang="ts">
  import { updateAnnotation, getAnnotationDiagramId, diagramStore } from '../stores/diagramStore';
  import { ANNOTATION_DEFAULT_COLORS } from '../utils/colors';
  import { get } from 'svelte/store';

  let {
    id,
    data,
  }: {
    id: string;
    data: { label: string; color?: string };
    [key: string]: unknown;
  } = $props();

  const borderColor = $derived(data.color ?? ANNOTATION_DEFAULT_COLORS['group']);
  const bgColor = $derived(`${borderColor}12`);

  let editing = $state(false);
  let editValue = $state('');
  let inputEl = $state<HTMLInputElement | undefined>(undefined);

  function getAnnotDiagramId(): string {
    return getAnnotationDiagramId(get(diagramStore));
  }

  function startEdit(e: MouseEvent) {
    e.stopPropagation();
    editing = true;
    editValue = data.label;
    setTimeout(() => inputEl?.select(), 0);
  }

  function commitEdit() {
    if (editing && editValue.trim()) {
      updateAnnotation(getAnnotDiagramId(), id, { label: editValue.trim() });
    }
    editing = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') editing = false;
  }
</script>

<div
  class="group-node"
  style="border-color: {borderColor}; background: {bgColor};"
  role="group"
>
  <div
    class="group-label-area nodrag"
    ondblclick={startEdit}
    role="button"
    tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') startEdit(e as unknown as MouseEvent); }}
  >
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
    z-index: -1;
    pointer-events: all;
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
