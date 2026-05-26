import { describe, it, expect } from 'vitest'
import type { MultiProjectReport, ProjectReport, SubcategoryStats } from '@/types'
import { buildComposition, findProject } from './composition'

// Fixture builders — buildComposition reads only report.tiers[]; findProject reads only
// projects[].projectName. Cast the rest away (matches grid-order.test.ts style).
const sub = (subcategory: string, over: Partial<SubcategoryStats> = {}): SubcategoryStats => ({
  subcategory,
  files: 0,
  bytes: 0,
  totalLines: 0,
  nonBlankLines: 0,
  ...over,
})

/** A rich tiers[] tree: code(source lines + tests files + config files), docs(two subcats), data(prompts), assets(images/audio/video). */
const richTiers = () =>
  [
    {
      tier: 'authored',
      categories: [
        {
          category: 'code',
          subcategories: [sub('source', { totalLines: 38412 }), sub('tests', { files: 1247 }), sub('config', { files: 120 })],
          totals: sub('code'),
        },
        {
          category: 'docs',
          // plans & docs uses the pre-computed category TOTALS, not a manual subcat sum. The
          // totals (100) DIVERGE from the listed subcats (70+22=92) on purpose, so the test fails
          // if the impl ever sums subcategories instead of reading totals.files.
          subcategories: [sub('plans', { files: 70 }), sub('readmes', { files: 22 })],
          totals: sub('docs', { files: 100 }),
        },
        {
          category: 'data',
          subcategories: [sub('generation-prompts', { files: 56 })],
          totals: sub('data'),
        },
      ],
    },
    {
      tier: 'pipeline-generated',
      categories: [
        {
          category: 'assets',
          subcategories: [sub('images', { files: 2140 }), sub('audio', { files: 340 }), sub('video', { files: 18 })],
          totals: sub('assets'),
        },
      ],
    },
  ] as unknown as ProjectReport['tiers']

const proj = (over: Partial<ProjectReport>): ProjectReport => over as unknown as ProjectReport

describe('buildComposition', () => {
  it('happy path: a full tree yields the curated kinds in selector order with correct values + units', () => {
    const out = buildComposition(proj({ tiers: richTiers() }))
    expect(out).toEqual([
      { key: 'code', label: 'lines of code', unit: 'lines', value: 38412 },
      { key: 'tests', label: 'tests', unit: 'files', value: 1247 },
      { key: 'docs', label: 'plans & docs', unit: 'files', value: 100 },
      { key: 'prompts', label: 'generation prompts', unit: 'files', value: 56 },
      { key: 'configs', label: 'config files', unit: 'files', value: 120 },
      { key: 'images', label: 'images', unit: 'count', value: 2140 },
      { key: 'audio', label: 'audio files', unit: 'count', value: 340 },
      { key: 'video', label: 'video renders', unit: 'count', value: 18 },
    ])
  })

  it('uses the pre-computed docs category TOTALS, not a subcategory sum', () => {
    const out = buildComposition(proj({ tiers: richTiers() }))
    // totals.files = 100 while the listed subcats sum to 70 + 22 = 92; reading totals yields 100,
    // a manual subcat sum would yield 92 — this assertion fails loudly if the impl regresses.
    expect(out.find((i) => i.key === 'docs')?.value).toBe(100)
  })

  it('omits zero-count kinds (a project with no audio/video shows neither — never "0")', () => {
    const tiers = [
      {
        tier: 'authored',
        categories: [{ category: 'code', subcategories: [sub('source', { totalLines: 500 })], totals: sub('code') }],
      },
    ] as unknown as ProjectReport['tiers']
    const out = buildComposition(proj({ tiers }))
    expect(out.map((i) => i.key)).toEqual(['code'])
  })

  it('resolves a missing category/subcategory node to 0 and omits it (never throws)', () => {
    const tiers = [{ tier: 'authored', categories: [] }] as unknown as ProjectReport['tiers']
    expect(buildComposition(proj({ tiers }))).toEqual([])
  })

  it('empty tiers[] → []', () => {
    expect(buildComposition(proj({ tiers: [] }))).toEqual([])
  })

  it('missing tiers entirely → [] (defensive, no throw)', () => {
    expect(buildComposition(proj({}))).toEqual([])
  })

  it('does not mutate the input report', () => {
    const report = proj({ tiers: richTiers() })
    const snapshot = JSON.stringify(report)
    buildComposition(report)
    expect(JSON.stringify(report)).toBe(snapshot)
  })
})

describe('findProject', () => {
  const report = {
    projects: [proj({ projectName: 'burned' }), proj({ projectName: 'pacman' })],
    meta: [proj({ projectName: 'claude-credits' })],
    archiveCollective: { projectNames: ['hide-and-seek', 'do-not-disturb'] },
  } as unknown as MultiProjectReport

  it('finds an active project by name', () => {
    expect(findProject(report, 'burned')?.projectName).toBe('burned')
  })
  it('a name only in meta[] → null (meta has no detail page)', () => {
    expect(findProject(report, 'claude-credits')).toBeNull()
  })
  it('a shelved/archive name → null (archive is collective, no per-project report)', () => {
    expect(findProject(report, 'hide-and-seek')).toBeNull()
  })
  it('an unknown name → null', () => {
    expect(findProject(report, 'does-not-exist')).toBeNull()
  })
  it('undefined param (no :name) → null', () => {
    expect(findProject(report, undefined)).toBeNull()
  })
  it('empty projects → null', () => {
    expect(findProject({ projects: [] } as unknown as MultiProjectReport, 'burned')).toBeNull()
  })
})
