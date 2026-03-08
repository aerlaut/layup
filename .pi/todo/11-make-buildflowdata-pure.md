# Task 11 — Make `buildFlowData` a Pure Function

## Motivation

`buildFlowData` in `src/canvas/flowSync.ts` is documented as a "pure function"
but it mutates objects in the intermediate `allC4Nodes` array in-place:

```ts
const allC4Nodes: Node[] = currentLevelData.nodes.map((n) =>
  toFlowNode(n, selectedId, nodeIdsWithChildren.has(n.id))
);
// ...
for (const flowNode of allC4Nodes) {
  if (group.childNodes.some((cn) => cn.id === flowNode.id)) {
    flowNode.parentId = boundaryId;     // ← mutation of local object
    flowNode.position = { ... };        // ← mutation of local object
  }
}
```

The mutations do not affect the Svelte store (`.map()` creates new objects), but
they violate referential transparency and make the function harder to test and
reason about. A true pure function never modifies its arguments or any
intermediary objects — it only computes a new value from its inputs.

Additionally, the single-pass mutation approach intermingles boundary-assignment
logic with the node-conversion loop in a way that is hard to follow.

## Files to change

- `src/canvas/flowSync.ts`

## Task details

### Refactor approach

Replace the in-place mutation with a two-pass approach:

**Pass 1:** Convert all C4 nodes to SvelteFlow nodes (absolute positions).

**Pass 2:** Build a lookup `Map<nodeId, { parentId, relativePosition }>` from the
boundary groups, then apply the reparenting in the final array construction
without touching the objects produced in Pass 1.

```ts
export function buildFlowData(
  state: DiagramState,
  currentLevelData: DiagramLevel | undefined,
  boundaries: BoundaryGroup[],
  selectedId: string | null,
): FlowData {
  if (!currentLevelData) return { nodes: [], edges: [] };

  // Pass 1: determine which nodes have children
  const nextLvl = nextLevel(state.currentLevel);
  const nextLevelNodes = nextLvl ? (state.levels[nextLvl]?.nodes ?? []) : [];
  const nodeIdsWithChildren = new Set(
    nextLevelNodes.map((n) => n.parentNodeId).filter(Boolean) as string[]
  );

  // Pass 2: build boundary assignment map
  type BoundaryAssignment = { parentId: string; relativeX: number; relativeY: number };
  const boundaryAssignments = new Map<string, BoundaryAssignment>();
  const boundaryFlowNodes: Node[] = [];

  if (boundaries.length > 0) {
    const prevLvl = prevLevel(state.currentLevel);
    const parentLevelData = prevLvl ? state.levels[prevLvl] : undefined;

    for (const group of boundaries) {
      const boundaryId = toBoundaryId(group.parentNodeId); // from Task 04
      const bb = group.boundingBox;

      const parentNode = parentLevelData?.nodes.find((n) => n.id === group.parentNodeId);
      const boundaryColor =
        parentNode?.color ?? NODE_DEFAULT_COLORS[(parentNode?.type ?? 'system') as C4NodeType];

      boundaryFlowNodes.push({
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

  // Pass 3: produce final C4 flow nodes with boundary reparenting applied
  const allC4Nodes: Node[] = currentLevelData.nodes.map((n) => {
    const assignment = boundaryAssignments.get(n.id);
    const base = toFlowNode(n, selectedId, nodeIdsWithChildren.has(n.id));
    if (!assignment) return base;
    return {
      ...base,
      parentId: assignment.parentId,
      position: { x: assignment.relativeX, y: assignment.relativeY },
    };
  });

  // Annotations (unchanged)
  const annotations = currentLevelData.annotations ?? [];
  const annotationNodes = annotations.map((a) => toFlowAnnotation(a, selectedId));
  const containerAnnotations  = annotationNodes.filter((n) => n.type === 'group' || n.type === 'package');
  const foregroundAnnotations = annotationNodes.filter((n) => n.type !== 'group' && n.type !== 'package');

  return {
    nodes: [...containerAnnotations, ...boundaryFlowNodes, ...allC4Nodes, ...foregroundAnnotations],
    edges: currentLevelData.edges.map((e) => toFlowEdge(e, selectedId)),
  };
}
```

> This task assumes Task 04 (boundary ID utilities) is complete. If done
> independently, replace `toBoundaryId(group.parentNodeId)` with
> `` `boundary-${group.parentNodeId}` `` as before.

### Test coverage

Add a unit test to `tests/canvas/flowSync.test.ts`:

```ts
it('buildFlowData does not mutate the input state', () => {
  const state = createInitialDiagramState();
  // Add a node to the context level
  state.levels.context.nodes.push({ id: 'n1', type: 'system', label: 'S', position: { x: 100, y: 100 } });
  const frozen = JSON.stringify(state);

  buildFlowData(state, state.levels.context, [], null);

  expect(JSON.stringify(state)).toBe(frozen); // state unchanged
});
```

## Acceptance criteria

- [ ] `buildFlowData` does not mutate any object passed to it or any intermediate
      created during its execution.
- [ ] The boundary reparenting logic (parentId + relative position) produces
      identical output to the previous implementation.
- [ ] New unit test verifies immutability.
- [ ] `pnpm test:run` passes (including existing `flowSync.test.ts` tests).
- [ ] Canvas renders boundary groups correctly with child nodes positioned
      relative to their parent boundary rectangle.
