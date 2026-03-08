<script lang="ts">
  import { updateAnnotation, diagramStore } from '../stores/diagramStore';
  import { ANNOTATION_DEFAULT_COLORS } from '../utils/colors';
  import { get } from 'svelte/store';

  let {
    id,
    data,
  }: {
    id: string;
    data: { label: string; text?: string; color?: string };
    [key: string]: unknown;
  } = $props();

  const bg = $derived(data.color ?? ANNOTATION_DEFAULT_COLORS['note']);

  /** Darken a hex color slightly for the folded-corner shadow effect */
  function darken(hex: string): string {
    const h = hex.replace('#', '');
    const full = h.length === 3
      ? h.split('').map((c) => c + c).join('')
      : h;
    const num = parseInt(full, 16);
    const r = Math.max(0, ((num >> 16) & 255) - 40);
    const g = Math.max(0, ((num >> 8) & 255) - 40);
    const b = Math.max(0, (num & 255) - 40);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  let editingLabel = $state(false);
  let editingText = $state(false);
  let labelValue = $state('');
  let textValue = $state('');
  let labelInputEl = $state<HTMLInputElement | undefined>(undefined);
  let textareaEl = $state<HTMLTextAreaElement | undefined>(undefined);

  function startEditLabel(e: MouseEvent) {
    e.stopPropagation();
    editingLabel = true;
    labelValue = data.label;
    setTimeout(() => labelInputEl?.select(), 0);
  }

  function commitLabel() {
    if (editingLabel && labelValue.trim()) {
      updateAnnotation(get(diagramStore).currentLevel, id, { label: labelValue.trim() });
    }
    editingLabel = false;
  }

  function handleLabelKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') commitLabel();
    if (e.key === 'Escape') editingLabel = false;
  }

  function startEditText(e: MouseEvent) {
    e.stopPropagation();
    editingText = true;
    textValue = data.text ?? '';
    setTimeout(() => {
      textareaEl?.focus();
      textareaEl?.select();
    }, 0);
  }

  function commitText() {
    if (editingText) {
      updateAnnotation(get(diagramStore).currentLevel, id, { text: textValue });
    }
    editingText = false;
  }

  function handleTextKeyDown(e: KeyboardEvent) {
    // Shift+Enter inserts a newline; plain Enter commits
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitText();
    }
    if (e.key === 'Escape') editingText = false;
  }
</script>

<div
  class="note-node"
  style="background: {bg};"
  role="note"
>
  <!-- Folded corner decoration -->
  <div
    class="corner-fold"
    style="border-color: transparent transparent {darken(bg)} transparent;"
  ></div>

  <!-- Label / title row -->
  <div class="note-label-row">
    {#if editingLabel}
      <input
        bind:this={labelInputEl}
        class="note-label-input"
        bind:value={labelValue}
        onblur={commitLabel}
        onkeydown={handleLabelKeyDown}
        onclick={(e) => e.stopPropagation()}
      />
    {:else}
      <span
        class="note-label nodrag"
        ondblclick={startEditLabel}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') startEditLabel(e as unknown as MouseEvent); }}
        title="Double-click to edit title"
      >{data.label}</span>
    {/if}
  </div>

  <!-- Body text -->
  <div class="note-body">
    {#if editingText}
      <textarea
        bind:this={textareaEl}
        class="note-textarea nodrag"
        bind:value={textValue}
        onblur={commitText}
        onkeydown={handleTextKeyDown}
        onclick={(e) => e.stopPropagation()}
        placeholder="Add a note…"
        rows="4"
      ></textarea>
    {:else}
      <div
        class="note-text nodrag"
        ondblclick={startEditText}
        role="button"
        tabindex="0"
        onkeydown={(e) => { if (e.key === 'Enter') startEditText(e as unknown as MouseEvent); }}
        title="Double-click to edit text"
      >{data.text || 'Double-click to add text…'}</div>
    {/if}
  </div>
</div>

<style>
  .note-node {
    position: relative;
    min-width: 160px;
    max-width: 220px;
    padding: 10px 24px 12px 12px; /* right padding leaves room for the folded corner */
    border-radius: 2px 0 2px 2px;
    box-shadow: 2px 3px 8px rgba(0, 0, 0, 0.18);
    cursor: pointer;
    user-select: none;
    transform: rotate(-1deg);
  }

  /* Folded top-right corner */
  .corner-fold {
    position: absolute;
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 18px 18px 0;
    opacity: 0.45;
  }

  .note-label-row {
    margin-bottom: 6px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    padding-bottom: 4px;
  }

  .note-label {
    font-size: 0.75rem;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.75);
    cursor: text;
  }

  .note-label-input {
    font-size: 0.75rem;
    font-weight: 700;
    background: transparent;
    border: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.35);
    outline: none;
    padding: 0;
    width: 100%;
    color: rgba(0, 0, 0, 0.75);
  }

  .note-body {
    min-height: 40px;
  }

  .note-text {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.65);
    line-height: 1.5;
    margin: 0;
    white-space: pre-wrap;
    cursor: text;
  }

  .note-textarea {
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.75);
    line-height: 1.5;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    width: 100%;
    padding: 0;
    font-family: inherit;
  }
</style>
