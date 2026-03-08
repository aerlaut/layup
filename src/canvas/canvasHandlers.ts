/**
 * canvasHandlers.ts
 *
 * Event handler factories for DiagramCanvas. Each factory receives the
 * reactive state accessors it needs (as plain getter functions) and returns
 * the event handler. Extracted from DiagramCanvas to keep it thin.
 */
import type { Node, Edge, Connection } from '@xyflow/svelte';
import type { AnnotationType, C4NodeType } from '../types';
import { NON_DRILLABLE_TYPES } from '../utils/nodeTypes';
import { isBoundaryId, fromBoundaryId } from './boundaryId';
import { toAbsolutePosition } from './positionUtils';
import {
  diagramStore,
  addEdge as storeAddEdge,
  deleteNode as storeDeleteNode,
  deleteEdge as storeDeleteEdge,
  deleteAnnotation,
  updateEdge as storeUpdateEdge,
  setSelected,
  updateNodePositions,
  updateAnnotationPositions,
  drillDown,
  drillUp,
  nextLevel,
  contextBoundaries,
} from '../stores/diagramStore';

/** Annotation node types — these bypass C4 hierarchy logic */
const ANNOTATION_TYPES = new Set<string>(['group', 'note'] satisfies AnnotationType[]);
import { get } from 'svelte/store';
import { generateId } from '../utils/id';

// ─── Connection ───────────────────────────────────────────────────────────────

export function handleConnect(conn: Connection): void {
  storeAddEdge({
    id: generateId(),
    source: conn.source,
    target: conn.target,
    sourceHandle: conn.sourceHandle ?? undefined,
    targetHandle: conn.targetHandle ?? undefined,
    label: '',
    description: '',
    technology: '',
  });
}

// ─── Reconnect ────────────────────────────────────────────────────────────────

export function handleReconnect(oldEdge: Edge, newConnection: Connection): void {
  storeUpdateEdge(oldEdge.id, {
    source: newConnection.source,
    target: newConnection.target,
    sourceHandle: newConnection.sourceHandle ?? undefined,
    targetHandle: newConnection.targetHandle ?? undefined,
  });
}

// ─── Node click ───────────────────────────────────────────────────────────────

export function handleNodeClick({ node }: { node: Node; event: MouseEvent | TouchEvent }): void {
  if (isBoundaryId(node.id)) {
    // Clicking a boundary selects its parent node in the parent diagram
    setSelected(fromBoundaryId(node.id));
    return;
  }
  setSelected(node.id);
}

// ─── Edge click ───────────────────────────────────────────────────────────────

export function handleEdgeClick({ edge }: { edge: Edge; event: MouseEvent }): void {
  setSelected(edge.id);
}

// ─── Pane click ───────────────────────────────────────────────────────────────

export function makeHandlePaneClick(): (ev: { event: MouseEvent }) => void {
  return () => {
    setSelected(null);
  };
}

// ─── Node drag stop ───────────────────────────────────────────────────────────

export function makeHandleNodeDragStop(
  getNodes: () => Node[],
): (ev: { targetNode: Node | null; nodes: Node[]; event: MouseEvent | TouchEvent }) => void {
  return ({ nodes: draggedNodes }) => {
    const s = get(diagramStore);
    const boundaries = get(contextBoundaries);
    const allNodes = getNodes();

    const boundaryDrags = draggedNodes.filter((n) => isBoundaryId(n.id));
    const regularDrags  = draggedNodes.filter((n) => !isBoundaryId(n.id));

    // Boundary drags: translate all child nodes by the drag delta
    for (const bNode of boundaryDrags) {
      const parentNodeId = fromBoundaryId(bNode.id);
      const group = boundaries.find((g) => g.parentNodeId === parentNodeId);
      if (!group || group.childNodes.length === 0) continue;

      const dx = bNode.position.x - group.boundingBox.x;
      const dy = bNode.position.y - group.boundingBox.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;

      const childUpdates = group.childNodes.map((cn) => ({
        id: cn.id,
        position: { x: cn.position.x + dx, y: cn.position.y + dy },
      }));
      // All child nodes are in currentLevel
      updateNodePositions(childUpdates);
    }

    // Regular node drags: annotations vs C4 nodes
    if (regularDrags.length > 0) {
      const annotUpdates: Array<{ id: string; position: { x: number; y: number } }> = [];
      const nodeUpdates:  Array<{ id: string; position: { x: number; y: number } }> = [];

      for (const n of regularDrags) {
        if (ANNOTATION_TYPES.has(n.type ?? '')) {
          annotUpdates.push({ id: n.id, position: n.position });
          continue;
        }

        if (n.parentId && isBoundaryId(n.parentId)) {
          // Node is parented to a boundary rectangle in the flow graph.
          // Its position is relative to the boundary; convert to absolute.
          const boundaryFlowNode = allNodes.find((bn) => bn.id === n.parentId);
          if (!boundaryFlowNode) continue;
          nodeUpdates.push({
            id: n.id,
            position: toAbsolutePosition(n.position, boundaryFlowNode.position),
          });
        } else {
          nodeUpdates.push({ id: n.id, position: n.position });
        }
      }

      if (annotUpdates.length > 0) {
        updateAnnotationPositions(s.currentLevel, annotUpdates);
      }
      if (nodeUpdates.length > 0) {
        updateNodePositions(nodeUpdates);
      }
    }
  };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function handleDelete({
  nodes: delNodes,
  edges: delEdges,
}: {
  nodes: Node[];
  edges: Edge[];
}): void {
  const s = get(diagramStore);

  for (const n of delNodes) {
    if (isBoundaryId(n.id)) continue;
    if (ANNOTATION_TYPES.has(n.type ?? '')) {
      deleteAnnotation(s.currentLevel, n.id);
    } else {
      storeDeleteNode(n.id); // cascade handled inside deleteNode in the store
    }
  }

  for (const e of delEdges) {
    storeDeleteEdge(e.id);
  }
}



// ─── Double-click (drill down/up) ─────────────────────────────────────────────

export function makeHandleDblClick(
  getScreenToFlowPosition: () => ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined,
  getCurrentLevelNodes: () => Array<{ id: string; type: C4NodeType }>,
): (e: MouseEvent) => void {
  return (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const nodeEl = target.closest('.svelte-flow__node') as HTMLElement | null;

    if (!nodeEl) {
      // Double-click on empty canvas — drill up if not at context level
      const s = get(diagramStore);
      if (s.currentLevel === 'context') return;
      const screenToFlowPosition = getScreenToFlowPosition();
      if (screenToFlowPosition) {
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const boundaries = get(contextBoundaries);
        const inBoundary = boundaries.some((g) => {
          const bb = g.boundingBox;
          return (
            flowPos.x >= bb.x && flowPos.x <= bb.x + bb.width &&
            flowPos.y >= bb.y && flowPos.y <= bb.y + bb.height
          );
        });
        if (!inBoundary) drillUp();
      }
      return;
    }

    const nodeId = nodeEl.getAttribute('data-id');
    if (!nodeId) return;

    // Find the node in the current level (all nodes are here in v2)
    const c4node = getCurrentLevelNodes().find((n) => n.id === nodeId);
    if (!c4node || NON_DRILLABLE_TYPES.has(c4node.type)) return;

    // Check there is a next level to drill into
    const s = get(diagramStore);
    if (!nextLevel(s.currentLevel)) return;

    drillDown(); // no nodeId argument in v2
  };
}
