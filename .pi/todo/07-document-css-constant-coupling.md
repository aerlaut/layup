# Task 07 — Document (and Guard) CSS-Constant Coupling

## Motivation

Three numeric constants in `src/utils/constants.ts` mirror CSS layout values
inside `src/elements/UmlClassNode.svelte`:

```ts
// constants.ts
export const UML_NODE_HEIGHT_BASE      = 52;   // ← mirrors UmlClassNode CSS
export const UML_MEMBER_ROW_HEIGHT     = 14;   // ← mirrors UmlClassNode CSS
export const UML_COMPARTMENT_OVERHEAD  = 12;   // ← mirrors UmlClassNode CSS
```

`computeNodeHeight` in `diagramStore.ts` uses these to estimate the pixel height
of UML/ERD nodes for boundary-group sizing. If the CSS in `UmlClassNode.svelte`
(or `ErdTableNode.svelte`) changes — font size, padding, border widths — without
a corresponding update to the constants, boundary boxes will silently misalign.

This task improves the situation with:
1. **Explicit co-location comments** linking the constants to the specific CSS
   rules they mirror.
2. **A snapshot test** that catches a constant-vs-CSS drift by checking that a
   node with a known member count produces an expected estimated height.

> A full runtime DOM-measurement approach is out of scope for this task and
> should be evaluated separately if boundary alignment becomes a recurring issue.

## Files to change

- `src/utils/constants.ts` — add detailed comments
- `src/elements/UmlClassNode.svelte` — add a comment warning against silent CSS changes
- `tests/stores/diagramStore.test.ts` (or a new file) — add height estimation tests

## Task details

### Step 1 — Annotate `constants.ts`

Replace the current comment block with precise mappings:

```ts
/**
 * UML / ERD node height estimation constants.
 *
 * These values are used by `computeNodeHeight()` in diagramStore.ts to size
 * boundary groups. They MUST be kept in sync with the CSS in:
 *   - src/elements/UmlClassNode.svelte
 *   - src/elements/ErdTableNode.svelte
 *
 * ⚠️  If you change any CSS layout property (padding, font-size, line-height,
 *     border-width) in those components, update the constants below accordingly.
 *
 * Derivation:
 *   UML_NODE_HEIGHT_BASE = header compartment:
 *     border-top(2) + border-bottom(2) + padding-top(8) + stereotype(12px) +
 *     gap(2) + label(~17px) + padding-bottom(10) ≈ 52px for a stereotyped class.
 *
 *   UML_MEMBER_ROW_HEIGHT = per row:
 *     font-size(0.7rem = ~11.2px) × line-height(1.5) ≈ 16.8px → 14px conservative
 *
 *   UML_COMPARTMENT_OVERHEAD = per visible compartment:
 *     border-top(1) + padding-top(4) + padding-bottom(6) = 11px → rounded to 12
 */
export const UML_NODE_HEIGHT_BASE      = 52;
export const UML_MEMBER_ROW_HEIGHT     = 14;
export const UML_COMPARTMENT_OVERHEAD  = 12;
```

### Step 2 — Add a co-location warning to `UmlClassNode.svelte`

At the top of the `<style>` block:

```css
<style>
  /*
   * ⚠️  Height-sensitive CSS: any changes to compartment padding, font-size,
   *     or line-height must be reflected in the constants:
   *       UML_NODE_HEIGHT_BASE, UML_MEMBER_ROW_HEIGHT, UML_COMPARTMENT_OVERHEAD
   *     in src/utils/constants.ts (used by computeNodeHeight in diagramStore.ts).
   */
  .uml-node { ... }
```

Add the same warning to `ErdTableNode.svelte`.

### Step 3 — Add unit tests for `computeNodeHeight`

In `tests/stores/diagramStore.test.ts` (or a new `tests/stores/nodeHeight.test.ts`):

```ts
import { computeNodeHeight } from '../../src/stores/diagramStore';

describe('computeNodeHeight', () => {
  it('returns NODE_DEFAULT_HEIGHT for non-UML, non-ERD nodes', () => {
    const node = { id: '1', type: 'system', label: 'S', position: { x: 0, y: 0 } };
    expect(computeNodeHeight(node)).toBe(80); // NODE_DEFAULT_HEIGHT
  });

  it('returns base height for a class with no members', () => {
    const node = { id: '1', type: 'class', label: 'Foo', position: { x: 0, y: 0 }, members: [] };
    expect(computeNodeHeight(node)).toBe(52); // UML_NODE_HEIGHT_BASE
  });

  it('grows with attributes', () => {
    const attr = { id: 'a', kind: 'attribute', visibility: '+', name: 'x', type: 'int' };
    const node = { id: '1', type: 'class', label: 'Foo', position: { x: 0, y: 0 }, members: [attr] };
    // base(52) + compartment_overhead(12) + 1 * row(14) = 78
    expect(computeNodeHeight(node)).toBe(78);
  });

  it('grows with operations separately from attributes', () => {
    const attr = { id: 'a', kind: 'attribute', visibility: '+', name: 'x', type: 'int' };
    const op   = { id: 'b', kind: 'operation', visibility: '+', name: 'f', type: 'void' };
    const node = { id: '1', type: 'class', label: 'Foo', position: { x: 0, y: 0 }, members: [attr, op] };
    // base(52) + overhead(12) + 1 attr row(14) + overhead(12) + 1 op row(14) = 104
    expect(computeNodeHeight(node)).toBe(104);
  });
});
```

If `computeNodeHeight` is not currently exported from `diagramStore.ts`, export it.

## Acceptance criteria

- [ ] `constants.ts` has precise derivation comments for each UML constant.
- [ ] `UmlClassNode.svelte` and `ErdTableNode.svelte` have a co-location warning
      in their `<style>` blocks.
- [ ] `computeNodeHeight` is exported from `diagramStore.ts`.
- [ ] Unit tests for `computeNodeHeight` covering: plain node, no-member UML,
      attributes only, operations only, both compartments.
- [ ] `pnpm test:run` passes.
