/**
 * Phase 5 Unit 4 — `build-issue-index.ts`.
 *
 * Walks `runs/<id>/issues/*.md`, parses each header block, groups by
 * `seed kind`, and writes `runs/<id>/issues/INDEX.md` with deterministic
 * sections per the phase-5 plan (D11 vibe-check, D12 free-play, D13
 * ui-spec-divergence, D15 role-drift, D17 with-divergence-fire,
 * scripted, coverage-divergence, known-product-calls).
 *
 * Pure header parsing + markdown rendering. Read directory entries,
 * write INDEX.md, return summary stats. The session.md end-block update
 * is the orchestrator's responsibility (Unit 6) — this module returns
 * the counts so the caller can append.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { SeedKind } from './types'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type IssueStatus =
  | 'OPEN'
  | 'BLOCKED'
  | 'DUPLICATE'
  | 'KNOWN-PRODUCT-CALL-CONFIRMED'
  | 'LOW-SIGNAL'
  | 'RESOLVED'

export type IssueSeverity = 'P0' | 'P1' | 'P2'

export interface ParsedIssue {
  /** Path relative to issuesDir, e.g. `001-scn-a.md`. */
  readonly file: string
  readonly seedId: string
  readonly title: string
  readonly severity: IssueSeverity | null
  readonly status: IssueStatus | null
  readonly kind: SeedKind | null
  readonly sourceSeats: string[]
  readonly linkedScenarios: string[]
  readonly viewerRole?: string
  readonly candidateDuplicate?: string
  /** True when diagnosis prose contains the literal "cannot determine
   *  from scrubbed data" phrase (Ruling A indicator). */
  readonly cannotDetermine: boolean
  /** Triage failed tier for `with-divergence-fire` issues, when surfaced. */
  readonly failedTier?: string
  /** Header rows we couldn't recognize — surfaced as a warning row. */
  readonly parseWarnings: string[]
}

export interface IndexCounts {
  readonly total: number
  readonly byStatus: Record<IssueStatus, number>
  readonly bySeverity: Record<IssueSeverity, number>
  readonly bySeedKind: Record<SeedKind, number>
  readonly lowSignal: number
}

export interface BuildIssueIndexResult {
  readonly indexPath: string
  readonly issues: readonly ParsedIssue[]
  readonly counts: IndexCounts
}

// -----------------------------------------------------------------------------
// Header parsing
// -----------------------------------------------------------------------------

// Order matters — `pickStatus` substring-matches in declared order, first
// hit wins. RESOLVED comes first so a resolution note that mentions a prior
// BLOCKED dimension (e.g. "B-05 still BLOCKED separately") still parses as
// RESOLVED rather than BLOCKED. Within the unresolved tier, the more
// specific values come before the more generic.
const STATUS_VALUES: readonly IssueStatus[] = [
  'RESOLVED',
  'KNOWN-PRODUCT-CALL-CONFIRMED',
  'LOW-SIGNAL',
  'DUPLICATE',
  'BLOCKED',
  'OPEN',
]

const SEED_KIND_VALUES: readonly SeedKind[] = [
  'scripted-scenario',
  'free-play',
  'vibe-check',
  'ui-spec-divergence',
  'role-drift',
  'with-divergence-fire',
  'coverage-divergence',
]

function pickStatus(s: string): IssueStatus | null {
  for (const v of STATUS_VALUES) if (s.includes(v)) return v
  return null
}

function pickSeedKind(s: string): SeedKind | null {
  for (const v of SEED_KIND_VALUES) {
    const re = new RegExp(`(?:^|\\W)${v.replace(/-/g, '\\-')}(?:\\W|$)`)
    if (re.test(s)) return v
  }
  return null
}

function pickSeverity(s: string): IssueSeverity | null {
  const m = /\bP[012]\b/.exec(s)
  if (!m) return null
  return m[0] as IssueSeverity
}

function splitList(value: string): string[] {
  return value
    .split(/[,;]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && p !== '(none)' && p !== 'n/a')
}

const HEADER_RE = /^\*\*([A-Za-z][A-Za-z \-/()]*?)(?: \(.*?\))?:\*\*\s*(.*)$/
const TITLE_RE = /^#\s+([A-Za-z0-9-]+)\s*(?:—\s*(.*))?$/

export function parseIssueFile(file: string, content: string): ParsedIssue {
  const lines = content.split(/\r?\n/)
  const warnings: string[] = []
  let seedId = ''
  let title = ''
  let severity: IssueSeverity | null = null
  let status: IssueStatus | null = null
  let kind: SeedKind | null = null
  let sourceSeats: string[] = []
  let linkedScenarios: string[] = []
  let viewerRole: string | undefined
  let candidateDuplicate: string | undefined
  let failedTier: string | undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (!seedId) {
      const t = TITLE_RE.exec(line)
      if (t) {
        seedId = t[1]!
        title = (t[2] ?? '').trim()
        continue
      }
    }
    const m = HEADER_RE.exec(line)
    if (!m) continue
    const fieldRaw = m[1]!.trim()
    const value = m[2]!.trim()
    const field = fieldRaw.toLowerCase()

    if (field.startsWith('severity')) {
      severity = pickSeverity(value)
      if (!severity) warnings.push(`severity unrecognized: "${value}"`)
    } else if (field === 'status') {
      status = pickStatus(value)
      if (!status) warnings.push(`status unrecognized: "${value}"`)
    } else if (field === 'seed kind') {
      kind = pickSeedKind(value)
      if (!kind) warnings.push(`seed kind unrecognized: "${value}"`)
    } else if (field === 'source seats') {
      sourceSeats = splitList(value)
    } else if (field === 'linked scenarios') {
      linkedScenarios = splitList(value)
    } else if (field.startsWith('viewer role')) {
      const v = value.trim()
      if (v && v !== 'n/a' && v !== '(n/a)') viewerRole = v
    } else if (field === 'candidate duplicate') {
      const v = value.trim()
      if (v && v !== 'n/a' && v !== '(n/a)') candidateDuplicate = v
    } else if (field === 'failed tier') {
      failedTier = value.trim() || undefined
    }
  }

  // Ruling A indicator: scan diagnosis prose for the literal phrase.
  const cannotDetermine = /cannot determine from scrubbed data/i.test(content)

  if (!seedId) warnings.push('missing # NNN-<slug> title line')
  if (!status) warnings.push('missing or unrecognized Status header')
  if (!kind) warnings.push('missing or unrecognized Seed kind header')

  return {
    file,
    seedId: seedId || file.replace(/\.md$/, ''),
    title,
    severity,
    status,
    kind,
    sourceSeats,
    linkedScenarios,
    ...(viewerRole !== undefined ? { viewerRole } : {}),
    ...(candidateDuplicate !== undefined ? { candidateDuplicate } : {}),
    cannotDetermine,
    ...(failedTier !== undefined ? { failedTier } : {}),
    parseWarnings: warnings,
  }
}

// -----------------------------------------------------------------------------
// Counts
// -----------------------------------------------------------------------------

function buildCounts(issues: readonly ParsedIssue[]): IndexCounts {
  const byStatus: Record<IssueStatus, number> = {
    OPEN: 0,
    BLOCKED: 0,
    DUPLICATE: 0,
    'KNOWN-PRODUCT-CALL-CONFIRMED': 0,
    'LOW-SIGNAL': 0,
    RESOLVED: 0,
  }
  const bySeverity: Record<IssueSeverity, number> = { P0: 0, P1: 0, P2: 0 }
  const bySeedKind: Record<SeedKind, number> = {
    'scripted-scenario': 0,
    'free-play': 0,
    'vibe-check': 0,
    'ui-spec-divergence': 0,
    'role-drift': 0,
    'with-divergence-fire': 0,
    'coverage-divergence': 0,
  }
  for (const i of issues) {
    if (i.status) byStatus[i.status]++
    if (i.severity) bySeverity[i.severity]++
    if (i.kind) bySeedKind[i.kind]++
  }
  return {
    total: issues.length,
    byStatus,
    bySeverity,
    bySeedKind,
    lowSignal: byStatus['LOW-SIGNAL'],
  }
}

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------

function renderTableRow(cells: readonly string[]): string {
  return `| ${cells.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`
}

function renderEmptySection(): string {
  return '_No findings of this kind this session._'
}

function renderSection(
  title: string,
  description: string | null,
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const out: string[] = []
  out.push(`## ${title}`)
  if (description) out.push('', description)
  out.push('')
  if (rows.length === 0) {
    out.push(renderEmptySection())
    return out.join('\n')
  }
  out.push(renderTableRow(headers))
  out.push(`| ${headers.map(() => '---').join(' | ')} |`)
  for (const r of rows) out.push(renderTableRow(r))
  return out.join('\n')
}

function basicRow(i: ParsedIssue): string[] {
  return [
    `[${i.seedId}](${i.file})`,
    i.title || '(untitled)',
    i.severity ?? '?',
    i.status ?? '?',
    i.linkedScenarios.length > 0 ? i.linkedScenarios.join(', ') : '—',
    i.candidateDuplicate ?? '—',
  ]
}

const BASIC_HEADERS = ['ID', 'Title', 'Severity', 'Status', 'Linked', 'Candidate dup']

function renderSummary(counts: IndexCounts): string {
  const out: string[] = []
  out.push('## Summary')
  out.push('')
  out.push(`- **Total issues:** ${counts.total}`)
  out.push(
    `- **Status:** OPEN ${counts.byStatus.OPEN} · RESOLVED ${counts.byStatus.RESOLVED} · BLOCKED ${counts.byStatus.BLOCKED} · DUPLICATE ${counts.byStatus.DUPLICATE} · KNOWN-PRODUCT-CALL ${counts.byStatus['KNOWN-PRODUCT-CALL-CONFIRMED']} · LOW-SIGNAL ${counts.byStatus['LOW-SIGNAL']}`,
  )
  out.push(
    `- **Severity:** P0 ${counts.bySeverity.P0} · P1 ${counts.bySeverity.P1} · P2 ${counts.bySeverity.P2}`,
  )
  out.push('- **By seed kind:**')
  out.push(`  - scripted-scenario: ${counts.bySeedKind['scripted-scenario']}`)
  out.push(`  - free-play: ${counts.bySeedKind['free-play']}`)
  out.push(`  - vibe-check: ${counts.bySeedKind['vibe-check']}`)
  out.push(`  - ui-spec-divergence: ${counts.bySeedKind['ui-spec-divergence']}`)
  out.push(`  - role-drift: ${counts.bySeedKind['role-drift']}`)
  out.push(`  - with-divergence-fire: ${counts.bySeedKind['with-divergence-fire']}`)
  out.push(`  - coverage-divergence: ${counts.bySeedKind['coverage-divergence']}`)
  return out.join('\n')
}

export function renderIndexMarkdown(
  issues: readonly ParsedIssue[],
  counts: IndexCounts,
): string {
  const sections: string[] = []
  sections.push(`# Triage issue index`)
  sections.push('')
  sections.push(renderSummary(counts))

  const byKind: Record<SeedKind, ParsedIssue[]> = {
    'scripted-scenario': [],
    'free-play': [],
    'vibe-check': [],
    'ui-spec-divergence': [],
    'role-drift': [],
    'with-divergence-fire': [],
    'coverage-divergence': [],
  }
  const knownProductCallConfirmed: ParsedIssue[] = []
  const warnings: ParsedIssue[] = []
  for (const i of issues) {
    if (i.parseWarnings.length > 0) warnings.push(i)
    if (i.status === 'KNOWN-PRODUCT-CALL-CONFIRMED') {
      knownProductCallConfirmed.push(i)
      continue
    }
    if (i.kind) byKind[i.kind].push(i)
  }

  sections.push(
    renderSection(
      'Scripted-scenario findings',
      null,
      BASIC_HEADERS,
      byKind['scripted-scenario'].map(basicRow),
    ),
  )

  sections.push(
    renderSection(
      'Free-play findings',
      'Loose clustering — no fixed scenario IDs (D12 / R9). Phase 6 calibration tunes the 60s window if false positives appear.',
      BASIC_HEADERS,
      byKind['free-play'].map(basicRow),
    ),
  )

  sections.push(
    renderSection(
      'Vibe-check findings',
      'Spec-level findings against `docs/PRODUCT-SPECIFICATION.md` §2 (Quality Bar) + §3 (Archer visual vocabulary). Not engine bugs (D11 / R8).',
      BASIC_HEADERS,
      byKind['vibe-check'].map(basicRow),
    ),
  )

  sections.push(
    renderSection(
      'UI-spec-divergence findings',
      'Phone view contradicts Column 2 prose for the seat\'s role (D13 / R10). The "Ruling A" column flags issues where Column 1 was redacted by the scrubber and triage emitted "cannot determine from scrubbed data" — Phase 6 sidecar work decides whether to restore automated Column-1 inference.',
      [...BASIC_HEADERS, 'Viewer role', 'Ruling A'],
      byKind['ui-spec-divergence'].map((i) => [
        ...basicRow(i),
        i.viewerRole ?? '—',
        i.cannotDetermine ? 'cannot determine' : '—',
      ]),
    ),
  )

  sections.push(
    renderSection(
      'Role-drift findings — low-signal',
      '⚠️ **Low-signal — may reflect server viewer-gating rather than UI bugs; Phase 6 calibrates.** Default status is `LOW-SIGNAL` unless cross-corroborated by a same-window suspicion or vibe-check (D15 / Ruling B).',
      BASIC_HEADERS,
      byKind['role-drift'].map(basicRow),
    ),
  )

  sections.push(
    renderSection(
      'With-divergence fires',
      'Scenario fired but a tier-2 / tier-3 oracle caught a divergence (D17). Counted as fired toward the >=50 coverage threshold; the divergence is still a bug.',
      [...BASIC_HEADERS, 'Failed tier'],
      byKind['with-divergence-fire'].map((i) => [
        ...basicRow(i),
        i.failedTier ?? '—',
      ]),
    ),
  )

  sections.push(
    renderSection(
      'Coverage divergences',
      'Self-vs-detector mismatches from `coverage.md` (Phase 3 Unit 10). `column-1-vs-2` divergences appear in the UI-spec-divergence section above instead.',
      BASIC_HEADERS,
      byKind['coverage-divergence'].map(basicRow),
    ),
  )

  sections.push(
    renderSection(
      'Known-product-calls confirmed',
      'Harness re-discovered scenarios already tagged as known product calls in the scenario catalog (phase-1 D4) — links back to the catalog entry + the cited E2E-ISSUE-LIST ID for human context (R11 / D5 / Ruling C).',
      BASIC_HEADERS,
      knownProductCallConfirmed.map(basicRow),
    ),
  )

  if (warnings.length > 0) {
    const warnRows = warnings.map((i) => [
      `[${i.seedId}](${i.file})`,
      i.title || '(untitled)',
      i.parseWarnings.join('; '),
    ])
    sections.push(
      renderSection(
        'Header parse warnings',
        'These issue files were not parseable into a clean header set. They appear here AND in their best-guess section above; review and fix the issue file or the triage prompt.',
        ['ID', 'Title', 'Warnings'],
        warnRows,
      ),
    )
  }

  return sections.join('\n\n') + '\n'
}

// -----------------------------------------------------------------------------
// Public entry — walk + render + write
// -----------------------------------------------------------------------------

export interface BuildIssueIndexInput {
  /** Absolute or repo-relative path to `runs/<id>/issues/`. */
  readonly issuesDir: string
}

export async function buildIssueIndex(
  input: BuildIssueIndexInput,
): Promise<BuildIssueIndexResult> {
  const issues = await readIssues(input.issuesDir)
  const counts = buildCounts(issues)
  const indexPath = path.join(input.issuesDir, 'INDEX.md')
  const md = renderIndexMarkdown(issues, counts)
  await writeFile(indexPath, md, 'utf8')
  return { indexPath, issues, counts }
}

async function readIssues(dir: string): Promise<ParsedIssue[]> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }
  const issueFiles = entries
    .filter((e) => /^\d{3}-.*\.md$/.test(e))
    .sort()
  const out: ParsedIssue[] = []
  for (const file of issueFiles) {
    const content = await readFile(path.join(dir, file), 'utf8')
    out.push(parseIssueFile(file, content))
  }
  return out
}
