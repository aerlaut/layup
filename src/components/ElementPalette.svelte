<script lang="ts">
  import { currentDiagram } from '../stores/diagramStore';
  import type { AnnotationType, C4NodeType, C4LevelType } from '../types';

  type C4PaletteEntry = { kind: 'c4'; type: C4NodeType; label: string; description: string };
  type AnnotationPaletteEntry = { kind: 'annotation'; type: AnnotationType; label: string; description: string };
  type PaletteEntry = C4PaletteEntry | AnnotationPaletteEntry;

  const C4_ENTRIES: C4PaletteEntry[] = [
    { kind: 'c4', type: 'person', label: 'Person', description: 'An internal actor/user' },
    { kind: 'c4', type: 'external-person', label: 'External Person', description: 'An external actor/user' },
    { kind: 'c4', type: 'system', label: 'Software System', description: 'An internal system' },
    { kind: 'c4', type: 'external-system', label: 'External System', description: 'A third-party system' },
    { kind: 'c4', type: 'container', label: 'Container', description: 'App, service, or runtime' },
    { kind: 'c4', type: 'database', label: 'Database', description: 'Data store, file system' },
    { kind: 'c4', type: 'component', label: 'Component', description: 'A grouped set of code' },
    { kind: 'c4', type: 'class', label: 'Class', description: 'A concrete class' },
    { kind: 'c4', type: 'abstract-class', label: 'Abstract Class', description: 'A partial contract' },
    { kind: 'c4', type: 'interface', label: 'Interface', description: 'A pure contract' },
    { kind: 'c4', type: 'enum', label: 'Enum', description: 'Fixed set of named constants' },
    { kind: 'c4', type: 'record', label: 'Record', description: 'Immutable value-holding class' },
    { kind: 'c4', type: 'erd-table', label: 'Table', description: 'Database table entity' },
    { kind: 'c4', type: 'erd-view', label: 'View', description: 'Database view' },
  ];

  /** Annotation entries are always shown regardless of the current diagram level */
  const ANNOTATION_ENTRIES: AnnotationPaletteEntry[] = [
    { kind: 'annotation', type: 'group', label: 'Group', description: 'Visual grouping boundary' },
    { kind: 'annotation', type: 'note', label: 'Note', description: 'Post-it style note' },
    { kind: 'annotation', type: 'package', label: 'Package', description: 'UML namespace / package' },
  ];

  const LEVEL_TYPES: Record<C4LevelType, C4NodeType[]> = {
    context: ['person', 'external-person', 'system', 'external-system'],
    container: ['container', 'database'],
    component: ['component'],
    code: ['class', 'abstract-class', 'interface', 'enum', 'record', 'erd-table', 'erd-view'],
  };

  const currentLevel = $derived($currentDiagram?.level ?? 'context');
  const allowedC4Types = $derived(LEVEL_TYPES[currentLevel] ?? []);
  const c4Entries = $derived(C4_ENTRIES.filter((e) => allowedC4Types.includes(e.type)));

  function handleDragStart(event: DragEvent, entry: PaletteEntry) {
    if (!event.dataTransfer) return;
    if (entry.kind === 'c4') {
      event.dataTransfer.setData('application/c4-node-type', entry.type);
    } else {
      event.dataTransfer.setData('application/annotation-type', entry.type);
    }
    event.dataTransfer.effectAllowed = 'copy';
  }
</script>

<div class="palette">
  <div class="palette-header">C4 Elements</div>
  <div class="palette-list">
    {#each c4Entries as entry (entry.type)}
      <div
        class="palette-item"
        draggable="true"
        ondragstart={(e) => handleDragStart(e, entry)}
        title={entry.description}
        role="button"
        tabindex="0"
      >
        <span class="item-label">{entry.label}</span>
        <span class="item-desc">{entry.description}</span>
      </div>
    {/each}
  </div>

  <div class="palette-header annotations-header">Annotations</div>
  <div class="palette-list">
    {#each ANNOTATION_ENTRIES as entry (entry.type)}
      <div
        class="palette-item annotation-item"
        draggable="true"
        ondragstart={(e) => handleDragStart(e, entry)}
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

  .annotation-item:hover {
    background: #fffbeb;
    border-color: #f59e0b;
  }

  .annotations-header {
    margin-top: 4px;
    border-top: 1px solid var(--color-border);
    padding-top: 12px;
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
