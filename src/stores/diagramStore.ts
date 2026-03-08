import { writable, derived } from 'svelte/store';
import type {
  DiagramState,
  DiagramLevel,
  C4Node,
  C4Edge,
  C4LevelType,
  BoundaryGroup,
  Annotation,
  PaletteItemType,
} from '../types';
import { remapIds } from '../utils/remapIds';
import {
  SCHEMA_VERSION,
} from '../utils/constants';
import {
  computeBoundingBox, resolveNodeOverlaps,
  childTypeIsValid, resolveBoundaryOverlaps, collectDescendants,
} from './diagramLayout';
import { LEVEL_ORDER, LEVEL_LABELS, prevLevel } from './diagramNavigation';

export { SCHEMA_VERSION };

// Re-export navigation helpers for backward compatibility
export { LEVEL_ORDER, LEVEL_LABELS, nextLevel, prevLevel, drillDown, drillUp, navigateTo } from './diagramNavigation';
// Re-export layout helpers for backward compatibility
export { computeNodeHeight } from './diagramLayout';

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

export const currentDiagram  = derived(diagramStore, ($s) => $s.levels[$s.currentLevel]);
export const breadcrumbs     = derived(diagramStore, ($s) => getBreadcrumbPath($s));
export const selectedId      = derived(diagramStore, ($s) => $s.selectedId);
export const pendingNodeType = derived(diagramStore, ($s) => $s.pendingNodeType);
export const isAtRoot        = derived(diagramStore, ($s) => $s.currentLevel === 'context');

export const parentLevel = derived(diagramStore, ($s): DiagramLevel | null => {
  const prev = prevLevel($s.currentLevel);
  return prev ? $s.levels[prev] : null;
});

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
export interface SelectedNodeResult { type: 'node'; node: C4Node; level: C4LevelType }
export interface SelectedEdgeResult { type: 'edge'; edge: C4Edge; level: C4LevelType }
export interface SelectedAnnotationResult { type: 'annotation'; annotation: Annotation; level: C4LevelType }
export type SelectedElementResult = SelectedNodeResult | SelectedEdgeResult | SelectedAnnotationResult;

export const selectedElement = derived(diagramStore, ($s): SelectedElementResult | null => {
  const id = $s.selectedId;
  if (!id) return null;

  const current = $s.levels[$s.currentLevel];

  const annotation = current.annotations?.find((a) => a.id === id);
  if (annotation) return { type: 'annotation', annotation, level: $s.currentLevel };

  const node = current.nodes.find((n) => n.id === id);
  if (node) return { type: 'node', node, level: $s.currentLevel };

  const edge = current.edges.find((e) => e.id === id);
  if (edge) return { type: 'edge', edge, level: $s.currentLevel };

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
