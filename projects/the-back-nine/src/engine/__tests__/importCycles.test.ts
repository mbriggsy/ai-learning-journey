/**
 * THE IMPORT-CYCLE PIN (build 2, KTD13 / R19): no module in `src/engine` reaches itself through its own imports,
 * type-only imports included. The one cycle the engine had — `simulate.ts` ↔ `earningsTest.ts`, the earnings test
 * reading the benefit-year pieces and the dollar cap out of the module that imports it — closed when those moved to
 * the `benefitYear` and `engineDomain` leaves. A cycle is not a bug by itself, but it makes module evaluation order
 * load-bearing (a value read during the other module's evaluation is `undefined`), and every one we leave in place
 * is one more the next move has to reason about.
 *
 * The scan reads every non-test engine source with the TypeScript parser — `import` and `export … from`
 * declarations wherever they sit, `import type` included — resolves `@engine/…` and relative specifiers to files,
 * and finds every strongly connected component of the graph (Tarjan). A self-import is a cycle too.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import ts from 'typescript'

const ENGINE = join(__dirname, '..')

function engineSources(): Map<string, string> {
  const out = new Map<string, string>()
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) {
        if (name !== '__tests__') walk(p)
      } else if (/\.(ts|mts|cts|tsx)$/.test(name)) out.set(p, readFileSync(p, 'utf-8'))
    }
  }
  walk(ENGINE)
  return out
}

/** The file an engine specifier names, or null for a module outside the engine (`@shared/…`, a package). */
function resolveSpecifier(from: string, spec: string): string | null {
  let base: string
  if (spec.startsWith('@engine/')) base = join(ENGINE, spec.slice('@engine/'.length))
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec)
  else return null
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}.mts`, join(base, 'index.ts'), base]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate
  }
  throw new Error(`[importCycles] ${relative(ENGINE, from)} imports ${spec}, which resolves to no file`)
}

/** Every engine module a source imports or re-exports from, type-only declarations included. */
function importedModules(file: string, source: string): string[] {
  const found: string[] = []
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const visit = (node: ts.Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined) {
      const target = resolveSpecifier(file, (node.moduleSpecifier as ts.StringLiteral).text)
      if (target !== null) found.push(target)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

/** Every cycle (a strongly connected component of two or more modules, or a self-import), as sorted names. */
function cyclesOf(sources: ReadonlyMap<string, string>): string[][] {
  const graph = new Map<string, Set<string>>()
  for (const [file, source] of sources) graph.set(file, new Set(importedModules(file, source)))
  let next = 0
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const stack: string[] = []
  const onStack = new Set<string>()
  const cycles: string[][] = []
  const connect = (v: string): void => {
    index.set(v, next)
    low.set(v, next)
    next++
    stack.push(v)
    onStack.add(v)
    for (const w of graph.get(v) ?? []) {
      if (!index.has(w)) {
        connect(w)
        low.set(v, Math.min(low.get(v)!, low.get(w)!))
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!))
    }
    if (low.get(v) === index.get(v)) {
      const component: string[] = []
      let w: string
      do {
        w = stack.pop()!
        onStack.delete(w)
        component.push(w)
      } while (w !== v)
      if (component.length > 1 || graph.get(v)!.has(v)) cycles.push(component.map((f) => relative(ENGINE, f).split('\\').join('/')).sort())
    }
  }
  for (const v of graph.keys()) if (!index.has(v)) connect(v)
  return cycles
}

describe('the import-cycle pin (build 2, KTD13): no engine module reaches itself through its imports', () => {
  const sources = engineSources()
  const file = (name: string): string => join(ENGINE, name)

  it('finds no cycle in src/engine, type-only imports included', () => {
    // Non-vacuity: the scan reads the whole engine and sees the edges the move made.
    expect(sources.size).toBeGreaterThanOrEqual(70)
    const edges = [...sources].reduce((n, [f, s]) => n + importedModules(f, s).length, 0)
    expect(edges).toBeGreaterThanOrEqual(100)
    const earningsTest = importedModules(file('earningsTest.ts'), sources.get(file('earningsTest.ts'))!)
    expect(earningsTest).toContain(file('benefitYear.ts'))
    expect(earningsTest).toContain(file('engineDomain.ts'))
    expect(earningsTest).not.toContain(file('simulate.ts'))
    expect(cyclesOf(sources)).toEqual([])
  })

  it('bites: a planted earningsTest → simulate import is a cycle, and the pin names both modules', () => {
    const planted = new Map(sources)
    planted.set(file('earningsTest.ts'), `${sources.get(file('earningsTest.ts'))}\nimport { simulate } from '@engine/simulate'\n`)
    expect(cyclesOf(planted)).toEqual([['earningsTest.ts', 'simulate.ts']])
  })

  it('bites on a type-only import and a relative specifier too', () => {
    const typeOnly = new Map(sources)
    typeOnly.set(file('benefitYear.ts'), `${sources.get(file('benefitYear.ts'))}\nimport type { SimOutput } from './simulate'\n`)
    // simulate imports the leaf both directly and through earningsTest, so a leaf → simulate edge closes one
    // component of all three.
    expect(cyclesOf(typeOnly)).toEqual([['benefitYear.ts', 'earningsTest.ts', 'simulate.ts']])
    const self = new Map(sources)
    self.set(file('engineDomain.ts'), `${sources.get(file('engineDomain.ts'))}\nexport type { X } from '@engine/engineDomain'\n`)
    expect(cyclesOf(self)).toEqual([['engineDomain.ts']])
  })
})
