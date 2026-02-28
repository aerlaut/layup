<script lang="ts">
  import { fade } from 'svelte/transition';
  import { appView } from '../stores/appStore';
  import { diagramStore, currentDiagram } from '../stores/diagramStore';
  import { isNearStorageLimit } from '../utils/persistence';
  import HomeScreen from '../screens/HomeScreen.svelte';
  import Toolbar from './Toolbar.svelte';
  import ElementPalette from './ElementPalette.svelte';
  import DiagramCanvas from '../canvas/DiagramCanvas.svelte';
  import PropertiesPanel from './PropertiesPanel.svelte';

  let importError: string | null = $state(null);
  let showStorageWarning = $state(false);

  // Check storage usage whenever store changes (only relevant in editor)
  $effect(() => {
    diagramStore.subscribe(() => {
      showStorageWarning = isNearStorageLimit();
    });
  });
</script>

{#if $appView.screen === 'home'}
  <HomeScreen />
{:else}
  <div class="app-shell">
    {#if showStorageWarning}
      <div class="storage-warning">
        Storage is approaching the browser limit (~5 MB). Export your diagram to avoid data loss.
        <button onclick={() => (showStorageWarning = false)}>×</button>
      </div>
    {/if}

    {#if importError}
      <div class="import-error">
        Import failed: {importError}
        <button onclick={() => (importError = null)}>×</button>
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
            <DiagramCanvas />
          </div>
        {/key}
      </div>

      <div class="app-panel">
        <PropertiesPanel />
      </div>
    </div>
  </div>
{/if}

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
    background: var(--color-warning-bg);
    border-bottom: 1px solid var(--color-warning-border);
    color: var(--color-warning-text);
  }

  .import-error {
    background: var(--color-danger-bg);
    border-bottom: 1px solid var(--color-danger-border);
    color: var(--color-danger-text);
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
