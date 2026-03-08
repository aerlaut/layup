import type { DiagramState, NodeSubtreeExport, C4Node, C4LevelType } from '../types';
import { ImportError } from './persistence';
import { generateId } from './id';
import { prevLevel } from '../stores/diagramNavigation';
import { childTypeIsValid } from '../stores/diagramLayout';
import { LEVEL_ORDER } from '../stores/diagramStore';

const VALID_LEVELS = new Set<C4LevelType>(['context', 'container', 'component', 'code']);

// ─── parseNodeSubtreeJSON ─────────────────────────────────────────────────────

/**
 * Parses and validates a JSON string as a `NodeSubtreeExport`.
 * Throws `ImportError` on malformed JSON or failed validation.
 */
export function parseNodeSubtreeJSON(text: string): NodeSubtreeExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ImportError('Invalid JSON: could not parse file.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new ImportError('Invalid node subtree: expected a JSON object.');
  }

  const obj = parsed as Record<string, unknown>;

  if (obj['exportType'] !== 'node-subtree') {
    throw new ImportError(
      `Invalid node subtree: expected exportType "node-subtree", got "${obj['exportType']}".`
    );
  }

  if (obj['version'] !== 1) {
    throw new ImportError(
      `Invalid node subtree: expected version 1, got "${obj['version']}".`
    );
  }

  const rootLevel = obj['rootLevel'];
  if (typeof rootLevel !== 'string' || !VALID_LEVELS.has(rootLevel as C4LevelType)) {
    throw new ImportError(
      `Invalid node subtree: "rootLevel" must be one of context, container, component, code.`
    );
  }

  const levels = obj['levels'];
  if (typeof levels !== 'object' || levels === null) {
    throw new ImportError('Invalid node subtree: "levels" must be a non-null object.');
  }

  const levelsObj = levels as Record<string, unknown>;
  if (!(rootLevel in levelsObj)) {
    throw new ImportError(
      `Invalid node subtree: "levels" must include an entry for rootLevel "${rootLevel}".`
    );
  }

  const rootLevelData = levelsObj[rootLevel] as Record<string, unknown> | undefined;
  if (!rootLevelData || !Array.isArray(rootLevelData['nodes']) || rootLevelData['nodes'].length === 0) {
    throw new ImportError(
      `Invalid node subtree: levels["${rootLevel}"].nodes must be a non-empty array.`
    );
  }

  return parsed as NodeSubtreeExport;
}

// ─── getValidParentNodes ──────────────────────────────────────────────────────

/**
 * Returns all nodes in `state` that can be valid parents for the given subtree.
 * Returns an empty array if the subtree's root is at the context level (no parent needed).
 */
export function getValidParentNodes(state: DiagramState, subtree: NodeSubtreeExport): C4Node[] {
  const parentLevel = prevLevel(subtree.rootLevel);
  if (!parentLevel) return [];

  return state.levels[parentLevel].nodes.filter((n) =>
    childTypeIsValid(n.type, subtree.rootLevel)
  );
}

// ─── importNodeSubtree ────────────────────────────────────────────────────────

/**
 * Merges a `NodeSubtreeExport` into the given `DiagramState` and returns the
 * new state. The original state is never mutated.
 *
 * @param state        - The live diagram state to import into.
 * @param subtree      - The parsed subtree export.
 * @param parentNodeId - The ID of an existing node that will become the parent
 *                       of the imported root node. Omit when the root is at the
 *                       context level.
 */
export function importNodeSubtree(
  state: DiagramState,
  subtree: NodeSubtreeExport,
  parentNodeId?: string
): DiagramState {
  // 1. Build old→new ID maps for every node and edge across all levels.
  const idMap = new Map<string, string>();

  for (const level of LEVEL_ORDER) {
    const levelData = subtree.levels[level];
    if (!levelData) continue;
    for (const node of levelData.nodes) {
      idMap.set(node.id, generateId());
    }
    for (const edge of levelData.edges) {
      idMap.set(edge.id, generateId());
    }
  }

  // 2. Rewrite each level and merge into a copy of the state.
  let newState = state;

  for (const level of LEVEL_ORDER) {
    const levelData = subtree.levels[level];
    if (!levelData) continue;

    const rewrittenNodes = levelData.nodes.map((node) => {
      const isRoot = level === subtree.rootLevel && node === levelData.nodes[0];
      return {
        ...node,
        id: idMap.get(node.id) ?? node.id,
        parentNodeId: isRoot
          ? parentNodeId
          : node.parentNodeId !== undefined
          ? (idMap.get(node.parentNodeId) ?? node.parentNodeId)
          : undefined,
      };
    });

    const rewrittenEdges = levelData.edges.map((edge) => ({
      ...edge,
      id: idMap.get(edge.id) ?? edge.id,
      source: idMap.get(edge.source) ?? edge.source,
      target: idMap.get(edge.target) ?? edge.target,
    }));

    // 3. Merge — spread new nodes/edges, leave annotations untouched.
    newState = {
      ...newState,
      levels: {
        ...newState.levels,
        [level]: {
          ...newState.levels[level],
          nodes: [...newState.levels[level].nodes, ...rewrittenNodes],
          edges: [...newState.levels[level].edges, ...rewrittenEdges],
        },
      },
    };
  }

  return newState;
}
