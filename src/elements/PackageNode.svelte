<script lang="ts">
  import { NodeResizer } from '@xyflow/svelte';
  import type { ResizeDragEvent, ResizeParams } from '@xyflow/svelte';
  import { updateAnnotation, diagramStore } from '../stores/diagramStore';
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

  const borderColor = $derived(data.color ?? ANNOTATION_DEFAULT_COLORS['package']);
  const bgColor = $derived(`${borderColor}12`);

  let editing = $state(false);
  let editValue = $state('');
  let inputEl = $state<HTMLInputElement | undefined>(undefined);

  function handleResizeEnd(_event: ResizeDragEvent, params: ResizeParams) {
    updateAnnotation(get(diagramStore).currentLevel, id, {
      width: Math.round(params.width),
      height: Math.round(params.height),
      position: { x: params.x, y: params.y },
    });
  }

  function startEdit(e: MouseEvent | KeyboardEvent) {
    e.stopPropagation();
    editing = true;
    editValue = data.label;
    setTimeout(() => inputEl?.select(), 0);
  }

  function commitEdit() {
    if (editing && editValue.trim()) {
      updateAnnotation(get(diagramStore).currentLevel, id, { label: editValue.trim() });
    }
    editing = false;
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') editing = false;
  }
</script>

<div
  class="package-node"
  style="border-color: {borderColor}; background: {bgColor};"
  role="group"
>
  <NodeResizer
    minWidth={160}
    minHeight={100}
    lineStyle="border-color: {borderColor}; opacity: 0.6;"
    handleStyle="background: {borderColor}; border-color: {borderColor}; opacity: 0.8;"
    onResizeEnd={handleResizeEnd}
  />

  <!-- Package "tab" — the small folder tongue at the top-left -->
  <div
    class="package-tab nodrag"
    style="background: {borderColor};"
    ondblclick={startEdit}
    onkeydown={(e) => { if (e.key === 'Enter') startEdit(e); }}
    role="button"
    tabindex="0"
  >
    {#if editing}
      <input
        bind:this={inputEl}
        class="tab-input"
        bind:value={editValue}
        onblur={commitEdit}
        onkeydown={handleKeyDown}
        onclick={(e) => e.stopPropagation()}
      />
    {:else}
      <span class="tab-label">{data.label}</span>
    {/if}
  </div>

  <!-- Package body -->
  <div class="package-body"></div>
</div>

<style>
  .package-node {
    width: 100%;
    height: 100%;
    border: 2px solid;
    border-radius: 0 6px 6px 6px;
    position: relative;
    z-index: -1;
    pointer-events: all;
    min-width: 160px;
    min-height: 100px;
    box-sizing: border-box;
  }

  /* The folder tab sits flush above the top-left corner of the body */
  .package-tab {
    position: absolute;
    /* Raise the tab above the top border by its own height */
    top: calc(-22px - 2px); /* tab height + border compensation */
    left: -2px;             /* align with the left border */
    height: 22px;
    min-width: 80px;
    max-width: 50%;
    border-radius: 4px 4px 0 0;
    padding: 0 10px;
    display: flex;
    align-items: center;
    cursor: text;
    overflow: hidden;
  }

  .tab-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    user-select: none;
  }

  .tab-input {
    font-size: 0.7rem;
    font-weight: 700;
    color: white;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.6);
    outline: none;
    padding: 0;
    width: 100%;
    caret-color: white;
  }

  .package-body {
    width: 100%;
    height: 100%;
  }
</style>
