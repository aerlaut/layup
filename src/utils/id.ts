/**
 * Generate a unique ID using crypto.randomUUID() when available,
 * falling back to a timestamp + random suffix for environments that
 * don't support it (e.g. some test runners).
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
