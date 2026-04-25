# BURNED — TODO

## NEXT SESSION — pick up here (2026-04-26+)

**Phase 6 Unit 2.5 — SHIPPED 2026-04-25.** MCP-per-seat architecture
wiring (Phase 4 D15 Option A). 10 `playwright-seat-N` MCP servers in
`.mcp.json` (all `--isolated`); 10 generated `.claude/agents/playtest-seat-N.md`
files via `scripts/generate-playtest-seat-agents.ts`; per-seat
`subagentType` (`playtest-seat-${seatIndex+1}`) + `playerUrl` +
`mcpNamespace` threaded through `agent-launcher.ts`; seat templates
gain Step 1 navigation block + `{{PLAYER_URL}}` + `{{MCP_NAMESPACE}}`
placeholders; `skipBrowserLaunch: true` orchestrator opt bypasses
`chromium.launch` + `createSeat × N`; orchestrator runs isolation
audit BEFORE triage so triage gets a real `isolationStatus` (no more
hardcoded `'OK'`); `run-session.ts` defaults `seatDriver` to
`createAgentLauncherDriver` and `runPostSessionTriage` to
`runTriagePipeline`. New `pnpm playtest:phase6-launcher-smoke` proves
the audit-then-triage chain end-to-end with mocked servers (19/19
assertions). Full suite **987/987** (+4 from per-seat-name + URL-
encoding tests). typecheck clean · phase4-smoke PASS · phase5-smoke
PASS. Insight 031 captured. CLAUDE.md landmines updated. Validation
experiment (parent ↔ subagent independent browsers under `--isolated`)
empirically confirmed before any code touched. **Unit 3 is now
unblocked** — eye-in-loop, Briggsy STOP gate.

**Playtest-harness Phase 6 Unit 4 — SHIPPED 2026-04-24.** Series configs
+ Zod schema + TUNING-LOG scaffold. `scripts/playtest/lib/config-schema.ts`
is the single source of truth for Config validation (`.strict()` catches
unknown-field typos + missing required-field drift). Five series configs
shipped (`series-{2p,3p,5p,8p,10p}.json`; seeds 1000+N; sessionTimeoutMs
scales 60min + 10min/seat beyond 3). `docs/testing/playtest/TUNING-LOG.md`
scaffolded with the Series 1 template (9 calibration-output decisions,
R2 routing matrix, appendix with decision rationale). Full suite
**983/983** (+30 schema tests). typecheck clean. Commit `8c7e7cad`.

**Phase 6 Unit 2 — SHIPPED 2026-04-24.**
`pnpm playtest:verify-calibration <runDir>` ships. Pure filesystem walker
— 7 checks (session.md end-block outcome, isolation-audit status,
events.jsonl valid JSONL, events.jsonl scrubbed, per-seat logs
entryType vocabulary incl. C4-rename fail-closed, coverage.md renders,
issues/INDEX.md). I5 partial-run pre-gate fires before anything else.
+44 tests. CLI verified runtime against hand-rolled fixtures (happy
path exits 0; partial-run exits 1 with `--full-dir` purge message;
ISOLATION_BREACH branch exits 1 with "1 FAIL — 6/7" table). Commit
`0ed6dc00`.

**Phase 6 Unit 1 — SHIPPED 2026-04-24** (previous session). Pre-flight
authorization gate: `pnpm playtest:pre-flight` runs 6 checks green
against the real repo (live wrangler + god WS handshake). Commit
`22c95260`.

**Pick from the active queue:**
1. 🛑 **Phase 6 Unit 3 — RUN the calibration session.** EYE-IN-LOOP.
   STOP before this runs autonomously. Live wrangler + 3 seats + first
   real god-event broadcast. This Claude Code conversation will read
   `<runDir>/agent-specs.manifest.json` and dispatch one
   `Agent({ subagent_type: 'playtest-seat-N', prompt })` per entry,
   then touch `<runDir>/agents-done.marker` when all seats exit. The
   orchestrator handles the rest. Also where `assertGodEnvelopeShape`
   (already exported in `scripts/playtest/pre-flight.ts`) gets invoked
   against the FIRST real envelope to feature-detect
   `expectedViewerIds` per insight 030. Unit 2's
   `pnpm playtest:verify-calibration <runDir>` is the post-run verifier
   — run it immediately after the session ends.
2. **Phase 6 Units 5-7 (post-Unit-3).** 5-game series + Briggsy review
   (Unit 5, eye-in-loop x5); doc sweep (Unit 6, prune the legacy
   single `playtest-seat.md` + `playtest-seat.test.ts` if any);
   retrospective (Unit 7).
3. **BURNED card cinematic arc** sub-steps #3 + #4 (DefusePlacement hero
   card + Burned art regen). Pure product work, can interleave with
   harness work.
4. **Real-device playtest** — iPad + phones Emil-pass verification list.

---

### Phase 6 Unit 1 state of the world (2026-04-24)

**Full test suite:** 909/909 green (+44 from Phase 5 baseline of 865:
all in `scripts/playtest/pre-flight.test.ts`) · typecheck clean ·
`pnpm playtest:pre-flight` exits 0 against current repo state with all
6 checks GREEN (live wrangler boot + god WS 101 Switching Protocols +
playtest-config-ack ok:true).

**Phase 6 Unit 1 surface shipped:**
- `scripts/playtest/fixtures/mini-catalog.md` — 6-scenario calibration
  fixture (Favor / triple-steal / Intercept chain-burn / Skip / Go-Dark /
  Burned-axis-11). Real SCENARIOS.md format. All 10 KNOWN_PRODUCT_CALL_
  CLUSTER IDs (A-01, B-03–B-07, B-13, C-15, D-03, D-16) tagged across
  the 6 scenarios.
- `scripts/playtest/config/calibration.json` — extends phase-3 Unit 1
  Config shape. seats=3, nopeWindowMs=300000, sessionTimeoutMs=900000,
  catalogPath points at the mini-catalog.
- `scripts/playtest/pre-flight.ts` — D7 authorization gate, 6 fail-closed
  checks: (1) `.last-selftest` < 24h, (2/3) `.claude/agents/playtest-
  seat.md` + `playtest-triage.md` frontmatter `tools:` whitelist shape,
  (4) catalog parse + cluster coverage via parseCatalog, (5) live god WS
  handshake (boots wrangler via `startServers`, opens god WS with Origin
  header via `buildLanOriginFromWsUrl`, asserts `playtest-config-ack`
  with `ok: true`), (6) `--no-scrub` refusal gate.
- `scripts/playtest/pre-flight.test.ts` — 44 unit tests including
  happy-path companions for every error path (insight 027). All 6
  check helpers + `assertGodEnvelopeShape` + `assertConfigAck` +
  `parseAgentFrontmatter` + `parseArgs` covered.
- `package.json` — `pnpm playtest:pre-flight` script wired.

**Mid-execution course-correction (insight 030 captured).** The
plan's check 5 design — "send a no-op action against an empty room
and feature-detect `expectedViewerIds` on the returned god-event
envelope" — is incompatible with the server's god-event semantics.
`src/server/room.ts:902-911`: god-events fire only when
`pendingGodEventTrigger` is set, and that flag is only set at engine-
action dispatch sites. Lobby state, host-connect, and joins do NOT
trigger god-event broadcasts. Empty-room probes can't fire one. Check
5 was redefined as a `playtest-config-ack` handshake probe;
`assertGodEnvelopeShape` stays exported in pre-flight.ts for Unit 3
to invoke against the first REAL broadcast. Insight at
`docs/insights/030-conditional-emission-gates-defeat-empty-state-feature-detection.md`.

**Phase 6 Unit 1 → Unit 3 hand-off.** When Unit 3 runs the live
calibration, import `assertGodEnvelopeShape` from
`scripts/playtest/pre-flight.ts` and apply it to the first
`type: 'god-event'` message that arrives on the god WS during the
session. If it fails, Phase 2 D4 is missing the field on the wire —
bounce back to Phase 2 Unit 6 (already a documented routing).

### Phase 5 state of the world (2026-04-24)

**Full test suite:** 865/865 green (+60 from Phase 4 baseline of 805:
22 cluster-suspicions, 17 triage-launcher, 12 build-issue-index,
4 triage-pipeline, 5 orchestrator hook) · typecheck clean ·
`pnpm playtest:phase4-smoke` PASS · `pnpm playtest:phase5-smoke` PASS
(~50 assertions including I1 prompt-injection, Ruling C catalog-tag
matching, Ruling A "cannot determine" propagation, C4 rename
end-to-end).

**Phase 5 surface shipped:**
- `.claude/agents/playtest-triage.md` (Unit 1b, **primary isolation
  enforcement**, insight 020). Frontmatter `tools:` whitelist =
  `Read, Write, Grep, Glob,
  mcp__sequential-thinking__sequentialthinking`. Deliberately absent:
  all `mcp__playwright__*`, `Bash`, `Edit`, `Agent`, `WebFetch`.
- `scripts/playtest/agents/triage.md` (Unit 1) — canonical triage
  prompt template with 11 placeholders. Seed-kind handling cues for
  all 7 SeedKind values (D14 / R12). Untrusted-data framing (I1),
  Read path-scope allowlist (I2), Scrubbed-field contract (I4).
- `scripts/playtest/lib/cluster-suspicions.ts` (Unit 2) — pure
  deterministic clustering of raw signals into typed `IssueSeed[]`.
  12 clustering rules. Internal `flattenInternal` delta-flattens
  cumulative god-events per insight 028. Zero `src/server` /
  `src/shared` imports (insight 022).
- `scripts/playtest/lib/triage-launcher.ts` (Unit 3) — pure prompt
  rendering + spec emit. Every spec carries literal
  `subagentType: 'playtest-triage'` (D16 / R14 / insight 020).
  `buildTriagePrompt` throws on ill-formed seeds before spawn.
  Driver wrapper `createTriageLauncherDriver` mirrors phase-4 Unit 2
  pattern.
- `scripts/playtest/lib/build-issue-index.ts` (Unit 4) — walks
  `runs/<id>/issues/*.md`, parses headers, writes deterministic
  9-section `INDEX.md` (Summary, Scripted, Free-play, Vibe-check,
  UI-spec-divergence with Ruling A indicator column, Role-drift
  with low-signal disclaimer, With-divergence-fires with failed-tier
  column, Coverage divergences, Known-product-calls confirmed).
- `scripts/playtest/integration/phase5-smoke.ts` +
  `pnpm playtest:phase5-smoke` (Unit 5) — end-to-end Units 2-4
  smoke. ~50 assertions across all 7 SeedKind paths,
  prompt-injection regression (I1), catalog-tag-only matching
  (Ruling C), Ruling A "cannot determine" propagation, C4 rename
  end-to-end.
- `scripts/playtest/lib/triage-pipeline.ts` (Unit 6) — single
  `runTriagePipeline(input)` entry point bundling Units 2-4. Loads
  parsed seat logs / events.jsonl / connections.jsonl, runs
  cluster → emit specs → build index. Skip reasons:
  `isolation-breach`, `no-seeds`.
- `scripts/playtest/lib/orchestrator.ts` (Unit 6) — new optional
  `runPostSessionTriage` dep called after `appendSessionEnd`,
  before retention. v1 always passes `isolationStatus: 'OK'`
  (Phase 4's audit not yet wired into orchestrator either; Phase 6
  closes that loop). Hook failure non-fatal — only logged.
  Skip reason / counts logged to session logger.

**Phase 4 state of the world (2026-04-24 baseline)**

Full test suite before Phase 5: 805/805 green. typecheck clean ·
`pnpm playtest:phase4-smoke` PASS (~70 assertions) ·
`pnpm playtest:smoke` leaves 0 workerd zombies across repeat runs
(was 2/run before the fix).

**Phase 4 surface shipped:**
- `scripts/playtest/agents/seat-scripted.md` + `seat-free-play.md` —
  seat-agent prompt templates (Unit 1). 11 placeholders, D16 role
  rubric, D17/I5 prompt-injection framing, all 7 ROW_DISPLAY_LABELS
  verbatim, references `ui-spec-divergence` (C4 rename).
- `.claude/agents/playtest-seat.md` — custom subagent file (Unit 1b,
  **primary isolation enforcement**, insight 020). Frontmatter `tools:`
  whitelist = 9 MCP Playwright tools + `Write`, comma-separated, no
  wildcards. Deliberately absent: `browser_evaluate`, `browser_navigate*`,
  `browser_run_code`, `browser_tabs`, `browser_console_messages`,
  `browser_network_requests`, `browser_drag`, `browser_file_upload`,
  `browser_handle_dialog`, `browser_close`, `browser_resize`, every
  non-Playwright MCP tool, `Read`, `Edit`, `Bash`, `Grep`, `Glob`,
  `Agent`.
- `scripts/playtest/lib/log-schema.ts` + `log-parser.ts` (Unit 3) —
  Zod discriminated union over 4 entryTypes (`scenario-fire`,
  `suspicion`, `vibe-check`, `ui-spec-divergence`). `myRoleLabel`
  literal union derived from `ROW_DISPLAY_LABELS` (import, no dup).
  `proseRationale` `minLength 10` catches boilerplate. Legacy
  `info-gap-divergence` → parse warning + coerced to
  `ui-spec-divergence` (transition; remove after Phase 6 locks).
- `scripts/playtest/lib/scenario-detector.ts` — parseCatalog extension
  (Unit 2a, closes insight 029 recurrence). New fields on
  `ParsedScenario`: `title` + optional `triggerConditions`,
  `recognitionCriteria`, `suspicionPrompts`, `vibeCheck`,
  `whyThisMatters`. `InfoGapPresence` gains optional `column1Prose` /
  `column2Prose` alongside the existing booleans — coverage-reporter
  unaffected (reads booleans only).
- `scripts/playtest/lib/agent-launcher.ts` (Unit 2) — pure functions:
  `inferInitialRole`, `renderScriptedCatalogForRole` (per-role
  pre-filter; ACTOR/TARGET full detail, OTHER/SPECTATOR/DISCONNECTED
  one-line pointer, N/A skipped), `renderFreePlayPointer`,
  `buildSeatPrompt`, `buildLaunchSpecs`, `loadDefaultTemplates`,
  `emitLaunchSpecs`, `createAgentLauncherDriver`. Column 1 prose
  never leaks into agent prompts (server-internal, phase-4 C4).
- `scripts/playtest/lib/isolation-audit.ts` (Unit 4) — post-session
  audit enforcing path-confinement for seat-agent `Write` calls
  (phase-4 I1/D8 — Claude Code lacks per-path Write scope today).
  Walks `<runDir>/seats/` + `<runDir>/suspicions/`; rejects mis-named
  files, unknown seat IDs, and cross-seat contamination. Writes
  `isolation-audit.md`; flips session to `ISOLATION_BREACH` on any
  violation (coverage still written). Missing dirs = PASS (scope
  audit, not productivity audit).
- `scripts/playtest/integration/phase4-smoke.ts` +
  `pnpm playtest:phase4-smoke` (Unit 5) — end-to-end wiring smoke.
  Exercises scripted + free-play spec emission, fake-agent log
  writes, marker-based driver release, isolation audit green path,
  and C4 rename end-to-end. ~70 assertions.

**Insights captured across Phase 4 (0 new — insight 029 captured
during Phase 3 anticipated the producer/consumer gap that recurred
for Unit 2 → Unit 2a; no new lesson worth a separate doc).**

### Phase 3 state of the world (2026-04-24 baseline)

**Full test suite before Phase 4:** 749/749 green.

**Harness surface shipped:**
- `pnpm playtest:selftest` — 8-check isolation self-test (cookie / localStorage
  / WS-frame / god-non-delivery / allowlist-defined / close-codes-distinct /
  scrubber-fail-closed / retention-boundary). Runs in ~5s against live
  wrangler+vite; writes `.last-selftest` stamp only on all-pass.
- `pnpm playtest:smoke` — end-to-end Phase 3 smoke. 2-seat session in room
  `SMK<xxx>` (randomized to avoid DO-state collision on rerun), host starts
  the game via board-view "Cleared Hot", seat 0 plays one End-turn draw,
  god subscriber captures events to `events.jsonl`. 2× runs @ ~10s each,
  both pass.
- `pnpm playtest:run` — orchestrator entry with `--config / --seats / --seed
  / --viewport / --no-scrub / --allow-trace / --help`. Seat-agent dispatch
  is still the Phase 3 stub (waits for stdin sentinel); Phase 4 replaces.
- `pnpm playtest:purge` — operator-invoked session-dir purge with
  `--before / --session-id / --full-dir / --root`. Rolling retention
  (default keep 10 newest) runs automatically at end of each session via
  the orchestrator.
- **scenario-detector (`scripts/playtest/lib/scenario-detector.ts`, Unit 9):**
  `detectFires(catalogPath, eventsJsonlPath, connectionsJsonlPath, seatLogPaths)`
  parses SCENARIOS.md's three-tier grammar, walks events.jsonl + (optional)
  connections.jsonl, emits tri-state FireRecords (`clean` / `with-divergence`
  / `no-fire`). Hand-rolled YAML-subset parser. Extended 2026-04-24 to also
  extract the per-scenario 7×2 info-gap table (`infoGap` field on
  `ParsedScenario`) — 83 of 86 production scenarios carry it; SERVER row
  populated on 100% (D5 invariant).
- **coverage-reporter (`scripts/playtest/lib/coverage-reporter.ts`, Unit 10,
  NEW 2026-04-24):** `buildCoverageReport(input): CoverageReport` +
  `renderCoverageMd(report, fires, catalog): string`. Pure functions. Primary
  gate `firedCount >= 50` (PRD §8.2) + secondary gate `zeroCellCount === 0`
  (phase-3 B5 / D13.1). Options-bag signature so Phase 4 `selfReports` and
  Phase 5 `firedByViewport` slot in without refactors. Dedup by scenarioId,
  excludes `knownProductCall`-tagged scenarios from `firedCount` per
  phase-1 D4. Not wired into orchestrator yet — Phase 4+ integration.

**Harness lib modules (all under `scripts/playtest/`):** `run-session.ts`,
`selftest.ts`, `purge.ts`, `smoke.ts` entries; `lib/` has `orchestrator`,
`server-controller`, `session-secrets`, `god-subscriber`, `seat-factory`,
`run-directory`, `scrubber`, `retention`, `selftest-checks`,
`scenario-detector` (Unit 9), `coverage-reporter` (Unit 10). Zero imports
from `src/server` (insight 022). All types re-declared locally.

**Phase 2 fixes rolled into Phase 3 during execution:**
- **Unit 3 FIX (commit `adc75942`):** `startServers` switched from env-based
  to `pnpm exec wrangler dev --var PLAYTEST_MODE:1 --var PLAYTEST_TOKEN:<t>`.
  Wrangler does NOT propagate Node env to workerd — discovered via Unit 7
  live run. See insight 024.
- **Unit 4 fix (commit `0ff2ada4`):** god-subscriber now sets `Origin` header
  on WS open via `buildLanOriginFromWsUrl`. `ws` package sends no Origin by
  default; Phase 2 LAN gate rejected with 403 → 4003. See insight 025.
- **Unit 3 stdio drain (commit `adc75942`):** subprocess stdout/stderr now
  drained to parent's stderr with `[wrangler]` / `[vite]` prefix. Undrained
  pipes stalled wrangler at ~64 KB. See insight 026.

**Insights captured across Phase 3 (6 total):**
- **024** — `wrangler dev` requires `--var` CLI flags; Node env doesn't
  reach workerd.
- **025** — `ws` package sends no Origin header by default; server LAN
  origin gate rejects bare clients with 403 → 4003.
- **026** — Undrained subprocess stdio stalls the child at ~64 KB; use
  drain-with-prefix or `stdio: 'ignore'`.
- **027** — Absence-of-X assertions need presence-of-Y companions;
  selftest Check 4 passed vacuously when god never connected.
- **028** — god-events broadcast cumulative event arrays, not deltas.
  Any consumer must delta-flatten via `.slice(priorLen)` or massively
  over-count. Applies to Phase 5 triage + any replay tool.
- **029 (NEW 2026-04-24)** — downstream plans reference structured data
  that upstream only captured as authorial prose. Unit 10's plan said
  "credit cells where fire signature touched (vantage, column)" — but
  vantage data lives in the 7×2 info-gap markdown table, which Unit 9's
  parser ignored. Audit producer output types from ALL downstream
  consumers' perspectives before locking. Complement to insight 019.

### Known follow-ups (ordered by urgency)

1. **~~Workerd orphan processes on Windows~~ FIXED 2026-04-24 (commit
   `d5503c1d`).** `stopServers` now shells to `taskkill /F /T /PID <pid>`
   on Windows, which propagates down the `cmd.exe → pnpm → wrangler →
   workerd.exe` tree. Verified by repeat smoke runs producing 0 zombies.
   Landmine for future readers: `taskkill` without `/F` sends WM_CLOSE,
   which does nothing to windowless processes like `workerd.exe` — always
   use `/F` on Windows. Code comment at `server-controller.ts`
   `killProcessTree` calls this out.
2. **Port 5173 vite collision (Unit 8 finding).** `pollViteHealth` doesn't
   verify it's the orchestrator's vite vs a pre-existing user vite. Today
   accidental coexistence works; could mask a dev-server regression. Fix:
   hash an orchestrator-ID into a request header OR probe a harness-only
   endpoint.
3. **Phase 3 Unit 7 selftest polish:** selftest.ts inlines the wrangler
   spawn rather than calling the fixed `startServers`. Works correctly
   but duplicates wrangler-spawn discipline; migrating is low-risk polish.
   Noted in commit `adc75942`.
4. **Negative-shape dispatch-rejection evidence (Unit 9 known limitation).**
   scenario-detector currently defaults `shape: negative` scenarios to
   `no-fire` because dispatch errors don't produce god-events today.
   When Phase 4 seat agents land (or whenever rejection logging lands),
   upgrade `tier1Match` in `scenario-detector.ts` to check for positive
   rejection evidence and fire `clean` when observed. Full context in
   the code comment at the `shape === 'negative'` branch.
5. **Coverage-reporter orchestrator wiring (Unit 10 deferred).** Pure
   functions shipped but not called from `runSession`. Phase 4+ wires
   `buildCoverageReport` + `renderCoverageMd` into the session-end block,
   sourcing `selfReports` from seat suspicion logs and `firedByViewport`
   from orchestrator viewport rotation.
6. **~~Phase 4 — seat agents~~ SHIPPED 2026-04-24.** 7 units +
   workerd orphan fix. Real subagent dispatch (the `Agent(...)` call)
   is the Phase 6 hand-off — requires a Claude Code conversation; can't
   run from a pnpm script. Also deferred: the "contract test" (spawn a
   playtest-seat with a prompt deliberately asking for
   `browser_evaluate`, assert Claude Code refuses at the tool-surface
   boundary). Phase 4 smoke calls this out in its output. And Phase 4
   did NOT modify `orchestrator.ts` despite the plan's file list —
   the existing `seatDriver` injection point is the cleaner hand-off,
   Phase 6 will wire it up.
7. **~~Phase 5 — triage agents~~ SHIPPED 2026-04-24.** All 6 units +
   the C4 rename carried through end-to-end. Real subagent dispatch
   (the `Agent({ subagent_type: 'playtest-triage', ... })` call) is
   the Phase 6 hand-off — requires a Claude Code conversation; can't
   run from a pnpm script. Also deferred: the contract test (spawn a
   `playtest-triage` with a prompt asking for
   `mcp__playwright__browser_snapshot`, assert Claude Code refuses
   at the tool-surface boundary). Phase 5 smoke calls this out in
   its output. The orchestrator wires `runPostSessionTriage` as an
   optional dep but doesn't default it to the real
   `runTriagePipeline` — Phase 6 closes that loop.
8. **Phase 6 — first REAL session.** STOP before this runs autonomously;
   eye-in-loop required. Also the home for:
   (a) Phase 4 deferred contract test (`browser_evaluate` refusal),
   (b) Phase 5 deferred contract test (`browser_snapshot` refusal),
   (c) Default `runPostSessionTriage` to `runTriagePipeline` in
       `runSession`,
   (d) Default `seatDriver` to `createAgentLauncherDriver` in
       `runSession`,
   (e) Phase 4's isolation audit wired into the orchestrator so
       `runPostSessionTriage` receives a real `isolationStatus`
       instead of always-`'OK'`.
9. **IncomingSteal banner real-device verification** (`82af35f9`) — still
   pending from prior sessions. Playwright + unit tests green, phone-side
   pre-resolution screenshot never caught. Earth > map.
10. **Host-identity cluster (P1 deferred).** B-01/B-02/B-11/B-12/B-14 —
    significant infra, design questions first.
11. **Remaining P1/P2 from `docs/testing/E2E-ISSUE-LIST.md`** — cosmetic
    and scope-decision items, pick opportunistically.

### Phase 1 Column divergences — candidates for E2E-ISSUE-LIST.md additions

Still open from Phase 1 drafting. Full text in
`docs/testing/playtest/SCENARIOS.md` §Column divergences. Highlights:

- **Atomicity-gap bug class** (insight 021) — 4 scenarios re-surface the
  pre-A-01 strip-before-validate pattern: Extraction proactive,
  Direct Order eliminated-target, Back-Channel empty-deck, Favor
  self-target. Same dispatch-time-guard repair template as A-01.
- Favor auto-resolve TARGET-silence on empty-hand or Burned-only hand
  (correct engine, weak UX).
- Intel → Back-Channel `pendingFuture` clearing semantics — product call.
- Spectator `namedCardType` visibility — engine correct (closed: see
  Phase 1 plan-doc correction, insight trail).
- Board-drama variant for Burned draw (known: C-15).

### Phase 1 catalog gaps (intentional — documented)

- D-03 simultaneous-Nope UX — no dedicated scenario; Phase 3 orchestrator
  can script on demand if needed.
- B-13 active-player-mid-turn disconnect — adjacent to
  `SCN-CONN-NAME-CARD-PENDING-DISCONNECT-01`; not dedicated.
- Free-play scenarios (4) omit the 7-row info-gap by design.

### IncomingSteal banner — what to check (commit `82af35f9`)

On a real 3-of-a-kind named steal, target's phone shows `// INCOMING LIFT /
{STEALER} / is lifting your / {CARD NAME}` banner DURING the 10s nope window
(not just post-resolution). Countdown ticks, urgent-red flip at ≤2s, banner
exits clean when the window resolves. Verify bystanders see no banner and no
card name anywhere.

---

## 🛡️ PLAYTEST HARNESS — HARDEN PASS COMPLETE (2026-04-23 overnight)

All 6 phase plans **LOCKED**, PRD v0.2 **LOCKED**, roadmap **active**. Ready
to execute builds when Briggsy greenlights (builds were descoped overnight —
harden-only was the final scope).

**Artifact locations (all LOCKED 2026-04-23 against engine/room @ `e6b31b5c`,
projection @ `5e86f811`):**
- PRD: `docs/testing/PLAYTEST-HARNESS-PRD.md` — v0.2 LOCKED
- Roadmap: `docs/plans/playtest-harness/roadmap.md` — active
- Phase plans: `docs/plans/playtest-harness/phase-{1..6}-*.md` — all `status: locked`
- Coherence audit: `docs/plans/playtest-harness/COHERENCE-SWEEP.md`

**Insights captured:**
- `docs/insights/019-surface-coherence-review-misses-signature-drift.md` —
  surface-level confidence scoring misses code-grounded drift; rigor passes
  need at least one code-grounded reviewer.
- `docs/insights/020-subagent-capability-enforcement-is-frontmatter-not-wrapper.md`
  — TypeScript wrappers can't restrict Claude subagents; enforcement lives at
  `.claude/agents/*.md` frontmatter `tools:` whitelist because MCP tools
  cross process boundaries.

**Next steps:**
- ✅ **Phase 2 SHIPPED 2026-04-24** — 10 units, full suite 527/527, live
  smoke green.
- ✅ **Phase 3 (12 of 13 units) SHIPPED** — Units 1, 2, 3, 3b, 4, 4b, 5, 6,
  7, 8, 9, 10b landed. Full suite 719/719. Live `pnpm playtest:smoke`
  passes ~10s × 2 runs. See top-of-file §"Phase 3 state of the world".
- **Phase 3 completion:** Unit 10 (coverage-reporter) is the last
  remaining unit. Pure consumer of Unit 9's `FireRecord[]`.
- Execute Phase 4 → Phase 5 per locked plans. Phase 6 is the first real
  session; STOP before Phase 6 without eye-in-loop verification.
- Insights 019 + 020 should guide future rigor passes on agent-native plans.
  Insights 022 + 023 fed into Phase 3 scope decisions (room.ts quarantine;
  HTTP-level auth gate). Insights 024-027 cover wrangler `--var`, ws
  Origin headers, stdio backpressure, and absence-tests-need-presence-
  companions. Insight 028 (god-events are cumulative, not delta) applies
  to any future events.jsonl consumer (Phase 5 triage, replay tools).

### Sequential-vs-parallel analysis (Briggsy's end-of-session question)

**Premise tested:** Phase N learns from Phase N-1. Answer: **YES, strongly
verified.** Every H-Na absorption inherited a material architectural
correction from the preceding H-(N-1)b rigor pass:

- H-1b → H-2a: god-event emission site moved from dispatch to
  `broadcastGameState`. Phase 3 Unit 4 reassembly architecture depends on
  this. Parallel run would have built Phase 3 on the wrong assumption.
- H-2b → H-3a: `expectedViewerIds` + `/health` added to Phase 2 upstream.
  Phase 4 consumes both. Parallel run would have missed them.
- H-3b → H-4a: `SeatPageWrapper` deleted, custom `.claude/agents/playtest-
  seat.md` pattern introduced, `info-gap-divergence` → `ui-spec-divergence`
  rename. Phase 5's Unit 1b + 4 entryType consumption depends on all three.
  Parallel run would have had to rewrite Phase 5 after the fact.
- H-4b → H-5a: role-drift demoted to LOW-SIGNAL, Column-1 analysis
  scrubber-aware-limited. Phase 6 calibration decisions reference both.
  Parallel run would have missed.
- H-5b had no downstream.

**Counterfactual time estimate:** Pure parallel absorptions + parallel rigor
would save ~2-3h wall time but would require a second pass to propagate
every cross-phase correction surfaced during rigor — effectively converging
back to sequential + coherence-sweep fixes. The "savings" get eaten by
rework churn, and the intermediate state (each phase locked on wrong
upstream) invites partial commits that are hard to unwind.

**Recommendation:** Keep sequential for any plan set where downstream
phases demand contracts from upstream. Parallel is fine for orthogonal
work (different subsystems, no shared contract surface). The premise
held; sequential was the right call.


---

## Active Priorities

### 1. BURNED CARD CINEMATIC ARC — sub-steps #3 and #4

Sub-steps #1 (drawer card-fill) and #2 (non-drawer/board card-flip) SHIPPED
(see phone-verify table above). #3 and #4 remain.

**Sub-step #3 — DefusePlacement hero card.** Sheet is currently text-only
("Hide the Burned Card" + position buttons). Drawer just dodged death — hero
the Burned card at the top of the sheet during position-pick. Visual continuity
from drama → decision: "this is what you're hiding, where?"

**Sub-step #4 — Regen the Burned card art.** Once #3 lands, the illustration
becomes the visual keystone. Direct Order + Intercepted shipped; Burned is the
only action card still at original Apr-9 quality.

Art concept pitches for #4:
- **A. Operative caught in flashbulb exposure** — bright white/amber flashbulb
  blast from outside frame, operative silhouette caught mid-turn looking
  toward camera, surprise/recognition expression, dark city street or rooftop.
  Pure noir "the moment your cover is blown."
- **B. Photograph emerging from developer tray** — close-up overhead of
  darkroom developer tray, B&W surveillance photo of the operative fully
  developed, red darkroom light overhead. Ties to Intel Briefing's photography
  vocabulary.
- **C. Cinematic upgrade of the current explosion concept** — keep the badge-
  in-flames idea but go full Archer-spec: operative's spy ID card with photo,
  burning at edges against dark void, embers and smoke rising.

**Claude's lean:** A (flashbulb exposure) — most narratively precise for
"Burned" = identity exposed. Tonally different from Direct Order / Intercepted
(both interiors) — exterior/action beat adds variety.

Process per regen:
1. Archive current: `public/assets/cards/_archive/burned-<date>-<reason>.webp`.
2. Tighten prompt in `scripts/generate-cards.ts` — minimum-viable wins.
3. `set -a && source .env && set +a && npx tsx scripts/generate-cards.ts --only=burned`.
4. Critically eyeball the temp PNG — state flaws, don't narrate hopes.
5. `npx tsx scripts/process-assets.ts` once approved.

### 2. Real-device playtest

Live 4-8 player test on iPad Pro 1366 + phones. Verify:

- Triple-steal deferred commit — cards return on cancel, nope window opens
  AFTER the name.
- Favor-target banner + staging (no sheet modal).
- Discard hero sizing reads from couch distance.
- Burned two-beat drama sequence on non-drawer phones.
- Card-drawn toast fires for drawer only on safe draw.
- `pnpm dev:launch` debugging ergonomics.
- Emil pass on-phone: SmartActionBox `:active` scale lands during breathing;
  card-tap squeeze reads tactile; hand→enlarge blur doesn't stutter on Safari;
  sheets press feedback doesn't fight overscroll.
- Emil pass on-TV: briefing cascade reads as a coherent arc; idle ticker stays
  ambient once real COMMS accumulate; Lobby disabled sheen subtle; status
  strip crossfade on turn handoff doesn't ghost.
- Emil Phase 3 on-phone: StagingArea enlarge no longer stutters; DefusePlacement
  ± steppers feel tactile at 0.95 press; PendingPromptBanner crossfade on
  defuse → favor-response swap reads as status line.
- Emil Phase 3 on-TV: NopeCountdownBar fade-in; PendingPromptBanner 6px lift
  at couch distance; Lobby startButton hover on desktop, not sticky on hybrid
  touch; GameOver 80ms stagger at 10 players.
- Emil Q verification: Nameplate flip 400ms vs 250ms (crisp brass click vs
  heavy coin flip); perspective 1000px vs 600px (flat fade-swap vs physical
  3D rotation).

### 3. 8-player stress test

Verify PlayerStrip layout at max count on real TV, COMMS scroll under event
volume, nameplate legibility from couch distance. At 1366×1024, strip math
leaves ~34px headroom with all 10 tiles; verify at 1920 and 4K that tiles
grow proportionally.

### 4. Live mid-play state verification — `tests/e2e/arena-states.spec.ts`

Playwright: 3-player game, drive `window.__gameStore` dev hook to force each
state, screenshot each. Target states: Nope window mid-countdown, DramaOverlay
(BURNED → EXTRACTED, ELIMINATED, INTERCEPTED, WINS), Favor banner + staging,
Triple-steal name-card sheet pre-commit and post-name, FuturePeek (read-only
and rearrange). Output to `temp/arena-states/` for eyeball review. ~30 min
per state; ~3-4 hours for the full set.

### 5. Physical hardware verification

Push commits, deploy to Cloudflare Pages (wrangler), open on actual TV with
phone controllers.

### 6. Extend PlayerAlert coverage (optional)

- **Reassign / Direct Order target** — no direct event type; victim only
  learns via `turn-started` with `turnsRemaining > 1`. Probably fine as-is
  because the target's phone sits dormant — when they come back, staging is
  lit and status reads "Your turn · 3 turns".
- **Your card was intercepted** — optimistic snapback + board DramaOverlay
  already communicate this; explicit phone toast would remove ambiguity.
  Skip until playtest reveals confusion.

### 7. Execute CSS Phase 5 — Verification & Acceptance

`/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`

### 8. Desk redesign follow-ups

- **Color check** — color blindness + reading of manila/cordovan/brass/mahogany
  palette. Needs a color-sighted eye (Harry?) before touching manila-face,
  brass tones, or tab hex. All reds currently unified through
  `--color-accent-burned`.
- **Phase 5.5 assets (skipped)** — ashtray + stubbed cigar, whisky tumbler,
  closed dossier stack. Need Imagen generation to hit quality bar. Candidates:
  upper-left desk (ashtray), opposite corner (tumbler catching venetian-blind
  light), below/beside active dossier (closed stack = "other cases").
- **Status strip height** — `.statusStrip` went 44 → 56px to host plate +
  stand. Verify on real TV that piles/dossier vertical band isn't squeezed.

### 9. Optional polish

- **Brass studs on wood frame.** CSS pseudo-elements (small radial-gradient
  dots at regular intervals on `.woodTop/.woodBottom`).

### 10. Optional test coverage expansion (deferred until visual layer stabilizes)

- **Card-drawn toast E2E** (~30 min). Extend Tier 1 spec: active phone taps
  `End turn · draw`, assert `PlayerAlert` renders `You drew {name}.`.
- **Pixel-diff regression** (~2h setup + ongoing baseline maintenance).
  Playwright `toHaveScreenshot()` with committed baselines. Requires
  `MotionConfig reducedMotion="always"` in test mode + fixed server RNG seed.
  Defer until after CSS Phase 5 lands — mid-rebuild baselines churn too fast.


---

## Landmines

Landmines no longer live in TODO.md. They found their right homes on
2026-04-23:

- **Hard-won lessons** (problem → root cause → fix → pattern) → `docs/insights/`. See `013-018` for the recent migration batch.
- **Architectural conventions** (protocol, engine invariants, client patterns, motion rules, dev tooling, Imagen workflow) → `CLAUDE.md`.
- **Canonical game rules** → `docs/RULES-REFERENCE.md`.

Nothing hides here anymore. TODO.md is for actionable items only.
