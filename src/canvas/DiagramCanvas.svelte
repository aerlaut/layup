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

  import {
    currentDiagram,
    addEdge as storeAddEdge,
    deleteNode as storeDeleteNode,
    deleteEdge as storeDeleteEdge,
    setSelected,
    updateNodePositions,
    drillDown,
    pendingNodeType,
  } from '../stores/diagramStore';
  import type { C4Node, C4Edge } from '../types';
  import PersonNode from '../elements/PersonNode.svelte';
  import SystemNode from '../elements/SystemNode.svelte';
  import ContainerNode from '../elements/ContainerNode.svelte';
  import ComponentNode from '../elements/ComponentNode.svelte';
  import C4EdgeComponent from '../elements/C4Edge.svelte';
  import FlowHelper from './FlowHelper.svelte';

  const dispatch = createEventDispatcher<{ place: { x: number; y: number } }>();

  const nodeTypes = {
    person: PersonNode,
    system: SystemNode,
    container: ContainerNode,
    component: ComponentNode,
    'code-element': SystemNode,
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
      type: 'c4edge',
      label: e.label,
      data: { description: e.description, technology: e.technology },
    };
  }

  // Bindable reactive arrays for SvelteFlow
  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);

  // Sync diagram store → flow nodes/edges
  $effect(() => {
    const d = $currentDiagram;
    nodes = d?.nodes.map(toFlowNode) ?? [];
    edges = d?.edges.map(toFlowEdge) ?? [];
  });

  // screenToFlowPosition provided by FlowHelper child component
  let screenToFlowPosition: ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined;

  // ─── Event handlers ──────────────────────────────────────────────────────────

  function handleConnect(conn: Connection) {
    const newEdge: C4Edge = {
      id: `edge-${Date.now()}`,
      source: conn.source,
      target: conn.target,
      label: '',
      description: '',
      technology: '',
    };
    storeAddEdge(newEdge);
  }

  function handleNodeClick({ node }: { node: Node; event: MouseEvent | TouchEvent }) {
    setSelected(node.id);
  }

  function handleEdgeClick({ edge }: { edge: Edge; event: MouseEvent }) {
    setSelected(edge.id);
  }

  function handlePaneClick({ event }: { event: MouseEvent }) {
    const pending = $pendingNodeType;
    if (pending && screenToFlowPosition) {
      const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      dispatch('place', pos);
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
    if (!nodeEl) return;
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
  </SvelteFlow>
</div>

<style>
  .canvas-wrapper {
    width: 100%;
    height: 100%;
  }
</style>
