<script lang="ts">
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    ConnectionMode,
    type Node,
    type Edge,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  import { get } from 'svelte/store';
  import {
    diagramStore,
    currentDiagram,
    contextBoundaries,
    parentDiagram,
    selectedId,
  } from '../stores/diagramStore';
  import PersonNode from '../elements/PersonNode.svelte';
  import ExternalPersonNode from '../elements/ExternalPersonNode.svelte';
  import SystemNode from '../elements/SystemNode.svelte';
  import ExternalSystemNode from '../elements/ExternalSystemNode.svelte';
  import ContainerNode from '../elements/ContainerNode.svelte';
  import DatabaseNode from '../elements/DatabaseNode.svelte';
  import DbSchemaNode from '../elements/DbSchemaNode.svelte';
  import ComponentNode from '../elements/ComponentNode.svelte';
  import UmlClassNode from '../elements/UmlClassNode.svelte';
  import ErdTableNode from '../elements/ErdTableNode.svelte';
  import BoundaryNode from '../elements/BoundaryNode.svelte';
  import GroupNode from '../elements/GroupNode.svelte';
  import NoteNode from '../elements/NoteNode.svelte';
  import PackageNode from '../elements/PackageNode.svelte';
  import C4EdgeComponent from '../elements/C4Edge.svelte';
  import FlowHelper from './FlowHelper.svelte';
  import { buildFlowData } from './flowSync';
  import {
    handleConnect,
    handleReconnect,
    handleNodeClick,
    handleEdgeClick,
    makeHandlePaneClick,
    makeHandleNodeDragStop,
    handleDelete,
    makeHandleDblClick,
  } from './canvasHandlers';
  import { handleDragOver, makeHandleDrop } from './canvasDragDrop';

  const nodeTypes = {
    person: PersonNode,
    'external-person': ExternalPersonNode,
    system: SystemNode,
    'external-system': ExternalSystemNode,
    container: ContainerNode,
    database: DatabaseNode,
    'db-schema': DbSchemaNode,
    component: ComponentNode,
    class: UmlClassNode,
    'abstract-class': UmlClassNode,
    interface: UmlClassNode,
    enum: UmlClassNode,
    record: UmlClassNode,
    'erd-table': ErdTableNode,
    'erd-view': ErdTableNode,
    boundary: BoundaryNode,
    group: GroupNode,
    note: NoteNode,
    package: PackageNode,
  } as const;

  const edgeTypes = {
    c4edge: C4EdgeComponent,
  } as const;

  // Bindable reactive arrays for SvelteFlow
  let nodes = $state<Node[]>([]);
  let edges = $state<Edge[]>([]);

  // Helpers exposed by FlowHelper (must live inside SvelteFlow context)
  let screenToFlowPosition: ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined;
  let flowFitView: ((options?: { duration?: number }) => void) | undefined;

  // Build event handlers that need access to screenToFlowPosition
  const handlePaneClick = makeHandlePaneClick();
  const handleNodeDragStop = makeHandleNodeDragStop(() => nodes);
  const handleDblClick = makeHandleDblClick(
    () => screenToFlowPosition,
    () => $currentDiagram?.nodes ?? [],
  );
  const handleDrop = makeHandleDrop(() => screenToFlowPosition);

  // Sync diagram store → flow nodes/edges
  $effect(() => {
    const result = buildFlowData(
      get(diagramStore),
      $currentDiagram,
      $contextBoundaries,
      $parentDiagram,
      $selectedId,
    );
    nodes = result.nodes;
    edges = result.edges;
  });

  // Refit viewport on drill-down/drill-up (navigation stack length changes)
  let prevNavStackLength = $state(0);
  $effect(() => {
    const currentLength = get(diagramStore).navigationStack.length;
    if (prevNavStackLength !== 0 && currentLength !== prevNavStackLength && flowFitView) {
      flowFitView({ duration: 200 });
    }
    prevNavStackLength = currentLength;
  });
</script>

<div
  class="canvas-wrapper"
  role="presentation"
  ondblclick={handleDblClick}
  ondragover={handleDragOver}
  ondrop={handleDrop}
>
  <SvelteFlow
    bind:nodes
    bind:edges
    {nodeTypes}
    {edgeTypes}
    fitView={prevNavStackLength === 0}
    minZoom={0.2}
    maxZoom={2}
    zoomOnDoubleClick={false}
    connectionMode={ConnectionMode.Loose}
    connectionRadius={40}
    deleteKey={["Delete", "Backspace"]}
    onconnect={handleConnect}
    onreconnect={handleReconnect}
    onnodeclick={handleNodeClick}
    onedgeclick={handleEdgeClick}
    onpaneclick={handlePaneClick}
    onnodedragstop={handleNodeDragStop}
    ondelete={handleDelete}
  >
    <Background />
    <Controls />
    <MiniMap />
    <FlowHelper
      onReady={(fns) => {
        screenToFlowPosition = fns.screenToFlowPosition;
        flowFitView = fns.fitView;
      }}
    />

    <!-- SVG marker definitions for edge start/end markers -->
    <svg style="position: absolute; width: 0; height: 0;">
      <defs>
        <marker id="arrow-end" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
          <polygon points="0 0, 10 3.5, 0 7" fill="#555" />
        </marker>
        <marker id="arrow-start" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse" markerUnits="strokeWidth">
          <polygon points="0 0, 10 3.5, 0 7" fill="#555" />
        </marker>
        <marker id="dot-end" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto" markerUnits="strokeWidth">
          <circle cx="3" cy="3" r="2.5" fill="#555" />
        </marker>
        <marker id="dot-start" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto" markerUnits="strokeWidth">
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
