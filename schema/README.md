# Layup Diagram Schema

This directory contains JSON Schemas for the two file formats produced and consumed by layup.

## Files

- **`diagram.schema.json`** — [JSON Schema (draft-07)](https://json-schema.org/specification-links.html#draft-7) describing a valid `DiagramState` object. Use this when producing a **full diagram file** — e.g. a tool that generates a complete architecture diagram to be opened in layup.
- **`nodeSubtree.schema.json`** — JSON Schema describing a valid `NodeSubtreeExport` object. Use this when producing a **node subtree file** to be imported into an existing diagram via the app's **Import Node** dialog.

## Which schema should I use?

| Goal | Schema |
|---|---|
| Generate a complete diagram to open in layup | `diagram.schema.json` |
| Generate a subtree of nodes to import into an existing diagram | `nodeSubtree.schema.json` |

The two formats are structurally distinct and not interchangeable. A file valid against one will be rejected by the app's importer for the other.

## Usage

Validate your output against the appropriate schema. For example, in Python with `jsonschema`:

```python
import json
import jsonschema

# For full diagrams:
with open("diagram.schema.json") as f:
    schema = json.load(f)

# For node subtree imports:
# with open("nodeSubtree.schema.json") as f:
#     schema = json.load(f)

with open("my_output.json") as f:
    data = json.load(f)

jsonschema.validate(data, schema)
```

## Schema version (`diagram.schema.json`)

The `version` field in a `DiagramState` must match the schema version supported by the application. The current version is **`2`** (defined in `src/utils/constants.ts` as `SCHEMA_VERSION`).

## Regenerating the schema

The schema is auto-generated from the TypeScript types in `src/types.ts`. To regenerate after type changes:

```bash
npm run schema
```

This runs `ts-json-schema-generator` targeting the `DiagramState` type and writes the output to `schema/diagram.schema.json`.

## Producing a valid `DiagramState` from external tools

When generating a diagram file programmatically (e.g. from a Python package parser), use these defaults for UI-state fields:

| Field             | Value             | Notes                                                |
|-------------------|-------------------|------------------------------------------------------|
| `version`         | `2`               | Must match the app's `SCHEMA_VERSION`                |
| `currentLevel`    | `"context"`       | The level shown when the diagram is first opened     |
| `selectedId`      | `null`            | No selection on open                                 |
| `pendingNodeType` | `null`            | No pending placement                                 |

### Top-level structure

A `DiagramState` has four fixed levels, always present, keyed by `C4LevelType`:

```json
{
  "version": 2,
  "currentLevel": "context",
  "selectedId": null,
  "pendingNodeType": null,
  "levels": {
    "context":   { "level": "context",   "nodes": [], "edges": [], "annotations": [] },
    "container": { "level": "container", "nodes": [], "edges": [], "annotations": [] },
    "component": { "level": "component", "nodes": [], "edges": [], "annotations": [] },
    "code":      { "level": "code",      "nodes": [], "edges": [], "annotations": [] }
  }
}
```

All four level keys (`context`, `container`, `component`, `code`) are required even if empty.

### Key types

- **`DiagramLevel`** — A single diagram canvas. Has a `level` (`"context"`, `"container"`, `"component"`, or `"code"`), plus arrays of `nodes`, `edges`, and `annotations`.
- **`C4Node`** — A node on the canvas. Required fields: `id`, `type`, `label`, `position`. For UML code-level nodes (`class`, `abstract-class`, `interface`, `enum`, `record`), populate `members` with `ClassMember` objects. For ERD nodes (`erd-table`, `erd-view`), populate `columns` with `TableColumn` objects.
- **`C4Edge`** — A connection between two nodes. Required fields: `id`, `source`, `target`. Use `markerEnd` to set arrow style (e.g. `"hollow-triangle"` for inheritance, `"filled-diamond"` for composition).
- **`Annotation`** — A free-floating canvas element (sticky note, group box, package). Required fields: `id`, `type`, `label`, `position`. Never participates in C4 hierarchy.
- **`ClassMember`** — An attribute or operation on a UML class node. Required fields: `id`, `kind`, `visibility`, `name`.
- **`MemberVisibility`** — `"+"` (public), `"-"` (private), `"#"` (protected), `"~"` (package).

### C4 level hierarchy and `parentNodeId`

The four levels form a fixed top-down hierarchy:

```
context → container → component → code
```

Nodes at each level (except `context`) can reference a node at the level above via the optional `parentNodeId` field. This is how layup groups containers under a system, components under a container, and so on. Nodes without a `parentNodeId` are treated as top-level within their canvas.

Example: a `container` node belonging to a `system` node at the context level:

```json
{
  "id": "svc-api",
  "type": "container",
  "label": "API Service",
  "position": { "x": 100, "y": 200 },
  "parentNodeId": "sys-backend"
}
```

For a Python UML parser targeting the code level, a typical flat structure would be:

```json
{
  "levels": {
    "code": {
      "level": "code",
      "nodes": [
        { "id": "cls-a", "type": "class",     "label": "ClassA", "position": { "x": 0,   "y": 0   }, "members": [] },
        { "id": "cls-b", "type": "interface", "label": "IFoo",   "position": { "x": 300, "y": 0   }, "members": [] }
      ],
      "edges": [
        { "id": "e1", "source": "cls-a", "target": "cls-b", "markerEnd": "hollow-triangle" }
      ],
      "annotations": []
    },
    "context":   { "level": "context",   "nodes": [], "edges": [], "annotations": [] },
    "container": { "level": "container", "nodes": [], "edges": [], "annotations": [] },
    "component": { "level": "component", "nodes": [], "edges": [], "annotations": [] }
  }
}
```

---

## Producing a valid `NodeSubtreeExport` (`nodeSubtree.schema.json`)

Use this format when you want to import a node subtree into an **existing** diagram via the app's **Import Node** button. The app will open a dialog asking which node in the current diagram should become the parent of the imported root node.

### Top-level structure

```json
{
  "exportType": "node-subtree",
  "version": 1,
  "rootLevel": "component",
  "levels": {
    "component": { "level": "component", "nodes": [...], "edges": [] },
    "code":      { "level": "code",      "nodes": [...], "edges": [...] }
  }
}
```

| Field        | Value            | Notes                                                                       |
|--------------|------------------|-----------------------------------------------------------------------------|
| `exportType` | `"node-subtree"` | Required. Distinguishes this format from a full `DiagramState`.             |
| `version`    | `1`              | Must be exactly `1`.                                                        |
| `rootLevel`  | C4LevelType      | The level at which the root node lives (`context`/`container`/`component`/`code`). |
| `levels`     | object           | Only `rootLevel` and the levels below it need to be present.                |

### Key rules

- **Single root node** — `levels[rootLevel].nodes[0]` is the root node. Its `parentNodeId` must be omitted (or `undefined`); the app assigns it when the user picks a parent in the import dialog. All other nodes in the subtree keep their `parentNodeId` pointing to other nodes within the file.
- **Edges at root level are excluded** — edges at `rootLevel` connect outside the subtree and would have dangling endpoints. Only include them at descendant levels, and only when both `source` and `target` are nodes within the file.
- **Only `rootLevel` and below** — do not include levels above `rootLevel`. For example, if `rootLevel` is `"component"`, omit `"context"` and `"container"` from `levels`.
- **Annotations are excluded** — `NodeSubtreeLevelData` has no `annotations` field.

### Example: a component subtree with code-level children

```json
{
  "exportType": "node-subtree",
  "version": 1,
  "rootLevel": "component",
  "levels": {
    "component": {
      "level": "component",
      "nodes": [
        { "id": "mod-parser", "type": "component", "label": "parser", "position": { "x": 0, "y": 0 } }
      ],
      "edges": []
    },
    "code": {
      "level": "code",
      "nodes": [
        { "id": "cls-base",   "type": "class",     "label": "BaseParser",   "position": { "x": 0,   "y": 0 }, "parentNodeId": "mod-parser" },
        { "id": "cls-python", "type": "class",     "label": "PythonParser", "position": { "x": 300, "y": 0 }, "parentNodeId": "mod-parser" }
      ],
      "edges": [
        { "id": "e1", "source": "cls-python", "target": "cls-base", "markerEnd": "hollow-triangle" }
      ]
    }
  }
}
```

When imported, the app will ask which existing `container` or `system` node the `parser` component should be placed under.
