<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { updateNode } from '../stores/diagramStore';
  import { getColorVariants, NODE_DEFAULT_COLORS } from '../utils/colors';

  let {
    id,
    data,
  }: {
    id: string;
    data: {
      label: string;
      description?: string;
      hasChildren?: boolean;
      color?: string;
    };
    [key: string]: unknown;
  } = $props();

  const colors = $derived(getColorVariants(data.color ?? NODE_DEFAULT_COLORS['external-person']));

  let editing = $state(false);
  let editValue = $state('');
  let inputEl = $state<HTMLInputElement | undefined>(undefined);

  function startEdit(e: MouseEvent) {
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

<div
  class="person-node external"
  style="background: {colors.bg}; border-color: {colors.primary};"
  ondblclick={startEdit}
  role="group"
>
  <Handle id="top-target" type="target" position={Position.Top} />
  <Handle id="left-target" type="target" position={Position.Left} />
  <Handle id="left-source" type="source" position={Position.Left} />
  <Handle id="right-target" type="target" position={Position.Right} />
  <Handle id="right-source" type="source" position={Position.Right} />
  <div class="person-icon" style="color: {colors.muted};">
    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
      <circle cx="12" cy="7" r="4"/>
      <path d="M12 14c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z"/>
    </svg>
  </div>
  {#if editing}
    <input
      bind:this={inputEl}
      class="person-label-input"
      style="color: {colors.text}; border-color: {colors.primary};"
      bind:value={editValue}
      onblur={commitEdit}
      onkeydown={handleKeyDown}
      onclick={(e) => e.stopPropagation()}
    />
  {:else}
    <div class="person-label" style="color: {colors.text};">{data.label}</div>
  {/if}
  <div class="external-badge" style="color: {colors.muted};">[External]</div>
  {#if data.description && !editing}
    <div class="person-desc" style="color: {colors.muted};">{data.description}</div>
  {/if}
  {#if data.hasChildren}
    <div class="drill-indicator" style="color: {colors.primary};" title="Double-click to drill in">▸</div>
  {/if}
  <Handle id="bottom-source" type="source" position={Position.Bottom} />
</div>

<style>
  .person-node {
    border: 2px dashed;
    border-radius: 8px;
    padding: 12px 16px;
    text-align: center;
    min-width: 120px;
    position: relative;
    cursor: pointer;
    user-select: none;
  }

  .person-icon {
    display: flex;
    justify-content: center;
    margin-bottom: 4px;
  }

  .person-label {
    font-weight: 600;
    font-size: 0.8rem;
  }

  .person-label-input {
    font-weight: 600;
    font-size: 0.8rem;
    text-align: center;
    border: 1px solid;
    border-radius: 3px;
    width: 100%;
    padding: 1px 4px;
    background: white;
  }

  .external-badge {
    font-size: 0.62rem;
    font-style: italic;
    margin-top: 2px;
    opacity: 0.8;
  }

  .person-desc {
    font-size: 0.7rem;
    margin-top: 2px;
  }

  .drill-indicator {
    position: absolute;
    bottom: 4px;
    right: 6px;
    font-size: 0.7rem;
    opacity: 0.7;
  }
</style>
