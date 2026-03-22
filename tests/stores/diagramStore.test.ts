import { get } from 'svelte/store';
import {
  diagramStore,
  SCHEMA_VERSION,
  LEVEL_LABELS,
  nextLevel,
  prevLevel,
  getCurrentLevel,
  getBreadcrumbPath,
  currentDiagram,
  breadcrumbs,
  selectedId,
  pendingNodeType,
  isAtRoot,
  parentLevel,
  contextBoundaries,
  selectedElement,
  addNode,
  updateNode,
  deleteNode,
  addEdge,
  updateEdge,
  deleteEdge,
  drillDown,
  drillUp,
  navigateTo,
  setSelected,
  setPendingNodeType,
  updateNodePositions,
  updateNodePositionsInLevel,
  updateNodeBoundarySize,
  addAnnotation,
  updateAnnotation,
  deleteAnnotation,
  updateAnnotationPositions,
  loadDiagram,
  resetDiagram,
  computeNodeHeight,
  createInitialDiagramState,
} from '../../src/stores/diagramStore';
import type { C4Node, C4Edge, DiagramState, ClassMember, C4LevelType, Annotation } from '../../src/types';
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

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: `annot-${Math.random().toString(36).slice(2, 8)}`,
    type: 'note',
    label: 'Test Note',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function getState(): DiagramState {
  return get(diagramStore);
}

function getCurrentNodes() {
  return getState().levels[getState().currentLevel].nodes;
}

function getCurrentEdges() {
  return getState().levels[getState().currentLevel].edges;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetDiagram();
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe('createInitialDiagramState', () => {
  it('creates state with four levels', () => {
    const state = createInitialDiagramState();
    expect(Object.keys(state.levels)).toEqual(
      expect.arrayContaining(['context', 'container', 'component', 'code'])
    );
  });

  it('starts at context level', () => {
    const state = createInitialDiagramState();
    expect(state.currentLevel).toBe('context');
  });

  it('all levels start empty', () => {
    const state = createInitialDiagramState();
    for (const level of ['context', 'container', 'component', 'code'] as C4LevelType[]) {
      expect(state.levels[level].nodes).toHaveLength(0);
      expect(state.levels[level].edges).toHaveLength(0);
      expect(state.levels[level].annotations).toHaveLength(0);
    }
  });

  it('has correct version', () => {
    const state = createInitialDiagramState();
    expect(state.version).toBe(SCHEMA_VERSION);
  });
});

// ── Level navigation helpers ──────────────────────────────────────────────────

describe('nextLevel', () => {
  it('returns container for context', () => expect(nextLevel('context')).toBe('container'));
  it('returns component for container', () => expect(nextLevel('container')).toBe('component'));
  it('returns code for component', () => expect(nextLevel('component')).toBe('code'));
  it('returns undefined for code (last level)', () => expect(nextLevel('code')).toBeUndefined());
});

describe('prevLevel', () => {
  it('returns undefined for context (first level)', () => expect(prevLevel('context')).toBeUndefined());
  it('returns context for container', () => expect(prevLevel('container')).toBe('context'));
  it('returns container for component', () => expect(prevLevel('component')).toBe('container'));
  it('returns component for code', () => expect(prevLevel('code')).toBe('component'));
});

describe('LEVEL_LABELS', () => {
  it('has labels for all four levels', () => {
    expect(LEVEL_LABELS['context']).toBeTruthy();
    expect(LEVEL_LABELS['container']).toBeTruthy();
    expect(LEVEL_LABELS['component']).toBeTruthy();
    expect(LEVEL_LABELS['code']).toBeTruthy();
  });
});

// ── Selectors ─────────────────────────────────────────────────────────────────

describe('getCurrentLevel', () => {
  it('returns the context level initially', () => {
    const state = getState();
    const current = getCurrentLevel(state);
    expect(current.level).toBe('context');
  });

  it('returns the correct level after navigation', () => {
    drillDown();
    const state = getState();
    expect(getCurrentLevel(state).level).toBe('container');
  });
});

describe('getBreadcrumbPath', () => {
  it('returns single item at context level', () => {
    const path = getBreadcrumbPath(getState());
    expect(path).toHaveLength(1);
    expect(path[0]!.level).toBe('context');
    expect(path[0]!.label).toBe(LEVEL_LABELS['context']);
  });

  it('returns two items after one drill-down', () => {
    drillDown();
    const path = getBreadcrumbPath(getState());
    expect(path).toHaveLength(2);
    expect(path[0]!.level).toBe('context');
    expect(path[1]!.level).toBe('container');
  });

  it('returns four items after drilling all the way to code', () => {
    drillDown(); drillDown(); drillDown();
    const path = getBreadcrumbPath(getState());
    expect(path).toHaveLength(4);
    expect(path[3]!.level).toBe('code');
  });
});

// ── Derived stores ────────────────────────────────────────────────────────────

describe('derived stores', () => {
  it('currentDiagram reflects the active level', () => {
    expect(get(currentDiagram).level).toBe('context');
  });

  it('currentDiagram updates after drill-down', () => {
    drillDown();
    expect(get(currentDiagram).level).toBe('container');
  });

  it('breadcrumbs reflects current navigation depth', () => {
    expect(get(breadcrumbs)).toHaveLength(1);
    drillDown();
    expect(get(breadcrumbs)).toHaveLength(2);
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
    drillDown();
    expect(get(isAtRoot)).toBe(false);
  });

  it('parentLevel is null at context', () => {
    expect(get(parentLevel)).toBeNull();
  });

  it('parentLevel returns context level when at container', () => {
    drillDown();
    const pl = get(parentLevel);
    expect(pl).not.toBeNull();
    expect(pl!.level).toBe('context');
  });
});

// ── Node CRUD ─────────────────────────────────────────────────────────────────

describe('addNode', () => {
  it('adds a node to the current level', () => {
    const node = makeNode({ id: 'n1' });
    addNode(node);
    expect(getCurrentNodes()).toHaveLength(1);
    expect(getCurrentNodes()[0]!.id).toBe('n1');
  });

  it('sets selectedId to the new node', () => {
    addNode(makeNode({ id: 'n1' }));
    expect(getState().selectedId).toBe('n1');
  });

  it('adds nodes to the correct level when drilled in', () => {
    drillDown(); // now at container level
    const node = makeNode({ id: 'cont1' });
    addNode(node);
    expect(getState().levels['container'].nodes).toHaveLength(1);
    expect(getState().levels['context'].nodes).toHaveLength(0);
  });
});

describe('updateNode', () => {
  it('patches node properties in the current level', () => {
    addNode(makeNode({ id: 'n1', label: 'Old' }));
    updateNode('n1', { label: 'New' });
    expect(getCurrentNodes()[0]!.label).toBe('New');
  });

  it('does not affect other nodes', () => {
    addNode(makeNode({ id: 'n1', label: 'A' }));
    addNode(makeNode({ id: 'n2', label: 'B', position: { x: 300, y: 0 } }));
    updateNode('n1', { label: 'Updated' });
    expect(getCurrentNodes().find((n) => n.id === 'n2')!.label).toBe('B');
  });
});

describe('deleteNode', () => {
  it('removes the node from the current level', () => {
    addNode(makeNode({ id: 'n1' }));
    deleteNode('n1');
    expect(getCurrentNodes()).toHaveLength(0);
  });

  it('removes connected edges', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    deleteNode('n1');
    expect(getCurrentEdges()).toHaveLength(0);
    expect(getCurrentNodes()).toHaveLength(1);
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

  it('cascades to child nodes at the next level', () => {
    // Add a system node at context level
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    // Drill to container level and add a child node pointing back to sys1
    drillDown();
    addNode(makeNode({ id: 'cont1', type: 'container', parentNodeId: 'sys1', position: { x: 0, y: 0 } }));
    // Go back to context and delete sys1
    drillUp();
    deleteNode('sys1');
    // The container-level node should also be gone
    expect(getState().levels['container'].nodes.find((n) => n.id === 'cont1')).toBeUndefined();
  });

  it('cascades across multiple levels', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    drillDown(); // container level
    addNode(makeNode({ id: 'cont1', type: 'container', parentNodeId: 'sys1', position: { x: 0, y: 0 } }));
    drillDown(); // component level
    addNode(makeNode({ id: 'comp1', type: 'component', parentNodeId: 'cont1', position: { x: 0, y: 0 } }));
    drillUp(); drillUp(); // back to context
    deleteNode('sys1');
    expect(getState().levels['container'].nodes).toHaveLength(0);
    expect(getState().levels['component'].nodes).toHaveLength(0);
  });
});

// ── Edge CRUD ─────────────────────────────────────────────────────────────────

describe('addEdge', () => {
  it('adds an edge with normalized defaults', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    expect(getCurrentEdges()).toHaveLength(1);
    const edge = getCurrentEdges()[0]!;
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
    const edge = getCurrentEdges()[0]!;
    expect(edge.label).toBe('Uses');
    expect(edge.lineStyle).toBe('dashed');
  });
});

describe('updateEdge', () => {
  it('patches edge properties', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    updateEdge('e1', { label: 'Updated' });
    expect(getCurrentEdges()[0]!.label).toBe('Updated');
  });
});

describe('deleteEdge', () => {
  it('removes the edge', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    deleteEdge('e1');
    expect(getCurrentEdges()).toHaveLength(0);
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

// ── Navigation ────────────────────────────────────────────────────────────────

describe('drillDown', () => {
  it('advances to the next level', () => {
    drillDown();
    expect(getState().currentLevel).toBe('container');
  });

  it('advances through all levels in sequence', () => {
    drillDown(); expect(getState().currentLevel).toBe('container');
    drillDown(); expect(getState().currentLevel).toBe('component');
    drillDown(); expect(getState().currentLevel).toBe('code');
  });

  it('does nothing at the code level (no next level)', () => {
    drillDown(); drillDown(); drillDown();
    expect(getState().currentLevel).toBe('code');
    drillDown();
    expect(getState().currentLevel).toBe('code');
  });

  it('clears selectedId', () => {
    setSelected('some-id');
    drillDown();
    expect(getState().selectedId).toBeNull();
  });
});

describe('drillUp', () => {
  it('goes back to the previous level', () => {
    drillDown();
    drillUp();
    expect(getState().currentLevel).toBe('context');
  });

  it('does nothing at context level', () => {
    drillUp();
    expect(getState().currentLevel).toBe('context');
  });

  it('clears selectedId', () => {
    drillDown();
    setSelected('some-id');
    drillUp();
    expect(getState().selectedId).toBeNull();
  });
});

describe('navigateTo', () => {
  it('jumps directly to a level', () => {
    drillDown(); drillDown(); drillDown(); // code
    navigateTo('container');
    expect(getState().currentLevel).toBe('container');
  });

  it('clears selectedId', () => {
    drillDown();
    setSelected('some-id');
    navigateTo('context');
    expect(getState().selectedId).toBeNull();
  });

  it('does nothing for a non-existent level key', () => {
    const before = getState().currentLevel;
    navigateTo('nonexistent' as C4LevelType);
    expect(getState().currentLevel).toBe(before);
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

// ── Position updates ──────────────────────────────────────────────────────────

describe('updateNodePositions', () => {
  it('updates node positions in the current level', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    updateNodePositions([{ id: 'n1', position: { x: 100, y: 200 } }]);
    const node = getCurrentNodes()[0]!;
    expect(node.position.x).toBe(100);
    expect(node.position.y).toBe(200);
  });

  it('pushes overlapping nodes apart', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 300 } }));
    updateNodePositions([{ id: 'n2', position: { x: 0, y: 0 } }]);
    const nodes = getCurrentNodes();
    const n1 = nodes.find((n) => n.id === 'n1')!;
    const n2 = nodes.find((n) => n.id === 'n2')!;
    expect(n2.position).toEqual({ x: 0, y: 0 });
    const distance = Math.abs(n1.position.x) + Math.abs(n1.position.y);
    expect(distance).toBeGreaterThan(0);
  });
});

describe('updateNodePositionsInLevel', () => {
  it('updates positions in a specific level without changing currentLevel', () => {
    // Add a node to context, drill to container, update position at context
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    drillDown();
    updateNodePositionsInLevel('context', [{ id: 'n1', position: { x: 50, y: 50 } }]);
    expect(getState().levels['context'].nodes[0]!.position).toEqual({ x: 50, y: 50 });
    expect(getState().currentLevel).toBe('container'); // unchanged
  });
});

// ── Annotation CRUD ───────────────────────────────────────────────────────────

describe('annotation CRUD', () => {
  it('addAnnotation adds to current level', () => {
    const a = makeAnnotation({ id: 'a1' });
    addAnnotation(a);
    expect(getState().levels['context'].annotations).toHaveLength(1);
    expect(getState().levels['context'].annotations[0]!.id).toBe('a1');
    expect(getState().selectedId).toBe('a1');
  });

  it('updateAnnotation patches annotation', () => {
    addAnnotation(makeAnnotation({ id: 'a1', label: 'Old' }));
    updateAnnotation('context', 'a1', { label: 'New' });
    expect(getState().levels['context'].annotations[0]!.label).toBe('New');
  });

  it('deleteAnnotation removes annotation and clears selectedId', () => {
    addAnnotation(makeAnnotation({ id: 'a1' }));
    setSelected('a1');
    deleteAnnotation('context', 'a1');
    expect(getState().levels['context'].annotations).toHaveLength(0);
    expect(getState().selectedId).toBeNull();
  });

  it('updateAnnotationPositions updates positions', () => {
    addAnnotation(makeAnnotation({ id: 'a1', position: { x: 0, y: 0 } }));
    updateAnnotationPositions('context', [{ id: 'a1', position: { x: 99, y: 88 } }]);
    expect(getState().levels['context'].annotations[0]!.position).toEqual({ x: 99, y: 88 });
  });
});

// ── selectedElement derived store ─────────────────────────────────────────────

describe('selectedElement', () => {
  it('returns null when nothing selected', () => {
    expect(get(selectedElement)).toBeNull();
  });

  it('returns node result for a selected node', () => {
    addNode(makeNode({ id: 'n1' }));
    setSelected('n1');
    const result = get(selectedElement);
    expect(result?.type).toBe('node');
    expect(result?.type === 'node' && result.node.id).toBe('n1');
  });

  it('returns edge result for a selected edge', () => {
    addNode(makeNode({ id: 'n1', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'n2', position: { x: 300, y: 0 } }));
    addEdge(makeEdge({ id: 'e1', source: 'n1', target: 'n2' }));
    setSelected('e1');
    const result = get(selectedElement);
    expect(result?.type).toBe('edge');
  });

  it('returns annotation result for a selected annotation', () => {
    addAnnotation(makeAnnotation({ id: 'a1' }));
    setSelected('a1');
    const result = get(selectedElement);
    expect(result?.type).toBe('annotation');
  });

  it('returns null for a stale selected ID not in the current level', () => {
    addNode(makeNode({ id: 'n1' }));
    setSelected('n1');
    drillDown(); // current level changes, n1 not here
    // n1 is not in container level, so selectedElement should be null
    expect(get(selectedElement)).toBeNull();
  });
});

// ── contextBoundaries derived store ───────────────────────────────────────────

describe('contextBoundaries', () => {
  it('is empty at context level', () => {
    expect(get(contextBoundaries)).toHaveLength(0);
  });

  it('is empty at container level when no nodes have parentNodeId', () => {
    drillDown();
    addNode(makeNode({ id: 'cont1', type: 'container', position: { x: 0, y: 0 } }));
    // context level has no drillable nodes → no boundaries
    expect(get(contextBoundaries)).toHaveLength(0);
  });

  it('shows boundary groups for drillable parent nodes', () => {
    // Add system nodes at context level
    addNode(makeNode({ id: 'sys1', type: 'system', label: 'System A', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sys2', type: 'system', label: 'System B', position: { x: 400, y: 0 } }));
    // Drill to container and add child nodes with parentNodeId
    drillDown();
    addNode(makeNode({ id: 'c1', type: 'container', parentNodeId: 'sys1', position: { x: 50, y: 50 } }));
    addNode(makeNode({ id: 'c2', type: 'container', parentNodeId: 'sys2', position: { x: 450, y: 50 } }));

    const bounds = get(contextBoundaries);
    expect(bounds).toHaveLength(2);
    expect(bounds.find((b) => b.parentNodeId === 'sys1')).toBeDefined();
    expect(bounds.find((b) => b.parentNodeId === 'sys2')).toBeDefined();
  });

  it('boundary group has empty childNodes when no children have that parentNodeId', () => {
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sys2', type: 'system', position: { x: 400, y: 0 } }));
    drillDown();
    addNode(makeNode({ id: 'c1', type: 'container', parentNodeId: 'sys1', position: { x: 0, y: 0 } }));
    // sys2 has no children

    const bounds = get(contextBoundaries);
    const sys2Boundary = bounds.find((b) => b.parentNodeId === 'sys2');
    expect(sys2Boundary).toBeDefined();
    expect(sys2Boundary!.childNodes).toHaveLength(0);
    expect(sys2Boundary!.boundingBox.width).toBeGreaterThan(0);
    expect(sys2Boundary!.boundingBox.height).toBeGreaterThan(0);
  });

  it('does not show non-drillable parent types as boundaries', () => {
    // Add a UML class at context level
    addNode(makeNode({ id: 'cls1', type: 'class', position: { x: 0, y: 0 } }));
    addNode(makeNode({ id: 'sys1', type: 'system', position: { x: 300, y: 0 } }));
    drillDown();
    const bounds = get(contextBoundaries);
    // cls1 is not a drillable type for the container level, sys1 is
    expect(bounds.find((b) => b.parentNodeId === 'cls1')).toBeUndefined();
    expect(bounds.find((b) => b.parentNodeId === 'sys1')).toBeDefined();
  });
});

// ── State management ──────────────────────────────────────────────────────────

describe('loadDiagram', () => {
  it('replaces the entire state', () => {
    addNode(makeNode({ id: 'n1' }));
    const customState = createInitialDiagramState();
    customState.currentLevel = 'container';
    loadDiagram(customState);
    expect(getState().currentLevel).toBe('container');
    expect(getState().levels['context'].nodes).toHaveLength(0);
  });
});

describe('resetDiagram', () => {
  it('resets to initial empty state', () => {
    addNode(makeNode({ id: 'n1' }));
    drillDown();
    resetDiagram();
    const state = getState();
    expect(state.currentLevel).toBe('context');
    expect(state.levels['context'].nodes).toHaveLength(0);
    expect(state.selectedId).toBeNull();
    expect(state.pendingNodeType).toBeNull();
  });
});

// ── State immutability ────────────────────────────────────────────────────────

describe('state immutability', () => {
  it('addNode does not mutate previous state', () => {
    const before = getState();
    const beforeNodes = before.levels['context'].nodes;
    addNode(makeNode({ id: 'n1' }));
    expect(beforeNodes).toHaveLength(0);
    expect(getState().levels['context'].nodes).toHaveLength(1);
  });

  it('updateNode does not mutate previous state', () => {
    addNode(makeNode({ id: 'n1', label: 'Original' }));
    const before = getState();
    const beforeNode = before.levels['context'].nodes[0]!;
    updateNode('n1', { label: 'Changed' });
    expect(beforeNode.label).toBe('Original');
    expect(getState().levels['context'].nodes[0]!.label).toBe('Changed');
  });

  it('deleteNode does not mutate previous state', () => {
    addNode(makeNode({ id: 'n1' }));
    const before = getState();
    const beforeNodes = before.levels['context'].nodes;
    deleteNode('n1');
    expect(beforeNodes).toHaveLength(1);
    expect(getState().levels['context'].nodes).toHaveLength(0);
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
      expect(computeNodeHeight(makeNode({ type }))).toBe(NODE_DEFAULT_HEIGHT);
    }
  });

  it('returns UML_NODE_HEIGHT_BASE for a UML node with no members', () => {
    for (const type of ['class', 'abstract-class', 'interface', 'enum', 'record'] as C4Node['type'][]) {
      expect(computeNodeHeight(makeNode({ type, members: [] }))).toBe(UML_NODE_HEIGHT_BASE);
    }
  });

  it('adds compartment overhead and row heights for mixed members', () => {
    const node = makeNode({
      type: 'class',
      members: [makeClassMember('attribute'), makeClassMember('operation')],
    });
    const expected =
      UML_NODE_HEIGHT_BASE +
      2 * UML_COMPARTMENT_OVERHEAD +
      2 * UML_MEMBER_ROW_HEIGHT;
    expect(computeNodeHeight(node)).toBe(expected);
  });

  it('enum nodes never add an operations compartment', () => {
    const node = makeNode({
      type: 'enum',
      members: [makeClassMember('attribute'), makeClassMember('operation')],
    });
    const expected = UML_NODE_HEIGHT_BASE + UML_COMPARTMENT_OVERHEAD + 1 * UML_MEMBER_ROW_HEIGHT;
    expect(computeNodeHeight(node)).toBe(expected);
  });
});

// ─── updateNodeBoundarySize ───────────────────────────────────────────────────

describe('updateNodeBoundarySize', () => {
  beforeEach(() => resetDiagram());

  it('stores boundarySize on the target node', () => {
    loadDiagram({
      ...createInitialDiagramState(),
      currentLevel: 'context',
      levels: {
        context: { level: 'context', nodes: [makeNode({ id: 'sys1', type: 'system' })], edges: [], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code: { level: 'code', nodes: [], edges: [], annotations: [] },
      },
    });
    updateNodeBoundarySize('context', 'sys1', 600, 400);
    const state = get(diagramStore);
    const node = state.levels['context'].nodes.find((n) => n.id === 'sys1')!;
    expect(node.boundarySize).toEqual({ width: 600, height: 400 });
  });

  it('does not affect other nodes', () => {
    loadDiagram({
      ...createInitialDiagramState(),
      currentLevel: 'context',
      levels: {
        context: { level: 'context', nodes: [
          makeNode({ id: 'sys1', type: 'system' }),
          makeNode({ id: 'sys2', type: 'system' }),
        ], edges: [], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code: { level: 'code', nodes: [], edges: [], annotations: [] },
      },
    });
    updateNodeBoundarySize('context', 'sys1', 600, 400);
    const state = get(diagramStore);
    const sys2 = state.levels['context'].nodes.find((n) => n.id === 'sys2')!;
    expect(sys2.boundarySize).toBeUndefined();
  });

  it('contextBoundaries respects boundarySize as minimum', () => {
    loadDiagram({
      ...createInitialDiagramState(),
      currentLevel: 'container',
      levels: {
        context: { level: 'context', nodes: [
          makeNode({ id: 'sys1', type: 'system', position: { x: 0, y: 0 } }),
        ], edges: [], annotations: [] },
        container: { level: 'container', nodes: [], edges: [], annotations: [] },
        component: { level: 'component', nodes: [], edges: [], annotations: [] },
        code: { level: 'code', nodes: [], edges: [], annotations: [] },
      },
    });
    updateNodeBoundarySize('context', 'sys1', 800, 600);
    const boundaries = get(contextBoundaries);
    expect(boundaries[0]!.boundingBox.width).toBe(800);
    expect(boundaries[0]!.boundingBox.height).toBe(600);
  });
});


