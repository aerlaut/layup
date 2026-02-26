export type C4LevelType = "context" | "container" | "component" | "code";

export type C4NodeType = "person" | "system" | "container" | "component" | "code-element";

export interface C4Node {
  id: string;
  type: C4NodeType;
  label: string;
  description?: string;
  technology?: string;
  position: { x: number; y: number };
  /** ID of the child DiagramLevel this node drills into */
  childDiagramId?: string;
}

export type MarkerType = 'arrow' | 'dot' | 'none';
export type LineStyle = 'solid' | 'dashed' | 'dotted';

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
  waypoints?: Array<{ x: number; y: number }>;
}

export interface DiagramLevel {
  id: string;
  level: C4LevelType;
  /** Label shown in breadcrumb and toolbar */
  label: string;
  nodes: C4Node[];
  edges: C4Edge[];
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
  pendingNodeType: C4NodeType | null;
  /** ID of the parent node that was drilled into to reach the current diagram, or null if at root */
  focusedParentNodeId: string | null;
}

export interface BoundaryGroup {
  parentNodeId: string;
  parentLabel: string;
  isFocused: boolean;
  childNodes: C4Node[];
  boundingBox: { x: number; y: number; width: number; height: number };
}
