<script lang="ts">
  import { updateNode } from '../../stores/diagramStore';
  import type { ClassMember, MemberVisibility, C4NodeType } from '../../types';
  import { generateId } from '../../utils/id';

  interface Props {
    nodeId: string;
    members: ClassMember[];
    nodeType: C4NodeType;
  }

  const { nodeId, members, nodeType }: Props = $props();

  const isEnumNode = $derived(nodeType === 'enum');
  const isAbstractNode = $derived(nodeType === 'abstract-class' || nodeType === 'interface');

  function updateMembers(updater: (m: ClassMember[]) => ClassMember[]) {
    updateNode(nodeId, { members: updater(members) });
  }

  function addMember(kind: 'attribute' | 'operation') {
    updateMembers((m) => [
      ...m,
      { id: generateId(), kind, visibility: '+', name: kind === 'attribute' ? 'field' : 'method', type: kind === 'attribute' ? 'String' : 'void' },
    ]);
  }

  function updateMember(memberId: string, patch: Partial<ClassMember>) {
    updateMembers((m) => m.map((x) => (x.id === memberId ? { ...x, ...patch } : x)));
  }

  function deleteMember(memberId: string) {
    updateMembers((m) => m.filter((x) => x.id !== memberId));
  }

  function moveMember(memberId: string, dir: -1 | 1) {
    updateMembers((m) => {
      const idx = m.findIndex((x) => x.id === memberId);
      if (idx < 0) return m;
      const next = idx + dir;
      if (next < 0 || next >= m.length) return m;
      const arr = [...m];
      [arr[idx], arr[next]] = [arr[next]!, arr[idx]!];
      return arr;
    });
  }
</script>

<div class="field members-field">
  <span class="field-group-label">{isEnumNode ? 'Literals' : 'Members'}</span>
  <div class="members-list">
    {#each members as member, idx (member.id)}
      <div class="member-row">
        <select class="vis-select" value={member.visibility} title="Visibility"
          onchange={(e) => updateMember(member.id, { visibility: (e.target as HTMLSelectElement).value as MemberVisibility })}>
          <option value="+">+ public</option>
          <option value="-">− private</option>
          <option value="#"># protected</option>
          <option value="~">~ package</option>
        </select>
        <input class="member-name" type="text" value={member.name} placeholder="name"
          oninput={(e) => updateMember(member.id, { name: (e.target as HTMLInputElement).value })} />
        <span class="type-sep">:</span>
        <input class="member-type" type="text" value={member.type ?? ''} placeholder="type"
          oninput={(e) => updateMember(member.id, { type: (e.target as HTMLInputElement).value })} />
        {#if member.kind === 'operation'}
          <input class="member-params" type="text" value={member.params ?? ''} placeholder="(params)"
            oninput={(e) => updateMember(member.id, { params: (e.target as HTMLInputElement).value })} />
        {/if}
        <div class="member-flags">
          <label class="flag-label" title="Static">
            <input type="checkbox" checked={member.isStatic === true}
              onchange={(e) => updateMember(member.id, { isStatic: (e.target as HTMLInputElement).checked })} />
            <span>S</span>
          </label>
          {#if isAbstractNode}
            <label class="flag-label" title="Abstract">
              <input type="checkbox" checked={member.isAbstract === true}
                onchange={(e) => updateMember(member.id, { isAbstract: (e.target as HTMLInputElement).checked })} />
              <span>A</span>
            </label>
          {/if}
        </div>
        <div class="member-actions">
          <button class="icon-btn" onclick={() => moveMember(member.id, -1)} disabled={idx === 0} title="Move up">↑</button>
          <button class="icon-btn" onclick={() => moveMember(member.id, 1)} disabled={idx === members.length - 1} title="Move down">↓</button>
          <button class="icon-btn danger" onclick={() => deleteMember(member.id)} title="Delete">✕</button>
        </div>
      </div>
    {/each}
  </div>
  <div class="add-member-btns">
    {#if !isEnumNode}
      <button class="add-btn" onclick={() => addMember('attribute')}>+ Attribute</button>
      <button class="add-btn" onclick={() => addMember('operation')}>+ Operation</button>
    {:else}
      <button class="add-btn" onclick={() => addMember('attribute')}>+ Literal</button>
    {/if}
  </div>
</div>

<style>
  @import './_editor.css';

  .member-row {
    display: flex;
    align-items: center;
    gap: 3px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    padding: 3px 5px;
    flex-wrap: wrap;
  }

  .vis-select { width: 80px; font-size: 0.7rem; padding: 2px; flex-shrink: 0; }
  .member-name { width: 70px; flex-shrink: 0; font-size: 0.7rem; font-family: 'SF Mono', 'Fira Code', monospace; }
  .member-type { width: 60px; flex-shrink: 0; font-size: 0.7rem; font-family: 'SF Mono', 'Fira Code', monospace; }
  .member-params { width: 70px; flex-shrink: 0; font-size: 0.7rem; font-family: 'SF Mono', 'Fira Code', monospace; }
  .member-flags { display: flex; gap: 4px; margin-left: auto; }
</style>
