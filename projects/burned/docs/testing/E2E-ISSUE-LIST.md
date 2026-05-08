# BURNED — E2E Issue List

> **Generated:** 2026-04-23 overnight audit, 5 parallel investigation agents.
> **Baseline at audit start:** 371/371 Vitest, 15/15 Playwright, typecheck clean.
> **Total findings:** 89 (17 P0 / 42 P1 / 30 P2).
> **Post-remediation:** 399/399 Vitest, 15/15 Playwright, typecheck clean.
> **Current (2026-04-23 post-audit):** 414/414 Vitest, typecheck clean — 15 additional regression tests landed after the audit remediation block.
> **Source reports:** `temp/audit/A-rules-fidelity.md`, `B-disconnect-session.md`, `C-visual-fidelity.md`, `D-input-abuse.md`, `E-validation-boundary.md`.
> **Screenshots:** `temp/audit/screenshots/` (65 files).

## 🟢 Shipped overnight (25 fixes, 28 new regression tests)

**P0 fixes (11):** E-01 card-drawn privacy, E-02 byte cap, E-03 bundle verifier,
C-05 exhaustive-never crash, A-01 single Intercept, C-02 join name, C-06 staged
name, C-01 lobby overflow, C-03 portrait splash, C-04 themed ErrorBoundary,
D-01 intercept lock.

**P1 fixes (14):** C-22 #undefined guard, C-14 drama holdMs, C-08 NAME_MAX,
D-02 draw lock, D-05 StealReport debounce, D-20 NameCard Escape, C-23 target
Unknown, C-20 pill clip, E-04/E-05/E-06/E-07 Zod cluster, B-08 persist reset,
B-09 msg exhaustive, A-02/A-05/A-06/A-07/A-08 test coverage, D-17 regex pre-validate.

**📋 6 P0s decided by-design (no engineering):** B-03/04/05/06/07/13
disconnect-wedge cluster — see "Disconnect-wedge cluster" section
below for product-call rationale (couch-of-friends context; kill tab,
start over).

**🟢 D-03 simultaneous-Nope race shipped 2026-04-23 in `16942a1b`** —
client `nope` action carries `windowGeneration`; engine rejects
stale-gen Nopes (protocol bumped 2 → 3). The "still blocked on
Briggsy's call" framing was the pre-fix posture; resolution went
mechanical (generation-gated rejection) rather than UX-design.

**Audit cleanup 2026-05-07:** the 🔴 → 🟢 status flips on the table
rows below were back-filled in a single sweep after spot-checks
during the C-30..C-33 triage cleanup found rows that had been left
🔴 even though their commits had landed weeks earlier. Each shipped
row now cites its commit. The ⏸ rows (C-13, C-15, C-16-19) and the
remaining 🔴 rows (C-07/09/10/11 — 4 IDs after the 2026-05-07
evening sweep + C-21 + C-12 closures below) are genuinely-open
per the same commit-history audit. Visual rows need Briggsy-eye review
before they're actionable solo. (B-12, B-17, C-25, D-04, D-15, D-16
were closed inline by additional 2026-05-07 commits — see their rows
for citations.)

**2026-05-07 evening sweep — 6 of 12 truly-open rows closed:**
B-14 (`774fbf4a`), B-02 (`6843cce7`), E-08 (`eae3ce96`), B-11
(`37e43fa0`), B-01 (`6d885080`), D-23 (this commit). The five non-test
rows ship with new E2E test coverage (host-disconnect-lobby,
identify-timeout, host-session-token, plus extension to
join-screen-server-error). D-23 ships with 4 new engine-level tests
covering Intel Briefing + Falsify Intel against deck sizes 0/1/2.

**Truly-open 🔴 rows after sweep: 4 — all visual** (C-07, C-09, C-10,
C-11). Need design-eye input before they're solo-actionable.

**C-21 closure 2026-05-07:** measurement re-test via chrome-devtools-mcp
confirmed C-21 was resolved by side-effect of `308bbdbf` (2026-04-27,
"pin .cardDesc to 2lh" — landed 4 days after the original 2026-04-23
audit). Five viewports × six scroll positions × stage-transition probe —
all within-hand heights uniform at every measurement. Mechanism documented
in the C-21 row.

**C-12 closure 2026-05-07 (this commit):** repro'd at 667×375 (iPhone SE
landscape — smallest realistic landscape board host) — folder shrank to
170px wide, ticker container 123px, "// AWAITING TRANSMISSION" at the
10px font floor needed 197px → 74px paint overflow past the manila edge.
Fixed by adding `overflow: hidden` to `.ticker` and `flex: 1 1 0;
min-width: 0; overflow: hidden; text-overflow: ellipsis` to `.tickerLine`
in `DossierFeed.module.css`. Verified post-fix at 667×375 (legible
ellipsis, cursor still visible) and 1280×720 (full text, no regression).

**Audit follow-up 2026-05-07 (later pass + inline fixes):** D-16 +
D-15 found to have been shipped in `d9c40753` and `b7824600`
respectively but were missed by the first sweep because the commit
messages referenced topic IDs ("TODO #11", "ACTOR nope-window
awareness") not the issue IDs. A topic-grep follow-up would catch
ID-disconnects of this kind but would be slow and noisy; the cheaper
move is to require future fix commits to cite the issue ID in the
subject (e.g. "fix(...): close X-NN — {summary}"). Inline fixes the
same day landed C-25 (`1456aea1`), B-17 (`45184648`), D-04
(`a8984d1b`), and B-12 (`d6c96f65`); a same-race-class harden sweep
(`6a3d0f92`) tightened DefusePlacement + TargetSelect against the
same closure-staleness pattern that B-17 surfaced. Remaining 🔴 IDs
were spot-checked via topic search and have no obvious fix commit;
treating them as actually-open.

## Legend

| Status | Meaning |
|--------|---------|
| 🔴 OPEN | Not started |
| 🟡 IN-PROGRESS | Being fixed now |
| 🟢 FIXED | Landed + verified (tests + Playwright where applicable) |
| ⏸ BLOCKED | Needs Briggsy decision (design/product call) |
| 📋 BY-DESIGN | Product decision made — accepted as-is, no engineering |
| 🏷 LOGGED | Test-coverage gap — noted, not urgent |

## Severity guide

- **P0** — game-breaking, privacy/security leak, state corruption, zero-trust bypass, cropped/broken UI on primary viewport
- **P1** — rule violation with workaround, UX fault, subtle edge case, overflow
- **P2** — polish, defense-in-depth, documentation drift

---

## P0 findings — 17 items

### Security / privacy cluster

| ID | Title | Status | Fix |
|----|-------|--------|-----|
| **E-01** | `card-drawn.cardType` leaks drawn card identity to every opponent + board | 🟢 | Shipped 2026-04-23 in `35e87dd9` — `stripPrivateEventFields` keeps cardType only for `viewerId === event.playerId`. |
| **E-02** | 4KB message cap uses `.length` (UTF-16 chars) not bytes — 4× DoS bypass | 🟢 | Shipped 2026-04-23 in `bf08fa04` — measure WS message cap in UTF-8 bytes via `TextEncoder`. |
| **E-03** | `window.__gameStore` DCE relies on Vite static replacement — no regression test for prod bundle | 🟢 | Shipped 2026-04-23 in `adf26d46` — `verify-prod-bundle.ts` greps `dist/**/*.js` for forbidden DEV-only strings. |

### Crash / systemic failure cluster

| ID | Title | Status | Fix |
|----|-------|--------|-----|
| **C-05** | `formatEvent` default arm uses `return _exhaustive` (TypeScript-exhaustive, runtime-trap). Unknown event → render object → ErrorBoundary. Cumulative event log replays on remount → permanent lock. | 🟢 | Shipped 2026-04-23 in `e4b40101` — unknown GameEvent types return `null`, not the event object. |
| **C-04** | ErrorBoundary "Recovering..." fallback is inline grey-on-black 16px text — invisible on a TV across the room | 🟢 | Shipped 2026-04-23 in `7cccfffe` — themed Comms-scrambled fallback with design tokens + display font. |

### Layout / readability P0 cluster

| ID | Title | Status | Fix |
|----|-------|--------|-----|
| **C-01** | 10-player lobby overflows 1920×1080 TV — CLEARED HOT start button ~217px below fold. Worse on 1440×900. | 🟢 | Shipped 2026-04-23 in `1e40c086` — 2-column roster grid when players > 5; bottom-visible start button. |
| **C-02** | JoinScreen `joinedName` truncates the legal 12-char maxLength — "DASH BARLOWE" → "DASH BAR…" on every phone. Player's first confirmation their name was accepted is visually butchered. | 🟢 | Shipped 2026-04-23 in `b672e2a1` — 12-char hero name no longer truncates on any phone. |
| **C-03** | Board on iPad-portrait (1024×1366) broken: DrawPile count overlapped by discard, PlayerStrip cut off left, COMMS stretched. Spec is landscape-only but no orientation guard. | 🟢 | Shipped 2026-04-23 in `50c23077` — portrait orientation splash at board entry point. |
| **C-06** | Staged `vera-khan` name truncates to "VERA KI•" at 360×640 — `text-overflow: clip` cuts mid-character on legal 9-char codename | 🟢 | Shipped 2026-04-23 in `5c458dde` — hide name on tiny staged miniature; ellipsis fallback. |

### Disconnect-wedge cluster — DECIDED BY-DESIGN (2026-05-02)

**Product call:** Option (a) — keep current policy. No engineering.

**Rationale:** BURNED is played by a couch-of-friends, not internet
strangers. If a player disconnects (phone in toilet, browser crash,
WiFi drop), the rest of the crew is sitting right there and knows
immediately. The 15-min INACTIVITY_TIMEOUT is irrelevant in this
context — the simple resolution is: everyone kills their browser tab
and starts a new game in ~5 seconds. Engineering 5 disconnect handlers
+ 5 safe-default decisions + tests for a non-problem IS the
compromise. The wedge only matters in a stranger-context game where
players can't communicate out-of-band, and BURNED is not that game.

| ID | Title | Status |
|----|-------|--------|
| **B-03** | `name-card-pending` + stealer disconnects → room frozen until 15-min nuke | 📋 |
| **B-04** | `defuse-pending` + drawer disconnects → room frozen, Burned stuck in dead hand | 📋 |
| **B-05** | `favor-pending` + target disconnects → room frozen | 📋 |
| **B-06** | `future-rearrange-pending` + peeker disconnects → room frozen | 📋 |
| **B-13** | Active player mid-`turn-active` disconnects → turn never advances | 📋 |
| **B-07** | Meta-finding: only Nope window has disconnect-safety machinery. All other prompts lack `scheduleNopeExpiry`-shaped infrastructure. | 📋 |

**Future-Claude note:** if a calibration / triage agent re-surfaces
any of B-03/04/05/06/07/13 as "needs product call," route to this
section. The decision is locked. Do NOT re-recommend Option (b)
("auto-resolve with safe defaults") even though it's superficially
nicer-sounding — it was rejected for a stronger product reason than
appears on paper.

### Input abuse P0

| ID | Title | Status | Fix |
|----|-------|--------|-----|
| **D-01** | Intercept button has no optimistic lock; `nope` action is stateVersion-exempt — 5 rapid taps burn 5 Intercepts in ~500ms | 🟢 | Shipped 2026-04-23 in `c0a12abf` — optimistic hand lock on Intercept tap. |
| **D-03** | Two simultaneous Nopes stack by arrival order with no "someone noped" broadcast — second Noper's Yup re-enables an action the first Noper thought they killed | 🟢 | Shipped 2026-04-23 in `16942a1b` — `nope` action carries `windowGeneration`; engine rejects stale-gen Nopes (protocol v3). |

---

## P1 findings — 42 items

### A (rules) — 5

| ID | Title | Status |
|----|-------|--------|
| **A-01** | Server `handleSingleCard` accepts single `intercepted` plays — strips card from hand, opens Nope window, errors on resolve. Card permanently lost if client bypasses `validateCombo`. **Shipped 2026-04-23 in `bc081172`** — engine rejects single Intercepted plays upfront (zero-trust). | 🟢 |
| **A-02** | Eliminated-while-under-attack: `turnsRemaining` evaporates. Behavior is defensible but un-tested; rule ambiguous. | 🏷 |
| **A-05** | 2-of-a-kind Noped cleanup: `pendingSteal` cleared correctly but no test asserts it | 🏷 |
| **A-06** | 3-of-a-kind cancel-then-reselect flow untested | 🏷 |
| **A-07** | Favor nope-window-before-favor-give timing correct but untested | 🏷 |

### B (disconnect/session) — 8

| ID | Title | Status |
|----|-------|--------|
| **B-01** | Host has no session token — another tab can race-steal the host role on WiFi blip. **Shipped 2026-05-07 in `6d885080`** — board mints a UUID stored in sessionStorage and sends it in `host-connect`. Server tracks `hostSession`; reclaim requires matching token; mismatch is rejected with `Room already has a host`. Persisted across DO restarts. Disconnect grace (3s, shared with B-02) holds the token so blip-reclaim works. E2E proves both rejection of a thief and reclaim of the original holder after grace expiry. | 🟢 |
| **B-02** | Host-disconnect-during-lobby is silent; game can't start, no UI signal. **Shipped 2026-05-07 in `6843cce7`** — `LobbyView` gains `hostConnected: boolean`; server flips it false after a debounced 3s host-disconnect. JoinScreen swaps the joined-state waiting label from "Standing by, awaiting deployment" to "// HOST OFFLINE" in accent-burned. E2E: 2 phones join, board.close(), phones see the swap within 6s. | 🟢 |
| **B-11** | Rejoin after game_over: only host can trigger `return-to-lobby`; if host tab closed at victory screen, room is stuck. **Shipped 2026-05-07 in `37e43fa0`** — `handleReturnToLobby` widened: in `game_over` phase, host OR any player can trigger; in `playing` phase, host-only privilege preserved. Player.tsx now passes `onPlayAgain` so phones get a "Run It Back" button. | 🟢 |
| **B-12** | Protocol version check is server → client only; old clients get admitted and burn player slots. **Shipped 2026-05-07** — `join` payload now carries optional `protocolVersion`; server's `handleClientMessage` rejects mismatches with the new `PROTOCOL_MISMATCH` error code BEFORE allocating a slot. `PROTOCOL_VERSION` bumped 4 → 5 to mark the wire-format change. Client `gameStore` mirrors the rejection onto `_protocolMismatch` so the existing polished mismatch UI handles it. Verified live via Playwright: happy path joins cleanly; old-client style join (no `protocolVersion`) gets rejected within 1ms with the error message "Game updated — please refresh," no slot allocated. | 🟢 |
| **B-14** | SessionStorage-wiped player who mistypes their name gets dead-end `GAME_ALREADY_STARTED` — no "did you mean" list of disconnected names. **Shipped 2026-05-07 in `774fbf4a`** — server computes the list of disconnected (reclaimable) names and ships them on the error payload. JoinScreen renders a "// Resume as" picker; tapping a name auto-submits and reclaims via the existing name-reclaim path. Privacy bar unchanged (only un-connected names are listed; connected players never appear). | 🟢 |

### C (visual) — 13

| ID | Title | Status |
|----|-------|--------|
| **C-07** | Nameplate brass "stand" is 4-6px tall on 1920 — reads as underline | 🔴 |
| **C-08** | PlayerStrip `NAME_MAX = 7` hard-coded — "DASH B…" on 1920 where 150px per tile easily fits 12 chars. Short names (`Kimi R.`) don't truncate, creating visual inconsistency. **Shipped 2026-04-23 in `5d424d49`** — drop aggressive `NAME_MAX=7` truncation. | 🟢 |
| **C-09** | NameCard grid + "CALL OFF THE RAID" button below fold on 360×640 | 🔴 |
| **C-10** | NopeCountdownBar floats above arena frame — reads as browser notification, not spy tension | 🔴 |
| **C-11** | DossierFeed side CASE FILE + inner CLASSIFIED stamp are two-of-a-kind competing for attention | 🔴 |
| **C-12** | Channel ticker `// AWAITING TRANSMISSION` would wrap on narrower containers (phone overlays). **Shipped 2026-05-07 (this commit)** — `.ticker { overflow: hidden }` + `.tickerLine { flex: 1 1 0; min-width: 0; overflow: hidden; text-overflow: ellipsis }`. Pre-fix repro at 667×375 (iPhone SE landscape): folder shrank to 170px wide → ticker container 123px → "// AWAITING TRANSMISSION" at the 10px font-size floor needed 197px → 74px paint overflow past the manila edge with `overflow: visible`. Post-fix at 667×375: line painted 110px inside 123px, ellipsis truncates legibly, cursor stays visible at right edge; verified no regression at 1280×720 (line 477px, no truncation, full text). The audit's "would wrap" wording was structurally inaccurate (the line had `white-space: nowrap`, so it overflowed instead of wrapping) but the symptom they were guarding against — text painting beyond the ticker band — was real and reproducible. | 🟢 |
| **C-13** | 11 of 17 card illustrations are 384×384 square art letterboxed in 5:7 frames → ~29px teal mat top+bottom. Inconsistent with operative portraits (tall aspect, fill-to-edge). Cuts against the Archer edge-to-edge feel. | ⏸ (asset regen decision) |
| **C-14** | INTERCEPTED drama hold 800ms, EXTRACTED 1000ms — too short to read from couch across a 15ft room. **Shipped 2026-04-23 in `1db5ddab`** — drama hold extended; transient INTERCEPTED beat aborts on `turn-started` (later refined). | 🟢 |
| **C-15** | Board shows `{NAME} BURNED` text while drawer sees the CARD — board arguably should get the card variant too (it's the narrator) | ⏸ (product call) |
| **C-20** | Active player "ACTIVE" pill on PlayerStrip clips tile's top border; +2 turns badge crams against card count. **Shipped 2026-04-23 in `a9a8e373`** — PlayerStrip pill spacing fix. | 🟢 |
| **C-21** | Hand cards render 368 vs 389 tall depending on `@container (min-width: 177px)` — neighbor heights bounce during scroll-snap. **Resolved by side-effect of `308bbdbf` (2026-04-27, post-audit)** — `.cardDesc { min-height: 2lh }` floors single-line description cards (Agent X, Burn the Files, Intel Briefing, Scramble) to the same content min-height as multi-line ones. Pre-fix, single-line desc cards collapsed and 2-line desc cards' min-content height could exceed the aspect-ratio-derived height (CSS `aspect-ratio` is a hint, not a hard cap), bouncing within a single hand. Post-fix, all descs occupy 2lh and all cards converge on aspect-ratio height. Verified 2026-05-07 via chrome-devtools-mcp at viewports 320×568, 360×640, 390×844, 414×896, 768×1024 across 6 scroll positions and a stage-transition probe — within-hand heights uniform at every measurement (max delta 0.0px). The audit's "368 vs 389" doesn't reproduce at any tested viewport. | 🟢 |
| **C-22** | `player-eliminated` event without `rank` renders `#undefined` — unguarded template interpolation. **Shipped 2026-04-23 in `1db5ddab`** — eliminated rank guard. | 🟢 |
| **C-23** | TargetSelect "Unknown" fallback when targetId doesn't resolve reads as a bug, not game state. **Shipped 2026-04-23 in `a9a8e373`** — target-unknown copy fix. | 🟢 |

### C (aesthetic reworks — P1 scope decision) — 5

| ID | Title | Status |
|----|-------|--------|
| **C-16** | Nope countdown bar color/shape reads as browser notification not spy thriller | ⏸ |
| **C-17** | GameOver screen is visually anonymous vs the Briefing Room arena — climax moment is the weakest surface | ⏸ |
| **C-18** | EliminatedView phone screen drops all Archer vocabulary | ⏸ |
| **C-19** | JoinScreen "joined" state has 450-550px of empty space below dossier — reads like half-loaded | ⏸ |

### D (input) — 10

| ID | Title | Status |
|----|-------|--------|
| **D-02** | Draw button no optimistic lock → 10 rapid taps spam STALE_STATE errors to user. **Shipped 2026-04-23 in `dd446945`** — optimistic in-flight lock on Draw button. | 🟢 |
| **D-04** | FuturePeek read-only `Got it` button has no submit guard (low impact, back-to-back Intel Briefing impossible per deck). **Shipped 2026-05-07** — `dismissedRef` ref-guard added; bare `onClick={onDismiss}` swapped for the same two-track pattern as B-17 (sync ref + async state). Defensive consistency with the rest of the sheet button conventions. | 🟢 |
| **D-05** | StealReport Acknowledge has `autoFocus` + no debounce — panic-tap dismisses queued reports unread. **Shipped 2026-04-23 in `0af60680`** — StealReport debounce. | 🟢 |
| **D-13** | Hand updates mid-stage mostly safe; optimistic rollback correctly validated | 🏷 |
| **D-14** | Drama overlay doesn't block hand (by design — visualization layer) | 🏷 |
| **D-16** | Counter-counter-nope by original actor at chainDepth≥1: rules allow it but SmartActionBox only shows Intercept CTA for `!myTurn` — actor can't Intercept their own attacker's Intercept via UI. **Possible rule violation.** **Shipped 2026-04-29 in `d9c40753`** — `canIntercept` gate widened to `(!myTurn \|\| nopeWindow.chainDepth >= 1)` so ACTOR can chain-counter once the chain has progressed. Fix referenced "TODO #11" not "D-16," which is why the 2026-05-07 audit pass missed it on first sweep. | 🟢 |
| **D-17** | JoinScreen doesn't pre-validate `NAME_PATTERN` — user types "name@" (invalid), hits submit, sees server error. **Shipped 2026-04-23 in `23cd64c9`** — JoinScreen regex pre-validate. | 🟢 |
| **D-19** | Reconnect stale-state window (~100ms) — mostly suppressed by isReconnecting flag | 🏷 |
| **D-20** | NameCard BottomSheet doesn't honor Escape key. **Shipped 2026-04-23 in `0af60680`** — NameCard Escape. | 🟢 |
| **D-21** | Favor surrender race — server authoritative, error shown | 🏷 |

### E (validation) — 6

| ID | Title | Status |
|----|-------|--------|
| **E-04** | Zod default `strip` mode — unknown keys silently dropped. Defense-in-depth missing. **Shipped 2026-04-23 in `19ce54e0`** — Zod strict mode. | 🟢 |
| **E-05** | Name-reclaim skips `NAME_PATTERN` — reclaim accepts control chars + HTML in raw input. **Shipped 2026-04-23 in `19ce54e0`** — name-reclaim regex pattern enforced. | 🟢 |
| **E-06** | Zod `z.string().max(12)` no `min(1)`, no regex — whole `NAME_PATTERN` contract lives downstream instead of at WS boundary. **Shipped 2026-04-23 in `19ce54e0`** — name regex enforced at WS boundary. | 🟢 |
| **E-07** | `stateVersion` unbounded upper range. **Shipped 2026-04-23 in `19ce54e0`** — stateVersion cap. | 🟢 |
| **E-08** | Rate limit doesn't cover unidentified connections before `join`. **Shipped 2026-05-07 in `eae3ce96`** — server schedules a 5s `identifyTimer` per accepted connection; if no role is set (host-connect / join / god) before it fires, the connection closes with code 4002 (`Identify timeout`). Bounds slot-squatting on `MAX_CONNECTIONS=12` from ~40s (heartbeat timeout) to 5s. | 🟢 |

---

## P2 findings — 30 items

### A (rules)

| ID | Title | Status |
|----|-------|--------|
| **A-03** | Favor-target disconnect → indefinite stall (intentional "game waits"); no documented host-kick pathway | 🏷 |
| **A-04** | `MAX_NOPE_CHAIN = 10` but only 9 Nope cards exist in deck — cap is unreachable, dead documentation gap | 🏷 |
| **A-08** | Pair of Intercepteds as combo is legal but untested | 🏷 |

### B (disconnect)

| ID | Title | Status |
|----|-------|--------|
| **B-08** | `consecutivePersistFailures` never reset on lobby return. **Shipped 2026-04-23 in `d0b5bbcb`** — persist-fail counter resets on lobby return. | 🟢 |
| **B-09** | Unknown ClientMessage type in switch has no default case — silent consume. **Shipped 2026-04-23 in `d0b5bbcb`** — exhaustive ClientMessage default. | 🟢 |
| **B-10** | Stale Nope bypasses stateVersion (intentional race), but windowGeneration check could gate stale replays | 🏷 |
| **B-15** | Enqueued player-update reads gameState via closure — correct but brittle if player-removal ever lands | 🏷 |
| **B-16** | 11th connection lingers until disconnect; MAX_CONNECTIONS=12 vs MAX_PLAYERS=10 buffer could be exhausted by unidentified connections | 🏷 |
| **B-17** | Double-tap Cancel on NameCard → second fails `ALLOWED_ACTIONS`, user sees error toast after success. **Shipped 2026-05-07** — `NameCard.tsx` now uses a ref-based in-flight guard (`submittedRef`) alongside the state-based `disabled` prop. Refs update synchronously, so the second tap in a same-tick double-tap reads `submittedRef.current === true` and bails before the state-driven `disabled` prop has applied. Same race-class fix would also apply if other sheets show similar symptoms. | 🟢 |
| **B-18** | iOS Safari visibility handler races React StrictMode pending-disconnect window | 🏷 |

### C (visual polish)

| ID | Title | Status |
|----|-------|--------|
| **C-24** | FuturePeek illustration letterbox more visible (mat is wider top/bottom than sides) | 🏷 |
| **C-25** | "Needs a pair or triple" error message is generic — not in Archer vocabulary. **Shipped 2026-05-07** — `SmartActionBox.tsx` `INVALID_LABELS['single-operative']` rewritten to "Powerless alone\\npair or triple to act" (mirrors the canonical operative card text "Powerless alone. Pairs steal random. Triples name + steal."), same two-line shape as `single-intercepted`. | 🟢 |
| **C-26** | INTERCEPTED emerald gradient fades muddy against manila backdrop | 🏷 |
| **C-27** | Card back never appears in common gameplay — worth confirming intended usage | 🏷 |
| **C-28** | Roster/portrait asset asymmetry (6 portraits, 5 operative types) | 🏷 |
| **C-29** | DossierFeed strip X-drift (`index * 2 * dir`) accumulates to ±58px at 20+ strips | 🏷 |
| **C-30** | StatusBar silent during `favor-pending` for OTHER (alive) — observer waits ~7 min seeing identical "Seat1 is on deck · 22 in the pile" with no signal that a Favor is in flight; reads as frozen game. **Shipped 2026-05-01 in `30837553`** — `StatusBar.tsx` accepts `favorOtherContext` prop, `Player.tsx` resolves requester+target names from `pendingPrompt` for OTHER-alive seats, copy reads "{requester} coerces {target} · favor pending." 5/7 promotion was a stale carryover from playtest run `2026-04-29-2139-3p` (run pre-dated fix by 2 days). Source: `runs/2026-04-29-2139-3p/issues/005`. | 🟢 |
| **C-31** | Go Dark ACTOR phone has no drama beat. **By-design 2026-05-02** — `DramaOverlay.tsx:163-201` explicitly comments "Solo-actor cards (go-dark, back-channel) intentionally don't get a beat: Go Dark's narrative IS sneaking out of sight; an overlay would fight the card's tonal intent." `PRODUCT-SPECIFICATION.md` §6.2 + §8.3 enumerate drama overlays for BURNED / EXTRACTED / ELIMINATED / WINNER only — go-dark is out of scope by spec. Triage's "spec calls it load-bearing" cited `SCENARIOS.md` (playtest catalog) which is not the product contract. Vibe-check signal was single-seat `unsure` (not `no`), no corroborating seats. Source: `runs/2026-04-29-2139-3p/issues/012` + `014`. | 📋 |
| **C-32** | Phone observers receive zero card-played narration. **By-design** — `PRODUCT-SPECIFICATION.md` §6.2 architecture: `AnnouncementFeed` is BOARD-side, `StatusBar` (board strip) is BOARD-level comms; phones have no parallel narration component listed by design. Pattern is documented in `PlayerAlert.tsx:113-116` ("Board-side COMMS feed already announces these events publicly — this gives the affected phone a dedicated, tactile heads-up since the player isn't looking at the TV"). Adding card-played toasts to phones would create dual narration and pull attention away from the shared screen — anti-Jackbox. Triage's own Option C explicitly framed this as the by-design path. Source: `runs/2026-04-29-2139-3p/issues/015`. | 📋 |
| **C-33** | Direct Order target has no `turnsRemaining > 1` indicator on phone — attacked player draws once, turn doesn't end, no UI signal why. **Shipped 2026-05-01 in `ad4bce5c`** — `StatusBar.tsx` `bodyFor()` `isMyTurn && myTurnsRemaining > 1` branch shows "Under attack · {N} draws", reading directly off the projected `currentTurn.turnsRemaining`. 5/7 promotion was a stale carryover from playtest run `2026-04-29-2139-3p` (run pre-dated fix by 2 days). Source: `runs/2026-04-29-2139-3p/issues/022`. | 🟢 |

### D (input)

| ID | Title | Status |
|----|-------|--------|
| **D-06** | Long-press vs tap conflict at exactly 600ms — timing-dependent, order correct in code | 🏷 |
| **D-08** | DefusePlacement ± stepper no rate limit (local state only — harmless) | 🏷 |
| **D-09** | Defuse small-deck direct-tap vs large-deck confirm — no race | 🏷 |
| **D-10** | Defuse Random uses client `Math.random()` (OK — not a cheat surface) | 🏷 |
| **D-11** | TargetSelect rapid-tap fully guarded by `submitted` flag | 🏷 |
| **D-12** | Double-tap stage/unstage — reducer idempotent | 🏷 |
| **D-15** | Play card during own Nope window — server correctly rejects, button is not visually disabled. **Shipped 2026-05-02 in `b7824600`** — `SmartActionBox` outer gate relaxed from `(!myTurn \|\| nopeWindow.chainDepth >= 1)` to just `nopeWindow && isAlive`, so the ACTOR enters the nope-window branch unconditionally. During their own ~10s window the box shows "Intercept window · Ns" with `interactive: false` — there is no play CTA to spam-tap. Same end-effect as a disabled button. Fix referenced "ACTOR nope-window awareness" not "D-15," another ID-disconnect missed by the first audit pass. | 🟢 |
| **D-22** | Tap outside TargetSelect clears staged cards (intentional) | 🏷 |
| **D-23** | Intel Briefing with <3 cards in deck — flag for engine-level test. **Shipped 2026-05-07 in `<HEAD>`** — `applySeeTheFuture` slices `drawPile.slice(0, 3)`, structurally returning `[]` / `[c]` / `[c, c]` for short piles. Locked with 4 engine tests in `engine.test.ts`: deck sizes 0/1/2 for Intel Briefing + Falsify Intel sharing the same read path. Tests pin the contract that engine MUST accept the play, MUST emit `future-peeked`, MUST set `pendingFuture` even when the deck can't fill the full 3 — protects against a future "guard if length >= 3" regression that would silently break the late-game shrinking-pile state where Intel Briefing matters most. | 🟢 |

### E (validation)

| ID | Title | Status |
|----|-------|--------|
| **E-10** | `NAME_PATTERN` allows spaces in the middle — verified OK | 🏷 |
| **E-11** | `favor-give` correctly stateVersion-gated | 🏷 |
| **E-12** | `CARD_TYPE_TUPLE` non-empty asserted with `as` cast — could be explicit | 🏷 |
| **E-13** | `defuse-place` Zod max(120) decouples from actual deck | 🏷 |
| **E-14** | `z.string().uuid()` deprecated in Zod 4 (hygiene) | 🏷 |
| **E-15** | Host-connect spam amplifies broadcasts (rate-limited but still wasteful) | 🏷 |
| **E-16** | `pendingFuture.playerId` not re-verified in handler (invariant holds today) | 🏷 |

---

## Remediation plan (overnight, auto mode)

### Wave 1 — Immediate P0s (next ~90 min)
Atomic commits, one fix per commit, diagnose → fix → verify → move on:

1. **E-01** privacy leak — extend `stripPrivateEventFields` + regression test
2. **E-02** byte count — TextEncoder swap + test
3. **C-05** exhaustive-never crash loop — one-line default arm + test
4. **A-01** single-Intercepted server guard + regression test
5. **C-02** joinedName font scale fix
6. **C-06** staged operative name overflow fix
7. **D-01** Intercept optimistic lock
8. **C-01** 10-player lobby overflow fix
9. **C-03** iPad portrait orientation splash

### Wave 2 — P1 polish (next ~2-3 hours)
10. **C-04** themed ErrorBoundary
11. **C-14** drama holdMs bumps (INTERCEPTED 800→1500, EXTRACTED 1000→1600)
12. **C-08** PlayerStrip NAME_MAX fix
13. **C-20** active pill clipping
14. **C-21** hand card height stability
15. **C-22** unguarded `#${rank}` → `#N/A` or drop suffix
16. **C-23** TargetSelect "Unknown" replacement copy
17. **D-02** draw optimistic lock
18. **D-05** StealReport acknowledge debounce
19. **D-17** JoinScreen client-side regex pre-validate
20. **D-20** NameCard Escape-to-cancel
21. **B-08** consecutivePersistFailures reset on lobby return
22. **B-09** exhaustive-default in ClientMessage switch
23. **E-04** Zod `.strict()` on all schemas
24. **E-05** NAME_PATTERN in reclaim path
25. **E-06** tighten name Zod schema
26. **E-07** stateVersion max
27. **B-12** client-side protocol version
28. **B-14** disconnected-name hint list on GAME_ALREADY_STARTED

### Wave 3 — Test coverage locks (parallel to Wave 2)
29. A-02, A-05, A-06, A-07, A-08, D-23 — regression tests for verified-correct-but-unlocked behaviors
30. E-03 — build-time grep test for `__gameStore` absence in prod bundle

### Wave 4 — Decisions for Briggsy (morning briefing)
- **Disconnect-wedge cluster (B-03/04/05/06/13/07):** recommend option (b) — confirmed-disconnect auto-resolve with safe defaults
- **D-03** Nope race UX — nope-pending broadcast?
- **C-13** Square-art letterbox — regen 11 cards at 5:7, or change frame aspect?
- **C-15** Board DramaOverlay gets card variant for `burned-drawn`?
- **C-17/18/19** GameOver, EliminatedView, JoinScreen-idle — aesthetic reworks scoped?
- **D-16** Counter-counter-nope UI exposure — rules-fidelity gap?

### Wave 5 — Morning briefing
Update TODO.md with: what landed, what's verified in Playwright, what still needs phone-test, what's blocked on his decision. No push to origin overnight.
