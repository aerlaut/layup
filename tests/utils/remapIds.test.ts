import { remapIds } from '../../src/utils/persistence';
import { SCHEMA_VERSION } from '../../src/stores/diagramStore';
import type { DiagramState } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSimpleState(): DiagramState {
  return {
    version: SCHEMA_VERSION,
    diagrams: {
      root: {
        id: 'root',
        level: 'context',
        label: 'Root',
        nodes: [
          {
            id: 'n1',
            type: 'system',
            label: 'System A',
            position: { x: 100, y: 200 },
          } as any,
        ],
        edges: [
          {
            id: 'e1',
            source: 'n1',
            target: 'n2',
            label: '',
          } as any,
        ],
        annotations: [
          {
            id: 'a1',
            type: 'note',
            label: 'A note',
            position: { x: 50, y: 50 },
          } as any,
        ],
      },
    },
    rootId: 'root',
    navigationStack: ['root'],
    selectedId: 'n1',
    pendingNodeType: null,
  };
}

function makeNestedState(): DiagramState {
  return {
    version: SCHEMA_VERSION,
    diagrams: {
      root: {
        id: 'root',
        level: 'context',
        label: 'Root',
        nodes: [
          {
            id: 'n1',
            type: 'system',
            label: 'System',
            position: { x: 0, y: 0 },
            childDiagramId: 'child',
          } as any,
        ],
        edges: [],
        annotations: [],
      },
      child: {
        id: 'child',
        level: 'container',
        label: 'Child',
        nodes: [
          {
            id: 'n2',
            type: 'container',
            label: 'Container',
            position: { x: 0, y: 0 },
          } as any,
          {
            id: 'n3',
            type: 'database',
            label: 'DB',
            position: { x: 200, y: 0 },
          } as any,
        ],
        edges: [
          {
            id: 'e1',
            source: 'n2',
            target: 'n3',
            label: '',
          } as any,
        ],
        annotations: [],
      },
    },
    rootId: 'root',
    navigationStack: ['root', 'child'],
    selectedId: null,
    pendingNodeType: null,
  };
}

// ─── remapIds ─────────────────────────────────────────────────────────────────

describe('remapIds', () => {
  it('does not mutate the input state', () => {
    const original = makeSimpleState();
    const originalRootId = original.rootId;
    const originalNodeId = original.diagrams['root']!.nodes[0]!.id;

    remapIds(original);

    expect(original.rootId).toBe(originalRootId);
    expect(original.diagrams['root']!.nodes[0]!.id).toBe(originalNodeId);
  });

  it('assigns new IDs to all levels', () => {
    const state = makeNestedState();
    const result = remapIds(state);

    expect(Object.keys(result.diagrams)).not.toContain('root');
    expect(Object.keys(result.diagrams)).not.toContain('child');
    expect(Object.keys(result.diagrams)).toHaveLength(2);
  });

  it('updates rootId to the remapped root level ID', () => {
    const state = makeNestedState();
    const result = remapIds(state);

    // rootId must exist in the new diagrams map
    expect(result.diagrams[result.rootId]).toBeDefined();
    // rootId must differ from original
    expect(result.rootId).not.toBe('root');
  });

  it('assigns new IDs to all nodes', () => {
    const state = makeNestedState();
    const result = remapIds(state);

    const allNewNodes = Object.values(result.diagrams).flatMap((d) => d.nodes);
    const allNewNodeIds = allNewNodes.map((n) => n.id);

    expect(allNewNodeIds).not.toContain('n1');
    expect(allNewNodeIds).not.toContain('n2');
    expect(allNewNodeIds).not.toContain('n3');
    expect(new Set(allNewNodeIds).size).toBe(allNewNodeIds.length); // all unique
  });

  it('assigns new IDs to all edges', () => {
    const state = makeNestedState();
    const result = remapIds(state);

    const allNewEdges = Object.values(result.diagrams).flatMap((d) => d.edges);
    expect(allNewEdges[0]!.id).not.toBe('e1');
  });

  it('assigns new IDs to all annotations', () => {
    const state = makeSimpleState();
    const result = remapIds(state);

    const allAnnotations = Object.values(result.diagrams).flatMap((d) => d.annotations ?? []);
    expect(allAnnotations[0]!.id).not.toBe('a1');
  });

  it('updates edge source/target to remapped node IDs', () => {
    const state = makeNestedState();
    const result = remapIds(state);

    const newLevels = Object.values(result.diagrams);
    const newNodeIds = new Set(newLevels.flatMap((d) => d.nodes.map((n) => n.id)));
    const allEdges = newLevels.flatMap((d) => d.edges);

    for (const edge of allEdges) {
      // source and target must be in the new node IDs
      expect(newNodeIds.has(edge.source)).toBe(true);
      expect(newNodeIds.has(edge.target)).toBe(true);
    }
  });

  it('updates childDiagramId in nodes to remapped level IDs', () => {
    const state = makeNestedState();
    const result = remapIds(state);

    const newLevelIds = new Set(Object.keys(result.diagrams));
    const nodesWithChildren = Object.values(result.diagrams)
      .flatMap((d) => d.nodes)
      .filter((n) => n.childDiagramId != null);

    expect(nodesWithChildren).toHaveLength(1);
    expect(newLevelIds.has(nodesWithChildren[0]!.childDiagramId!)).toBe(true);
    expect(nodesWithChildren[0]!.childDiagramId).not.toBe('child');
  });

  it('updates navigationStack to remapped level IDs', () => {
    const state = makeNestedState();
    const result = remapIds(state);

    const newLevelIds = new Set(Object.keys(result.diagrams));
    for (const id of result.navigationStack) {
      expect(newLevelIds.has(id)).toBe(true);
    }
    // Old IDs are gone
    expect(result.navigationStack).not.toContain('root');
    expect(result.navigationStack).not.toContain('child');
  });

  it('resets selectedId to null', () => {
    const state = makeSimpleState();
    const result = remapIds(state);
    expect(result.selectedId).toBeNull();
  });

  it('resets pendingNodeType to null', () => {
    const state = { ...makeSimpleState(), pendingNodeType: 'system' as any };
    const result = remapIds(state);
    expect(result.pendingNodeType).toBeNull();
  });

  it('preserves node position data', () => {
    const state = makeSimpleState();
    const result = remapIds(state);

    const newNode = Object.values(result.diagrams).flatMap((d) => d.nodes)[0]!;
    expect(newNode.position).toEqual({ x: 100, y: 200 });
  });

  it('preserves node label and type', () => {
    const state = makeSimpleState();
    const result = remapIds(state);

    const newNode = Object.values(result.diagrams).flatMap((d) => d.nodes)[0]!;
    expect(newNode.label).toBe('System A');
    expect(newNode.type).toBe('system');
  });

  it('all generated IDs are unique across the entire remapped state', () => {
    const state = makeNestedState();
    const result = remapIds(state);

    const levelIds = Object.keys(result.diagrams);
    const nodeIds = Object.values(result.diagrams).flatMap((d) => d.nodes.map((n) => n.id));
    const edgeIds = Object.values(result.diagrams).flatMap((d) => d.edges.map((e) => e.id));
    const annotIds = Object.values(result.diagrams).flatMap((d) =>
      (d.annotations ?? []).map((a) => a.id)
    );

    const all = [...levelIds, ...nodeIds, ...edgeIds, ...annotIds];
    expect(new Set(all).size).toBe(all.length);
  });
});
