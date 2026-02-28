<script lang="ts">
  import type { DiagramMeta } from '../types';
  import { openDiagram, deleteDiagram, duplicateDiagram, renameDiagram } from '../stores/appStore';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  export let projectId: string;
  export let diagram: DiagramMeta;

  let showMenu = false;
  let isRenaming = false;
  let renameValue = '';
  let showDeleteConfirm = false;
  let renameInput: HTMLInputElement;

  function formatRelativeTime(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  function handleClick() {
    if (isRenaming || showDeleteConfirm) return;
    openDiagram(projectId, diagram.id);
  }

  function handleMenuToggle(e: MouseEvent) {
    e.stopPropagation();
    showMenu = !showMenu;
  }

  function handleRenameStart(e: MouseEvent) {
    e.stopPropagation();
    showMenu = false;
    isRenaming = true;
    renameValue = diagram.name;
    // Focus input after Svelte renders it
    requestAnimationFrame(() => renameInput?.focus());
  }

  function handleRenameConfirm() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== diagram.name) {
      renameDiagram(projectId, diagram.id, trimmed);
    }
    isRenaming = false;
  }

  function handleRenameKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleRenameConfirm();
    if (e.key === 'Escape') { isRenaming = false; }
  }

  function handleDuplicate(e: MouseEvent) {
    e.stopPropagation();
    showMenu = false;
    duplicateDiagram(projectId, diagram.id);
  }

  function handleDeleteRequest(e: MouseEvent) {
    e.stopPropagation();
    showMenu = false;
    showDeleteConfirm = true;
  }

  function handleDeleteConfirm() {
    deleteDiagram(projectId, diagram.id);
    showDeleteConfirm = false;
  }

  function handleDeleteCancel() {
    showDeleteConfirm = false;
  }

  function handleClickOutsideMenu(e: MouseEvent) {
    if (showMenu) showMenu = false;
  }

  $: timeAgo = formatRelativeTime(diagram.updatedAt);
</script>

<svelte:window on:click={handleClickOutsideMenu} />

<div class="diagram-card" on:click={handleClick} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleClick()}>
  <div class="diagram-card-icon">📊</div>

  <div class="diagram-card-body">
    {#if isRenaming}
      <!-- svelte-ignore a11y_autofocus -->
      <input
        bind:this={renameInput}
        class="rename-input"
        type="text"
        bind:value={renameValue}
        on:blur={handleRenameConfirm}
        on:keydown={handleRenameKeyDown}
        on:click|stopPropagation
      />
    {:else}
      <span class="diagram-name">{diagram.name}</span>
    {/if}
    <span class="diagram-updated">Updated {timeAgo}</span>
  </div>

  {#if showDeleteConfirm}
    <div class="diagram-confirm" on:click|stopPropagation role="presentation">
      <ConfirmDialog
        message="Delete this diagram?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  {:else}
    <div class="diagram-menu-wrapper">
      <button class="menu-btn" on:click={handleMenuToggle} title="Actions">⋯</button>
      {#if showMenu}
        <div class="menu-dropdown" on:click|stopPropagation role="menu">
          <button class="menu-item" on:click={handleRenameStart}>Rename</button>
          <button class="menu-item" on:click={handleDuplicate}>Duplicate</button>
          <button class="menu-item danger" on:click={handleDeleteRequest}>Delete</button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .diagram-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
    position: relative;
  }

  .diagram-card:hover {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-sm);
  }

  .diagram-card-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .diagram-card-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .diagram-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .diagram-updated {
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  .rename-input {
    font-weight: 600;
    font-size: 0.875rem;
    padding: 2px 6px;
    width: 100%;
  }

  .diagram-menu-wrapper {
    position: relative;
    flex-shrink: 0;
  }

  .menu-btn {
    border: none;
    background: none;
    font-size: 1.1rem;
    padding: 2px 6px;
    color: var(--color-text-muted);
    border-radius: 4px;
    line-height: 1;
  }

  .menu-btn:hover {
    background: var(--color-bg);
    color: var(--color-text);
    border: none;
  }

  .menu-dropdown {
    position: absolute;
    right: 0;
    top: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-md);
    z-index: 20;
    min-width: 120px;
    padding: 4px 0;
  }

  .menu-item {
    display: block;
    width: 100%;
    border: none;
    background: none;
    padding: 6px 14px;
    font-size: 0.8rem;
    text-align: left;
    color: var(--color-text);
    border-radius: 0;
  }

  .menu-item:hover {
    background: var(--color-bg);
    border: none;
  }

  .menu-item.danger {
    color: var(--color-danger);
  }

  .menu-item.danger:hover {
    background: #fef2f2;
  }

  .diagram-confirm {
    flex-shrink: 0;
    max-width: 280px;
  }
</style>
