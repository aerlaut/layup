/** Default dimensions used for node bounding-box calculations */
export const NODE_DEFAULT_WIDTH = 160;
export const NODE_DEFAULT_HEIGHT = 80;

/**
 * UML class-node height estimation constants.
 * These mirror the CSS in UmlClassNode.svelte and are used by computeNodeHeight()
 * in the diagram store to size boundary groups dynamically.
 *
 * UML_NODE_HEIGHT_BASE   — header compartment: border(4) + padding(18) + stereotype(12) + label(17) + bottom-pad(10) — approximate for a stereotyped class with no members.
 * UML_MEMBER_ROW_HEIGHT  — per member row: 0.7rem × 14px × line-height 1.5 ≈ 14.7px, rounded down.
 * UML_COMPARTMENT_OVERHEAD — per non-empty compartment: border-top(1) + padding-top(4) + padding-bottom(6) + 1px margin.
 */
export const UML_NODE_HEIGHT_BASE = 52;
export const UML_MEMBER_ROW_HEIGHT = 14;
export const UML_COMPARTMENT_OVERHEAD = 12;

/** Padding around boundary groups */
export const BOUNDARY_PADDING = 40;
export const BOUNDARY_MIN_WIDTH = 220;
export const BOUNDARY_MIN_HEIGHT = 160;

/** localStorage warning threshold (4 MB) */
export const STORAGE_WARN_BYTES = 4 * 1024 * 1024;

/** Diagram schema versions */
export const SCHEMA_VERSION = 1;
export const APP_STATE_VERSION = 1;
