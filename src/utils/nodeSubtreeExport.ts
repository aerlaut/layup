import type { DiagramState, C4LevelType, NodeSubtreeExport, NodeSubtreeLevelData } from '../types';
import { LEVEL_ORDER } from '../stores/diagramStore';
import { collectDescendants } from '../stores/diagramLayout';

/**
 * Builds a `NodeSubtreeExport` for the given node ID from the diagram state.
 * Throws if the node cannot be found in any level.
 */
export function buildNodeSubtreeExport(
  state: DiagramState,
  nodeId: string
): NodeSubtreeExport {
  // 1. Find the root node's level.
  let rootLevel: C4LevelType | undefined;
  for (const level of LEVEL_ORDER) {
    const found = state.levels[level].nodes.some((n) => n.id === nodeId);
    if (found) {
      rootLevel = level;
      break;
    }
  }
  if (!rootLevel) {
    throw new Error(`Node "${nodeId}" not found in any level of the diagram.`);
  }

  // 2. Collect all descendant node IDs (includes rootLevel with {nodeId}).
  const descendants = collectDescendants(state, nodeId, rootLevel);

  // 3. Build level data for each level in the descendants map.
  const levels: Partial<Record<C4LevelType, NodeSubtreeLevelData>> = {};

  for (const level of LEVEL_ORDER) {
    const idSet = descendants.get(level);
    if (!idSet) continue;

    const filteredNodes = state.levels[level].nodes
      .filter((n) => idSet.has(n.id))
      .map((n) => {
        // 4. Strip parentNodeId from the root node so it can be re-parented on import.
        if (n.id === nodeId) {
          const { parentNodeId: _stripped, ...rest } = n;
          return rest;
        }
        return n;
      });

    // Edges at rootLevel are always excluded (only one node there; no intra-level edges possible).
    // For descendant levels, include only edges where both endpoints are in the subtree.
    const filteredEdges =
      level === rootLevel
        ? []
        : state.levels[level].edges.filter(
            (e) => idSet.has(e.source) && idSet.has(e.target)
          );

    levels[level] = {
      level,
      nodes: filteredNodes,
      edges: filteredEdges,
    };
  }

  return {
    exportType: 'node-subtree',
    version: 1,
    rootLevel,
    levels,
  };
}

/**
 * Builds a `NodeSubtreeExport`, serialises it to JSON, and triggers a browser
 * download with filename `<label>-subtree.json` (falling back to `node-subtree.json`).
 */
export function exportNodeSubtree(
  state: DiagramState,
  nodeId: string,
  label?: string
): void {
  const exportData = buildNodeSubtreeExport(state, nodeId);
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = label ? `${label}-subtree.json` : 'node-subtree.json';
  a.click();
  URL.revokeObjectURL(url);
}
