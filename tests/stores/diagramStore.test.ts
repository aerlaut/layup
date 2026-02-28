import { get } from 'svelte/store';
import {
  diagramStore,
  SCHEMA_VERSION,
  getCurrentDiagram,
  getDiagramById,
  getBreadcrumbPath,
  currentDiagram,
  breadcrumbs,
  selectedId,
  pendingNodeType,
  isAtRoot,
  addNode,
  addNodeToDiagram,
  updateNode,
  deleteNode,
  addEdge,
  addEdgeToDiagram,
  updateEdge,
  deleteEdge,
  drillDown,
  drillUp,
  navigateTo,
  createChildDiagram,
  setSelected,
  setPendingNodeType,
  updateNodePositions,
  updateNodePositionsInDiagram,
  updateNodeInDiagram,
  updateEdgeInDiagram,
  deleteNodeFromDiagram,
  deleteEdgeFromDiagram,
  loadDiagram,
  resetDiagram,
} from '../../src/stores/diagramStore';
import type { C4Node, C4Edge, DiagramState } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(overrides: Partial<C4Node> = {}): C4Node {
  return {
    id: `node-${Math.random().toString(36).slice(2, 8)}`,
    type: 'system',
    label: 'Test Node',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function makeEdge(overrides: Partial<C4Edge> & { source: string; target: string }): C4Edge {
  return {
    id: `edge-${Math.random().toString(36).slice(2, 8)}`,
    ...overrides,
  };
}

function getState(): DiagramState {
  return get(diagramStore);
}

/** Returns the childDiagramId of a node in the root diagram, asserting it exists. */
function getChildDiagramId(nodeId: string): string {
  const node = getState().diagrams['root'].nodes.find((n) => n.id === nodeId);
  if (!node?.childDiagramId) throw new Error(`Node ${nodeId} has no childDiagramId`);
  return node.childDiagramId;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetDiagram();
});

// ── Selectors ─────────────────────────────────────────────────────────────────

describe('getCurrentDiagram', () => {
  it('returns the root diagram initially', () => {
    const state = getState();
    const current = getCurrentDiagram(state);
    expect(current.id).toBe('root');
    expect(current.level).toBe('context');
  });

  it('returns the last diagram in the navigation stack after drill-down', () => {
    const node = makeNode({ id: 'sys1', type: 'system', label: 'System' });
    addNode(node);
    drillDown('sys1');
    const state = getState();
    const childId = getChildDiagramId('sys1');
    expect(getCurrentDiagram(state).id).toBe(childId);
  });
});

describe('getDiagramById', () => {
  it('returns diagram when it exists', () => {
    const state = getState();
    expect(getDiagramById(state, 'root')).toBeDefined();
    expect(getDiagramById(state, 'root')!.id).toBe('root');
  });

  it('returns undefined for missing ID', () => {
    const state = getState();
    expect(getDiagramById(state, 'nonexistent')).toBeUndefined();
  });
});

describe('getBreadcrumbPath', () => {
  it('returns single item at root', () => {
    const path = getBreadcrumbPath(getState());
    expect(path).toHaveLength(1);
    expect(path[0]).toEqual({ id: 'root', label: 'System Context' });
  });

  it('returns multi-level path after drill-down', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', label: 'My System' }));
    drillDown('sys1');
    const path = getBreadcrumbPath(getState());
    expect(path).toHaveLength(2);
    expect(path[0].label).toBe('System Context');
    expect(path[1].label).toBe('My System');
  });
});

// ── Derived stores ────────────────────────────────────────────────────────────

describe('derived stores', () => {
  it('currentDiagram reflects the active diagram', () => {
    expect(get(currentDiagram).id).toBe('root');
  });

  it('breadcrumbs reflects navigation stack', () => {
    expect(get(breadcrumbs)).toHaveLength(1);
  });

  it('selectedId is null initially', () => {
    expect(get(selectedId)).toBeNull();
  });

  it('pendingNodeType is null initially', () => {
    expect(get(pendingNodeType)).toBeNull();
  });

  it('isAtRoot is true initially', () => {
    expect(get(isAtRoot)).toBe(true);
  });

  it('isAtRoot is false after drill-down', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    drillDown('sys1');
    expect(get(isAtRoot)).toBe(false);
  });
});

// ── Node CRUD ─────────────────────────────────────────────────────────────────

describe('addNode', () => {
  it('adds a node to the current diagram', () => {
    const node = makeNode({ id: 'n1' });
    addNode(node);
    const state = getState();
    const current = getCurrentDiagram(state);
    expect(current.nodes).toHaveLength(1);
    expect(current.nodes[0].id).toBe('n1');
  });

  it('sets selectedId to the new node', () => {
    const node = makeNode({ id: 'n1' });
    addNode(node);
    expect(getState().selectedId).toBe('n1');
  });
});

describe('addNodeToDiagram', () => {
  it('adds a node to a specific diagram', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    drillDown('sys1');
    const childId = getChildDiagramId('sys1');
    const node = makeNode({ id: 'child1' });
    addNodeToDiagram(childId, node);
    const state = getState();
    expect(state.diagrams[childId].nodes).toHaveLength(1);
    expect(state.diagrams[childId].nodes[0].id).toBe('child1');
  });

  it('does nothing for a non-existent diagram', () => {
    const before = getState();
    addNodeToDiagram('nonexistent', makeNode());
    const after = getState();
    expect(after).toEqual(before);
  });
});

describe('updateNode', () => {
  it('patches node properties in the current diagram', () => {
    addNode(makeNode({ id: 'n1', label: 'Old' }));
    updateNode('n1', { label: 'New' });
    const current = getCurrentDiagram(getState());
    expect(current.nodes[0].label).toBe('New');
  });

  it('does not affect other nodes', () => {
    addNode(makeNode({ id: 'n1', label: 'A' }));
    addNode(makeNode({ id: 'n2', label: 'B', position: { x: 300, y: 0 } }));
    updateNode('n1', { label: 'Updated' });
    const current = getCurrentDiagram(getState());
    expect(current.nodes.find((n) => n.id === 'n2')!.label).toBe('B');
  });
});

describe('updateNodeInDiagram', () => {
  it('patches a node in a specific diagram', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', label: 'Old' }));
    updateNodeInDiagram('root', 'sys1', { label: 'New' });
    expect(getState().diagrams['root'].nodes[0].label).toBe('New');
  });

  it('does nothing for a non-existent diagram', () => {
    addNode(makeNode({ id: 'n1' }));
    const before = getState();
    updateNodeInDiagram('nonexistent', 'n1', { label: 'X' });
    // Node in root should remain unchanged
    expect(getState().diagrams['root'].nodes[0].label).toBe(before.diagrams['root'].nodes[0].label);
  });
});

describe('deleteNode', () => {
  it('removes the node from the current diagram', () => {
    addNode(makeNode({ id: 'n1' }));
    deleteNode('n1');
    expect(getCurrentDiagram(getState()).nodes).toHaveLength(0);
  });

  it('removes connected edges', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    deleteNode('n1');
    const current = getCurrentDiagram(getState());
    expect(current.edges).toHaveLength(0);
    expect(current.nodes).toHaveLength(1);
  });

  it('clears selectedId if the deleted node was selected', () => {
    addNode(makeNode({ id: 'n1' }));
    setSelected('n1');
    deleteNode('n1');
    expect(getState().selectedId).toBeNull();
  });

  it('preserves selectedId if a different node was selected', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    setSelected('n2');
    deleteNode('n1');
    expect(getState().selectedId).toBe('n2');
  });

  it('removes child diagram when deleting a node with childDiagramId', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    createChildDiagram('sys1');
    const childId = getChildDiagramId('sys1');
    expect(getState().diagrams[childId]).toBeDefined();
    deleteNode('sys1');
    expect(getState().diagrams[childId]).toBeUndefined();
  });
});

describe('deleteNodeFromDiagram', () => {
  it('removes a node from a specific diagram', () => {
    addNode(makeNode({ id: 'n1' }));
    deleteNodeFromDiagram('root', 'n1');
    expect(getState().diagrams['root'].nodes).toHaveLength(0);
  });

  it('removes connected edges from that diagram', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    deleteNodeFromDiagram('root', 'n1');
    expect(getState().diagrams['root'].edges).toHaveLength(0);
  });

  it('does nothing for a non-existent diagram', () => {
    addNode(makeNode({ id: 'n1' }));
    deleteNodeFromDiagram('nonexistent', 'n1');
    expect(getState().diagrams['root'].nodes).toHaveLength(1);
  });
});

// ── Edge CRUD ─────────────────────────────────────────────────────────────────

describe('addEdge', () => {
  it('adds an edge with normalized defaults', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    const current = getCurrentDiagram(getState());
    expect(current.edges).toHaveLength(1);
    const edge = current.edges[0];
    expect(edge.markerStart).toBe('none');
    expect(edge.markerEnd).toBe('arrow');
    expect(edge.lineStyle).toBe('solid');
    expect(edge.lineType).toBe('bezier');
    expect(edge.waypoints).toEqual([]);
  });

  it('sets selectedId to the new edge', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    expect(getState().selectedId).toBe('e1');
  });

  it('preserves user-provided edge properties', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2', label: 'Uses', lineStyle: 'dashed' }));
    const edge = getCurrentDiagram(getState()).edges[0];
    expect(edge.label).toBe('Uses');
    expect(edge.lineStyle).toBe('dashed');
  });
});

describe('addEdgeToDiagram', () => {
  it('adds an edge to a specific diagram', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sys2', type: 'system', position: { x: 300, y: 0 } }));
    addEdgeToDiagram('root', makeEdge({ id: 'e1', source: 'sys1', target: 'sys2' }));
    expect(getState().diagrams['root'].edges).toHaveLength(1);
  });

  it('does nothing for a non-existent diagram', () => {
    const before = getState();
    addEdgeToDiagram('nonexistent', makeEdge({ id: 'e1', source: 'a', target: 'b' }));
    expect(getState()).toEqual(before);
  });
});

describe('updateEdge', () => {
  it('patches edge properties', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    updateEdge('e1', { label: 'Updated' });
    expect(getCurrentDiagram(getState()).edges[0].label).toBe('Updated');
  });
});

describe('updateEdgeInDiagram', () => {
  it('patches an edge in a specific diagram', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    updateEdgeInDiagram('root', 'e1', { label: 'Patched' });
    expect(getState().diagrams['root'].edges[0].label).toBe('Patched');
  });
});

describe('deleteEdge', () => {
  it('removes the edge', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    deleteEdge('e1');
    expect(getCurrentDiagram(getState()).edges).toHaveLength(0);
  });

  it('clears selectedId if the deleted edge was selected', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    setSelected('e1');
    deleteEdge('e1');
    expect(getState().selectedId).toBeNull();
  });
});

describe('deleteEdgeFromDiagram', () => {
  it('removes an edge from a specific diagram', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    deleteEdgeFromDiagram('root', 'e1');
    expect(getState().diagrams['root'].edges).toHaveLength(0);
  });
});

// ── Navigation ────────────────────────────────────────────────────────────────

describe('drillDown', () => {
  it('creates a child diagram and navigates to it', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', label: 'My System' }));
    drillDown('sys1');
    const childId = getChildDiagramId('sys1');
    const state = getState();
    expect(state.navigationStack).toEqual(['root', childId]);
    expect(state.diagrams[childId]).toBeDefined();
    expect(state.diagrams[childId].level).toBe('container');
    expect(state.diagrams[childId].label).toBe('My System');
  });

  it('clears selectedId', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    setSelected('sys1');
    drillDown('sys1');
    expect(getState().selectedId).toBeNull();
  });

  it('reuses existing child diagram on subsequent drill-downs', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    drillDown('sys1');
    const childId = getChildDiagramId('sys1');
    // Add a node to the child diagram
    addNode(makeNode({ id: 'child1' }));
    drillUp();
    drillDown('sys1');
    const childDiagram = getState().diagrams[childId];
    expect(childDiagram.nodes).toHaveLength(1);
    expect(childDiagram.nodes[0].id).toBe('child1');
  });

  it('does nothing for a non-existent node', () => {
    const before = getState();
    drillDown('nonexistent');
    expect(getState().navigationStack).toEqual(before.navigationStack);
  });

  it('maps node types to correct child levels', () => {
    // system → container
    addNode(makeNode({ id: 's1', type: 'system', position: { x: 0, y: 0 } }));
    drillDown('s1');
    expect(getCurrentDiagram(getState()).level).toBe('container');
    drillUp();

    // container → component
    addNode(makeNode({ id: 'c1', type: 'container', position: { x: 300, y: 0 } }));
    drillDown('c1');
    expect(getCurrentDiagram(getState()).level).toBe('component');
    drillUp();

    // person → component
    addNode(makeNode({ id: 'p1', type: 'person', position: { x: 600, y: 0 } }));
    drillDown('p1');
    expect(getCurrentDiagram(getState()).level).toBe('component');
    drillUp();

    // component → code
    addNode(makeNode({ id: 'comp1', type: 'component', position: { x: 900, y: 0 } }));
    drillDown('comp1');
    expect(getCurrentDiagram(getState()).level).toBe('code');
    drillUp();

    // UML code types — all map to 'code' level (child would be 'code' level too)
    const umlTypes = ['class', 'abstract-class', 'interface', 'enum', 'record'] as const;
    umlTypes.forEach((umlType, i) => {
      addNode(makeNode({ id: `uml-${umlType}`, type: umlType, position: { x: i * 200, y: 300 } }));
      drillDown(`uml-${umlType}`);
      expect(getCurrentDiagram(getState()).level).toBe('code');
      drillUp();
    });
  });
});

describe('drillUp', () => {
  it('pops the navigation stack', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    drillDown('sys1');
    drillUp();
    expect(getState().navigationStack).toEqual(['root']);
  });

  it('clears selectedId', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    drillDown('sys1');
    drillUp();
    expect(getState().selectedId).toBeNull();
  });

  it('does nothing at root', () => {
    drillUp();
    expect(getState().navigationStack).toEqual(['root']);
  });
});

describe('navigateTo', () => {
  it('truncates the stack to the given diagram', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    drillDown('sys1');
    addNode(makeNode({ id: 'cont1', type: 'container' }));
    drillDown('cont1');
    expect(getState().navigationStack).toHaveLength(3);
    navigateTo('root');
    expect(getState().navigationStack).toEqual(['root']);
  });

  it('does nothing for a diagram not in the stack', () => {
    addNode(makeNode({ id: 'sys1', type: 'system' }));
    drillDown('sys1');
    const childId = getChildDiagramId('sys1');
    navigateTo('nonexistent');
    expect(getState().navigationStack).toEqual(['root', childId]);
  });
});

// ── Child diagram management ──────────────────────────────────────────────────

describe('createChildDiagram', () => {
  it('creates a child diagram and links the parent node', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', label: 'System' }));
    const childId = createChildDiagram('sys1');
    const state = getState();
    expect(childId).toBeTruthy();
    expect(state.diagrams[childId]).toBeDefined();
    expect(state.diagrams[childId].level).toBe('container');
    expect(state.diagrams[childId].label).toBe('System');
    const parentNode = state.diagrams['root'].nodes.find((n) => n.id === 'sys1');
    expect(parentNode!.childDiagramId).toBe(childId);
  });

  it('returns a unique ID each call', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sys2', type: 'system', position: { x: 300, y: 0 } }));
    const id1 = createChildDiagram('sys1');
    const id2 = createChildDiagram('sys2');
    expect(id1).not.toBe(id2);
  });
});

// ── Selection ─────────────────────────────────────────────────────────────────

describe('setSelected', () => {
  it('sets selectedId', () => {
    setSelected('abc');
    expect(getState().selectedId).toBe('abc');
  });

  it('clears selectedId when set to null', () => {
    setSelected('abc');
    setSelected(null);
    expect(getState().selectedId).toBeNull();
  });
});

describe('setPendingNodeType', () => {
  it('sets pendingNodeType', () => {
    setPendingNodeType('person');
    expect(getState().pendingNodeType).toBe('person');
  });

  it('clears pendingNodeType', () => {
    setPendingNodeType('person');
    setPendingNodeType(null);
    expect(getState().pendingNodeType).toBeNull();
  });
});

// ── Position updates & overlap resolution ─────────────────────────────────────

describe('updateNodePositions', () => {
  it('updates node positions in the current diagram', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    updateNodePositions([{ id: 'n1', position: { x: 100, y: 200 } }]);
    const node = getCurrentDiagram(getState()).nodes[0];
    expect(node.position.x).toBe(100);
    expect(node.position.y).toBe(200);
  });

  it('pushes overlapping nodes apart', () => {
    // Place two nodes at the exact same position
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 300 } }));
    // Move n2 on top of n1
    updateNodePositions([{ id: 'n2', position: { x: 0, y: 0 } }]);
    const nodes = getCurrentDiagram(getState()).nodes;
    const n1 = nodes.find((n) => n.id === 'n1')!;
    const n2 = nodes.find((n) => n.id === 'n2')!;
    // The moved node (n2) should stay at its position; n1 should be pushed away
    expect(n2.position.x).toBe(0);
    expect(n2.position.y).toBe(0);
    // n1 should have moved
    const distance = Math.abs(n1.position.x) + Math.abs(n1.position.y);
    expect(distance).toBeGreaterThan(0);
  });
});

describe('updateNodePositionsInDiagram', () => {
  it('updates positions in a specific diagram', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    updateNodePositionsInDiagram('root', [{ id: 'n1', position: { x: 50, y: 50 } }]);
    expect(getState().diagrams['root'].nodes[0].position).toEqual({ x: 50, y: 50 });
  });

  it('does nothing for a non-existent diagram', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    updateNodePositionsInDiagram('nonexistent', [{ id: 'n1', position: { x: 99, y: 99 } }]);
    expect(getState().diagrams['root'].nodes[0].position).toEqual({ x: 0, y: 0 });
  });
});

// ── State management ──────────────────────────────────────────────────────────

describe('loadDiagram', () => {
  it('replaces the entire state', () => {
    addNode(makeNode({ id: 'n1' }));
    const customState: DiagramState = {
      version: SCHEMA_VERSION,
      diagrams: {
        custom: {
          id: 'custom',
          level: 'context',
          label: 'Custom',
          nodes: [],
          edges: [],
        },
      },
      rootId: 'custom',
      navigationStack: ['custom'],
      selectedId: null,
      pendingNodeType: null,
    };
    loadDiagram(customState);
    const state = getState();
    expect(state.rootId).toBe('custom');
    expect(state.diagrams['root']).toBeUndefined();
    expect(state.diagrams['custom']).toBeDefined();
  });
});

describe('resetDiagram', () => {
  it('resets to initial empty state', () => {
    addNode(makeNode({ id: 'n1' }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n1' }));
    resetDiagram();
    const state = getState();
    expect(state.rootId).toBe('root');
    expect(state.navigationStack).toEqual(['root']);
    expect(getCurrentDiagram(state).nodes).toHaveLength(0);
    expect(getCurrentDiagram(state).edges).toHaveLength(0);
    expect(state.selectedId).toBeNull();
    expect(state.pendingNodeType).toBeNull();
  });
});

// ── State immutability ─────────────────────────────────────────────────────────

describe('state immutability', () => {
  it('addNode does not mutate previous state', () => {
    const before = getState();
    const beforeNodes = before.diagrams['root'].nodes;
    addNode(makeNode({ id: 'n1' }));
    // The original array reference must be unchanged
    expect(beforeNodes).toHaveLength(0);
    expect(getState().diagrams['root'].nodes).toHaveLength(1);
  });

  it('addEdge does not mutate previous state', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    const before = getState();
    const beforeEdges = before.diagrams['root'].edges;
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    expect(beforeEdges).toHaveLength(0);
    expect(getState().diagrams['root'].edges).toHaveLength(1);
  });

  it('updateNode does not mutate previous state', () => {
    addNode(makeNode({ id: 'n1', label: 'Original' }));
    const before = getState();
    const beforeNode = before.diagrams['root'].nodes[0];
    updateNode('n1', { label: 'Changed' });
    expect(beforeNode.label).toBe('Original');
    expect(getState().diagrams['root'].nodes[0].label).toBe('Changed');
  });

  it('deleteNode does not mutate previous state', () => {
    addNode(makeNode({ id: 'n1' }));
    const before = getState();
    const beforeNodes = before.diagrams['root'].nodes;
    deleteNode('n1');
    expect(beforeNodes).toHaveLength(1);
    expect(getState().diagrams['root'].nodes).toHaveLength(0);
  });
});
