/**
 * flowSync.ts
 *
 * Pure functions that convert the diagramStore state into the node/edge
 * arrays expected by SvelteFlow. Extracted from DiagramCanvas to keep it thin.
 */
import type { Node, Edge } from '@xyflow/svelte';
import type { Annotation, C4Node, C4Edge, C4NodeType, DiagramLevel, DiagramState, BoundaryGroup } from '../types';
import { ANNOTATION_DEFAULT_COLORS, NODE_DEFAULT_COLORS } from '../utils/colors';
import { getAnnotationDiagramId } from '../stores/diagramStore';

// ─── Conversion helpers ───────────────────────────────────────────────────────

export function toFlowNode(n: C4Node, selectedId?: string | null): Node {
  return {
    id: n.id,
    type: n.type,
    position: n.position,
    selected: n.id === selectedId,
    data: {
      label: n.label,
      description: n.description,
      technology: n.technology,
      childDiagramId: n.childDiagramId,
      color: n.color,
    },
  };
}

/**
 * Convert an Annotation to a SvelteFlow Node.
 * Annotations are always free-floating: never connectable, never parented to boundaries.
 */
export function toFlowAnnotation(a: Annotation, selectedId?: string | null): Node {
  const isGroup = a.type === 'group';
  return {
    id: a.id,
    type: a.type,
    position: a.position,
    selected: a.id === selectedId,
    // Groups get an explicit resizable size; comments use their natural size
    ...(isGroup && {
      style: `width: ${a.width ?? 240}px; height: ${a.height ?? 180}px;`,
      zIndex: -1,
    }),
    ...(!isGroup && { zIndex: 10 }),
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
 * Handles boundary groups, context nodes (ghost copies of sibling group nodes),
 * cross-group edges, and no-focus mode.
 */
export function buildFlowData(
  state: DiagramState,
  currentDiagram: DiagramLevel | undefined,
  boundaries: BoundaryGroup[],
  parentDiagram: DiagramLevel | null,
  selectedId: string | null,
): FlowData {
  const isNoFocus = state.focusedParentNodeId === null && state.navigationStack.length > 1;
  const activeNodes: Node[] = currentDiagram?.nodes.map((n) => toFlowNode(n, selectedId)) ?? [];
  const activeEdges: Edge[] = currentDiagram?.edges.map((e) => toFlowEdge(e, selectedId)) ?? [];

  const boundaryNodes: Node[] = [];
  const contextNodes: Node[] = [];

  for (const group of boundaries) {
    const boundaryId = `boundary-${group.parentNodeId}`;
    const bBox = group.boundingBox;

    // Look up parent node to get its color for the boundary
    const parentDiagramId = state.navigationStack[state.navigationStack.length - 2] ?? '';
    const pDiagram = state.diagrams[parentDiagramId];
    const parentNode = pDiagram?.nodes.find((n) => n.id === group.parentNodeId);
    const boundaryColor =
      parentNode?.color ?? NODE_DEFAULT_COLORS[(parentNode?.type ?? 'system') as C4NodeType];

    // Boundary rectangle node (rendered behind all content)
    boundaryNodes.push({
      id: boundaryId,
      type: 'boundary',
      position: { x: bBox.x, y: bBox.y },
      style: `width: ${bBox.width}px; height: ${bBox.height}px;`,
      data: { label: group.parentLabel, isFocused: group.isFocused, color: boundaryColor },
      selectable: true,
      draggable: true,
      connectable: false,
      class: 'boundary-node-wrapper',
    });

    if (isNoFocus) {
      // In no-focus mode render ALL groups' nodes as active (full opacity).
      // The current diagram's nodes are already in activeNodes — just parent them.
      const currentDiagramId = state.navigationStack[state.navigationStack.length - 1];
      if (group.childDiagramId !== currentDiagramId) {
        for (const cn of group.childNodes) {
          const flowNode = toFlowNode(cn, selectedId);
          flowNode.parentId = boundaryId;
          flowNode.position = { x: cn.position.x - bBox.x, y: cn.position.y - bBox.y };
          activeNodes.push(flowNode);
        }
        const siblingDiagram = state.diagrams[group.childDiagramId];
        if (siblingDiagram) {
          for (const e of siblingDiagram.edges) {
            activeEdges.push(toFlowEdge(e, selectedId));
          }
        }
      } else {
        // Current group nodes — also parent them to their boundary
        for (const node of activeNodes) {
          if (group.childNodes.some((cn) => cn.id === node.id)) {
            node.parentId = boundaryId;
            node.position = { x: node.position.x - bBox.x, y: node.position.y - bBox.y };
          }
        }
      }
    } else if (group.isFocused) {
      // Focused group — parent active nodes to the boundary rectangle
      for (const node of activeNodes) {
        if (group.childNodes.some((cn) => cn.id === node.id)) {
          node.parentId = boundaryId;
          node.position = { x: node.position.x - bBox.x, y: node.position.y - bBox.y };
        }
      }
    } else {
      // Non-focused sibling group — render as ghost context nodes
      for (const cn of group.childNodes) {
        contextNodes.push({
          id: `ctx-${cn.id}`,
          type: cn.type,
          position: { x: cn.position.x - bBox.x, y: cn.position.y - bBox.y },
          parentId: boundaryId,
          data: {
            label: cn.label,
            description: cn.description,
            technology: cn.technology,
            childDiagramId: cn.childDiagramId,
            color: cn.color,
          },
          draggable: false,
          class: 'context-node',
        });
      }
      // Intra-group edges for sibling diagram (remapped to ctx- IDs)
      const siblingDiagram = state.diagrams[group.childDiagramId];
      if (siblingDiagram) {
        for (const e of siblingDiagram.edges) {
          const flowEdge = toFlowEdge(e, selectedId);
          flowEdge.source = `ctx-${e.source}`;
          flowEdge.target = `ctx-${e.target}`;
          activeEdges.push(flowEdge);
        }
      }
    }
  }

  // Collect cross-group edges from the parent diagram
  if (parentDiagram) {
    const allActiveNodeIds = new Set(activeNodes.map((n) => n.id));
    for (const e of parentDiagram.edges) {
      if (!e.sourceGroupId && !e.targetGroupId) continue;
      const srcInActive = allActiveNodeIds.has(e.source);
      const tgtInActive = allActiveNodeIds.has(e.target);
      if (isNoFocus) {
        if (srcInActive && tgtInActive) {
          activeEdges.push(toFlowEdge(e, selectedId));
        }
      } else {
        const srcInContext =
          !srcInActive &&
          boundaries.some((g) => !g.isFocused && g.childNodes.some((n) => n.id === e.source));
        const tgtInContext =
          !tgtInActive &&
          boundaries.some((g) => !g.isFocused && g.childNodes.some((n) => n.id === e.target));
        if ((srcInActive || srcInContext) && (tgtInActive || tgtInContext)) {
          const flowEdge = toFlowEdge(e, selectedId);
          flowEdge.source = srcInActive ? e.source : `ctx-${e.source}`;
          flowEdge.target = tgtInActive ? e.target : `ctx-${e.target}`;
          activeEdges.push(flowEdge);
        }
      }
    }
  }

  // ── Annotations — always free-floating, never parented to boundaries ─────────
  const annotDiagramId = getAnnotationDiagramId(state);
  const annotDiagram = state.diagrams[annotDiagramId];
  const annotationNodes: Node[] =
    (annotDiagram?.annotations ?? []).map((a) => toFlowAnnotation(a, selectedId));

  // Render order: groups (back), boundaries, context, active nodes, comments (front)
  return {
    nodes: [...annotationNodes.filter((n) => n.type === 'group'), ...boundaryNodes, ...contextNodes, ...activeNodes, ...annotationNodes.filter((n) => n.type !== 'group')],
    edges: activeEdges,
  };
}
