/**
 * Seat-agent log / suspicion file parser (phase-4 Unit 3).
 *
 * Walks a markdown file, extracts every fenced YAML block, validates each
 * against the four-entryType discriminated union in `./log-schema`.
 *
 * Return shape — three parallel arrays consumed by downstream units:
 *
 *   - `entries`  — validated LogEntry values (coerced legacy entryTypes
 *                  land here with the current name).
 *   - `errors`   — parse / validation failures. Not fatal; the caller
 *                  continues with the partial entry set.
 *   - `warnings` — non-fatal transitions (e.g. legacy
 *                  `info-gap-divergence` → `ui-spec-divergence` per C4).
 *
 * QUARANTINE (insight 022): no imports from `src/server` or `src/shared`.
 * Uses `eemeli/yaml` (added devDep 2026-04-24) and local types only.
 */
import { readFile } from 'node:fs/promises'

import { parse as parseYaml } from 'yaml'

import {
  KNOWN_ENTRY_TYPES,
  LEGACY_ENTRY_TYPE_RENAMES,
  LogEntrySchema,
  type LogEntry,
} from './log-schema'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ParseError {
  readonly blockIndex: number
  readonly message: string
  readonly rawBlock: string
}

export interface ParseWarning {
  readonly blockIndex: number
  readonly message: string
  readonly rawBlock: string
}

export interface ParseResult {
  readonly entries: LogEntry[]
  readonly errors: ParseError[]
  readonly warnings: ParseWarning[]
}

export interface ParseOptions {
  /**
   * If provided, every `scenario-fire` entry's `scenarioId` is cross-checked
   * against this set after schema validation passes. Mismatches become parse
   * errors — the entry is dropped and the bad ID is listed alongside the
   * accepted catalog IDs in the error message.
   *
   * Closes triage seeds #001/#002/#003/#011/#018: seat agents invented
   * lifecycle scenarioIds (`SESSION-START`, `GAME-START-OBSERVATION`,
   * `TURN-TRANSITION-SEAT1-TO-SEAT2`, `INTERCEPT-WINDOW-OBSERVED-SEAT1-TURN`)
   * not present in `SCENARIOS.md`. Without this gate the clusterer routed
   * each invented ID as a `scripted-scenario` seed and consumed a triage
   * agent spawn per bogus entry. Pass-through callers (smoke tests,
   * isolation audit) can omit this option to keep purely-structural
   * parsing behavior; triage-pipeline / orchestrator / verify-calibration
   * opt in at their entry points.
   */
  readonly validScenarioIds?: ReadonlySet<string>
}

// -----------------------------------------------------------------------------
// Fence extraction
// -----------------------------------------------------------------------------

/**
 * Fenced-block shape emitted by seat agents:
 *
 *     ```yaml
 *     entryType: ...
 *     ...
 *     ```
 *
 * Some agents may omit the `yaml` tag; the parser accepts any fence
 * whose contents are valid YAML AND whose top-level has an `entryType`
 * field. Fences without `entryType` are skipped silently (prose
 * code blocks the author embedded for context, not log entries).
 */
const FENCE_OPEN_RE = /^```(?:yaml|YAML)?\s*$/
const FENCE_CLOSE_RE = /^```\s*$/

function extractFencedBlocks(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/)
  const blocks: string[] = []
  let i = 0
  while (i < lines.length) {
    if (FENCE_OPEN_RE.test(lines[i] ?? '')) {
      const start = i + 1
      let end = -1
      for (let j = start; j < lines.length; j++) {
        if (FENCE_CLOSE_RE.test(lines[j] ?? '')) {
          end = j
          break
        }
      }
      if (end < 0) {
        // Unclosed fence — consume the rest of the file as a single block
        // so downstream validation can emit a helpful error.
        blocks.push(lines.slice(start).join('\n'))
        break
      }
      blocks.push(lines.slice(start, end).join('\n'))
      i = end + 1
    } else {
      i++
    }
  }
  return blocks
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function parseSeatLogString(markdown: string, options: ParseOptions = {}): ParseResult {
  const entries: LogEntry[] = []
  const errors: ParseError[] = []
  const warnings: ParseWarning[] = []

  const blocks = extractFencedBlocks(markdown)

  blocks.forEach((rawBlock, blockIndex) => {
    // Step 1: YAML-parse. A block that fails this step is either not
    // YAML (e.g. JSON pasted into a ```yaml fence) or genuinely
    // malformed. Either way → parse error with the YAML library's
    // message so the agent can self-correct next time.
    let doc: unknown
    try {
      doc = parseYaml(rawBlock)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push({
        blockIndex,
        message: `YAML parse failed: ${message}`,
        rawBlock,
      })
      return
    }

    if (!isPlainObject(doc)) {
      // `yaml.parse('')` returns null and `yaml.parse('- x')` returns
      // an array — neither carries an entryType; both are treated as
      // non-entry blocks the seat author may have embedded for prose.
      return
    }

    // Step 2: require entryType. Missing → error.
    if (!('entryType' in doc) || typeof doc.entryType !== 'string') {
      errors.push({
        blockIndex,
        message: 'Missing or non-string `entryType`',
        rawBlock,
      })
      return
    }

    // Step 3: legacy-rename coercion (C4). Emit warning, carry entry
    // forward with the current entryType name.
    const raw = doc.entryType
    let toValidate: Record<string, unknown> = { ...doc }
    if (raw in LEGACY_ENTRY_TYPE_RENAMES) {
      const current = LEGACY_ENTRY_TYPE_RENAMES[raw]!
      toValidate = { ...doc, entryType: current }
      warnings.push({
        blockIndex,
        message: `Legacy entryType \`${raw}\` coerced to \`${current}\` (phase-4 C4 rename). Remove after Phase 6 locks.`,
        rawBlock,
      })
    } else if (!(KNOWN_ENTRY_TYPES as readonly string[]).includes(raw)) {
      errors.push({
        blockIndex,
        message: `Unknown entryType \`${raw}\`. Expected one of: ${KNOWN_ENTRY_TYPES.join(', ')}.`,
        rawBlock,
      })
      return
    }

    // Step 4: discriminated-union validation.
    const result = LogEntrySchema.safeParse(toValidate)
    if (!result.success) {
      const issues = result.error.issues
        .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('; ')
      errors.push({
        blockIndex,
        message: `Schema validation failed: ${issues}`,
        rawBlock,
      })
      return
    }

    // Step 5: catalog cross-reference for scenario-fire entries (optional).
    // Drops the entry and surfaces a per-block error listing the bad ID
    // and the accepted catalog set. Triage seeds #001/#002/#003/#011/#018
    // — without this gate the clusterer routes invented IDs as
    // scripted-scenario seeds.
    if (
      options.validScenarioIds !== undefined &&
      result.data.entryType === 'scenario-fire' &&
      !options.validScenarioIds.has(result.data.scenarioId)
    ) {
      const accepted = [...options.validScenarioIds].sort().join(', ') || '(empty catalog)'
      errors.push({
        blockIndex,
        message: `Unknown scenarioId \`${result.data.scenarioId}\` for scenario-fire entry. Accepted catalog IDs: ${accepted}.`,
        rawBlock,
      })
      return
    }

    entries.push(result.data)
  })

  return { entries, errors, warnings }
}

export async function parseSeatLog(path: string, options: ParseOptions = {}): Promise<ParseResult> {
  const markdown = await readFile(path, 'utf8')
  return parseSeatLogString(markdown, options)
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
