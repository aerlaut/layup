import ELK from 'elkjs/lib/elk.bundled.js';
import type { DiagramState } from '../types';
import { computeNodeHeight, childTypeIsValid } from './diagramLayout';
import { NODE_DEFAULT_WIDTH, BOUNDARY_PADDING, BOUNDARY_MIN_WIDTH, BOUNDARY_MIN_HEIGHT } from '../utils/constants';
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
  //
  // Empty boundary groups are excluded from the main ELK graph (they would
  // render as zero-size compound nodes and cluster together). Instead they
  // are arranged in a separate ELK pass and placed above the flow layout.
  if (options.style === 'flow') {
    const nonEmptyParentIds = new Set(
      childNodes.map((n) => n.parentNodeId).filter((id): id is string => !!id)
    );
    const nonEmptyParents = validParents.filter((p) => nonEmptyParentIds.has(p.id));
    const emptyParents    = validParents.filter((p) => !nonEmptyParentIds.has(p.id));

    const nonEmptyParentElkNodes = nonEmptyParents.map((parent) => ({
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

    // Main flow layout — non-empty groups + orphans
    const posMap = new Map<string, { x: number; y: number }>();
    if (nonEmptyParentElkNodes.length > 0 || orphanElkNodes.length > 0) {
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
        children: [...nonEmptyParentElkNodes, ...orphanElkNodes],
        edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
      };

      const laid = await elk.layout(graph);
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
    }

    const updatedNodes = nodes.map((n) => {
      const pos = posMap.get(n.id);
      return pos ? { ...n, position: pos } : n;
    });

    // Empty group layout — arranged with proper sizes, then placed above the flow layout
    const emptyPosMap = new Map<string, { x: number; y: number }>();
    if (emptyParents.length > 0) {
      const emptySizeMap = new Map(
        emptyParents.map((p) => [
          p.id,
          {
            width:  p.boundarySize?.width  ?? BOUNDARY_MIN_WIDTH,
            height: p.boundarySize?.height ?? BOUNDARY_MIN_HEIGHT,
          },
        ])
      );

      const emptyGraph = {
        id: 'root',
        layoutOptions: {
          'elk.algorithm': 'layered',
          'elk.direction': DIRECTION_MAP[options.direction],
          'elk.spacing.nodeNode': String(sp.nodeNode),
          'elk.layered.spacing.nodeNodeBetweenLayers': String(sp.layerSpacing),
          'elk.padding': paddingStr(sp.padding),
        },
        children: emptyParents.map((p) => {
          const size = emptySizeMap.get(p.id)!;
          return { id: p.id, width: size.width, height: size.height };
        }),
        edges: [] as { id: string; sources: string[]; targets: string[] }[],
      };

      const emptyLaid = await elk.layout(emptyGraph);

      // Collect raw positions and measure the bottom of the empty arrangement
      const emptyRawPositions = new Map<string, { x: number; y: number }>();
      let emptyArrangementMaxY = 0;
      for (const elkNode of emptyLaid.children ?? []) {
        if (elkNode.x === undefined || elkNode.y === undefined) continue;
        emptyRawPositions.set(elkNode.id, { x: elkNode.x, y: elkNode.y });
        const size = emptySizeMap.get(elkNode.id);
        if (size) {
          emptyArrangementMaxY = Math.max(emptyArrangementMaxY, elkNode.y + size.height);
        }
      }

      if (posMap.size > 0) {
        // Shift the empty arrangement so it sits above the flow layout
        const flowMinY = Math.min(...[...posMap.values()].map((p) => p.y));
        const yShift = flowMinY - emptyArrangementMaxY - sp.nodeNode;
        for (const [id, pos] of emptyRawPositions) {
          emptyPosMap.set(id, { x: pos.x, y: pos.y + yShift });
        }
      } else {
        // No flow nodes: use the raw ELK positions as-is
        for (const [id, pos] of emptyRawPositions) {
          emptyPosMap.set(id, pos);
        }
      }
    }

    const updatedParentNodes = parentLevelData.nodes.map((n) => {
      if (!emptyPosMap.has(n.id)) return n;
      return { ...n, boundaryPosition: emptyPosMap.get(n.id)! };
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

  // ── Compact style: two-pass layout ──────────────────────────────────────────
  //
  // Pass 1: rectpack each non-empty group at origin (0,0) to get natural size.
  // Pass 2: ELK-layered over all groups + orphans to arrange them globally.
  // Apply: offset packed children by the group's Pass-2 position.

  type GroupLayout = {
    parentId: string;
    width: number;
    height: number;
    // relative positions of children after rectpacking (origin = top-left of group content)
    childPositions: Map<string, { x: number; y: number }>;
  };

  const groupLayouts: GroupLayout[] = [];

  // Pass 1 — pack each non-empty group internally
  for (const parent of validParents) {
    const children = childNodes.filter((n) => n.parentNodeId === parent.id);
    if (children.length === 0) continue;

    const packGraph = {
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

    const packed = await elk.layout(packGraph);
    const childPositions = new Map<string, { x: number; y: number }>();
    const heightById = new Map(children.map((n) => [n.id, computeNodeHeight(n)]));
    let groupWidth  = BOUNDARY_MIN_WIDTH;
    let groupHeight = BOUNDARY_MIN_HEIGHT;
    for (const elkChild of packed.children ?? []) {
      if (elkChild.x === undefined || elkChild.y === undefined) continue;
      childPositions.set(elkChild.id, { x: elkChild.x, y: elkChild.y });
      groupWidth  = Math.max(groupWidth,  elkChild.x + NODE_DEFAULT_WIDTH + sp.padding);
      groupHeight = Math.max(groupHeight, elkChild.y + (heightById.get(elkChild.id) ?? 0) + sp.padding);
    }

    groupLayouts.push({
      parentId: parent.id,
      width:  groupWidth,
      height: groupHeight,
      childPositions,
    });
  }

  // Pass 2 — arrange groups + orphans globally with ELK layered
  const groupLayoutMap = new Map(groupLayouts.map((g) => [g.parentId, g]));

  const globalChildren = [
    // non-empty groups as fixed-size nodes
    ...validParents
      .filter((p) => groupLayoutMap.has(p.id))
      .map((p) => {
        const g = groupLayoutMap.get(p.id)!;
        return { id: p.id, width: g.width, height: g.height };
      }),
    // empty groups using boundarySize or minimum dimensions
    ...validParents
      .filter((p) => !groupLayoutMap.has(p.id))
      .map((p) => ({
        id: p.id,
        width:  p.boundarySize?.width  ?? BOUNDARY_MIN_WIDTH,
        height: p.boundarySize?.height ?? BOUNDARY_MIN_HEIGHT,
      })),
    // orphan nodes
    ...orphanNodes.map((n) => ({
      id: n.id,
      width: NODE_DEFAULT_WIDTH,
      height: computeNodeHeight(n),
    })),
  ];

  const globalGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': DIRECTION_MAP[options.direction],
      'elk.spacing.nodeNode': String(sp.nodeNode),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(sp.layerSpacing),
      'elk.padding': paddingStr(sp.padding),
    },
    children: globalChildren,
    edges: [] as { id: string; sources: string[]; targets: string[] }[],
  };

  const globalLaid = await elk.layout(globalGraph);
  const globalPosMap = new Map<string, { x: number; y: number }>();
  for (const elkNode of globalLaid.children ?? []) {
    if (elkNode.x !== undefined && elkNode.y !== undefined) {
      globalPosMap.set(elkNode.id, { x: elkNode.x, y: elkNode.y });
    }
  }

  // Apply: update child positions and empty group boundaryPositions
  const updatedNodesMap = new Map(nodes.map((n) => [n.id, n]));

  for (const gl of groupLayouts) {
    const groupOrigin = globalPosMap.get(gl.parentId);
    if (!groupOrigin) continue;
    for (const [childId, relPos] of gl.childPositions) {
      const node = updatedNodesMap.get(childId);
      if (node) {
        updatedNodesMap.set(childId, {
          ...node,
          position: { x: groupOrigin.x + relPos.x, y: groupOrigin.y + relPos.y },
        });
      }
    }
  }

  for (const orphan of orphanNodes) {
    const pos = globalPosMap.get(orphan.id);
    if (pos) {
      const node = updatedNodesMap.get(orphan.id);
      if (node) updatedNodesMap.set(orphan.id, { ...node, position: pos });
    }
  }

  const emptyGroupParentIds = new Set(
    validParents.filter((p) => !groupLayoutMap.has(p.id)).map((p) => p.id)
  );
  const updatedParentNodes = parentLevelData.nodes.map((n) => {
    if (!emptyGroupParentIds.has(n.id)) return n;
    const pos = globalPosMap.get(n.id);
    return pos ? { ...n, boundaryPosition: pos } : n;
  });

  const updatedNodes = nodes.map((n) => updatedNodesMap.get(n.id) ?? n);

  return {
    ...state,
    levels: {
      ...state.levels,
      [prev]: { ...parentLevelData, nodes: updatedParentNodes },
      [state.currentLevel]: { ...levelData, nodes: updatedNodes },
    },
  };
}
