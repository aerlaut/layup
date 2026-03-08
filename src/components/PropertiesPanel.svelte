<script lang="ts">
  import { selectedElement } from '../stores/diagramStore';
  import NodeProperties from './properties/NodeProperties.svelte';
  import EdgeProperties from './properties/EdgeProperties.svelte';
  import AnnotationProperties from './properties/AnnotationProperties.svelte';

  const sel = $derived($selectedElement);
</script>

<div class="panel">
  {#if sel?.type === 'node'}
    <NodeProperties node={sel.node} level={sel.level} />
  {:else if sel?.type === 'edge'}
    <EdgeProperties edge={sel.edge} level={sel.level} />
  {:else if sel?.type === 'annotation'}
    <AnnotationProperties annotation={sel.annotation} level={sel.level} />
  {:else}
    <div class="panel-empty">
      <p>Select an element or relationship to edit its properties.</p>
    </div>
  {/if}
</div>

<style>
  .panel { height: 100%; display: flex; flex-direction: column; }
  .panel-empty { padding: 24px 16px; text-align: center; }
  .panel-empty p { font-size: 0.8rem; color: var(--color-text-muted); line-height: 1.6; }
</style>
