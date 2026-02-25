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

export interface C4Edge {
  id: string;
  source: string;
  target: string;
  label?: string;
  description?: string;
  technology?: string;
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
}
