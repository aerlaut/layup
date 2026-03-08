import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Ajv from 'ajv';

describe('diagram.schema.json', () => {
  const schemaPath = resolve(__dirname, '../../schema/diagram.schema.json');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

  /** Build an empty DiagramLevel bucket for each C4 level */
  function emptyLevels() {
    return {
      context:   { level: 'context',   nodes: [], edges: [], annotations: [] },
      container: { level: 'container', nodes: [], edges: [], annotations: [] },
      component: { level: 'component', nodes: [], edges: [], annotations: [] },
      code:      { level: 'code',      nodes: [], edges: [], annotations: [] },
    };
  }

  it('is valid JSON Schema (draft-07)', () => {
    const ajv = new Ajv();
    const valid = ajv.validateSchema(schema);
    expect(valid).toBe(true);
  });

  it('validates a minimal DiagramState', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);

    const minimal = {
      version: 2,
      levels: emptyLevels(),
      currentLevel: 'context',
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
      version: 2,
      levels: {
        ...emptyLevels(),
        code: {
          level: 'code',
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
      currentLevel: 'code',
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
      version: 2,
      // missing levels, currentLevel, selectedId, pendingNodeType
    };

    expect(validate(invalid)).toBe(false);
    expect(validate.errors).not.toBeNull();
  });

  it('rejects a node with an invalid type', () => {
    const ajv = new Ajv();
    const validate = ajv.compile(schema);

    const state = {
      version: 2,
      levels: {
        ...emptyLevels(),
        code: {
          level: 'code',
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
      currentLevel: 'code',
      selectedId: null,
      pendingNodeType: null,
    };

    expect(validate(state)).toBe(false);
  });
});
