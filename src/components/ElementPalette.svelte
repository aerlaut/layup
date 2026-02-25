<script lang="ts">
  import { currentDiagram, setPendingNodeType, pendingNodeType } from '../stores/diagramStore';
  import type { C4NodeType, C4LevelType } from '../types';

  type PaletteEntry = {
    type: C4NodeType;
    label: string;
    description: string;
  };

  const ALL_ENTRIES: PaletteEntry[] = [
    { type: 'person', label: 'Person', description: 'An actor/user' },
    { type: 'system', label: 'Software System', description: 'A system boundary' },
    { type: 'container', label: 'Container', description: 'App, service, DB' },
    { type: 'component', label: 'Component', description: 'A grouped set of code' },
    { type: 'code-element', label: 'Code Element', description: 'Class, function, etc.' },
  ];

  const LEVEL_TYPES: Record<C4LevelType, C4NodeType[]> = {
    context: ['person', 'system'],
    container: ['container'],
    component: ['component'],
    code: ['code-element'],
  };

  $: currentLevel = $currentDiagram?.level ?? 'context';
  $: allowedTypes = LEVEL_TYPES[currentLevel] ?? [];
  $: entries = ALL_ENTRIES.filter((e) => allowedTypes.includes(e.type));

  function handlePaletteClick(type: C4NodeType) {
    if ($pendingNodeType === type) {
      setPendingNodeType(null); // toggle off
    } else {
      setPendingNodeType(type);
    }
  }
</script>

<div class="palette">
  <div class="palette-header">Elements</div>
  <div class="palette-list">
    {#each entries as entry (entry.type)}
      <button
        class="palette-item"
        class:active={$pendingNodeType === entry.type}
        on:click={() => handlePaletteClick(entry.type)}
        title={entry.description}
      >
        <span class="item-label">{entry.label}</span>
        <span class="item-desc">{entry.description}</span>
      </button>
    {/each}
  </div>
  {#if $pendingNodeType}
    <div class="pending-hint">Click on the canvas to place</div>
  {/if}
</div>

<style>
  .palette {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .palette-header {
    padding: 12px 16px;
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
  }

  .palette-list {
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }

  .palette-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 8px 12px;
    border-radius: var(--border-radius);
    text-align: left;
    gap: 2px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    width: 100%;
  }

  .palette-item:hover, .palette-item.active {
    background: #eff6ff;
    border-color: var(--color-primary);
  }

  .palette-item.active {
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  .item-label {
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--color-text);
  }

  .item-desc {
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  .pending-hint {
    margin: 8px;
    padding: 8px;
    background: #eff6ff;
    border-radius: var(--border-radius);
    font-size: 0.75rem;
    color: var(--color-primary);
    text-align: center;
  }
</style>
