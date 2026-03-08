import { describe, it, expect } from 'vitest';
import { buildFlowData } from '../../src/canvas/flowSync';
import type { DiagramState, DiagramLevel, BoundaryGroup, C4Node, C4LevelType } from '../../src/types';
import { SCHEMA_VERSION, createInitialDiagramState } from '../../src/stores/diagramStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNode(overrides: Partial<C4Node> = {}): C4Node {
  return {
    id: `n-${Math.random().toString(36).slice(2, 6)}`,
    type: 'system',
    label: 'Node',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function makeLevel(level: C4LevelType, nodes: C4Node[] = [], edges: any[] = []): DiagramLevel {
  return { level, nodes, edges, annotations: [] };
}

function makeState(overrides: Partial<DiagramState> = {}): DiagramState {
  const base = createInitialDiagramState();
  return { ...base, ...overrides };
}

function makeBoundary(parentNodeId: string, childNodes: C4Node[]): BoundaryGroup {
  const xs = childNodes.map((n) => n.position.x);
  const ys = childNodes.map((n) => n.position.y);
  const minX = xs.length ? Math.min(...xs) - 20 : 0;
  const minY = ys.length ? Math.min(...ys) - 20 : 0;
  return {
    parentNodeId,
    parentLabel: parentNodeId,
    childNodes,
    boundingBox: { x: minX, y: minY, width: 200, height: 150 },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildFlowData — context level (no boundaries)', () => {
  it('returns active nodes and edges from the current level', () => {
    const n1 = makeNode({ id: 'n1', position: { x: 0, y: 0 } });
    const n2 = makeNode({ id: 'n2', position: { x: 200, y: 0 } });
    const edge = { id: 'e1', source: 'n1', target: 'n2' };
    const currentLevel = makeLevel('context', [n1, n2], [edge]);
    const state = makeState({ levels: { ...createInitialDiagramState().levels, context: currentLevel }, currentLevel: 'context' });

    const { nodes, edges } = buildFlowData(state, currentLevel, [], null);

    const nodeIds = nodes.map((n) => n.id);
    expect(nodeIds).toContain('n1');
    expect(nodeIds).toContain('n2');
    expect(edges).toHaveLength(1);
    expect(edges[0]!.id).toBe('e1');
  });

  it('produces no boundary nodes at context level', () => {
    const currentLevel = makeLevel('context');
    const state = makeState();

    const { nodes } = buildFlowData(state, currentLevel, [], null);

    expect(nodes.filter((n) => n.id.startsWith('boundary-'))).toHaveLength(0);
  });

  it('hasChildren is false when no nodes exist at the next level', () => {
    const n1 = makeNode({ id: 'n1' });
    const currentLevel = makeLevel('context', [n1]);
    const state = makeState({ levels: { ...createInitialDiagramState().levels, context: currentLevel } });

    const { nodes } = buildFlowData(state, currentLevel, [], null);

    expect(nodes.find((n) => n.id === 'n1')!.data.hasChildren).toBe(false);
  });

  it('hasChildren is true when next level has a node with parentNodeId pointing here', () => {
    const n1 = makeNode({ id: 'n1' });
    const child = makeNode({ id: 'c1', parentNodeId: 'n1', type: 'container' });
    const ctxLevel = makeLevel('context', [n1]);
    const contLevel = makeLevel('container', [child]);
    const state = makeState({
      levels: { ...createInitialDiagramState().levels, context: ctxLevel, container: contLevel },
      currentLevel: 'context',
    });

    const { nodes } = buildFlowData(state, ctxLevel, [], null);

    expect(nodes.find((n) => n.id === 'n1')!.data.hasChildren).toBe(true);
  });
});

describe('buildFlowData — with boundary groups', () => {
  it('creates a boundary node for every group', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 }, parentNodeId: 'sysA' });
    const childB = makeNode({ id: 'b1', position: { x: 500, y: 100 }, parentNodeId: 'sysB' });
    const currentLevel = makeLevel('container', [childA, childB]);
    const state = makeState({ currentLevel: 'container', levels: { ...createInitialDiagramState().levels, container: currentLevel } });
    const boundaryA = makeBoundary('sysA', [childA]);
    const boundaryB = makeBoundary('sysB', [childB]);

    const { nodes } = buildFlowData(state, currentLevel, [boundaryA, boundaryB], null);

    const boundaryIds = nodes.filter((n) => n.id.startsWith('boundary-')).map((n) => n.id);
    expect(boundaryIds).toContain('boundary-sysA');
    expect(boundaryIds).toContain('boundary-sysB');
  });

  it('parents all group nodes to their respective boundary', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 }, parentNodeId: 'sysA' });
    const childB = makeNode({ id: 'b1', position: { x: 500, y: 100 }, parentNodeId: 'sysB' });
    const currentLevel = makeLevel('container', [childA, childB]);
    const state = makeState({ currentLevel: 'container', levels: { ...createInitialDiagramState().levels, container: currentLevel } });
    const boundaryA = makeBoundary('sysA', [childA]);
    const boundaryB = makeBoundary('sysB', [childB]);

    const { nodes } = buildFlowData(state, currentLevel, [boundaryA, boundaryB], null);

    const a1 = nodes.find((n) => n.id === 'a1');
    const b1 = nodes.find((n) => n.id === 'b1');
    expect(a1?.parentId).toBe('boundary-sysA');
    expect(b1?.parentId).toBe('boundary-sysB');
  });

  it('renders all nodes and edges from the current level', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 }, parentNodeId: 'sysA' });
    const childB = makeNode({ id: 'b1', position: { x: 500, y: 100 }, parentNodeId: 'sysB' });
    const edge = { id: 'e1', source: 'a1', target: 'b1', markerEnd: 'arrow', markerStart: 'none', lineStyle: 'solid', lineType: 'bezier', waypoints: [] };
    const currentLevel = makeLevel('container', [childA, childB], [edge]);
    const state = makeState({ currentLevel: 'container', levels: { ...createInitialDiagramState().levels, container: currentLevel } });
    const boundaryA = makeBoundary('sysA', [childA]);
    const boundaryB = makeBoundary('sysB', [childB]);

    const { nodes, edges } = buildFlowData(state, currentLevel, [boundaryA, boundaryB], null);

    const nodeIds = nodes.map((n) => n.id);
    expect(nodeIds).toContain('a1');
    expect(nodeIds).toContain('b1');
    expect(edges).toHaveLength(1);
    expect(edges[0]!.id).toBe('e1');
  });

  it('does not duplicate nodes', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 }, parentNodeId: 'sysA' });
    const currentLevel = makeLevel('container', [childA]);
    const state = makeState({ currentLevel: 'container', levels: { ...createInitialDiagramState().levels, container: currentLevel } });
    const boundaryA = makeBoundary('sysA', [childA]);

    const { nodes } = buildFlowData(state, currentLevel, [boundaryA], null);

    expect(nodes.filter((n) => n.id === 'a1')).toHaveLength(1);
  });
});

describe('buildFlowData — boundary group with empty childNodes', () => {
  it('renders a boundary node even when childNodes is empty', () => {
    const currentLevel = makeLevel('container');
    const state = makeState({ currentLevel: 'container' });
    const emptyBoundary: BoundaryGroup = {
      parentNodeId: 'sysX',
      parentLabel: 'System X',
      childNodes: [],
      boundingBox: { x: 0, y: 0, width: 220, height: 160 },
    };

    const { nodes } = buildFlowData(state, currentLevel, [emptyBoundary], null);

    expect(nodes.find((n) => n.id === 'boundary-sysX')).toBeDefined();
  });
});

describe('buildFlowData — selected node highlighting', () => {
  it('marks the selected node', () => {
    const n1 = makeNode({ id: 'n1', position: { x: 0, y: 0 } });
    const currentLevel = makeLevel('context', [n1]);
    const state = makeState({ levels: { ...createInitialDiagramState().levels, context: currentLevel } });

    const { nodes } = buildFlowData(state, currentLevel, [], 'n1');

    expect(nodes.find((n) => n.id === 'n1')?.selected).toBe(true);
  });
});

describe('buildFlowData — undefined currentLevelData', () => {
  it('returns empty nodes and edges when currentLevelData is undefined', () => {
    const state = makeState();
    const { nodes, edges } = buildFlowData(state, undefined, [], null);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });
});
