<script lang="ts">
  import type { LayoutOptions, LayoutDirection, LayoutStyle, LayoutSpacing } from '../stores/autoLayout';
  import { DEFAULT_LAYOUT_OPTIONS } from '../stores/autoLayout';

  let {
    onConfirm,
    onCancel,
  }: {
    onConfirm: (options: LayoutOptions) => void;
    onCancel:  () => void;
  } = $props();

  let direction = $state<LayoutDirection>(DEFAULT_LAYOUT_OPTIONS.direction);
  let style     = $state<LayoutStyle>(DEFAULT_LAYOUT_OPTIONS.style);
  let spacing   = $state<LayoutSpacing>(DEFAULT_LAYOUT_OPTIONS.spacing);
</script>

<div class="modal-backdrop" role="presentation" onclick={onCancel}>
  <div
    class="modal-card"
    role="dialog"
    aria-modal="true"
    aria-labelledby="auto-layout-dialog-title"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="modal-header">
      <h2 id="auto-layout-dialog-title">Auto Layout</h2>
    </div>

    <div class="modal-body">
      <fieldset>
        <legend>Style</legend>
        <div class="radio-row">
          <label>
            <input type="radio" bind:group={style} value="flow" />
            Flow
            <span class="option-desc">Arranges nodes in layers, respecting edge direction</span>
          </label>
          <label>
            <input type="radio" bind:group={style} value="compact" />
            Compact
            <span class="option-desc">Packs nodes tightly within each group</span>
          </label>
        </div>
      </fieldset>

      {#if style === 'flow'}
        <fieldset>
          <legend>Direction</legend>
          <div class="radio-row">
            <label>
              <input type="radio" bind:group={direction} value="right" />
              Left → Right
            </label>
            <label>
              <input type="radio" bind:group={direction} value="down" />
              Top → Bottom
            </label>
          </div>
        </fieldset>
      {/if}

      <fieldset>
        <legend>Spacing</legend>
        <div class="radio-row">
          <label>
            <input type="radio" bind:group={spacing} value="tight" />
            Tight
          </label>
          <label>
            <input type="radio" bind:group={spacing} value="normal" />
            Normal
          </label>
          <label>
            <input type="radio" bind:group={spacing} value="loose" />
            Loose
          </label>
        </div>
      </fieldset>
    </div>

    <div class="modal-footer">
      <button class="btn-cancel" onclick={onCancel}>Cancel</button>
      <button class="btn-confirm" onclick={() => onConfirm({ direction, style, spacing })}>
        Apply Layout
      </button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    min-width: 360px;
    max-width: 480px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .modal-header {
    padding: 16px 20px 12px;
    border-bottom: 1px solid var(--color-border);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .modal-body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  fieldset {
    border: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  legend {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 4px;
    padding: 0;
  }

  .radio-row {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
  }

  .radio-row label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 0.85rem;
    color: var(--color-text);
    cursor: pointer;
  }

  .option-desc {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  .modal-footer {
    padding: 12px 20px 16px;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .btn-cancel {
    background: var(--color-surface);
    color: var(--color-text);
    padding: 6px 14px;
    font-size: 0.82rem;
  }

  .btn-confirm {
    background: var(--color-primary);
    color: white;
    border-color: transparent;
    padding: 6px 14px;
    font-size: 0.82rem;
  }

  .btn-confirm:hover {
    background: var(--color-primary-hover);
    border-color: transparent;
  }
</style>
