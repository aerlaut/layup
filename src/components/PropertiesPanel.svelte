<script lang="ts">
  import {
    selectedElement,
    updateNodeInDiagram,
    updateEdgeInDiagram,
    updateAnnotation,
    deleteNodeFromDiagram,
    deleteEdgeFromDiagram,
    deleteAnnotation,
    setSelected,
  } from '../stores/diagramStore';
  import type { C4Node, C4Edge, Annotation, ClassMember, MemberVisibility, C4NodeType } from '../types';
  import { NODE_DEFAULT_COLORS, EDGE_DEFAULT_COLOR, ANNOTATION_DEFAULT_COLORS, PASTEL_PALETTE } from '../utils/colors';
  import { generateId } from '../utils/id';

  const sel = $derived($selectedElement);
  const selectedNode = $derived(sel?.type === 'node' ? sel.node : null);
  const selectedEdge = $derived(sel?.type === 'edge' ? sel.edge : null);
  const selectedAnnotation = $derived(sel?.type === 'annotation' ? sel.annotation : null);
  const diagramId = $derived(sel?.diagramId ?? null);

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

  function setNodeColor(color: string) {
    if (!selectedNode || !diagramId) return;
    updateNodeInDiagram(diagramId, selectedNode.id, { color });
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

  function handleLineTypeChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { lineType: (e.target as HTMLSelectElement).value as import('../types').LineType });
  }

  function handleEdgeColorChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { color: (e.target as HTMLInputElement).value });
  }

  function setEdgeColor(color: string) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { color });
  }

  // ─── UML member helpers ──────────────────────────────────────────────────────

  const UML_CLASS_TYPES: C4NodeType[] = ['class', 'abstract-class', 'interface', 'enum', 'record'];
  const isUmlClassNode = $derived(selectedNode ? UML_CLASS_TYPES.includes(selectedNode.type) : false);
  const isEnumNode = $derived(selectedNode?.type === 'enum');
  const isAbstractNode = $derived(selectedNode?.type === 'abstract-class' || selectedNode?.type === 'interface');

  function updateMembers(updater: (m: ClassMember[]) => ClassMember[]) {
    if (!selectedNode || !diagramId) return;
    const current = selectedNode.members ?? [];
    updateNodeInDiagram(diagramId, selectedNode.id, { members: updater(current) });
  }

  function addMember(kind: 'attribute' | 'operation') {
    updateMembers((m) => [
      ...m,
      { id: generateId(), kind, visibility: '+', name: kind === 'attribute' ? 'field' : 'method', type: kind === 'attribute' ? 'String' : 'void' },
    ]);
  }

  function updateMember(memberId: string, patch: Partial<ClassMember>) {
    updateMembers((m) => m.map((x) => (x.id === memberId ? { ...x, ...patch } : x)));
  }

  function deleteMember(memberId: string) {
    updateMembers((m) => m.filter((x) => x.id !== memberId));
  }

  function moveMember(memberId: string, dir: -1 | 1) {
    updateMembers((m) => {
      const idx = m.findIndex((x) => x.id === memberId);
      if (idx < 0) return m;
      const next = idx + dir;
      if (next < 0 || next >= m.length) return m;
      const arr = [...m];
      [arr[idx], arr[next]] = [arr[next]!, arr[idx]!];
      return arr;
    });
  }

  // ─── Relationship preset ─────────────────────────────────────────────────────

  type RelationshipPreset =
    | 'custom' | 'association' | 'dependency'
    | 'inheritance' | 'realization' | 'aggregation' | 'composition';

  const PRESETS: Record<Exclude<RelationshipPreset, 'custom'>, Partial<C4Edge>> = {
    association:  { lineStyle: 'solid',  markerStart: 'none', markerEnd: 'open-arrow' },
    dependency:   { lineStyle: 'dashed', markerStart: 'none', markerEnd: 'open-arrow' },
    inheritance:  { lineStyle: 'solid',  markerStart: 'none', markerEnd: 'hollow-triangle' },
    realization:  { lineStyle: 'dashed', markerStart: 'none', markerEnd: 'hollow-triangle' },
    aggregation:  { lineStyle: 'solid',  markerStart: 'hollow-diamond', markerEnd: 'none' },
    composition:  { lineStyle: 'solid',  markerStart: 'filled-diamond', markerEnd: 'none' },
  };

  /** Detect which preset the current edge matches, or 'custom' */
  const currentPreset = $derived.by((): RelationshipPreset => {
    if (!selectedEdge) return 'custom';
    const ms = selectedEdge.markerStart ?? 'none';
    const me = selectedEdge.markerEnd ?? 'arrow';
    const ls = selectedEdge.lineStyle ?? 'solid';
    for (const [key, p] of Object.entries(PRESETS) as [Exclude<RelationshipPreset,'custom'>, Partial<C4Edge>][]) {
      if (p.markerStart === ms && p.markerEnd === me && p.lineStyle === ls) return key;
    }
    return 'custom';
  });

  function handlePresetChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    const preset = (e.target as HTMLSelectElement).value as RelationshipPreset;
    if (preset === 'custom') return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, PRESETS[preset]);
  }

  // ─── Multiplicity / role handlers ────────────────────────────────────────────

  function handleMultiplicitySrcChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { multiplicitySource: (e.target as HTMLInputElement).value });
  }

  function handleMultiplicityTgtChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { multiplicityTarget: (e.target as HTMLInputElement).value });
  }

  function handleRoleSrcChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { roleSource: (e.target as HTMLInputElement).value });
  }

  function handleRoleTgtChange(e: Event) {
    if (!selectedEdge || !diagramId) return;
    updateEdgeInDiagram(diagramId, selectedEdge.id, { roleTarget: (e.target as HTMLInputElement).value });
  }

  function handleDeleteNode() {
    if (!selectedNode || !diagramId) return;
    deleteNodeFromDiagram(diagramId, selectedNode.id);
  }

  function handleDeleteEdge() {
    if (!selectedEdge || !diagramId) return;
    deleteEdgeFromDiagram(diagramId, selectedEdge.id);
  }

  function handleAnnotationLabelChange(e: Event) {
    if (!selectedAnnotation || !diagramId) return;
    updateAnnotation(diagramId, selectedAnnotation.id, { label: (e.target as HTMLInputElement).value });
  }

  function handleAnnotationTextChange(e: Event) {
    if (!selectedAnnotation || !diagramId) return;
    updateAnnotation(diagramId, selectedAnnotation.id, { text: (e.target as HTMLTextAreaElement).value });
  }

  function handleAnnotationColorChange(e: Event) {
    if (!selectedAnnotation || !diagramId) return;
    updateAnnotation(diagramId, selectedAnnotation.id, { color: (e.target as HTMLInputElement).value });
  }

  function setAnnotationColor(color: string) {
    if (!selectedAnnotation || !diagramId) return;
    updateAnnotation(diagramId, selectedAnnotation.id, { color });
  }

  function handleDeleteAnnotation() {
    if (!selectedAnnotation || !diagramId) return;
    deleteAnnotation(diagramId, selectedAnnotation.id);
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
          oninput={handleNodeLabelChange}
        />
      </div>
      <div class="field">
        <label for="node-desc">Description</label>
        <textarea
          id="node-desc"
          rows="3"
          value={selectedNode.description ?? ''}
          oninput={handleNodeDescChange}
        ></textarea>
      </div>
      {#if selectedNode.type !== 'person' && selectedNode.type !== 'external-person' && selectedNode.type !== 'system' && selectedNode.type !== 'external-system'}
        <div class="field">
          <label for="node-tech">Technology</label>
          <input
            id="node-tech"
            type="text"
            value={selectedNode.technology ?? ''}
            oninput={handleNodeTechChange}
          />
        </div>
      {/if}
      <div class="field">
        <label>Color</label>
        <div class="color-swatches">
          {#each PASTEL_PALETTE as swatch}
            <button
              class="swatch"
              class:active={(selectedNode.color ?? NODE_DEFAULT_COLORS[selectedNode.type]) === swatch.color}
              style="background: {swatch.color};"
              title={swatch.label}
              onclick={() => setNodeColor(swatch.color)}
            ></button>
          {/each}
        </div>
        <div class="color-custom">
          <input
            id="node-color"
            type="color"
            value={selectedNode.color ?? NODE_DEFAULT_COLORS[selectedNode.type]}
            oninput={handleNodeColorChange}
          />
          <span class="color-value">{selectedNode.color ?? NODE_DEFAULT_COLORS[selectedNode.type]}</span>
        </div>
      </div>
      {#if isUmlClassNode}
        <div class="field members-field">
          <label>{isEnumNode ? 'Literals' : 'Members'}</label>
          <div class="members-list">
            {#each (selectedNode.members ?? []) as member, idx (member.id)}
              <div class="member-row">
                <select
                  class="vis-select"
                  value={member.visibility}
                  onchange={(e) => updateMember(member.id, { visibility: (e.target as HTMLSelectElement).value as MemberVisibility })}
                  title="Visibility"
                >
                  <option value="+">+ public</option>
                  <option value="-">− private</option>
                  <option value="#"># protected</option>
                  <option value="~">~ package</option>
                </select>
                <input
                  class="member-name"
                  type="text"
                  value={member.name}
                  placeholder="name"
                  oninput={(e) => updateMember(member.id, { name: (e.target as HTMLInputElement).value })}
                />
                <span class="type-sep">:</span>
                <input
                  class="member-type"
                  type="text"
                  value={member.type ?? ''}
                  placeholder="type"
                  oninput={(e) => updateMember(member.id, { type: (e.target as HTMLInputElement).value })}
                />
                {#if member.kind === 'operation'}
                  <input
                    class="member-params"
                    type="text"
                    value={member.params ?? ''}
                    placeholder="(params)"
                    oninput={(e) => updateMember(member.id, { params: (e.target as HTMLInputElement).value })}
                  />
                {/if}
                <div class="member-flags">
                  <label class="flag-label" title="Static">
                    <input type="checkbox" checked={member.isStatic === true} onchange={(e) => updateMember(member.id, { isStatic: (e.target as HTMLInputElement).checked })} />
                    <span>S</span>
                  </label>
                  {#if isAbstractNode}
                    <label class="flag-label" title="Abstract">
                      <input type="checkbox" checked={member.isAbstract === true} onchange={(e) => updateMember(member.id, { isAbstract: (e.target as HTMLInputElement).checked })} />
                      <span>A</span>
                    </label>
                  {/if}
                </div>
                <div class="member-actions">
                  <button class="icon-btn" onclick={() => moveMember(member.id, -1)} disabled={idx === 0} title="Move up">↑</button>
                  <button class="icon-btn" onclick={() => moveMember(member.id, 1)} disabled={idx === (selectedNode.members ?? []).length - 1} title="Move down">↓</button>
                  <button class="icon-btn danger" onclick={() => deleteMember(member.id)} title="Delete">✕</button>
                </div>
              </div>
            {/each}
          </div>
          <div class="add-member-btns">
            {#if !isEnumNode}
              <button class="add-btn" onclick={() => addMember('attribute')}>+ Attribute</button>
              <button class="add-btn" onclick={() => addMember('operation')}>+ Operation</button>
            {:else}
              <button class="add-btn" onclick={() => addMember('attribute')}>+ Literal</button>
            {/if}
          </div>
        </div>
      {/if}

      <button class="danger-btn" onclick={handleDeleteNode}>Delete Element</button>
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
          oninput={handleEdgeLabelChange}
        />
      </div>
      <div class="field">
        <label for="edge-desc">Description</label>
        <textarea
          id="edge-desc"
          rows="3"
          value={selectedEdge.description ?? ''}
          oninput={handleEdgeDescChange}
        ></textarea>
      </div>
      <div class="field">
        <label for="edge-tech">Technology</label>
        <input
          id="edge-tech"
          type="text"
          value={selectedEdge.technology ?? ''}
          oninput={handleEdgeTechChange}
        />
      </div>
      <div class="field">
        <label for="edge-preset">Relationship Type</label>
        <select id="edge-preset" value={currentPreset} onchange={handlePresetChange}>
          <option value="custom">Custom</option>
          <option value="association">Association</option>
          <option value="dependency">Dependency</option>
          <option value="inheritance">Inheritance (Generalization)</option>
          <option value="realization">Realization (Implements)</option>
          <option value="aggregation">Aggregation</option>
          <option value="composition">Composition</option>
        </select>
      </div>
      <div class="field">
        <label for="edge-marker-start">Start Marker</label>
        <select id="edge-marker-start" value={selectedEdge.markerStart ?? 'none'} onchange={handleMarkerStartChange}>
          <option value="none">None</option>
          <option value="arrow">Arrow (filled)</option>
          <option value="dot">Dot</option>
          <option value="open-arrow">Open Arrow</option>
          <option value="hollow-triangle">Hollow Triangle</option>
          <option value="hollow-diamond">Hollow Diamond</option>
          <option value="filled-diamond">Filled Diamond</option>
        </select>
      </div>
      <div class="field">
        <label for="edge-marker-end">End Marker</label>
        <select id="edge-marker-end" value={selectedEdge.markerEnd ?? 'arrow'} onchange={handleMarkerEndChange}>
          <option value="none">None</option>
          <option value="arrow">Arrow (filled)</option>
          <option value="dot">Dot</option>
          <option value="open-arrow">Open Arrow</option>
          <option value="hollow-triangle">Hollow Triangle</option>
          <option value="hollow-diamond">Hollow Diamond</option>
          <option value="filled-diamond">Filled Diamond</option>
        </select>
      </div>
      <div class="field">
        <label for="edge-line-type">Line Type</label>
        <select id="edge-line-type" value={selectedEdge.lineType ?? 'bezier'} onchange={handleLineTypeChange}>
          <option value="bezier">Bezier</option>
          <option value="straight">Straight</option>
          <option value="step">Step</option>
          <option value="smoothstep">Smooth Step</option>
        </select>
      </div>
      <div class="field">
        <label for="edge-line-style">Line Style</label>
        <select id="edge-line-style" value={selectedEdge.lineStyle ?? 'solid'} onchange={handleLineStyleChange}>
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>
      <div class="field">
        <label>Color</label>
        <div class="color-swatches">
          {#each PASTEL_PALETTE as swatch}
            <button
              class="swatch"
              class:active={(selectedEdge.color ?? EDGE_DEFAULT_COLOR) === swatch.color}
              style="background: {swatch.color};"
              title={swatch.label}
              onclick={() => setEdgeColor(swatch.color)}
            ></button>
          {/each}
        </div>
        <div class="color-custom">
          <input
            id="edge-color"
            type="color"
            value={selectedEdge.color ?? EDGE_DEFAULT_COLOR}
            oninput={handleEdgeColorChange}
          />
          <span class="color-value">{selectedEdge.color ?? EDGE_DEFAULT_COLOR}</span>
        </div>
      </div>
      <div class="field">
        <label>Ends</label>
        <div class="ends-grid">
          <span class="ends-header">Source</span>
          <span class="ends-header">Target</span>
          <input
            type="text"
            value={selectedEdge.multiplicitySource ?? ''}
            placeholder="mult. (e.g. 1)"
            oninput={handleMultiplicitySrcChange}
            title="Source multiplicity"
          />
          <input
            type="text"
            value={selectedEdge.multiplicityTarget ?? ''}
            placeholder="mult. (e.g. 0..*)"
            oninput={handleMultiplicityTgtChange}
            title="Target multiplicity"
          />
          <input
            type="text"
            value={selectedEdge.roleSource ?? ''}
            placeholder="role name"
            oninput={handleRoleSrcChange}
            title="Source role name"
          />
          <input
            type="text"
            value={selectedEdge.roleTarget ?? ''}
            placeholder="role name"
            oninput={handleRoleTgtChange}
            title="Target role name"
          />
        </div>
      </div>

      <button class="danger-btn" onclick={handleDeleteEdge}>Delete Relationship</button>
    </div>

  {:else if selectedAnnotation}
    <div class="panel-header">
      <span class="panel-title">Annotation</span>
      <span class="node-type-chip">{selectedAnnotation.type}</span>
    </div>
    <div class="panel-body">
      <div class="field">
        <label for="annot-label">Label</label>
        <input
          id="annot-label"
          type="text"
          value={selectedAnnotation.label}
          oninput={handleAnnotationLabelChange}
        />
      </div>
      {#if selectedAnnotation.type === 'note'}
        <div class="field">
          <label for="annot-text">Text</label>
          <textarea
            id="annot-text"
            rows="5"
            value={selectedAnnotation.text ?? ''}
            oninput={handleAnnotationTextChange}
          ></textarea>
        </div>
      {/if}
      <div class="field">
        <label>Color</label>
        <div class="color-swatches">
          {#each PASTEL_PALETTE as swatch}
            <button
              class="swatch"
              class:active={(selectedAnnotation.color ?? ANNOTATION_DEFAULT_COLORS[selectedAnnotation.type]) === swatch.color}
              style="background: {swatch.color};"
              title={swatch.label}
              onclick={() => setAnnotationColor(swatch.color)}
            ></button>
          {/each}
        </div>
        <div class="color-custom">
          <input
            id="annot-color"
            type="color"
            value={selectedAnnotation.color ?? ANNOTATION_DEFAULT_COLORS[selectedAnnotation.type]}
            oninput={handleAnnotationColorChange}
          />
          <span class="color-value">{selectedAnnotation.color ?? ANNOTATION_DEFAULT_COLORS[selectedAnnotation.type]}</span>
        </div>
      </div>
      <button class="danger-btn" onclick={handleDeleteAnnotation}>Delete Annotation</button>
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

  .color-swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .swatch {
    width: 22px;
    height: 22px;
    min-width: 22px;
    border: 2px solid transparent;
    border-radius: 4px;
    padding: 0;
    cursor: pointer;
    transition: border-color 0.12s, transform 0.12s;
  }

  .swatch:hover {
    transform: scale(1.15);
    border-color: var(--color-text-muted);
  }

  .swatch.active {
    border-color: var(--color-text);
    box-shadow: 0 0 0 1px var(--color-surface), 0 0 0 3px var(--color-text);
  }

  .color-custom {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .color-custom input[type="color"] {
    width: 28px;
    height: 22px;
    padding: 1px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
  }

  .color-value {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    font-family: monospace;
  }

  .danger-btn {
    border-color: var(--color-danger);
    color: var(--color-danger);
    margin-top: 8px;
  }

  .danger-btn:hover {
    background: var(--color-danger-bg);
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

  /* ─── Member editor ─── */

  .members-field {
    gap: 6px;
  }

  .members-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .member-row {
    display: flex;
    align-items: center;
    gap: 3px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    padding: 3px 5px;
    flex-wrap: wrap;
  }

  .vis-select {
    width: 80px;
    font-size: 0.7rem;
    padding: 2px 2px;
    flex-shrink: 0;
  }

  .member-name {
    width: 70px;
    flex-shrink: 0;
    font-size: 0.7rem;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .type-sep {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .member-type {
    width: 60px;
    flex-shrink: 0;
    font-size: 0.7rem;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .member-params {
    width: 70px;
    flex-shrink: 0;
    font-size: 0.7rem;
    font-family: 'SF Mono', 'Fira Code', monospace;
  }

  .member-flags {
    display: flex;
    gap: 4px;
    margin-left: auto;
  }

  .flag-label {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--color-text-muted);
    cursor: pointer;
  }

  .flag-label input[type="checkbox"] {
    width: 11px;
    height: 11px;
    margin: 0;
    cursor: pointer;
  }

  .member-actions {
    display: flex;
    gap: 2px;
  }

  .icon-btn {
    padding: 1px 5px;
    font-size: 0.65rem;
    line-height: 1.4;
    min-width: unset;
    border-radius: 3px;
    background: transparent;
  }

  .icon-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .icon-btn.danger {
    color: var(--color-danger);
    border-color: var(--color-danger);
  }

  .icon-btn.danger:hover {
    background: var(--color-danger-bg);
  }

  .add-member-btns {
    display: flex;
    gap: 6px;
    margin-top: 2px;
  }

  .add-btn {
    font-size: 0.7rem;
    padding: 3px 8px;
  }

  /* ─── Ends (multiplicity / role) grid ─── */

  .ends-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    align-items: center;
  }

  .ends-header {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    text-align: center;
  }

  .ends-grid input {
    font-size: 0.7rem;
  }
</style>
