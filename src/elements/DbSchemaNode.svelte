<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { getColorVariants, NODE_DEFAULT_COLORS } from '../utils/colors';

  let {
    data,
  }: {
    data: { label: string; description?: string; technology?: string; hasChildren?: boolean; color?: string };
    [key: string]: unknown;
  } = $props();

  const colors = $derived(getColorVariants(data.color ?? NODE_DEFAULT_COLORS['db-schema']));
</script>

<div class="db-schema-node" style="background: {colors.bg}; border-color: {colors.primary};">
  <Handle id="top-target" type="target" position={Position.Top} />
  <Handle id="left-target" type="target" position={Position.Left} />
  <Handle id="left-source" type="source" position={Position.Left} />
  <Handle id="right-target" type="target" position={Position.Right} />
  <Handle id="right-source" type="source" position={Position.Right} />

  <!-- Schema tab strip along the top edge -->
  <div class="schema-tab" style="background: {colors.primary};"></div>

  <div class="node-body">
    <div class="node-type-badge" style="color: {colors.muted};">Schema</div>
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
  .db-schema-node {
    border: 2px solid;
    border-radius: 6px;
    text-align: center;
    min-width: 140px;
    position: relative;
    cursor: pointer;
    user-select: none;
    overflow: hidden;
  }

  /* Coloured tab strip at the top — visual cue that this is a schema "folder" */
  .schema-tab {
    height: 5px;
    width: 100%;
  }

  .node-body {
    padding: 8px 16px 12px;
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
