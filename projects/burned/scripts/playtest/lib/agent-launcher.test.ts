/**
 * Unit 2 tests — agent-launcher renderer + spec assembly.
 *
 * Maps 1:1 to the plan's Test Scenarios list. Covers:
 *   - 3 seats × scripted catalog → prompts resolved with all placeholders
 *   - Role pre-filter: full detail for ACTOR/TARGET, pointer for others,
 *     skip when both info-gap columns N/A for this role
 *   - Free-play mode → catalog replaced, vibe-check mandatory, directive
 *   - Mode switch respawn path
 *   - subagentType is `'playtest-seat'` on every spec; never
 *     `'general-purpose'`
 *   - Row-label character-for-character regression
 *   - `info-gap-divergence` must not appear in rendered prompts (C4 rename)
 *   - Missing required seat field (roomCode) throws
 */
import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import {
  buildLaunchSpecs,
  buildSeatPrompt,
  emitLaunchSpecs,
  inferInitialRole,
  loadDefaultTemplates,
  renderFreePlayPointer,
  renderScriptedCatalogForRole,
} from './agent-launcher'
import type { ParsedScenario } from './scenario-detector'
import { ROW_DISPLAY_LABELS, type SeatHandle } from './types'

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '../../..')

function seat(id: string, name: string, overrides: Partial<SeatHandle> = {}): SeatHandle {
  return {
    seatId: id,
    seatName: name,
    roomCode: 'TEST',
    page: null,
    viewport: { width: 390, height: 844, label: '390x844' },
    logPath: `/tmp/run/seats/${id}.log.md`,
    suspicionPath: `/tmp/run/suspicions/${id}.suspicions.md`,
    scenariosPath: 'docs/testing/playtest/SCENARIOS.md',
    ...overrides,
  }
}

function presence(c1: boolean, c2: boolean, c1Prose?: string, c2Prose?: string) {
  return {
    column1Present: c1,
    column2Present: c2,
    ...(c1Prose ? { column1Prose: c1Prose } : {}),
    ...(c2Prose ? { column2Prose: c2Prose } : {}),
  }
}

function scenario(overrides: Partial<ParsedScenario> & { id: string }): ParsedScenario {
  const base = {
    description: overrides.description ?? 'title',
    title: overrides.title ?? overrides.description ?? 'title',
    tier: 'other' as const,
    events: [],
    shape: 'strict' as const,
  }
  return { ...base, ...overrides } as ParsedScenario
}

const ACTOR_SCENARIO = scenario({
  id: 'SCN-ACTOR-01',
  title: 'Actor-facing scenario',
  events: [{ type: 'foo', where: { playerId: '$ACTOR' } }],
  shape: 'strict',
  triggerConditions: 'ACTOR plays X.',
  recognitionCriteria: 'You know you hit this when...',
  suspicionPrompts: 'ACTOR: did the banner land?',
  vibeCheck: 'Did this feel like Archer?',
  infoGap: {
    SERVER: presence(true, true, 'server c1', 'server c2'),
    ACTOR: presence(true, true, 'actor c1 prose', 'actor c2 prose'),
    TARGET: presence(false, false),
    OTHER_ALIVE: presence(true, true, 'other c1', 'other c2'),
    SPECTATOR: presence(false, false),
    DISCONNECTED: presence(false, false),
    BOARD: presence(true, true, 'board c1', 'board c2'),
  },
})

const TARGET_SCENARIO = scenario({
  id: 'SCN-TARGET-01',
  title: 'Target-facing scenario',
  events: [
    { type: 'foo', where: { playerId: '$ACTOR' } },
    { type: 'bar', where: { playerId: '$TARGET' } },
  ],
  triggerConditions: 'ACTOR targets TARGET.',
  vibeCheck: 'Did TARGET see it?',
  infoGap: {
    SERVER: presence(true, true, 's1', 's2'),
    ACTOR: presence(true, true, 'a1', 'a2'),
    TARGET: presence(true, true, 'target c1', 'target c2 prose'),
    OTHER_ALIVE: presence(true, true, 'o1', 'o2'),
    SPECTATOR: presence(false, false),
    DISCONNECTED: presence(false, false),
    BOARD: presence(true, true, 'b1', 'b2'),
  },
})

const N_A_FOR_SPECTATOR_SCENARIO = scenario({
  id: 'SCN-NO-SPEC-01',
  title: 'Scenario with SPECTATOR N/A',
  events: [{ type: 'foo', where: { playerId: '$ACTOR' } }],
  infoGap: {
    SERVER: presence(true, true, 's1', 's2'),
    ACTOR: presence(true, true, 'a1', 'a2'),
    TARGET: presence(false, false),
    OTHER_ALIVE: presence(true, true, 'o1', 'o2'),
    // SPECTATOR both columns false → row absent for this role.
    SPECTATOR: presence(false, false),
    DISCONNECTED: presence(false, false),
    BOARD: presence(true, true, 'b1', 'b2'),
  },
})

// Small synthetic catalog: 1 ACTOR scenario + 1 TARGET scenario +
// 1 N/A-for-SPECTATOR scenario.
const SYNTH_CATALOG = [ACTOR_SCENARIO, TARGET_SCENARIO, N_A_FOR_SPECTATOR_SCENARIO]

// -----------------------------------------------------------------------------
// inferInitialRole
// -----------------------------------------------------------------------------

describe('inferInitialRole', () => {
  it('returns ACTOR for the seat whose index matches turnIndex', () => {
    expect(inferInitialRole(0, 0)).toBe('ACTOR')
    expect(inferInitialRole(2, 2)).toBe('ACTOR')
  })

  it('returns OTHER_ALIVE for every other seat', () => {
    expect(inferInitialRole(1, 0)).toBe('OTHER_ALIVE')
    expect(inferInitialRole(0, 1)).toBe('OTHER_ALIVE')
  })

  it('returns OTHER_ALIVE for pre-game (turnIndex < 0)', () => {
    expect(inferInitialRole(0, -1)).toBe('OTHER_ALIVE')
  })
})

// -----------------------------------------------------------------------------
// renderScriptedCatalogForRole — pre-filter + prose injection
// -----------------------------------------------------------------------------

describe('renderScriptedCatalogForRole', () => {
  it('renders full detail for the ACTOR role on ACTOR-primary scenarios', () => {
    const out = renderScriptedCatalogForRole([ACTOR_SCENARIO], 'ACTOR')
    expect(out).toContain('SCN-ACTOR-01')
    expect(out).toContain('You are ACTOR on this scenario.')
    expect(out).toContain('**Trigger conditions:**')
    expect(out).toContain('ACTOR plays X.')
    expect(out).toContain('**Recognize when:**')
    expect(out).toContain('**Ask yourself:**')
    expect(out).toContain('**What you (ACTOR) SHOULD see (Column 2):**')
    expect(out).toContain('actor c2 prose')
    expect(out).toContain('**Vibe check:**')
    expect(out).toContain('Did this feel like Archer?')
  })

  it('renders a one-line pointer for OTHER_ALIVE when scenario is ACTOR-primary', () => {
    const out = renderScriptedCatalogForRole([ACTOR_SCENARIO], 'OTHER_ALIVE')
    expect(out).toContain('- **SCN-ACTOR-01**')
    expect(out).toContain('OTHER (alive); flag anything strange')
    // Must NOT render full detail.
    expect(out).not.toContain('**Trigger conditions:**')
    expect(out).not.toContain('actor c2 prose')
  })

  it('skips scenarios where the seat role has N/A on both info-gap columns', () => {
    const out = renderScriptedCatalogForRole([N_A_FOR_SPECTATOR_SCENARIO], 'SPECTATOR')
    expect(out).toContain('No scenarios scoped to your role')
  })

  it('Column 1 prose is never leaked into agent prompts', () => {
    const out = renderScriptedCatalogForRole(SYNTH_CATALOG, 'ACTOR')
    expect(out).not.toContain('actor c1')
    expect(out).not.toContain('server c1')
    expect(out).toContain('actor c2 prose')
  })

  it('renders a pointer for TARGET when the scenario is ACTOR-primary only', () => {
    // ACTOR_SCENARIO has no $TARGET binding → TARGET gets pointer, not full.
    // But TARGET has no presence in ACTOR_SCENARIO's info-gap (both N/A),
    // so it should be skipped entirely. Verify by forcing presence:
    const forced = {
      ...ACTOR_SCENARIO,
      infoGap: {
        ...ACTOR_SCENARIO.infoGap!,
        TARGET: presence(true, true, 't1', 't2 observable'),
      },
    }
    const out = renderScriptedCatalogForRole([forced], 'TARGET')
    expect(out).toContain('- **SCN-ACTOR-01**')
    expect(out).toContain('TARGET; flag anything strange')
  })
})

// -----------------------------------------------------------------------------
// renderFreePlayPointer
// -----------------------------------------------------------------------------

describe('renderFreePlayPointer', () => {
  it('emits a short reference to the catalog without enumerating scenarios', () => {
    const out = renderFreePlayPointer(SYNTH_CATALOG)
    expect(out).toContain('full scenario catalog exists')
    expect(out).toContain('intentionally ignores it')
    expect(out).not.toContain('SCN-ACTOR-01')
    expect(out).not.toContain('actor c2 prose')
  })
})

// -----------------------------------------------------------------------------
// buildSeatPrompt — placeholder substitution
// -----------------------------------------------------------------------------

describe('buildSeatPrompt', () => {
  const TEMPLATE = `SEAT={{SEAT_ID}}
NAME={{SEAT_NAME}}
ROOM={{ROOM_CODE}}
VP={{VIEWPORT_LABEL}}/{{VIEWPORT_WIDTH}}x{{VIEWPORT_HEIGHT}}
OTHERS=
{{OTHER_SEATS_JSON}}
CATALOG=
{{CATALOG_TEXT}}
LOG={{LOG_PATH}}
SUS={{SUSPICION_PATH}}
SHOTS={{SCREENSHOTS_DIR}}
TIMEOUT={{SESSION_TIMEOUT_MS}}
`

  it('substitutes every placeholder', () => {
    const out = buildSeatPrompt({
      seat: seat('seat-0', 'Dash'),
      otherSeats: [{ seatId: 'seat-1', seatName: 'Vera' }],
      catalogText: 'CATALOG-BODY',
      sessionTimeoutMs: 180_000,
      template: TEMPLATE,
      playerUrl: 'http://localhost:5173/player.html?room=TEST&name=Dash',
      mcpNamespace: 'playwright-seat-1',
      screenshotsDir: '/tmp/run/screenshots',
    })
    expect(out).toContain('SEAT=seat-0')
    expect(out).toContain('NAME=Dash')
    expect(out).toContain('ROOM=TEST')
    expect(out).toContain('VP=390x844/390x844')
    expect(out).toContain('"seatId": "seat-1"')
    expect(out).toContain('"seatName": "Vera"')
    expect(out).toContain('CATALOG-BODY')
    expect(out).toContain('LOG=/tmp/run/seats/seat-0.log.md')
    expect(out).toContain('SUS=/tmp/run/suspicions/seat-0.suspicions.md')
    expect(out).toContain('SHOTS=/tmp/run/screenshots')
    expect(out).toContain('TIMEOUT=180000')
    // No residual placeholders.
    expect(out).not.toMatch(/\{\{[A-Z_]+\}\}/)
  })

  it('throws when the seat is missing roomCode (phase-3 I2 upstream patch)', () => {
    expect(() =>
      buildSeatPrompt({
        seat: seat('seat-0', 'Dash', { roomCode: '' }),
        otherSeats: [],
        catalogText: '',
        sessionTimeoutMs: 1,
        template: TEMPLATE,
        playerUrl: 'http://localhost:5173/player.html?room=&name=Dash',
        mcpNamespace: 'playwright-seat-1',
        screenshotsDir: '/tmp/run/screenshots',
      }),
    ).toThrow(/roomCode/)
  })

  it('leaves unknown placeholders as-is so drift surfaces loudly', () => {
    const out = buildSeatPrompt({
      seat: seat('seat-0', 'Dash'),
      otherSeats: [],
      catalogText: '',
      sessionTimeoutMs: 1,
      template: 'unknown: {{NOT_A_REAL_PLACEHOLDER}}',
      playerUrl: 'http://localhost:5173/player.html?room=TEST&name=Dash',
      mcpNamespace: 'playwright-seat-1',
      screenshotsDir: '/tmp/run/screenshots',
    })
    expect(out).toContain('{{NOT_A_REAL_PLACEHOLDER}}')
  })

  it('substitutes PLAYER_URL and MCP_NAMESPACE (phase-6 Unit 2.5 / Option A)', () => {
    const tmpl = 'go: {{PLAYER_URL}} ns: {{MCP_NAMESPACE}}'
    const out = buildSeatPrompt({
      seat: seat('seat-0', 'Dash'),
      otherSeats: [],
      catalogText: '',
      sessionTimeoutMs: 1,
      template: tmpl,
      playerUrl: 'http://localhost:5173/player.html?room=TEST&name=Dash',
      mcpNamespace: 'playwright-seat-3',
      screenshotsDir: '/tmp/run/screenshots',
    })
    expect(out).toBe(
      'go: http://localhost:5173/player.html?room=TEST&name=Dash ns: playwright-seat-3',
    )
  })

  it('substitutes SCREENSHOTS_DIR (TODO #18 — explicit path arg for browser_take_screenshot)', () => {
    const tmpl = 'shots-go-here: {{SCREENSHOTS_DIR}}'
    const out = buildSeatPrompt({
      seat: seat('seat-0', 'Dash'),
      otherSeats: [],
      catalogText: '',
      sessionTimeoutMs: 1,
      template: tmpl,
      playerUrl: 'http://localhost:5173/player.html?room=TEST&name=Dash',
      mcpNamespace: 'playwright-seat-1',
      screenshotsDir: '/tmp/runs/2026-04-30-1200-3p/screenshots',
    })
    expect(out).toBe('shots-go-here: /tmp/runs/2026-04-30-1200-3p/screenshots')
  })
})

// -----------------------------------------------------------------------------
// buildLaunchSpecs — end-to-end assembly
// -----------------------------------------------------------------------------

describe('buildLaunchSpecs', () => {
  function templatesForTest() {
    // Use the REAL templates from scripts/playtest/agents/ so the row-label
    // regression + placeholder resolution + C4-rename checks exercise the
    // artifacts shipped in phase-4 Unit 1, not a simplified inline stub.
    const scriptedTemplate = readFileSync(
      path.join(REPO_ROOT, 'scripts/playtest/agents/seat-scripted.md'),
      'utf8',
    )
    const freePlayTemplate = readFileSync(
      path.join(REPO_ROOT, 'scripts/playtest/agents/seat-free-play.md'),
      'utf8',
    )
    return { scriptedTemplate, freePlayTemplate }
  }

  it('produces one spec per seat with all placeholders resolved (scripted)', () => {
    const { scriptedTemplate, freePlayTemplate } = templatesForTest()
    const seats = [seat('seat-0', 'Dash'), seat('seat-1', 'Vera'), seat('seat-2', 'Otto')]
    const specs = buildLaunchSpecs({
      seats,
      catalog: SYNTH_CATALOG,
      modeSignal: 'scripted',
      sessionTimeoutMs: 180_000,
      startingSeatIndex: 0,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })
    expect(specs).toHaveLength(3)
    specs.forEach((spec, i) => {
      expect(spec.prompt).not.toMatch(/\{\{[A-Z_]+\}\}/)
      expect(spec.subagentType).toBe(`playtest-seat-${i + 1}`)
      expect(spec.mcpNamespace).toBe(`playwright-seat-${i + 1}`)
      expect(spec.description).toContain(spec.seatId)
      expect(spec.description).toContain('(scripted)')
      expect(spec.playerUrl).toMatch(/^http:\/\/localhost:5173\/player\.html\?room=TEST&name=/)
    })
    // Starter seat is ACTOR; others are OTHER_ALIVE.
    expect(specs[0]!.role).toBe('ACTOR')
    expect(specs[1]!.role).toBe('OTHER_ALIVE')
    expect(specs[2]!.role).toBe('OTHER_ALIVE')
  })

  it('maps seatIndex 1-indexed → playtest-seat-N + playwright-seat-N (phase-6 Unit 2.5)', () => {
    const { scriptedTemplate, freePlayTemplate } = templatesForTest()
    const seats = Array.from({ length: 10 }, (_, i) => seat(`seat-${i}`, `Player${i}`))
    const specs = buildLaunchSpecs({
      seats,
      catalog: SYNTH_CATALOG,
      modeSignal: 'scripted',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })
    expect(specs).toHaveLength(10)
    specs.forEach((spec, i) => {
      const n = i + 1
      expect(spec.subagentType).toBe(`playtest-seat-${n}`)
      expect(spec.mcpNamespace).toBe(`playwright-seat-${n}`)
      // The rendered prompt MUST reference the seat's namespace (so the
      // tool surface in the system prompt matches the agent file's
      // frontmatter whitelist).
      expect(spec.prompt).toContain(`mcp__playwright-seat-${n}__browser_navigate`)
    })
  })

  it('playerUrl URL-encodes room code + seat name (special chars)', () => {
    const { scriptedTemplate, freePlayTemplate } = templatesForTest()
    const seats = [
      seat('seat-0', 'Dash & Friends', { roomCode: 'A B' }),
      seat('seat-1', 'Cher#1', { roomCode: 'A B' }),
    ]
    const specs = buildLaunchSpecs({
      seats,
      catalog: SYNTH_CATALOG,
      modeSignal: 'scripted',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })
    expect(specs[0]!.playerUrl).toBe(
      'http://localhost:5173/player.html?room=A%20B&name=Dash%20%26%20Friends',
    )
    expect(specs[1]!.playerUrl).toBe(
      'http://localhost:5173/player.html?room=A%20B&name=Cher%231',
    )
  })

  it('viteBaseUrl override is honored + trailing slashes stripped', () => {
    const { scriptedTemplate, freePlayTemplate } = templatesForTest()
    const specs = buildLaunchSpecs({
      seats: [seat('seat-0', 'Dash')],
      catalog: SYNTH_CATALOG,
      modeSignal: 'scripted',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      viteBaseUrl: 'http://staging.example:9090///',
      screenshotsDir: '/tmp/run/screenshots',
    })
    expect(specs[0]!.playerUrl).toBe(
      'http://staging.example:9090/player.html?room=TEST&name=Dash',
    )
  })

  it('never emits subagentType `"general-purpose"` (phase-4 D1 / insight 020)', () => {
    const { scriptedTemplate, freePlayTemplate } = templatesForTest()
    const seats = [seat('seat-0', 'Dash'), seat('seat-1', 'Vera')]
    const scripted = buildLaunchSpecs({
      seats,
      catalog: SYNTH_CATALOG,
      modeSignal: 'scripted',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })
    const freePlay = buildLaunchSpecs({
      seats,
      catalog: SYNTH_CATALOG,
      modeSignal: 'free-play',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })
    for (const s of [...scripted, ...freePlay]) {
      expect(s.subagentType).toMatch(/^playtest-seat-(?:[1-9]|10)$/)
      // Runtime belt-and-suspenders: the TS literal-pattern type is the
      // primary defense, but assert the negative so a refactor that
      // loosens the type surfaces here.
      expect(String(s.subagentType)).not.toBe('general-purpose')
      expect(String(s.subagentType)).not.toBe('playtest-seat')
    }
  })

  it('emits every ROW_DISPLAY_LABELS value in the rendered scripted prompt', () => {
    const { scriptedTemplate, freePlayTemplate } = templatesForTest()
    const specs = buildLaunchSpecs({
      seats: [seat('seat-0', 'Dash')],
      catalog: SYNTH_CATALOG,
      modeSignal: 'scripted',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })
    const prompt = specs[0]!.prompt
    for (const label of Object.values(ROW_DISPLAY_LABELS)) {
      expect(prompt).toContain(label)
    }
  })

  it('never renders `info-gap-divergence` in any prompt (C4 rename regression)', () => {
    const { scriptedTemplate, freePlayTemplate } = templatesForTest()
    const scripted = buildLaunchSpecs({
      seats: [seat('seat-0', 'Dash')],
      catalog: SYNTH_CATALOG,
      modeSignal: 'scripted',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })
    const freePlay = buildLaunchSpecs({
      seats: [seat('seat-0', 'Dash')],
      catalog: SYNTH_CATALOG,
      modeSignal: 'free-play',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })
    for (const s of [...scripted, ...freePlay]) {
      expect(s.prompt).not.toContain('info-gap-divergence')
      expect(s.prompt).toContain('ui-spec-divergence')
    }
  })

  it('free-play mode injects the pointer in place of the catalog and flags vibe-check mandatory', () => {
    const { scriptedTemplate, freePlayTemplate } = templatesForTest()
    const specs = buildLaunchSpecs({
      seats: [seat('seat-0', 'Dash')],
      catalog: SYNTH_CATALOG,
      modeSignal: 'free-play',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })
    const prompt = specs[0]!.prompt
    expect(prompt).toContain('full scenario catalog exists')
    expect(prompt).toContain('FREE-PLAY mode')
    expect(prompt).toContain('MANDATORY')
    expect(prompt).toContain('EXPLORATION DIRECTIVE')
    expect(prompt).not.toContain('**Trigger conditions:**')
  })

  it('mode-switch respawn: same seat, different modeSignal, different catalog injection', () => {
    const { scriptedTemplate, freePlayTemplate } = templatesForTest()
    const s = [seat('seat-0', 'Dash')]
    const base = {
      seats: s,
      catalog: SYNTH_CATALOG,
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    } as const
    const scripted = buildLaunchSpecs({ ...base, modeSignal: 'scripted' })
    const freePlay = buildLaunchSpecs({ ...base, modeSignal: 'free-play' })
    expect(scripted[0]!.mode).toBe('scripted')
    expect(freePlay[0]!.mode).toBe('free-play')
    // Scripted carries the full detail; free-play does not.
    expect(scripted[0]!.prompt).toContain('**Trigger conditions:**')
    expect(freePlay[0]!.prompt).not.toContain('**Trigger conditions:**')
    // Both share the same base template structure (placeholder-free).
    expect(scripted[0]!.prompt).not.toMatch(/\{\{[A-Z_]+\}\}/)
    expect(freePlay[0]!.prompt).not.toMatch(/\{\{[A-Z_]+\}\}/)
  })

  it('empty catalog → scripted prompt still valid with a "no scenarios" note', () => {
    const { scriptedTemplate, freePlayTemplate } = templatesForTest()
    const specs = buildLaunchSpecs({
      seats: [seat('seat-0', 'Dash')],
      catalog: [],
      modeSignal: 'scripted',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })
    const prompt = specs[0]!.prompt
    expect(prompt).toContain('No scenarios scoped to your role')
    expect(prompt).not.toMatch(/\{\{[A-Z_]+\}\}/)
  })

  it('seat name containing quotes is JSON-escaped in OTHER_SEATS_JSON', () => {
    const { scriptedTemplate, freePlayTemplate } = templatesForTest()
    const seats = [
      seat('seat-0', 'Dash'),
      seat('seat-1', 'Name"With"Quotes'),
    ]
    const specs = buildLaunchSpecs({
      seats,
      catalog: SYNTH_CATALOG,
      modeSignal: 'scripted',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })
    const prompt = specs[0]!.prompt
    expect(prompt).toContain('Name\\"With\\"Quotes')
  })
})

// -----------------------------------------------------------------------------
// loadDefaultTemplates — real files on disk
// -----------------------------------------------------------------------------

describe('loadDefaultTemplates', () => {
  it('loads the two real template files from scripts/playtest/agents/', async () => {
    const { scriptedTemplate, freePlayTemplate } = await loadDefaultTemplates(REPO_ROOT)
    expect(scriptedTemplate).toContain('SCRIPTED mode')
    expect(freePlayTemplate).toContain('FREE-PLAY mode')
    expect(scriptedTemplate).toContain('{{CATALOG_TEXT}}')
    expect(freePlayTemplate).toContain('{{CATALOG_TEXT}}')
  })
})

// -----------------------------------------------------------------------------
// emitLaunchSpecs — disk hand-off
// -----------------------------------------------------------------------------

describe('createAgentLauncherDriver', () => {
  it('emits specs then resolves when the agents-done marker appears', async () => {
    const runDir = mkdtempSync(path.join(tmpdir(), 'phase4-driver-'))
    const { scriptedTemplate, freePlayTemplate } = await loadDefaultTemplates(REPO_ROOT)
    const { createAgentLauncherDriver, AGENTS_DONE_MARKER } = await import(
      './agent-launcher'
    )
    const { writeFile } = await import('node:fs/promises')

    const driver = createAgentLauncherDriver({
      catalog: SYNTH_CATALOG,
      modeSignal: 'scripted',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      runDir,
      pollIntervalMs: 25,
      waitTimeoutMs: 5_000,
    })

    // Touch the marker after a short delay to simulate agents finishing.
    setTimeout(() => {
      void writeFile(path.join(runDir, AGENTS_DONE_MARKER), 'done').catch(() => {})
    }, 75)

    const start = Date.now()
    await driver([seat('seat-0', 'Dash'), seat('seat-1', 'Vera')])
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThan(50)
    expect(elapsed).toBeLessThan(2_000)

    // Specs were actually written.
    const specFiles = await readdir(path.join(runDir, 'agent-specs'))
    expect(specFiles.sort()).toEqual(['seat-0.json', 'seat-1.json'])
  })

  it('falls back to waitTimeoutMs when no marker appears', async () => {
    const runDir = mkdtempSync(path.join(tmpdir(), 'phase4-driver-to-'))
    const { scriptedTemplate, freePlayTemplate } = await loadDefaultTemplates(REPO_ROOT)
    const { createAgentLauncherDriver } = await import('./agent-launcher')

    const driver = createAgentLauncherDriver({
      catalog: [],
      modeSignal: 'scripted',
      sessionTimeoutMs: 60_000,
      scriptedTemplate,
      freePlayTemplate,
      runDir,
      pollIntervalMs: 25,
      waitTimeoutMs: 100,
    })

    const start = Date.now()
    await driver([seat('seat-0', 'Dash')])
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(100)
    expect(elapsed).toBeLessThan(1_500)
  })
})

describe('emitLaunchSpecs', () => {
  it('writes one JSON spec per seat + a manifest under runDir', async () => {
    const runDir = mkdtempSync(path.join(tmpdir(), 'phase4-launcher-'))
    const { scriptedTemplate, freePlayTemplate } = await loadDefaultTemplates(REPO_ROOT)
    const result = await emitLaunchSpecs({
      seats: [seat('seat-0', 'Dash'), seat('seat-1', 'Vera')],
      catalog: SYNTH_CATALOG,
      modeSignal: 'scripted',
      sessionTimeoutMs: 60_000,
      runDir,
      scriptedTemplate,
      freePlayTemplate,
      screenshotsDir: '/tmp/run/screenshots',
    })

    const specFiles = await readdir(result.specsDir)
    expect(specFiles.sort()).toEqual(['seat-0.json', 'seat-1.json'])

    const manifestJson = await readFile(result.manifestPath, 'utf8')
    const manifest = JSON.parse(manifestJson) as {
      seats: { seatId: string; subagentType: string; mode: string; role: string }[]
      modeSignal: string
    }
    expect(manifest.modeSignal).toBe('scripted')
    expect(manifest.seats).toHaveLength(2)
    manifest.seats.forEach((m, i) => {
      expect(m.subagentType).toBe(`playtest-seat-${i + 1}`)
    })

    const spec0 = JSON.parse(
      await readFile(path.join(result.specsDir, 'seat-0.json'), 'utf8'),
    ) as { prompt: string; subagentType: string; playerUrl: string; mcpNamespace: string }
    expect(spec0.subagentType).toBe('playtest-seat-1')
    expect(spec0.mcpNamespace).toBe('playwright-seat-1')
    expect(spec0.playerUrl).toBe(
      'http://localhost:5173/player.html?room=TEST&name=Dash',
    )
    expect(spec0.prompt).not.toMatch(/\{\{[A-Z_]+\}\}/)
  })
})
