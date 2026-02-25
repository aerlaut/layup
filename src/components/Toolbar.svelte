<script lang="ts">
  import { isAtRoot, drillUp, currentDiagram, diagramStore } from '../stores/diagramStore';
  import { exportDiagramJSON, importDiagramJSON, ImportError } from '../utils/persistence';
  import BreadcrumbBar from './BreadcrumbBar.svelte';
  import { get } from 'svelte/store';
  import { loadDiagram } from '../stores/diagramStore';

  export let importError: string | null = null;

  let fileInput: HTMLInputElement;

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

<svelte:window on:keydown={handleKeyDown} />

<div class="toolbar">
  <div class="toolbar-left">
    {#if !$isAtRoot}
      <button class="back-btn" on:click={handleBack} title="Go back (Esc)">
        ← Back
      </button>
    {/if}
    <span class="app-title">vasker</span>
    <BreadcrumbBar />
  </div>

  <div class="toolbar-right">
    <button on:click={handleExport} title="Export diagram as JSON">
      Export JSON
    </button>
    <button on:click={() => fileInput.click()} title="Import diagram from JSON">
      Import JSON
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept=".json,application/json"
      style="display:none"
      on:change={handleImport}
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

  .back-btn {
    background: var(--color-primary);
    color: white;
    border-color: transparent;
    font-weight: 600;
  }

  .back-btn:hover {
    background: var(--color-primary-hover);
    border-color: transparent;
  }
</style>
