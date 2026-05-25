// Recursive key-sorted stringify for deterministic diffs. Sorts OBJECT keys only;
// arrays keep their order (projects[], byModel[], commitsByDay[] are ordered data).
// Hand-rolled — no json-stable-stringify dep (monorepo dep-light discipline).
// SEPARATE MODULE (not inside refresh-stats.ts) because refresh-stats.ts runs main() at
// import — a test importing stableStringify from there would execute the whole pipeline.
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value), null, 2) + '\n'
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value as Record<string, unknown>)
        .sort()
        .map((k) => [k, sortDeep((value as Record<string, unknown>)[k])]),
    )
  }
  return value
}
