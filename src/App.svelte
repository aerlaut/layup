<script lang="ts">
  import { fade } from 'svelte/transition';
  import Toolbar from './components/Toolbar.svelte';
  import DiagramCanvas from './canvas/DiagramCanvas.svelte';
  import ElementPalette from './components/ElementPalette.svelte';
  import PropertiesPanel from './components/PropertiesPanel.svelte';
  import {
    diagramStore,
    currentDiagram,
    pendingNodeType,
    addNode,
    setPendingNodeType,
  } from './stores/diagramStore';
  import { isNearStorageLimit } from './utils/persistence';
  import type { C4Node, C4NodeType } from './types';

  let importError: string | null = null;
  let showStorageWarning = false;

  // Check storage usage whenever store changes
  diagramStore.subscribe(() => {
    showStorageWarning = isNearStorageLimit();
  });

  function dismissImportError() {
    importError = null;
  }

  // Handle canvas placement: when a node type is pending and canvas is clicked,
  // we need to know the viewport position. DiagramCanvas handles the pane click
  // event but we need to route it here to actually add the node.
  // We use a custom event dispatched from DiagramCanvas for placement.
  function handleCanvasPlace(event: CustomEvent<{ x: number; y: number }>) {
    const pending = $pendingNodeType;
    if (!pending) return;
    const newNode: C4Node = {
      id: `node-${Date.now()}`,
      type: pending,
      label: defaultLabel(pending),
      description: '',
      technology: '',
      position: event.detail,
    };
    addNode(newNode);
  }

  function defaultLabel(type: C4NodeType): string {
    const labels: Record<C4NodeType, string> = {
      person: 'Person',
      system: 'Software System',
      container: 'Container',
      component: 'Component',
      'code-element': 'Code Element',
    };
    return labels[type];
  }
</script>

<div class="app-shell">
  {#if showStorageWarning}
    <div class="storage-warning">
      Storage is approaching the browser limit (~5 MB). Export your diagram to avoid data loss.
      <button on:click={() => (showStorageWarning = false)}>×</button>
    </div>
  {/if}

  {#if importError}
    <div class="import-error">
      Import failed: {importError}
      <button on:click={dismissImportError}>×</button>
    </div>
  {/if}

  <div class="app-toolbar">
    <Toolbar bind:importError />
  </div>

  <div class="app-body">
    <div class="app-palette">
      <ElementPalette />
    </div>

    <div class="app-canvas">
      {#key $currentDiagram?.id}
        <div class="canvas-fade" in:fade={{ duration: 150 }}>
          <DiagramCanvas on:place={handleCanvasPlace} />
        </div>
      {/key}
    </div>

    <div class="app-panel">
      <PropertiesPanel />
    </div>
  </div>
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }

  .storage-warning,
  .import-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .storage-warning {
    background: #fffbeb;
    border-bottom: 1px solid #f59e0b;
    color: #92400e;
  }

  .import-error {
    background: #fef2f2;
    border-bottom: 1px solid #ef4444;
    color: #991b1b;
  }

  .storage-warning button,
  .import-error button {
    border: none;
    background: none;
    font-size: 1rem;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    opacity: 0.7;
  }

  .app-toolbar {
    height: var(--toolbar-height);
    flex-shrink: 0;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm);
  }

  .app-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .app-palette {
    width: var(--palette-width);
    flex-shrink: 0;
    background: var(--color-surface);
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
  }

  .app-canvas {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .canvas-fade {
    position: absolute;
    inset: 0;
  }

  .app-panel {
    width: var(--panel-width);
    flex-shrink: 0;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    overflow-y: auto;
  }
</style>
