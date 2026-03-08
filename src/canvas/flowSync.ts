/**
 * flowSync.ts
 *
 * Pure functions that convert the diagramStore state into the node/edge
 * arrays expected by SvelteFlow. Extracted from DiagramCanvas to keep it thin.
 */
import type { Node, Edge } from '@xyflow/svelte';
import type { Annotation, C4Node, C4Edge, C4NodeType, DiagramLevel, DiagramState, BoundaryGroup } from '../types';
import { ANNOTATION_DEFAULT_COLORS, NODE_DEFAULT_COLORS } from '../utils/colors';
import { nextLevel, prevLevel } from '../stores/diagramStore';
import { toBoundaryId } from './boundaryId';

// ─── Conversion helpers ───────────────────────────────────────────────────────

/**
 * Convert a C4Node to a SvelteFlow Node.
 * hasChildren indicates whether any nodes at the next level reference this node
 * via parentNodeId — used by node components to show a drill-down indicator.
 */
export function toFlowNode(
  n: C4Node,
  selectedId: string | null | undefined,
  hasChildren: boolean,
): Node {
  return {
    id: n.id,
    type: n.type,
    position: n.position,
    selected: n.id === selectedId,
    data: {
      label: n.label,
      description: n.description,
      technology: n.technology,
      hasChildren,
      color: n.color,
      members: n.members,
      columns: n.columns,
    },
  };
}

/**
 * Convert an Annotation to a SvelteFlow Node.
 * Annotations are always free-floating: never connectable, never parented to boundaries.
 * Groups and packages are resizable containers rendered behind content (zIndex -1).
 * Notes are rendered in front (zIndex 10).
 */
export function toFlowAnnotation(a: Annotation, selectedId?: string | null): Node {
  const isContainer = a.type === 'group' || a.type === 'package';
  return {
    id: a.id,
    type: a.type,
    position: a.position,
    selected: a.id === selectedId,
    // Container annotations (group, package) get explicit resizable sizes and sit behind content
    ...(isContainer && {
      style: `width: ${a.width ?? 240}px; height: ${a.height ?? 180}px;`,
      zIndex: -1,
    }),
    ...(!isContainer && { zIndex: 10 }),
    connectable: false,
    draggable: true,
    data: {
      label: a.label,
      text: a.text,
      color: a.color ?? ANNOTATION_DEFAULT_COLORS[a.type],
    },
  };
}

export function toFlowEdge(e: C4Edge, selectedId: string | null): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    type: 'c4edge',
    label: e.label,
    selected: e.id === selectedId,
    data: {
      description: e.description,
      technology: e.technology,
      markerStart: e.markerStart ?? 'none',
      markerEnd: e.markerEnd ?? 'arrow',
      lineStyle: e.lineStyle ?? 'solid',
      lineType: e.lineType ?? 'bezier',
      waypoints: e.waypoints ?? [],
      color: e.color,
      multiplicitySource: e.multiplicitySource,
      multiplicityTarget: e.multiplicityTarget,
      roleSource: e.roleSource,
      roleTarget: e.roleTarget,
    },
  };
}

// ─── Main sync function ───────────────────────────────────────────────────────

export interface FlowData {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Build the SvelteFlow node/edge arrays from the current diagram store state.
 *
 * At the context level there are no boundaries — all nodes are free-floating.
 * At other levels, nodes are grouped by parentNodeId into boundary rectangles
 * that correspond to drillable nodes at the level above.
 */
export function buildFlowData(
  state: DiagramState,
  currentLevelData: DiagramLevel | undefined,
  boundaries: BoundaryGroup[],
  selectedId: string | null,
): FlowData {
  if (!currentLevelData) return { nodes: [], edges: [] };

  // ── Pass 1: Compute which nodes have children at the next level ───────────
  const nextLvl = nextLevel(state.currentLevel);
  const nextLevelNodes = nextLvl ? (state.levels[nextLvl]?.nodes ?? []) : [];
  const nodeIdsWithChildren = new Set(
    nextLevelNodes.map((n) => n.parentNodeId).filter(Boolean) as string[]
  );

  // ── Pass 2: Build boundary assignment map and boundary flow nodes ─────────
  // At the context level (no parent level) there are no boundaries.
  // At all other levels, nodes belong to boundary groups by parentNodeId.
  type BoundaryAssignment = { parentId: string; relativeX: number; relativeY: number };
  const boundaryAssignments = new Map<string, BoundaryAssignment>();
  const boundaryNodes: Node[] = [];

  if (boundaries.length > 0) {
    const prevLvl = prevLevel(state.currentLevel);
    const parentLevelData = prevLvl ? state.levels[prevLvl] : undefined;

    for (const group of boundaries) {
      const boundaryId = toBoundaryId(group.parentNodeId);
      const bb = group.boundingBox;

      const parentNode = parentLevelData?.nodes.find((n) => n.id === group.parentNodeId);
      const boundaryColor =
        parentNode?.color ?? NODE_DEFAULT_COLORS[(parentNode?.type ?? 'system') as C4NodeType];

      boundaryNodes.push({
        id: boundaryId,
        type: 'boundary',
        position: { x: bb.x, y: bb.y },
        style: `width: ${bb.width}px; height: ${bb.height}px;`,
        data: { label: group.parentLabel, color: boundaryColor },
        selectable: true,
        draggable: true,
        connectable: false,
        class: 'boundary-node-wrapper',
      });

      for (const child of group.childNodes) {
        boundaryAssignments.set(child.id, {
          parentId: boundaryId,
          relativeX: child.position.x - bb.x,
          relativeY: child.position.y - bb.y,
        });
      }
    }
  }

  // ── Pass 3: Produce final C4 flow nodes with boundary reparenting applied ─
  const allC4Nodes: Node[] = currentLevelData.nodes.map((n) => {
    const base = toFlowNode(n, selectedId, nodeIdsWithChildren.has(n.id));
    const assignment = boundaryAssignments.get(n.id);
    if (!assignment) return base;
    return {
      ...base,
      parentId: assignment.parentId,
      position: { x: assignment.relativeX, y: assignment.relativeY },
    };
  });

  // ── Annotations ───────────────────────────────────────────────────────────
  const annotations = currentLevelData.annotations ?? [];
  const annotationNodes: Node[] = annotations.map((a) => toFlowAnnotation(a, selectedId));
  const containerAnnotations  = annotationNodes.filter((n) => n.type === 'group' || n.type === 'package');
  const foregroundAnnotations = annotationNodes.filter((n) => n.type !== 'group' && n.type !== 'package');

  return {
    nodes: [...containerAnnotations, ...boundaryNodes, ...allC4Nodes, ...foregroundAnnotations],
    edges: currentLevelData.edges.map((e) => toFlowEdge(e, selectedId)),
  };
}
