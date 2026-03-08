/** Conversion utilities for absolute ↔ boundary-relative node positions. */

export interface Point { x: number; y: number }

/**
 * Convert an absolute canvas position to a position relative to a boundary
 * rectangle's top-left corner.
 *
 * Used by `flowSync.ts` when producing SvelteFlow nodes inside boundary groups.
 */
export function toRelativePosition(absolute: Point, boundaryOrigin: Point): Point {
  return {
    x: absolute.x - boundaryOrigin.x,
    y: absolute.y - boundaryOrigin.y,
  };
}

/**
 * Convert a boundary-relative position back to an absolute canvas position.
 *
 * Used by `canvasHandlers.ts` after a drag event to write back to the store.
 */
export function toAbsolutePosition(relative: Point, boundaryOrigin: Point): Point {
  return {
    x: relative.x + boundaryOrigin.x,
    y: relative.y + boundaryOrigin.y,
  };
}
