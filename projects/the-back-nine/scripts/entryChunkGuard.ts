/**
 * The entry-chunk guard — a build-time refusal of any module that must never ship in the INITIAL JS: the entry
 * chunk plus every chunk it imports statically, the same set `verify:bundle` weighs (the entry `<script>` and its
 * `modulepreload` links). Wired into `vite build` from `vite.config.ts`; it never runs in dev or under vitest.
 *
 * WHY A GUARD AND NOT ONLY THE BUDGET. The byte budget catches what is too BIG; this catches what is in the WRONG
 * PLACE, and names it. The copy catalog is the case: every lazy surface imports `copy.ts`, so an entry-graph module
 * importing it too is the natural slip, and it drags ~100 KB of strings back into the first-load JS at once — the
 * CI red that split the catalog (run 42666885195; the register's *The whole copy catalog ships in the entry JS…*).
 * The budget would catch that slip only as a bare byte count, and only while its headroom stays smaller than the
 * catalog. This fails `pnpm build` with the module, the chunk and the fix.
 *
 * NEVER VACUOUS. It refuses a bundle with no entry chunk (it would check nothing), and a forbidden module found in
 * NO chunk (a rename would otherwise turn it off silently): every forbidden module here is imported by some lazy
 * surface, so it is always somewhere in a real bundle.
 */
import type { Plugin } from 'vite'

/** The fields the guard reads of a Rolldown `OutputChunk` / `OutputAsset` (structural, so a test can build one). */
export type GuardBundleItem =
  | {
      readonly type: 'chunk'
      readonly fileName: string
      readonly isEntry: boolean
      readonly imports: readonly string[]
      /** Lazy edges — never followed (carried so a test can prove they are not). */
      readonly dynamicImports: readonly string[]
      readonly moduleIds: readonly string[]
    }
  | { readonly type: 'asset' }

export interface ForbiddenModule {
  /** Matched against the END of a module id, after `\` → `/` and any `?query` is dropped. */
  readonly suffix: string
  /** What it is and what to do instead — printed in the build error. */
  readonly why: string
}

/** Modules that must never be initial JS. */
export const ENTRY_FORBIDDEN: readonly ForbiddenModule[] = [
  {
    suffix: '/src/ui/copy.ts',
    why:
      'the whole copy catalog (~100 KB of strings) — a module the entry graph imports reads `entryCopy` from ' +
      '`src/ui/entryCopy.ts` instead (put any new string it renders there; `copy.ts` composes it into `copy`).',
  },
]

const normalize = (id: string): string => id.replace(/\\/g, '/').replace(/\?.*$/, '')

/** Every chunk the page loads to render: each entry chunk and, transitively, the chunks it imports statically.
 *  Dynamic imports are lazy, so they are never followed. */
export function initialChunks(bundle: Readonly<Record<string, GuardBundleItem>>): string[] {
  const seen = new Set<string>()
  const queue: string[] = []
  for (const [fileName, item] of Object.entries(bundle)) {
    if (item.type === 'chunk' && item.isEntry) queue.push(fileName)
  }
  while (queue.length > 0) {
    const fileName = queue.shift()!
    if (seen.has(fileName)) continue
    seen.add(fileName)
    const item = bundle[fileName]
    if (item?.type === 'chunk') queue.push(...item.imports)
  }
  return [...seen]
}

export interface EntryChunkViolation {
  readonly chunk: string
  readonly moduleId: string
  readonly why: string
}

/** The forbidden modules found in the initial JS. Throws when the check would be vacuous (no entry chunk, or a
 *  forbidden module present in no chunk at all). */
export function entryChunkViolations(
  bundle: Readonly<Record<string, GuardBundleItem>>,
  forbidden: readonly ForbiddenModule[] = ENTRY_FORBIDDEN,
): EntryChunkViolation[] {
  const initial = initialChunks(bundle)
  if (initial.length === 0) {
    throw new Error('[entry-chunk guard] the bundle has no entry chunk, so the guard would check nothing.')
  }
  const allIds = Object.values(bundle).flatMap((item) => (item.type === 'chunk' ? item.moduleIds.map(normalize) : []))
  for (const f of forbidden) {
    if (!allIds.some((id) => id.endsWith(f.suffix))) {
      throw new Error(
        `[entry-chunk guard] no chunk holds a module ending "${f.suffix}" — renamed or moved? Update ENTRY_FORBIDDEN ` +
          '(scripts/entryChunkGuard.ts), or the guard silently checks nothing for it.',
      )
    }
  }
  const violations: EntryChunkViolation[] = []
  for (const chunk of initial) {
    const item = bundle[chunk]
    if (item?.type !== 'chunk') continue
    for (const raw of item.moduleIds) {
      const id = normalize(raw)
      const hit = forbidden.find((f) => id.endsWith(f.suffix))
      if (hit) violations.push({ chunk, moduleId: id, why: hit.why })
    }
  }
  return violations
}

/** The Vite plugin: refuses the build when a forbidden module lands in the initial JS. */
export function entryChunkGuard(forbidden: readonly ForbiddenModule[] = ENTRY_FORBIDDEN): Plugin {
  return {
    name: 'b9-entry-chunk-guard',
    apply: 'build',
    generateBundle(_options, bundle) {
      const violations = entryChunkViolations(bundle, forbidden)
      if (violations.length > 0) {
        this.error(
          '[entry-chunk guard] a module that must never ship in the first-load JS is in it:\n' +
            violations.map((v) => `  ${v.moduleId}\n    in ${v.chunk}: ${v.why}`).join('\n'),
        )
      }
    },
  }
}
