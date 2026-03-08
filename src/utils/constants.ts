/** Default dimensions used for node bounding-box calculations */
export const NODE_DEFAULT_WIDTH = 160;
export const NODE_DEFAULT_HEIGHT = 80;

/**
 * UML / ERD node height estimation constants.
 *
 * These values are used by `computeNodeHeight()` in diagramStore.ts to size
 * boundary groups. They MUST be kept in sync with the CSS in:
 *   - src/elements/UmlClassNode.svelte
 *   - src/elements/ErdTableNode.svelte
 *
 * ⚠️  If you change any CSS layout property (padding, font-size, line-height,
 *     border-width) in those components, update the constants below accordingly.
 *
 * Derivation:
 *   UML_NODE_HEIGHT_BASE = header compartment:
 *     border-top(2) + border-bottom(2) + padding-top(8) + stereotype(12px) +
 *     gap(2) + label(~17px) + padding-bottom(10) ≈ 52px for a stereotyped class.
 *
 *   UML_MEMBER_ROW_HEIGHT = per row:
 *     font-size(0.7rem = ~11.2px) × line-height(1.5) ≈ 16.8px → 14px conservative
 *
 *   UML_COMPARTMENT_OVERHEAD = per visible compartment:
 *     border-top(1) + padding-top(4) + padding-bottom(6) = 11px → rounded to 12
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
export const SCHEMA_VERSION = 2;
export const APP_STATE_VERSION = 1;
