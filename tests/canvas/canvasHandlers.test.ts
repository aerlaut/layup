import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  handleConnect,
  handleNodeClick,
  handleDelete,
  makeHandleDblClick,
} from '../../src/canvas/canvasHandlers';
import {
  diagramStore,
  resetDiagram,
  addNode,
  addNodeToDiagram,
  addEdgeToDiagram,
  createChildDiagram,
  drillDown,
  setSelected,
  contextBoundaries,
} from '../../src/stores/diagramStore';
import type { C4Node } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(overrides: Partial<C4Node> = {}): C4Node {
  return {
    id: `n-${Math.random().toString(36).slice(2, 8)}`,
    type: 'system',
    label: 'Node',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function getState() {
  return get(diagramStore);
}

// ─── handleConnect ────────────────────────────────────────────────────────────

describe('handleConnect — root level', () => {
  beforeEach(() => resetDiagram());

  it('creates an edge on the root diagram', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));

    handleConnect({ source: 'n1', target: 'n2', sourceHandle: null, targetHandle: null });

    const edges = getState().diagrams['root']?.edges ?? [];
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('n1');
    expect(edges[0].target).toBe('n2');
  });
});

describe('handleConnect — drilled in, same group', () => {
  beforeEach(() => resetDiagram());

  it('creates an intra-group edge on the current child diagram', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    drillDown('sys1');
    // Add two nodes to the child diagram (now current)
    addNode(makeNode({ id: 'c1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'c2', position: { x: 300, y: 0 } }));

    handleConnect({ source: 'c1', target: 'c2', sourceHandle: null, targetHandle: null });

    const state = getState();
    const currentId = state.navigationStack[state.navigationStack.length - 1]!;
    const childEdges = state.diagrams[currentId]?.edges ?? [];
    expect(childEdges).toHaveLength(1);
    expect(childEdges[0].source).toBe('c1');
    expect(childEdges[0].target).toBe('c2');
    // Parent diagram should have no edges
    const parentEdges = state.diagrams['root']?.edges ?? [];
    expect(parentEdges).toHaveLength(0);
  });
});

describe('handleConnect — drilled in, cross-group', () => {
  beforeEach(() => resetDiagram());

  it('creates a cross-group edge on the parent diagram', async () => {
    // Two sibling systems at root
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sys2', type: 'system', position: { x: 600, y: 0 } }));
    createChildDiagram('sys2'); // ensure sys2 has a child diagram
    drillDown('sys1'); // navigate into sys1's diagram
    const state = getState();
    const sys2ChildId = state.diagrams['root']?.nodes.find((n) => n.id === 'sys2')?.childDiagramId!;

    // Add a node inside sys1 (current group)
    addNode(makeNode({ id: 'c1', position: { x: 0, y: 0 } }));

    // Add a node to sys2's child diagram directly (simulating it being visible)
    addNodeToDiagram(sys2ChildId, makeNode({ id: 'c2', position: { x: 0, y: 0 } }));

    // Confirm contextBoundaries sees both groups
    const boundaries = get(contextBoundaries);
    expect(boundaries.length).toBeGreaterThanOrEqual(2);

    // Connect c1 (in sys1's diagram) to c2 (in sys2's diagram)
    handleConnect({ source: 'c1', target: 'c2', sourceHandle: null, targetHandle: null });

    const parentEdges = getState().diagrams['root']?.edges ?? [];
    expect(parentEdges).toHaveLength(1);
    const edge = parentEdges[0];
    expect(edge.source).toBe('c1');
    expect(edge.target).toBe('c2');
    expect(edge.sourceGroupId).toBeDefined();
    expect(edge.targetGroupId).toBeDefined();
    expect(edge.sourceGroupId).not.toBe(edge.targetGroupId);
  });
});

// ─── handleNodeClick ──────────────────────────────────────────────────────────

describe('handleNodeClick', () => {
  beforeEach(() => resetDiagram());

  it('selects a regular node by id', () => {
    addNode(makeNode({ id: 'n1' }));
    handleNodeClick({ node: { id: 'n1', position: { x: 0, y: 0 }, data: {} } as any, event: new MouseEvent('click') });
    expect(getState().selectedId).toBe('n1');
  });

  it('clicking a boundary node selects the parent node id (without boundary- prefix)', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    handleNodeClick({ node: { id: 'boundary-sys1', position: { x: 0, y: 0 }, data: {} } as any, event: new MouseEvent('click') });
    expect(getState().selectedId).toBe('sys1');
  });

  it('does not produce ctx- node IDs — clicking a sibling node selects it directly', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sys2', type: 'system', position: { x: 600, y: 0 } }));
    createChildDiagram('sys2');
    drillDown('sys1');

    // Simulate clicking a sibling's node by its real id (no ctx- prefix)
    handleNodeClick({ node: { id: 'sys2', position: { x: 0, y: 0 }, data: {} } as any, event: new MouseEvent('click') });
    expect(getState().selectedId).toBe('sys2');
    // No focus switching — no focusedParentNodeId in state
    expect((getState() as any).focusedParentNodeId).toBeUndefined();
  });
});

// ─── handleDelete ─────────────────────────────────────────────────────────────

describe('handleDelete', () => {
  beforeEach(() => resetDiagram());

  it('deletes a node from the current diagram', () => {
    addNode(makeNode({ id: 'n1' }));
    handleDelete({
      nodes: [{ id: 'n1', type: 'system', position: { x: 0, y: 0 }, data: {} } as any],
      edges: [],
    });
    expect(getState().diagrams['root']?.nodes ?? []).toHaveLength(0);
  });

  it('skips boundary- nodes', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    handleDelete({
      nodes: [{ id: 'boundary-sys1', type: 'boundary', position: { x: 0, y: 0 }, data: {} } as any],
      edges: [],
    });
    // sys1 should still exist
    expect(getState().diagrams['root']?.nodes ?? []).toHaveLength(1);
  });

  it('deletes a node from a sibling diagram', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sys2', type: 'system', position: { x: 600, y: 0 } }));
    createChildDiagram('sys2');
    drillDown('sys1');

    const sys2ChildId = getState().diagrams['root']?.nodes.find((n) => n.id === 'sys2')?.childDiagramId!;
    addNodeToDiagram(sys2ChildId, makeNode({ id: 'sibling-node', position: { x: 50, y: 50 } }));
    expect(getState().diagrams[sys2ChildId]?.nodes).toHaveLength(1);

    handleDelete({
      nodes: [{ id: 'sibling-node', type: 'system', position: { x: 0, y: 0 }, data: {} } as any],
      edges: [],
    });

    expect(getState().diagrams[sys2ChildId]?.nodes).toHaveLength(0);
  });

  it('deletes a cross-group edge from the parent diagram', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sys2', type: 'system', position: { x: 600, y: 0 } }));
    createChildDiagram('sys2');
    drillDown('sys1');

    const state = getState();
    const sys1ChildId = state.navigationStack[state.navigationStack.length - 1]!;
    const sys2ChildId = state.diagrams['root']?.nodes.find((n) => n.id === 'sys2')?.childDiagramId!;

    addNodeToDiagram(sys2ChildId, makeNode({ id: 'c2', position: { x: 50, y: 50 } }));
    addNode(makeNode({ id: 'c1', position: { x: 50, y: 50 } }));

    // Store a cross-group edge on the root (parent) diagram
    addEdgeToDiagram('root', {
      id: 'cross-edge',
      source: 'c1',
      target: 'c2',
      sourceGroupId: sys1ChildId,
      targetGroupId: sys2ChildId,
    });
    expect(getState().diagrams['root']?.edges).toHaveLength(1);

    handleDelete({
      nodes: [],
      edges: [{ id: 'cross-edge', source: 'c1', target: 'c2' } as any],
    });

    expect(getState().diagrams['root']?.edges).toHaveLength(0);
  });
});

// ─── makeHandleDblClick — NON_DRILLABLE_TYPES ─────────────────────────────────

/**
 * Helper: build a minimal fake DOM node element and fire a dblclick event
 * through makeHandleDblClick, as if the user double-clicked a canvas node.
 */
function fireDblClickOnNode(
  handler: (e: MouseEvent) => void,
  nodeId: string,
  nodeType: string,
  currentNodes: Array<{ id: string; type: string }>,
): void {
  // Create a fake .svelte-flow__node element with data-id attribute
  const nodeEl = document.createElement('div');
  nodeEl.classList.add('svelte-flow__node');
  nodeEl.setAttribute('data-id', nodeId);
  document.body.appendChild(nodeEl);

  // Create a MouseEvent whose target is inside the fake node element
  const innerEl = document.createElement('span');
  nodeEl.appendChild(innerEl);
  const event = new MouseEvent('dblclick', { bubbles: true });
  Object.defineProperty(event, 'target', { value: innerEl });

  handler(event);
  document.body.removeChild(nodeEl);
}

describe('makeHandleDblClick — non-drillable node types', () => {
  beforeEach(() => resetDiagram());

  const NON_DRILLABLE = [
    'class', 'abstract-class', 'interface', 'enum', 'record',
    'erd-table', 'erd-view',
  ] as const;

  NON_DRILLABLE.forEach((nodeType) => {
    it(`does not drill into "${nodeType}" nodes`, () => {
      addNode(makeNode({ id: `n-${nodeType}`, type: nodeType as any }));
      const stackBefore = getState().navigationStack.slice();

      const handler = makeHandleDblClick(
        () => undefined,
        () => [{ id: `n-${nodeType}`, type: nodeType }],
      );
      fireDblClickOnNode(handler, `n-${nodeType}`, nodeType, [{ id: `n-${nodeType}`, type: nodeType }]);

      expect(getState().navigationStack).toEqual(stackBefore);
    });
  });

  it('does drill into drillable node types (e.g. system)', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    const stackBefore = getState().navigationStack.slice();

    const handler = makeHandleDblClick(
      () => undefined,
      () => [{ id: 'sys1', type: 'system' }],
    );
    fireDblClickOnNode(handler, 'sys1', 'system', [{ id: 'sys1', type: 'system' }]);

    expect(getState().navigationStack.length).toBeGreaterThan(stackBefore.length);
  });
});
