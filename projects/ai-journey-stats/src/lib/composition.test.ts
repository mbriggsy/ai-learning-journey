import { describe, it, expect } from 'vitest'
import type { MultiProjectReport, ProjectReport, SubcategoryStats } from '@/types'
import { buildCodeMetrics, findProject } from './composition'

// Fixture builders — buildCodeMetrics reads only report.tiers[]; findProject reads only
// projects[].projectName. Cast the rest away (matches grid-order.test.ts style).
const sub = (subcategory: string, over: Partial<SubcategoryStats> = {}): SubcategoryStats => ({
  subcategory,
  files: 0,
  bytes: 0,
  totalLines: 0,
  nonBlankLines: 0,
  ...over,
})

/**
 * A rich tiers[] tree exercising every bucket's MULTI-subcategory sum:
 *   - application LOC = source + styles + markup   (build-scripts present but EXCLUDED)
 *   - test lines      = tests + test-fixtures
 *   - planning        = docs/plans (docs/readmes present but EXCLUDED — not planning)
 *   - config          = config
 */
const richTiers = () =>
  [
    {
      tier: 'authored',
      categories: [
        {
          category: 'code',
          subcategories: [
            sub('source', { totalLines: 30000, files: 200 }),
            sub('styles', { totalLines: 8000, files: 60 }),
            sub('markup', { totalLines: 500, files: 4 }),
            sub('build-scripts', { totalLines: 17000, files: 50 }), // EXCLUDED from application LOC
            sub('tests', { totalLines: 25000, files: 100 }),
            sub('test-fixtures', { totalLines: 500, files: 3 }),
            sub('config', { totalLines: 600, files: 15 }),
          ],
          totals: sub('code'),
        },
        {
          category: 'docs',
          // Only `plans` is implementation planning; readmes are NOT.
          subcategories: [sub('plans', { totalLines: 61000, files: 36 }), sub('readmes', { totalLines: 1200, files: 7 })],
          totals: sub('docs'),
        },
      ],
    },
  ] as unknown as ProjectReport['tiers']

const proj = (over: Partial<ProjectReport>): ProjectReport => over as unknown as ProjectReport

describe('buildCodeMetrics', () => {
  it('happy path: four buckets in order, each summing its subcategories into lines + files', () => {
    const out = buildCodeMetrics(proj({ tiers: richTiers() }))
    expect(out).toEqual([
      { key: 'app', label: 'application LOC', lines: 38500, files: 264 }, // source+styles+markup (NOT build-scripts)
      { key: 'tests', label: 'lines of testing', lines: 25500, files: 103 }, // tests + test-fixtures
      { key: 'plans', label: 'lines of implementation planning', lines: 61000, files: 36 }, // plans only
      { key: 'config', label: 'lines of config', lines: 600, files: 15 },
    ])
  })

  it('application LOC EXCLUDES build/tooling scripts (Briggsy-locked 2026-05-27)', () => {
    const out = buildCodeMetrics(proj({ tiers: richTiers() }))
    // 30000+8000+500 = 38500; if build-scripts (17000) leaked in it would be 55500.
    expect(out.find((m) => m.key === 'app')?.lines).toBe(38500)
  })

  it('planning is docs/plans ONLY, not all docs (readmes excluded)', () => {
    const out = buildCodeMetrics(proj({ tiers: richTiers() }))
    expect(out.find((m) => m.key === 'plans')?.lines).toBe(61000) // not 62200
  })

  it('omits a bucket with 0 lines AND 0 files (a toy with no config/plans shows neither)', () => {
    const tiers = [
      {
        tier: 'authored',
        categories: [{ category: 'code', subcategories: [sub('source', { totalLines: 500, files: 5 })], totals: sub('code') }],
      },
    ] as unknown as ProjectReport['tiers']
    const out = buildCodeMetrics(proj({ tiers }))
    expect(out.map((m) => m.key)).toEqual(['app'])
  })

  it('empty tiers[] → []', () => {
    expect(buildCodeMetrics(proj({ tiers: [] }))).toEqual([])
  })

  it('missing tiers entirely → [] (defensive, no throw)', () => {
    expect(buildCodeMetrics(proj({}))).toEqual([])
  })

  it('does not mutate the input report', () => {
    const report = proj({ tiers: richTiers() })
    const snapshot = JSON.stringify(report)
    buildCodeMetrics(report)
    expect(JSON.stringify(report)).toBe(snapshot)
  })
})

describe('findProject', () => {
  const report = {
    projects: [proj({ projectName: 'burned' }), proj({ projectName: 'pacman' })],
    meta: [proj({ projectName: 'ai-journey-stats' })],
    archiveCollective: { projectNames: ['hide-and-seek', 'do-not-disturb'] },
  } as unknown as MultiProjectReport

  it('finds an active project by name', () => {
    expect(findProject(report, 'burned')?.projectName).toBe('burned')
  })
  it('a name only in meta[] → null (meta has no detail page)', () => {
    expect(findProject(report, 'ai-journey-stats')).toBeNull()
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
