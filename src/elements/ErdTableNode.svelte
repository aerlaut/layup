<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { getColorVariants, NODE_DEFAULT_COLORS } from '../utils/colors';
  import type { C4NodeType, TableColumn } from '../types';

  let {
    type,
    data,
  }: {
    type: C4NodeType;
    data: {
      label: string;
      description?: string;
      childDiagramId?: string;
      color?: string;
      columns?: TableColumn[];
    };
    [key: string]: unknown;
  } = $props();

  const STEREOTYPE_LABELS: Partial<Record<C4NodeType, string>> = {
    'erd-table': '«table»',
    'erd-view': '«view»',
  };

  const stereotype = $derived(STEREOTYPE_LABELS[type] ?? '«table»');
  const colors = $derived(
    getColorVariants(data.color ?? NODE_DEFAULT_COLORS[type] ?? NODE_DEFAULT_COLORS['erd-table']),
  );

  const columns = $derived(data.columns ?? []);
  const hasColumns = $derived(columns.length > 0);

  /**
   * Build the display text for a single column row.
   * Format: [PK] [FK] name : DATA_TYPE [constraints]
   */
  function columnText(col: TableColumn): string {
    const parts: string[] = [];
    if (col.isPrimaryKey) parts.push('PK');
    if (col.isForeignKey) parts.push('FK');
    const prefix = parts.length > 0 ? `[${parts.join(',')}] ` : '    ';
    const nullable = col.isNullable === false ? ' NOT NULL' : '';
    const unique = col.isUnique && !col.isPrimaryKey ? ' UNIQUE' : '';
    return `${prefix}${col.name} : ${col.dataType}${nullable}${unique}`;
  }
</script>

<div class="erd-node" style="background: {colors.bg}; border-color: {colors.primary};">
  <Handle id="top-target" type="target" position={Position.Top} />
  <Handle id="left-target" type="target" position={Position.Left} />
  <Handle id="left-source" type="source" position={Position.Left} />
  <Handle id="right-target" type="target" position={Position.Right} />
  <Handle id="right-source" type="source" position={Position.Right} />

  <!-- Header compartment -->
  <div class="compartment header-compartment" style="border-bottom-color: {colors.primary};">
    <div class="stereotype" style="color: {colors.muted};">{stereotype}</div>
    <div class="node-label" style="color: {colors.text};">{data.label}</div>
    {#if data.description && !hasColumns}
      <div class="node-desc" style="color: {colors.muted};">{data.description}</div>
    {/if}
    {#if data.childDiagramId}
      <div class="drill-indicator" style="color: {colors.primary};" title="Double-click to drill in">▸</div>
    {/if}
  </div>

  <!-- Columns compartment -->
  {#if hasColumns}
    <div class="compartment columns-compartment">
      {#each columns as col (col.id)}
        <div
          class="column-row"
          class:col-pk={col.isPrimaryKey}
          class:col-fk={col.isForeignKey && !col.isPrimaryKey}
          style="color: {col.isPrimaryKey ? colors.primary : colors.text};"
        >{columnText(col)}</div>
      {/each}
    </div>
  {/if}

  <Handle id="bottom-source" type="source" position={Position.Bottom} />
</div>

<style>
  .erd-node {
    border: 2px solid;
    border-radius: 6px;
    text-align: left;
    min-width: 120px;
    position: relative;
    cursor: pointer;
    user-select: none;
    overflow: hidden;
  }

  .compartment {
    padding: 6px 12px;
  }

  .header-compartment {
    text-align: center;
    padding: 8px 14px 10px;
    border-bottom: 1px solid;
  }

  .columns-compartment {
    padding: 4px 10px 6px;
  }

  .stereotype {
    font-size: 0.65rem;
    font-style: italic;
    font-weight: 500;
    margin-bottom: 2px;
    letter-spacing: 0.02em;
  }

  .node-label {
    font-weight: 700;
    font-size: 0.85rem;
  }

  .node-desc {
    font-size: 0.7rem;
    margin-top: 4px;
    text-align: center;
  }

  .column-row {
    font-size: 0.7rem;
    line-height: 1.5;
    white-space: nowrap;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
  }

  .col-pk {
    font-weight: 700;
  }

  .col-fk {
    font-style: italic;
  }

  .drill-indicator {
    position: absolute;
    bottom: 4px;
    right: 6px;
    font-size: 0.7rem;
    opacity: 0.7;
  }
</style>
