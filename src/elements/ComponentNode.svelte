<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';

  let {
    data,
  }: {
    data: { label: string; description?: string; technology?: string; childDiagramId?: string };
    [key: string]: unknown;
  } = $props();
</script>

<div class="component-node">
  <Handle id="top-target" type="target" position={Position.Top} />
  <Handle id="left-target" type="target" position={Position.Left} />
  <Handle id="left-source" type="source" position={Position.Left} />
  <Handle id="right-target" type="target" position={Position.Right} />
  <Handle id="right-source" type="source" position={Position.Right} />
  <div class="node-type-badge">Component</div>
  <div class="node-label">{data.label}</div>
  {#if data.technology}
    <div class="tech-badge">{data.technology}</div>
  {/if}
  {#if data.description}
    <div class="node-desc">{data.description}</div>
  {/if}
  {#if data.childDiagramId}
    <div class="drill-indicator" title="Double-click to drill in">▸</div>
  {/if}
  <Handle id="bottom-source" type="source" position={Position.Bottom} />
</div>

<style>
  .component-node {
    background: #fdf4ff;
    border: 2px solid #a855f7;
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
    color: #9333ea;
    margin-bottom: 4px;
  }

  .node-label {
    font-weight: 700;
    font-size: 0.85rem;
    color: #581c87;
  }

  .tech-badge {
    display: inline-block;
    background: #e9d5ff;
    color: #6b21a8;
    font-size: 0.65rem;
    padding: 1px 6px;
    border-radius: 10px;
    margin-top: 4px;
    font-style: italic;
  }

  .node-desc {
    font-size: 0.7rem;
    color: #9333ea;
    margin-top: 4px;
  }

  .drill-indicator {
    position: absolute;
    bottom: 4px;
    right: 6px;
    font-size: 0.7rem;
    color: #a855f7;
    opacity: 0.7;
  }
</style>
