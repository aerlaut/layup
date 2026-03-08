<script lang="ts">
  import type { NodeSubtreeExport, C4Node } from '../types';

  let {
    subtree,
    validParents,
    onConfirm,
    onCancel,
  }: {
    subtree: NodeSubtreeExport;
    validParents: C4Node[];
    onConfirm: (parentNodeId: string | undefined) => void;
    onCancel: () => void;
  } = $props();

  // Derive root node label and descendant count
  const rootLevelData = $derived(subtree.levels[subtree.rootLevel]);
  const rootLabel = $derived(rootLevelData?.nodes[0]?.label ?? '(unknown)');

  const descendantCount = $derived(() => {
    let total = 0;
    for (const level of Object.values(subtree.levels)) {
      total += level.nodes.length;
    }
    return total - 1; // subtract root node
  });

  // Determine if we have a "no parent found" error state:
  // rootLevel is not context but there are no valid parents
  const noParentError = $derived(
    subtree.rootLevel !== 'context' && validParents.length === 0
  );

  // Track selected parent
  let selectedParentId = $state(validParents[0]?.id ?? '');

  // Sync selectedParentId when validParents changes (reactive)
  $effect(() => {
    if (validParents.length > 0 && !validParents.find((p) => p.id === selectedParentId)) {
      selectedParentId = validParents[0].id;
    }
  });

  function handleConfirm() {
    if (noParentError) return;
    const parentId = subtree.rootLevel === 'context' ? undefined : selectedParentId || undefined;
    onConfirm(parentId);
  }
</script>

<div class="modal-backdrop" role="presentation" onclick={onCancel}>
  <div
    class="modal-card"
    role="dialog"
    aria-modal="true"
    aria-labelledby="import-node-dialog-title"
    onclick={(e) => e.stopPropagation()}
  >
    <div class="modal-header">
      <h2 id="import-node-dialog-title">Import Node Subtree</h2>
    </div>

    <div class="modal-body">
      <p class="summary">
        Importing "<strong>{rootLabel}</strong>" ({subtree.rootLevel} level)
        with {descendantCount()} descendant node{descendantCount() !== 1 ? 's' : ''}.
      </p>

      {#if noParentError}
        <p class="error-note">
          No compatible parent nodes found. Please add a valid parent node to this diagram first.
        </p>
      {:else if subtree.rootLevel === 'context'}
        <p class="context-note">
          This node will be placed at the top-level Context view.
        </p>
      {:else}
        <label class="parent-label" for="parent-select">Place under parent</label>
        <select id="parent-select" bind:value={selectedParentId} class="parent-select">
          {#each validParents as parent (parent.id)}
            <option value={parent.id}>{parent.label} ({parent.type})</option>
          {/each}
        </select>
      {/if}
    </div>

    <div class="modal-footer">
      <button class="btn-cancel" onclick={onCancel}>Cancel</button>
      <button class="btn-confirm" onclick={handleConfirm} disabled={noParentError}>
        Import
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

  .summary {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-text);
    line-height: 1.5;
  }

  .context-note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  .error-note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--color-danger-text);
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--border-radius);
    padding: 8px 12px;
  }

  .parent-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .parent-select {
    width: 100%;
    padding: 6px 8px;
    font-size: 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    background: var(--color-bg);
    color: var(--color-text);
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

  .btn-confirm:hover:not(:disabled) {
    background: var(--color-primary-hover);
    border-color: transparent;
  }

  .btn-confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
