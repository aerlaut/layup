import type { DiagramState } from '../types';
import { generateId } from './id';

/**
 * Remaps all IDs in a DiagramState to fresh generated IDs.
 * Preserves all internal cross-references (childDiagramId, edge source/target, etc).
 * Returns a new DiagramState — the input is not mutated.
 */
export function remapIds(state: DiagramState): DiagramState {
  // Build remapping tables
  const levelIdMap = new Map<string, string>();
  const nodeIdMap = new Map<string, string>();
  const edgeIdMap = new Map<string, string>();
  const annotIdMap = new Map<string, string>();

  for (const levelId of Object.keys(state.diagrams)) {
    levelIdMap.set(levelId, generateId());
  }
  for (const level of Object.values(state.diagrams)) {
    for (const node of level.nodes) nodeIdMap.set(node.id, generateId());
    for (const edge of level.edges) edgeIdMap.set(edge.id, generateId());
    for (const annot of level.annotations ?? []) annotIdMap.set(annot.id, generateId());
  }

  // Rewrite all levels
  const newDiagrams: DiagramState['diagrams'] = {};
  for (const [oldLevelId, level] of Object.entries(state.diagrams)) {
    const newLevelId = levelIdMap.get(oldLevelId)!;
    newDiagrams[newLevelId] = {
      ...level,
      id: newLevelId,
      nodes: level.nodes.map((n) => ({
        ...n,
        id: nodeIdMap.get(n.id)!,
        childDiagramId: n.childDiagramId ? levelIdMap.get(n.childDiagramId) : undefined,
      })),
      edges: level.edges.map((e) => ({
        ...e,
        id: edgeIdMap.get(e.id)!,
        source: nodeIdMap.get(e.source) ?? e.source,
        target: nodeIdMap.get(e.target) ?? e.target,
      })),
      annotations: (level.annotations ?? []).map((a) => ({
        ...a,
        id: annotIdMap.get(a.id)!,
      })),
    };
  }

  return {
    ...state,
    diagrams: newDiagrams,
    rootId: levelIdMap.get(state.rootId)!,
    navigationStack: state.navigationStack
      .map((id) => levelIdMap.get(id))
      .filter((id): id is string => !!id),
    selectedId: null,
    pendingNodeType: null,
  };
}
