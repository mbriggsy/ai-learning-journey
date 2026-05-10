---
title: Playtest Harness Coherence Sweep (H-6)
date: 2026-04-23
phase: Harden pass H-6
status: complete
note: One-shot review-pass artifact. Mission delivered (plan set locked + Phase 1 execution unblocked). Preserved in place for historical context; not a living doc.
---

# Coherence Sweep — Playtest Harness Plan Set

## Summary

Audited the seven-document plan set (PRD + roadmap + phases 1-6) for
cross-phase contract drift, terminology consistency, and citation accuracy
after the H-1 through H-5 absorb + rigor passes. **Total findings: 12**
(2 CRITICAL, 5 IMPORTANT, 5 MINOR). The plan set is fundamentally sound —
the heavy lifting in H-1b through H-5b correctly absorbed every Phase-1 /
Phase-2 / Phase-3 contract surface that downstream phases consume. The
remaining drift is concentrated in (a) two stale phase-3 D5 paragraphs that
still talk about a Phase-4 wrapper Phase 4 explicitly removed, (b) phase-3's
"Sources & References" line citations into phase-2 (off by ~120-130 lines
after H-1b grew the unit blocks), and (c) one stale "Concrete gap" callout
in phase-1 §System-Wide Impact whose action item is already complete in
phase-2. None of these block lock — they all fix in a single targeted pass.

## Scope

Reviewed:
- `docs/testing/PLAYTEST-HARNESS-PRD.md` (v0.2)
- `docs/plans/playtest-harness/roadmap.md`
- `docs/plans/playtest-harness/phase-1-scenarios.md` (LOCKED)
- `docs/plans/playtest-harness/phase-2-playtest-mode.md` (post-H-1b)
- `docs/plans/playtest-harness/phase-3-harness-infra.md` (post-H-2b)
- `docs/plans/playtest-harness/phase-4-seat-agents.md` (post-H-3b)
- `docs/plans/playtest-harness/phase-5-triage-agents.md` (post-H-4b)
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md` (post-H-5b)

Checks performed:
1. Cross-phase contract shape mismatches (envelopes, types, constants).
2. Terminology / enumeration drift (entryType values, status values,
   SeedKind, close codes, role labels, axis counts, check counts,
   `nine decisions` literal).
3. R-number consistency vs Requirements Trace per phase.
4. Spot-check of file:line citations across phases.
5. Structural sanity of Unit numbering vs dependency declarations.

## Findings

### CRITICAL — Cross-phase contract mismatches

#### C-01 — Phase 3 D5 still claims Phase 4 owns a runtime `SeatPageWrapper` that Phase 4 explicitly deleted

**Where:**
- `docs/plans/playtest-harness/phase-3-harness-infra.md:268-286`
- `docs/plans/playtest-harness/phase-3-harness-infra.md:957-960`

**Mismatch.** Phase 3 D5 (line 279-280) reads `**Runtime enforcement is
Phase 4's job** — Phase 4 owns the wrapper that exposes only allowlisted
methods.` and (line 285-286) `Phase 4's contract tests assert the wrapper
actually rejects calls to every member of DISALLOWED_PAGE_METHODS at
runtime.` Phase 3 line 270 says `Phase 4 imports both to build the runtime
wrapper.` Phase 3 line 959 says `so Phase 4's SeatPageWrapper derives a
literal union for compile-time narrowing`.

Phase 4 D14 (`docs/plans/playtest-harness/phase-4-seat-agents.md:577-603`)
explicitly DEMOTES + REMOVES `SeatPageWrapper` from v1 with rationale
"the TS wrapper cannot enforce anything on a subagent driving MCP tools"
and replaces it with the frontmatter `tools:` whitelist as the primary
enforcement layer. Phase 4 also DELETES Unit 6 in the process (per C2 in
phase-4 line 597-598).

**Why it's CRITICAL.** Phase 3's D5 paragraph contradicts Phase 4's D14
on the architectural enforcement primitive. A reader who only reads
phase-3 will believe a runtime wrapper exists; a reader who only reads
phase-4 will believe it does not. The constants themselves
(`ALLOWED_PAGE_METHODS` / `DISALLOWED_PAGE_METHODS`) are still correct
and load-bearing as VOCABULARY (phase-4 confirms this at line 593-595
and 1062-1072) — the contradiction is purely about whether a wrapper
class CONSUMES them at runtime.

**Proposed resolution.** Edit phase-3 D5 (lines 268-286) to:
- Remove the claim that "Phase 4 imports both to build the runtime
  wrapper" (line 270).
- Remove the claim that "Runtime enforcement is Phase 4's job — Phase 4
  owns the wrapper that exposes only allowlisted methods" (lines 279-280).
- Remove "Phase 4's contract tests assert the wrapper actually rejects
  calls to every member of `DISALLOWED_PAGE_METHODS` at runtime" (lines
  284-286).
- Replace with: "Runtime enforcement of the agent's tool surface lives
  in the subagent frontmatter `tools:` whitelist
  (`.claude/agents/playtest-seat.md`, phase-4 D2 / Unit 1b). Phase 3's
  constants are CANONICAL VOCABULARY that human reviewers cite when
  authoring the MCP-tool whitelist — not runtime enforcement primitives.
  Phase 3's self-test check 5 still validates the constants exist and
  that `DISALLOWED_PAGE_METHODS` covers eval / network / nav."
- Edit phase-3 line 957-960 to drop "so Phase 4's `SeatPageWrapper`
  derives a literal union for compile-time narrowing" — replace with
  "so any future orchestrator-side type-narrowing helper (Phase 4 C2
  decided not to ship one in v1) can derive a literal union, and so
  human reviewers can cite the exact set when authoring the MCP-tool
  whitelist."
- Phase 3 line 268 ("Phase 4's `SeatPageWrapper` (if retained per
  phase-4 C2) derives its public type from those literal unions") is
  hedged language and is technically still consistent — but tightening
  it to "any future orchestrator-side helper" is cleaner.

#### C-02 — Phase 1 §System-Wide Impact "Concrete gap" callout is stale (Phase 2 already implemented the fix)

**Where:**
- `docs/plans/playtest-harness/phase-1-scenarios.md:958-967`

**Mismatch.** Phase 1's "Concrete gap" callout reads:
`**Concrete gap:** the current docs/plans/playtest-harness/phase-2-playtest-mode.md
god-event envelope ({ type: 'god-event', action, events, stateVersion,
nowMs }) has no projections field. Harden pass (task #8) MUST extend the
envelope to { ..., projections: Record<playerId, PlayerView>, boardView:
BoardView } and add a Phase 2 implementation unit for the per-viewer
projection broadcast.`

Phase 2 D4 (`docs/plans/playtest-harness/phase-2-playtest-mode.md:160-183`)
NOW carries the extended envelope `{ type: 'god-event', action, events,
stateVersion, nowMs, projections: Record<playerId, PlayerView>,
boardView: BoardView }` and Phase 2 Unit 6a
(`phase-2-playtest-mode.md:1007-1166`) ships the per-viewer projection
broadcast. The "Harden pass (task #8) MUST extend..." imperative was
satisfied during H-1a/H-1b.

**Why it's CRITICAL (technically — actually MINOR-CRITICAL).** The
factual claim in phase-1 is now wrong (current phase-2 envelope DOES
have `projections`). Since phase-1 is LOCKED, leaving the stale callout
in place creates a contradiction-by-source. A reader following the
callout will go to phase-2 expecting to find the gap — and find the
opposite.

**Proposed resolution.** Phase-1 is LOCKED, so the canonical fix is
to add a one-line follow-up note rather than rewrite the bullet. Edit
phase-1 line 962-963 to add an inline annotation:
`(STATUS: addressed in H-1a — phase-2 D4 envelope now carries projections
+ boardView; Unit 6a ships the per-viewer projection broadcast)`. Or, if
phase-1 is allowed minor edits during the lock-log update, simplify the
bullet to past tense: "Phase 2 inherits R7: shipped in H-1a/H-1b. See
phase-2 D4 (envelope) and phase-2 Unit 6a (helper)."

This is a CRITICAL-class finding because phase-1 is the LOCKED root
contract; an unaddressed contradiction propagates through every
downstream review.

### IMPORTANT — Terminology / enumeration drift

#### T-01 — Phase 3's "Sources & References" line citations into phase-2 are systematically off after H-1b unit growth

**Where:**
- `docs/plans/playtest-harness/phase-3-harness-infra.md:2287-2295`

**Citations (claimed → actual):**
- `phase-2 Unit 4 — phase-2-playtest-mode.md:561-655` → actual Unit 4 at
  `phase-2-playtest-mode.md:690-784` (line 561 is in Unit 1b health-endpoint).
- `phase-2 Unit 5 — phase-2-playtest-mode.md:656-748` → actual Unit 5 at
  `phase-2-playtest-mode.md:785-877`.
- `phase-2 Unit 6 — phase-2-playtest-mode.md:749-867` → actual Unit 6 at
  `phase-2-playtest-mode.md:878-1006`.
- `phase-2 Unit 6a — phase-2-playtest-mode.md:868-1087` → actual Unit 6a at
  `phase-2-playtest-mode.md:1007-1166`.
- `phase-2 Unit 8 — phase-2-playtest-mode.md:1117-1122` → actual Unit 8 at
  `phase-2-playtest-mode.md:1242-1318`. (Line 1117-1122 lands inside
  Unit 6a's test scenarios.)

The phase-2 D4 citation at phase-3 line 2285 (`160-183`) IS still correct.

**Why drift happened.** H-1b's rigor pass added Unit 1b (health endpoint),
hibernation prose, payload-budget rationale, and split-envelope metadata
discussion — all of which inflated unit body sizes and shifted line
numbers downstream. The "Sources & References" citations were not
re-anchored after the body grew.

**Proposed resolution.** Mechanical update — re-grep phase-2 for `^- \[ \] \*\*Unit ` headers
and replace each line range in phase-3:2287-2295 with the actual range.
Five citations to fix.

#### T-02 — Phase 3 cites phase-2 "test scenarios" (line 1117-1122) where it means Unit 8's smoke flow

**Where:**
- `docs/plans/playtest-harness/phase-3-harness-infra.md:2294-2295`

The citation text "Unit 8 — payload budget (< 512 KiB at N=10) + per-viewer
split trigger" is conceptually correct and the topical context is valid;
the line range (1117-1122) just lands in Unit 6a's test scenarios. After
T-01's mechanical fix this resolves automatically — calling out separately
because the COMMENTARY ("payload budget...split trigger") is what readers
care about and that commentary is fine.

**Proposed resolution.** Subsumed by T-01.

#### T-03 — Phase 3 self-test counted as "8 checks" everywhere, but Phase 6 inconsistently calls it "8 checks per phase-3 Unit 7" vs "the self-test underneath runs all 8 checks"

**Where:**
- `docs/plans/playtest-harness/phase-3-harness-infra.md:1586` (`eight isolation and privacy checks`)
- `docs/plans/playtest-harness/phase-3-harness-infra.md:1603` (`Run the eight checks`)
- `docs/plans/playtest-harness/phase-3-harness-infra.md:1608` (`The eight checks:`)
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md:142-145` ("self-test itself runs 8 checks including the scrubber (check 7) and retention-rotation (check 8) gates...but at the Phase 6 layer this counts as one pre-flight check")
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md:345` (`pnpm playtest:selftest # must be green (8 checks per phase-3 Unit 7)`)
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md:386-389` (Phase 6 pre-flight checks 1-6, with check 1 = "stamp < 24h old (phase-3 D10; 8 checks per phase-3 Unit 7 including scrubber + retention)")

This is actually CONSISTENT — 8 checks at phase-3 layer, 6 checks at
phase-6 layer (the latter includes "selftest stamp fresh" as one of its
six). Calling out as IMPORTANT because the layered numbering is fragile —
a reader skimming phase-6 might confuse the two and conclude
phase-6 owns 8 checks too.

**Proposed resolution.** No code change required; flagging here for the
lock log so readers know the two number sets don't conflict — they
nest. Optionally add a one-line note in phase-6 Unit 1 ("phase-6
pre-flight has 6 checks; phase-3 self-test has 8; these are distinct
layers") for future-reader clarity. Acceptable to defer to H-7 lock pass.

#### T-04 — Phase 6 calibration "nine decisions" literal is consistent across phase-6, but phase-3 D14 mentions `crypto.randomBytes(32).toString('hex')` token + salt without naming the count

**Where:**
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md:194` (`enumerated **nine** decisions`)
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md:227` (`When ≥3 of the nine decisions defer`)
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md:335` (`the nine decisions above stay tune-the-instrument`)
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md:918` (`for each of the nine decisions before this unit runs`)
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md:1037` (`DEFER each of the nine decisions as appropriate`)

All five "nine" references inside phase-6 are mutually consistent and
align with §Calibration Output items 1-9. Phase-6 §Appendix A has 9 rows
in the retrospective table. No drift.

**Why this is IMPORTANT-flagged.** No external phase mirrors the count;
phase-3 / phase-5 do not need to know it; phase-1 doesn't either. So this
is internal-to-phase-6 only and acceptable. Calling out for completeness
because the source prompt asked to verify it.

**Proposed resolution.** No edit. CONSISTENT.

#### T-05 — `entryType` four-value enumeration consistent across phases 4/5/6, with rename `info-gap-divergence` → `ui-spec-divergence` cleanly applied

**Where:**
- Phase 4 D5 (`phase-4-seat-agents.md:394-419`) declares the four values
- Phase 4 R8/R14 + C4 announce the rename
- Phase 5 R12 + D14 (`phase-5-triage-agents.md:111-113, 426-437`)
  consume the four values
- Phase 6 D10 (`phase-6-calibration-and-first-session.md:184-191`)
  enumerates the four values per phase-4 D5 / phase-5 D14

Grep confirms `info-gap-divergence` appears 22 times in phase-4, 6 times
in phase-5, 4 times in phase-6, 0 times in phase-3 / phase-2 / phase-1.
ALL such references are in deprecation-transition / rename-context wording
(e.g. `RENAMED from info-gap-divergence per phase-4 C4`,
`legacy entryType: 'info-gap-divergence' entries`,
`grep the rendered prompts for info-gap-divergence → zero hits`). NONE
present `info-gap-divergence` as the canonical name. Rename is
**fully propagated**.

**Proposed resolution.** No edit. CONSISTENT.

### MINOR — Citation accuracy

#### M-01 — Phase 4 references `phase-4 line 670` but doesn't qualify the source phase

**Where:**
- `docs/plans/playtest-harness/phase-2-playtest-mode.md:1125` reads
  `at phase-1 line 670`

**Verification.** Phase 1 line 670 is the start of the named-steal
projection-field path correction (`docs/plans/playtest-harness/phase-1-scenarios.md:670-674`).
The citation is **CORRECT**. Calling out because the citation pattern
is unusual elsewhere in the corpus (most cites use `:line` notation,
this one uses `line N`). Cosmetic only.

**Proposed resolution.** Optional — change to `phase-1-scenarios.md:670` for consistency.

#### M-02 — Phase 3 D11 viewport list, phase-1 axis 15 list, phase-3 R9, and phase-6 series config viewport list all match

**Where:**
- `docs/plans/playtest-harness/phase-1-scenarios.md:451`
- `docs/plans/playtest-harness/phase-3-harness-infra.md:71` (R9), `:354-359` (D11)
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md:355, 410`

All four sources cite the same three viewports: 360×640, 390×844, 768×1024.
**CONSISTENT**.

**Proposed resolution.** No edit.

#### M-03 — Phase 6 cites `phase-3 Unit 4 generous default; hibernation pauses may exceed — phase-6 Unit 7 retrospective retunes if observed`, which matches phase-3 D14 (`5000 ms` default + Phase 6 retune flag)

**Where:**
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md:179-180` (D9)
- `docs/plans/playtest-harness/phase-3-harness-infra.md:907` (Config field default 5000)
- `docs/plans/playtest-harness/phase-3-harness-infra.md:1287-1294` (Unit 4 reassembly timeout)

**CONSISTENT**. Phase-3 Unit 1 declares the field with default `5000`,
Unit 4 implements the timeout, phase-6 D9 inherits + Unit 7 retunes.

**Proposed resolution.** No edit.

#### M-04 — `freePlayWallclockFraction: 0.20` consistently cited across phase-3 D12, phase-6 R7 / D9, and phase-4 prompt rendering

**Where:**
- `docs/plans/playtest-harness/phase-3-harness-infra.md:374-377` (D12)
- `docs/plans/playtest-harness/phase-3-harness-infra.md:905` (Config field default)
- `docs/plans/playtest-harness/phase-4-seat-agents.md:524-525` (D13)
- `docs/plans/playtest-harness/phase-6-calibration-and-first-session.md:73, 175, 356` (R7 + D9 + calibration config)

**CONSISTENT**. The `0.20` literal default appears identically across
all four sources.

**Proposed resolution.** No edit.

#### M-05 — Token / salt format `crypto.randomBytes(32).toString('hex')` (64 hex chars) consistent across phase-3 D14, Unit 3b, Unit 6, and System-Wide Impact

**Where:**
- `docs/plans/playtest-harness/phase-3-harness-infra.md:411` (D14:
  `64 hex chars each`)
- `docs/plans/playtest-harness/phase-3-harness-infra.md:1163-1166` (Unit 3b:
  `64 hex chars` for both mintPlaytestToken and mintScrubSalt)
- `docs/plans/playtest-harness/phase-3-harness-infra.md:1122-1124` (Unit 3:
  defense-in-depth check `token.length !== 64 || !/^[0-9a-f]{64}$/.test(token)`)
- `docs/plans/playtest-harness/phase-3-harness-infra.md:1183` (Unit 3b
  test: `match /^[0-9a-f]{64}$/`)
- `docs/plans/playtest-harness/phase-3-harness-infra.md:567-568` (HTD
  step 4: `64 hex chars from crypto.randomBytes(32).toString('hex')`)
- `docs/plans/playtest-harness/phase-3-harness-infra.md:2178` (System-
  Wide Impact: `mints a 64-hex-char token`)

**CONSISTENT** — six independent mentions, identical 64-hex-char shape.

**Proposed resolution.** No edit.

## Resolved by upstream plans

The following items were drift candidates BEFORE the H-* harden passes and
have been fully resolved by the time this sweep ran. Documented here for
the lock log so future readers can see the resolution chain.

- **R7 contract (phase-1 R7):** stub-acceptable axis-11 `projection-
  assertions:` with Phase 2 dependency declared. **Resolved in H-1a.**
  Phase-2 D4 (`docs/plans/playtest-harness/phase-2-playtest-mode.md:160-183`)
  ships the extended envelope with `projections: Record<playerId,
  PlayerView>` + `boardView: BoardView`; Phase-2 Unit 6a builds + verifies
  it. (Stale phase-1 callout flagged as C-02 above is the LOCKED-doc
  follow-up.)

- **`SeatPageWrapper` runtime enforcement vs frontmatter whitelist:**
  Phase-2 / Phase-3 originally assumed the wrapper could enforce against
  a subagent. **Resolved in H-3b** at phase-4 D14 (subagent MCP tool
  routing means a TS wrapper in the orchestrator process is invisible to
  the subagent; only the frontmatter `tools:` whitelist enforces). Phase-3
  text follow-up flagged as C-01 above.

- **`info-gap-divergence` → `ui-spec-divergence` rename (phase-4 C4):**
  Phase-5 dependency declared in phase-4. **Resolved in H-4a/H-4b** —
  phase-5 R10 + D14 + Unit 1 prompt + Unit 3 fixture all reference the
  new name; deprecation-transition coercion path acknowledged.

- **`sessionTimeoutMs` field as required per-Config (phase-6 H-5b
  upstream patch):** **Resolved in H-2b/H-5b**. Phase-3 Unit 1 Config
  shape (`docs/plans/playtest-harness/phase-3-harness-infra.md:896-899`)
  declares `sessionTimeoutMs: number // required per-config; no
  harness-side default. Caller sets...`. Phase-6 series configs inherit
  + scale.

- **Phase 3 D5 allowlist constants `as const` literal-union shape (phase-4
  I3 upstream patch):** **Resolved in H-3a/H-3b**. Phase-3 Unit 1
  (`docs/plans/playtest-harness/phase-3-harness-infra.md:962-973`) declares
  both `ALLOWED_PAGE_METHODS` and `DISALLOWED_PAGE_METHODS` `as const`
  with derived literal-union types.

- **Phase 3 self-test 8 checks (phase-3 H-2b C7 upstream patch + phase-6
  inheritance):** **Resolved in H-2b**. Phase-3 Unit 7 enumerates 8 checks
  including the new check 7 (scrubber on every write) and check 8
  (retention evicts a synthetic dated dir). Phase-6 D7 references
  "8 checks per phase-3 Unit 7" correctly.

- **`expectedViewerIds` split-envelope metadata field (phase-2 D4
  "Split-envelope metadata fields" + phase-3 Unit 4 reassembly buffer):**
  **Resolved in H-1b/H-2b**. Phase-2 D4 declares the field; Phase-3
  Unit 1 mirrors it on `GodEvent` (optional); Phase-3 Unit 4 reassembly
  consumes it as authoritative completion signal; Phase-6 Unit 1 check 5
  feature-detects it on the live god WS handshake.

- **Phase 5 `LOW-SIGNAL` fifth terminal status (phase-5 D5 / Ruling B):**
  **Resolved in H-4b**. Phase-5 D5 enumerates five terminal states
  (`OPEN`, `BLOCKED`, `DUPLICATE`, `KNOWN-PRODUCT-CALL-CONFIRMED`,
  `LOW-SIGNAL`); Phase-5 Unit 4 INDEX.md sections include the LOW-SIGNAL
  bucket with disclaimer; Phase-6 Unit 5 verification step 4 reads
  status counts.

- **`SeedKind` 7-value union (phase-5 HTD):** **Resolved in H-4b**.
  Phase-5 declares 7 SeedKind values: `scripted-scenario`, `free-play`,
  `vibe-check`, `ui-spec-divergence`, `role-drift`,
  `with-divergence-fire`, `coverage-divergence`. Phase-5 INDEX.md (Unit
  4) renders one section per kind plus known-product-calls-confirmed.

- **Tri-state `FireRecord.matched` (phase-3 D9.1 / B4):** **Resolved in
  H-2b**. Phase-3 D9.1 + Unit 9 declare `'clean' | 'with-divergence' |
  'no-fire'`; Phase-3 Unit 10 / D13 / B5 counts both `clean` and
  `with-divergence` toward `firedCount`; Phase-5 D17 consumes
  `'with-divergence'` as a first-class seed signal.

- **`ConnectionEvent.reason: 'natural' | 'orchestrator-driven'` (phase-3
  C8):** **Resolved in H-2b**. Phase-3 Unit 1 declares the field;
  Phase-3 Unit 9 tier-3 matcher filters; Phase-3 Unit 6 step 11 explicitly
  writes `'orchestrator-driven'` on viewport rotations; Phase-4 prompt
  body (D17 + scripted/free-play templates) instructs agents not to
  flag orchestrator-driven reconnects as anomalies.

## Lock recommendation

**The plan set is READY for H-7 lock AFTER three small targeted edits:**

1. **C-01 fix** — phase-3 D5 prose must stop claiming Phase 4 owns a
   runtime `SeatPageWrapper`. Specific edits enumerated under C-01 above.
   Phase-3 lines 268-286 and 957-960. Single-pass edit, no cross-doc
   ripple.

2. **C-02 fix** — phase-1 §System-Wide Impact "Concrete gap" callout
   needs a status annotation noting H-1a/H-1b shipped the fix. Specific
   edit enumerated under C-02 above. Phase-1 lines 962-963 (LOCKED doc;
   one-line annotation acceptable per the lock-log update process).

3. **T-01 mechanical fix** — phase-3 Sources & References lines 2287-2295
   need five line-range citations re-anchored to phase-2's current line
   numbers (Unit 4 → 690-784, Unit 5 → 785-877, Unit 6 → 878-1006,
   Unit 6a → 1007-1166, Unit 8 → 1242-1318).

The IMPORTANT and MINOR findings (T-02 through T-05, M-01 through M-05)
either subsume into the three CRITICAL fixes (T-02 → T-01) or are
already CONSISTENT and require no edit.

**No structural rework is required.** The H-1 through H-5 absorb passes
correctly threaded every Phase-1 contract (vibe-check, three-tier fire
signature, 7×2 info-gap, free-play, known-product-call) through the
downstream phases. The H-1b through H-5b rigor passes correctly added
the security primitives (per-session token, scrubber salt, fail-closed
contract, rate-limited god auth) and the calibration-output structure.
The remaining drift is concentrated in three specific text passages and
five specific line citations.

After the three-edit pass: lock the plan set, flip phase status from
`draft` to `shipped`-on-Phase-6-success (or `locked` per phase-6 Unit 6),
and proceed to Phase 1 execution.
