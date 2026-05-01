/**
 * Phase 5 Unit 4 — `build-issue-index` tests.
 *
 * Mirrors phase-5-triage-agents.md Unit 4 "Test scenarios". Uses
 * temp-directory fixtures via `mkdtemp`.
 */
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  buildIssueIndex,
  parseIssueFile,
  renderIndexMarkdown,
  type ParsedIssue,
  type IndexCounts,
} from './build-issue-index'

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

let tempDir: string
let issuesDir: string

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'phase5-index-'))
  issuesDir = path.join(tempDir, 'issues')
  await mkdir(issuesDir, { recursive: true })
})

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true })
})

function issueMd(opts: {
  seedId: string
  title?: string
  severity?: 'P0' | 'P1' | 'P2'
  status?: string
  kind?: string
  seats?: string
  scenarios?: string
  viewerRole?: string
  candidateDuplicate?: string
  failedTier?: string
  body?: string
}): string {
  return [
    `# ${opts.seedId} — ${opts.title ?? 'Some title'}`,
    '',
    `**Severity (triage):** ${opts.severity ?? 'P1'}`,
    `**Status:** ${opts.status ?? '🔴 OPEN'}`,
    `**Seed kind:** ${opts.kind ?? 'scripted-scenario'}`,
    `**Source seats:** ${opts.seats ?? 'seat-1'}`,
    `**Linked scenarios:** ${opts.scenarios ?? 'SCN-A'}`,
    `**Viewer role (if ui-spec-divergence):** ${opts.viewerRole ?? 'n/a'}`,
    `**Candidate duplicate:** ${opts.candidateDuplicate ?? 'n/a'}`,
    opts.failedTier ? `**Failed tier:** ${opts.failedTier}` : '',
    '',
    '## Diagnosis',
    '',
    opts.body ?? 'Real diagnosis prose here.',
    '',
  ].join('\n')
}

async function writeIssue(filename: string, content: string): Promise<void> {
  await writeFile(path.join(issuesDir, filename), content, 'utf8')
}

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('parseIssueFile — header parsing', () => {
  it('parses a well-formed issue header set', () => {
    const content = issueMd({
      seedId: '001-scn-a',
      title: 'Steal pending banner missing on target phone',
      severity: 'P1',
      status: '🔴 OPEN',
      kind: 'ui-spec-divergence',
      seats: 'seat-3, seat-7',
      scenarios: 'SCN-NAMED-STEAL-INTERCEPT-01',
      viewerRole: 'TARGET',
      candidateDuplicate: 'SCN-A (linked: E-01)',
    })
    const i = parseIssueFile('001-scn-a.md', content)
    expect(i.seedId).toBe('001-scn-a')
    expect(i.title).toBe('Steal pending banner missing on target phone')
    expect(i.severity).toBe('P1')
    expect(i.status).toBe('OPEN')
    expect(i.kind).toBe('ui-spec-divergence')
    expect(i.sourceSeats).toEqual(['seat-3', 'seat-7'])
    expect(i.linkedScenarios).toEqual(['SCN-NAMED-STEAL-INTERCEPT-01'])
    expect(i.viewerRole).toBe('TARGET')
    expect(i.candidateDuplicate).toBe('SCN-A (linked: E-01)')
    expect(i.parseWarnings).toEqual([])
  })

  it('parses RESOLVED status even when resolution prose mentions BLOCKED in another dimension', () => {
    // Regression for issue-closure workflow: the substring matcher must
    // pick the FIRST status word in declared order, and RESOLVED leads.
    // Otherwise "RESOLVED — B-05 dimension still BLOCKED separately" would
    // misparse as BLOCKED (the original gap that surfaced this fix).
    const content = [
      '# 099-resolved — favor cinematic',
      '',
      '**Severity (triage):** P1',
      '**Status:** ✅ RESOLVED 2026-05-01 — Finding 1 = RESOLVED-NOT-A-BUG; B-05 dimension still ⏸ BLOCKED separately',
      '**Seed kind:** vibe-check',
      '**Source seats:** seat-1',
      '**Linked scenarios:** SCN-X',
      '',
    ].join('\n')
    const i = parseIssueFile('099-resolved.md', content)
    expect(i.status).toBe('RESOLVED')
    expect(i.parseWarnings).toEqual([])
  })

  it('flags missing Status header', () => {
    const content = [
      '# 002-bad — missing status',
      '',
      '**Severity (triage):** P2',
      '**Seed kind:** scripted-scenario',
      '**Source seats:** seat-1',
      '**Linked scenarios:** SCN-X',
      '',
    ].join('\n')
    const i = parseIssueFile('002-bad.md', content)
    expect(i.status).toBeNull()
    expect(i.parseWarnings.some((w) => w.includes('Status'))).toBe(true)
  })

  it('flags missing seed-kind header', () => {
    const content = [
      '# 003-bad — missing kind',
      '',
      '**Severity (triage):** P2',
      '**Status:** 🔴 OPEN',
      '**Source seats:** seat-1',
      '',
    ].join('\n')
    const i = parseIssueFile('003-bad.md', content)
    expect(i.kind).toBeNull()
    expect(i.parseWarnings.some((w) => w.includes('Seed kind'))).toBe(true)
  })

  it('flags Ruling A "cannot determine" prose', () => {
    const content = issueMd({
      seedId: '004-uispec',
      kind: 'ui-spec-divergence',
      body:
        'Column 1 was redacted by the scrubber. Result: cannot determine from scrubbed data; human review recommended.',
    })
    const i = parseIssueFile('004-uispec.md', content)
    expect(i.cannotDetermine).toBe(true)
  })

  it('does NOT flag cannot-determine when prose is normal', () => {
    const content = issueMd({
      seedId: '005-uispec',
      kind: 'ui-spec-divergence',
      body: 'Standard diagnosis: projection drops the namedCardType field.',
    })
    const i = parseIssueFile('005-uispec.md', content)
    expect(i.cannotDetermine).toBe(false)
  })
})

describe('buildIssueIndex — file walk + render', () => {
  it('happy path: 3 issues with varied seed kinds → all sections rendered + correct counts', async () => {
    await writeIssue(
      '001-scn-a.md',
      issueMd({ seedId: '001-scn-a', kind: 'scripted-scenario', severity: 'P1' }),
    )
    await writeIssue(
      '002-vibe.md',
      issueMd({
        seedId: '002-vibe',
        kind: 'vibe-check',
        severity: 'P2',
        status: '🔴 OPEN',
      }),
    )
    await writeIssue(
      '003-withdiv.md',
      issueMd({
        seedId: '003-withdiv',
        kind: 'with-divergence-fire',
        severity: 'P0',
        status: '🔴 OPEN',
        failedTier: 'projectionAsserts',
      }),
    )

    const result = await buildIssueIndex({ issuesDir })
    expect(result.counts.total).toBe(3)
    expect(result.counts.bySeedKind['scripted-scenario']).toBe(1)
    expect(result.counts.bySeedKind['vibe-check']).toBe(1)
    expect(result.counts.bySeedKind['with-divergence-fire']).toBe(1)
    expect(result.counts.bySeverity.P0).toBe(1)
    expect(result.counts.bySeverity.P1).toBe(1)
    expect(result.counts.bySeverity.P2).toBe(1)

    const md = await readFile(result.indexPath, 'utf8')
    expect(md).toContain('# Triage issue index')
    expect(md).toContain('## Summary')
    expect(md).toContain('## Scripted-scenario findings')
    expect(md).toContain('## Free-play findings')
    expect(md).toContain('## Vibe-check findings')
    expect(md).toContain('## UI-spec-divergence findings')
    expect(md).toContain('## Role-drift findings — low-signal')
    expect(md).toContain('## With-divergence fires')
    expect(md).toContain('## Coverage divergences')
    expect(md).toContain('## Known-product-calls confirmed')

    // Populated sections include their seed IDs in tables.
    expect(md).toContain('001-scn-a')
    expect(md).toContain('002-vibe')
    expect(md).toContain('003-withdiv')
    // failedTier surfaces in the with-divergence-fire row.
    expect(md).toContain('projectionAsserts')

    // Empty sections render the "none" placeholder (presence companion).
    expect(md).toContain('_No findings of this kind this session._')
  })

  it('zero issues → INDEX.md written with all sections "none"', async () => {
    const result = await buildIssueIndex({ issuesDir })
    expect(result.counts.total).toBe(0)
    const md = await readFile(result.indexPath, 'utf8')
    expect(md).toContain('## Summary')
    expect(md).toContain('Total issues:** 0')
    // Every section should render the "none" placeholder.
    const noneCount = (md.match(/_No findings of this kind this session._/g) ?? [])
      .length
    expect(noneCount).toBeGreaterThanOrEqual(8)
  })

  it('all issues KNOWN-PRODUCT-CALL-CONFIRMED → known-product-calls section populated; others empty', async () => {
    await writeIssue(
      '001-known.md',
      issueMd({
        seedId: '001-known',
        kind: 'scripted-scenario',
        status: '✅ KNOWN-PRODUCT-CALL-CONFIRMED',
        candidateDuplicate: 'SCN-A (linked: E-01)',
      }),
    )
    await writeIssue(
      '002-known.md',
      issueMd({
        seedId: '002-known',
        kind: 'scripted-scenario',
        status: 'KNOWN-PRODUCT-CALL-CONFIRMED',
        candidateDuplicate: 'SCN-B (linked: C-05)',
      }),
    )
    const result = await buildIssueIndex({ issuesDir })
    expect(result.counts.byStatus['KNOWN-PRODUCT-CALL-CONFIRMED']).toBe(2)
    const md = await readFile(result.indexPath, 'utf8')
    expect(md).toContain('## Known-product-calls confirmed')
    // Section contents: both seeds + their linked IDs.
    expect(md).toContain('001-known')
    expect(md).toContain('002-known')
    expect(md).toContain('E-01')
    expect(md).toContain('C-05')
    // Scripted-scenario section IS the natural home of the seed kind, but
    // because their status is KNOWN-PRODUCT-CALL-CONFIRMED they're routed
    // to the dedicated section instead — scripted-scenario renders empty.
    const scriptedSectionStart = md.indexOf('## Scripted-scenario findings')
    const freePlayStart = md.indexOf('## Free-play findings')
    const scriptedSection = md.slice(scriptedSectionStart, freePlayStart)
    expect(scriptedSection).toContain('_No findings of this kind this session._')
  })

  it('issue file with missing headers → listed in warnings section + best-guess placement', async () => {
    await writeIssue(
      '001-bad.md',
      [
        '# 001-bad — half-broken',
        '',
        '**Severity (triage):** P1',
        '**Source seats:** seat-1',
        '',
      ].join('\n'),
    )
    const result = await buildIssueIndex({ issuesDir })
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]!.parseWarnings.length).toBeGreaterThan(0)
    const md = await readFile(result.indexPath, 'utf8')
    expect(md).toContain('## Header parse warnings')
    expect(md).toContain('001-bad')
  })

  it('files not matching NNN-*.md naming are ignored', async () => {
    await writeIssue('001-good.md', issueMd({ seedId: '001-good' }))
    await writeIssue('not-an-issue.md', '# random scratch')
    await writeIssue('INDEX.md', '# pre-existing index — should be ignored')
    const result = await buildIssueIndex({ issuesDir })
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]!.seedId).toBe('001-good')
  })
})

describe('renderIndexMarkdown — section ordering + counts', () => {
  function emptyCounts(): IndexCounts {
    return {
      total: 0,
      byStatus: {
        OPEN: 0, BLOCKED: 0, DUPLICATE: 0,
        'KNOWN-PRODUCT-CALL-CONFIRMED': 0, 'LOW-SIGNAL': 0,
        RESOLVED: 0,
      },
      bySeverity: { P0: 0, P1: 0, P2: 0 },
      bySeedKind: {
        'scripted-scenario': 0, 'free-play': 0, 'vibe-check': 0,
        'ui-spec-divergence': 0, 'role-drift': 0,
        'with-divergence-fire': 0, 'coverage-divergence': 0,
      },
      lowSignal: 0,
    }
  }

  it('section order is deterministic per phase-5 plan ordering', () => {
    const md = renderIndexMarkdown([], emptyCounts())
    const ordered = [
      '## Summary',
      '## Scripted-scenario findings',
      '## Free-play findings',
      '## Vibe-check findings',
      '## UI-spec-divergence findings',
      '## Role-drift findings — low-signal',
      '## With-divergence fires',
      '## Coverage divergences',
      '## Known-product-calls confirmed',
    ]
    let cursor = 0
    for (const heading of ordered) {
      const idx = md.indexOf(heading, cursor)
      expect(idx, `missing or out-of-order: ${heading}`).toBeGreaterThanOrEqual(cursor)
      cursor = idx + heading.length
    }
  })

  it('UI-spec-divergence section emits the Ruling A indicator column', () => {
    const issues: ParsedIssue[] = [
      {
        file: '010-uispec.md',
        seedId: '010-uispec',
        title: 'redacted Column 1',
        severity: 'P1',
        status: 'OPEN',
        kind: 'ui-spec-divergence',
        sourceSeats: ['seat-3'],
        linkedScenarios: ['SCN-A'],
        viewerRole: 'TARGET',
        cannotDetermine: true,
        parseWarnings: [],
      },
    ]
    const counts = emptyCounts()
    const cMut = counts as unknown as { total: number }
    cMut.total = 1
    const md = renderIndexMarkdown(issues, counts)
    // Section header carries the column.
    expect(md).toContain('Ruling A')
    // Row carries the literal phrase indicator.
    expect(md).toContain('cannot determine')
    // Viewer role column populated.
    expect(md).toMatch(/\| TARGET \|/)
  })
})
