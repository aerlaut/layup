<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { updateNode } from '../stores/diagramStore';

  let {
    id,
    data,
  }: {
    id: string;
    data: {
      label: string;
      description?: string;
      childDiagramId?: string;
    };
    [key: string]: unknown;
  } = $props();

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

<div class="person-node" ondblclick={startEdit} role="group">
  <Handle id="top-target" type="target" position={Position.Top} />
  <Handle id="left-target" type="target" position={Position.Left} />
  <Handle id="left-source" type="source" position={Position.Left} />
  <Handle id="right-target" type="target" position={Position.Right} />
  <Handle id="right-source" type="source" position={Position.Right} />
  <div class="person-icon">
    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
      <circle cx="12" cy="7" r="4"/>
      <path d="M12 14c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z"/>
    </svg>
  </div>
  {#if editing}
    <input
      bind:this={inputEl}
      class="person-label-input"
      bind:value={editValue}
      onblur={commitEdit}
      onkeydown={handleKeyDown}
      onclick={(e) => e.stopPropagation()}
    />
  {:else}
    <div class="person-label">{data.label}</div>
  {/if}
  {#if data.description && !editing}
    <div class="person-desc">{data.description}</div>
  {/if}
  {#if data.childDiagramId}
    <div class="drill-indicator" title="Double-click to drill in">▸</div>
  {/if}
  <Handle id="bottom-source" type="source" position={Position.Bottom} />
</div>

<style>
  .person-node {
    background: #dbeafe;
    border: 2px solid #3b82f6;
    border-radius: 8px;
    padding: 12px 16px;
    text-align: center;
    min-width: 120px;
    position: relative;
    cursor: pointer;
    user-select: none;
  }

  .person-icon {
    color: #1d4ed8;
    display: flex;
    justify-content: center;
    margin-bottom: 4px;
  }

  .person-label {
    font-weight: 600;
    font-size: 0.8rem;
    color: #1e3a8a;
  }

  .person-label-input {
    font-weight: 600;
    font-size: 0.8rem;
    color: #1e3a8a;
    text-align: center;
    border: 1px solid #3b82f6;
    border-radius: 3px;
    width: 100%;
    padding: 1px 4px;
    background: white;
  }

  .person-desc {
    font-size: 0.7rem;
    color: #3b82f6;
    margin-top: 2px;
  }

  .drill-indicator {
    position: absolute;
    bottom: 4px;
    right: 6px;
    font-size: 0.7rem;
    color: #3b82f6;
    opacity: 0.7;
  }
</style>
