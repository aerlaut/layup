<script lang="ts">
  import { updateAnnotation, deleteAnnotation } from '../../stores/diagramStore';
  import type { Annotation, C4LevelType } from '../../types';
  import { ANNOTATION_DEFAULT_COLORS, PASTEL_PALETTE } from '../../utils/colors';

  interface Props {
    annotation: Annotation;
    level: C4LevelType;
  }

  const { annotation, level }: Props = $props();
</script>

<div class="panel-header">
  <span class="panel-title">Annotation</span>
  <span class="node-type-chip">{annotation.type}</span>
</div>
<div class="panel-body">
  <div class="field">
    <label for="annot-label">Label</label>
    <input id="annot-label" type="text" value={annotation.label}
      oninput={(e) => updateAnnotation(level, annotation.id, { label: (e.target as HTMLInputElement).value })} />
  </div>
  {#if annotation.type === 'note'}
    <div class="field">
      <label for="annot-text">Text</label>
      <textarea id="annot-text" rows="5" value={annotation.text ?? ''}
        oninput={(e) => updateAnnotation(level, annotation.id, { text: (e.target as HTMLTextAreaElement).value })}
      ></textarea>
    </div>
  {/if}
  <div class="field">
    <label for="annot-color">Color</label>
    <div class="color-swatches">
      {#each PASTEL_PALETTE as swatch}
        <button class="swatch"
          class:active={(annotation.color ?? ANNOTATION_DEFAULT_COLORS[annotation.type]) === swatch.color}
          style="background: {swatch.color};" title={swatch.label}
          onclick={() => updateAnnotation(level, annotation.id, { color: swatch.color })}></button>
      {/each}
    </div>
    <div class="color-custom">
      <input id="annot-color" type="color"
        value={annotation.color ?? ANNOTATION_DEFAULT_COLORS[annotation.type]}
        oninput={(e) => updateAnnotation(level, annotation.id, { color: (e.target as HTMLInputElement).value })} />
      <span class="color-value">{annotation.color ?? ANNOTATION_DEFAULT_COLORS[annotation.type]}</span>
    </div>
  </div>
  <button class="danger-btn" onclick={() => deleteAnnotation(level, annotation.id)}>Delete Annotation</button>
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
