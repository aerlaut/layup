<script lang="ts">
  import { NodeResizer } from '@xyflow/svelte';
  import type { ResizeDragEvent, ResizeParams } from '@xyflow/svelte';
  import { diagramStore, updateNodeBoundarySize } from '../stores/diagramStore';
  import { prevLevel } from '../stores/diagramNavigation';
  import { fromBoundaryId } from '../canvas/boundaryId';
  import { get } from 'svelte/store';

  let {
    id,
    data,
  }: {
    id: string;
    data: { label: string; color?: string };
    [key: string]: unknown;
  } = $props();

  const borderColor = $derived(data.color ?? '#3b82f6');

  function handleResizeEnd(_event: ResizeDragEvent, params: ResizeParams) {
    const state = get(diagramStore);
    const parentLevel = prevLevel(state.currentLevel);
    if (!parentLevel) return;
    const parentNodeId = fromBoundaryId(id);
    updateNodeBoundarySize(parentLevel, parentNodeId, Math.round(params.width), Math.round(params.height));
  }
</script>

<div class="boundary-node" style="border-color: {borderColor}; background: {borderColor}0a;">
  <NodeResizer
    minWidth={220}
    minHeight={160}
    lineStyle="border-color: {borderColor}; opacity: 0.5; pointer-events: all;"
    handleStyle="background: {borderColor}; border-color: {borderColor}; opacity: 0.7; pointer-events: all;"
    onResizeEnd={handleResizeEnd}
  />
  <span class="boundary-label" style="color: {borderColor};">{data.label}</span>
</div>

<style>
  .boundary-node {
    width: 100%;
    height: 100%;
    border: 1.5px solid;
    border-radius: 10px;
    opacity: 0.5;
    position: relative;
    pointer-events: none;
  }

  .boundary-label {
    position: absolute;
    top: 8px;
    left: 14px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    user-select: none;
    pointer-events: all;
    cursor: grab;
  }

  .boundary-label:active {
    cursor: grabbing;
  }
</style>
