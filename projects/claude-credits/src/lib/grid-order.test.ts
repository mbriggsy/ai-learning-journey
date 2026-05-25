import { describe, it, expect } from 'vitest'
import type { MultiProjectReport, ProjectReport, ArchiveCollective } from '@/types'
import { sortBySize, buildGridModel } from './grid-order'

// Minimal fixtures — sortBySize reads only projectName + grandTotals.authoredLines;
// buildGridModel reads only projects + archiveCollective. Cast the rest away.
const proj = (projectName: string, authoredLines: number): ProjectReport =>
  ({ projectName, grandTotals: { authoredLines } }) as unknown as ProjectReport

const report = (
  projects: ProjectReport[],
  archiveCollective: ArchiveCollective | null,
): MultiProjectReport => ({ projects, archiveCollective }) as unknown as MultiProjectReport

const archive = { projectCount: 6 } as unknown as ArchiveCollective

describe('sortBySize', () => {
  it('sorts by authoredLines descending', () => {
    const out = sortBySize([proj('a', 10), proj('b', 300), proj('c', 50)])
    expect(out.map((p) => p.projectName)).toEqual(['b', 'c', 'a'])
  })
  it('breaks ties by projectName ascending (diff-stable)', () => {
    const out = sortBySize([proj('zed', 100), proj('amp', 100)])
    expect(out.map((p) => p.projectName)).toEqual(['amp', 'zed'])
  })
  it('mass-tie (3+ equal) sorts purely alphabetical, deterministically', () => {
    const out = sortBySize([proj('c', 5), proj('a', 5), proj('b', 5)])
    expect(out.map((p) => p.projectName)).toEqual(['a', 'b', 'c'])
  })
  it('sinks a 0-authored project below all positives', () => {
    const out = sortBySize([proj('zero', 0), proj('x', 1)])
    expect(out.map((p) => p.projectName)).toEqual(['x', 'zero'])
  })
  it('handles empty and single', () => {
    expect(sortBySize([])).toEqual([])
    expect(sortBySize([proj('solo', 9)]).map((p) => p.projectName)).toEqual(['solo'])
  })
  it('does not mutate the input array', () => {
    const input = [proj('a', 1), proj('b', 2)]
    const before = input.map((p) => p.projectName)
    sortBySize(input)
    expect(input.map((p) => p.projectName)).toEqual(before)
  })
})

describe('buildGridModel', () => {
  it('populated projects + archive → sorted active, divider shown, not empty', () => {
    const m = buildGridModel(report([proj('a', 10), proj('b', 99)], archive))
    expect(m.active.map((p) => p.projectName)).toEqual(['b', 'a'])
    expect(m.showMissesDivider).toBe(true)
    expect(m.isEmpty).toBe(false)
  })
  it('null archive → no misses divider', () => {
    const m = buildGridModel(report([proj('a', 10)], null))
    expect(m.showMissesDivider).toBe(false)
    expect(m.isEmpty).toBe(false)
  })
  it('empty projects but populated archive → renders coda, not empty', () => {
    const m = buildGridModel(report([], archive))
    expect(m.active).toEqual([])
    expect(m.showMissesDivider).toBe(true)
    expect(m.isEmpty).toBe(false)
  })
  it('all empty → isEmpty true', () => {
    const m = buildGridModel(report([], null))
    expect(m.isEmpty).toBe(true)
    expect(m.showMissesDivider).toBe(false)
  })
})
