import type { DiagramState, C4LevelType } from '../types';
import { generateId } from './id';
import { LEVEL_ORDER } from '../stores/diagramStore';

/**
 * Remaps all IDs in a DiagramState to fresh generated IDs.
 * Preserves all internal cross-references (parentNodeId, edge source/target, etc).
 * Returns a new DiagramState — the input is not mutated.
 */
export function remapIds(state: DiagramState): DiagramState {
  // Build a node ID remap table across all levels
  const nodeIdMap = new Map<string, string>();
  const edgeIdMap = new Map<string, string>();
  const annotIdMap = new Map<string, string>();

  for (const level of LEVEL_ORDER) {
    const d = state.levels[level as C4LevelType];
    if (!d) continue;
    for (const node  of d.nodes)       nodeIdMap.set(node.id,  generateId());
    for (const edge  of d.edges)       edgeIdMap.set(edge.id,  generateId());
    for (const annot of d.annotations) annotIdMap.set(annot.id, generateId());
  }

  // Rewrite all levels with remapped IDs
  const newLevels: DiagramState['levels'] = {} as DiagramState['levels'];

  for (const level of LEVEL_ORDER) {
    const d = state.levels[level as C4LevelType];
    if (!d) continue;
    newLevels[level as C4LevelType] = {
      ...d,
      nodes: d.nodes.map((n) => ({
        ...n,
        id:           nodeIdMap.get(n.id)!,
        // parentNodeId points to a node at the level above — remap it
        parentNodeId: n.parentNodeId ? nodeIdMap.get(n.parentNodeId) : undefined,
      })),
      edges: d.edges.map((e) => ({
        ...e,
        id:     edgeIdMap.get(e.id)!,
        source: nodeIdMap.get(e.source) ?? e.source,
        target: nodeIdMap.get(e.target) ?? e.target,
      })),
      annotations: d.annotations.map((a) => ({
        ...a,
        id: annotIdMap.get(a.id)!,
      })),
    };
  }

  return {
    ...state,
    levels: newLevels,
    selectedId: null,
    pendingNodeType: null,
  };
}
