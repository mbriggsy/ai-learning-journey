# BURNED — E2E Issue List

> **Generated:** 2026-04-23 overnight audit, 5 parallel investigation agents.
> **Baseline at audit start:** 371/371 Vitest, 15/15 Playwright, typecheck clean.
> **Total findings:** 89 (17 P0 / 42 P1 / 30 P2).
> **Source reports:** `temp/audit/A-rules-fidelity.md`, `B-disconnect-session.md`, `C-visual-fidelity.md`, `D-input-abuse.md`, `E-validation-boundary.md`.
> **Screenshots:** `temp/audit/screenshots/` (65 files).

## Legend

| Status | Meaning |
|--------|---------|
| 🔴 OPEN | Not started |
| 🟡 IN-PROGRESS | Being fixed now |
| 🟢 FIXED | Landed + verified (tests + Playwright where applicable) |
| ⏸ BLOCKED | Needs Briggsy decision (design/product call) |
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
| **E-01** | `card-drawn.cardType` leaks drawn card identity to every opponent + board | 🔴 | Extend `stripPrivateEventFields` — card type stays only for `viewerId === event.playerId` |
| **E-02** | 4KB message cap uses `.length` (UTF-16 chars) not bytes — 4× DoS bypass | 🔴 | Switch to `new TextEncoder().encode(message).length` |
| **E-03** | `window.__gameStore` DCE relies on Vite static replacement — no regression test for prod bundle | 🔴 | Add test that greps `dist/**/*.js` for the string `__gameStore` |

### Crash / systemic failure cluster

| ID | Title | Status | Fix |
|----|-------|--------|-----|
| **C-05** | `formatEvent` default arm uses `return _exhaustive` (TypeScript-exhaustive, runtime-trap). Unknown event → render object → ErrorBoundary. Cumulative event log replays on remount → permanent lock. | 🔴 | `src/client/board/events.ts:155-158` change to `return null` with `console.warn` |
| **C-04** | ErrorBoundary "Recovering..." fallback is inline grey-on-black 16px text — invisible on a TV across the room | 🔴 | Replace with themed Comms-scrambled fallback using design tokens + large display font |

### Layout / readability P0 cluster

| ID | Title | Status | Fix |
|----|-------|--------|-----|
| **C-01** | 10-player lobby overflows 1920×1080 TV — CLEARED HOT start button ~217px below fold. Worse on 1440×900. | 🔴 | 2-column roster grid when players > 5, guaranteed bottom-visible start button |
| **C-02** | JoinScreen `joinedName` truncates the legal 12-char maxLength — "DASH BARLOWE" → "DASH BAR…" on every phone. Player's first confirmation their name was accepted is visually butchered. | 🔴 | Font scales with `cqi`, or cap at 24-26px on phone widths (`JoinScreen.module.css:297`) |
| **C-03** | Board on iPad-portrait (1024×1366) broken: DrawPile count overlapped by discard, PlayerStrip cut off left, COMMS stretched. Spec is landscape-only but no orientation guard. | 🔴 | Orientation splash "Rotate to landscape" at board entry point |
| **C-06** | Staged `vera-khan` name truncates to "VERA KI•" at 360×640 — `text-overflow: clip` cuts mid-character on legal 9-char codename | 🔴 | `MinimalCard.module.css:158-171` — cqi-scaled font + `ellipsis`, or drop header below 180px |

### Disconnect-wedge cluster — PRODUCT DECISION NEEDED

This cluster conflicts with the explicit "game waits for you" policy that removed all server prompt timeouts. Timeouts for *slow humans* were intentionally removed. But a *fully disconnected* player is different — the game stalls until the 15-min INACTIVITY_TIMEOUT nukes the room.

| ID | Title | Status |
|----|-------|--------|
| **B-03** | `name-card-pending` + stealer disconnects → room frozen until 15-min nuke | ⏸ |
| **B-04** | `defuse-pending` + drawer disconnects → room frozen, Burned stuck in dead hand | ⏸ |
| **B-05** | `favor-pending` + target disconnects → room frozen | ⏸ |
| **B-06** | `future-rearrange-pending` + peeker disconnects → room frozen | ⏸ |
| **B-13** | Active player mid-`turn-active` disconnects → turn never advances | ⏸ |
| **B-07** | Meta-finding: only Nope window has disconnect-safety machinery. All other prompts lack `scheduleNopeExpiry`-shaped infrastructure. | ⏸ |

**Options to present:** (a) keep current policy, accept 15-min nuke; (b) introduce *disconnect-only* auto-resolve (confirmed disconnect triggers safe default — doesn't affect slow deciders); (c) host vote-to-kick a stalled seat. **Recommending (b)** — preserves "game waits for slow human" while healing ghost-player stalls.

### Input abuse P0

| ID | Title | Status | Fix |
|----|-------|--------|-----|
| **D-01** | Intercept button has no optimistic lock; `nope` action is stateVersion-exempt — 5 rapid taps burn 5 Intercepts in ~500ms | 🔴 | Add optimistic hand removal on intercept click, or in-flight guard |
| **D-03** | Two simultaneous Nopes stack by arrival order with no "someone noped" broadcast — second Noper's Yup re-enables an action the first Noper thought they killed | ⏸ | UX design — nope-pending broadcast or instant-close semantics |

---

## P1 findings — 42 items

### A (rules) — 5

| ID | Title | Status |
|----|-------|--------|
| **A-01** | Server `handleSingleCard` accepts single `intercepted` plays — strips card from hand, opens Nope window, errors on resolve. Card permanently lost if client bypasses `validateCombo`. | 🔴 |
| **A-02** | Eliminated-while-under-attack: `turnsRemaining` evaporates. Behavior is defensible but un-tested; rule ambiguous. | 🏷 |
| **A-05** | 2-of-a-kind Noped cleanup: `pendingSteal` cleared correctly but no test asserts it | 🏷 |
| **A-06** | 3-of-a-kind cancel-then-reselect flow untested | 🏷 |
| **A-07** | Favor nope-window-before-favor-give timing correct but untested | 🏷 |

### B (disconnect/session) — 8

| ID | Title | Status |
|----|-------|--------|
| **B-01** | Host has no session token — another tab can race-steal the host role on WiFi blip | 🔴 |
| **B-02** | Host-disconnect-during-lobby is silent; game can't start, no UI signal | 🔴 |
| **B-11** | Rejoin after game_over: only host can trigger `return-to-lobby`; if host tab closed at victory screen, room is stuck | 🔴 |
| **B-12** | Protocol version check is server → client only; old clients get admitted and burn player slots | 🔴 |
| **B-14** | SessionStorage-wiped player who mistypes their name gets dead-end `GAME_ALREADY_STARTED` — no "did you mean" list of disconnected names | 🔴 |

### C (visual) — 13

| ID | Title | Status |
|----|-------|--------|
| **C-07** | Nameplate brass "stand" is 4-6px tall on 1920 — reads as underline | 🔴 |
| **C-08** | PlayerStrip `NAME_MAX = 7` hard-coded — "DASH B…" on 1920 where 150px per tile easily fits 12 chars. Short names (`Kimi R.`) don't truncate, creating visual inconsistency. | 🔴 |
| **C-09** | NameCard grid + "CALL OFF THE RAID" button below fold on 360×640 | 🔴 |
| **C-10** | NopeCountdownBar floats above arena frame — reads as browser notification, not spy tension | 🔴 |
| **C-11** | DossierFeed side CASE FILE + inner CLASSIFIED stamp are two-of-a-kind competing for attention | 🔴 |
| **C-12** | Channel ticker `// AWAITING TRANSMISSION` would wrap on narrower containers (phone overlays) | 🔴 |
| **C-13** | 11 of 17 card illustrations are 384×384 square art letterboxed in 5:7 frames → ~29px teal mat top+bottom. Inconsistent with operative portraits (tall aspect, fill-to-edge). Cuts against the Archer edge-to-edge feel. | ⏸ (asset regen decision) |
| **C-14** | INTERCEPTED drama hold 800ms, EXTRACTED 1000ms — too short to read from couch across a 15ft room | 🔴 |
| **C-15** | Board shows `{NAME} BURNED` text while drawer sees the CARD — board arguably should get the card variant too (it's the narrator) | ⏸ (product call) |
| **C-20** | Active player "ACTIVE" pill on PlayerStrip clips tile's top border; +2 turns badge crams against card count | 🔴 |
| **C-21** | Hand cards render 368 vs 389 tall depending on `@container (min-width: 177px)` — neighbor heights bounce during scroll-snap | 🔴 |
| **C-22** | `player-eliminated` event without `rank` renders `#undefined` — unguarded template interpolation | 🔴 |
| **C-23** | TargetSelect "Unknown" fallback when targetId doesn't resolve reads as a bug, not game state | 🔴 |

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
| **D-02** | Draw button no optimistic lock → 10 rapid taps spam STALE_STATE errors to user | 🔴 |
| **D-04** | FuturePeek read-only `Got it` button has no submit guard (low impact, back-to-back Surveillance impossible per deck) | 🔴 |
| **D-05** | StealReport Acknowledge has `autoFocus` + no debounce — panic-tap dismisses queued reports unread | 🔴 |
| **D-13** | Hand updates mid-stage mostly safe; optimistic rollback correctly validated | 🏷 |
| **D-14** | Drama overlay doesn't block hand (by design — visualization layer) | 🏷 |
| **D-16** | Counter-counter-nope by original actor at chainDepth≥1: rules allow it but SmartActionBox only shows Intercept CTA for `!myTurn` — actor can't Intercept their own attacker's Intercept via UI. **Possible rule violation.** | 🔴 |
| **D-17** | JoinScreen doesn't pre-validate `NAME_PATTERN` — user types "name@" (invalid), hits submit, sees server error | 🔴 |
| **D-19** | Reconnect stale-state window (~100ms) — mostly suppressed by isReconnecting flag | 🏷 |
| **D-20** | NameCard BottomSheet doesn't honor Escape key | 🔴 |
| **D-21** | Favor surrender race — server authoritative, error shown | 🏷 |

### E (validation) — 6

| ID | Title | Status |
|----|-------|--------|
| **E-04** | Zod default `strip` mode — unknown keys silently dropped. Defense-in-depth missing. | 🔴 |
| **E-05** | Name-reclaim skips `NAME_PATTERN` — reclaim accepts control chars + HTML in raw input | 🔴 |
| **E-06** | Zod `z.string().max(12)` no `min(1)`, no regex — whole `NAME_PATTERN` contract lives downstream instead of at WS boundary | 🔴 |
| **E-07** | `stateVersion` unbounded upper range | 🔴 |
| **E-08** | Rate limit doesn't cover unidentified connections before `join` | 🔴 |

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
| **B-08** | `consecutivePersistFailures` never reset on lobby return | 🔴 |
| **B-09** | Unknown ClientMessage type in switch has no default case — silent consume | 🔴 |
| **B-10** | Stale Nope bypasses stateVersion (intentional race), but windowGeneration check could gate stale replays | 🏷 |
| **B-15** | Enqueued player-update reads gameState via closure — correct but brittle if player-removal ever lands | 🏷 |
| **B-16** | 11th connection lingers until disconnect; MAX_CONNECTIONS=12 vs MAX_PLAYERS=10 buffer could be exhausted by unidentified connections | 🏷 |
| **B-17** | Double-tap Cancel on NameCard → second fails `ALLOWED_ACTIONS`, user sees error toast after success | 🔴 |
| **B-18** | iOS Safari visibility handler races React StrictMode pending-disconnect window | 🏷 |

### C (visual polish)

| ID | Title | Status |
|----|-------|--------|
| **C-24** | FuturePeek illustration letterbox more visible (mat is wider top/bottom than sides) | 🏷 |
| **C-25** | "Needs a pair or triple" error message is generic — not in Archer vocabulary | 🔴 |
| **C-26** | INTERCEPTED emerald gradient fades muddy against manila backdrop | 🏷 |
| **C-27** | Card back never appears in common gameplay — worth confirming intended usage | 🏷 |
| **C-28** | Roster/portrait asset asymmetry (6 portraits, 5 operative types) | 🏷 |
| **C-29** | DossierFeed strip X-drift (`index * 2 * dir`) accumulates to ±58px at 20+ strips | 🏷 |

### D (input)

| ID | Title | Status |
|----|-------|--------|
| **D-06** | Long-press vs tap conflict at exactly 600ms — timing-dependent, order correct in code | 🏷 |
| **D-08** | DefusePlacement ± stepper no rate limit (local state only — harmless) | 🏷 |
| **D-09** | Defuse small-deck direct-tap vs large-deck confirm — no race | 🏷 |
| **D-10** | Defuse Random uses client `Math.random()` (OK — not a cheat surface) | 🏷 |
| **D-11** | TargetSelect rapid-tap fully guarded by `submitted` flag | 🏷 |
| **D-12** | Double-tap stage/unstage — reducer idempotent | 🏷 |
| **D-15** | Play card during own Nope window — server correctly rejects, button is not visually disabled | 🔴 |
| **D-22** | Tap outside TargetSelect clears staged cards (intentional) | 🏷 |
| **D-23** | Surveillance with <3 cards in deck — flag for engine-level test | 🔴 |

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
