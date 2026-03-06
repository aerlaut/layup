import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Ajv from 'ajv';

describe('diagram.schema.json', () => {
  const schemaPath = resolve(__dirname, '../../schema/diagram.schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

  it('is valid JSON Schema (draft-07)', () => {
    const ajv = new Ajv();
    const valid = ajv.validateSchema(schema);
    expect(valid).toBe(true);
  });

  it('validates a minimal DiagramState', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);

    const minimal = {
      version: 1,
      diagrams: {
        root: {
          id: 'root',
          level: 'context',
          label: 'System Context',
          nodes: [],
          edges: [],
          annotations: [],
        },
      },
      rootId: 'root',
      navigationStack: ['root'],
      selectedId: null,
      pendingNodeType: null,
    };

    const valid = validate(minimal);
    expect(validate.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('validates a DiagramState with code-level UML nodes and edges', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);

    const state = {
      version: 1,
      diagrams: {
        root: {
          id: 'root',
          level: 'code',
          label: 'Code',
          nodes: [
            {
              id: 'cls-1',
              type: 'class',
              label: 'MyClass',
              position: { x: 100, y: 200 },
              members: [
                { id: 'm1', kind: 'attribute', visibility: '-', name: 'count', type: 'int' },
                { id: 'm2', kind: 'operation', visibility: '+', name: 'run', params: '()', type: 'void', isAbstract: false },
              ],
            },
            {
              id: 'enum-1',
              type: 'enum',
              label: 'Status',
              position: { x: 300, y: 200 },
            },
          ],
          edges: [
            {
              id: 'e1',
              source: 'cls-1',
              target: 'enum-1',
              markerEnd: 'arrow',
              lineStyle: 'solid',
              lineType: 'bezier',
              waypoints: [],
            },
          ],
          annotations: [],
        },
      },
      rootId: 'root',
      navigationStack: ['root'],
      selectedId: null,
      pendingNodeType: null,
    };

    const valid = validate(state);
    expect(validate.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('rejects a DiagramState missing required fields', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);

    const invalid = {
      version: 1,
      // missing diagrams, rootId, navigationStack, selectedId, pendingNodeType
    };

    expect(validate(invalid)).toBe(false);
    expect(validate.errors).not.toBeNull();
  });

  it('rejects a node with an invalid type', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);

    const state = {
      version: 1,
      diagrams: {
        root: {
          id: 'root',
          level: 'code',
          label: 'Code',
          nodes: [
            {
              id: 'n1',
              type: 'not-a-real-type',
              label: 'Bad',
              position: { x: 0, y: 0 },
            },
          ],
          edges: [],
          annotations: [],
        },
      },
      rootId: 'root',
      navigationStack: ['root'],
      selectedId: null,
      pendingNodeType: null,
    };

    expect(validate(state)).toBe(false);
  });
});
