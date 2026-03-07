import { writable, derived, get } from 'svelte/store';
import type { DiagramState, DiagramLevel, C4Node, C4Edge, C4NodeType, C4LevelType, BoundaryGroup, Annotation, AnnotationType, PaletteItemType } from '../types';
import { generateId } from '../utils/id';
import { remapIds } from '../utils/remapIds';
import {
  NODE_DEFAULT_WIDTH,
  NODE_DEFAULT_HEIGHT,
  BOUNDARY_PADDING,
  BOUNDARY_MIN_WIDTH,
  BOUNDARY_MIN_HEIGHT,
  SCHEMA_VERSION,
  UML_NODE_HEIGHT_BASE,
  UML_MEMBER_ROW_HEIGHT,
  UML_COMPARTMENT_OVERHEAD,
} from '../utils/constants';

export { SCHEMA_VERSION };

const ROOT_DIAGRAM_ID = 'root';

export function createInitialDiagramState(): DiagramState {
  const rootDiagram: DiagramLevel = {
    id: ROOT_DIAGRAM_ID,
    level: 'context',
    label: 'System Context',
    nodes: [],
    edges: [],
    annotations: [],
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

export const diagramStore = writable<DiagramState>(createInitialDiagramState());

// ─── Selectors ────────────────────────────────────────────────────────────────

export function getCurrentDiagram(state: DiagramState): DiagramLevel {
  const id = state.navigationStack[state.navigationStack.length - 1] ?? state.rootId;
  return state.diagrams[id] as DiagramLevel;
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
export const rootDiagramId = derived(diagramStore, ($s) => $s.rootId);
export const isAtRoot = derived(
  diagramStore,
  ($s) => $s.navigationStack.length === 1
);

/** UML node types whose height grows with member count */
const UML_CLASS_TYPES = new Set<C4NodeType>([
  'class', 'abstract-class', 'interface', 'enum', 'record',
]);

/** ERD node types whose height grows with column count */
const ERD_NODE_TYPES = new Set<C4NodeType>(['erd-table', 'erd-view']);

/**
 * Estimate the rendered pixel height of a C4Node.
 *
 * For non-UML types this is NODE_DEFAULT_HEIGHT (fixed-height cards).
 * For UML class-node types the height depends on the number of members:
 *   - A base header height (UML_NODE_HEIGHT_BASE) for the header compartment
 *   - One UML_COMPARTMENT_OVERHEAD per visible compartment (attributes / operations)
 *   - One UML_MEMBER_ROW_HEIGHT per member row within those compartments
 *
 * Enum nodes never show an operations compartment (matching UmlClassNode.svelte).
 *
 * Exported so it can be tested directly.
 */
export function computeNodeHeight(node: C4Node): number {
  if (ERD_NODE_TYPES.has(node.type)) {
    const columns = node.columns ?? [];
    return (
      UML_NODE_HEIGHT_BASE +
      (columns.length > 0
        ? UML_COMPARTMENT_OVERHEAD + columns.length * UML_MEMBER_ROW_HEIGHT
        : 0)
    );
  }

  if (!UML_CLASS_TYPES.has(node.type)) return NODE_DEFAULT_HEIGHT;

  const members = node.members ?? [];
  const attributes = members.filter((m) => m.kind === 'attribute');
  const operations = members.filter((m) => m.kind === 'operation');

  const hasAttributes = attributes.length > 0;
  // Enums suppress the operations compartment (matches UmlClassNode.svelte isEnum guard)
  const hasOperations = node.type !== 'enum' && operations.length > 0;

  return (
    UML_NODE_HEIGHT_BASE +
    (hasAttributes ? UML_COMPARTMENT_OVERHEAD + attributes.length * UML_MEMBER_ROW_HEIGHT : 0) +
    (hasOperations ? UML_COMPARTMENT_OVERHEAD + operations.length * UML_MEMBER_ROW_HEIGHT : 0)
  );
}

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
  const maxY = Math.max(...childNodes.map((n) => n.position.y + computeNodeHeight(n)));
  return {
    x: minX - BOUNDARY_PADDING,
    y: minY - BOUNDARY_PADDING,
    width: Math.max(maxX - minX + BOUNDARY_PADDING * 2, BOUNDARY_MIN_WIDTH),
    height: Math.max(maxY - minY + BOUNDARY_PADDING * 2, BOUNDARY_MIN_HEIGHT),
  };
}

export const parentDiagram = derived(diagramStore, ($s): DiagramLevel | null => {
  if ($s.navigationStack.length <= 1) return null;
  const parentId = $s.navigationStack[$s.navigationStack.length - 2] ?? '';
  return $s.diagrams[parentId] ?? null;
});

export const contextBoundaries = derived(diagramStore, ($s): BoundaryGroup[] => {
  if ($s.navigationStack.length <= 1) return [];
  const parentDiagramId = $s.navigationStack[$s.navigationStack.length - 2] ?? '';
  const currentDiagramId = $s.navigationStack[$s.navigationStack.length - 1] ?? '';
  const parentDiagram = $s.diagrams[parentDiagramId];
  if (!parentDiagram) return [];

  return parentDiagram.nodes
    .filter((n) => n.childDiagramId !== undefined)
    .map((n) => {
      const childDiagram = $s.diagrams[n.childDiagramId!];
      const childNodes = childDiagram?.nodes ?? [];
      const boundingBox = computeBoundingBox(childNodes, n.position);
      return {
        parentNodeId: n.id,
        parentLabel: n.label,
        childNodes,
        boundingBox,
        childDiagramId: n.childDiagramId!,
      };
    });
});

/** Resolved selection: finds the selected node, edge, or annotation across visible diagrams */
export interface SelectedNodeResult { type: 'node'; node: C4Node; diagramId: string }
export interface SelectedEdgeResult { type: 'edge'; edge: C4Edge; diagramId: string }
export interface SelectedAnnotationResult { type: 'annotation'; annotation: Annotation; diagramId: string }
export type SelectedElementResult = SelectedNodeResult | SelectedEdgeResult | SelectedAnnotationResult;

/**
 * Returns the diagram ID where annotations are read and written for the current view.
 * Annotations are level-scoped — they always live on the currently active diagram,
 * exactly like C4 nodes. This means drilling in or out switches to a different
 * annotation set, so each level has its own independent annotations.
 */
export function getAnnotationDiagramId(state: DiagramState): string {
  return state.navigationStack[state.navigationStack.length - 1] ?? state.rootId;
}

export const selectedElement = derived(diagramStore, ($s): SelectedElementResult | null => {
  const id = $s.selectedId;
  if (!id) return null;

  const current = getCurrentDiagram($s);

  // Check annotations first (they live on the annotation diagram for this view)
  const annotDiagramId = getAnnotationDiagramId($s);
  const annotDiagram = $s.diagrams[annotDiagramId];
  const annotation = annotDiagram?.annotations?.find((a) => a.id === id);
  if (annotation) return { type: 'annotation', annotation, diagramId: annotDiagramId };

  // Check current diagram nodes/edges
  const node = current.nodes.find((n) => n.id === id);
  if (node) return { type: 'node', node, diagramId: current.id };
  const edge = current.edges.find((e) => e.id === id);
  if (edge) return { type: 'edge', edge, diagramId: current.id };

  // Check sibling diagrams (for context nodes) and parent edges
  if ($s.navigationStack.length > 1) {
    const parentDiagramId = $s.navigationStack[$s.navigationStack.length - 2] ?? '';
    const parentDiagram = $s.diagrams[parentDiagramId];
    if (parentDiagram) {
      // Check parent diagram nodes themselves (e.g. boundary parent nodes)
      const parentNode = parentDiagram.nodes.find((n) => n.id === id);
      if (parentNode) return { type: 'node', node: parentNode, diagramId: parentDiagramId };

      for (const pNode of parentDiagram.nodes) {
        if (pNode.childDiagramId && pNode.childDiagramId !== current.id) {
          const siblingDiagram = $s.diagrams[pNode.childDiagramId];
          if (siblingDiagram) {
            const sibNode = siblingDiagram.nodes.find((n) => n.id === id);
            if (sibNode) return { type: 'node', node: sibNode, diagramId: siblingDiagram.id };
            const sibEdge = siblingDiagram.edges.find((e) => e.id === id);
            if (sibEdge) return { type: 'edge', edge: sibEdge, diagramId: siblingDiagram.id };
          }
        }
      }
      // Cross-group edges live on the parent diagram
      const parentEdge = parentDiagram.edges.find((e) => e.id === id);
      if (parentEdge) return { type: 'edge', edge: parentEdge, diagramId: parentDiagramId };
    }
  }

  return null;
});

// ─── Immutable update helpers ─────────────────────────────────────────────────

/** Immutably replace a diagram inside a DiagramState */
function withDiagram(
  state: DiagramState,
  diagramId: string,
  updater: (diagram: DiagramLevel) => DiagramLevel
): DiagramState {
  const diagram = state.diagrams[diagramId];
  if (!diagram) return state;
  return {
    ...state,
    diagrams: {
      ...state.diagrams,
      [diagramId]: updater(diagram),
    },
  };
}

/** Immutably replace the current (active) diagram */
function withCurrentDiagram(
  state: DiagramState,
  updater: (diagram: DiagramLevel) => DiagramLevel
): DiagramState {
  const id = state.navigationStack[state.navigationStack.length - 1] ?? state.rootId;
  return withDiagram(state, id, updater);
}

export function updateNodeInDiagram(diagramId: string, nodeId: string, patch: Partial<C4Node>): void {
  diagramStore.update((s) =>
    withDiagram(s, diagramId, (d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    }))
  );
}

export function updateEdgeInDiagram(diagramId: string, edgeId: string, patch: Partial<C4Edge>): void {
  diagramStore.update((s) =>
    withDiagram(s, diagramId, (d) => ({
      ...d,
      edges: d.edges.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)),
    }))
  );
}

export function deleteNodeFromDiagram(diagramId: string, nodeId: string): void {
  diagramStore.update((s) => {
    const diagram = s.diagrams[diagramId];
    if (!diagram) return s;
    const node = diagram.nodes.find((n) => n.id === nodeId);
    const diagrams: DiagramState['diagrams'] = { ...s.diagrams };
    if (node?.childDiagramId) {
      delete diagrams[node.childDiagramId];
    }
    diagrams[diagramId] = {
      ...diagram,
      nodes: diagram.nodes.filter((n) => n.id !== nodeId),
      edges: diagram.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    };
    return {
      ...s,
      diagrams,
      selectedId: s.selectedId === nodeId ? null : s.selectedId,
    };
  });
}

export function deleteEdgeFromDiagram(diagramId: string, edgeId: string): void {
  diagramStore.update((s) =>
    withDiagram({ ...s, selectedId: s.selectedId === edgeId ? null : s.selectedId }, diagramId, (d) => ({
      ...d,
      edges: d.edges.filter((e) => e.id !== edgeId),
    }))
  );
}

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
        const ni = result[i]!;
        const nj = result[j]!;
        if (!nodesOverlap(ni, nj)) continue;
        changed = true;
        // The moved node is highest priority (never pushed); otherwise push j away from i
        if (nj.id === movedNodeId) {
          result[i] = pushNodeAway(nj, ni);
        } else {
          result[j] = pushNodeAway(ni, nj);
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
  const parentDiagramId = state.navigationStack[state.navigationStack.length - 2] ?? '';
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
        const a = groups[i]!;
        const b = groups[j]!;
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

        const smallerDiagram = newState.diagrams[smaller.childDiagramId]!;
        const updatedNodes = smallerDiagram.nodes.map((n) => ({
          ...n,
          position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
        }));
        newState = {
          ...newState,
          diagrams: {
            ...newState.diagrams,
            [smaller.childDiagramId]: {
              ...smallerDiagram,
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
    const newState = withCurrentDiagram(s, (d) => ({ ...d, nodes: [...d.nodes, node] }));
    return resolveBoundaryOverlaps({ ...newState, selectedId: node.id });
  });
}

export function addNodeToDiagram(diagramId: string, node: C4Node): void {
  diagramStore.update((s) => {
    if (!s.diagrams[diagramId]) return s;
    const newState = withDiagram(s, diagramId, (d) => ({ ...d, nodes: [...d.nodes, node] }));
    return resolveBoundaryOverlaps({ ...newState, selectedId: node.id });
  });
}

export function updateNode(nodeId: string, patch: Partial<C4Node>): void {
  diagramStore.update((s) =>
    withCurrentDiagram(s, (d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    }))
  );
}

export function deleteNode(nodeId: string): void {
  diagramStore.update((s) => {
    const currentId = s.navigationStack[s.navigationStack.length - 1] ?? s.rootId;
    const current = s.diagrams[currentId];
    if (!current) return s;
    const node = current.nodes.find((n) => n.id === nodeId);
    const diagrams: DiagramState['diagrams'] = {
      ...s.diagrams,
      [currentId]: {
        ...current,
        nodes: current.nodes.filter((n) => n.id !== nodeId),
        edges: current.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      },
    };
    // Remove child diagram if present
    if (node?.childDiagramId) {
      delete diagrams[node.childDiagramId];
    }
    return {
      ...s,
      diagrams,
      selectedId: s.selectedId === nodeId ? null : s.selectedId,
    };
  });
}

function normalizeEdge(edge: C4Edge): C4Edge {
  return {
    markerStart: 'none',
    markerEnd: 'arrow',
    lineStyle: 'solid',
    lineType: 'bezier',
    waypoints: [],
    ...edge,
  };
}

export function addEdge(edge: C4Edge): void {
  const normalized = normalizeEdge(edge);
  diagramStore.update((s) => {
    const newState = withCurrentDiagram(s, (d) => ({ ...d, edges: [...d.edges, normalized] }));
    return { ...newState, selectedId: normalized.id };
  });
}

export function addEdgeToDiagram(diagramId: string, edge: C4Edge): void {
  const normalized = normalizeEdge(edge);
  diagramStore.update((s) => {
    if (!s.diagrams[diagramId]) return s;
    const newState = withDiagram(s, diagramId, (d) => ({ ...d, edges: [...d.edges, normalized] }));
    return { ...newState, selectedId: normalized.id };
  });
}

export function updateEdge(edgeId: string, patch: Partial<C4Edge>): void {
  diagramStore.update((s) =>
    withCurrentDiagram(s, (d) => ({
      ...d,
      edges: d.edges.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)),
    }))
  );
}

export function deleteEdge(edgeId: string): void {
  diagramStore.update((s) => {
    const newState = withCurrentDiagram(s, (d) => ({
      ...d,
      edges: d.edges.filter((e) => e.id !== edgeId),
    }));
    return { ...newState, selectedId: s.selectedId === edgeId ? null : s.selectedId };
  });
}

/**
 * Maps a drillable C4 node type to its child level type.
 * Returns undefined for node types that are not drillable (UML class and ERD
 * types — they expose their structure natively via member/column lists).
 */
function childLevelFor(nodeType: C4NodeType): C4LevelType | undefined {
  const map: Partial<Record<C4NodeType, C4LevelType>> = {
    person: 'component',
    'external-person': 'component',
    system: 'container',
    'external-system': 'container',
    container: 'component',
    database: 'code',
    component: 'code',
    // class, abstract-class, interface, enum, record, erd-table, erd-view
    // are intentionally absent — they are not drillable.
  };
  return map[nodeType];
}

export function createChildDiagram(nodeId: string): string {
  const childId = generateId();
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    const node = current.nodes.find((n) => n.id === nodeId);
    if (!node) return s;
    const childLevel = childLevelFor(node.type);
    if (!childLevel) return s; // node type is not drillable
    const childDiagram: DiagramLevel = {
      id: childId,
      level: childLevel,
      label: node.label,
      nodes: [],
      edges: [],
      annotations: [],
    };
    // First update the node's childDiagramId in the current diagram
    const updatedState = withCurrentDiagram(s, (d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === nodeId ? { ...n, childDiagramId: childId } : n)),
    }));
    // Then add the new child diagram (using updatedState.diagrams to preserve the patched node)
    return {
      ...updatedState,
      diagrams: { ...updatedState.diagrams, [childId]: childDiagram },
    };
  });
  return childId;
}

export function drillDown(nodeId: string): void {
  diagramStore.update((s) => {
    const current = getCurrentDiagram(s);
    const node = current.nodes.find((n) => n.id === nodeId);
    if (!node) return s;

    // UML class and ERD node types are not drillable — they surface their
    // structure directly on the node via member/column lists.
    const childLevel = childLevelFor(node.type);
    if (!childLevel) return s;

    let newState = s;
    let childId = node.childDiagramId;

    if (!childId) {
      childId = generateId();
      const childDiagram: DiagramLevel = {
        id: childId,
        level: childLevel,
        label: node.label,
        nodes: [],
        edges: [],
        annotations: [],
      };
      // Patch the node first, then add the child diagram entry
      const updatedState = withCurrentDiagram(s, (d) => ({
        ...d,
        nodes: d.nodes.map((n) => (n.id === nodeId ? { ...n, childDiagramId: childId } : n)),
      }));
      newState = {
        ...updatedState,
        diagrams: { ...updatedState.diagrams, [childId]: childDiagram },
      };
    }

    return {
      ...newState,
      navigationStack: [...newState.navigationStack, childId],
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

/** X offset applied to imported nodes/annotations to avoid immediate overlap */
const MERGE_OFFSET_X = 200;

/**
 * Merges the root-level content of an imported DiagramState into the currently
 * active diagram level. All IDs in the imported state are remapped to fresh ones
 * before merging to prevent collisions. Child diagram levels from the imported
 * file are preserved and remain drillable.
 */
export function mergeImportedDiagram(imported: DiagramState): void {
  const remapped = remapIds(imported);
  const importedRoot = remapped.diagrams[remapped.rootId];
  if (!importedRoot) return;

  diagramStore.update((s) => {
    const currentId = s.navigationStack[s.navigationStack.length - 1] ?? s.rootId;
    const current = s.diagrams[currentId];
    if (!current) return s;

    // Offset imported nodes/annotations so they don't land on top of existing content
    const offsetNodes = importedRoot.nodes.map((n) => ({
      ...n,
      position: { x: n.position.x + MERGE_OFFSET_X, y: n.position.y },
    }));
    const offsetAnnotations = (importedRoot.annotations ?? []).map((a) => ({
      ...a,
      position: { x: a.position.x + MERGE_OFFSET_X, y: a.position.y },
    }));

    // Merge root-level content into the current level
    const mergedCurrent: DiagramLevel = {
      ...current,
      nodes: [...current.nodes, ...offsetNodes],
      edges: [...current.edges, ...importedRoot.edges],
      annotations: [...(current.annotations ?? []), ...offsetAnnotations],
    };

    // Collect all non-root levels from the imported state (child diagrams)
    const childLevels: DiagramState['diagrams'] = {};
    for (const [id, level] of Object.entries(remapped.diagrams)) {
      if (id !== remapped.rootId) childLevels[id] = level;
    }

    return {
      ...s,
      diagrams: {
        ...s.diagrams,
        ...childLevels,
        [currentId]: mergedCurrent,
      },
    };
  });
}

export function resetDiagram(): void {
  diagramStore.set(createInitialDiagramState());
}

export function setSelected(id: string | null): void {
  diagramStore.update((s) => ({ ...s, selectedId: id }));
}

export function setPendingNodeType(type: PaletteItemType | null): void {
  diagramStore.update((s) => ({ ...s, pendingNodeType: type }));
}

export function updateNodePositions(updates: Array<{ id: string; position: { x: number; y: number } }>): void {
  diagramStore.update((s) => {
    const posMap = new Map(updates.map((u) => [u.id, u.position]));
    // Apply position updates immutably then resolve overlaps
    let newState = withCurrentDiagram(s, (d) => ({
      ...d,
      nodes: d.nodes.map((n) => (posMap.has(n.id) ? { ...n, position: posMap.get(n.id)! } : n)),
    }));
    // Resolve node overlaps for each moved node
    const currentId = s.navigationStack[s.navigationStack.length - 1] ?? s.rootId;
    for (const { id } of updates) {
      const nodes = newState.diagrams[currentId]?.nodes ?? [];
      if (nodes.some((n) => n.id === id)) {
        newState = withDiagram(newState, currentId, (d) => ({
          ...d,
          nodes: resolveNodeOverlaps(id, d.nodes),
        }));
      }
    }
    return resolveBoundaryOverlaps(newState);
  });
}

export function updateNodePositionsInDiagram(
  diagramId: string,
  updates: Array<{ id: string; position: { x: number; y: number } }>
): void {
  diagramStore.update((s) => {
    if (!s.diagrams[diagramId]) return s;
    const posMap = new Map(updates.map((u) => [u.id, u.position]));
    const newState = withDiagram(s, diagramId, (d) => ({
      ...d,
      nodes: d.nodes.map((n) => (posMap.has(n.id) ? { ...n, position: posMap.get(n.id)! } : n)),
    }));
    return resolveBoundaryOverlaps(newState);
  });
}

// ─── Annotation actions ───────────────────────────────────────────────────────

/**
 * Add an annotation to the diagram that is currently visible to the user.
 * At root: adds to the root diagram.
 * When drilled in: adds to the parent diagram (the level the user sees the canvas of).
 */
export function addAnnotation(annotation: Annotation): void {
  diagramStore.update((s) => {
    const diagramId = getAnnotationDiagramId(s);
    if (!s.diagrams[diagramId]) return s;
    return {
      ...withDiagram(s, diagramId, (d) => ({
        ...d,
        annotations: [...(d.annotations ?? []), annotation],
      })),
      selectedId: annotation.id,
    };
  });
}

export function updateAnnotation(diagramId: string, annotationId: string, patch: Partial<Annotation>): void {
  diagramStore.update((s) =>
    withDiagram(s, diagramId, (d) => ({
      ...d,
      annotations: (d.annotations ?? []).map((a) => (a.id === annotationId ? { ...a, ...patch } : a)),
    }))
  );
}

export function deleteAnnotation(diagramId: string, annotationId: string): void {
  diagramStore.update((s) => ({
    ...withDiagram(s, diagramId, (d) => ({
      ...d,
      annotations: (d.annotations ?? []).filter((a) => a.id !== annotationId),
    })),
    selectedId: s.selectedId === annotationId ? null : s.selectedId,
  }));
}

export function updateAnnotationPositions(
  diagramId: string,
  updates: Array<{ id: string; position: { x: number; y: number } }>
): void {
  const posMap = new Map(updates.map((u) => [u.id, u.position]));
  diagramStore.update((s) =>
    withDiagram(s, diagramId, (d) => ({
      ...d,
      annotations: (d.annotations ?? []).map((a) =>
        posMap.has(a.id) ? { ...a, position: posMap.get(a.id)! } : a
      ),
    }))
  );
}
