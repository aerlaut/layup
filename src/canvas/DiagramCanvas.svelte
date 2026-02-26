<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
    type Connection,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  import { get } from 'svelte/store';
  import {
    diagramStore,
    currentDiagram,
    contextBoundaries,
    parentDiagram,
    addEdge as storeAddEdge,
    addEdgeToDiagram,
    deleteNode as storeDeleteNode,
    deleteEdge as storeDeleteEdge,
    setSelected,
    updateNodePositions,
    drillDown,
    drillUp,
    pendingNodeType,
    switchFocusToGroup,
    clearGroupFocus,
  } from '../stores/diagramStore';
  import type { C4Node, C4Edge } from '../types';
  import PersonNode from '../elements/PersonNode.svelte';
  import SystemNode from '../elements/SystemNode.svelte';
  import ContainerNode from '../elements/ContainerNode.svelte';
  import ComponentNode from '../elements/ComponentNode.svelte';
  import BoundaryNode from '../elements/BoundaryNode.svelte';
  import C4EdgeComponent from '../elements/C4Edge.svelte';
  import FlowHelper from './FlowHelper.svelte';

  const dispatch = createEventDispatcher<{ place: { x: number; y: number } }>();

  const nodeTypes = {
    person: PersonNode,
    system: SystemNode,
    container: ContainerNode,
    component: ComponentNode,
    'code-element': SystemNode,
    boundary: BoundaryNode,
  } as const;

  const edgeTypes = {
    c4edge: C4EdgeComponent,
  } as const;

  function toFlowNode(n: C4Node): Node {
    return {
      id: n.id,
      type: n.type,
      position: n.position,
      data: {
        label: n.label,
        description: n.description,
        technology: n.technology,
        childDiagramId: n.childDiagramId,
      },
    };
  }

  function toFlowEdge(e: C4Edge): Edge {
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      type: 'c4edge',
      label: e.label,
      data: {
        description: e.description,
        technology: e.technology,
        markerStart: e.markerStart ?? 'none',
        markerEnd: e.markerEnd ?? 'arrow',
        lineStyle: e.lineStyle ?? 'solid',
        waypoints: e.waypoints ?? [],
      },
    };
  }

  // Bindable reactive arrays for SvelteFlow
  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);

  // Sync diagram store → flow nodes/edges, merging boundary/context nodes for spatial context
  $effect(() => {
    const d = $currentDiagram;
    const boundaries = $contextBoundaries;
    const parent = $parentDiagram;
    const s = get(diagramStore);
    const isNoFocus = s.focusedParentNodeId === null && s.navigationStack.length > 1;

    const activeNodes: Node[] = d?.nodes.map(toFlowNode) ?? [];
    const activeEdges: Edge[] = d?.edges.map(toFlowEdge) ?? [];

    const boundaryNodes: Node[] = [];
    const contextNodes: Node[] = [];

    for (const group of boundaries) {
      const boundaryId = `boundary-${group.parentNodeId}`;
      const bBox = group.boundingBox;

      // Boundary rectangle node (behind all content)
      boundaryNodes.push({
        id: boundaryId,
        type: 'boundary',
        position: { x: bBox.x, y: bBox.y },
        style: `width: ${bBox.width}px; height: ${bBox.height}px;`,
        data: { label: group.parentLabel, isFocused: group.isFocused },
        selectable: false,
        draggable: false,
        connectable: false,
        class: 'boundary-node-wrapper',
      });

      if (isNoFocus) {
        // In no-focus mode, render ALL groups' nodes as active (full opacity)
        // Skip the group whose nodes are already in activeNodes (from currentDiagram)
        const currentDiagramId = s.navigationStack[s.navigationStack.length - 1];
        if (group.childDiagramId !== currentDiagramId) {
          for (const cn of group.childNodes) {
            activeNodes.push(toFlowNode(cn));
          }
          // Also include edges from sibling diagrams
          const siblingDiagram = s.diagrams[group.childDiagramId];
          if (siblingDiagram) {
            for (const e of siblingDiagram.edges) {
              activeEdges.push(toFlowEdge(e));
            }
          }
        }
      } else if (!group.isFocused) {
        // Context child nodes for sibling (non-focused) groups only
        for (const cn of group.childNodes) {
          contextNodes.push({
            id: `ctx-${cn.id}`,
            type: cn.type,
            // Position relative to boundary node
            position: {
              x: cn.position.x - bBox.x,
              y: cn.position.y - bBox.y,
            },
            parentId: boundaryId,
            data: {
              label: cn.label,
              description: cn.description,
              technology: cn.technology,
              childDiagramId: cn.childDiagramId,
            },
            draggable: false,
            class: 'context-node',
          });
        }
      }
    }

    // Collect cross-group edges from parent diagram
    if (parent) {
      const allActiveNodeIds = new Set(activeNodes.map((n) => n.id));
      for (const e of parent.edges) {
        if (!e.sourceGroupId && !e.targetGroupId) continue;
        const srcInActive = allActiveNodeIds.has(e.source);
        const tgtInActive = allActiveNodeIds.has(e.target);
        if (isNoFocus) {
          // In no-focus mode, all nodes are active — just remap IDs directly
          if (srcInActive && tgtInActive) {
            activeEdges.push(toFlowEdge(e));
          }
        } else {
          const srcInContext =
            !srcInActive &&
            boundaries.some((g) => !g.isFocused && g.childNodes.some((n) => n.id === e.source));
          const tgtInContext =
            !tgtInActive &&
            boundaries.some((g) => !g.isFocused && g.childNodes.some((n) => n.id === e.target));
          if ((srcInActive || srcInContext) && (tgtInActive || tgtInContext)) {
            const flowEdge = toFlowEdge(e);
            flowEdge.source = srcInActive ? e.source : `ctx-${e.source}`;
            flowEdge.target = tgtInActive ? e.target : `ctx-${e.target}`;
            activeEdges.push(flowEdge);
          }
        }
      }
    }

    // Render order: boundaries first (back), then context nodes, then active nodes (front)
    nodes = [...boundaryNodes, ...contextNodes, ...activeNodes];
    edges = activeEdges;
  });

  // screenToFlowPosition provided by FlowHelper child component
  let screenToFlowPosition: ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined;

  // ─── Event handlers ──────────────────────────────────────────────────────────

  function handleConnect(conn: Connection) {
    // Reject connections in no-focus mode
    const state = get(diagramStore);
    if (state.focusedParentNodeId === null && state.navigationStack.length > 1) return;

    const srcId = conn.source;
    const tgtId = conn.target;
    const isCtxSrc = srcId.startsWith('ctx-');
    const isCtxTgt = tgtId.startsWith('ctx-');

    if (isCtxSrc || isCtxTgt) {
      // Cross-group edge: store on parent diagram
      const s = get(diagramStore);
      if (s.navigationStack.length <= 1) return;
      const parentDiagramId = s.navigationStack[s.navigationStack.length - 2];
      const currentDiagramId = s.navigationStack[s.navigationStack.length - 1];
      const realSrcId = isCtxSrc ? srcId.slice(4) : srcId;
      const realTgtId = isCtxTgt ? tgtId.slice(4) : tgtId;
      const boundaries = $contextBoundaries;

      const sourceGroupId = isCtxSrc
        ? boundaries.find((g) => g.childNodes.some((n) => n.id === realSrcId))?.childDiagramId
        : currentDiagramId;
      const targetGroupId = isCtxTgt
        ? boundaries.find((g) => g.childNodes.some((n) => n.id === realTgtId))?.childDiagramId
        : currentDiagramId;

      addEdgeToDiagram(parentDiagramId, {
        id: `edge-${Date.now()}`,
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
        id: `edge-${Date.now()}`,
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

  function handleNodeClick({ node }: { node: Node; event: MouseEvent | TouchEvent }) {
    if (node.id.startsWith('boundary-')) return;
    if (node.id.startsWith('ctx-')) {
      const realId = node.id.slice(4);
      // Find which group this context node belongs to and switch focus
      const boundaries = $contextBoundaries;
      const group = boundaries.find((g) => g.childNodes.some((n) => n.id === realId));
      if (group) {
        switchFocusToGroup(group.parentNodeId);
        setSelected(realId);
      }
      return;
    }
    // In no-focus mode, clicking an active node should focus its group
    const s = get(diagramStore);
    if (s.focusedParentNodeId === null && s.navigationStack.length > 1) {
      const boundaries = $contextBoundaries;
      const group = boundaries.find((g) => g.childNodes.some((n) => n.id === node.id));
      if (group) {
        switchFocusToGroup(group.parentNodeId);
        setSelected(node.id);
        return;
      }
    }
    setSelected(node.id);
  }

  function handleEdgeClick({ edge }: { edge: Edge; event: MouseEvent }) {
    setSelected(edge.id);
  }

  function handlePaneClick({ event }: { event: MouseEvent }) {
    const s = get(diagramStore);
    const isNoFocus = s.focusedParentNodeId === null && s.navigationStack.length > 1;

    const pending = $pendingNodeType;
    if (pending && screenToFlowPosition && !isNoFocus) {
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      dispatch('place', pos);
    }

    // Check if click is within an unfocused boundary to switch focus
    if (screenToFlowPosition && s.navigationStack.length > 1) {
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const boundaries = $contextBoundaries;
      const clickedGroup = boundaries.find((g) => {
        if (g.isFocused && !isNoFocus) return false; // skip the focused group unless in no-focus mode
        const bb = g.boundingBox;
        return (
          flowPos.x >= bb.x &&
          flowPos.x <= bb.x + bb.width &&
          flowPos.y >= bb.y &&
          flowPos.y <= bb.y + bb.height
        );
      });
      if (clickedGroup) {
        switchFocusToGroup(clickedGroup.parentNodeId);
        return;
      }
      // Click outside all boundaries — enter no-focus mode
      clearGroupFocus();
      return;
    }

    setSelected(null);
  }

  function handleNodeDragStop({
    nodes: draggedNodes,
  }: {
    targetNode: Node | null;
    nodes: Node[];
    event: MouseEvent | TouchEvent;
  }) {
    updateNodePositions(draggedNodes.map((n) => ({ id: n.id, position: n.position })));
  }

  function handleDelete({ nodes: delNodes, edges: delEdges }: { nodes: Node[]; edges: Edge[] }) {
    for (const n of delNodes) storeDeleteNode(n.id);
    for (const e of delEdges) storeDeleteEdge(e.id);
  }

  // Detect double-click on a node via native DOM event
  function handleDblClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    // Traverse up to find a node wrapper with [data-id]
    const nodeEl = target.closest('.svelte-flow__node') as HTMLElement | null;
    if (!nodeEl) {
      // Double-click on pane background — zoom out if not inside any boundary
      const s = get(diagramStore);
      if (s.navigationStack.length <= 1) return;
      if (screenToFlowPosition) {
        const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        const inBoundary = $contextBoundaries.some((g) => {
          const bb = g.boundingBox;
          return (
            flowPos.x >= bb.x &&
            flowPos.x <= bb.x + bb.width &&
            flowPos.y >= bb.y &&
            flowPos.y <= bb.y + bb.height
          );
        });
        if (!inBoundary) drillUp();
      }
      return;
    }
    const nodeId = nodeEl.getAttribute('data-id');
    if (!nodeId) return;
    const c4node = $currentDiagram?.nodes.find((n) => n.id === nodeId);
    if (!c4node || c4node.type === 'person') return;
    drillDown(nodeId);
  }
</script>

<div class="canvas-wrapper" role="presentation" ondblclick={handleDblClick}>
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    {edgeTypes}
    fitView
    minZoom={0.2}
    maxZoom={2}
    zoomOnDoubleClick={false}
    deleteKey="Delete"
    onconnect={handleConnect}
    onnodeclick={handleNodeClick}
    onedgeclick={handleEdgeClick}
    onpaneclick={handlePaneClick}
    onnodedragstop={handleNodeDragStop}
    ondelete={handleDelete}
  >
    <Background />
    <Controls />
    <MiniMap />
    <FlowHelper onReady={(fn) => { screenToFlowPosition = fn; }} />

    <!-- SVG marker definitions for edge start/end markers -->
    <svg style="position: absolute; width: 0; height: 0;">
      <defs>
        <!-- Arrow markers (auto-orient with path direction) -->
        <marker
          id="arrow-end"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#555" />
        </marker>
        <marker
          id="arrow-start"
          markerWidth="10"
          markerHeight="7"
          refX="1"
          refY="3.5"
          orient="auto-start-reverse"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#555" />
        </marker>
        <!-- Dot markers -->
        <marker
          id="dot-end"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <circle cx="3" cy="3" r="2.5" fill="#555" />
        </marker>
        <marker
          id="dot-start"
          markerWidth="6"
          markerHeight="6"
          refX="3"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <circle cx="3" cy="3" r="2.5" fill="#555" />
        </marker>
      </defs>
    </svg>
  </SvelteFlow>
</div>

<style>
  .canvas-wrapper {
    width: 100%;
    height: 100%;
  }
</style>
