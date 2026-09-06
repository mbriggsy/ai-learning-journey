import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readdirSync } from 'node:fs'
import {
  parseVitestList,
  extractClaim,
  checkDocStats,
  TRACKED_SURFACES,
  parseBacklogHeader,
  countBacklogEntries,
  checkBacklogCount,
  findStrayCounts,
  checkInsightsIndex,
  checkInsightSections,
  INSIGHT_SECTIONS,
  strayCountSurfaces,
  BACKLOG_SURFACE,
  INSIGHTS_DIR,
  stripArchived,
  checkCitations,
  citationSurfaces,
  buildSourceResolver,
  CITATION_LOG_SURFACES,
} from '../verify-doc-stats'

describe('doc test-count drift sentinel', () => {
  describe('parseVitestList', () => {
    it('counts cases as lines and files as unique path prefixes', () => {
      const stdout = [
        'src/a.test.ts > group > does X',
        'src/a.test.ts > group > does Y',
        'src/b.test.ts > does Z',
        'scripts/__tests__/c.test.ts > nested > deep > does W',
      ].join('\n')
      expect(parseVitestList(stdout)).toEqual({ cases: 4, files: 3 })
    })

    it('ignores banner/noise lines without the " > " delimiter', () => {
      const stdout = ['RUN v4.1.8', '', 'src/a.test.ts > does X', 'collected in 1.2s'].join('\n')
      expect(parseVitestList(stdout)).toEqual({ cases: 1, files: 1 })
    })

    it('normalizes CRLF (the Windows path)', () => {
      const stdout = 'src/a.test.ts > does X\r\nsrc/b.test.ts > does Y\r\n'
      expect(parseVitestList(stdout)).toEqual({ cases: 2, files: 2 })
    })

    it('takes the file as the text before the FIRST " > " even when a test name contains " > "', () => {
      const stdout = 'src/a.test.ts > renders a > b comparison correctly'
      expect(parseVitestList(stdout)).toEqual({ cases: 1, files: 1 })
    })
  })

  describe('extractClaim', () => {
    it('reads the README phrasing ("NNN tests across NN files")', () => {
      expect(extractClaim('carry **962 tests across 45 files**, all green')).toEqual({
        cases: 962,
        files: 45,
      })
    })

    it('reads the roadmap phrasing ("NNN vitest across NN files")', () => {
      expect(extractClaim('| 962 vitest across 45 files (Vitest 4) |')).toEqual({
        cases: 962,
        files: 45,
      })
    })

    it('returns null when no claim is present (the vacuous-guard trap)', () => {
      expect(extractClaim('the engine carries a comprehensive test suite')).toBeNull()
    })
  })

  describe('checkDocStats', () => {
    const actual = { cases: 962, files: 45 }

    it('passes when every surface matches the live suite', () => {
      const { ok } = checkDocStats(actual, [
        { surface: 'README.md', claim: { cases: 962, files: 45 } },
        { surface: 'docs/roadmap.md', claim: { cases: 962, files: 45 } },
      ])
      expect(ok).toBe(true)
    })

    it('FAILS a stale case count', () => {
      const { ok, results } = checkDocStats(actual, [
        { surface: 'README.md', claim: { cases: 942, files: 45 } },
      ])
      expect(ok).toBe(false)
      expect(results[0]!.reason).toContain('942 tests')
    })

    it('FAILS a stale file count', () => {
      const { ok } = checkDocStats(actual, [
        { surface: 'README.md', claim: { cases: 962, files: 44 } },
      ])
      expect(ok).toBe(false)
    })

    it('FAILS a surface whose claim went missing (reworded away)', () => {
      const { ok, results } = checkDocStats(actual, [{ surface: 'README.md', claim: null }])
      expect(ok).toBe(false)
      expect(results[0]!.reason).toContain('no')
    })

    it('catches cross-surface divergence (one updated, one not)', () => {
      const { ok } = checkDocStats(actual, [
        { surface: 'README.md', claim: { cases: 962, files: 45 } },
        { surface: 'docs/roadmap.md', claim: { cases: 942, files: 44 } },
      ])
      expect(ok).toBe(false)
      // ...and that divergence check is only worth the ROSTER it runs on. `[].every()` is
      // TRUE, so an EMPTIED TRACKED_SURFACES makes main() print "OK — every tracked surface
      // matches the live suite" having read ZERO files. A SINGLE-ENTRY roster is the quieter
      // version: one real check still runs while docs/roadmap.md silently stops being covered
      // at all. Either way the gate reports green because it cannot see, and nothing imported
      // this const before, so both mutants survived the entire suite. The two gated surfaces
      // have stayed in lockstep precisely BECAUSE the gate reads both — that is the property
      // this arm protects. Bind the roster to DISK, not to a copied literal: every tracked
      // surface must EXIST and still carry a claim the extractor can read, there must be at
      // least TWO DISTINCT ones (a duplicated entry would pass a .length check), and they must
      // agree with EACH OTHER right now. Deliberately NOT compared to the live vitest count —
      // that would red `pnpm test` on every test-adding commit until the docs were re-stamped.
      // ⚠️ ORDER IS LOAD-BEARING: the size check must stay FIRST. The final agreement check
      // passes vacuously on a one-element roster, so it only discriminates behind that floor.
      expect(new Set<string>(TRACKED_SURFACES).size).toBeGreaterThanOrEqual(2)
      const onDisk = TRACKED_SURFACES.map((surface) => ({
        surface,
        claim: extractClaim(readFileSync(join(process.cwd(), surface), 'utf-8')),
      }))
      for (const { surface, claim } of onDisk) {
        expect(claim, `${surface} carries no readable "NNN tests across NN files" claim`).not.toBeNull()
      }
      expect(new Set(onDisk.map((s) => JSON.stringify(s.claim))).size).toBe(1)
    })
  })
})

describe('the register + insights arms (2026-09-06 — the numbers the doc audit found rotting)', () => {
  const header = (open: number, entries: number, closed: number, half = 'two entries are half-closed') =>
    `# The Back Nine — Open Backlog\n\n> The complete open register: **${open} open items** (${entries} entries, ${closed} closed and kept as records; ${half} and counted open — re-counted) consolidated\n> from **136 raw obligations**.\n`
  const body = (headings: string[]) => `\n## Tier 0 — calm-but-wrong\n\n${headings.map((h) => `### ${h}\n\n- a bullet\n`).join('\n')}`

  describe('parseBacklogHeader', () => {
    it('reads open / entries / closed and a word-valued half-closed count', () => {
      expect(parseBacklogHeader(header(48, 56, 8))).toEqual({ open: 48, entries: 56, closed: 8, halfClosed: 2 })
    })
    it('reads a digit-valued half-closed count and defaults it to 0 when absent', () => {
      expect(parseBacklogHeader(header(48, 56, 8, '3 entries are half-closed'))!.halfClosed).toBe(3)
      expect(parseBacklogHeader(header(48, 56, 8, 'nothing'))!.halfClosed).toBe(0)
    })
    it('returns null when the header phrasing is gone (the vacuous-guard trap)', () => {
      expect(parseBacklogHeader('# Backlog\n\n> 48 items remain open.\n')).toBeNull()
    })
    it('reads only the first dozen lines — a count deep in the body is not the header', () => {
      expect(parseBacklogHeader('# Backlog\n' + '\n'.repeat(20) + '**48 open items** (56 entries, 8 closed')).toBeNull()
    })
  })

  describe('countBacklogEntries', () => {
    it('counts ### headings below the first ## Tier heading, ~~struck~~ and ✅ ones as closed-marked', () => {
      const c = '# Backlog\n\n### Not an entry (above the tiers)\n' + body(['Open one', '~~Closed one~~ — **CLOSED**', '✅ CLOSED (the mechanism) — half', 'Open two'])
      expect(countBacklogEntries(c)).toEqual({ entries: 4, closedMarked: 2 })
    })
    it('finds nothing without a tier heading', () => {
      expect(countBacklogEntries('# Backlog\n\n### A heading\n')).toEqual({ entries: 0, closedMarked: 0 })
    })
  })

  describe('checkBacklogCount', () => {
    const goodBody = body(['A', 'B', '~~C~~ closed', '✅ CLOSED D (half — counted open)', 'E'])
    it('passes when the header matches the body and its own arithmetic', () => {
      // 5 entries; ~~C~~ + ✅D marked = 2 = closed 1 + half-closed 1; open = 5 − 1 = 4
      expect(checkBacklogCount(header(4, 5, 1, 'one entry is half-closed') + goodBody)).toEqual({ ok: true })
    })
    it('FAILS an entry added without bumping the header', () => {
      const r = checkBacklogCount(header(4, 5, 1, 'one entry is half-closed') + goodBody + '\n### F (new, unbumped)\n')
      expect(r.ok).toBe(false)
      expect(r.reason).toContain('header says 5 entries; the body holds 6')
    })
    it('FAILS an entry struck through without bumping the closed count', () => {
      const r = checkBacklogCount(header(4, 5, 1, 'one entry is half-closed') + body(['A', '~~B~~', '~~C~~', '✅ D', 'E']))
      expect(r.ok).toBe(false)
      expect(r.reason).toContain('half-closed = 2; the body marks 3')
    })
    it('FAILS a header whose own arithmetic does not add up', () => {
      const r = checkBacklogCount(header(5, 5, 1, 'one entry is half-closed') + goodBody)
      expect(r.ok).toBe(false)
      expect(r.reason).toContain('5 entries − 1 closed = 4')
    })
    it('FAILS when the header claim is gone or the body has no entries', () => {
      expect(checkBacklogCount('# Backlog\n' + goodBody).ok).toBe(false)
      expect(checkBacklogCount(header(4, 5, 1)).ok).toBe(false)
    })
    it('passes on the REAL register — header phrasing readable, body counted, and they agree', () => {
      // Deliberately live, unlike the test-count arm: a register edit that adds or closes an
      // entry bumps the header IN THE SAME EDIT, so a red here is the defect, not churn.
      const real = readFileSync(join(process.cwd(), BACKLOG_SURFACE), 'utf-8')
      expect(parseBacklogHeader(real), 'the register header no longer carries the "**N open items** (M entries, K closed" phrasing').not.toBeNull()
      expect(countBacklogEntries(real).entries).toBeGreaterThanOrEqual(40)
      expect(checkBacklogCount(real)).toEqual({ ok: true })
    })
    it('the singular half-closed form parses too ("one entry is half-closed" → 1)', () => {
      expect(parseBacklogHeader(header(4, 5, 1, 'one entry is half-closed'))!.halfClosed).toBe(1)
    })
  })

  describe('findStrayCounts', () => {
    it('flags both re-typed phrasings and ignores everything else', () => {
      expect(
        findStrayCounts([
          { surface: 'a.md', content: 'leaving **46 open items** in the register' },
          { surface: 'b.md', content: 'consolidated into a 43-item open register' },
          { surface: 'c.md', content: 'the open count lives in the register header' },
          { surface: 'd.md', content: '46 open questions remain' },
        ]),
      ).toEqual(['a.md', 'b.md'])
    })
    it('the REAL doc set types the count nowhere but the register header', () => {
      const cwd = process.cwd()
      const surfaces = strayCountSurfaces(cwd)
      expect(surfaces).toContain('README.md')
      expect(surfaces).toContain('docs/roadmap.md')
      expect(surfaces).not.toContain(BACKLOG_SURFACE)
      expect(surfaces.some((s) => s.startsWith('docs/insights/'))).toBe(false)
      expect(findStrayCounts(surfaces.map((surface) => ({ surface, content: readFileSync(join(cwd, surface), 'utf-8') })))).toEqual([])
    })
  })

  describe('checkInsightsIndex', () => {
    it('reports a file missing from the index and a link to a file that does not exist', () => {
      const r = checkInsightsIndex('- [001 — a](001-a.md)\n- [003 — c](003-c.md)\n', ['001-a.md', '002-b.md', 'README.md'])
      expect(r).toEqual({ ok: false, missingFromIndex: ['002-b.md'], danglingInIndex: ['003-c.md'] })
    })
    it('ignores non-insight files on disk and non-insight links in the index', () => {
      const r = checkInsightsIndex('- [001](001-a.md) · see [CLAUDE.md](../../CLAUDE.md)', ['001-a.md', 'README.md', 'notes.txt'])
      expect(r.ok).toBe(true)
    })
    it('the REAL index matches the REAL directory, both ways', () => {
      const dir = join(process.cwd(), INSIGHTS_DIR)
      const r = checkInsightsIndex(readFileSync(join(dir, 'README.md'), 'utf-8'), readdirSync(dir))
      expect(r).toEqual({ ok: true, missingFromIndex: [], danglingInIndex: [] })
    })
  })

  describe('checkInsightSections — every numbered insight carries the four /distill sections', () => {
    /** A compliant insight: the four required headings, in the usual order. */
    const full = (extra = '') =>
      `# 001 — a title\n\n## Problem\n\nx\n\n## Root Cause\n\ny\n\n## Fix\n\nz\n\n## Key Insight\n\nw\n${extra}`

    it('passes a file carrying all four, and never judges README.md (the index belongs to arm 3)', () => {
      expect(
        checkInsightSections([
          { name: '001-a.md', content: full('\n## Also Applies To\n\nq\n') },
          { name: 'README.md', content: '# Insights\n\n- [001 — a](001-a.md)\n' },
        ]),
      ).toEqual([])
    })

    it('reports EXACTLY the section that is missing', () => {
      expect(checkInsightSections([{ name: '002-b.md', content: full().replace('## Root Cause\n\ny\n\n', '') }])).toEqual([
        { file: '002-b.md', missing: ['## Root Cause'] },
      ])
    })

    it('counts a heading carrying a trailing clause — 016 and 072 really head theirs that way', () => {
      // Verbatim shapes from docs/insights/016-…md:12 and 072-…md:35.
      const content =
        '## Problem\n\nx\n\n## Root Cause — the ways a browser-enforcement test is GREEN while proving nothing\n\ny\n\n## Fix (three laws, one seam)\n\nz\n\n## Key Insight\n\nw\n'
      expect(checkInsightSections([{ name: '003-c.md', content }])).toEqual([])
    })

    it('does NOT count a different section that merely STARTS with a required name ("## Root Causes")', () => {
      // The trap a bare startsWith falls into: the boundary must be end-of-line, whitespace,
      // an em dash or "(" — never a further letter.
      expect(checkInsightSections([{ name: '004-d.md', content: full().replace('## Root Cause\n', '## Root Causes\n') }])).toEqual([
        { file: '004-d.md', missing: ['## Root Cause'] },
      ])
    })

    it('gates neither ## Also Applies To (eleven files end at Key Insight) nor section ORDER (068, 072)', () => {
      // 072's real order: Problem → Fix → Root Cause → Key Insight, and no Also Applies To.
      const reordered = '## Problem\n\nx\n\n## Fix\n\nz\n\n## Root Cause\n\ny\n\n## Key Insight\n\nw\n'
      expect(checkInsightSections([{ name: '005-e.md', content: reordered }])).toEqual([])
    })

    it('the REAL insights directory — every numbered file carries all four', () => {
      // Live on purpose (like the register + citation arms): a `/distill` that drops a section is a
      // defect the moment the file lands, and the fix belongs in that same commit. The floor pins
      // the arm to a non-empty roster — an emptied directory would otherwise pass vacuously.
      const dir = join(process.cwd(), INSIGHTS_DIR)
      const files = readdirSync(dir)
        .filter((f) => /^\d{3}-.*\.md$/.test(f))
        .map((name) => ({ name, content: readFileSync(join(dir, name), 'utf-8') }))
      expect(files.length).toBeGreaterThanOrEqual(100)
      expect(INSIGHT_SECTIONS).toHaveLength(4)
      expect(checkInsightSections(files)).toEqual([])
    })
  })

  describe('checkCitations — every line-numbered citation resolves (the structural half of anchor truth)', () => {
    const files: Record<string, string[]> = {
      'staleness.ts': ['a', 'b', 'c', '', 'e', 'f'],
      'src/ui/copy.ts': ['x', 'y'],
    }
    const resolve = (cited: string): string[] | null => files[cited] ?? files[cited.split('/').pop()!] ?? null
    it('passes an in-range citation, a range, a path-form citation and an en-dash range', () => {
      const docs = [{ surface: 'd.md', content: 'see `staleness.ts:2` and `staleness.ts:1-3`, `src/ui/copy.ts:2`, `staleness.ts:5–6`' }]
      expect(checkCitations(docs, resolve)).toEqual([])
    })
    it('FAILS a missing file, an out-of-range line, a blank-only range and a malformed short range, naming the doc line', () => {
      const docs = [{ surface: 'd.md', content: 'ok `staleness.ts:1`\n`gone.ts:3` · `staleness.ts:9` · `staleness.ts:4` · `staleness.ts:1812-13`' }]
      const p = checkCitations(docs, resolve)
      expect(p.map((x) => `${x.line}:${x.citation}:${x.reason.split(' (')[0]}`)).toEqual([
        '2:gone.ts:3:file not found',
        '2:staleness.ts:9:out of range',
        '2:staleness.ts:4:cites only blank line(s)',
        '2:staleness.ts:1812-13:malformed range',
      ])
    })
    it('ignores citations inside <details> blocks (archived reasoning) without shifting line numbers', () => {
      const content = 'live `staleness.ts:1`\n<details><summary>old</summary>\n`gone.ts:1`\n</details>\n`gone.ts:2`'
      expect(stripArchived(content).split('\n')).toHaveLength(5)
      const p = checkCitations([{ surface: 'd.md', content }], resolve)
      expect(p).toEqual([{ surface: 'd.md', line: 5, citation: 'gone.ts:2', reason: 'file not found' }])
    })
    it('the REAL live docs resolve every citation — and the roster excludes the dated logs + insights', () => {
      // Live on purpose (like the register arm): a citation to a deleted file or a vanished line is a
      // defect the moment it lands, and the fix belongs in the same commit as the code move.
      const cwd = process.cwd()
      const surfaces = citationSurfaces(cwd)
      expect(surfaces).toContain('TODO.md')
      expect(surfaces).toContain('docs/backlog.md')
      for (const log of CITATION_LOG_SURFACES) expect(surfaces).not.toContain(log)
      expect(surfaces.some((s) => s.startsWith('docs/insights/'))).toBe(false)
      const docs = surfaces.map((surface) => ({ surface, content: readFileSync(join(cwd, surface), 'utf-8') }))
      expect(checkCitations(docs, buildSourceResolver(cwd))).toEqual([])
    })
    it('the resolver finds the monorepo-root CI workflow by bare name and a bare basename under src/', () => {
      const r = buildSourceResolver(process.cwd())
      expect(r('verify-the-back-nine.yml', 1, 1)).not.toBeNull()
      expect(r('staleness.ts', 1, 1)).not.toBeNull()
      expect(r('no-such-file-anywhere.ts', 1, 1)).toBeNull()
    })
  })
})
