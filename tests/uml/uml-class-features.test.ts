/**
 * Tests for the UML class-diagram feature additions:
 *   - ClassMember fields on C4Node (members array)
 *   - New C4Edge end-label fields (multiplicity, role)
 *   - Package annotation type
 */

import { get } from 'svelte/store';
import {
  diagramStore,
  addNode,
  addEdge,
  addAnnotation,
  updateNodeInDiagram,
  updateEdgeInDiagram,
  resetDiagram,
  getCurrentDiagram,
} from '../../src/stores/diagramStore';
import type { C4Node, C4Edge, ClassMember, Annotation } from '../../src/types';
import { ANNOTATION_DEFAULT_COLORS } from '../../src/utils/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeClassNode(overrides: Partial<C4Node> = {}): C4Node {
  return {
    id: `cls-${Math.random().toString(36).slice(2, 8)}`,
    type: 'class',
    label: 'MyClass',
    position: { x: 0, y: 0 },
    ...overrides,
  };
}

function makeEdge(source: string, target: string, overrides: Partial<C4Edge> = {}): C4Edge {
  return {
    id: `edge-${Math.random().toString(36).slice(2, 8)}`,
    source,
    target,
    ...overrides,
  };
}

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: `annot-${Math.random().toString(36).slice(2, 8)}`,
    type: 'package',
    label: 'com.example',
    position: { x: 10, y: 10 },
    ...overrides,
  };
}

function getState() {
  return get(diagramStore);
}

function getRootNodes(): C4Node[] {
  return getCurrentDiagram(getState()).nodes;
}

function getRootEdges(): C4Edge[] {
  return getCurrentDiagram(getState()).edges;
}

function getRootAnnotations(): Annotation[] {
  return getCurrentDiagram(getState()).annotations;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetDiagram();
});

// ─── ClassMember on C4Node ────────────────────────────────────────────────────

describe('ClassMember — node.members field', () => {
  it('node added without members has undefined members', () => {
    const node = makeClassNode();
    addNode(node);
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored).toBeDefined();
    expect(stored!.members).toBeUndefined();
  });

  it('node added with members array persists all fields', () => {
    const members: ClassMember[] = [
      { id: 'm1', kind: 'attribute', visibility: '+', name: 'name', type: 'string' },
      { id: 'm2', kind: 'operation', visibility: '-', name: 'doThing', type: 'void', params: '(x: int)', isStatic: false, isAbstract: false },
    ];
    const node = makeClassNode({ members });
    addNode(node);
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.members).toHaveLength(2);
    expect(stored!.members![0]).toEqual(members[0]);
    expect(stored!.members![1]).toEqual(members[1]);
  });

  it('updateNodeInDiagram replaces members array', () => {
    const node = makeClassNode({ members: [{ id: 'm1', kind: 'attribute', visibility: '+', name: 'old', type: 'int' }] });
    addNode(node);
    const newMembers: ClassMember[] = [
      { id: 'm2', kind: 'operation', visibility: '#', name: 'newOp', type: 'bool' },
    ];
    updateNodeInDiagram('root', node.id, { members: newMembers });
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.members).toHaveLength(1);
    expect(stored!.members![0]!.name).toBe('newOp');
  });

  it('updateNodeInDiagram can clear members with empty array', () => {
    const node = makeClassNode({ members: [{ id: 'm1', kind: 'attribute', visibility: '+', name: 'x', type: 'int' }] });
    addNode(node);
    updateNodeInDiagram('root', node.id, { members: [] });
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.members).toHaveLength(0);
  });

  it('members survive unrelated node label update', () => {
    const members: ClassMember[] = [
      { id: 'm1', kind: 'attribute', visibility: '+', name: 'id', type: 'number', isStatic: true },
    ];
    const node = makeClassNode({ members });
    addNode(node);
    updateNodeInDiagram('root', node.id, { label: 'RenamedClass' });
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.label).toBe('RenamedClass');
    expect(stored!.members).toHaveLength(1);
    expect(stored!.members![0]!.isStatic).toBe(true);
  });

  it('isAbstract flag persists on a member', () => {
    const members: ClassMember[] = [
      { id: 'm1', kind: 'operation', visibility: '#', name: 'abstractOp', type: 'void', isAbstract: true },
    ];
    const node = makeClassNode({ type: 'abstract-class', members });
    addNode(node);
    const stored = getRootNodes().find((n) => n.id === node.id);
    expect(stored!.members![0]!.isAbstract).toBe(true);
  });

  it('all visibility values are accepted', () => {
    const visibilities = ['+', '-', '#', '~'] as const;
    for (const vis of visibilities) {
      const node = makeClassNode({ id: `vis-${vis}`, members: [{ id: 'mx', kind: 'attribute', visibility: vis, name: 'x', type: 'int' }] });
      addNode(node);
      const stored = getRootNodes().find((n) => n.id === node.id);
      expect(stored!.members![0]!.visibility).toBe(vis);
    }
  });
});

// ─── New C4Edge end-label fields ──────────────────────────────────────────────

describe('C4Edge — multiplicity and role fields', () => {
  it('edge added without multiplicity/role has undefined end labels', () => {
    const n1 = makeClassNode({ id: 'n1' });
    const n2 = makeClassNode({ id: 'n2' });
    addNode(n1);
    addNode(n2);
    const edge = makeEdge('n1', 'n2');
    addEdge(edge);
    const stored = getRootEdges().find((e) => e.id === edge.id);
    expect(stored!.multiplicitySource).toBeUndefined();
    expect(stored!.multiplicityTarget).toBeUndefined();
    expect(stored!.roleSource).toBeUndefined();
    expect(stored!.roleTarget).toBeUndefined();
  });

  it('multiplicitySource and multiplicityTarget persist', () => {
    const n1 = makeClassNode({ id: 'n1' });
    const n2 = makeClassNode({ id: 'n2' });
    addNode(n1);
    addNode(n2);
    const edge = makeEdge('n1', 'n2', { multiplicitySource: '1', multiplicityTarget: '0..*' });
    addEdge(edge);
    const stored = getRootEdges().find((e) => e.id === edge.id);
    expect(stored!.multiplicitySource).toBe('1');
    expect(stored!.multiplicityTarget).toBe('0..*');
  });

  it('roleSource and roleTarget persist', () => {
    const n1 = makeClassNode({ id: 'n1' });
    const n2 = makeClassNode({ id: 'n2' });
    addNode(n1);
    addNode(n2);
    const edge = makeEdge('n1', 'n2', { roleSource: 'employer', roleTarget: 'employee' });
    addEdge(edge);
    const stored = getRootEdges().find((e) => e.id === edge.id);
    expect(stored!.roleSource).toBe('employer');
    expect(stored!.roleTarget).toBe('employee');
  });

  it('updateEdgeInDiagram can set multiplicity and role fields', () => {
    const n1 = makeClassNode({ id: 'n1' });
    const n2 = makeClassNode({ id: 'n2' });
    addNode(n1);
    addNode(n2);
    const edge = makeEdge('n1', 'n2');
    addEdge(edge);
    updateEdgeInDiagram('root', edge.id, { multiplicitySource: '1', multiplicityTarget: '1..*', roleSource: 'owner', roleTarget: 'item' });
    const stored = getRootEdges().find((e) => e.id === edge.id);
    expect(stored!.multiplicitySource).toBe('1');
    expect(stored!.multiplicityTarget).toBe('1..*');
    expect(stored!.roleSource).toBe('owner');
    expect(stored!.roleTarget).toBe('item');
  });

  it('new MarkerType values can be stored on an edge', () => {
    const n1 = makeClassNode({ id: 'n1' });
    const n2 = makeClassNode({ id: 'n2' });
    addNode(n1);
    addNode(n2);
    const edge = makeEdge('n1', 'n2', { markerEnd: 'hollow-triangle', markerStart: 'filled-diamond' });
    addEdge(edge);
    const stored = getRootEdges().find((e) => e.id === edge.id);
    expect(stored!.markerEnd).toBe('hollow-triangle');
    expect(stored!.markerStart).toBe('filled-diamond');
  });

  it('open-arrow and hollow-diamond marker types persist', () => {
    const n1 = makeClassNode({ id: 'n1' });
    const n2 = makeClassNode({ id: 'n2' });
    addNode(n1);
    addNode(n2);
    const edge = makeEdge('n1', 'n2', { markerEnd: 'open-arrow', markerStart: 'hollow-diamond' });
    addEdge(edge);
    const stored = getRootEdges().find((e) => e.id === edge.id);
    expect(stored!.markerEnd).toBe('open-arrow');
    expect(stored!.markerStart).toBe('hollow-diamond');
  });
});

// ─── Package AnnotationType ───────────────────────────────────────────────────

describe('Package annotation', () => {
  it('package annotation can be added to a diagram', () => {
    const annot = makeAnnotation({ type: 'package', label: 'com.example.service' });
    addAnnotation(annot);
    const stored = getRootAnnotations().find((a) => a.id === annot.id);
    expect(stored).toBeDefined();
    expect(stored!.type).toBe('package');
    expect(stored!.label).toBe('com.example.service');
  });

  it('package annotation with explicit size persists width and height', () => {
    const annot = makeAnnotation({ type: 'package', width: 300, height: 200 });
    addAnnotation(annot);
    const stored = getRootAnnotations().find((a) => a.id === annot.id);
    expect(stored!.width).toBe(300);
    expect(stored!.height).toBe(200);
  });

  it('ANNOTATION_DEFAULT_COLORS has a package entry with a valid hex color', () => {
    const color = ANNOTATION_DEFAULT_COLORS['package'];
    expect(color).toBeDefined();
    expect(color).toMatch(/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/);
  });
});
