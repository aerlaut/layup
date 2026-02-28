/**
 * canvasDragDrop.ts
 *
 * Palette drag-and-drop handlers for DiagramCanvas. Extracted to keep
 * DiagramCanvas.svelte thin.
 */
import type { C4Node, C4NodeType } from '../types';
import {
  diagramStore,
  addNode as storeAddNode,
  addNodeToDiagram,
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
  'code-element': 'Code Element',
  group: 'Group',
};

export function handleDragOver(e: DragEvent): void {
  if (!e.dataTransfer?.types.includes('application/c4-node-type')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

export function makeHandleDrop(
  getScreenToFlowPosition: () => ((pos: { x: number; y: number }) => { x: number; y: number }) | undefined,
): (e: DragEvent) => void {
  return (e: DragEvent) => {
    if (!e.dataTransfer) return;
    const nodeType = e.dataTransfer.getData('application/c4-node-type') as C4NodeType;
    const screenToFlowPosition = getScreenToFlowPosition();
    if (!nodeType || !screenToFlowPosition) return;
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
