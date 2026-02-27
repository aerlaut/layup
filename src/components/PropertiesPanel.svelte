<script lang="ts">
  import {
    selectedElement,
    updateNodeInDiagram,
    updateEdgeInDiagram,
    deleteNodeFromDiagram,
    deleteEdgeFromDiagram,
    setSelected,
  } from '../stores/diagramStore';
  import type { C4Node, C4Edge } from '../types';
  import { NODE_DEFAULT_COLORS, EDGE_DEFAULT_COLOR } from '../utils/colors';

  $: sel = $selectedElement;

  $: selectedNode = sel?.type === 'node' ? sel.node : null;
  $: selectedEdge = sel?.type === 'edge' ? sel.edge : null;
  $: diagramId = sel?.diagramId ?? null;

  function handleNodeLabelChange(e: Event) {
    if (!selectedNode || !diagramId) return;
    updateNodeInDiagram(diagramId, selectedNode.id, { label: (e.target as HTMLInputElement).value });
  }

  function handleNodeDescChange(e: Event) {
    if (!selectedNode || !diagramId) return;
    updateNodeInDiagram(diagramId, selectedNode.id, { description: (e.target as HTMLInputElement).value });
  }

  function handleNodeTechChange(e: Event) {
    if (!selectedNode || !diagramId) return;
    updateNodeInDiagram(diagramId, selectedNode.id, { technology: (e.target as HTMLInputElement).value });
  }

  function handleNodeColorChange(e: Event) {
    if (!selectedNode || !diagramId) return;
    updateNodeInDiagram(diagramId, selectedNode.id, { color: (e.target as HTMLInputElement).value });
  }

  function handleEdgeLabelChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { label: (e.target as HTMLInputElement).value });
  }

  function handleEdgeDescChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { description: (e.target as HTMLInputElement).value });
  }

  function handleEdgeTechChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { technology: (e.target as HTMLInputElement).value });
  }

  function handleMarkerStartChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { markerStart: (e.target as HTMLSelectElement).value as import('../types').MarkerType });
  }

  function handleMarkerEndChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { markerEnd: (e.target as HTMLSelectElement).value as import('../types').MarkerType });
  }

  function handleLineStyleChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { lineStyle: (e.target as HTMLSelectElement).value as import('../types').LineStyle });
  }

  function handleEdgeColorChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { color: (e.target as HTMLInputElement).value });
  }

  function handleDeleteNode() {
    if (!selectedNode || !diagramId) return;
    deleteNodeFromDiagram(diagramId, selectedNode.id);
  }

  function handleDeleteEdge() {
    if (!selectedEdge || !diagramId) return;
    deleteEdgeFromDiagram(diagramId, selectedEdge.id);
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
      <div class="field">
        <label for="node-color">Color</label>
        <div class="color-field">
          <input
            id="node-color"
            type="color"
            value={selectedNode.color ?? NODE_DEFAULT_COLORS[selectedNode.type]}
            on:input={handleNodeColorChange}
          />
          <span class="color-value">{selectedNode.color ?? NODE_DEFAULT_COLORS[selectedNode.type]}</span>
        </div>
      </div>
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
      <div class="field">
        <label for="edge-marker-start">Start Marker</label>
        <select id="edge-marker-start" value={selectedEdge.markerStart ?? 'none'} on:change={handleMarkerStartChange}>
          <option value="none">None</option>
          <option value="arrow">Arrow</option>
          <option value="dot">Dot</option>
        </select>
      </div>
      <div class="field">
        <label for="edge-marker-end">End Marker</label>
        <select id="edge-marker-end" value={selectedEdge.markerEnd ?? 'arrow'} on:change={handleMarkerEndChange}>
          <option value="none">None</option>
          <option value="arrow">Arrow</option>
          <option value="dot">Dot</option>
        </select>
      </div>
      <div class="field">
        <label for="edge-line-style">Line Style</label>
        <select id="edge-line-style" value={selectedEdge.lineStyle ?? 'solid'} on:change={handleLineStyleChange}>
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>
      <div class="field">
        <label for="edge-color">Color</label>
        <div class="color-field">
          <input
            id="edge-color"
            type="color"
            value={selectedEdge.color ?? EDGE_DEFAULT_COLOR}
            on:input={handleEdgeColorChange}
          />
          <span class="color-value">{selectedEdge.color ?? EDGE_DEFAULT_COLOR}</span>
        </div>
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

  .color-field {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .color-field input[type="color"] {
    width: 36px;
    height: 28px;
    padding: 2px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .color-value {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-family: monospace;
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
