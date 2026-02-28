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
  switchFocusToGroup,
  clearGroupFocus,
  contextBoundaries,
} from '../stores/diagramStore';

/** Annotation node types — these bypass C4 hierarchy logic */
const ANNOTATION_TYPES = new Set<string>(['group', 'comment'] satisfies AnnotationType[]);
import { get } from 'svelte/store';
import { generateId } from '../utils/id';

// ─── Connection ───────────────────────────────────────────────────────────────

export function handleConnect(conn: Connection): void {
  const state = get(diagramStore);
  // Reject connections in no-focus mode (when multiple groups are visible)
  if (state.focusedParentNodeId === null && state.navigationStack.length > 1) return;

  const srcId = conn.source;
  const tgtId = conn.target;
  const isCtxSrc = srcId.startsWith('ctx-');
  const isCtxTgt = tgtId.startsWith('ctx-');

  if (isCtxSrc || isCtxTgt) {
    // Cross-group edge: store on the parent diagram
    if (state.navigationStack.length <= 1) return;
    const parentDiagramId = state.navigationStack[state.navigationStack.length - 2] ?? '';
    const currentDiagramId = state.navigationStack[state.navigationStack.length - 1] ?? '';
    const realSrcId = isCtxSrc ? srcId.slice(4) : srcId;
    const realTgtId = isCtxTgt ? tgtId.slice(4) : tgtId;
    const boundaries = get(contextBoundaries);

    const sourceGroupId = isCtxSrc
      ? boundaries.find((g) => g.childNodes.some((n) => n.id === realSrcId))?.childDiagramId
      : currentDiagramId;
    const targetGroupId = isCtxTgt
      ? boundaries.find((g) => g.childNodes.some((n) => n.id === realTgtId))?.childDiagramId
      : currentDiagramId;

    addEdgeToDiagram(parentDiagramId, {
      id: generateId(),
      source: realSrcId,
      target: realTgtId,
      sourceHandle: conn.sourceHandle ?? undefined,
      targetHandle: conn.targetHandle ?? undefined,
      label: '',
      description: '',
      technology: '',
      sourceGroupId,
      targetGroupId,
    });
  } else {
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
    const parentNodeId = node.id.replace('boundary-', '');
    const s = get(diagramStore);
    if (s.focusedParentNodeId === null && s.navigationStack.length > 1) {
      switchFocusToGroup(parentNodeId);
    }
    setSelected(parentNodeId);
    return;
  }
  if (node.id.startsWith('ctx-')) {
    const realId = node.id.slice(4);
    const boundaries = get(contextBoundaries);
    const group = boundaries.find((g) => g.childNodes.some((n) => n.id === realId));
    if (group) {
      switchFocusToGroup(group.parentNodeId);
      setSelected(realId);
    }
    return;
  }
  // In no-focus mode, clicking an active node focuses its group
  const s = get(diagramStore);
  if (s.focusedParentNodeId === null && s.navigationStack.length > 1) {
    const boundaries = get(contextBoundaries);
    const group = boundaries.find((g) => g.childNodes.some((n) => n.id === node.id));
    if (group) {
      switchFocusToGroup(group.parentNodeId);
      setSelected(node.id);
      return;
    }
  }
  setSelected(node.id);
}

// ─── Edge click ───────────────────────────────────────────────────────────────

export function handleEdgeClick({ edge }: { edge: Edge; event: MouseEvent }): void {
  setSelected(edge.id);
}

// ─── Pane click ───────────────────────────────────────────────────────────────

export function makeHandlePaneClick(
  getScreenToFlowPosition: () => ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined,
): (ev: { event: MouseEvent }) => void {
  return ({ event }: { event: MouseEvent }) => {
    const s = get(diagramStore);
    const isNoFocus = s.focusedParentNodeId === null && s.navigationStack.length > 1;
    const screenToFlowPosition = getScreenToFlowPosition();

    if (screenToFlowPosition && s.navigationStack.length > 1) {
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const boundaries = get(contextBoundaries);
      const clickedGroup = boundaries.find((g) => {
        if (g.isFocused && !isNoFocus) return false;
        const bb = g.boundingBox;
        return flowPos.x >= bb.x && flowPos.x <= bb.x + bb.width &&
               flowPos.y >= bb.y && flowPos.y <= bb.y + bb.height;
      });
      if (clickedGroup) {
        switchFocusToGroup(clickedGroup.parentNodeId);
        return;
      }
      clearGroupFocus();
      return;
    }

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
  for (const n of delNodes) {
    if (n.id.startsWith('boundary-')) continue;
    if (ANNOTATION_TYPES.has(n.type ?? '')) {
      deleteAnnotation(annotDiagramId, n.id);
    } else {
      storeDeleteNode(n.id);
    }
  }
  for (const e of delEdges) storeDeleteEdge(e.id);
}

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
    // Annotations never drill down; person nodes never drill down either
    if (!c4node || c4node.type === 'person') return;
    drillDown(nodeId);
  };
}
