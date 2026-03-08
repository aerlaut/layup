<script lang="ts">
  import { updateNode } from '../../stores/diagramStore';
  import type { TableColumn } from '../../types';
  import { generateId } from '../../utils/id';

  interface Props {
    nodeId: string;
    columns: TableColumn[];
  }

  const { nodeId, columns }: Props = $props();

  function updateColumns(updater: (cols: TableColumn[]) => TableColumn[]) {
    updateNode(nodeId, { columns: updater(columns) });
  }

  function addColumn() {
    updateColumns((cols) => [
      ...cols,
      { id: generateId(), name: 'column', dataType: 'VARCHAR(255)', isNullable: true },
    ]);
  }

  function updateColumn(colId: string, patch: Partial<TableColumn>) {
    updateColumns((cols) => cols.map((c) => (c.id === colId ? { ...c, ...patch } : c)));
  }

  function deleteColumn(colId: string) {
    updateColumns((cols) => cols.filter((c) => c.id !== colId));
  }

  function moveColumn(colId: string, dir: -1 | 1) {
    updateColumns((cols) => {
      const idx = cols.findIndex((c) => c.id === colId);
      if (idx < 0) return cols;
      const next = idx + dir;
      if (next < 0 || next >= cols.length) return cols;
      const arr = [...cols];
      [arr[idx], arr[next]] = [arr[next]!, arr[idx]!];
      return arr;
    });
  }
</script>

<div class="field members-field">
  <span class="field-group-label">Columns</span>
  <div class="members-list">
    {#each columns as col, idx (col.id)}
      <div class="column-row-editor">
        <div class="col-row-top">
          <input class="col-name" type="text" value={col.name} placeholder="column_name" title="Column name"
            oninput={(e) => updateColumn(col.id, { name: (e.target as HTMLInputElement).value })} />
          <span class="type-sep">:</span>
          <input class="col-type" type="text" value={col.dataType} placeholder="DATA_TYPE" title="Data type"
            oninput={(e) => updateColumn(col.id, { dataType: (e.target as HTMLInputElement).value })} />
          <div class="member-actions">
            <button class="icon-btn" onclick={() => moveColumn(col.id, -1)} disabled={idx === 0} title="Move up">↑</button>
            <button class="icon-btn" onclick={() => moveColumn(col.id, 1)} disabled={idx === columns.length - 1} title="Move down">↓</button>
            <button class="icon-btn danger" onclick={() => deleteColumn(col.id)} title="Delete column">✕</button>
          </div>
        </div>
        <div class="col-flags">
          <label class="flag-label" title="Primary Key">
            <input type="checkbox" checked={col.isPrimaryKey === true}
              onchange={(e) => updateColumn(col.id, { isPrimaryKey: (e.target as HTMLInputElement).checked })} />
            <span>PK</span>
          </label>
          <label class="flag-label" title="Foreign Key">
            <input type="checkbox" checked={col.isForeignKey === true}
              onchange={(e) => updateColumn(col.id, { isForeignKey: (e.target as HTMLInputElement).checked })} />
            <span>FK</span>
          </label>
          <label class="flag-label" title="Not Null">
            <input type="checkbox" checked={col.isNullable === false}
              onchange={(e) => updateColumn(col.id, { isNullable: !(e.target as HTMLInputElement).checked })} />
            <span>NN</span>
          </label>
          <label class="flag-label" title="Unique">
            <input type="checkbox" checked={col.isUnique === true}
              onchange={(e) => updateColumn(col.id, { isUnique: (e.target as HTMLInputElement).checked })} />
            <span>UQ</span>
          </label>
          <span class="default-label">Default:</span>
          <input class="col-default" type="text" value={col.defaultValue ?? ''} placeholder="—" title="Default value"
            oninput={(e) => updateColumn(col.id, { defaultValue: (e.target as HTMLInputElement).value || undefined })} />
        </div>
      </div>
    {/each}
  </div>
  <div class="add-member-btns">
    <button class="add-btn" onclick={addColumn}>+ Column</button>
  </div>
</div>

<style>
  @import './_editor.css';

  .column-row-editor {
    display: flex;
    flex-direction: column;
    gap: 3px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    padding: 4px 6px;
  }

  .col-row-top { display: flex; align-items: center; gap: 3px; }
  .col-name { width: 90px; flex-shrink: 0; font-size: 0.7rem; font-family: 'SF Mono', 'Fira Code', monospace; }
  .col-type { flex: 1; min-width: 60px; font-size: 0.7rem; font-family: 'SF Mono', 'Fira Code', monospace; }
  .col-flags { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .default-label { font-size: 0.62rem; color: var(--color-text-muted); margin-left: 2px; white-space: nowrap; }
  .col-default { width: 64px; font-size: 0.7rem; font-family: 'SF Mono', 'Fira Code', monospace; }
</style>
