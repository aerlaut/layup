/**
 * Utilities for the 'boundary-<parentNodeId>' synthetic node IDs that
 * SvelteFlow uses to render boundary rectangle groups.
 */

const BOUNDARY_PREFIX = 'boundary-';

/** Create a boundary node ID from a parent C4 node ID. */
export function toBoundaryId(parentNodeId: string): string {
  return `${BOUNDARY_PREFIX}${parentNodeId}`;
}

/** Extract the parent C4 node ID from a boundary node ID. */
export function fromBoundaryId(boundaryId: string): string {
  if (!isBoundaryId(boundaryId)) {
    throw new Error(`Not a boundary ID: "${boundaryId}"`);
  }
  return boundaryId.slice(BOUNDARY_PREFIX.length);
}

/** Returns true if the given ID belongs to a boundary rectangle node. */
export function isBoundaryId(id: string): boolean {
  return id.startsWith(BOUNDARY_PREFIX);
}
