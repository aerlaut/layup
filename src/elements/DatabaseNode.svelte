<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { getColorVariants, NODE_DEFAULT_COLORS } from '../utils/colors';

  let {
    data,
  }: {
    data: { label: string; description?: string; technology?: string; hasChildren?: boolean; color?: string };
    [key: string]: unknown;
  } = $props();

  const colors = $derived(getColorVariants(data.color ?? NODE_DEFAULT_COLORS['database']));
</script>

<div class="database-node" style="border-color: {colors.primary}; background: {colors.bg};">
  <Handle id="top-target" type="target" position={Position.Top} />
  <Handle id="left-target" type="target" position={Position.Left} />
  <Handle id="left-source" type="source" position={Position.Left} />
  <Handle id="right-target" type="target" position={Position.Right} />
  <Handle id="right-source" type="source" position={Position.Right} />

  <!-- Cylinder top ellipse -->
  <div class="cylinder-top" style="border-color: {colors.primary}; background: {colors.badge};"></div>

  <div class="cylinder-body">
    <div class="node-type-badge" style="color: {colors.muted};">Database</div>
    <div class="node-label" style="color: {colors.text};">{data.label}</div>
    {#if data.technology}
      <div class="tech-badge" style="background: {colors.badge}; color: {colors.text};">{data.technology}</div>
    {/if}
    {#if data.description}
      <div class="node-desc" style="color: {colors.muted};">{data.description}</div>
    {/if}
  </div>

  {#if data.hasChildren}
    <div class="drill-indicator" style="color: {colors.primary};" title="Double-click to drill in">▸</div>
  {/if}

  <Handle id="bottom-source" type="source" position={Position.Bottom} />
</div>

<style>
  .database-node {
    border: 2px solid;
    border-radius: 0 0 8px 8px;
    border-top: none;
    padding: 8px 16px 12px;
    text-align: center;
    min-width: 140px;
    position: relative;
    cursor: pointer;
    user-select: none;
  }

  /* The ellipse cap at the top to simulate a cylinder */
  .cylinder-top {
    position: absolute;
    top: -14px;
    left: -2px;
    right: -2px;
    height: 28px;
    border: 2px solid;
    border-radius: 50%;
    /* Clip the bottom half so it looks like a cap */
    clip-path: inset(0 0 50% 0);
  }

  /* Render a full bottom semi-ellipse to close the cylinder top visually */
  .database-node::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid;
    border-color: inherit;
    background: inherit;
  }

  .cylinder-body {
    margin-top: 6px;
  }

  .node-type-badge {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 4px;
  }

  .node-label {
    font-weight: 700;
    font-size: 0.85rem;
  }

  .tech-badge {
    display: inline-block;
    font-size: 0.65rem;
    padding: 1px 6px;
    border-radius: 10px;
    margin-top: 4px;
    font-style: italic;
  }

  .node-desc {
    font-size: 0.7rem;
    margin-top: 4px;
  }

  .drill-indicator {
    position: absolute;
    bottom: 4px;
    right: 6px;
    font-size: 0.7rem;
    opacity: 0.7;
  }
</style>
