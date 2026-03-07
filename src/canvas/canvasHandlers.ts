/**
 * canvasHandlers.ts
 *
 * Event handler factories for DiagramCanvas. Each factory receives the
 * reactive state accessors it needs (as plain getter functions) and returns
 * the event handler. Extracted from DiagramCanvas to keep it thin.
 */
import type { Node, Edge, Connection } from '@xyflow/svelte';
import type { AnnotationType, C4Edge } from '../types';
import {
  diagramStore,
  addEdge as storeAddEdge,
  addEdgeToDiagram,
  deleteNode as storeDeleteNode,
  deleteEdge as storeDeleteEdge,
  deleteNodeFromDiagram,
  deleteEdgeFromDiagram,
  deleteAnnotation,
  updateEdge as storeUpdateEdge,
  updateEdgeInDiagram,
  setSelected,
  updateNodePositions,
  updateNodePositionsInDiagram,
  updateAnnotationPositions,
  getAnnotationDiagramId,
  drillDown,
  drillUp,
  contextBoundaries,
} from '../stores/diagramStore';

/** Annotation node types — these bypass C4 hierarchy logic */
const ANNOTATION_TYPES = new Set<string>(['group', 'note'] satisfies AnnotationType[]);
import { get } from 'svelte/store';
import { generateId } from '../utils/id';

// ─── Connection ───────────────────────────────────────────────────────────────

export function handleConnect(conn: Connection): void {
  const state = get(diagramStore);
  const srcId = conn.source;
  const tgtId = conn.target;

  if (state.navigationStack.length <= 1) {
    // At root level: simple intra-diagram edge
    storeAddEdge({
      id: generateId(),
      source: srcId,
      target: tgtId,
      sourceHandle: conn.sourceHandle ?? undefined,
      targetHandle: conn.targetHandle ?? undefined,
      label: '',
      description: '',
      technology: '',
    });
    return;
  }

  // Drilled in: determine which child diagram each node belongs to
  const boundaries = get(contextBoundaries);
  const currentDiagramId = state.navigationStack[state.navigationStack.length - 1] ?? '';
  const parentDiagramId = state.navigationStack[state.navigationStack.length - 2] ?? '';

  const srcGroup = boundaries.find((g) => g.childNodes.some((n) => n.id === srcId));
  const tgtGroup = boundaries.find((g) => g.childNodes.some((n) => n.id === tgtId));
  const srcDiagramId = srcGroup?.childDiagramId ?? currentDiagramId;
  const tgtDiagramId = tgtGroup?.childDiagramId ?? currentDiagramId;

  if (srcDiagramId !== tgtDiagramId) {
    // Cross-group edge: store on the parent diagram
    addEdgeToDiagram(parentDiagramId, {
      id: generateId(),
      source: srcId,
      target: tgtId,
      sourceHandle: conn.sourceHandle ?? undefined,
      targetHandle: conn.targetHandle ?? undefined,
      label: '',
      description: '',
      technology: '',
      sourceGroupId: srcDiagramId,
      targetGroupId: tgtDiagramId,
    });
  } else {
    // Intra-group edge: store on the group's child diagram
    addEdgeToDiagram(srcDiagramId, {
      id: generateId(),
      source: srcId,
      target: tgtId,
      sourceHandle: conn.sourceHandle ?? undefined,
      targetHandle: conn.targetHandle ?? undefined,
      label: '',
      description: '',
      technology: '',
    });
  }
}

// ─── Reconnect ────────────────────────────────────────────────────────────────

export function handleReconnect(oldEdge: Edge, newConnection: Connection): void {
  const s = get(diagramStore);
  const edgeId = oldEdge.id;
  const patch: Partial<C4Edge> = {
    source: newConnection.source,
    target: newConnection.target,
    sourceHandle: newConnection.sourceHandle ?? undefined,
    targetHandle: newConnection.targetHandle ?? undefined,
  };
  // Cross-group edges are stored on the parent diagram
  if (s.navigationStack.length > 1) {
    const parentDiagramId = s.navigationStack[s.navigationStack.length - 2] ?? '';
    const parentDiag = s.diagrams[parentDiagramId];
    if (parentDiag?.edges.some((e) => e.id === edgeId)) {
      updateEdgeInDiagram(parentDiagramId, edgeId, patch);
      return;
    }
  }
  storeUpdateEdge(edgeId, patch);
}

// ─── Node click ───────────────────────────────────────────────────────────────

export function handleNodeClick({ node }: { node: Node; event: MouseEvent | TouchEvent }): void {
  if (node.id.startsWith('boundary-')) {
    // Clicking a boundary selects its parent node in the parent diagram
    setSelected(node.id.replace('boundary-', ''));
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

    const boundaryDrags = draggedNodes.filter((n) => n.id.startsWith('boundary-'));
    const regularDrags = draggedNodes.filter((n) => !n.id.startsWith('boundary-'));

    // Boundary drags: translate all children by the drag delta
    for (const bNode of boundaryDrags) {
      const parentNodeId = bNode.id.replace('boundary-', '');
      const group = boundaries.find((g) => g.parentNodeId === parentNodeId);
      if (!group) continue;
      const dx = bNode.position.x - group.boundingBox.x;
      const dy = bNode.position.y - group.boundingBox.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
      const childUpdates = group.childNodes.map((cn) => ({
        id: cn.id,
        position: { x: cn.position.x + dx, y: cn.position.y + dy },
      }));
      updateNodePositionsInDiagram(group.childDiagramId, childUpdates);
    }

    // Regular node drags: split annotations from C4 nodes, then route separately
    if (regularDrags.length > 0) {
      const annotDiagramId = getAnnotationDiagramId(s);
      const annotUpdates: Array<{ id: string; position: { x: number; y: number } }> = [];
      const updatesByDiagram = new Map<string, Array<{ id: string; position: { x: number; y: number } }>>();

      for (const n of regularDrags) {
        // Annotations are never parented to boundaries — update their store directly
        if (ANNOTATION_TYPES.has(n.type ?? '')) {
          annotUpdates.push({ id: n.id, position: n.position });
          continue;
        }

        if (n.parentId?.startsWith('boundary-')) {
          const boundaryFlowNode = allNodes.find((bn) => bn.id === n.parentId);
          if (!boundaryFlowNode) continue;
          const absPosition = {
            x: n.position.x + boundaryFlowNode.position.x,
            y: n.position.y + boundaryFlowNode.position.y,
          };
          const parentNodeId = n.parentId.replace('boundary-', '');
          const group = boundaries.find((g) => g.parentNodeId === parentNodeId);
          if (!group) continue;
          const diagramId = group.childDiagramId;
          if (!updatesByDiagram.has(diagramId)) updatesByDiagram.set(diagramId, []);
          updatesByDiagram.get(diagramId)!.push({ id: n.id, position: absPosition });
        } else {
          const currentDiagramId = s.navigationStack[s.navigationStack.length - 1] ?? '';
          if (!updatesByDiagram.has(currentDiagramId)) updatesByDiagram.set(currentDiagramId, []);
          updatesByDiagram.get(currentDiagramId)!.push({ id: n.id, position: n.position });
        }
      }

      if (annotUpdates.length > 0) {
        updateAnnotationPositions(annotDiagramId, annotUpdates);
      }

      const currentDiagramId = s.navigationStack[s.navigationStack.length - 1] ?? '';
      for (const [diagramId, updates] of updatesByDiagram) {
        if (diagramId === currentDiagramId) {
          updateNodePositions(updates);
        } else {
          updateNodePositionsInDiagram(diagramId, updates);
        }
      }
    }
  };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function handleDelete({ nodes: delNodes, edges: delEdges }: { nodes: Node[]; edges: Edge[] }): void {
  const s = get(diagramStore);
  const annotDiagramId = getAnnotationDiagramId(s);
  const currentDiagramId = s.navigationStack[s.navigationStack.length - 1] ?? '';
  const boundaries = get(contextBoundaries);

  for (const n of delNodes) {
    if (n.id.startsWith('boundary-')) continue;
    if (ANNOTATION_TYPES.has(n.type ?? '')) {
      deleteAnnotation(annotDiagramId, n.id);
    } else {
      // Check if this node belongs to a sibling group's diagram
      const group = boundaries.find((g) => g.childNodes.some((cn) => cn.id === n.id));
      if (group && group.childDiagramId !== currentDiagramId) {
        deleteNodeFromDiagram(group.childDiagramId, n.id);
      } else {
        storeDeleteNode(n.id);
      }
    }
  }

  for (const e of delEdges) {
    // Cross-group edges live on the parent diagram
    if (s.navigationStack.length > 1) {
      const parentDiagramId = s.navigationStack[s.navigationStack.length - 2] ?? '';
      if (s.diagrams[parentDiagramId]?.edges.some((pe) => pe.id === e.id)) {
        deleteEdgeFromDiagram(parentDiagramId, e.id);
        continue;
      }
      // Intra-group edges for sibling diagrams
      const siblingGroup = boundaries.find(
        (g) =>
          g.childDiagramId !== currentDiagramId &&
          s.diagrams[g.childDiagramId]?.edges.some((se) => se.id === e.id),
      );
      if (siblingGroup) {
        deleteEdgeFromDiagram(siblingGroup.childDiagramId, e.id);
        continue;
      }
    }
    storeDeleteEdge(e.id);
  }
}

/**
 * Node types that cannot be drilled into. UML class and ERD types expose their
 * internal structure natively (member lists, column lists) so drill-down is
 * redundant and disabled. Person nodes are excluded by long-standing convention.
 */
const NON_DRILLABLE_TYPES = new Set([
  'person',
  'class',
  'abstract-class',
  'interface',
  'enum',
  'record',
  'erd-table',
  'erd-view',
]);

// ─── Double-click (drill down/up) ─────────────────────────────────────────────

export function makeHandleDblClick(
  getScreenToFlowPosition: () => ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined,
  getCurrentDiagramNodes: () => Array<{ id: string; type: string }>,
): (e: MouseEvent) => void {
  return (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const nodeEl = target.closest('.svelte-flow__node') as HTMLElement | null;
    if (!nodeEl) {
      const s = get(diagramStore);
      if (s.navigationStack.length <= 1) return;
      const screenToFlowPosition = getScreenToFlowPosition();
      if (screenToFlowPosition) {
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const boundaries = get(contextBoundaries);
        const inBoundary = boundaries.some((g) => {
          const bb = g.boundingBox;
          return flowPos.x >= bb.x && flowPos.x <= bb.x + bb.width &&
                 flowPos.y >= bb.y && flowPos.y <= bb.y + bb.height;
        });
        if (!inBoundary) drillUp();
      }
      return;
    }
    const nodeId = nodeEl.getAttribute('data-id');
    if (!nodeId) return;
    const c4node = getCurrentDiagramNodes().find((n) => n.id === nodeId);
    // Annotations and non-drillable node types never drill down
    if (!c4node || NON_DRILLABLE_TYPES.has(c4node.type)) return;
    drillDown(nodeId);
  };
}
