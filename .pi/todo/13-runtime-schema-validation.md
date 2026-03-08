# Task 13 — Add Runtime Schema Validation on Diagram Import

## Motivation

`parseDiagramJSON` in `src/utils/persistence.ts` performs only cursory validation
of imported diagram files:

```ts
if (!state.levels || typeof state.levels !== 'object') {
  throw new ImportError('Missing "levels" map.');
}
if (typeof state.currentLevel !== 'string') {
  throw new ImportError('Missing "currentLevel".');
}
```

A malformed import — e.g. `nodes` being a string instead of an array, an edge
missing its `source` field, or an unknown `type` value — can silently slip
through and cause runtime errors or data corruption when the user later edits
the diagram.

`ajv` is already installed (as a dev dependency used in `tests/schema/schema.test.ts`)
and `schema/diagram.schema.json` is generated from the TypeScript types. The
groundwork is in place; this task wires validation into the import path.

## Files to change

- `package.json` — move `ajv` from `devDependencies` to `dependencies`
- `src/utils/persistence.ts` — add schema validation in `parseDiagramJSON`
- `schema/diagram.schema.json` — no change (already generated; regenerate if
  types have changed since last run via `pnpm schema`)

## Task details

### Step 1 — Move `ajv` to `dependencies`

```json
// package.json
"dependencies": {
  "@xyflow/svelte": "^1.5.1",
  "ajv": "^8.18.0"
},
"devDependencies": {
  // remove ajv from here
}
```

### Step 2 — Create a lazy validator singleton

Add the following to the top of `persistence.ts` (after existing imports):

```ts
import Ajv from 'ajv';
import diagramSchema from '../../schema/diagram.schema.json';

// Lazily compiled validator — only created on first import attempt.
let _validate: ReturnType<Ajv['compile']> | null = null;
function getDiagramValidator(): ReturnType<Ajv['compile']> {
  if (!_validate) {
    const ajv = new Ajv({ allErrors: true });
    _validate = ajv.compile(diagramSchema);
  }
  return _validate;
}
```

> Vite supports JSON imports natively. Add `"resolveJsonModule": true` to
> `tsconfig.app.json` if it is not already present.

### Step 3 — Validate after version migration

In `parseDiagramJSON`, add validation after the v1→v2 migration and before
returning:

```ts
export function parseDiagramJSON(text: string): DiagramState {
  // ... existing JSON.parse and basic checks ...

  if (state.version > SCHEMA_VERSION) {
    throw new ImportError(`Diagram was created with a newer version (v${state.version}).`);
  }

  let migrated: DiagramState = state;
  if (state.version === 1) {
    migrated = migrateDiagramStateV1toV2(state as unknown as DiagramStateV1);
  }

  // ── Schema validation ───────────────────────────────────────────────────────
  const validate = getDiagramValidator();
  const valid = validate(migrated);
  if (!valid) {
    const errorSummary = (validate.errors ?? [])
      .slice(0, 3) // cap to avoid overwhelming the user
      .map((e) => `${e.instancePath || '(root)'}: ${e.message}`)
      .join('; ');
    throw new ImportError(`Invalid diagram structure: ${errorSummary}`);
  }

  return migrated;
}
```

### Step 4 — Handle JSON import in Vite/TypeScript config

Ensure the JSON schema can be imported as a module. In `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    ...
  }
}
```

In `vite.config.ts` — Vite handles JSON imports out of the box; no change
needed.

### Step 5 — Update tests

Existing `tests/schema/schema.test.ts` already validates the schema itself.
Add a test to `tests/utils/persistence.test.ts`:

```ts
it('parseDiagramJSON throws ImportError for structurally invalid data', () => {
  const bad = JSON.stringify({
    version: 2,
    levels: { context: { level: 'context', nodes: 'WRONG', edges: [], annotations: [] } },
    currentLevel: 'context',
    selectedId: null,
    pendingNodeType: null,
  });
  expect(() => parseDiagramJSON(bad)).toThrow(ImportError);
});
```

### Considerations

- The JSON schema is generated from TypeScript types via `pnpm schema`. Ensure
  it is up to date before this task (`pnpm schema` regenerates it).
- `allErrors: true` is used so users get the full picture rather than just the
  first failure, but we cap the error display to 3 items to keep the message
  readable.
- Validation only runs on import; the store's own mutations are TypeScript-typed
  and do not need runtime validation.

## Acceptance criteria

- [ ] `ajv` is in `dependencies` (not `devDependencies`).
- [ ] A structurally invalid imported JSON file produces an `ImportError` with a
      human-readable message shown in the UI import error banner.
- [ ] A valid imported JSON file continues to import successfully.
- [ ] Existing schema tests pass (`tests/schema/schema.test.ts`).
- [ ] New test for invalid structure passes.
- [ ] `pnpm check` passes.
- [ ] `pnpm build` succeeds (schema JSON bundled correctly).
