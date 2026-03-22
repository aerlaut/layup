# Task: AutoLayoutDialog component

## Motivation

The auto-layout feature needs a modal for users to configure their preferred layout before applying it. The dialog presents three choices: direction, style, and spacing. It follows the existing modal pattern established by `ImportNodeDialog.svelte`.

## Steps

### Create `src/components/AutoLayoutDialog.svelte`

**Props:**
```ts
{
  onConfirm: (options: LayoutOptions) => void;
  onCancel:  () => void;
}
```

Import `LayoutOptions`, `DEFAULT_LAYOUT_OPTIONS` from `../stores/autoLayout`.

**Local state** (initialised from `DEFAULT_LAYOUT_OPTIONS`):
```ts
let direction = $state<LayoutDirection>('right');
let style     = $state<LayoutStyle>('flow');
let spacing   = $state<LayoutSpacing>('normal');
```

**Option groups** (render as `<fieldset>` with `<legend>`):

1. **Style** — always visible
   - `flow` → "Flow" — label: *"Arranges nodes in layers, respecting edge direction"*
   - `compact` → "Compact" — label: *"Packs nodes tightly within each group"*

2. **Direction** — visible only when `style === 'flow'`
   - `right` → "Left → Right"
   - `down` → "Top → Bottom"

3. **Spacing**
   - `tight` → "Tight"
   - `normal` → "Normal"
   - `loose` → "Loose"

**Buttons** (modal footer):
- `Cancel` → calls `onCancel()`
- `Apply Layout` → calls `onConfirm({ direction, style, spacing })`

### Markup structure

Follow the exact same HTML/CSS pattern as `ImportNodeDialog.svelte`:
- `.modal-backdrop` → fixed full-screen overlay, click calls `onCancel`
- `.modal-card` → centred card, click stops propagation
- `.modal-header` with `<h2>Auto Layout</h2>`
- `.modal-body` with the three fieldsets
- `.modal-footer` with Cancel + Apply Layout buttons

### Styling

Reuse the same CSS class names as `ImportNodeDialog` (`.modal-backdrop`, `.modal-card`, `.modal-header`, `.modal-body`, `.modal-footer`, `.btn-cancel`, `.btn-confirm`). Style fieldsets as minimal label groups — no border, just a bold legend and a row of radio options.

Radio inputs should be visually minimal — use the native `<input type="radio">` with a `<label>` wrapping each option. A small horizontal gap between options.

## Notes

- When `style` switches to `compact`, the Direction fieldset should become hidden (`{#if style === 'flow'}`), not just disabled — avoid showing irrelevant controls.
- No async work inside the dialog — it just collects options and fires `onConfirm`. The async ELK call happens in the toolbar handler.
