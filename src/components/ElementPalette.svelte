<script lang="ts">
  import { currentDiagram } from '../stores/diagramStore';
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

  const currentLevel = $derived($currentDiagram?.level ?? 'context');
  const allowedTypes = $derived(LEVEL_TYPES[currentLevel] ?? []);
  const entries = $derived(ALL_ENTRIES.filter((e) => allowedTypes.includes(e.type)));

  function handleDragStart(event: DragEvent, type: C4NodeType) {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('application/c4-node-type', type);
    event.dataTransfer.effectAllowed = 'copy';
  }
</script>

<div class="palette">
  <div class="palette-header">Elements</div>
  <div class="palette-list">
    {#each entries as entry (entry.type)}
      <div
        class="palette-item"
        draggable="true"
        ondragstart={(e) => handleDragStart(e, entry.type)}
        title={entry.description}
        role="button"
        tabindex="0"
      >
        <span class="item-label">{entry.label}</span>
        <span class="item-desc">{entry.description}</span>
      </div>
    {/each}
  </div>
  <div class="drag-hint">Drag onto canvas to place</div>
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
    cursor: grab;
    user-select: none;
  }

  .palette-item:hover {
    background: var(--color-primary-bg-light);
    border-color: var(--color-primary);
  }

  .palette-item:active {
    cursor: grabbing;
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

  .drag-hint {
    margin: 8px;
    padding: 8px;
    background: var(--color-hint-bg);
    border-radius: var(--border-radius);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-align: center;
  }
</style>
