/**
 * Contract tests for `.claude/agents/playtest-seat-{1..10}.md` and
 * `playtest-triage.md` tool whitelists.
 *
 * Replaces the manual "deferred contract test" referenced in
 * `phase4-smoke.ts` and `phase5-smoke.ts`. The boundary it verifies is
 * structural — Claude Code consults each agent's frontmatter `tools:`
 * line at the tool-surface gate and refuses any unlisted tool BEFORE the
 * call reaches the MCP server. A static assertion over the whitelist is
 * therefore equivalent to spawning a real subagent with a malicious prompt
 * and watching it refuse, but runs in CI on every commit.
 *
 * Insight 020 + Phase 4 D2/C1: the whitelist is the primary enforcement.
 * If a forbidden tool slips into a seat agent's frontmatter, this test
 * fails before that seat ever ships in a calibration run.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '..', '..', '..')
const AGENTS_DIR = path.join(REPO_ROOT, '.claude', 'agents')

function parseToolsFrontmatter(filePath: string): readonly string[] {
  const raw = readFileSync(filePath, 'utf8')
  // Frontmatter: starts with `---` line, ends with second `---` line.
  // Find the `tools:` line and split on commas. Whitespace-tolerant.
  const lines = raw.split(/\r?\n/)
  if (lines[0] !== '---') {
    throw new Error(`${filePath}: missing leading frontmatter delimiter`)
  }
  let toolsLine: string | undefined
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!
    if (line === '---') break
    if (line.startsWith('tools:')) {
      toolsLine = line.slice('tools:'.length).trim()
    }
  }
  if (toolsLine === undefined) {
    throw new Error(`${filePath}: no tools: field in frontmatter`)
  }
  return toolsLine.split(',').map(s => s.trim()).filter(s => s.length > 0)
}

// Tools that MUST NOT appear in any playtest-seat-N whitelist. They either
// allow arbitrary JS evaluation against the page (browser_evaluate /
// browser_run_code), expose DOM internals beyond the seat's surface
// (browser_console_messages, browser_network_request[s]), or break per-seat
// isolation (browser_tabs is a peek vector across tabs in the same context).
const FORBIDDEN_SEAT_TOOL_SUFFIXES = [
  'browser_evaluate',
  'browser_run_code',
  'browser_run_code_unsafe',
  'browser_console_messages',
  'browser_network_requests',
  'browser_network_request',
  'browser_tabs',
] as const

// The exact 11 MCP tools every seat must whitelist + the Write tool.
const EXPECTED_SEAT_TOOL_SUFFIXES = [
  'browser_navigate',
  'browser_snapshot',
  'browser_click',
  'browser_fill_form',
  'browser_type',
  'browser_press_key',
  'browser_wait_for',
  'browser_take_screenshot',
  'browser_hover',
  'browser_select_option',
  'browser_close',
] as const

describe('playtest-seat agent tool whitelists', () => {
  for (let n = 1; n <= 10; n++) {
    describe(`playtest-seat-${n}`, () => {
      const filePath = path.join(AGENTS_DIR, `playtest-seat-${n}.md`)
      const tools = parseToolsFrontmatter(filePath)
      const ns = `playwright-seat-${n}`
      const expectedTools = new Set([
        ...EXPECTED_SEAT_TOOL_SUFFIXES.map(t => `mcp__${ns}__${t}`),
        'Write',
      ])

      it('whitelists exactly the 11 expected MCP tools + Write', () => {
        expect(new Set(tools)).toEqual(expectedTools)
      })

      it('does not whitelist any forbidden tool', () => {
        const forbidden = tools.filter(t =>
          FORBIDDEN_SEAT_TOOL_SUFFIXES.some(suffix => t.endsWith(`__${suffix}`)),
        )
        expect(forbidden).toEqual([])
      })

      it('does not whitelist any cross-seat MCP namespace', () => {
        const crossSeat = tools.filter(t => {
          const match = /^mcp__playwright-seat-(\d+)__/.exec(t)
          return match !== null && match[1] !== String(n)
        })
        expect(crossSeat).toEqual([])
      })
    })
  }
})

describe('playtest-triage agent tool whitelist', () => {
  const filePath = path.join(AGENTS_DIR, 'playtest-triage.md')
  const tools = parseToolsFrontmatter(filePath)
  const expected = new Set([
    'Read',
    'Write',
    'Grep',
    'Glob',
    'mcp__sequential-thinking__sequentialthinking',
  ])

  it('whitelists exactly Read / Write / Grep / Glob / sequential-thinking', () => {
    expect(new Set(tools)).toEqual(expected)
  })

  it('does not whitelist any MCP playwright tool', () => {
    const playwrightTools = tools.filter(t => t.startsWith('mcp__playwright'))
    expect(playwrightTools).toEqual([])
  })

  it('does not whitelist Bash or other write-side tools', () => {
    const writeSide = tools.filter(t => ['Bash', 'Edit', 'NotebookEdit'].includes(t))
    expect(writeSide).toEqual([])
  })
})
