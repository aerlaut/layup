<script lang="ts">
  import { breadcrumbs, navigateTo } from '../stores/diagramStore';
</script>

<nav class="breadcrumb">
  {#each $breadcrumbs as item, i (item.id)}
    {#if i > 0}
      <span class="sep">›</span>
    {/if}
    <button
      class="crumb"
      class:active={i === $breadcrumbs.length - 1}
      onclick={() => navigateTo(item.id)}
    >
      {item.label}
    </button>
  {/each}
</nav>

<style>
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
    flex: 1;
    min-width: 0;
  }

  .crumb {
    border: none;
    background: none;
    padding: 2px 6px;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    border-radius: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }

  .crumb:hover {
    background: var(--color-bg);
    color: var(--color-primary);
    border-color: transparent;
  }

  .crumb.active {
    font-weight: 700;
    color: var(--color-text);
    cursor: default;
  }

  .crumb.active:hover {
    background: none;
    color: var(--color-text);
  }

  .sep {
    color: var(--color-border);
    font-size: 0.9rem;
    user-select: none;
  }
</style>
