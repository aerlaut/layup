import { writable, derived, get } from 'svelte/store';
import type { DiagramState, DiagramLevel, C4Node, C4Edge, C4NodeType, C4LevelType, BoundaryGroup } from '../types';

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
    focusedParentNodeId: null,
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

const NODE_DEFAULT_WIDTH = 160;
const NODE_DEFAULT_HEIGHT = 80;
const BOUNDARY_PADDING = 40;
const BOUNDARY_MIN_WIDTH = 220;
const BOUNDARY_MIN_HEIGHT = 160;

function computeBoundingBox(
  childNodes: C4Node[],
  fallbackPosition: { x: number; y: number }
): { x: number; y: number; width: number; height: number } {
  if (childNodes.length === 0) {
    return {
      x: fallbackPosition.x - BOUNDARY_PADDING,
      y: fallbackPosition.y - BOUNDARY_PADDING,
      width: BOUNDARY_MIN_WIDTH,
      height: BOUNDARY_MIN_HEIGHT,
    };
  }
  const minX = Math.min(...childNodes.map((n) => n.position.x));
  const minY = Math.min(...childNodes.map((n) => n.position.y));
  const maxX = Math.max(...childNodes.map((n) => n.position.x)) + NODE_DEFAULT_WIDTH;
  const maxY = Math.max(...childNodes.map((n) => n.position.y)) + NODE_DEFAULT_HEIGHT;
  return {
    x: minX - BOUNDARY_PADDING,
    y: minY - BOUNDARY_PADDING,
    width: Math.max(maxX - minX + BOUNDARY_PADDING * 2, BOUNDARY_MIN_WIDTH),
    height: Math.max(maxY - minY + BOUNDARY_PADDING * 2, BOUNDARY_MIN_HEIGHT),
  };
}

export const parentDiagram = derived(diagramStore, ($s): DiagramLevel | null => {
  if ($s.navigationStack.length <= 1) return null;
  const parentId = $s.navigationStack[$s.navigationStack.length - 2];
  return $s.diagrams[parentId] ?? null;
});

export const contextBoundaries = derived(diagramStore, ($s): BoundaryGroup[] => {
  if ($s.navigationStack.length <= 1) return [];
  const parentDiagramId = $s.navigationStack[$s.navigationStack.length - 2];
  const currentDiagramId = $s.navigationStack[$s.navigationStack.length - 1];
  const parentDiagram = $s.diagrams[parentDiagramId];
  if (!parentDiagram) return [];

  return parentDiagram.nodes
    .filter((n) => n.childDiagramId !== undefined)
    .map((n) => {
      const childDiagram = $s.diagrams[n.childDiagramId!];
      const childNodes = childDiagram?.nodes ?? [];
      const isFocused = n.childDiagramId === currentDiagramId;
      const boundingBox = computeBoundingBox(childNodes, n.position);
      return {
        parentNodeId: n.id,
        parentLabel: n.label,
        isFocused,
        childNodes,
        boundingBox,
        childDiagramId: n.childDiagramId!,
      };
    });
});

// ─── Overlap prevention ───────────────────────────────────────────────────────

/** Check if two node bounding boxes intersect */
function nodesOverlap(a: C4Node, b: C4Node): boolean {
  return (
    a.position.x < b.position.x + NODE_DEFAULT_WIDTH &&
    a.position.x + NODE_DEFAULT_WIDTH > b.position.x &&
    a.position.y < b.position.y + NODE_DEFAULT_HEIGHT &&
    a.position.y + NODE_DEFAULT_HEIGHT > b.position.y
  );
}

/** Push `displaced` away from `fixed` along the axis with the smallest overlap */
function pushNodeAway(fixed: C4Node, displaced: C4Node): C4Node {
  const fixedCx = fixed.position.x + NODE_DEFAULT_WIDTH / 2;
  const fixedCy = fixed.position.y + NODE_DEFAULT_HEIGHT / 2;
  const dispCx = displaced.position.x + NODE_DEFAULT_WIDTH / 2;
  const dispCy = displaced.position.y + NODE_DEFAULT_HEIGHT / 2;
  const overlapX = NODE_DEFAULT_WIDTH - Math.abs(fixedCx - dispCx);
  const overlapY = NODE_DEFAULT_HEIGHT - Math.abs(fixedCy - dispCy);
  if (overlapX <= overlapY) {
    const dx = (dispCx >= fixedCx ? overlapX : -overlapX) + 10;
    return { ...displaced, position: { x: displaced.position.x + dx, y: displaced.position.y } };
  } else {
    const dy = (dispCy >= fixedCy ? overlapY : -overlapY) + 10;
    return { ...displaced, position: { x: displaced.position.x, y: displaced.position.y + dy } };
  }
}

/**
 * Resolve overlaps after a node is moved. The moved node stays fixed;
 * other overlapping nodes are pushed away iteratively (max 10 passes).
 */
function resolveNodeOverlaps(movedNodeId: string, nodes: C4Node[]): C4Node[] {
  const MAX_ITER = 10;
  let result = [...nodes];
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let changed = false;
    for (let i = 0; i < result.length - 1; i++) {
      for (let j = i + 1; j < result.length; j++) {
        if (!nodesOverlap(result[i], result[j])) continue;
        changed = true;
        // The moved node is highest priority (never pushed); otherwise push j away from i
        if (result[j].id === movedNodeId) {
          result[i] = pushNodeAway(result[j], result[i]);
        } else {
          result[j] = pushNodeAway(result[i], result[j]);
        }
      }
    }
    if (!changed) break;
  }
  return result;
}

/** Check if two bounding boxes overlap */
function bboxOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Resolve boundary overlaps at the parent diagram level.
 * Shifts the smaller group (fewer nodes) away from the larger group.
 */
function resolveBoundaryOverlaps(state: DiagramState): DiagramState {
  if (state.navigationStack.length <= 1) return state;
  const parentDiagramId = state.navigationStack[state.navigationStack.length - 2];
  const parentDiagram = state.diagrams[parentDiagramId];
  if (!parentDiagram) return state;

  const groups = parentDiagram.nodes
    .filter((n) => n.childDiagramId && state.diagrams[n.childDiagramId])
    .map((n) => {
      const childDiagram = state.diagrams[n.childDiagramId!]!;
      return {
        childDiagramId: n.childDiagramId!,
        nodes: childDiagram.nodes,
        bbox: computeBoundingBox(childDiagram.nodes, n.position),
      };
    });

  if (groups.length < 2) return state;

  const MAX_ITER = 10;
  let newState = state;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let changed = false;
    // Refresh bboxes after each pass
    for (const g of groups) {
      g.nodes = newState.diagrams[g.childDiagramId]?.nodes ?? g.nodes;
      const parentNode = parentDiagram.nodes.find((n) => n.childDiagramId === g.childDiagramId);
      g.bbox = computeBoundingBox(g.nodes, parentNode?.position ?? { x: 0, y: 0 });
    }

    for (let i = 0; i < groups.length - 1; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const a = groups[i];
        const b = groups[j];
        if (!bboxOverlap(a.bbox, b.bbox)) continue;
        changed = true;

        // Shift the smaller group away from the larger one
        const smaller = a.nodes.length <= b.nodes.length ? a : b;
        const larger = a.nodes.length <= b.nodes.length ? b : a;

        const sCx = smaller.bbox.x + smaller.bbox.width / 2;
        const sCy = smaller.bbox.y + smaller.bbox.height / 2;
        const lCx = larger.bbox.x + larger.bbox.width / 2;
        const lCy = larger.bbox.y + larger.bbox.height / 2;
        const overlapX =
          Math.min(larger.bbox.x + larger.bbox.width, smaller.bbox.x + smaller.bbox.width) -
          Math.max(larger.bbox.x, smaller.bbox.x);
        const overlapY =
          Math.min(larger.bbox.y + larger.bbox.height, smaller.bbox.y + smaller.bbox.height) -
          Math.max(larger.bbox.y, smaller.bbox.y);

        let offsetX = 0;
        let offsetY = 0;
        if (overlapX <= overlapY) {
          offsetX = (sCx >= lCx ? overlapX : -overlapX) + 10;
        } else {
          offsetY = (sCy >= lCy ? overlapY : -overlapY) + 10;
        }

        const updatedNodes = newState.diagrams[smaller.childDiagramId].nodes.map((n) => ({
          ...n,
          position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
        }));
        newState = {
          ...newState,
          diagrams: {
            ...newState.diagrams,
            [smaller.childDiagramId]: {
              ...newState.diagrams[smaller.childDiagramId],
              nodes: updatedNodes,
            },
          },
        };
        smaller.nodes = updatedNodes;
      }
    }
    if (!changed) break;
  }

  return newState;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export function addNode(node: C4Node): void {
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    current.nodes = [...current.nodes, node];
    const newState: DiagramState = { ...s, pendingNodeType: null, selectedId: node.id };
    return resolveBoundaryOverlaps(newState);
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
  const normalized: C4Edge = {
    markerStart: 'none',
    markerEnd: 'arrow',
    lineStyle: 'solid',
    waypoints: [],
    ...edge,
  };
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    current.edges = [...current.edges, normalized];
    return { ...s, selectedId: normalized.id };
  });
}

export function addEdgeToDiagram(diagramId: string, edge: C4Edge): void {
  const normalized: C4Edge = {
    markerStart: 'none',
    markerEnd: 'arrow',
    lineStyle: 'solid',
    waypoints: [],
    ...edge,
  };
  diagramStore.update((s) => {
    const diagram = s.diagrams[diagramId];
    if (!diagram) return s;
    diagram.edges = [...diagram.edges, normalized];
    return { ...s, selectedId: normalized.id };
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
      focusedParentNodeId: nodeId,
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
      focusedParentNodeId: null,
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
      focusedParentNodeId: null,
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
    // Resolve node overlaps for each moved node
    for (const { id } of updates) {
      if (current.nodes.some((n) => n.id === id)) {
        current.nodes = resolveNodeOverlaps(id, current.nodes);
      }
    }
    let newState = { ...s };
    newState = resolveBoundaryOverlaps(newState);
    return newState;
  });
}
