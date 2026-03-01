export type C4LevelType = "context" | "container" | "component" | "code";

export type C4NodeType =
  | "person"
  | "external-person"
  | "system"
  | "external-system"
  | "container"
  | "database"
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
  /** ID of the child DiagramLevel this node drills into */
  childDiagramId?: string;
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
  /** Set when source node is in a different group (cross-group edge) */
  sourceGroupId?: string;
  /** Set when target node is in a different group (cross-group edge) */
  targetGroupId?: string;
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
  id: string;
  level: C4LevelType;
  /** Label shown in breadcrumb and toolbar */
  label: string;
  nodes: C4Node[];
  edges: C4Edge[];
  /** Free-floating annotative elements (groups, notes). Never affect C4 hierarchy. */
  annotations: Annotation[];
}

export interface DiagramState {
  version: number;
  /** Flat map of all diagram levels by ID */
  diagrams: Record<string, DiagramLevel>;
  /** Root diagram ID (always the Context-level diagram) */
  rootId: string;
  /** Current navigation stack — last element is the active diagram */
  navigationStack: string[];
  /** Currently selected node or edge ID, or null */
  selectedId: string | null;
  /** If true, user is in "pending place" mode after clicking palette */
  pendingNodeType: PaletteItemType | null;
}

export interface BoundaryGroup {
  parentNodeId: string;
  parentLabel: string;
  childNodes: C4Node[];
  boundingBox: { x: number; y: number; width: number; height: number };
  /** The child diagram ID for this group */
  childDiagramId: string;
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
