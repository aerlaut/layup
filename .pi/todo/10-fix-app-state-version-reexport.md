# Task 10 — Fix APP_STATE_VERSION Re-export Confusion

## Motivation

`APP_STATE_VERSION` is defined in `src/utils/constants.ts` but re-exported from
`src/stores/appStore.ts`:

```ts
// appStore.ts
import { APP_STATE_VERSION } from '../utils/constants';
export { APP_STATE_VERSION };   // ← re-export
```

This creates two valid import paths for the same constant:

```ts
import { APP_STATE_VERSION } from '../utils/constants';   // canonical
import { APP_STATE_VERSION } from '../stores/appStore';   // via re-export
```

Mixed import origins make it harder to trace where a value comes from and can
confuse tree-shaking in rare bundler configurations. The re-export exists because
`appStore.ts` uses the constant internally, but there is no reason to also
surface it through the store's public API.

## Files to change

- `src/stores/appStore.ts` — remove the `export { APP_STATE_VERSION }` line
- Any file that imports `APP_STATE_VERSION` from `appStore.ts` — update to
  import from `constants.ts`

## Task details

### Step 1 — Find all consumers of the re-export

```bash
grep -rn "APP_STATE_VERSION" src/ tests/
```

Identify which files import it from `appStore` versus `constants`.

### Step 2 — Update consumers

For any file importing `APP_STATE_VERSION` from `appStore`:

```ts
// Before:
import { APP_STATE_VERSION } from '../stores/appStore';

// After:
import { APP_STATE_VERSION } from '../utils/constants';
```

### Step 3 — Remove the re-export from `appStore.ts`

```ts
// Before:
import { APP_STATE_VERSION } from '../utils/constants';
export { APP_STATE_VERSION };

// After:
import { APP_STATE_VERSION } from '../utils/constants';
// (no re-export)
```

The import itself stays because `appStore.ts` uses `APP_STATE_VERSION` in
`createInitialAppState`.

### Step 4 — Verify

```bash
grep -rn "from.*appStore.*APP_STATE_VERSION\|APP_STATE_VERSION.*from.*appStore" src/ tests/
```

Expected: zero matches.

## Acceptance criteria

- [ ] `export { APP_STATE_VERSION }` is removed from `appStore.ts`.
- [ ] All consumers import `APP_STATE_VERSION` from `../utils/constants` (or the
      appropriate relative path).
- [ ] `pnpm check` passes.
- [ ] `pnpm test:run` passes.
