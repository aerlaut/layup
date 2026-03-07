/**
 * Tests for the ERD (Entity-Relationship Diagram) feature at the Code layer:
 *   - TableColumn fields on C4Node (columns array)
 *   - computeNodeHeight for erd-table / erd-view node types
 *   - toFlowNode passes columns in data payload
 *   - NODE_DEFAULT_COLORS has entries for ERD types
 *   - ERD node types are NOT drillable (no child diagram created)
 */

import { get } from 'svelte/store';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  diagramStore,
  addNode,
  addAnnotation,
  updateNodeInDiagram,
  resetDiagram,
  getCurrentDiagram,
  drillDown,
  computeNodeHeight,
} from '../../src/stores/diagramStore';
import { toFlowNode } from '../../src/canvas/flowSync';
import { NODE_DEFAULT_COLORS } from '../../src/utils/colors';
import {
  UML_NODE_HEIGHT_BASE,
  UML_MEMBER_ROW_HEIGHT,
  UML_COMPARTMENT_OVERHEAD,
  NODE_DEFAULT_HEIGHT,
} from '../../src/utils/constants';
import type { C4Node, TableColumn } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeErdNode(overrides: Partial<C4Node> = {}): C4Node {
  return {
    id: `erd-${Math.random().toString(36).slice(2, 8)}`,
    type: 'erd-table',
    label: 'users',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function makeColumn(overrides: Partial<TableColumn> = {}): TableColumn {
  return {
    id: `col-${Math.random().toString(36).slice(2, 8)}`,
    name: 'id',
    dataType: 'INT',
    ...overrides,
  };
}

function getState() {
  return get(diagramStore);
}

function getRootNodes(): C4Node[] {
  return getCurrentDiagram(getState()).nodes;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetDiagram();
});

// ─── TableColumn persistence on C4Node ────────────────────────────────────────

describe('TableColumn — node.columns field', () => {
  it('erd-table node added without columns has undefined columns', () => {
    const node = makeErdNode();
    addNode(node);
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored).toBeDefined();
    expect(stored!.columns).toBeUndefined();
  });

  it('erd-table node added with columns persists all fields', () => {
    const columns: TableColumn[] = [
      { id: 'c1', name: 'id', dataType: 'INT', isPrimaryKey: true, isNullable: false },
      { id: 'c2', name: 'email', dataType: 'VARCHAR(255)', isUnique: true, isNullable: false },
      { id: 'c3', name: 'created_at', dataType: 'TIMESTAMP', isNullable: true, defaultValue: 'NOW()' },
    ];
    const node = makeErdNode({ columns });
    addNode(node);
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.columns).toHaveLength(3);
    expect(stored!.columns![0]).toEqual(columns[0]);
    expect(stored!.columns![1]).toEqual(columns[1]);
    expect(stored!.columns![2]).toEqual(columns[2]);
  });

  it('isForeignKey flag persists on a column', () => {
    const columns: TableColumn[] = [
      { id: 'c1', name: 'user_id', dataType: 'INT', isForeignKey: true, isNullable: false },
    ];
    const node = makeErdNode({ columns });
    addNode(node);
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.columns![0]!.isForeignKey).toBe(true);
  });

  it('isUnique flag persists on a column', () => {
    const columns: TableColumn[] = [
      { id: 'c1', name: 'slug', dataType: 'VARCHAR(100)', isUnique: true },
    ];
    const node = makeErdNode({ columns });
    addNode(node);
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.columns![0]!.isUnique).toBe(true);
  });

  it('defaultValue persists on a column', () => {
    const columns: TableColumn[] = [
      { id: 'c1', name: 'status', dataType: 'VARCHAR(20)', defaultValue: 'active' },
    ];
    const node = makeErdNode({ columns });
    addNode(node);
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.columns![0]!.defaultValue).toBe('active');
  });

  it('updateNodeInDiagram replaces columns array', () => {
    const node = makeErdNode({
      columns: [{ id: 'c1', name: 'old_col', dataType: 'INT' }],
    });
    addNode(node);
    const newColumns: TableColumn[] = [
      { id: 'c2', name: 'new_col', dataType: 'VARCHAR(50)', isPrimaryKey: true },
      { id: 'c3', name: 'another_col', dataType: 'BOOLEAN', isNullable: false },
    ];
    updateNodeInDiagram('root', node.id, { columns: newColumns });
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.columns).toHaveLength(2);
    expect(stored!.columns![0]!.name).toBe('new_col');
    expect(stored!.columns![1]!.name).toBe('another_col');
  });

  it('updateNodeInDiagram can clear columns with empty array', () => {
    const node = makeErdNode({
      columns: [{ id: 'c1', name: 'id', dataType: 'INT' }],
    });
    addNode(node);
    updateNodeInDiagram('root', node.id, { columns: [] });
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.columns).toHaveLength(0);
  });

  it('columns survive unrelated label update', () => {
    const columns: TableColumn[] = [
      { id: 'c1', name: 'id', dataType: 'INT', isPrimaryKey: true },
    ];
    const node = makeErdNode({ columns });
    addNode(node);
    updateNodeInDiagram('root', node.id, { label: 'accounts' });
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.label).toBe('accounts');
    expect(stored!.columns).toHaveLength(1);
    expect(stored!.columns![0]!.isPrimaryKey).toBe(true);
  });

  it('erd-view node also supports columns array', () => {
    const columns: TableColumn[] = [
      { id: 'c1', name: 'user_name', dataType: 'VARCHAR(100)' },
      { id: 'c2', name: 'email', dataType: 'VARCHAR(255)' },
    ];
    const node = makeErdNode({ type: 'erd-view', label: 'active_users', columns });
    addNode(node);
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.type).toBe('erd-view');
    expect(stored!.columns).toHaveLength(2);
  });
});

// ─── computeNodeHeight for ERD nodes ─────────────────────────────────────────

describe('computeNodeHeight — erd-table and erd-view', () => {
  it('erd-table with no columns returns UML_NODE_HEIGHT_BASE', () => {
    const node = makeErdNode();
    expect(computeNodeHeight(node)).toBe(UML_NODE_HEIGHT_BASE);
  });

  it('erd-table with columns grows by UML_COMPARTMENT_OVERHEAD + n * UML_MEMBER_ROW_HEIGHT', () => {
    const columns: TableColumn[] = [
      makeColumn({ id: 'c1' }),
      makeColumn({ id: 'c2' }),
      makeColumn({ id: 'c3' }),
    ];
    const node = makeErdNode({ columns });
    const expected = UML_NODE_HEIGHT_BASE + UML_COMPARTMENT_OVERHEAD + 3 * UML_MEMBER_ROW_HEIGHT;
    expect(computeNodeHeight(node)).toBe(expected);
  });

  it('erd-table with a single column adds one row overhead', () => {
    const node = makeErdNode({ columns: [makeColumn()] });
    const expected = UML_NODE_HEIGHT_BASE + UML_COMPARTMENT_OVERHEAD + UML_MEMBER_ROW_HEIGHT;
    expect(computeNodeHeight(node)).toBe(expected);
  });

  it('erd-view height is computed the same as erd-table', () => {
    const columns = [makeColumn({ id: 'c1' }), makeColumn({ id: 'c2' })];
    const tableNode = makeErdNode({ type: 'erd-table', columns });
    const viewNode = makeErdNode({ type: 'erd-view', columns });
    expect(computeNodeHeight(tableNode)).toBe(computeNodeHeight(viewNode));
  });

  it('non-ERD non-UML node types return NODE_DEFAULT_HEIGHT', () => {
    const systemNode: C4Node = { id: 'sys1', type: 'system', label: 'Sys', position: { x: 0, y: 0 } };
    expect(computeNodeHeight(systemNode)).toBe(NODE_DEFAULT_HEIGHT);
  });
});

// ─── toFlowNode passes columns in data ───────────────────────────────────────

describe('toFlowNode — ERD columns in data payload', () => {
  it('toFlowNode includes columns in data for erd-table', () => {
    const columns: TableColumn[] = [
      { id: 'c1', name: 'id', dataType: 'INT', isPrimaryKey: true },
    ];
    const node = makeErdNode({ columns });
    const flowNode = toFlowNode(node, null);
    expect((flowNode.data as Record<string, unknown>).columns).toEqual(columns);
  });

  it('toFlowNode includes undefined columns when not set', () => {
    const node = makeErdNode(); // no columns
    const flowNode = toFlowNode(node, null);
    expect((flowNode.data as Record<string, unknown>).columns).toBeUndefined();
  });
});

// ─── Color defaults ───────────────────────────────────────────────────────────

describe('NODE_DEFAULT_COLORS — ERD node types', () => {
  it('has a valid hex color for erd-table', () => {
    const color = NODE_DEFAULT_COLORS['erd-table'];
    expect(color).toBeDefined();
    expect(color).toMatch(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/);
  });

  it('has a valid hex color for erd-view', () => {
    const color = NODE_DEFAULT_COLORS['erd-view'];
    expect(color).toBeDefined();
    expect(color).toMatch(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/);
  });

  it('erd-table and erd-view have distinct default colors', () => {
    expect(NODE_DEFAULT_COLORS['erd-table']).not.toBe(NODE_DEFAULT_COLORS['erd-view']);
  });
});

// ─── ERD types are not drillable ─────────────────────────────────────────────

describe('drillDown — ERD nodes are not drillable', () => {
  it('drilling into erd-table does not navigate or create a child diagram', () => {
    const node = makeErdNode({ id: 'tbl1' });
    addNode(node);
    const stackBefore = getState().navigationStack.slice();
    drillDown('tbl1');
    const state = getState();
    // Navigation stack must be unchanged
    expect(state.navigationStack).toEqual(stackBefore);
    // No childDiagramId should have been set on the node
    const tblNode = state.diagrams['root']!.nodes.find((n) => n.id === 'tbl1');
    expect(tblNode?.childDiagramId).toBeUndefined();
  });

  it('drilling into erd-view does not navigate or create a child diagram', () => {
    const node = makeErdNode({ id: 'view1', type: 'erd-view' });
    addNode(node);
    const stackBefore = getState().navigationStack.slice();
    drillDown('view1');
    const state = getState();
    expect(state.navigationStack).toEqual(stackBefore);
    const viewNode = state.diagrams['root']!.nodes.find((n) => n.id === 'view1');
    expect(viewNode?.childDiagramId).toBeUndefined();
  });
});
