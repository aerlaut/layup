import { writable, derived, get } from 'svelte/store';
import type {
  DiagramState,
  DiagramLevel,
  C4Node,
  C4Edge,
  C4NodeType,
  C4LevelType,
  BoundaryGroup,
  Annotation,
  PaletteItemType,
} from '../types';
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

// ─── Level order helpers ──────────────────────────────────────────────────────

export const LEVEL_ORDER: C4LevelType[] = ['context', 'container', 'component', 'code'];

export const LEVEL_LABELS: Record<C4LevelType, string> = {
  context:   'Context',
  container: 'Container',
  component: 'Component',
  code:      'Code',
};

export function nextLevel(level: C4LevelType): C4LevelType | undefined {
  const idx = LEVEL_ORDER.indexOf(level);
  return LEVEL_ORDER[idx + 1];
}

export function prevLevel(level: C4LevelType): C4LevelType | undefined {
  const idx = LEVEL_ORDER.indexOf(level);
  return idx > 0 ? LEVEL_ORDER[idx - 1] : undefined;
}

// ─── Initial state ────────────────────────────────────────────────────────────

function makeEmptyLevel(level: C4LevelType): DiagramLevel {
  return { level, nodes: [], edges: [], annotations: [] };
}

export function createInitialDiagramState(): DiagramState {
  return {
    version: SCHEMA_VERSION,
    levels: {
      context:   makeEmptyLevel('context'),
      container: makeEmptyLevel('container'),
      component: makeEmptyLevel('component'),
      code:      makeEmptyLevel('code'),
    },
    currentLevel: 'context',
    selectedId: null,
    pendingNodeType: null,
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const diagramStore = writable<DiagramState>(createInitialDiagramState());

// ─── Selectors ────────────────────────────────────────────────────────────────

export function getCurrentLevel(state: DiagramState): DiagramLevel {
  return state.levels[state.currentLevel];
}

export interface BreadcrumbItem {
  level: C4LevelType;
  label: string;
}

export function getBreadcrumbPath(state: DiagramState): BreadcrumbItem[] {
  const idx = LEVEL_ORDER.indexOf(state.currentLevel);
  return LEVEL_ORDER.slice(0, idx + 1).map((l) => ({ level: l, label: LEVEL_LABELS[l] }));
}

// ─── Derived stores ───────────────────────────────────────────────────────────

export const currentDiagram = derived(diagramStore, ($s) => $s.levels[$s.currentLevel]);
export const breadcrumbs    = derived(diagramStore, ($s) => getBreadcrumbPath($s));
export const selectedId     = derived(diagramStore, ($s) => $s.selectedId);
export const pendingNodeType = derived(diagramStore, ($s) => $s.pendingNodeType);
export const isAtRoot       = derived(diagramStore, ($s) => $s.currentLevel === 'context');

export const parentLevel = derived(diagramStore, ($s): DiagramLevel | null => {
  const prev = prevLevel($s.currentLevel);
  return prev ? $s.levels[prev] : null;
});

/** UML node types whose height grows with member count */
const UML_CLASS_TYPES = new Set<C4NodeType>([
  'class', 'abstract-class', 'interface', 'enum', 'record',
]);

/** ERD node types whose height grows with column count */
const ERD_NODE_TYPES = new Set<C4NodeType>(['erd-table', 'erd-view']);

/**
 * Estimate the rendered pixel height of a C4Node.
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

/**
 * Returns true when it makes sense for a node of parentType to have children
 * at childLevel. Replaces the old childLevelFor map.
 */
function childTypeIsValid(parentType: C4NodeType, childLevel: C4LevelType): boolean {
  const map: Partial<Record<C4NodeType, C4LevelType>> = {
    system:            'container',
    'external-system': 'container',
    container:         'component',
    database:          'component',
    'db-schema':       'code',
    component:         'code',
  };
  return map[parentType] === childLevel;
}

export const contextBoundaries = derived(diagramStore, ($s): BoundaryGroup[] => {
  const prev = prevLevel($s.currentLevel);
  if (!prev) return []; // at context level — no boundaries

  const parentLevelData  = $s.levels[prev];
  const currentLevelData = $s.levels[$s.currentLevel];

  const drillableParents = parentLevelData.nodes.filter(
    (n) => childTypeIsValid(n.type, $s.currentLevel)
  );

  return drillableParents.map((parentNode) => {
    const childNodes = currentLevelData.nodes.filter(
      (n) => n.parentNodeId === parentNode.id
    );
    const boundingBox = computeBoundingBox(childNodes, parentNode.position);
    return {
      parentNodeId: parentNode.id,
      parentLabel: parentNode.label,
      childNodes,
      boundingBox,
    };
  });
});

/** Resolved selection: finds the selected node, edge, or annotation in the current level */
export interface SelectedNodeResult { type: 'node'; node: C4Node; diagramId: C4LevelType }
export interface SelectedEdgeResult { type: 'edge'; edge: C4Edge; diagramId: C4LevelType }
export interface SelectedAnnotationResult { type: 'annotation'; annotation: Annotation; diagramId: C4LevelType }
export type SelectedElementResult = SelectedNodeResult | SelectedEdgeResult | SelectedAnnotationResult;

export const selectedElement = derived(diagramStore, ($s): SelectedElementResult | null => {
  const id = $s.selectedId;
  if (!id) return null;

  const current = $s.levels[$s.currentLevel];

  const annotation = current.annotations?.find((a) => a.id === id);
  if (annotation) return { type: 'annotation', annotation, diagramId: $s.currentLevel };

  const node = current.nodes.find((n) => n.id === id);
  if (node) return { type: 'node', node, diagramId: $s.currentLevel };

  const edge = current.edges.find((e) => e.id === id);
  if (edge) return { type: 'edge', edge, diagramId: $s.currentLevel };

  return null;
});

// ─── Immutable update helpers ─────────────────────────────────────────────────

function withLevel(
  state: DiagramState,
  level: C4LevelType,
  updater: (diagram: DiagramLevel) => DiagramLevel
): DiagramState {
  return {
    ...state,
    levels: {
      ...state.levels,
      [level]: updater(state.levels[level]),
    },
  };
}

function withCurrentLevel(
  state: DiagramState,
  updater: (diagram: DiagramLevel) => DiagramLevel
): DiagramState {
  return withLevel(state, state.currentLevel, updater);
}

// ─── Overlap prevention ───────────────────────────────────────────────────────

function nodesOverlap(a: C4Node, b: C4Node): boolean {
  return (
    a.position.x < b.position.x + NODE_DEFAULT_WIDTH &&
    a.position.x + NODE_DEFAULT_WIDTH > b.position.x &&
    a.position.y < b.position.y + NODE_DEFAULT_HEIGHT &&
    a.position.y + NODE_DEFAULT_HEIGHT > b.position.y
  );
}

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
 * Resolve boundary overlaps at the current level.
 * Groups nodes by parentNodeId; shifts the smaller group away from the larger.
 */
function resolveBoundaryOverlaps(state: DiagramState): DiagramState {
  const prev = prevLevel(state.currentLevel);
  if (!prev) return state; // at context level, no boundaries to resolve

  const currentLevelData = state.levels[state.currentLevel];
  const parentLevelData  = state.levels[prev];

  type GroupInfo = {
    parentNodeId: string;
    nodes: C4Node[];
    bbox: ReturnType<typeof computeBoundingBox>;
  };

  const groups: GroupInfo[] = parentLevelData.nodes
    .filter((n) => childTypeIsValid(n.type, state.currentLevel))
    .map((n) => {
      const nodes = currentLevelData.nodes.filter((cn) => cn.parentNodeId === n.id);
      return { parentNodeId: n.id, nodes, bbox: computeBoundingBox(nodes, n.position) };
    });

  if (groups.length < 2) return state;

  const MAX_ITER = 10;
  let newNodes = [...currentLevelData.nodes];

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let changed = false;

    for (const g of groups) {
      g.nodes = newNodes.filter((n) => n.parentNodeId === g.parentNodeId);
      const parentNode = parentLevelData.nodes.find((n) => n.id === g.parentNodeId);
      g.bbox = computeBoundingBox(g.nodes, parentNode?.position ?? { x: 0, y: 0 });
    }

    for (let i = 0; i < groups.length - 1; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const a = groups[i]!;
        const b = groups[j]!;
        if (!bboxOverlap(a.bbox, b.bbox)) continue;
        changed = true;

        const smaller = a.nodes.length <= b.nodes.length ? a : b;
        const larger  = a.nodes.length <= b.nodes.length ? b : a;

        const sCx = smaller.bbox.x + smaller.bbox.width  / 2;
        const sCy = smaller.bbox.y + smaller.bbox.height / 2;
        const lCx = larger.bbox.x  + larger.bbox.width   / 2;
        const lCy = larger.bbox.y  + larger.bbox.height  / 2;
        const overlapX =
          Math.min(larger.bbox.x + larger.bbox.width,  smaller.bbox.x + smaller.bbox.width)  -
          Math.max(larger.bbox.x,  smaller.bbox.x);
        const overlapY =
          Math.min(larger.bbox.y + larger.bbox.height, smaller.bbox.y + smaller.bbox.height) -
          Math.max(larger.bbox.y,  smaller.bbox.y);

        let offsetX = 0;
        let offsetY = 0;
        if (overlapX <= overlapY) {
          offsetX = (sCx >= lCx ? overlapX : -overlapX) + 10;
        } else {
          offsetY = (sCy >= lCy ? overlapY : -overlapY) + 10;
        }

        const smallerIds = new Set(smaller.nodes.map((n) => n.id));
        newNodes = newNodes.map((n) =>
          smallerIds.has(n.id)
            ? { ...n, position: { x: n.position.x + offsetX, y: n.position.y + offsetY } }
            : n
        );
        smaller.nodes = newNodes.filter((n) => n.parentNodeId === smaller.parentNodeId);
      }
    }
    if (!changed) break;
  }

  return withLevel(state, state.currentLevel, (d) => ({ ...d, nodes: newNodes }));
}

// ─── Cascade delete helper ────────────────────────────────────────────────────

/**
 * Collects all descendant node IDs across lower levels for a given root node.
 * Returns a Map<C4LevelType, Set<string>> of node IDs to delete at each level.
 */
function collectDescendants(
  state: DiagramState,
  rootNodeId: string,
  rootLevel: C4LevelType
): Map<C4LevelType, Set<string>> {
  const result = new Map<C4LevelType, Set<string>>();
  result.set(rootLevel, new Set([rootNodeId]));

  let parentIds = new Set([rootNodeId]);
  let level = nextLevel(rootLevel);

  while (level && parentIds.size > 0) {
    const children = state.levels[level].nodes.filter(
      (n) => n.parentNodeId && parentIds.has(n.parentNodeId)
    );
    if (children.length === 0) break;
    const childIds = new Set(children.map((n) => n.id));
    result.set(level, childIds);
    parentIds = childIds;
    level = nextLevel(level);
  }

  return result;
}

// ─── Node CRUD actions ────────────────────────────────────────────────────────

export function addNode(node: C4Node): void {
  diagramStore.update((s) => {
    const newState = withCurrentLevel(s, (d) => ({ ...d, nodes: [...d.nodes, node] }));
    return resolveBoundaryOverlaps({ ...newState, selectedId: node.id });
  });
}

export function updateNode(nodeId: string, patch: Partial<C4Node>): void {
  diagramStore.update((s) =>
    withCurrentLevel(s, (d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === nodeId ? { ...n, ...patch } : n)),
    }))
  );
}

export function deleteNode(nodeId: string): void {
  diagramStore.update((s) => {
    const toDelete = collectDescendants(s, nodeId, s.currentLevel);

    let newState = s;
    for (const [level, ids] of toDelete) {
      newState = withLevel(newState, level, (d) => ({
        ...d,
        nodes: d.nodes.filter((n) => !ids.has(n.id)),
        edges: d.edges.filter((e) => !ids.has(e.source) && !ids.has(e.target)),
      }));
    }
    return { ...newState, selectedId: s.selectedId === nodeId ? null : s.selectedId };
  });
}

// ─── Edge CRUD actions ────────────────────────────────────────────────────────

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
    const newState = withCurrentLevel(s, (d) => ({ ...d, edges: [...d.edges, normalized] }));
    return { ...newState, selectedId: normalized.id };
  });
}

export function updateEdge(edgeId: string, patch: Partial<C4Edge>): void {
  diagramStore.update((s) =>
    withCurrentLevel(s, (d) => ({
      ...d,
      edges: d.edges.map((e) => (e.id === edgeId ? { ...e, ...patch } : e)),
    }))
  );
}

export function deleteEdge(edgeId: string): void {
  diagramStore.update((s) => {
    const newState = withCurrentLevel(s, (d) => ({
      ...d,
      edges: d.edges.filter((e) => e.id !== edgeId),
    }));
    return { ...newState, selectedId: s.selectedId === edgeId ? null : s.selectedId };
  });
}

// ─── Position update actions ──────────────────────────────────────────────────

export function updateNodePositions(
  updates: Array<{ id: string; position: { x: number; y: number } }>
): void {
  diagramStore.update((s) => {
    const posMap = new Map(updates.map((u) => [u.id, u.position]));
    let newState = withCurrentLevel(s, (d) => ({
      ...d,
      nodes: d.nodes.map((n) => (posMap.has(n.id) ? { ...n, position: posMap.get(n.id)! } : n)),
    }));
    for (const { id } of updates) {
      newState = withCurrentLevel(newState, (d) => ({
        ...d,
        nodes: resolveNodeOverlaps(id, d.nodes),
      }));
    }
    return resolveBoundaryOverlaps(newState);
  });
}

/**
 * Update node positions in a specific level (used for boundary drag-translating
 * child nodes without changing currentLevel).
 */
export function updateNodePositionsInLevel(
  level: C4LevelType,
  updates: Array<{ id: string; position: { x: number; y: number } }>
): void {
  diagramStore.update((s) => {
    const posMap = new Map(updates.map((u) => [u.id, u.position]));
    const newState = withLevel(s, level, (d) => ({
      ...d,
      nodes: d.nodes.map((n) => (posMap.has(n.id) ? { ...n, position: posMap.get(n.id)! } : n)),
    }));
    return resolveBoundaryOverlaps(newState);
  });
}

// ─── Navigation actions ───────────────────────────────────────────────────────

export function drillDown(): void {
  diagramStore.update((s) => {
    const next = nextLevel(s.currentLevel);
    if (!next) return s;
    return { ...s, currentLevel: next, selectedId: null };
  });
}

export function drillUp(): void {
  diagramStore.update((s) => {
    const prev = prevLevel(s.currentLevel);
    if (!prev) return s;
    return { ...s, currentLevel: prev, selectedId: null };
  });
}

export function navigateTo(level: C4LevelType): void {
  diagramStore.update((s) => {
    if (!s.levels[level]) return s;
    return { ...s, currentLevel: level, selectedId: null };
  });
}

// ─── State management actions ─────────────────────────────────────────────────

export function loadDiagram(state: DiagramState): void {
  diagramStore.set(state);
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

// ─── Annotation actions ───────────────────────────────────────────────────────

export function addAnnotation(annotation: Annotation): void {
  diagramStore.update((s) => ({
    ...withCurrentLevel(s, (d) => ({
      ...d,
      annotations: [...(d.annotations ?? []), annotation],
    })),
    selectedId: annotation.id,
  }));
}

export function updateAnnotation(
  level: C4LevelType,
  annotationId: string,
  patch: Partial<Annotation>
): void {
  diagramStore.update((s) =>
    withLevel(s, level, (d) => ({
      ...d,
      annotations: (d.annotations ?? []).map((a) =>
        a.id === annotationId ? { ...a, ...patch } : a
      ),
    }))
  );
}

export function deleteAnnotation(level: C4LevelType, annotationId: string): void {
  diagramStore.update((s) => ({
    ...withLevel(s, level, (d) => ({
      ...d,
      annotations: (d.annotations ?? []).filter((a) => a.id !== annotationId),
    })),
    selectedId: s.selectedId === annotationId ? null : s.selectedId,
  }));
}

export function updateAnnotationPositions(
  level: C4LevelType,
  updates: Array<{ id: string; position: { x: number; y: number } }>
): void {
  const posMap = new Map(updates.map((u) => [u.id, u.position]));
  diagramStore.update((s) =>
    withLevel(s, level, (d) => ({
      ...d,
      annotations: (d.annotations ?? []).map((a) =>
        posMap.has(a.id) ? { ...a, position: posMap.get(a.id)! } : a
      ),
    }))
  );
}

// ─── Import/merge ─────────────────────────────────────────────────────────────

/** X offset applied to imported nodes/annotations to avoid immediate overlap */
const MERGE_OFFSET_X = 200;

/**
 * Merges all levels of an imported DiagramState into the corresponding levels
 * of the current state, with an X offset to avoid overlap. All IDs are
 * remapped to fresh ones before merging to prevent collisions.
 */
export function mergeImportedDiagram(imported: DiagramState): void {
  const remapped = remapIds(imported);

  diagramStore.update((s) => {
    let newState = s;
    for (const level of LEVEL_ORDER) {
      const importedLevel = remapped.levels[level];
      if (!importedLevel) continue;

      const offsetNodes = importedLevel.nodes.map((n) => ({
        ...n,
        position: { x: n.position.x + MERGE_OFFSET_X, y: n.position.y },
      }));
      const offsetAnnotations = (importedLevel.annotations ?? []).map((a) => ({
        ...a,
        position: { x: a.position.x + MERGE_OFFSET_X, y: a.position.y },
      }));

      newState = withLevel(newState, level, (d) => ({
        ...d,
        nodes:       [...d.nodes,       ...offsetNodes],
        edges:       [...d.edges,       ...importedLevel.edges],
        annotations: [...d.annotations, ...offsetAnnotations],
      }));
    }
    return newState;
  });
}
