import { describe, it, expect } from 'vitest'
import { ENTRY_FORBIDDEN, entryChunkViolations, initialChunks, type GuardBundleItem } from '../entryChunkGuard'

/** A Rolldown-shaped chunk (only the fields the guard reads). */
const chunk = (
  fileName: string,
  moduleIds: string[],
  opts: { isEntry?: boolean; imports?: string[]; dynamicImports?: string[] } = {},
): GuardBundleItem => ({
  type: 'chunk',
  fileName,
  isEntry: opts.isEntry ?? false,
  imports: opts.imports ?? [],
  dynamicImports: opts.dynamicImports ?? [],
  moduleIds,
})
const bundleOf = (...items: GuardBundleItem[]): Record<string, GuardBundleItem> =>
  Object.fromEntries(items.map((item) => [item.type === 'chunk' ? item.fileName : 'asset', item]))

const ROOT = 'C:/repo/projects/the-back-nine'
const COPY = `${ROOT}/src/ui/copy.ts`
const ENTRY_COPY = `${ROOT}/src/ui/entryCopy.ts`
const APP = `${ROOT}/src/ui/App.tsx`

/** The shipped shape (as the real build graphs it): the entry holds the entry slice and reaches IntakeApp only
 *  by a dynamic import; the catalog rides its own lazy chunk, which imports the entry back for the slice. */
const shipped = () =>
  bundleOf(
    chunk('assets/index.js', [APP, ENTRY_COPY], {
      isEntry: true,
      imports: ['assets/jsx-runtime.js'],
      dynamicImports: ['assets/IntakeApp.js'],
    }),
    chunk('assets/jsx-runtime.js', ['/node_modules/react/jsx-runtime.js']),
    chunk('assets/IntakeApp.js', [`${ROOT}/src/ui/IntakeApp.tsx`], {
      imports: ['assets/jsx-runtime.js', 'assets/index.js', 'assets/copy.js'],
    }),
    chunk('assets/copy.js', [COPY], { imports: ['assets/index.js'] }),
    { type: 'asset' },
  )

describe('the entry-chunk guard (scripts/entryChunkGuard.ts)', () => {
  it('forbids the copy catalog by its exact path, never its entry slice', () => {
    expect(ENTRY_FORBIDDEN.map((f) => f.suffix)).toEqual(['/src/ui/copy.ts'])
    expect(ENTRY_COPY.endsWith(ENTRY_FORBIDDEN[0]!.suffix)).toBe(false)
  })

  it('passes the shipped shape: the catalog only in a lazy chunk', () => {
    expect(entryChunkViolations(shipped())).toEqual([])
  })

  it('the initial JS is the entry plus its STATIC imports, transitively, never a dynamic import', () => {
    const b = bundleOf(
      chunk('a.js', [APP], { isEntry: true, imports: ['b.js'], dynamicImports: ['lazy.js'] }),
      chunk('b.js', ['/x.ts'], { imports: ['c.js'] }),
      chunk('c.js', ['/y.ts']),
      chunk('lazy.js', [COPY]),
    )
    expect(initialChunks(b).sort()).toEqual(['a.js', 'b.js', 'c.js'])
    expect(entryChunkViolations(b)).toEqual([])
  })

  it('PLANTED: the catalog in the entry chunk is refused, naming the module, the chunk and the fix', () => {
    const b = bundleOf(chunk('assets/index.js', [APP, COPY], { isEntry: true }), chunk('assets/IntakeApp.js', ['/i.ts']))
    const v = entryChunkViolations(b)
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({ chunk: 'assets/index.js', moduleId: COPY })
    expect(v[0]!.why).toMatch(/entryCopy/)
  })

  it('PLANTED: the catalog in a chunk the entry imports statically (two hops) is refused too', () => {
    const b = bundleOf(
      chunk('assets/index.js', [APP], { isEntry: true, imports: ['assets/shared.js'] }),
      chunk('assets/shared.js', ['/s.ts'], { imports: ['assets/copy.js'] }),
      chunk('assets/copy.js', [COPY]),
    )
    expect(entryChunkViolations(b).map((v) => v.chunk)).toEqual(['assets/copy.js'])
  })

  it('matches a Windows path and a query-suffixed id (Rolldown ids are platform paths)', () => {
    const win = 'C:\\repo\\projects\\the-back-nine\\src\\ui\\copy.ts'
    expect(entryChunkViolations(bundleOf(chunk('i.js', [win], { isEntry: true })))).toHaveLength(1)
    expect(entryChunkViolations(bundleOf(chunk('i.js', [`${COPY}?v=1`], { isEntry: true })))).toHaveLength(1)
  })

  it('NEVER VACUOUS: a bundle with no entry chunk throws instead of passing', () => {
    expect(() => entryChunkViolations(bundleOf(chunk('lazy.js', [COPY])))).toThrow(/no entry chunk/)
  })

  it('NEVER VACUOUS: a forbidden module found in no chunk (renamed or moved) throws instead of passing', () => {
    expect(() => entryChunkViolations(bundleOf(chunk('i.js', [APP], { isEntry: true })))).toThrow(
      /no chunk holds a module ending "\/src\/ui\/copy\.ts"/,
    )
  })
})
