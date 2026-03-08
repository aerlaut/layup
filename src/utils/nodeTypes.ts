import type { AnnotationType, C4NodeType } from '../types';

// ─── UML / ERD groupings ──────────────────────────────────────────────────────

export const UML_CLASS_TYPES = new Set<C4NodeType>([
  'class', 'abstract-class', 'interface', 'enum', 'record',
]);

export const ERD_NODE_TYPES = new Set<C4NodeType>([
  'erd-table', 'erd-view',
]);

/**
 * Node types that cannot be drilled into. UML and ERD nodes expose their
 * internal structure natively (member / column lists). Person nodes are
 * excluded by long-standing C4 convention.
 */
export const NON_DRILLABLE_TYPES = new Set<C4NodeType>([
  'person',
  ...UML_CLASS_TYPES,
  ...ERD_NODE_TYPES,
]);

// ─── Default labels used when placing a node from the palette ─────────────────

export const NODE_DEFAULT_LABELS: Record<C4NodeType, string> = {
  person:            'Person',
  'external-person': 'External Person',
  system:            'Software System',
  'external-system': 'External System',
  container:         'Container',
  database:          'Database',
  component:         'Component',
  'db-schema':       'Schema',
  class:             'Class',
  'abstract-class':  'Abstract Class',
  interface:         'Interface',
  enum:              'Enum',
  record:            'Record',
  'erd-table':       'Table',
  'erd-view':        'View',
};

export const ANNOTATION_DEFAULT_LABELS: Record<AnnotationType, string> = {
  group:   'Group',
  note:    'Note',
  package: 'Package',
};
