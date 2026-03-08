<script lang="ts">
  import { updateEdge, deleteEdge } from '../../stores/diagramStore';
  import type { C4Edge, C4LevelType, MarkerType, LineStyle, LineType } from '../../types';
  import { EDGE_DEFAULT_COLOR, PASTEL_PALETTE } from '../../utils/colors';

  interface Props {
    edge: C4Edge;
    level: C4LevelType;
  }

  const { edge, level }: Props = $props();

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

  const currentPreset = $derived.by((): RelationshipPreset => {
    const ms = edge.markerStart ?? 'none';
    const me = edge.markerEnd ?? 'arrow';
    const ls = edge.lineStyle ?? 'solid';
    for (const [key, p] of Object.entries(PRESETS) as [Exclude<RelationshipPreset, 'custom'>, Partial<C4Edge>][]) {
      if (p.markerStart === ms && p.markerEnd === me && p.lineStyle === ls) return key;
    }
    return 'custom';
  });

  function handlePresetChange(e: Event) {
    const preset = (e.target as HTMLSelectElement).value as RelationshipPreset;
    if (preset === 'custom') return;
    updateEdge(edge.id, PRESETS[preset]);
  }
</script>

<div class="panel-header">
  <span class="panel-title">Relationship</span>
</div>
<div class="panel-body">
  <div class="field">
    <label for="edge-label">Label</label>
    <input id="edge-label" type="text" value={edge.label ?? ''}
      oninput={(e) => updateEdge(edge.id, { label: (e.target as HTMLInputElement).value })} />
  </div>
  <div class="field">
    <label for="edge-desc">Description</label>
    <textarea id="edge-desc" rows="3" value={edge.description ?? ''}
      oninput={(e) => updateEdge(edge.id, { description: (e.target as HTMLInputElement).value })}
    ></textarea>
  </div>
  <div class="field">
    <label for="edge-tech">Technology</label>
    <input id="edge-tech" type="text" value={edge.technology ?? ''}
      oninput={(e) => updateEdge(edge.id, { technology: (e.target as HTMLInputElement).value })} />
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
    <select id="edge-marker-start" value={edge.markerStart ?? 'none'}
      onchange={(e) => updateEdge(edge.id, { markerStart: (e.target as HTMLSelectElement).value as MarkerType })}>
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
    <select id="edge-marker-end" value={edge.markerEnd ?? 'arrow'}
      onchange={(e) => updateEdge(edge.id, { markerEnd: (e.target as HTMLSelectElement).value as MarkerType })}>
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
    <select id="edge-line-type" value={edge.lineType ?? 'bezier'}
      onchange={(e) => updateEdge(edge.id, { lineType: (e.target as HTMLSelectElement).value as LineType })}>
      <option value="bezier">Bezier</option>
      <option value="straight">Straight</option>
      <option value="step">Step</option>
      <option value="smoothstep">Smooth Step</option>
    </select>
  </div>
  <div class="field">
    <label for="edge-line-style">Line Style</label>
    <select id="edge-line-style" value={edge.lineStyle ?? 'solid'}
      onchange={(e) => updateEdge(edge.id, { lineStyle: (e.target as HTMLSelectElement).value as LineStyle })}>
      <option value="solid">Solid</option>
      <option value="dashed">Dashed</option>
      <option value="dotted">Dotted</option>
    </select>
  </div>
  <div class="field">
    <label for="edge-color">Color</label>
    <div class="color-swatches">
      {#each PASTEL_PALETTE as swatch}
        <button class="swatch" class:active={(edge.color ?? EDGE_DEFAULT_COLOR) === swatch.color}
          style="background: {swatch.color};" title={swatch.label}
          onclick={() => updateEdge(edge.id, { color: swatch.color })}></button>
      {/each}
    </div>
    <div class="color-custom">
      <input id="edge-color" type="color" value={edge.color ?? EDGE_DEFAULT_COLOR}
        oninput={(e) => updateEdge(edge.id, { color: (e.target as HTMLInputElement).value })} />
      <span class="color-value">{edge.color ?? EDGE_DEFAULT_COLOR}</span>
    </div>
  </div>
  <div class="field">
    <span class="ends-label">Ends</span>
    <div class="ends-grid">
      <span class="ends-header">Source</span>
      <span class="ends-header">Target</span>
      <input type="text" value={edge.multiplicitySource ?? ''} placeholder="mult. (e.g. 1)" title="Source multiplicity"
        oninput={(e) => updateEdge(edge.id, { multiplicitySource: (e.target as HTMLInputElement).value })} />
      <input type="text" value={edge.multiplicityTarget ?? ''} placeholder="mult. (e.g. 0..*)" title="Target multiplicity"
        oninput={(e) => updateEdge(edge.id, { multiplicityTarget: (e.target as HTMLInputElement).value })} />
      <input type="text" value={edge.roleSource ?? ''} placeholder="role name" title="Source role name"
        oninput={(e) => updateEdge(edge.id, { roleSource: (e.target as HTMLInputElement).value })} />
      <input type="text" value={edge.roleTarget ?? ''} placeholder="role name" title="Target role name"
        oninput={(e) => updateEdge(edge.id, { roleTarget: (e.target as HTMLInputElement).value })} />
    </div>
  </div>
  <button class="danger-btn" onclick={() => deleteEdge(edge.id)}>Delete Relationship</button>
</div>

<style>
  @import './_panel.css';

  .ends-label { font-size: inherit; font-weight: inherit; color: inherit; }
  .ends-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; align-items: center; }
  .ends-header { font-size: 0.65rem; font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; text-align: center; }
  .ends-grid input { font-size: 0.7rem; }
</style>
