import { describe, it, expect } from 'vitest';
import { computeNodeHeight } from '../../src/stores/diagramStore';
import type { C4Node, ClassMember, TableColumn } from '../../src/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNode(type: C4Node['type'], overrides: Partial<C4Node> = {}): C4Node {
  return { id: '1', type, label: 'Test', position: { x: 0, y: 0 }, ...overrides };
}

function attr(id: string): ClassMember {
  return { id, kind: 'attribute', visibility: '+', name: 'x', type: 'int' };
}

function op(id: string): ClassMember {
  return { id, kind: 'operation', visibility: '+', name: 'f', type: 'void' };
}

function col(id: string): TableColumn {
  return { id, name: 'col', dataType: 'VARCHAR(255)', isNullable: true };
}

// ─── Constants (must match src/utils/constants.ts) ───────────────────────────

const BASE = 52;   // UML_NODE_HEIGHT_BASE
const ROW  = 14;   // UML_MEMBER_ROW_HEIGHT
const OH   = 12;   // UML_COMPARTMENT_OVERHEAD
const DEF  = 80;   // NODE_DEFAULT_HEIGHT

// ─── Plain (non-UML, non-ERD) nodes ─────────────────────────────────────────

describe('computeNodeHeight — plain nodes', () => {
  it('returns NODE_DEFAULT_HEIGHT for system node', () => {
    expect(computeNodeHeight(makeNode('system'))).toBe(DEF);
  });

  it('returns NODE_DEFAULT_HEIGHT for person node', () => {
    expect(computeNodeHeight(makeNode('person'))).toBe(DEF);
  });

  it('returns NODE_DEFAULT_HEIGHT for container node', () => {
    expect(computeNodeHeight(makeNode('container'))).toBe(DEF);
  });
});

// ─── UML class nodes ─────────────────────────────────────────────────────────

describe('computeNodeHeight — UML class nodes', () => {
  it('returns UML_NODE_HEIGHT_BASE for a class with no members', () => {
    expect(computeNodeHeight(makeNode('class', { members: [] }))).toBe(BASE);
  });

  it('returns base height when members array is absent', () => {
    expect(computeNodeHeight(makeNode('class'))).toBe(BASE);
  });

  it('adds one overhead + one row for a single attribute', () => {
    // base(52) + overhead(12) + 1×row(14) = 78
    expect(computeNodeHeight(makeNode('class', { members: [attr('a')] }))).toBe(BASE + OH + ROW);
  });

  it('adds one overhead + one row for a single operation', () => {
    // base(52) + overhead(12) + 1×row(14) = 78
    expect(computeNodeHeight(makeNode('class', { members: [op('b')] }))).toBe(BASE + OH + ROW);
  });

  it('uses separate compartments for attributes and operations', () => {
    // base(52) + overhead(12) + 1 attr row(14) + overhead(12) + 1 op row(14) = 104
    const members = [attr('a'), op('b')];
    expect(computeNodeHeight(makeNode('class', { members }))).toBe(BASE + OH + ROW + OH + ROW);
  });

  it('scales with multiple attributes', () => {
    // base(52) + overhead(12) + 3 attr rows(42) = 106
    const members = [attr('a1'), attr('a2'), attr('a3')];
    expect(computeNodeHeight(makeNode('class', { members }))).toBe(BASE + OH + 3 * ROW);
  });

  it('scales with multiple operations', () => {
    // base(52) + overhead(12) + 2 op rows(28) = 92
    const members = [op('o1'), op('o2')];
    expect(computeNodeHeight(makeNode('class', { members }))).toBe(BASE + OH + 2 * ROW);
  });

  it('treats enum operations as non-existent (enums have no operation compartment)', () => {
    // Enum: only attribute compartment counts; operations ignored
    const members = [attr('a'), op('o')];
    // base(52) + overhead(12) + 1 attr row(14) = 78  (op row omitted)
    expect(computeNodeHeight(makeNode('enum', { members }))).toBe(BASE + OH + ROW);
  });

  it('works for abstract-class node type', () => {
    const members = [attr('a'), op('o')];
    expect(computeNodeHeight(makeNode('abstract-class', { members }))).toBe(BASE + OH + ROW + OH + ROW);
  });

  it('works for interface node type', () => {
    const members = [op('o1'), op('o2')];
    expect(computeNodeHeight(makeNode('interface', { members }))).toBe(BASE + OH + 2 * ROW);
  });
});

// ─── ERD table nodes ─────────────────────────────────────────────────────────

describe('computeNodeHeight — ERD table nodes', () => {
  it('returns UML_NODE_HEIGHT_BASE for a table with no columns', () => {
    expect(computeNodeHeight(makeNode('erd-table', { columns: [] }))).toBe(BASE);
  });

  it('adds one overhead + one row per column', () => {
    // base(52) + overhead(12) + 1×row(14) = 78
    expect(computeNodeHeight(makeNode('erd-table', { columns: [col('c1')] }))).toBe(BASE + OH + ROW);
  });

  it('scales with multiple columns', () => {
    // base(52) + overhead(12) + 3×row(42) = 106
    const columns = [col('c1'), col('c2'), col('c3')];
    expect(computeNodeHeight(makeNode('erd-table', { columns }))).toBe(BASE + OH + 3 * ROW);
  });

  it('works for erd-view node type', () => {
    const columns = [col('c1'), col('c2')];
    // base(52) + overhead(12) + 2×row(28) = 92
    expect(computeNodeHeight(makeNode('erd-view', { columns }))).toBe(BASE + OH + 2 * ROW);
  });
});
