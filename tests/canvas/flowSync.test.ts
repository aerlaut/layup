import { describe, it, expect } from 'vitest';
import { buildFlowData } from '../../src/canvas/flowSync';
import type { DiagramState, DiagramLevel, BoundaryGroup, C4Node } from '../../src/types';
import { SCHEMA_VERSION } from '../../src/stores/diagramStore';

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

function makeDiagram(id: string, nodes: C4Node[] = [], edges = []): DiagramLevel {
  return { id, level: 'context', label: id, nodes, edges, annotations: [] };
}

function makeState(overrides: Partial<DiagramState> = {}): DiagramState {
  return {
    version: SCHEMA_VERSION,
    diagrams: { root: makeDiagram('root') },
    rootId: 'root',
    navigationStack: ['root'],
    selectedId: null,
    pendingNodeType: null,
    ...overrides,
  };
}

function makeBoundary(
  parentNodeId: string,
  childDiagramId: string,
  childNodes: C4Node[],
): BoundaryGroup {
  const xs = childNodes.map((n) => n.position.x);
  const ys = childNodes.map((n) => n.position.y);
  const minX = xs.length ? Math.min(...xs) - 20 : 0;
  const minY = ys.length ? Math.min(...ys) - 20 : 0;
  return {
    parentNodeId,
    parentLabel: parentNodeId,
    childNodes,
    childDiagramId,
    boundingBox: { x: minX, y: minY, width: 200, height: 150 },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('buildFlowData — root level', () => {
  it('returns active nodes and edges from the current diagram', () => {
    const n1 = makeNode({ id: 'n1', position: { x: 0, y: 0 } });
    const n2 = makeNode({ id: 'n2', position: { x: 200, y: 0 } });
    const edge = { id: 'e1', source: 'n1', target: 'n2' };
    const current = makeDiagram('root', [n1, n2], [edge] as any);
    const state = makeState({ diagrams: { root: current } });

    const { nodes, edges } = buildFlowData(state, current, [], null, null);

    const nodeIds = nodes.map((n) => n.id);
    expect(nodeIds).toContain('n1');
    expect(nodeIds).toContain('n2');
    expect(edges).toHaveLength(1);
    expect(edges[0].id).toBe('e1');
  });

  it('produces no boundary nodes at root', () => {
    const current = makeDiagram('root');
    const state = makeState();

    const { nodes } = buildFlowData(state, current, [], null, null);

    expect(nodes.filter((n) => n.id.startsWith('boundary-'))).toHaveLength(0);
  });
});

describe('buildFlowData — drilled in with sibling groups', () => {
  it('creates a boundary node for every group', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 } });
    const childB = makeNode({ id: 'b1', position: { x: 500, y: 100 } });
    const diagA = makeDiagram('diagA', [childA]);
    const diagB = makeDiagram('diagB', [childB]);
    const state = makeState({
      navigationStack: ['root', 'diagA'],
      diagrams: { root: makeDiagram('root'), diagA, diagB },
    });
    const boundaryA = makeBoundary('sysA', 'diagA', [childA]);
    const boundaryB = makeBoundary('sysB', 'diagB', [childB]);

    const { nodes } = buildFlowData(state, diagA, [boundaryA, boundaryB], makeDiagram('root'), null);

    const boundaryIds = nodes.filter((n) => n.id.startsWith('boundary-')).map((n) => n.id);
    expect(boundaryIds).toContain('boundary-sysA');
    expect(boundaryIds).toContain('boundary-sysB');
  });

  it('renders sibling group nodes as real active nodes (not ctx- prefixed)', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 } });
    const childB = makeNode({ id: 'b1', position: { x: 500, y: 100 } });
    const diagA = makeDiagram('diagA', [childA]);
    const diagB = makeDiagram('diagB', [childB]);
    const state = makeState({
      navigationStack: ['root', 'diagA'],
      diagrams: { root: makeDiagram('root'), diagA, diagB },
    });
    const boundaryA = makeBoundary('sysA', 'diagA', [childA]);
    const boundaryB = makeBoundary('sysB', 'diagB', [childB]);

    const { nodes } = buildFlowData(state, diagA, [boundaryA, boundaryB], makeDiagram('root'), null);

    const nodeIds = nodes.map((n) => n.id);
    // Sibling node b1 must appear as its real ID, not 'ctx-b1'
    expect(nodeIds).toContain('b1');
    expect(nodeIds).not.toContain('ctx-b1');
    // Current group node a1 must also be present
    expect(nodeIds).toContain('a1');
  });

  it('parents all group nodes to their respective boundary', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 } });
    const childB = makeNode({ id: 'b1', position: { x: 500, y: 100 } });
    const diagA = makeDiagram('diagA', [childA]);
    const diagB = makeDiagram('diagB', [childB]);
    const state = makeState({
      navigationStack: ['root', 'diagA'],
      diagrams: { root: makeDiagram('root'), diagA, diagB },
    });
    const boundaryA = makeBoundary('sysA', 'diagA', [childA]);
    const boundaryB = makeBoundary('sysB', 'diagB', [childB]);

    const { nodes } = buildFlowData(state, diagA, [boundaryA, boundaryB], makeDiagram('root'), null);

    const a1 = nodes.find((n) => n.id === 'a1');
    const b1 = nodes.find((n) => n.id === 'b1');
    expect(a1?.parentId).toBe('boundary-sysA');
    expect(b1?.parentId).toBe('boundary-sysB');
  });

  it('renders intra-group edges from sibling diagrams with real edge IDs', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 } });
    const childB1 = makeNode({ id: 'b1', position: { x: 500, y: 100 } });
    const childB2 = makeNode({ id: 'b2', position: { x: 700, y: 100 } });
    const siblingEdge = { id: 'e-sibling', source: 'b1', target: 'b2', markerEnd: 'arrow', markerStart: 'none', lineStyle: 'solid', lineType: 'bezier', waypoints: [] };
    const diagA = makeDiagram('diagA', [childA]);
    const diagB = makeDiagram('diagB', [childB1, childB2], [siblingEdge] as any);
    const state = makeState({
      navigationStack: ['root', 'diagA'],
      diagrams: { root: makeDiagram('root'), diagA, diagB },
    });
    const boundaryA = makeBoundary('sysA', 'diagA', [childA]);
    const boundaryB = makeBoundary('sysB', 'diagB', [childB1, childB2]);

    const { edges } = buildFlowData(state, diagA, [boundaryA, boundaryB], makeDiagram('root'), null);

    const sibEdge = edges.find((e) => e.id === 'e-sibling');
    expect(sibEdge).toBeDefined();
    // Source and target must use real node IDs, not ctx- prefixed
    expect(sibEdge!.source).toBe('b1');
    expect(sibEdge!.target).toBe('b2');
  });

  it('renders cross-group edges using real node IDs', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 } });
    const childB = makeNode({ id: 'b1', position: { x: 500, y: 100 } });
    const diagA = makeDiagram('diagA', [childA]);
    const diagB = makeDiagram('diagB', [childB]);
    const crossEdge = {
      id: 'cross-e1',
      source: 'a1',
      target: 'b1',
      sourceGroupId: 'diagA',
      targetGroupId: 'diagB',
      markerEnd: 'arrow',
      markerStart: 'none',
      lineStyle: 'solid',
      lineType: 'bezier',
      waypoints: [],
    };
    const parentDiag = makeDiagram('root', [], [crossEdge] as any);
    const state = makeState({
      navigationStack: ['root', 'diagA'],
      diagrams: { root: parentDiag, diagA, diagB },
    });
    const boundaryA = makeBoundary('sysA', 'diagA', [childA]);
    const boundaryB = makeBoundary('sysB', 'diagB', [childB]);

    const { edges } = buildFlowData(state, diagA, [boundaryA, boundaryB], parentDiag, null);

    const cross = edges.find((e) => e.id === 'cross-e1');
    expect(cross).toBeDefined();
    expect(cross!.source).toBe('a1');
    expect(cross!.target).toBe('b1');
  });

  it('does not duplicate current diagram nodes in active list', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 } });
    const diagA = makeDiagram('diagA', [childA]);
    const state = makeState({
      navigationStack: ['root', 'diagA'],
      diagrams: { root: makeDiagram('root'), diagA },
    });
    const boundaryA = makeBoundary('sysA', 'diagA', [childA]);

    const { nodes } = buildFlowData(state, diagA, [boundaryA], makeDiagram('root'), null);

    expect(nodes.filter((n) => n.id === 'a1')).toHaveLength(1);
  });
});

describe('buildFlowData — selected node highlighting', () => {
  it('marks the selected node', () => {
    const n1 = makeNode({ id: 'n1', position: { x: 0, y: 0 } });
    const current = makeDiagram('root', [n1]);
    const state = makeState({ diagrams: { root: current } });

    const { nodes } = buildFlowData(state, current, [], null, 'n1');

    expect(nodes.find((n) => n.id === 'n1')?.selected).toBe(true);
  });
});

describe('buildFlowData — unvisited sibling boundary groups (undefined childDiagramId)', () => {
  it('renders a boundary node for an unvisited sibling with no childDiagramId', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 } });
    const diagA = makeDiagram('diagA', [childA]);
    const state = makeState({
      navigationStack: ['root', 'diagA'],
      diagrams: { root: makeDiagram('root'), diagA },
    });
    const boundaryA = makeBoundary('sysA', 'diagA', [childA]);
    // sysB has never been visited — childDiagramId is undefined
    const boundaryB: BoundaryGroup = {
      parentNodeId: 'sysB',
      parentLabel: 'System B',
      childNodes: [],
      childDiagramId: undefined,
      boundingBox: { x: 400, y: 0, width: 200, height: 150 },
    };

    const { nodes } = buildFlowData(state, diagA, [boundaryA, boundaryB], makeDiagram('root'), null);

    const boundaryIds = nodes.filter((n) => n.id.startsWith('boundary-')).map((n) => n.id);
    expect(boundaryIds).toContain('boundary-sysA');
    expect(boundaryIds).toContain('boundary-sysB');
  });

  it('renders no child nodes for an unvisited sibling boundary', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 } });
    const diagA = makeDiagram('diagA', [childA]);
    const state = makeState({
      navigationStack: ['root', 'diagA'],
      diagrams: { root: makeDiagram('root'), diagA },
    });
    const boundaryA = makeBoundary('sysA', 'diagA', [childA]);
    const boundaryB: BoundaryGroup = {
      parentNodeId: 'sysB',
      parentLabel: 'System B',
      childNodes: [],
      childDiagramId: undefined,
      boundingBox: { x: 400, y: 0, width: 200, height: 150 },
    };

    const { nodes } = buildFlowData(state, diagA, [boundaryA, boundaryB], makeDiagram('root'), null);

    // Only a1 and the boundary nodes; no phantom nodes from sysB
    const realNodes = nodes.filter((n) => !n.id.startsWith('boundary-'));
    expect(realNodes.map((n) => n.id)).toEqual(['a1']);
  });

  it('does not crash or produce edges for an unvisited sibling boundary', () => {
    const childA = makeNode({ id: 'a1', position: { x: 100, y: 100 } });
    const diagA = makeDiagram('diagA', [childA]);
    const state = makeState({
      navigationStack: ['root', 'diagA'],
      diagrams: { root: makeDiagram('root'), diagA },
    });
    const boundaryA = makeBoundary('sysA', 'diagA', [childA]);
    const boundaryB: BoundaryGroup = {
      parentNodeId: 'sysB',
      parentLabel: 'System B',
      childNodes: [],
      childDiagramId: undefined,
      boundingBox: { x: 400, y: 0, width: 200, height: 150 },
    };

    expect(() =>
      buildFlowData(state, diagA, [boundaryA, boundaryB], makeDiagram('root'), null),
    ).not.toThrow();

    const { edges } = buildFlowData(state, diagA, [boundaryA, boundaryB], makeDiagram('root'), null);
    // No phantom edges from the unvisited sibling
    expect(edges.filter((e) => e.source === 'sysB' || e.target === 'sysB')).toHaveLength(0);
  });
});
