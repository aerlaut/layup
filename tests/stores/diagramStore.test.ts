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
  computeNodeHeight,
  contextBoundaries,
  parentNodeType,
  childLevelFor,
} from '../../src/stores/diagramStore';
import type { C4Node, C4Edge, DiagramState, ClassMember } from '../../src/types';
import {
  NODE_DEFAULT_HEIGHT,
  BOUNDARY_PADDING,
  UML_NODE_HEIGHT_BASE,
  UML_MEMBER_ROW_HEIGHT,
  UML_COMPARTMENT_OVERHEAD,
} from '../../src/utils/constants';

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

    // database → component (not code — db-schema sits at component level)
    addNode(makeNode({ id: 'db1', type: 'database', position: { x: 600, y: 0 } }));
    drillDown('db1');
    expect(getCurrentDiagram(getState()).level).toBe('component');
    drillUp();

    // person → component
    addNode(makeNode({ id: 'p1', type: 'person', position: { x: 900, y: 0 } }));
    drillDown('p1');
    expect(getCurrentDiagram(getState()).level).toBe('component');
    drillUp();

    // component → code
    addNode(makeNode({ id: 'comp1', type: 'component', position: { x: 1200, y: 0 } }));
    drillDown('comp1');
    expect(getCurrentDiagram(getState()).level).toBe('code');
    drillUp();

    // db-schema → code
    addNode(makeNode({ id: 'schema1', type: 'db-schema', position: { x: 1500, y: 0 } }));
    drillDown('schema1');
    expect(getCurrentDiagram(getState()).level).toBe('code');
    drillUp();
  });

  it('does not drill into UML class-type nodes', () => {
    const umlTypes = ['class', 'abstract-class', 'interface', 'enum', 'record'] as const;
    umlTypes.forEach((umlType, i) => {
      addNode(makeNode({ id: `uml-${umlType}`, type: umlType, position: { x: i * 200, y: 300 } }));
      const stackBefore = getState().navigationStack.slice();
      drillDown(`uml-${umlType}`);
      // Navigation stack must not change — UML nodes are not drillable
      expect(getState().navigationStack).toEqual(stackBefore);
      // No child diagram should have been created
      const node = getState().diagrams['root'].nodes.find((n) => n.id === `uml-${umlType}`);
      expect(node?.childDiagramId).toBeUndefined();
    });
  });

  it('does not drill into ERD node types', () => {
    const erdTypes = ['erd-table', 'erd-view'] as const;
    erdTypes.forEach((erdType, i) => {
      addNode(makeNode({ id: `erd-${erdType}`, type: erdType, position: { x: i * 200, y: 600 } }));
      const stackBefore = getState().navigationStack.slice();
      drillDown(`erd-${erdType}`);
      expect(getState().navigationStack).toEqual(stackBefore);
      const node = getState().diagrams['root'].nodes.find((n) => n.id === `erd-${erdType}`);
      expect(node?.childDiagramId).toBeUndefined();
    });
  });
});

describe('parentNodeType', () => {
  it('is null at root', () => {
    expect(get(parentNodeType)).toBeNull();
  });

  it('returns the type of the parent node that owns the current diagram', () => {
    addNode(makeNode({ id: 'db1', type: 'database', position: { x: 0, y: 0 } }));
    drillDown('db1');
    expect(get(parentNodeType)).toBe('database');
    drillUp();
  });

  it('returns container type when drilling into a container', () => {
    addNode(makeNode({ id: 'c1', type: 'container', position: { x: 0, y: 0 } }));
    drillDown('c1');
    expect(get(parentNodeType)).toBe('container');
    drillUp();
  });

  it('updates correctly through two levels of drill-down', () => {
    // Root → database → db-schema
    addNode(makeNode({ id: 'db1', type: 'database', position: { x: 0, y: 0 } }));
    drillDown('db1');
    // Now in the database's component-level diagram; add a db-schema and drill further
    addNode(makeNode({ id: 'schema1', type: 'db-schema', position: { x: 0, y: 0 } }));
    drillDown('schema1');
    expect(get(parentNodeType)).toBe('db-schema');
    drillUp();
    drillUp();
  });

  it('returns null after drilling back to root', () => {
    addNode(makeNode({ id: 'db1', type: 'database', position: { x: 0, y: 0 } }));
    drillDown('db1');
    drillUp();
    expect(get(parentNodeType)).toBeNull();
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

  it('does not create a child diagram for UML class-type nodes', () => {
    const umlTypes = ['class', 'abstract-class', 'interface', 'enum', 'record'] as const;
    umlTypes.forEach((umlType, i) => {
      addNode(makeNode({ id: `uml-${umlType}`, type: umlType, position: { x: i * 200, y: 0 } }));
      createChildDiagram(`uml-${umlType}`);
      const node = getState().diagrams['root'].nodes.find((n) => n.id === `uml-${umlType}`);
      // No childDiagramId should be set
      expect(node?.childDiagramId).toBeUndefined();
    });
  });

  it('does not create a child diagram for ERD node types', () => {
    const erdTypes = ['erd-table', 'erd-view'] as const;
    erdTypes.forEach((erdType, i) => {
      addNode(makeNode({ id: `erd-${erdType}`, type: erdType, position: { x: i * 200, y: 300 } }));
      createChildDiagram(`erd-${erdType}`);
      const node = getState().diagrams['root'].nodes.find((n) => n.id === `erd-${erdType}`);
      expect(node?.childDiagramId).toBeUndefined();
    });
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

// ── computeNodeHeight ─────────────────────────────────────────────────────────

describe('computeNodeHeight', () => {
  function makeClassMember(kind: 'attribute' | 'operation'): ClassMember {
    return {
      id: `m-${Math.random().toString(36).slice(2, 8)}`,
      kind,
      visibility: '+',
      name: 'field',
      type: 'String',
    };
  }

  it('returns NODE_DEFAULT_HEIGHT for non-UML node types', () => {
    const nonUmlTypes: C4Node['type'][] = [
      'person', 'external-person', 'system', 'external-system',
      'container', 'database', 'component',
    ];
    for (const type of nonUmlTypes) {
      const node = makeNode({ type, id: `n-${type}` });
      expect(computeNodeHeight(node)).toBe(NODE_DEFAULT_HEIGHT);
    }
  });

  it('returns UML_NODE_HEIGHT_BASE for a UML node with no members', () => {
    const umlTypes: C4Node['type'][] = ['class', 'abstract-class', 'interface', 'enum', 'record'];
    for (const type of umlTypes) {
      const node = makeNode({ type, id: `n-${type}`, members: [] });
      expect(computeNodeHeight(node)).toBe(UML_NODE_HEIGHT_BASE);
    }
  });

  it('adds one compartment overhead + row heights for attributes only', () => {
    const node = makeNode({
      type: 'class',
      members: [makeClassMember('attribute'), makeClassMember('attribute')],
    });
    const expected = UML_NODE_HEIGHT_BASE + UML_COMPARTMENT_OVERHEAD + 2 * UML_MEMBER_ROW_HEIGHT;
    expect(computeNodeHeight(node)).toBe(expected);
  });

  it('adds one compartment overhead + row heights for operations only', () => {
    const node = makeNode({
      type: 'class',
      members: [makeClassMember('operation')],
    });
    const expected = UML_NODE_HEIGHT_BASE + UML_COMPARTMENT_OVERHEAD + 1 * UML_MEMBER_ROW_HEIGHT;
    expect(computeNodeHeight(node)).toBe(expected);
  });

  it('adds two compartment overheads for mixed attributes and operations', () => {
    const node = makeNode({
      type: 'class',
      members: [makeClassMember('attribute'), makeClassMember('operation')],
    });
    const expected =
      UML_NODE_HEIGHT_BASE +
      2 * UML_COMPARTMENT_OVERHEAD +
      1 * UML_MEMBER_ROW_HEIGHT + // attribute
      1 * UML_MEMBER_ROW_HEIGHT;  // operation
    expect(computeNodeHeight(node)).toBe(expected);
  });

  it('enum nodes never add an operations compartment', () => {
    const node = makeNode({
      type: 'enum',
      members: [makeClassMember('attribute'), makeClassMember('operation')],
    });
    // Only the attribute compartment contributes; operations are suppressed for enums
    const expected = UML_NODE_HEIGHT_BASE + UML_COMPARTMENT_OVERHEAD + 1 * UML_MEMBER_ROW_HEIGHT;
    expect(computeNodeHeight(node)).toBe(expected);
  });

  it('height grows proportionally with more members', () => {
    const few = makeNode({ type: 'class', members: [makeClassMember('attribute')] });
    const many = makeNode({
      type: 'class',
      members: Array.from({ length: 10 }, () => makeClassMember('attribute')),
    });
    expect(computeNodeHeight(many)).toBeGreaterThan(computeNodeHeight(few));
  });

  it('treats undefined members the same as an empty array', () => {
    const withUndefined = makeNode({ type: 'class', members: undefined });
    const withEmpty = makeNode({ type: 'class', members: [] });
    expect(computeNodeHeight(withUndefined)).toBe(computeNodeHeight(withEmpty));
  });
});

// ── boundary group height expansion on member add ─────────────────────────────

describe('boundary group expands when UML node members are added', () => {
  function makeClassMember(kind: 'attribute' | 'operation', index = 0): ClassMember {
    return {
      id: `m-${index}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      visibility: '+',
      name: `field${index}`,
      type: 'String',
    };
  }

  it('boundary bounding-box grows taller as members are added to a Code-layer node', () => {
    // Scenario: root → component node (comp1). Drill into comp1 so that
    // contextBoundaries shows comp1 as a boundary group containing its
    // code-level nodes. Add a class node to comp1's diagram, record the
    // boundary height, then add many attributes and verify height grows.

    // Root: add a component node
    addNode(makeNode({ id: 'comp1', type: 'component', label: 'MyComponent', position: { x: 0, y: 0 } }));

    // Drill in — nav stack: [root, comp1_child]
    drillDown('comp1');
    const comp1ChildId = getChildDiagramId('comp1');

    // Add a class node with no members to the code-level diagram
    addNode({
      id: 'cls1',
      type: 'class',
      label: 'MyClass',
      position: { x: 50, y: 50 },
      members: [],
    });

    // contextBoundaries (parent = root) → shows comp1's boundary group
    const boundaryBefore = get(contextBoundaries).find((b) => b.parentNodeId === 'comp1');
    expect(boundaryBefore).toBeDefined();
    const heightBefore = boundaryBefore!.boundingBox.height;

    // Add 10 attributes to cls1 — this is the operation that triggered the bug
    const members: ClassMember[] = Array.from({ length: 10 }, (_, i) => makeClassMember('attribute', i));
    updateNodeInDiagram(comp1ChildId, 'cls1', { members });

    // After the update contextBoundaries must recompute with larger height
    const boundaryAfter = get(contextBoundaries).find((b) => b.parentNodeId === 'comp1');
    expect(boundaryAfter).toBeDefined();
    const heightAfter = boundaryAfter!.boundingBox.height;

    expect(heightAfter).toBeGreaterThan(heightBefore);
  });

  it('boundary height equals expected formula after adding members', () => {
    addNode(makeNode({ id: 'comp2', type: 'component', label: 'Comp2', position: { x: 0, y: 0 } }));
    drillDown('comp2');
    const comp2ChildId = getChildDiagramId('comp2');

    const members: ClassMember[] = [
      makeClassMember('attribute', 0),
      makeClassMember('attribute', 1),
      makeClassMember('operation', 2),
    ];
    addNode({ id: 'cls2', type: 'class', label: 'Cls2', position: { x: 0, y: 0 }, members });

    const boundary = get(contextBoundaries).find((b) => b.parentNodeId === 'comp2');
    expect(boundary).toBeDefined();

    // Expected: bounding box height = BOUNDARY_PADDING*2 + computeNodeHeight(cls2)
    // computeNodeHeight: UML_NODE_HEIGHT_BASE + 2*overhead + 3*row
    const expectedNodeHeight =
      UML_NODE_HEIGHT_BASE +
      2 * UML_COMPARTMENT_OVERHEAD +  // one attributes compartment + one operations compartment
      3 * UML_MEMBER_ROW_HEIGHT;
    const expectedBoxHeight = expectedNodeHeight + BOUNDARY_PADDING * 2;

    expect(boundary!.boundingBox.height).toBe(expectedBoxHeight);
  });
});

// ── childLevelFor ─────────────────────────────────────────────────────────────

describe('childLevelFor', () => {
  it('returns the correct child level for each drillable node type', () => {
    expect(childLevelFor('system')).toBe('container');
    expect(childLevelFor('external-system')).toBe('container');
    expect(childLevelFor('person')).toBe('component');
    expect(childLevelFor('external-person')).toBe('component');
    expect(childLevelFor('container')).toBe('component');
    expect(childLevelFor('database')).toBe('component');
    expect(childLevelFor('db-schema')).toBe('code');
    expect(childLevelFor('component')).toBe('code');
  });

  it('returns undefined for non-drillable UML and ERD node types', () => {
    const nonDrillable: C4Node['type'][] = [
      'class', 'abstract-class', 'interface', 'enum', 'record',
      'erd-table', 'erd-view',
    ];
    for (const type of nonDrillable) {
      expect(childLevelFor(type)).toBeUndefined();
    }
  });
});

// ── contextBoundaries — unvisited sibling nodes ───────────────────────────────

describe('contextBoundaries — unvisited sibling nodes', () => {
  beforeEach(() => resetDiagram());

  it('includes a boundary group for a drillable sibling that has never been visited', () => {
    // Create two system nodes at root; only drill into A
    addNode(makeNode({ id: 'sysA', type: 'system', label: 'System A', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sysB', type: 'system', label: 'System B', position: { x: 300, y: 0 } }));

    drillDown('sysA'); // sysB is still unvisited (no childDiagramId)

    const boundaries = get(contextBoundaries);
    expect(boundaries).toHaveLength(2);

    const boundaryA = boundaries.find((b) => b.parentNodeId === 'sysA');
    const boundaryB = boundaries.find((b) => b.parentNodeId === 'sysB');

    // Both should appear
    expect(boundaryA).toBeDefined();
    expect(boundaryB).toBeDefined();

    // A has been visited — it has a real childDiagramId
    expect(boundaryA!.childDiagramId).toBeDefined();

    // B has never been visited — no childDiagramId, empty childNodes
    expect(boundaryB!.childDiagramId).toBeUndefined();
    expect(boundaryB!.childNodes).toHaveLength(0);
  });

  it('shows all drillable siblings at the container level', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    drillDown('sys1');

    // Add two containers inside sys1's child diagram; drill into only contA
    addNode(makeNode({ id: 'contA', type: 'container', label: 'Container A', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'contB', type: 'container', label: 'Container B', position: { x: 300, y: 0 } }));

    drillDown('contA');

    const boundaries = get(contextBoundaries);
    const boundaryA = boundaries.find((b) => b.parentNodeId === 'contA');
    const boundaryB = boundaries.find((b) => b.parentNodeId === 'contB');

    expect(boundaryA).toBeDefined();
    expect(boundaryB).toBeDefined();
    expect(boundaryB!.childDiagramId).toBeUndefined();
    expect(boundaryB!.childNodes).toHaveLength(0);
  });

  it('does NOT include non-drillable node types (UML/ERD) as boundary groups', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    drillDown('sys1');

    // At container level, add a drillable component and some non-drillable types
    addNode(makeNode({ id: 'comp1', type: 'component', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'cls1', type: 'class', position: { x: 300, y: 0 } }));
    addNode(makeNode({ id: 'tbl1', type: 'erd-table', position: { x: 600, y: 0 } }));

    drillDown('comp1');

    const boundaries = get(contextBoundaries);

    // cls1 and tbl1 must NOT appear as boundary groups
    expect(boundaries.find((b) => b.parentNodeId === 'cls1')).toBeUndefined();
    expect(boundaries.find((b) => b.parentNodeId === 'tbl1')).toBeUndefined();

    // comp1 (the one we drilled into) should still appear
    expect(boundaries.find((b) => b.parentNodeId === 'comp1')).toBeDefined();
  });

  it('populates childDiagramId for a sibling once it has been visited', () => {
    addNode(makeNode({ id: 'sysA', type: 'system', label: 'A', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sysB', type: 'system', label: 'B', position: { x: 300, y: 0 } }));

    // Visit A; B is unvisited
    drillDown('sysA');
    const before = get(contextBoundaries).find((b) => b.parentNodeId === 'sysB');
    expect(before!.childDiagramId).toBeUndefined();

    // Navigate to B
    drillUp();
    drillDown('sysB');

    // Now navigate back to A; both should have childDiagramId
    drillUp();
    drillDown('sysA');
    const after = get(contextBoundaries).find((b) => b.parentNodeId === 'sysB');
    expect(after!.childDiagramId).toBeDefined();
  });

  it('returns empty array when at root (no parent diagram)', () => {
    // Not drilled in — contextBoundaries should be empty
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    expect(get(contextBoundaries)).toHaveLength(0);
  });

  it('unvisited boundary has a non-degenerate bounding box based on parent node position', () => {
    addNode(makeNode({ id: 'sysA', type: 'system', label: 'A', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sysB', type: 'system', label: 'B', position: { x: 500, y: 250 } }));

    drillDown('sysA');

    const boundaryB = get(contextBoundaries).find((b) => b.parentNodeId === 'sysB');
    expect(boundaryB).toBeDefined();
    // Bounding box must have positive dimensions even for an unvisited (empty) group
    expect(boundaryB!.boundingBox.width).toBeGreaterThan(0);
    expect(boundaryB!.boundingBox.height).toBeGreaterThan(0);
  });
});
