/**
 * canvasDragDrop.ts
 *
 * Palette drag-and-drop handlers for DiagramCanvas. Extracted to keep
 * DiagramCanvas.svelte thin.
 */
import type { Annotation, AnnotationType, C4Node, C4NodeType } from '../types';
import {
  diagramStore,
  addNode as storeAddNode,
  addNodeToDiagram,
  addAnnotation,
  contextBoundaries,
} from '../stores/diagramStore';
import { get } from 'svelte/store';
import { generateId } from '../utils/id';

const NODE_DEFAULT_LABELS: Record<C4NodeType, string> = {
  person: 'Person',
  'external-person': 'External Person',
  system: 'Software System',
  'external-system': 'External System',
  container: 'Container',
  database: 'Database',
  component: 'Component',
  class: 'Class',
  'abstract-class': 'Abstract Class',
  interface: 'Interface',
  enum: 'Enum',
  record: 'Record',
  'erd-table': 'Table',
  'erd-view': 'View',
};

const ANNOTATION_DEFAULT_LABELS: Record<AnnotationType, string> = {
  group: 'Group',
  note: 'Note',
  package: 'Package',
};

export function handleDragOver(e: DragEvent): void {
  const types = e.dataTransfer?.types ?? [];
  if (!types.includes('application/c4-node-type') && !types.includes('application/annotation-type')) return;
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
}

export function makeHandleDrop(
  getScreenToFlowPosition: () => ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined,
): (e: DragEvent) => void {
  return (e: DragEvent) => {
    if (!e.dataTransfer) return;
    const screenToFlowPosition = getScreenToFlowPosition();
    if (!screenToFlowPosition) return;

    // ── Annotation drop (no boundary constraint) ──────────────────────────────
    const annotationType = e.dataTransfer.getData('application/annotation-type') as AnnotationType | '';
    if (annotationType) {
      e.preventDefault();
      const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const newAnnotation: Annotation = {
        id: generateId(),
        type: annotationType,
        label: ANNOTATION_DEFAULT_LABELS[annotationType],
        text: '',
        position: flowPos,
      };
      addAnnotation(newAnnotation);
      return;
    }

    // ── C4 node drop (boundary-constrained when drilled in) ───────────────────
    const nodeType = e.dataTransfer.getData('application/c4-node-type') as C4NodeType | '';
    if (!nodeType) return;
    e.preventDefault();

    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const s = get(diagramStore);
    const isAtRoot = s.navigationStack.length === 1;

    const newNode: C4Node = {
      id: generateId(),
      type: nodeType,
      label: NODE_DEFAULT_LABELS[nodeType],
      description: '',
      technology: '',
      position: flowPos,
    };

    if (isAtRoot) {
      storeAddNode(newNode);
    } else {
      const boundaries = get(contextBoundaries);
      const targetGroup = boundaries.find((g) => {
        const bb = g.boundingBox;
        return (
          flowPos.x >= bb.x && flowPos.x <= bb.x + bb.width &&
          flowPos.y >= bb.y && flowPos.y <= bb.y + bb.height
        );
      });
      if (!targetGroup) return; // Drop outside any boundary — ignore
      addNodeToDiagram(targetGroup.childDiagramId, newNode);
    }
  };
}
