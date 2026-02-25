import { writable, derived, get } from 'svelte/store';
import type { DiagramState, DiagramLevel, C4Node, C4Edge, C4NodeType, C4LevelType } from '../types';

export const SCHEMA_VERSION = 1;

const ROOT_DIAGRAM_ID = 'root';

function createInitialState(): DiagramState {
  const rootDiagram: DiagramLevel = {
    id: ROOT_DIAGRAM_ID,
    level: 'context',
    label: 'System Context',
    nodes: [],
    edges: [],
  };
  return {
    version: SCHEMA_VERSION,
    diagrams: { [ROOT_DIAGRAM_ID]: rootDiagram },
    rootId: ROOT_DIAGRAM_ID,
    navigationStack: [ROOT_DIAGRAM_ID],
    selectedId: null,
    pendingNodeType: null,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const diagramStore = writable<DiagramState>(createInitialState());

// ─── Selectors ────────────────────────────────────────────────────────────────

export function getCurrentDiagram(state: DiagramState): DiagramLevel {
  const id = state.navigationStack[state.navigationStack.length - 1];
  return state.diagrams[id];
}

export function getDiagramById(state: DiagramState, id: string): DiagramLevel | undefined {
  return state.diagrams[id];
}

export interface BreadcrumbItem {
  id: string;
  label: string;
}

export function getBreadcrumbPath(state: DiagramState): BreadcrumbItem[] {
  return state.navigationStack.map((id) => ({
    id,
    label: state.diagrams[id]?.label ?? id,
  }));
}

// ─── Derived stores ───────────────────────────────────────────────────────────

export const currentDiagram = derived(diagramStore, ($s) => getCurrentDiagram($s));
export const breadcrumbs = derived(diagramStore, ($s) => getBreadcrumbPath($s));
export const selectedId = derived(diagramStore, ($s) => $s.selectedId);
export const pendingNodeType = derived(diagramStore, ($s) => $s.pendingNodeType);
export const isAtRoot = derived(
  diagramStore,
  ($s) => $s.navigationStack.length === 1
);

// ─── Actions ──────────────────────────────────────────────────────────────────

export function addNode(node: C4Node): void {
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    current.nodes = [...current.nodes, node];
    return { ...s, pendingNodeType: null, selectedId: node.id };
  });
}

export function updateNode(nodeId: string, patch: Partial<C4Node>): void {
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    current.nodes = current.nodes.map((n) =>
      n.id === nodeId ? { ...n, ...patch } : n
    );
    return { ...s };
  });
}

export function deleteNode(nodeId: string): void {
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    const node = current.nodes.find((n) => n.id === nodeId);
    // Remove child diagram if present
    const diagrams = { ...s.diagrams };
    if (node?.childDiagramId) {
      delete diagrams[node.childDiagramId];
    }
    current.nodes = current.nodes.filter((n) => n.id !== nodeId);
    // Remove edges connected to this node
    current.edges = current.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId
    );
    return {
      ...s,
      diagrams,
      selectedId: s.selectedId === nodeId ? null : s.selectedId,
    };
  });
}

export function addEdge(edge: C4Edge): void {
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    current.edges = [...current.edges, edge];
    return { ...s, selectedId: edge.id };
  });
}

export function updateEdge(edgeId: string, patch: Partial<C4Edge>): void {
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    current.edges = current.edges.map((e) =>
      e.id === edgeId ? { ...e, ...patch } : e
    );
    return { ...s };
  });
}

export function deleteEdge(edgeId: string): void {
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    current.edges = current.edges.filter((e) => e.id !== edgeId);
    return {
      ...s,
      selectedId: s.selectedId === edgeId ? null : s.selectedId,
    };
  });
}

/** Maps the C4 node type to the child level type */
function childLevelFor(nodeType: C4NodeType): C4LevelType {
  const map: Record<C4NodeType, C4LevelType> = {
    person: 'component',
    system: 'container',
    container: 'component',
    component: 'code',
    'code-element': 'code',
  };
  return map[nodeType];
}

export function createChildDiagram(nodeId: string): string {
  const childId = `diagram-${nodeId}`;
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    const node = current.nodes.find((n) => n.id === nodeId);
    if (!node) return s;
    const childLevel = childLevelFor(node.type);
    const childDiagram: DiagramLevel = {
      id: childId,
      level: childLevel,
      label: node.label,
      nodes: [],
      edges: [],
    };
    current.nodes = current.nodes.map((n) =>
      n.id === nodeId ? { ...n, childDiagramId: childId } : n
    );
    return {
      ...s,
      diagrams: { ...s.diagrams, [childId]: childDiagram },
    };
  });
  return childId;
}

export function drillDown(nodeId: string): void {
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    const node = current.nodes.find((n) => n.id === nodeId);
    if (!node) return s;
    let childId = node.childDiagramId;
    if (!childId) {
      // Create child diagram inline
      childId = `diagram-${nodeId}`;
      const childLevel = childLevelFor(node.type);
      const childDiagram: DiagramLevel = {
        id: childId,
        level: childLevel,
        label: node.label,
        nodes: [],
        edges: [],
      };
      current.nodes = current.nodes.map((n) =>
        n.id === nodeId ? { ...n, childDiagramId: childId } : n
      );
      s = { ...s, diagrams: { ...s.diagrams, [childId!]: childDiagram } };
    }
    return {
      ...s,
      navigationStack: [...s.navigationStack, childId!],
      selectedId: null,
    };
  });
}

export function drillUp(): void {
  diagramStore.update((s) => {
    if (s.navigationStack.length <= 1) return s;
    return {
      ...s,
      navigationStack: s.navigationStack.slice(0, -1),
      selectedId: null,
    };
  });
}

export function navigateTo(diagramId: string): void {
  diagramStore.update((s) => {
    const idx = s.navigationStack.indexOf(diagramId);
    if (idx === -1) return s;
    return {
      ...s,
      navigationStack: s.navigationStack.slice(0, idx + 1),
      selectedId: null,
    };
  });
}

export function loadDiagram(state: DiagramState): void {
  diagramStore.set(state);
}

export function resetDiagram(): void {
  diagramStore.set(createInitialState());
}

export function setSelected(id: string | null): void {
  diagramStore.update((s) => ({ ...s, selectedId: id }));
}

export function setPendingNodeType(type: C4NodeType | null): void {
  diagramStore.update((s) => ({ ...s, pendingNodeType: type }));
}

export function updateNodePositions(updates: Array<{ id: string; position: { x: number; y: number } }>): void {
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    const posMap = new Map(updates.map((u) => [u.id, u.position]));
    current.nodes = current.nodes.map((n) =>
      posMap.has(n.id) ? { ...n, position: posMap.get(n.id)! } : n
    );
    return { ...s };
  });
}
