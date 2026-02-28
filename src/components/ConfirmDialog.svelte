<script lang="ts">
  let {
    message,
    confirmLabel = 'Delete',
    onConfirm,
    onCancel,
  }: {
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
  } = $props();
</script>

<div class="confirm-dialog">
  <span class="confirm-message">{message}</span>
  <div class="confirm-actions">
    <button class="confirm-cancel" onclick={onCancel}>Cancel</button>
    <button class="confirm-delete" onclick={onConfirm}>{confirmLabel}</button>
  </div>
</div>

<style>
  .confirm-dialog {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--border-radius);
    font-size: 0.8rem;
    color: var(--color-danger-text);
  }

  .confirm-message {
    flex: 1;
    min-width: 0;
  }

  .confirm-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .confirm-cancel {
    background: var(--color-surface);
    color: var(--color-text);
    padding: 4px 10px;
    font-size: 0.75rem;
  }

  .confirm-delete {
    background: var(--color-danger);
    color: white;
    border-color: transparent;
    padding: 4px 10px;
    font-size: 0.75rem;
  }

  .confirm-delete:hover {
    background: var(--color-danger-hover);
    border-color: transparent;
  }
</style>
