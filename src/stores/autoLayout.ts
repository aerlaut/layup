import ELK from 'elkjs/lib/elk.bundled.js';
import type { DiagramState } from '../types';
import { computeNodeHeight, childTypeIsValid, resolveBoundaryOverlaps } from './diagramLayout';
import { NODE_DEFAULT_WIDTH, BOUNDARY_PADDING } from '../utils/constants';
import { prevLevel } from './diagramNavigation';

export type LayoutDirection = 'right' | 'down';
export type LayoutStyle     = 'flow' | 'compact';
export type LayoutSpacing   = 'tight' | 'normal' | 'loose';

export interface LayoutOptions {
  direction: LayoutDirection;
  style:     LayoutStyle;
  spacing:   LayoutSpacing;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  direction: 'right',
  style:     'flow',
  spacing:   'normal',
};

const elk = new ELK();

const SPACING_PRESETS: Record<LayoutSpacing, { nodeNode: number; layerSpacing: number; padding: number }> = {
  tight:  { nodeNode: 20, layerSpacing: 30, padding: 20              },
  normal: { nodeNode: 30, layerSpacing: 50, padding: BOUNDARY_PADDING },
  loose:  { nodeNode: 50, layerSpacing: 80, padding: 60              },
};

const DIRECTION_MAP: Record<LayoutDirection, string> = {
  right: 'RIGHT',
  down:  'DOWN',
};

function paddingStr(p: number): string {
  return `[top=${p}, left=${p}, bottom=${p}, right=${p}]`;
}

export async function applyAutoLayout(state: DiagramState, options: LayoutOptions): Promise<DiagramState> {
  const levelData = state.levels[state.currentLevel];
  const { nodes, edges } = levelData;
  const sp = SPACING_PRESETS[options.spacing];

  // ── Context level: flat graph ────────────────────────────────────────────────
  if (state.currentLevel === 'context') {
    const graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': DIRECTION_MAP[options.direction],
        'elk.spacing.nodeNode': String(sp.nodeNode),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(sp.layerSpacing),
        'elk.padding': paddingStr(sp.padding),
      },
      children: nodes.map((n) => ({
        id: n.id,
        width: NODE_DEFAULT_WIDTH,
        height: computeNodeHeight(n),
      })),
      edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
    };

    const laid = await elk.layout(graph);
    const posMap = new Map<string, { x: number; y: number }>();
    for (const child of laid.children ?? []) {
      if (child.x !== undefined && child.y !== undefined) {
        posMap.set(child.id, { x: child.x, y: child.y });
      }
    }

    const updatedNodes = nodes.map((n) => {
      const pos = posMap.get(n.id);
      return pos ? { ...n, position: pos } : n;
    });

    return {
      ...state,
      levels: {
        ...state.levels,
        [state.currentLevel]: { ...levelData, nodes: updatedNodes },
      },
    };
  }

  // ── Boundary-group levels ────────────────────────────────────────────────────
  const prev = prevLevel(state.currentLevel);
  if (!prev) return state;

  const parentLevelData = state.levels[prev];
  const validParents = parentLevelData.nodes.filter((n) =>
    childTypeIsValid(n.type, state.currentLevel)
  );
  const validParentIds = new Set(validParents.map((n) => n.id));

  const orphanNodes = nodes.filter((n) => !n.parentNodeId || !validParentIds.has(n.parentNodeId));
  const childNodes  = nodes.filter((n) => n.parentNodeId && validParentIds.has(n.parentNodeId));

  // ── Flow style: compound layered layout ─────────────────────────────────────
  if (options.style === 'flow') {
    const parentElkNodes = validParents.map((parent) => ({
      id: parent.id,
      layoutOptions: { 'elk.padding': paddingStr(sp.padding) },
      children: childNodes
        .filter((n) => n.parentNodeId === parent.id)
        .map((n) => ({ id: n.id, width: NODE_DEFAULT_WIDTH, height: computeNodeHeight(n) })),
    }));

    const orphanElkNodes = orphanNodes.map((n) => ({
      id: n.id,
      width: NODE_DEFAULT_WIDTH,
      height: computeNodeHeight(n),
    }));

    const graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': DIRECTION_MAP[options.direction],
        'elk.spacing.nodeNode': String(sp.nodeNode),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(sp.layerSpacing),
        'elk.padding': paddingStr(sp.padding),
        'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      },
      children: [...parentElkNodes, ...orphanElkNodes],
      edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
    };

    const laid = await elk.layout(graph);

    const posMap = new Map<string, { x: number; y: number }>();
    for (const elkParent of laid.children ?? []) {
      if (elkParent.x === undefined || elkParent.y === undefined) continue;
      posMap.set(elkParent.id, { x: elkParent.x, y: elkParent.y });
      for (const elkChild of elkParent.children ?? []) {
        if (elkChild.x !== undefined && elkChild.y !== undefined) {
          posMap.set(elkChild.id, {
            x: elkParent.x + elkChild.x,
            y: elkParent.y + elkChild.y,
          });
        }
      }
    }

    const updatedNodes = nodes.map((n) => {
      const pos = posMap.get(n.id);
      return pos ? { ...n, position: pos } : n;
    });

    // Write back ELK-assigned positions for empty boundary groups
    const emptyGroupParentIds = new Set(
      validParents
        .filter((p) => !childNodes.some((n) => n.parentNodeId === p.id))
        .map((p) => p.id)
    );
    const updatedParentNodes = parentLevelData.nodes.map((n) => {
      if (!emptyGroupParentIds.has(n.id)) return n;
      const pos = posMap.get(n.id);
      return pos ? { ...n, boundaryPosition: pos } : n;
    });

    return {
      ...state,
      levels: {
        ...state.levels,
        [prev]: { ...parentLevelData, nodes: updatedParentNodes },
        [state.currentLevel]: { ...levelData, nodes: updatedNodes },
      },
    };
  }

  // ── Compact style: rectpacking per group ─────────────────────────────────────
  const updatedNodesMap = new Map(nodes.map((n) => [n.id, n]));

  for (const parent of validParents) {
    const children = childNodes.filter((n) => n.parentNodeId === parent.id);
    if (children.length === 0) continue;

    const graph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'rectpacking',
        'elk.spacing.nodeNode': String(sp.nodeNode),
        'elk.padding': paddingStr(sp.padding),
      },
      children: children.map((n) => ({
        id: n.id,
        width: NODE_DEFAULT_WIDTH,
        height: computeNodeHeight(n),
      })),
      edges: [] as { id: string; sources: string[]; targets: string[] }[],
    };

    const laid = await elk.layout(graph);
    const originX = parent.position.x + sp.padding;
    const originY = parent.position.y + sp.padding;

    for (const elkChild of laid.children ?? []) {
      if (elkChild.x === undefined || elkChild.y === undefined) continue;
      const node = updatedNodesMap.get(elkChild.id);
      if (node) {
        updatedNodesMap.set(elkChild.id, {
          ...node,
          position: { x: originX + elkChild.x, y: originY + elkChild.y },
        });
      }
    }
  }

  const updatedNodes = nodes.map((n) => updatedNodesMap.get(n.id) ?? n);
  const intermediateState = {
    ...state,
    levels: {
      ...state.levels,
      [state.currentLevel]: { ...levelData, nodes: updatedNodes },
    },
  };

  return resolveBoundaryOverlaps(intermediateState);
}
