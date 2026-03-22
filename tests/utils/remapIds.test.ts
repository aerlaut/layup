import { remapIds } from '../../src/utils/persistence';
import { SCHEMA_VERSION } from '../../src/stores/diagramStore';
import type { DiagramState } from '../../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeState(): DiagramState {
  return {
    version: SCHEMA_VERSION,
    levels: {
      context: {
        level: 'context',
        nodes: [
          { id: 'n1', type: 'system', label: 'System A', position: { x: 100, y: 200 } },
        ],
        edges: [
          { id: 'e1', source: 'n1', target: 'n1' },
        ],
        annotations: [
          { id: 'a1', type: 'note', label: 'A note', position: { x: 50, y: 50 } },
        ],
      },
      container: {
        level: 'container',
        nodes: [
          { id: 'n2', type: 'container', label: 'Container', position: { x: 0, y: 0 }, parentNodeId: 'n1' },
          { id: 'n3', type: 'database', label: 'DB', position: { x: 200, y: 0 }, parentNodeId: 'n1' },
        ],
        edges: [
          { id: 'e2', source: 'n2', target: 'n3' },
        ],
        annotations: [],
      },
      component: { level: 'component', nodes: [], edges: [], annotations: [] },
      code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
    },
    currentLevel: 'context',
    selectedId: 'n1',
    pendingNodeType: null,
  };
}

// ─── remapIds ─────────────────────────────────────────────────────────────────

describe('remapIds', () => {
  it('does not mutate the input state', () => {
    const original = makeState();
    const originalNodeId = original.levels['context'].nodes[0]!.id;

    remapIds(original);

    expect(original.levels['context'].nodes[0]!.id).toBe(originalNodeId);
  });

  it('assigns new IDs to all nodes', () => {
    const state = makeState();
    const result = remapIds(state);

    const allNewNodeIds = Object.values(result.levels).flatMap((d) => d.nodes.map((n) => n.id));
    expect(allNewNodeIds).not.toContain('n1');
    expect(allNewNodeIds).not.toContain('n2');
    expect(allNewNodeIds).not.toContain('n3');
    expect(new Set(allNewNodeIds).size).toBe(allNewNodeIds.length);
  });

  it('assigns new IDs to all edges', () => {
    const state = makeState();
    const result = remapIds(state);

    const allNewEdgeIds = Object.values(result.levels).flatMap((d) => d.edges.map((e) => e.id));
    expect(allNewEdgeIds).not.toContain('e1');
    expect(allNewEdgeIds).not.toContain('e2');
  });

  it('assigns new IDs to all annotations', () => {
    const state = makeState();
    const result = remapIds(state);

    const allAnnotations = Object.values(result.levels).flatMap((d) => d.annotations);
    expect(allAnnotations[0]!.id).not.toBe('a1');
  });

  it('updates edge source/target to remapped node IDs', () => {
    const state = makeState();
    const result = remapIds(state);

    const allNewNodeIds = new Set(
      Object.values(result.levels).flatMap((d) => d.nodes.map((n) => n.id))
    );
    const allEdges = Object.values(result.levels).flatMap((d) => d.edges);

    for (const edge of allEdges) {
      expect(allNewNodeIds.has(edge.source)).toBe(true);
      expect(allNewNodeIds.has(edge.target)).toBe(true);
    }
  });

  it('updates parentNodeId to the remapped parent node ID', () => {
    const state = makeState();
    const result = remapIds(state);

    const contextNodes = result.levels['context'].nodes;
    const containerNodes = result.levels['container'].nodes;
    const newN1Id = contextNodes[0]!.id;

    for (const child of containerNodes) {
      expect(child.parentNodeId).toBe(newN1Id);
      expect(child.parentNodeId).not.toBe('n1');
    }
  });

  it('resets selectedId to null', () => {
    const state = makeState();
    const result = remapIds(state);
    expect(result.selectedId).toBeNull();
  });

  it('resets pendingNodeType to null', () => {
    const state = { ...makeState(), pendingNodeType: 'system' as any };
    const result = remapIds(state);
    expect(result.pendingNodeType).toBeNull();
  });

  it('preserves node position data', () => {
    const state = makeState();
    const result = remapIds(state);

    const newNode = result.levels['context'].nodes[0]!;
    expect(newNode.position).toEqual({ x: 100, y: 200 });
  });

  it('preserves node label and type', () => {
    const state = makeState();
    const result = remapIds(state);

    const newNode = result.levels['context'].nodes[0]!;
    expect(newNode.label).toBe('System A');
    expect(newNode.type).toBe('system');
  });

  it('all generated IDs are unique across the entire remapped state', () => {
    const state = makeState();
    const result = remapIds(state);

    const nodeIds = Object.values(result.levels).flatMap((d) => d.nodes.map((n) => n.id));
    const edgeIds = Object.values(result.levels).flatMap((d) => d.edges.map((e) => e.id));
    const annotIds = Object.values(result.levels).flatMap((d) => d.annotations.map((a) => a.id));

    const all = [...nodeIds, ...edgeIds, ...annotIds];
    expect(new Set(all).size).toBe(all.length);
  });

  it('preserves levels structure (currentLevel, version)', () => {
    const state = makeState();
    const result = remapIds(state);
    expect(result.currentLevel).toBe(state.currentLevel);
    expect(result.version).toBe(state.version);
  });
});
