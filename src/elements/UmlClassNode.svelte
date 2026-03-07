<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { getColorVariants, NODE_DEFAULT_COLORS } from '../utils/colors';
  import type { C4NodeType, ClassMember } from '../types';

  let {
    type,
    data,
  }: {
    type: C4NodeType;
    data: {
      label: string;
      description?: string;
      technology?: string;
      color?: string;
      members?: ClassMember[];
    };
    [key: string]: unknown;
  } = $props();

  /** UML stereotype label shown above the class name */
  const STEREOTYPE_LABELS: Partial<Record<C4NodeType, string>> = {
    'abstract-class': '«abstract»',
    interface: '«interface»',
    enum: '«enum»',
    record: '«record»',
  };

  const stereotype = $derived(STEREOTYPE_LABELS[type] ?? null);
  const colors = $derived(
    getColorVariants(data.color ?? NODE_DEFAULT_COLORS[type] ?? NODE_DEFAULT_COLORS.class),
  );

  const isAbstractClass = $derived(type === 'abstract-class');
  const isEnum = $derived(type === 'enum');
  const isInterface = $derived(type === 'interface');

  const members = $derived(data.members ?? []);
  const attributes = $derived(members.filter((m) => m.kind === 'attribute'));
  const operations = $derived(members.filter((m) => m.kind === 'operation'));

  const hasAttributes = $derived(attributes.length > 0);
  // Enums never show an operations compartment
  const hasOperations = $derived(!isEnum && operations.length > 0);
  const showCompartments = $derived(hasAttributes || hasOperations);

  /** Label for the attributes compartment — "Literals" for enums */
  const attributeCompartmentLabel = $derived(isEnum ? 'Literals' : null);

  function memberText(m: ClassMember): string {
    const vis = m.visibility;
    const params = m.kind === 'operation' ? (m.params ?? '()') : '';
    const typePart = m.type ? `: ${m.type}` : '';
    return `${vis} ${m.name}${params}${typePart}`;
  }

  function memberIsAbstract(m: ClassMember): boolean {
    // Interface members are all implicitly abstract
    return isInterface || (m.isAbstract === true);
  }
</script>

<div class="uml-node" style="background: {colors.bg}; border-color: {colors.primary};">
  <Handle id="top-target" type="target" position={Position.Top} />
  <Handle id="left-target" type="target" position={Position.Left} />
  <Handle id="left-source" type="source" position={Position.Left} />
  <Handle id="right-target" type="target" position={Position.Right} />
  <Handle id="right-source" type="source" position={Position.Right} />

  <!-- Header compartment -->
  <div class="compartment header-compartment">
    {#if stereotype}
      <div class="stereotype" style="color: {colors.muted};">{stereotype}</div>
    {/if}
    <div
      class="node-label"
      class:abstract-name={isAbstractClass}
      style="color: {colors.text};"
    >{data.label}</div>
    {#if data.technology}
      <div class="tech-badge" style="background: {colors.badge}; color: {colors.text};">{data.technology}</div>
    {/if}
    {#if data.description && !showCompartments}
      <div class="node-desc" style="color: {colors.muted};">{data.description}</div>
    {/if}
  </div>

  <!-- Attributes / Literals compartment -->
  {#if hasAttributes}
    <div class="compartment members-compartment" style="border-top-color: {colors.primary};">
      {#if attributeCompartmentLabel}
        <div class="compartment-label" style="color: {colors.muted};">{attributeCompartmentLabel}</div>
      {/if}
      {#each attributes as member (member.id)}
        <div
          class="member-row"
          class:member-static={member.isStatic}
          class:member-abstract={memberIsAbstract(member)}
          style="color: {colors.text};"
        >{memberText(member)}</div>
      {/each}
    </div>
  {/if}

  <!-- Operations compartment -->
  {#if hasOperations}
    <div class="compartment members-compartment" style="border-top-color: {colors.primary};">
      {#each operations as member (member.id)}
        <div
          class="member-row"
          class:member-static={member.isStatic}
          class:member-abstract={memberIsAbstract(member)}
          style="color: {colors.text};"
        >{memberText(member)}</div>
      {/each}
    </div>
  {/if}

  <Handle id="bottom-source" type="source" position={Position.Bottom} />
</div>

<style>
  .uml-node {
    border: 2px solid;
    border-radius: 6px;
    text-align: left;
    min-width: 160px;
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
  }

  .members-compartment {
    border-top: 1px solid;
    text-align: left;
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

  .abstract-name {
    font-style: italic;
  }

  .tech-badge {
    display: inline-block;
    font-size: 0.65rem;
    padding: 1px 6px;
    border-radius: 10px;
    margin-top: 4px;
    font-style: italic;
  }

  .node-desc {
    font-size: 0.7rem;
    margin-top: 4px;
    text-align: center;
  }

  .compartment-label {
    font-size: 0.6rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 2px;
  }

  .member-row {
    font-size: 0.7rem;
    line-height: 1.5;
    white-space: nowrap;
    font-family: 'SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', monospace;
  }

  .member-static {
    text-decoration: underline;
  }

  .member-abstract {
    font-style: italic;
  }


</style>
