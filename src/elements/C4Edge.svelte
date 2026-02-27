<script lang="ts">
  import { getBezierPath, getStraightPath, getSmoothStepPath, EdgeLabel, BaseEdge, EdgeReconnectAnchor, type EdgeProps, Position } from '@xyflow/svelte';
  import type { MarkerType, LineStyle, LineType } from '../types';
  import { updateEdge } from '../stores/diagramStore';
  import { EDGE_DEFAULT_COLOR } from '../utils/colors';

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition = Position.Bottom,
    targetPosition = Position.Top,
    data = {},
    label,
    selected,
  }: EdgeProps & {
    data?: {
      description?: string;
      technology?: string;
      markerStart?: MarkerType;
      markerEnd?: MarkerType;
      lineStyle?: LineStyle;
      lineType?: LineType;
      waypoints?: Array<{ x: number; y: number }>;
      color?: string;
    };
    [key: string]: unknown;
  } = $props();

  const markerStart = $derived(data?.markerStart ?? 'none');
  const markerEnd = $derived(data?.markerEnd ?? 'arrow');
  const lineStyle = $derived(data?.lineStyle ?? 'solid');
  const lineType = $derived(data?.lineType ?? 'bezier');
  const waypoints = $derived(data?.waypoints ?? []);
  const edgeColor = $derived(data?.color ?? EDGE_DEFAULT_COLOR);

  // Encode color into marker ID so each edge can have its own color
  const colorSuffix = $derived(edgeColor.replace('#', ''));

  const markerStartUrl = $derived(
    markerStart === 'arrow' ? `url(#arrow-start-${colorSuffix})` :
    markerStart === 'dot' ? `url(#dot-start-${colorSuffix})` :
    undefined
  );
  const markerEndUrl = $derived(
    markerEnd === 'arrow' ? `url(#arrow-end-${colorSuffix})` :
    markerEnd === 'dot' ? `url(#dot-end-${colorSuffix})` :
    undefined
  );

  const dashArray = $derived(
    lineStyle === 'dashed' ? '8 4' :
    lineStyle === 'dotted' ? '2 2' :
    undefined
  );

  const edgeStyle = $derived(
    `stroke: ${edgeColor};` +
    (dashArray ? ` stroke-dasharray: ${dashArray};` : '') +
    (selected ? ` stroke-width: 2; filter: drop-shadow(0 0 2px ${edgeColor});` : '')
  );

  // Compute path based on lineType; waypoints override with polyline
  const edgePath = $derived.by(() => {
    if (waypoints.length > 0) {
      // Build a polyline path through source → waypoints → target
      const points = [
        { x: sourceX, y: sourceY },
        ...waypoints,
        { x: targetX, y: targetY },
      ];
      // Use quadratic curves for smooth corners
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length - 1; i++) {
        const mid = {
          x: (points[i].x + points[i + 1].x) / 2,
          y: (points[i].y + points[i + 1].y) / 2,
        };
        d += ` Q ${points[i].x} ${points[i].y} ${mid.x} ${mid.y}`;
      }
      d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
      // Center label on the midpoint of the path
      const midIdx = Math.floor(points.length / 2);
      const lx = (points[midIdx - 1].x + points[midIdx].x) / 2;
      const ly = (points[midIdx - 1].y + points[midIdx].y) / 2;
      return [d, lx, ly] as [string, number, number];
    }
    const pathParams = { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition };
    switch (lineType) {
      case 'straight':
        return getStraightPath({ sourceX, sourceY, targetX, targetY });
      case 'step':
        return getSmoothStepPath({ ...pathParams, borderRadius: 0 });
      case 'smoothstep':
        return getSmoothStepPath({ ...pathParams });
      case 'bezier':
      default:
        return getBezierPath(pathParams);
    }
  });

  const path = $derived(edgePath[0]);
  const labelX = $derived(edgePath[1]);
  const labelY = $derived(edgePath[2]);

  // Reconnection state
  let reconnecting = $state(false);

  // Dragging state for waypoints
  let draggingIdx = $state<number | null>(null);
  let dragStartPos = $state<{ x: number; y: number } | null>(null);

  function handleWaypointMousedown(e: MouseEvent, idx: number) {
    e.stopPropagation();
    draggingIdx = idx;
    dragStartPos = { x: e.clientX, y: e.clientY };

    function onMouseMove(ev: MouseEvent) {
      if (draggingIdx === null) return;
      const dx = ev.clientX - (dragStartPos?.x ?? ev.clientX);
      const dy = ev.clientY - (dragStartPos?.y ?? ev.clientY);
      dragStartPos = { x: ev.clientX, y: ev.clientY };
      const updated = waypoints.map((wp, i) =>
        i === draggingIdx ? { x: wp.x + dx, y: wp.y + dy } : wp
      );
      updateEdge(id, { waypoints: updated });
    }

    function onMouseUp() {
      draggingIdx = null;
      dragStartPos = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function handleWaypointContextMenu(e: MouseEvent, idx: number) {
    e.preventDefault();
    e.stopPropagation();
    const updated = waypoints.filter((_, i) => i !== idx);
    updateEdge(id, { waypoints: updated });
  }

  let selectedWaypointIdx = $state<number | null>(null);

  function handleWaypointClick(e: MouseEvent, idx: number) {
    e.stopPropagation();
    selectedWaypointIdx = idx;
  }

  function handleWaypointKeydown(e: KeyboardEvent, idx: number) {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      const updated = waypoints.filter((_, i) => i !== idx);
      updateEdge(id, { waypoints: updated });
      selectedWaypointIdx = null;
    }
  }

  function handleEdgeDblClick(e: MouseEvent) {
    e.stopPropagation();
    // Insert waypoint at clicked SVG position
    const target = e.target as SVGElement;
    const svg = target.closest('svg');
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPt = pt.matrixTransform(ctm.inverse());
    // Find best insertion index along the path
    const allPoints = [
      { x: sourceX, y: sourceY },
      ...waypoints,
      { x: targetX, y: targetY },
    ];
    let bestIdx = waypoints.length; // default: append at end
    let bestDist = Infinity;
    for (let i = 0; i < allPoints.length - 1; i++) {
      const dist = distToSegment(svgPt, allPoints[i], allPoints[i + 1]);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    const updated = [
      ...waypoints.slice(0, bestIdx),
      { x: svgPt.x, y: svgPt.y },
      ...waypoints.slice(bestIdx),
    ];
    updateEdge(id, { waypoints: updated });
  }

  function distToSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) {
      return Math.hypot(p.x - a.x, p.y - a.y);
    }
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }
</script>

<!-- Invisible wide path for easier double-click interaction -->
<path
  d={path}
  fill="none"
  stroke="transparent"
  stroke-width="20"
  ondblclick={handleEdgeDblClick}
  style="cursor: pointer;"
  role="button"
  tabindex="-1"
  aria-label="Double-click to add waypoint"
/>

<!-- Per-edge colored marker definitions -->
<svg style="position: absolute; width: 0; height: 0;">
  <defs>
    <marker
      id="arrow-end-{colorSuffix}"
      markerWidth="10"
      markerHeight="7"
      refX="9"
      refY="3.5"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <polygon points="0 0, 10 3.5, 0 7" fill={edgeColor} />
    </marker>
    <marker
      id="arrow-start-{colorSuffix}"
      markerWidth="10"
      markerHeight="7"
      refX="1"
      refY="3.5"
      orient="auto-start-reverse"
      markerUnits="strokeWidth"
    >
      <polygon points="0 0, 10 3.5, 0 7" fill={edgeColor} />
    </marker>
    <marker
      id="dot-end-{colorSuffix}"
      markerWidth="6"
      markerHeight="6"
      refX="3"
      refY="3"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <circle cx="3" cy="3" r="2.5" fill={edgeColor} />
    </marker>
    <marker
      id="dot-start-{colorSuffix}"
      markerWidth="6"
      markerHeight="6"
      refX="3"
      refY="3"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <circle cx="3" cy="3" r="2.5" fill={edgeColor} />
    </marker>
  </defs>
</svg>

{#if !reconnecting}
  <BaseEdge
    {id}
    {path}
    markerStart={markerStartUrl}
    markerEnd={markerEndUrl}
    style={edgeStyle}
  />
{/if}

<!-- Reconnect anchors (visible when edge is selected) -->
{#if selected}
  <EdgeReconnectAnchor
    bind:reconnecting
    type="source"
    position={{ x: sourceX, y: sourceY }}
  />
  <EdgeReconnectAnchor
    bind:reconnecting
    type="target"
    position={{ x: targetX, y: targetY }}
  />
{/if}

<!-- Waypoint handles -->
{#each waypoints as wp, idx}
  <circle
    cx={wp.x}
    cy={wp.y}
    r="6"
    fill={selectedWaypointIdx === idx ? edgeColor : '#fff'}
    stroke={edgeColor}
    stroke-width="2"
    style="cursor: grab;"
    onmousedown={(e) => handleWaypointMousedown(e, idx)}
    oncontextmenu={(e) => handleWaypointContextMenu(e, idx)}
    onclick={(e) => handleWaypointClick(e, idx)}
    onkeydown={(e) => handleWaypointKeydown(e, idx)}
    role="button"
    tabindex="0"
    aria-label="Waypoint {idx + 1}"
  />
{/each}

{#if label || data?.technology}
  <EdgeLabel x={labelX} y={labelY}>
    {#if label}<span class="edge-label-text">{label}</span>{/if}
    {#if data?.technology}<span class="edge-tech">[{data.technology}]</span>{/if}
  </EdgeLabel>
{/if}

<style>
  :global(.svelte-flow__edge-label) {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #dee2e6;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 0.7rem;
    text-align: center;
    white-space: nowrap;
  }

  .edge-label-text {
    display: block;
    font-weight: 600;
    color: #212529;
  }

  .edge-tech {
    display: block;
    color: #6c757d;
    font-style: italic;
  }
</style>
