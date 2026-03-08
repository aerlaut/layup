<script lang="ts">
  import type { Project } from '../types';
  import { createDiagram, renameProject, deleteProject, importDiagramIntoProject } from '../stores/appStore';
  import { importDiagramJSON, ImportError } from '../utils/persistence';
  import DiagramCard from './DiagramCard.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';

  let { project }: { project: Project } = $props();

  let collapsed = $state(false);
  let showMenu = $state(false);
  let isRenaming = $state(false);
  let renameValue = $state('');
  let showDeleteConfirm = $state(false);
  let renameInput: HTMLInputElement | undefined = $state();

  const diagramList = $derived(
    Object.values(project.diagrams).sort((a, b) => b.updatedAt - a.updatedAt)
  );
  const diagramCount = $derived(diagramList.length);

  function toggleCollapse() {
    if (isRenaming || showDeleteConfirm) return;
    collapsed = !collapsed;
  }

  function handleMenuToggle(e: MouseEvent) {
    e.stopPropagation();
    showMenu = !showMenu;
  }

  function handleRenameStart(e: MouseEvent) {
    e.stopPropagation();
    showMenu = false;
    isRenaming = true;
    renameValue = project.name;
    requestAnimationFrame(() => renameInput?.focus());
  }

  function handleRenameConfirm() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== project.name) {
      renameProject(project.id, trimmed);
    }
    isRenaming = false;
  }

  function handleRenameKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleRenameConfirm();
    if (e.key === 'Escape') { isRenaming = false; }
  }

  function handleDeleteRequest(e: MouseEvent) {
    e.stopPropagation();
    showMenu = false;
    showDeleteConfirm = true;
  }

  function handleDeleteConfirm() {
    deleteProject(project.id);
    showDeleteConfirm = false;
  }

  function handleDeleteCancel() {
    showDeleteConfirm = false;
  }

  function handleNewDiagram(e: MouseEvent) {
    e.stopPropagation();
    createDiagram(project.id);
  }

  let importFileInput: HTMLInputElement | undefined = $state();
  let importError = $state<string | null>(null);

  function handleImportClick(e: MouseEvent) {
    e.stopPropagation();
    importFileInput?.click();
  }

  async function handleImportFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const state = await importDiagramJSON(file);
      const name = file.name.replace(/\.json$/i, '') || 'Imported Diagram';
      importDiagramIntoProject(project.id, name, state);
      importError = null;
    } catch (err) {
      importError = err instanceof ImportError ? err.message : 'Failed to import diagram.';
    }
    (e.target as HTMLInputElement).value = '';
  }

  function handleClickOutsideMenu() {
    if (showMenu) showMenu = false;
  }
</script>

<svelte:window onclick={handleClickOutsideMenu} />

<div class="project-card">
  <div
    class="project-header"
    onclick={toggleCollapse}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Enter' && toggleCollapse()}
  >
    <span class="collapse-icon">{collapsed ? '▸' : '▾'}</span>

    {#if isRenaming}
      <!-- svelte-ignore a11y_autofocus -->
      <input
        bind:this={renameInput}
        class="rename-input"
        type="text"
        bind:value={renameValue}
        onblur={handleRenameConfirm}
        onkeydown={handleRenameKeyDown}
        onclick={(e) => e.stopPropagation()}
      />
    {:else}
      <span class="project-name">{project.name}</span>
    {/if}

    <span class="diagram-count">{diagramCount} diagram{diagramCount !== 1 ? 's' : ''}</span>

    <div class="project-actions">
      <button class="menu-btn" onclick={handleMenuToggle} title="Project actions">⋯</button>
      {#if showMenu}
        <div class="menu-dropdown" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="menu" tabindex="-1">
          <button class="menu-item" onclick={handleRenameStart}>Rename</button>
          <button class="menu-item danger" onclick={handleDeleteRequest}>Delete</button>
        </div>
      {/if}
    </div>
  </div>

  {#if showDeleteConfirm}
    <div class="project-confirm">
      <ConfirmDialog
        message="Delete '{project.name}' and all its diagrams?"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  {/if}

  {#if !collapsed}
    <div class="project-body">
      {#if importError}
        <div class="import-error">{importError}</div>
      {/if}
      <div class="diagram-grid">
        {#each diagramList as diagram (diagram.id)}
          <DiagramCard projectId={project.id} {diagram} />
        {/each}

        <button class="new-diagram-card" onclick={handleNewDiagram}>
          <span class="new-icon">+</span>
          <span class="new-label">New Diagram</span>
        </button>

        <button class="new-diagram-card" onclick={handleImportClick}>
          <span class="new-icon">↑</span>
          <span class="new-label">Import Diagram</span>
        </button>
        <input
          bind:this={importFileInput}
          type="file"
          accept=".json,application/json"
          style="display:none"
          onchange={handleImportFile}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .project-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
  }

  .project-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    cursor: pointer;
    user-select: none;
    border-bottom: 1px solid var(--color-border);
  }

  .project-header:hover {
    background: var(--color-bg);
  }

  .collapse-icon {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    width: 12px;
    flex-shrink: 0;
  }

  .project-name {
    font-weight: 700;
    font-size: 0.95rem;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .rename-input {
    font-weight: 700;
    font-size: 0.95rem;
    padding: 2px 6px;
    flex: 1;
    min-width: 0;
  }

  .diagram-count {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .project-actions {
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
    background: var(--color-danger-bg);
  }

  .project-confirm {
    padding: 8px 16px;
  }

  .import-error {
    margin-bottom: 12px;
    padding: 8px 12px;
    background: var(--color-danger-bg);
    color: var(--color-danger);
    border-radius: var(--border-radius);
    font-size: 0.8rem;
  }

  .project-body {
    padding: 16px;
  }

  .diagram-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }

  .new-diagram-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 20px 16px;
    border: 2px dashed var(--color-border);
    border-radius: var(--border-radius);
    background: transparent;
    cursor: pointer;
    min-height: 80px;
    transition: border-color 0.15s, background 0.15s;
  }

  .new-diagram-card:hover {
    border-color: var(--color-primary);
    background: var(--color-primary-bg-light);
  }

  .new-icon {
    font-size: 1.5rem;
    color: var(--color-text-muted);
    line-height: 1;
  }

  .new-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-muted);
  }
</style>
