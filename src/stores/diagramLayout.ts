import type { C4Node, C4NodeType, C4LevelType, DiagramState } from '../types';
import { UML_CLASS_TYPES, ERD_NODE_TYPES } from '../utils/nodeTypes';
import { prevLevel, nextLevel } from './diagramNavigation';
import {
  NODE_DEFAULT_WIDTH,
  NODE_DEFAULT_HEIGHT,
  BOUNDARY_PADDING,
  BOUNDARY_MIN_WIDTH,
  BOUNDARY_MIN_HEIGHT,
  UML_NODE_HEIGHT_BASE,
  UML_MEMBER_ROW_HEIGHT,
  UML_COMPARTMENT_OVERHEAD,
} from '../utils/constants';

// ─── Node height ──────────────────────────────────────────────────────────────

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

// ─── Bounding box ─────────────────────────────────────────────────────────────

export function computeBoundingBox(
  childNodes: C4Node[],
  fallbackPosition: { x: number; y: number },
  minSize?: { width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  const effectiveMinWidth = Math.max(BOUNDARY_MIN_WIDTH, minSize?.width ?? 0);
  const effectiveMinHeight = Math.max(BOUNDARY_MIN_HEIGHT, minSize?.height ?? 0);
  if (childNodes.length === 0) {
    return {
      x: fallbackPosition.x - BOUNDARY_PADDING,
      y: fallbackPosition.y - BOUNDARY_PADDING,
      width: effectiveMinWidth,
      height: effectiveMinHeight,
    };
  }
  const minX = Math.min(...childNodes.map((n) => n.position.x));
  const minY = Math.min(...childNodes.map((n) => n.position.y));
  const maxX = Math.max(...childNodes.map((n) => n.position.x)) + NODE_DEFAULT_WIDTH;
  const maxY = Math.max(...childNodes.map((n) => n.position.y + computeNodeHeight(n)));
  return {
    x: minX - BOUNDARY_PADDING,
    y: minY - BOUNDARY_PADDING,
    width: Math.max(maxX - minX + BOUNDARY_PADDING * 2, effectiveMinWidth),
    height: Math.max(maxY - minY + BOUNDARY_PADDING * 2, effectiveMinHeight),
  };
}

// ─── Node overlap resolution ──────────────────────────────────────────────────

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

export function resolveNodeOverlaps(movedNodeId: string, nodes: C4Node[]): C4Node[] {
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

export function bboxOverlap(
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

// ─── Domain: child type validity ──────────────────────────────────────────────

/**
 * Returns true when it makes sense for a node of parentType to have children
 * at childLevel.
 */
export function childTypeIsValid(parentType: C4NodeType, childLevel: C4LevelType): boolean {
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

// ─── Boundary overlap resolution ──────────────────────────────────────────────

/**
 * Resolve boundary overlaps at the current level.
 * Groups nodes by parentNodeId; shifts the smaller group away from the larger.
 */
export function resolveBoundaryOverlaps(state: DiagramState): DiagramState {
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
      return { parentNodeId: n.id, nodes, bbox: computeBoundingBox(nodes, n.boundaryPosition ?? n.position, n.boundarySize) };
    });

  if (groups.length < 2) return state;

  const MAX_ITER = 10;
  let newNodes = [...currentLevelData.nodes];
  let newParentNodes = [...parentLevelData.nodes];

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let changed = false;

    for (const g of groups) {
      g.nodes = newNodes.filter((n) => n.parentNodeId === g.parentNodeId);
      const parentNode = newParentNodes.find((n) => n.id === g.parentNodeId);
      g.bbox = computeBoundingBox(g.nodes, parentNode?.boundaryPosition ?? parentNode?.position ?? { x: 0, y: 0 }, parentNode?.boundarySize);
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

        if (smaller.nodes.length === 0) {
          // Empty group: shift its boundaryPosition on the parent node
          newParentNodes = newParentNodes.map((n) =>
            n.id === smaller.parentNodeId
              ? { ...n, boundaryPosition: { x: smaller.bbox.x + offsetX, y: smaller.bbox.y + offsetY } }
              : n
          );
          smaller.bbox = {
            ...smaller.bbox,
            x: smaller.bbox.x + offsetX,
            y: smaller.bbox.y + offsetY,
          };
        } else {
          const smallerIds = new Set(smaller.nodes.map((n) => n.id));
          newNodes = newNodes.map((n) =>
            smallerIds.has(n.id)
              ? { ...n, position: { x: n.position.x + offsetX, y: n.position.y + offsetY } }
              : n
          );
          smaller.nodes = newNodes.filter((n) => n.parentNodeId === smaller.parentNodeId);
        }
      }
    }
    if (!changed) break;
  }

  return {
    ...state,
    levels: {
      ...state.levels,
      [prev]: { ...state.levels[prev], nodes: newParentNodes },
      [state.currentLevel]: { ...state.levels[state.currentLevel], nodes: newNodes },
    },
  };
}

// ─── Cascade delete helper ────────────────────────────────────────────────────

/**
 * Collects all descendant node IDs across lower levels for a given root node.
 * Returns a Map<C4LevelType, Set<string>> of node IDs to delete at each level.
 */
export function collectDescendants(
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
