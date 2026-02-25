<script lang="ts">
  import { diagramStore, currentDiagram, updateNode, updateEdge, deleteNode, deleteEdge, setSelected } from '../stores/diagramStore';
  import type { C4Node, C4Edge } from '../types';

  export let selectedId: string | null;

  $: diagram = $currentDiagram;

  $: selectedNode = selectedId
    ? (diagram?.nodes.find((n) => n.id === selectedId) ?? null)
    : null;

  $: selectedEdge = selectedId && !selectedNode
    ? (diagram?.edges.find((e) => e.id === selectedId) ?? null)
    : null;

  function handleNodeLabelChange(e: Event) {
    if (!selectedNode) return;
    updateNode(selectedNode.id, { label: (e.target as HTMLInputElement).value });
  }

  function handleNodeDescChange(e: Event) {
    if (!selectedNode) return;
    updateNode(selectedNode.id, { description: (e.target as HTMLInputElement).value });
  }

  function handleNodeTechChange(e: Event) {
    if (!selectedNode) return;
    updateNode(selectedNode.id, { technology: (e.target as HTMLInputElement).value });
  }

  function handleEdgeLabelChange(e: Event) {
    if (!selectedEdge) return;
    updateEdge(selectedEdge.id, { label: (e.target as HTMLInputElement).value });
  }

  function handleEdgeDescChange(e: Event) {
    if (!selectedEdge) return;
    updateEdge(selectedEdge.id, { description: (e.target as HTMLInputElement).value });
  }

  function handleEdgeTechChange(e: Event) {
    if (!selectedEdge) return;
    updateEdge(selectedEdge.id, { technology: (e.target as HTMLInputElement).value });
  }

  function handleDeleteNode() {
    if (!selectedNode) return;
    deleteNode(selectedNode.id);
  }

  function handleDeleteEdge() {
    if (!selectedEdge) return;
    deleteEdge(selectedEdge.id);
  }
</script>

<div class="panel">
  {#if selectedNode}
    <div class="panel-header">
      <span class="panel-title">Element</span>
      <span class="node-type-chip">{selectedNode.type}</span>
    </div>
    <div class="panel-body">
      <div class="field">
        <label for="node-label">Label</label>
        <input
          id="node-label"
          type="text"
          value={selectedNode.label}
          on:input={handleNodeLabelChange}
        />
      </div>
      <div class="field">
        <label for="node-desc">Description</label>
        <textarea
          id="node-desc"
          rows="3"
          value={selectedNode.description ?? ''}
          on:input={handleNodeDescChange}
        ></textarea>
      </div>
      {#if selectedNode.type !== 'person' && selectedNode.type !== 'system'}
        <div class="field">
          <label for="node-tech">Technology</label>
          <input
            id="node-tech"
            type="text"
            value={selectedNode.technology ?? ''}
            on:input={handleNodeTechChange}
          />
        </div>
      {/if}
      <button class="danger-btn" on:click={handleDeleteNode}>Delete Element</button>
    </div>

  {:else if selectedEdge}
    <div class="panel-header">
      <span class="panel-title">Relationship</span>
    </div>
    <div class="panel-body">
      <div class="field">
        <label for="edge-label">Label</label>
        <input
          id="edge-label"
          type="text"
          value={selectedEdge.label ?? ''}
          on:input={handleEdgeLabelChange}
        />
      </div>
      <div class="field">
        <label for="edge-desc">Description</label>
        <textarea
          id="edge-desc"
          rows="3"
          value={selectedEdge.description ?? ''}
          on:input={handleEdgeDescChange}
        ></textarea>
      </div>
      <div class="field">
        <label for="edge-tech">Technology</label>
        <input
          id="edge-tech"
          type="text"
          value={selectedEdge.technology ?? ''}
          on:input={handleEdgeTechChange}
        />
      </div>
      <button class="danger-btn" on:click={handleDeleteEdge}>Delete Relationship</button>
    </div>

  {:else}
    <div class="panel-empty">
      <p>Select an element or relationship to edit its properties.</p>
    </div>
  {/if}
</div>

<style>
  .panel {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
  }

  .panel-title {
    font-weight: 700;
    font-size: 0.875rem;
    color: var(--color-text);
  }

  .node-type-chip {
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 10px;
    padding: 1px 8px;
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  .panel-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    flex: 1;
    overflow-y: auto;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  textarea {
    resize: vertical;
    min-height: 60px;
  }

  .danger-btn {
    border-color: var(--color-danger);
    color: var(--color-danger);
    margin-top: 8px;
  }

  .danger-btn:hover {
    background: #fef2f2;
  }

  .panel-empty {
    padding: 24px 16px;
    text-align: center;
  }

  .panel-empty p {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    line-height: 1.6;
  }
</style>
