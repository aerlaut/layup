<script lang="ts">
  import { breadcrumbs, navigateTo } from '../stores/diagramStore';

  /**
   * Skip the first N breadcrumbs. Useful when the parent toolbar already
   * renders the root-level label as its own clickable element.
   */
  let { startIndex = 0 }: { startIndex?: number } = $props();
</script>

{#if $breadcrumbs.length > startIndex}
  <nav class="breadcrumb">
    {#if startIndex > 0}
      <span class="sep">›</span>
    {/if}
    {#each $breadcrumbs.slice(startIndex) as item, i (item.id)}
      {#if i > 0}
        <span class="sep">›</span>
      {/if}
      <button
        class="crumb"
        class:active={startIndex + i === $breadcrumbs.length - 1}
        onclick={() => navigateTo(item.id)}
      >
        {item.label}
      </button>
    {/each}
  </nav>
{/if}

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
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: transparent;
    transition: color 0.15s, text-decoration-color 0.15s, background 0.15s;
  }

  .crumb:hover {
    background: var(--color-bg);
    color: var(--color-primary);
    border-color: transparent;
    text-decoration-color: var(--color-primary);
  }

  .crumb.active {
    font-weight: 700;
    color: var(--color-text);
    cursor: default;
    text-decoration: none;
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
