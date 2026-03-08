<script lang="ts">
  import { updateNode, deleteNode, diagramStore } from '../../stores/diagramStore';
  import type { C4Node, C4LevelType } from '../../types';
  import { NODE_DEFAULT_COLORS, PASTEL_PALETTE } from '../../utils/colors';
  import { UML_CLASS_TYPES, ERD_NODE_TYPES } from '../../utils/nodeTypes';
  import UmlMemberEditor from './UmlMemberEditor.svelte';
  import ErdColumnEditor from './ErdColumnEditor.svelte';
  import { exportNodeSubtree } from '../../utils/nodeSubtreeExport';
  import { get } from 'svelte/store';

  interface Props {
    node: C4Node;
    level: C4LevelType;
  }

  const { node, level }: Props = $props();

  function handleExportSubtree() {
    exportNodeSubtree(get(diagramStore), node.id, node.label);
  }

  const isUmlClassNode = $derived(UML_CLASS_TYPES.has(node.type));
  const isErdNode = $derived(ERD_NODE_TYPES.has(node.type));
  const noTechTypes = new Set(['person', 'external-person', 'system', 'external-system']);
</script>

<div class="panel-header">
  <span class="panel-title">Element</span>
  <span class="node-type-chip">{node.type}</span>
</div>
<div class="panel-body">
  <div class="field">
    <label for="node-label">Label</label>
    <input id="node-label" type="text" value={node.label}
      oninput={(e) => updateNode(node.id, { label: (e.target as HTMLInputElement).value })} />
  </div>
  <div class="field">
    <label for="node-desc">Description</label>
    <textarea id="node-desc" rows="3" value={node.description ?? ''}
      oninput={(e) => updateNode(node.id, { description: (e.target as HTMLInputElement).value })}
    ></textarea>
  </div>
  {#if !noTechTypes.has(node.type)}
    <div class="field">
      <label for="node-tech">Technology</label>
      <input id="node-tech" type="text" value={node.technology ?? ''}
        oninput={(e) => updateNode(node.id, { technology: (e.target as HTMLInputElement).value })} />
    </div>
  {/if}
  <div class="field">
    <label for="node-color">Color</label>
    <div class="color-swatches">
      {#each PASTEL_PALETTE as swatch}
        <button class="swatch" class:active={(node.color ?? NODE_DEFAULT_COLORS[node.type]) === swatch.color}
          style="background: {swatch.color};" title={swatch.label}
          onclick={() => updateNode(node.id, { color: swatch.color })}></button>
      {/each}
    </div>
    <div class="color-custom">
      <input id="node-color" type="color" value={node.color ?? NODE_DEFAULT_COLORS[node.type]}
        oninput={(e) => updateNode(node.id, { color: (e.target as HTMLInputElement).value })} />
      <span class="color-value">{node.color ?? NODE_DEFAULT_COLORS[node.type]}</span>
    </div>
  </div>
  {#if isUmlClassNode}
    <UmlMemberEditor nodeId={node.id} members={node.members ?? []} nodeType={node.type} />
  {/if}
  {#if isErdNode}
    <ErdColumnEditor nodeId={node.id} columns={node.columns ?? []} />
  {/if}
  <button class="secondary-btn" onclick={handleExportSubtree}>Export Subtree</button>
  <button class="danger-btn" onclick={() => deleteNode(node.id)}>Delete Element</button>
</div>

<style>
  @import './_panel.css';

  .node-type-chip {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 1px 8px;
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }
</style>
