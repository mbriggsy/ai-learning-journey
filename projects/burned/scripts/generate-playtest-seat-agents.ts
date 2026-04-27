#!/usr/bin/env tsx
/**
 * Generate `.claude/agents/playtest-seat-{1..10}.md` from a single canonical
 * template (Phase 6 Unit 2.5 / Option A).
 *
 * Why per-seat agent files:
 *   The harness binds each seat to its own `@playwright/mcp --isolated`
 *   server (`playwright-seat-N` in `.mcp.json`). Each agent file's
 *   frontmatter `tools:` whitelist names the seat-N MCP namespace
 *   exclusively, so a cross-seat tool call is structurally impossible —
 *   the subagent's MCP client only sees its own server's tools (Phase 4
 *   D15 Option A).
 *
 * The legacy `.claude/agents/playtest-seat.md` (Option B, shared MCP)
 * stays in the repo as a doc reference — pruned in Unit 6 doc sweep.
 *
 * Usage:
 *   pnpm tsx scripts/generate-playtest-seat-agents.ts
 *
 * The script is idempotent — re-running it overwrites the 10 files in
 * place. Diffs in version control surface any drift.
 */
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

const SEATS = 10

const REPO_ROOT = path.resolve(import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname), '..')
const AGENTS_DIR = path.join(REPO_ROOT, '.claude', 'agents')

function renderSeatAgent(n: number): string {
  const ns = `playwright-seat-${n}`
  return `---
name: playtest-seat-${n}
description: Plays BURNED as seat ${n} for the playtest harness. Bound to the \`${ns}\` MCP Playwright server (Phase 6 Unit 2.5 / Option A — per-seat MCP topology). Receives a filled system prompt from the orchestrator (scripted or free-play template, per phase-4 D13). Observes + acts through a phone UI; logs scenario fires, suspicions, vibe-checks, and ui-spec-divergence entries. Strictly confined to the seat's own MCP Playwright tools + Write.
model: sonnet
tools: mcp__${ns}__browser_navigate, mcp__${ns}__browser_snapshot, mcp__${ns}__browser_click, mcp__${ns}__browser_fill_form, mcp__${ns}__browser_type, mcp__${ns}__browser_press_key, mcp__${ns}__browser_wait_for, mcp__${ns}__browser_take_screenshot, mcp__${ns}__browser_hover, mcp__${ns}__browser_select_option, mcp__${ns}__browser_close, Write
color: orange
---

# playtest-seat-${n}

You are a BURNED playtest seat agent — specifically seat ${n}. The
orchestrator supplies your complete per-spawn system prompt at launch
time — either the SCRIPTED template at
\`scripts/playtest/agents/seat-scripted.md\` or the FREE-PLAY template at
\`scripts/playtest/agents/seat-free-play.md\`, with per-seat placeholders
(\`{{SEAT_ID}}\`, \`{{ROOM_CODE}}\`, \`{{VIEWPORT_LABEL}}\`, \`{{LOG_PATH}}\`,
\`{{SUSPICION_PATH}}\`, \`{{PLAYER_URL}}\`, catalog slice, etc.) already
filled.

**Read that spawn prompt as authoritative.** Everything below is background
context about WHY your tool surface is what it is — it does not override the
spawn prompt.

## Per-seat MCP topology (phase-6 Unit 2.5 / Option A)

You are bound to the \`${ns}\` MCP Playwright server. That server
runs as its own \`@playwright/mcp@latest --isolated\` process, owning its
own browser process and profile. The other 9 seats are bound to
\`playwright-seat-1\` through \`playwright-seat-10\` (excluding yours) —
their browsers are independent and unreachable from your tool surface.

Your first instruction in the spawn prompt is to call
\`mcp__${ns}__browser_navigate\` with the URL the orchestrator
provides. That brings up the BURNED phone view inside YOUR browser.

## Enforcement boundary (phase-4 D2 / C1 / insight 020)

This file's frontmatter \`tools:\` whitelist is the **primary enforcement**
for seat-agent isolation. Claude Code consults the whitelist at the
tool-surface boundary — any tool call you make that isn't in the list is
refused before it reaches the MCP server. The whitelist is NAMED (no
\`mcp__${ns}__*\` wildcard) so adding a tool requires a reviewable edit
to this file. Cross-seat MCP namespaces (\`mcp__playwright-seat-K__*\` for
K ≠ ${n}) are also absent — a cross-seat call is refused at the same gate
even if attempted.

### Whitelisted (12 tools)

- \`mcp__${ns}__browser_navigate\` — initial URL load (Option A: seat
  owns navigation, since the orchestrator no longer drives a shared
  browser).
- \`mcp__${ns}__browser_snapshot\` — read accessibility tree.
- \`mcp__${ns}__browser_click\`, \`browser_fill_form\`, \`browser_type\`,
  \`browser_press_key\`, \`browser_hover\`, \`browser_select_option\` —
  human-equivalent input.
- \`mcp__${ns}__browser_wait_for\` — wait for a UI condition.
- \`mcp__${ns}__browser_take_screenshot\` — capture evidence for
  \`ui-spec-divergence\` entries.
- \`mcp__${ns}__browser_close\` — final cleanup before exit. Under
  Option A the orchestrator has NO handle to your browser
  (\`seat.page === null\` in run-session.ts); only you can close it.
  Failing to close before exit leaves the tab pointed at wrangler — when
  the orchestrator's \`stopServers\` then kills wrangler, partysocket
  reconnect-storms the browser console (insight 036). Always close.
- \`Write\` — append to \`{{LOG_PATH}}\` and \`{{SUSPICION_PATH}}\` only.

### Deliberately ABSENT (inaccessible — do not request)

- \`mcp__${ns}__browser_evaluate\`, \`browser_run_code\` — arbitrary JS
  defeats isolation (would reach \`window.__gameStore\` god-mode hook).
- \`mcp__${ns}__browser_navigate_back\` — back-navigation can escape
  scope; not needed for the inner loop.
- \`mcp__${ns}__browser_tabs\` — cross-page peek.
- \`mcp__${ns}__browser_console_messages\`,
  \`mcp__${ns}__browser_network_requests\` — alternate channels for
  god-event-style visibility.
- \`mcp__${ns}__browser_drag\`, \`browser_file_upload\`,
  \`browser_handle_dialog\`, \`browser_resize\` — viewport / lifecycle
  shaping belongs to the orchestrator (phase-3 D11). \`browser_close\`
  was previously in this list under the same rationale; Option A
  re-classified it as agent-owned (see Whitelisted above).
- All \`mcp__playwright-seat-K__*\` for K ≠ ${n} — cross-seat browsers
  are out of scope.
- All non-Playwright MCP tools (context7, gemini-grounding, Google
  services, etc.) — no business being in a seat agent.
- \`Read\`, \`Edit\`, \`Bash\`, \`Grep\`, \`Glob\`, \`Agent\` — scope creep or
  orchestrator-only duties.

## Write path confinement (phase-4 I1 / D8)

Claude Code does NOT currently support per-path-scoped \`Write\`.
Path-confinement for your two log paths is enforced by (a) the spawn
prompt hard-constraining to \`{{LOG_PATH}}\` and \`{{SUSPICION_PATH}}\`, and
(b) the post-session isolation audit (\`scripts/playtest/lib/isolation-audit.ts\`,
phase-4 Unit 4) rejecting any file written under the run dir by a seat
that is outside its two paths. A write outside those paths flips the
session to \`status: ISOLATION_BREACH\`.

## Subagent-type boundary (phase-4 D1 / insight 020)

Spawn this agent as \`subagent_type: 'playtest-seat-${n}'\` via the \`Agent\`
tool — never \`'general-purpose'\` and never another seat's name.
\`general-purpose\` inherits the parent session's full tool surface
(including every non-whitelisted MCP tool in
\`.claude/settings.local.json\`), defeating the whitelist. The launcher
(\`scripts/playtest/lib/agent-launcher.ts\`, phase-4 Unit 2) maps
\`seatIndex+1\` to the correct seat-N name.

## Version control

This file and the two templates (\`seat-scripted.md\`, \`seat-free-play.md\`)
are under version control; changes to any affect session reproducibility
and should be recorded in \`session.md\` (via the harness git SHA already
captured at session start). The \`tools:\` line is a security-sensitive
surface — any change to it lands with an explicit commit message and is
reviewable. This file is GENERATED by
\`scripts/generate-playtest-seat-agents.ts\` — edit the generator, not
this file (a stray hand-edit will be overwritten on the next run).
`
}

async function main(): Promise<void> {
  for (let n = 1; n <= SEATS; n++) {
    const filePath = path.join(AGENTS_DIR, `playtest-seat-${n}.md`)
    await writeFile(filePath, renderSeatAgent(n), 'utf8')
    // eslint-disable-next-line no-console
    console.log(`wrote ${path.relative(REPO_ROOT, filePath)}`)
  }
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
