<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  let {
    data,
  }: {
    data: { label: string; description?: string; technology?: string; childDiagramId?: string };
    [key: string]: unknown;
  } = $props();
</script>

<div class="system-node">
  <Handle type="target" position={Position.Top} />
  <div class="node-type-badge">Software System</div>
  <div class="node-label">{data.label}</div>
  {#if data.description}
    <div class="node-desc">{data.description}</div>
  {/if}
  {#if data.childDiagramId}
    <div class="drill-indicator" title="Double-click to drill in">▸</div>
  {/if}
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .system-node {
    background: #f0fdf4;
    border: 2px solid #22c55e;
    border-radius: 6px;
    padding: 12px 16px;
    text-align: center;
    min-width: 140px;
    position: relative;
    cursor: pointer;
    user-select: none;
  }

  .node-type-badge {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #16a34a;
    margin-bottom: 4px;
  }

  .node-label {
    font-weight: 700;
    font-size: 0.85rem;
    color: #14532d;
  }

  .node-desc {
    font-size: 0.7rem;
    color: #16a34a;
    margin-top: 4px;
  }

  .drill-indicator {
    position: absolute;
    bottom: 4px;
    right: 6px;
    font-size: 0.7rem;
    color: #22c55e;
    opacity: 0.7;
  }
</style>
