<script lang="ts">
  import { getBezierPath, EdgeLabel, BaseEdge, type EdgeProps, Position } from '@xyflow/svelte';

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition = Position.Bottom,
    targetPosition = Position.Top,
    data = {},
    label,
    markerEnd,
  }: EdgeProps & {
    data?: { description?: string; technology?: string };
    [key: string]: unknown;
  } = $props();

  let edgePath = $derived(getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  }));

  let path = $derived(edgePath[0]);
  let labelX = $derived(edgePath[1]);
  let labelY = $derived(edgePath[2]);
</script>

<BaseEdge {id} {path} markerEnd={markerEnd ?? 'url(#arrow)'} />

{#if label || data?.technology}
  <EdgeLabel x={labelX} y={labelY}>
    {#if label}<span class="edge-label-text">{label}</span>{/if}
    {#if data?.technology}<span class="edge-tech">[{data.technology}]</span>{/if}
  </EdgeLabel>
{/if}

<style>
  :global(.svelte-flow__edge-label) {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.7rem;
    text-align: center;
    white-space: nowrap;
  }

  .edge-label-text {
    display: block;
    font-weight: 600;
    color: #212529;
  }

  .edge-tech {
    display: block;
    color: #6c757d;
    font-style: italic;
  }
</style>
