<script lang="ts">
  import { isAtRoot, drillUp, diagramStore } from '../stores/diagramStore';
  import { goHome, activeProject, activeDiagram } from '../stores/appStore';
  import { exportDiagramJSON, importDiagramJSON, ImportError } from '../utils/persistence';
  import BreadcrumbBar from './BreadcrumbBar.svelte';
  import { get } from 'svelte/store';
  import { loadDiagram } from '../stores/diagramStore';

  let { importError = $bindable<string | null>(null) }: { importError?: string | null } = $props();

  let fileInput: HTMLInputElement | undefined = $state();

  function handleHome() {
    goHome();
  }

  function handleExport() {
    exportDiagramJSON(get(diagramStore));
  }

  async function handleImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const state = await importDiagramJSON(file);
      loadDiagram(state);
      importError = null;
    } catch (err) {
      importError = err instanceof ImportError ? err.message : 'Failed to import diagram.';
    }
    // Reset file input so the same file can be re-imported
    (e.target as HTMLInputElement).value = '';
  }

  function handleBack() {
    drillUp();
  }

  // Escape key to drill up
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !$isAtRoot) {
      drillUp();
    }
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="toolbar">
  <div class="toolbar-left">
    <button class="home-btn" onclick={handleHome} title="Back to projects">
      ← Home
    </button>
    {#if !$isAtRoot}
      <button class="back-btn" onclick={handleBack} title="Go back (Esc)">
        ↑ Up
      </button>
    {/if}
    <span class="app-title">laverop</span>
    {#if $activeProject}
      <span class="context-sep">›</span>
      <span class="context-label project-label" title={$activeProject.name}>{$activeProject.name}</span>
    {/if}
    {#if $activeDiagram}
      <span class="context-sep">›</span>
      <span class="context-label diagram-label" title={$activeDiagram.name}>{$activeDiagram.name}</span>
    {/if}
    <BreadcrumbBar />
  </div>

  <div class="toolbar-right">
    <button onclick={handleExport} title="Export diagram as JSON">
      Export JSON
    </button>
    <button onclick={() => fileInput?.click()} title="Import diagram from JSON">
      Import JSON
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".json,application/json"
      style="display:none"
      onchange={handleImport}
    />
  </div>
</div>

<style>
  .toolbar {
    height: var(--toolbar-height);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    gap: 12px;
    overflow: hidden;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .app-title {
    font-weight: 800;
    font-size: 1rem;
    color: var(--color-primary);
    letter-spacing: -0.02em;
    flex-shrink: 0;
  }

  .home-btn {
    background: var(--color-surface);
    color: var(--color-text);
    font-weight: 600;
    flex-shrink: 0;
  }

  .home-btn:hover {
    background: var(--color-bg);
    border-color: var(--color-primary);
  }

  .back-btn {
    background: var(--color-primary);
    color: white;
    border-color: transparent;
    font-weight: 600;
    flex-shrink: 0;
  }

  .back-btn:hover {
    background: var(--color-primary-hover);
    border-color: transparent;
  }

  .context-sep {
    color: var(--color-border);
    font-size: 0.9rem;
    user-select: none;
    flex-shrink: 0;
  }

  .context-label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
    flex-shrink: 0;
  }

  .project-label {
    font-weight: 600;
  }

  .diagram-label {
    font-weight: 500;
  }
</style>
