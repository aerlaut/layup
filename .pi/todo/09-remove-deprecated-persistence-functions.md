# Task 09 — Remove Deprecated Persistence Functions

## Motivation

`src/utils/persistence.ts` exports two functions marked `@deprecated`:

```ts
/** @deprecated Use saveAppState instead */
export function saveToLocalStorage(state: DiagramState): void { ... }

/** @deprecated Use loadFromLocalStorage instead */
export function loadFromLocalStorage(): DiagramState | null { ... }
```

These were the original single-diagram persistence API, superseded by the
`AppState`-level `saveAppState` / `loadAppState` pair. The legacy migration
(`migrateFromLegacy`) reads the old `localStorage` key directly via
`localStorage.getItem(STORAGE_KEY)` — it does not call these deprecated
functions — so they are now genuine dead code.

Keeping dead deprecated exports creates confusion for future contributors who
might wonder whether they are still in use, and adds surface area to the
persistence API unnecessarily.

## Files to change

- `src/utils/persistence.ts` — remove deprecated functions and the private
  `STORAGE_KEY` constant if it is no longer referenced after removal

## Task details

### Step 1 — Confirm no callsites exist

```bash
grep -rn "saveToLocalStorage\|loadFromLocalStorage" src/ tests/
```

Expected result: zero matches outside of `persistence.ts` itself.

### Step 2 — Remove the functions

Delete:
- `saveToLocalStorage` function body and its JSDoc
- `loadFromLocalStorage` function body and its JSDoc

### Step 3 — Evaluate `STORAGE_KEY`

`STORAGE_KEY = 'layup_diagram'` is the legacy localStorage key. After removing
the two deprecated functions, check whether `STORAGE_KEY` is still referenced:

```bash
grep -n "STORAGE_KEY[^_]" src/utils/persistence.ts
```

It is used in `migrateFromLegacy` (`localStorage.getItem(STORAGE_KEY)` and
`localStorage.removeItem(STORAGE_KEY)`). Keep it. Do not remove it.

### Step 4 — Update tests

Check `tests/utils/persistence.test.ts` for any tests that exercise the removed
functions and delete them.

```bash
grep -n "saveToLocalStorage\|loadFromLocalStorage" tests/
```

Remove or update any matching test cases.

## Acceptance criteria

- [ ] `saveToLocalStorage` is deleted from `persistence.ts`.
- [ ] `loadFromLocalStorage` is deleted from `persistence.ts`.
- [ ] `STORAGE_KEY` is retained (still needed by `migrateFromLegacy`).
- [ ] No external callsites remain (confirmed by grep).
- [ ] `pnpm check` passes.
- [ ] `pnpm test:run` passes.
- [ ] Legacy data migration still works: manually place a v2-format JSON string
      under `layup_diagram` in localStorage and reload; verify the app migrates
      it into the `layup_app` key.
