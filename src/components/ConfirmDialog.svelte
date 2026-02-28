<script lang="ts">
  export let message: string;
  export let confirmLabel: string = 'Delete';
  export let onConfirm: () => void;
  export let onCancel: () => void;
</script>

<div class="confirm-dialog">
  <span class="confirm-message">{message}</span>
  <div class="confirm-actions">
    <button class="confirm-cancel" on:click={onCancel}>Cancel</button>
    <button class="confirm-delete" on:click={onConfirm}>{confirmLabel}</button>
  </div>
</div>

<style>
  .confirm-dialog {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: var(--border-radius);
    font-size: 0.8rem;
    color: #991b1b;
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
    background: #dc2626;
    border-color: transparent;
  }
</style>
