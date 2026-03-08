export type C4LevelType = "context" | "container" | "component" | "code";

export type C4NodeType =
  | "person"
  | "external-person"
  | "system"
  | "external-system"
  | "container"
  | "database"
  | "db-schema"
  | "component"
  | "class"
  | "abstract-class"
  | "interface"
  | "enum"
  | "record"
  | "erd-table"
  | "erd-view";

/** Types for free-floating annotative elements that are not part of the C4 hierarchy */
export type AnnotationType = "group" | "note" | "package";

/** Combined type used by the palette and pending-placement state */
export type PaletteItemType = C4NodeType | AnnotationType;

export interface C4Node {
  id: string;
  type: C4NodeType;
  label: string;
  description?: string;
  technology?: string;
  position: { x: number; y: number };
  /** ID of the owning node at the level above; absent at context level */
  parentNodeId?: string;
  /** Custom color (hex) for this node; uses type default if omitted */
  color?: string;
  /** UML class members (attributes and operations). Only meaningful for UML Code-layer node types. */
  members?: ClassMember[];
  /** ERD table columns. Only meaningful for erd-table / erd-view node types. */
  columns?: TableColumn[];
}

/**
 * A free-floating annotative element. Annotations are stored separately from
 * C4 nodes and are never subject to boundary grouping, overlap resolution,
 * or drill-down navigation. They can be placed anywhere on the canvas.
 */
export interface Annotation {
  id: string;
  type: AnnotationType;
  label: string;
  /** Body text — used by "note" (post-it) annotations */
  text?: string;
  position: { x: number; y: number };
  /** Explicit pixel width (for group boundary box) */
  width?: number;
  /** Explicit pixel height (for group boundary box) */
  height?: number;
  /** Custom color (hex) */
  color?: string;
}

// ─── UML Class Members ────────────────────────────────────────────────────────

export type MemberVisibility = '+' | '-' | '#' | '~';

export interface ClassMember {
  id: string;
  kind: 'attribute' | 'operation';
  visibility: MemberVisibility;
  name: string;
  /** Field type (attributes) or return type (operations) */
  type?: string;
  /** Parameter list string for operations, e.g. "(x: int, y: string)" */
  params?: string;
  isStatic?: boolean;
  isAbstract?: boolean;
}

// ─── ERD Table Columns ────────────────────────────────────────────────────────

export interface TableColumn {
  id: string;
  /** Column name, e.g. "user_id" */
  name: string;
  /** SQL data type string, e.g. "INT", "VARCHAR(255)", "TIMESTAMP" */
  dataType: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  /** Whether the column accepts NULL values (defaults to true when omitted) */
  isNullable?: boolean;
  isUnique?: boolean;
  /** SQL DEFAULT expression, e.g. "NOW()", "'active'" */
  defaultValue?: string;
}

export type MarkerType =
  | 'arrow'
  | 'dot'
  | 'none'
  | 'open-arrow'
  | 'hollow-triangle'
  | 'hollow-diamond'
  | 'filled-diamond';
export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type LineType = 'bezier' | 'straight' | 'step' | 'smoothstep';

export interface C4Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  description?: string;
  technology?: string;
  sourceHandle?: string;
  targetHandle?: string;
  markerStart?: MarkerType;
  markerEnd?: MarkerType;
  lineStyle?: LineStyle;
  lineType?: LineType;
  waypoints?: Array<{ x: number; y: number }>;
  /** Custom color (hex) for this edge; uses default gray if omitted */
  color?: string;
  /** UML multiplicity label at the source end, e.g. "1", "0..*" */
  multiplicitySource?: string;
  /** UML multiplicity label at the target end, e.g. "1", "0..*" */
  multiplicityTarget?: string;
  /** UML role name at the source end */
  roleSource?: string;
  /** UML role name at the target end */
  roleTarget?: string;
}

export interface DiagramLevel {
  level: C4LevelType;
  nodes: C4Node[];
  edges: C4Edge[];
  /** Free-floating annotative elements (groups, notes). Never affect C4 hierarchy. */
  annotations: Annotation[];
}

export interface DiagramState {
  version: number;
  /** Four fixed levels keyed by C4LevelType */
  levels: Record<C4LevelType, DiagramLevel>;
  /** The currently visible level */
  currentLevel: C4LevelType;
  /** Currently selected node or edge ID, or null */
  selectedId: string | null;
  /** If true, user is in "pending place" mode after clicking palette */
  pendingNodeType: PaletteItemType | null;
}

// ─── Node Subtree Export ──────────────────────────────────────────────────────

export interface NodeSubtreeLevelData {
  level: C4LevelType;
  nodes: C4Node[];
  edges: C4Edge[];
  // Annotations are intentionally excluded — they are free-floating and have
  // no semantic relationship to the exported node's subtree.
}

export interface NodeSubtreeExport {
  /** Distinguishes this format from a full DiagramState export. */
  exportType: 'node-subtree';
  /** Bump when the format changes in a breaking way. */
  version: 1;
  /** The C4 level at which the root node lives. */
  rootLevel: C4LevelType;
  /**
   * Data for rootLevel and every level below it.
   * levels[rootLevel].nodes[0] is always the root node, with parentNodeId
   * stripped (undefined) so it can be re-parented on import.
   * Edges at rootLevel are excluded because they connect to nodes outside the
   * subtree. Edges at descendant levels are included only when both the source
   * and target node are within the subtree.
   */
  levels: Partial<Record<C4LevelType, NodeSubtreeLevelData>>;
}

export interface BoundaryGroup {
  parentNodeId: string;
  parentLabel: string;
  childNodes: C4Node[];
  boundingBox: { x: number; y: number; width: number; height: number };
}

// ─── Account / Project / Diagram hierarchy ────────────────────────────────────

export interface Account {
  id: string;
  name: string;
  email?: string;
  createdAt: number;
  updatedAt: number;
}

/** Wraps a DiagramState with metadata for project-level management */
export interface DiagramMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  state: DiagramState;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  diagrams: Record<string, DiagramMeta>;
}

export interface AppState {
  version: number;
  account: Account;
  projects: Record<string, Project>;
}

/** Which screen the app is currently showing */
export type AppView =
  | { screen: 'home' }
  | { screen: 'editor'; projectId: string; diagramId: string };
