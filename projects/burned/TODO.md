# BURNED — TODO

## NEXT SESSION — pick up here (2026-05-05+)

### THIS SESSION (2026-05-05) — sweep last session's queue + runtime verification + dev:launch room override

Four commits, all green at squeaky time. Two-lap session: lap 1
swept the previous session's three "Unfinished Fixes" prescriptions;
lap 2 ran a full Earth-verification pass on the visual changes via
Playwright (3 chrome tabs in dev profile) AND knocked out the
dev:launch `--room=` override that was sitting in side findings.

| Commit | Subject |
|---|---|
| `11b870db` | fix(dev-actions): surface INVALID_CARD_TYPE on typo instead of heartbeat-timeout disconnect |
| `218045fa` | fix(a11y): use inert (not aria-hidden) on DefusePlacement hero card |
| `0cfd0963` | fix(alert): persist Call in a Favor toast until favor-given (re-attendance use case) |
| `4e853346` | feat(dev): --room= override for dev:launch — memorable room codes for phone testing |

**`dev:give` validation (TODO from 2026-05-02 session, item #1).** Mistyping
`call-in-favor` (correct: `call-in-a-favor`) was hitting the silent-drop
branch in `room.ts` designed for token-probe protection on god connections,
and the CLI sat on the socket until heartbeat timeout. Fix is a
`recognized` discriminant on the parser — silent-drop only when the message
type isn't a known dev-action; recognized types with bad payload return
`{ recognized: true, code: 'INVALID_CARD_TYPE' | 'INVALID_ARGUMENTS', message }`
and `room.ts` synchronously acks. Both CLI scripts print the message.
Earth-verified: `dev:give 1234 michael call-in-favor` now reports
"Dev action rejected: INVALID_CARD_TYPE — Unknown card type: call-in-favor".
8 new parser tests pin the contract.

**DefusePlacement aria-hidden → inert (TODO from 2026-05-02 session, item #2).**
Chrome was logging "Blocked aria-hidden on an element because its descendant
retained focus" — aria-hidden doesn't actually prevent focus, so the screen
reader still exposed the BURNED hero card. Swap to `inert`, which W3C
recommends and React 19 supports as a native boolean prop. Earth-verified
in lap 2 by drawing a stacked Burned and inspecting console — clean (1
favicon 404 error, 0 warnings, no aria-hidden message).

**PlayerAlert persist-with-X for Call in a Favor.** Bystander-on-the-couch
re-attendance use case: 2.8s auto-fade serves engaged-watchers but loses
the player who grabs a beer and returns at 45s. Per-alert `persistUntil`
field carries resolve event types; auto-fade timer skips persistent alerts;
new effect clears them when the resolve event fires anywhere in the feed
after the alert's source event. X dismiss button renders only on
persistent alerts. Scope: Call in a Favor only — falsify-intel filtered
above (DramaOverlay's INTEL FALSIFIED owns it), triple-steal name commit
filtered above (`comboSize !== undefined`), pure peeks resolve immediately,
Burned defuse has no observer card-played toast.

Earth-verified end-to-end in lap 2 across all four behaviors: toast
renders with `×` correctly placed, persists past 2.8s, X click clears
immediately, auto-clears on `favor-given` (Bob's post-surrender snapshot
showed toast absent + hand at 7 cards / Vera Khan surrendered).

**dev:launch --room= override.** Phone keyboards hate `A8ZUR7`-style
random codes. New flag accepts a custom code matching `/^[a-zA-Z0-9-]{1,16}$/`
(hyphens allowed for memorability). Combining with `--dev-html` is a config
error (rejected with exit 1). Production codegen for non-dev rooms
unchanged — the random alphanumeric path stays default.

### Side note worth knowing

The original "triage #003 calibration bug" claim was that the
card-played toast persisted ~60s during favor-pending. The existing
test asserted it cleared at 2.8s, and I couldn't trace a real path
where it wouldn't. New design supersedes the question entirely — Call
in a Favor now opts INTO persistence by design — so the bug repro is
moot whether or not it ever existed. Future-Claude: if a calibration
agent flags this again, check the persist-by-design list before
chasing a regression.

### Side findings (parked)

- **Path B for vanity room codes (memorable random pool in prod
  codegen).** Path A (dev:launch flag) shipped this session; Path B
  remains. Touches `Board.tsx generateRoomCode()` + a parallel
  implementation in `launch-dev-chrome.ts`. Don't open without
  explicit greenlight — affects prod surface. Memory note
  `feedback-burned-vanity-room-codes.md` updated to reflect partial
  resolution.

- **Production `SCENARIOS.md` H4 header silent drop.** Parser regex
  `/^###\s+(SCN-...)/` only matches H3 headers; the 55 H4 scenarios
  in production catalog are silently dropped. Real fix needs cascading-
  validation review. TODO since 2026-05-01 — surface for a dedicated
  session.

- **Stale-wrangler session-start hook.** Mentioned in vanity-codes
  memory file: original phone-test friction was triggered partly because
  port 5173 was occupied by a prior wrangler. A session-start hook that
  kills stale BURNED dev processes would prevent recurrence. Deferred.

### Background processes

- All session-spawned dev servers stopped at squeaky time (vite +
  wrangler). Clean start next session.

---

### THIS SESSION (2026-05-02) — drama-beat spot-check, disconnect-wedge product call, ACTOR awareness, phone clipping

Five commits, all green at squeaky time. Long session — drama-beat
spot-check became a multi-fork audit that touched product calls,
visual rules, architecture, and a stubborn phone-only layout bug
that turned out to be already-fixed-but-debug-overlay-masked.

| Commit | Subject |
|---|---|
| `18475abc` | docs(disconnect-wedge): lock Option (a) by-design — no engineering |
| `65de88cf` | refactor(drama): codify when card-played gets a beat — pull Go Dark, add Falsify Intel |
| `33e45533` | fix(drama): hoist DramaOverlay across phase transitions; GameOver hero gains verb |
| `b7824600` | fix(action-box): ACTOR sees nope-window awareness; defensive flex min-width |
| `604d7bd8` | docs(insights): 046 — debug overlays can mask the very fix they're verifying |

**Drama-beat spot-check (5/5 verified on phone):** FILES BURNED ·
GONE DARK (intentionally pulled per Briggsy's "sneaking out of sight"
narrative call) · INTERCEPTED · ELIMINATION · GAME OVER WINS. All
holdMs values feel right post-clipping-fix (no re-tuning needed).

**Disconnect-wedge cluster decided.** B-03/04/05/06/07/13 locked as
Option (a) by-design. No engineering. Couch-of-friends context;
disconnects resolve as "kill tab, start over." Doc + memory + future-
Claude lock-in note shipped. The 5 calibration findings that flagged
this were mostly clusterer false positives. See
`docs/testing/E2E-ISSUE-LIST.md` "Disconnect-wedge cluster".

**Drama overlay rule codified (with Briggsy):** drama overlay fires
for one-shot moments where ambient feedback is too weak to convey
what happened to the table. Multi-step interactions with resolution
cinematics (favor / combo-steal) use the cinematic — no opener.
Solo-actor "sneak" cards (Go Dark) deliberately don't get a beat —
the card's narrative IS sneaking out of sight; an overlay would
fight the card. Concrete: REMOVED Call in a Favor opener (shipped
earlier in session, then revoked when rule applied), REMOVED Go Dark
beat (with PlayerAlert toast un-suppressed for Go Dark to give
observers a quiet text alert), ADDED Falsify Intel beat (parallel to
Files Burned — same deck-mutation shape, cool teal vibe).

**DramaOverlay hoist.** DramaOverlay was unmounting on the playing →
game_over phase transition (phase-keyed Fragments force re-mount),
so the BURNED card-flip + ELIMINATED + WINS beats on the FINAL
elimination never fired. Hoisted to Player.tsx root + restructured
Board.tsx so a single instance lives across phase transitions.
Verified by Briggsy on a fresh game-over playthrough.

**GameOver hero "MICHAEL Wins"** — name + verb instead of name alone.
Two-tier within `.winner` (huge name + smaller drama-color "Wins"
underneath). Reads as one ceremonial statement instead of a floating
name on the loser/board variants.

**ACTOR nope-window awareness** — when you play a card now, your
phone shows the existing observer-waiting state (`Intercept window ·
Ns`, disabled, no button) instead of dead silence for the ~10s
window. Single boolean change in `SmartActionBox.tsx deriveState`,
reusing the existing render path. Briggsy's design call: same
experience as observer-without-Intercept-card.

**Phone right-edge clipping (Pixel 8 Pro)** — the `min-width: 0`
defensive add on `.workbench / .staging / .handSection` actually
closed it on first try. The hour I spent thinking it didn't was
all on a debug overlay positioned at `top:0; right:0` covering the
title bar's "#1234". Insight 046 captures the meta-lesson.

**Two adjacent copy fixes:**
- favor-pending banner on target's phone now stacks the two lines
  vertically ("X demands a card" / "· pick one to surrender") via
  `flex-direction: column` instead of two columns.
- "Watch the TV" / "Scan QR on the TV screen" → "Watch the screen" /
  "the shared screen". Briggsy: "we'll likely never have a tv,
  need more generic."

### Unfinished Fixes (this session)

These had prescriptions, not diagnoses. Both closed 2026-05-05.

1. ~~**`dev:give` silently fails on unknown card types.**~~ **CLOSED
   2026-05-05 — commit `11b870db`.** Parser `recognized` discriminant
   + sync ack + CLI message-print. Earth-verified.

2. ~~**DefusePlacement hero card `aria-hidden` blocked by browser.**~~
   **CLOSED 2026-05-05 — commit `218045fa`.** Swapped to `inert`.
   Earth-verified in 2026-05-05 lap 2 — console clean.

### Side findings (logged earlier)

- ~~**Vanity dev room codes for phone testing.**~~ **PARTIALLY CLOSED
  2026-05-05 — commit `4e853346`.** `pnpm dev:launch --room=devtest`
  override shipped (Path A). Path B (memorable random pool in prod
  codegen) remains parked — see 2026-05-05 session "Side findings".

- **Production `SCENARIOS.md` H4 header silent drop.** Parser regex
  `/^###\s+(SCN-...)/` only matches H3 headers. Production catalog
  mixes H3 (35 scenarios) and H4 (55 scenarios) — the 55 H4
  scenarios are silently dropped from `parseCatalog`. Real fix
  needs cascading-validation review (relaxing regex may fail
  pre-flight on scenarios with absent vibe-checks/knownProductCall
  fields). Surface for a dedicated session.

---

### THIS SESSION (2026-05-01 night) — dev cheats + drama-beat clipping P0 root cause

Three commits, 1152/1152 tests green, typecheck clean.

| Commit | Subject |
|---|---|
| `c38c1390` | feat(dev): scenario-setup cheats — `pnpm dev:stack` + `dev:give` |
| `e0c8e9ef` | fix(drama): exits were anchored to hold start, clipping beats to ~30% visible |
| `2027d68f` | docs(insights): 044 — triage fix paths anchor investigation toward presented hypotheses |

**Set out to test calibration issue 008 (ACTOR drama beat absent before
DefusePlacement). Found a P0 timing bug that had been silently clipping
EVERY drama beat in the game to ~30% of designed duration since
2026-04-22.** The issue 008 triage's hypotheses (lazy-load race, visual
conflation) were both wrong; actual cause was a GSAP position parameter
bug. See insight 043 for the GSAP-specific story, insight 044 for the
meta-lesson on triage hypothesis anchoring.

**Dev cheats — `pnpm dev:stack` + `pnpm dev:give`.** Two new god-mode
actions for scripted scenario testing. `dev:stack <room> <cardType...>`
prepends cards to top of draw pile; `dev:give <room> <playerName>
<cardType...>` appends to a player's hand. Gated by existing
`PLAYTEST_MODE=1` + `PLAYTEST_TOKEN` god-connection auth + LAN-only
origin allowlist. Production deploys leave PLAYTEST_MODE unset →
messages can't land. `verify-prod-bundle.ts` extended with
`dev-stack-deck` + `dev-give-card` sentinel strings as tree-shake
guarantees. `.env` now contains `PLAYTEST_MODE=1` + `PLAYTEST_TOKEN=...`
for local dev (gitignored).

**Drama-beat clipping fix.** `appendHoldAndExit` extracted from
`processQueue` as a pure helper; the bug was that both exit tweens
used GSAP position `'<'` which anchored them to the START of the hold
tween (parallel), not its end (sequential). Visible beat collapsed to
~enter+fade (~800ms) regardless of holdMs. Fix: blur runs sequentially
after hold (no position param); opacity runs in parallel with blur
(`'<'` anchored to blur). Briggsy verified post-fix experience reads
correctly on Pixel 7 emulation; instrumented timing confirmed beats
now hold for designed duration (card variant 2.4s + EXTRACTED 1.6s,
matched within ±50ms). 3 regression tests in
`src/client/shared/DramaOverlay.test.ts` pin
`tl.totalDuration() === holdSec + exitDurationSec`.

### Unfinished Fixes (this session)

These need Briggsy in the loop. Drop into next session's queue in order.

1. **Spot-check OTHER drama beats post-fix.** The clipping bug affected
   every dramatic moment, not just BURNED + EXTRACTED. Briggsy verified
   those two on Pixel 7. The OTHER beats — INTERCEPTED on a Nope (1400ms),
   GONE DARK / FILES BURNED (1200ms each), GAME OVER WINS (2000ms),
   ELIMINATION (1500ms) — were tuned against the clipped reality and
   now fire for full duration. Eye-in-loop pass needed: do any feel
   oversize now? If yes, re-tune `holdMs` values in
   `src/client/shared/DramaOverlay.tsx` `getDramaBeats`. Use
   `pnpm dev:stack 1234 <cardType>` to set up each scenario fast.

2. **`pnpm dev:stack` ack message cosmetic.** Output reads "Stacked
   undefined card(s)" because the server ack payload changed from
   `stackedCount` to `count` when `dev-give-card` was added, but
   `scripts/dev-stack-top.ts` line 80 still reads `msg.stackedCount`.
   Trivial fix: change to `msg.count`.

3. ~~**Stale `card-played` toast on observer phones during favor-pending
   (P2 OPEN — calibration seed 003).**~~ **CLOSED 2026-05-05 — commit
   `0cfd0963`.** Resolved via design pivot, not symptom fix: Briggsy's
   re-attendance use case ("bystander grabs a beer, returns at 45s")
   reframed the problem. Toast now persists until `favor-given` with
   an X to dismiss early. Earth-verified in lap 2.

4. ~~**5 KNOWN-PRODUCT-CALL-CONFIRMED disconnect-wedge cluster items
   (B-03/04/05/13).**~~ **DECIDED 2026-05-02 — Option (a), no
   engineering.** Couch-of-friends context; kill tab + start over is
   the resolution. Rationale + future-Claude lock-in note in
   `docs/testing/E2E-ISSUE-LIST.md` "Disconnect-wedge cluster" section.
   The 5 calibration findings (001/005/006/009/010) that surfaced this
   were mostly clusterer false positives + one already-fixed (009 by
   GSAP timing fix); see triage agent re-evaluation below if those
   need to flip status in the run's INDEX.

### Side findings (logged, not addressed this session)

- **Vanity dev room codes for phone testing.** Random alphanumeric room
  codes (`A8ZUR7`) are hostile on a phone keyboard. Captured in memory
  at `feedback-burned-vanity-room-codes.md`. Two paths: dev-only
  `?room=<custom>` override (cheap), or random pool of memorable codes
  (touches prod). Workaround for now: just navigate the board to
  `/board.html#1234` — any string works as a DO id, no code change
  needed; only the production codegen produces the alphanumeric.

- **Production `SCENARIOS.md` H4 header silent drop.** Parser regex
  `/^###\s+(SCN-...)/` only matches H3 headers. Production catalog
  mixes H3 (35 scenarios) and H4 (55 scenarios) — the 55 H4 scenarios
  are silently dropped from `parseCatalog` output. Same find as last
  session; surface for a dedicated session.

### Background processes still alive

- `pnpm dev:server` background task `buz8t4a89` (wrangler) — still
  bound to port 8787 with PLAYTEST_MODE/TOKEN loaded. `pnpm dev`
  background task `bztqhgs0b` (vite) — still bound to 5173. They
  WILL die when the session ends; if Briggsy reopens the terminal
  they'll already be gone.

---

### THIS SESSION (2026-05-01 late evening) — TODO queue sweep: #5/#6, #3 phase 1+2, shuffle redo, #7 a11y, #8/#9

Six commits this session, all green at squeaky time. The previous
session's nine "Unfinished Fixes" got swept end-to-end except for the
three items requiring Briggsy in the loop.

| Commit | Subject |
|---|---|
| `87640d66` | feat(playtest): close TODO #5/#6 — mini-catalog truthful tags + pre-flight registry scan |
| `21c9e811` | feat(drama): add FILES BURNED beat for Burn the Files (TODO #3 phase 1) |
| `923112b6` | feat(drawpile): board shuffle animation on deck-shuffled (TODO #3 phase 2) |
| `b40585d2` | refactor(drawpile): redo shuffle animation per Emil + frontend-design lenses |
| `e0fdc3f9` | fix(drama): close EXTRACTED a11y tree leak across turns (TODO #7) |
| `2853f4d8` | docs(playtest): bake gesture vocab + motion vibe-check into seat prompts (TODO #8/#9) |

**TODO #1 — Burn the Files vanish (P0?) — STRUCK as misdiagnosis.** Code
trace + triage god-mode evidence both confirm the engine is clean.
`handleSingleCard` (engine.ts:319-320) removes from hand + adds to
discard *before* the nope window opens; `applyShuffle` only mutates
drawPile/pendingFuture/nopeWindow. No code path removes cards from
`discardPile` (3 mutations only: init, eliminate-preserve, append).
Triage seed 006 god-mode notes confirm "the discard pile in boardView
correctly shows `burn-the-files` as the top card after resolution."
The user-perception "vanished" was a feedback gap (no phone discard
view + no shuffle animation) — fully addressed by phase 1+2 below.

**TODO #5/#6 — clusterer false-positive + ID drift (P2 harness).** The
TODO's stated diagnosis was wrong: clusterer code is correct, mini-
catalog content was deliberately mis-tagged. Fixed at the catalog +
pre-flight layer. `pre-flight.ts` cluster check now substring-scans
the FULL raw catalog text instead of joining per-scenario
`knownProductCall` values. Added `<!-- preflight-cluster-registry: ...
-->` block to mini-catalog + every scenario's `Known product call`
flipped to `none` (truthful — calibration scenarios aren't the
canonical home of any cluster issue). 3 IDs renamed to production
spelling. +2 regression tests.

**TODO #3 phase 1 — FILES BURNED drama beat.** Phone has no DrawPile
component and `discardPile: []` in player projection (by design).
Without a beat, BTF feels like the card vanished. Drama overlay now
fires for `card-played: burn-the-files` (non-combo): ACTOR sees
"FILES BURNED", observers see "[NAME] BURNED THE FILES". `.burnedfiles`
CSS class — radial ember (`color-burned-fire` core → cordovan rim →
charcoal char) sized to sit behind the text. Earth-verified at
390×844 phone viewport for both ACTOR + observer copy. PlayerAlert
toast filter extended — burn-the-files joins go-dark / extraction in
the "DramaOverlay owns this moment" exclusion.

**TODO #3 phase 2 — board shuffle animation.** Initial commit
(`923112b6`) shipped a 720ms multi-layer riffle. Audit through
Emil + frontend-design skills surfaced real issues: too long for
multi-game playback, ease-out on oscillation drags the middle, double-
bounce reads as jelly, layer riffle invisible at desktop scale. Redo
(`b40585d2`) delivers a 420ms cubic-bezier(0.77, 0, 0.175, 1) arc:
single-accent stack scale-pop (1 → 1.04 → 1), wrapper riffle (-3° +
0.8px motion blur peak), glow flash on strong ease-out. Layer
animations dropped (cost without payoff). Earth-verified mid-arc and
post-settle. The `.topCardWrap` element introduced to isolate riffle
from `.topCard`'s drop-in entrance — without it, the dossier would
re-do its drop-in after every BTF (CSS animation revert when
data-shuffling flips off). Reduced-motion now keeps glow flash but
drops rotation/blur/scale per Emil's "fewer and gentler, not zero."

**TODO #7 — EXTRACTED a11y tree leak.** Root cause: `text.textContent
= config.text` on beat start, never cleared on completion. opacity:0
hides visually but leaves text in the accessibility tree across
subsequent turns. Layered fix: JSX defaults `aria-hidden="true"` +
`role="status"`; processQueue flips `aria-hidden="false"` on beat
start; onComplete + abortCurrentBeat flip back + clear textContent on
text/flipName refs. Bonus: `role="status"` adds active screen-reader
announcement when beats fire (drama beats weren't being announced at
all before — only stale-leaking between turns). Earth-verified the
exact failure scenario: burned-drawn → extraction-played + two turn
rotations + 600ms settle → all state cleared.

**TODO #8/#9 — seat-prompt template polish.** Two parallel additions
to `seat-scripted.md` and `seat-free-play.md`:
- **Gesture vocabulary section** — single-tap previews, double-tap
  stages, single-tap action button executes. With explicit "if you
  fumble, log a suspicion — don't silently course-correct" rule.
  Prevents the same fumble seat agents made today.
- **Motion-quality vibe-check sub-rubric** — explicit prompt asking
  whether transitions read as motion or as teleport. Frames it as a
  separate axis from banner absence. Today's BTF state-disappearance
  vibe gap (which the engine was clean for) would have surfaced
  immediately under this rubric.

Templates loaded at runtime by `agent-launcher.ts` — no per-seat
generator regeneration needed.

### Unfinished Fixes (this session)

These need Briggsy in the loop. Drop into next session's queue in order.

1. **ACTOR drama beat absent or imperceptible before DefusePlacement
   sheet (P2 OPEN — calibration seed 008).** Was item #4 last session.
   Two hypotheses: lazy-load race on `DramaOverlay` (component
   imported lazily in `Player.tsx:28`; if not mounted when event
   arrives, `setDramaActive(true)` never fires and `showServerSheet`
   stays `true`, letting DefusePlacement open with no gate); OR visual
   conflation with this session's hero card (the drama beat played for
   2400ms but blurred with DefusePlacement which now also heroes the
   Burned MinimalCard). Recommend eye-in-loop disambiguation first
   (Briggsy on phone, drawing Burned with Extraction in hand,
   reporting whether the BURNED → EXTRACTED beat reads or visually
   collides with the sheet).

2. **Stale `card-played` toast on observer phones during favor-pending
   (P2 OPEN — calibration seed 003).** Was item #2 last session.
   Seat-3 saw "Seat2 played Call in a Favor." persist for the full
   ~60s favor-pending window. Toasts should clear on `nope-window-
   resolved` semantically and/or hard-cap at 8-10s wallclock as a
   guard. Three fix paths in the issue file. Briggsy's call between
   (A) `nope-window-resolved` clear only, (B) hard cap only, (C) both.

3. **5 KNOWN-PRODUCT-CALL-CONFIRMED disconnect-wedge cluster items
   (B-03/04/05/13).** Were the last session's 5 confirmed items
   awaiting Briggsy's product call on the disconnect-wedge cluster.
   No movement — still waiting.

### Side findings (logged, not addressed this session)

- **Production `SCENARIOS.md` H4 header silent drop.** Parser regex
  `/^###\s+(SCN-...)/` only matches H3 headers. Production catalog
  mixes H3 (35 scenarios) and H4 (55 scenarios) — the 55 H4 scenarios
  are silently dropped from `parseCatalog` output, meaning pre-flight
  cluster check, clusterer matching, and triage all operate on a
  35-scenario subset. Workaround for now: mini-catalog uses only H3
  so calibration runs unaffected. Real fix: relax the regex to
  `/^#{3,4}\s+(SCN-...)/` and verify the 55 newly-parsed scenarios
  don't break clusterer / pre-flight (they may have absent vibe-checks
  or knownProductCall fields that now flag pre-flight `fail`). Surface
  for a dedicated session — not a one-line fix because of cascading
  validation effects.

### Background processes still alive

- Two dev servers (`pnpm dev` + `pnpm dev:server`) started this
  session for visual verification. Background task IDs were
  `bt0n2rs6r` (vite) and `bzlttg8u7` (wrangler). They WILL die when
  the session ends but if Briggsy reopens this terminal they'll
  already be gone — no manual kill needed.

---

### THIS SESSION (2026-05-01 evening) — sub-step #3, phone polish, Phase 6 #8, #019, operator docs, calibration retry

Five commits this session, all green at squeaky time:

| Commit | Subject |
|---|---|
| `98b8e1ae` | feat(burned-arc): close sub-step #3 — hero Burned card + sheet UI unification |
| `f4ee5542` | feat(phone-polish): destage auto-scroll + DefusePlacement copy refinements |
| `41b7032f` | feat(playtest): close Phase 6 follow-up #8(a)/#8(b) — agent tool whitelist contract tests |
| `792829b1` | feat(playtest): close triage #019 — placeholder substitution + prose-expect skip in tier-2 |
| `d3173520` | docs(playtest): document MCP cross-run collision in operator runbook |

**Sub-step #3 — DefusePlacement hero card.** Three changes in one ship:
hero the Burned MinimalCard at the top of the placement sheet (visual
continuity from BURNED → EXTRACTED drama into the placement decision);
unify on the stepper UI for every deck size (previous `maxPosition >= 10`
branch removed — the mid-game UI swap broke muscle memory during a
stressful "I just dodged death" moment); hide BottomSheet scrollbars
(chrome only — content still scrolls). Earth-verified at 390×844 phone
viewport for both `drawPileCount=29` and `=5`. Read order: title → hero
→ subtitle → quick actions → stepper → Place Here.

**Phone polish bundle.** Destage auto-scroll: when a single card joins
the hand (destage or fresh draw), the hand scrolls horizontally so the
new slot centers in view. Pairs with the existing Framer `layoutId`
flight — card flies from staging while the hand scrolls to receive
it; they meet at center. Manual `scrollTo` on `handRef` (not
`scrollIntoView`) so page-level ancestors don't scroll. Skipped
during initial deal + when multiple cards arrive at once (rejoin
case). Plus DefusePlacement copy refinements: dynamic Place button
("Place at top" / "Place at #3" / "Place at bottom" mirrors stepper
state); drop "first" from position caption ("2 safe draws first" →
"2 safe draws").

**Phase 6 follow-up #8 fully closed.** New vitest contract test at
`scripts/playtest/lib/agent-tool-whitelist.test.ts` (33 assertions)
replaces the manual "DEFERRED CONTRACT TEST" notes in
`phase4-smoke.ts` / `phase5-smoke.ts`. Per-seat agents (1..10):
exactly the 11 expected MCP browser tools + Write, no forbidden
tools (`browser_evaluate` / `browser_run_code` /
`browser_console_messages` / `browser_network_request[s]` /
`browser_tabs`), no cross-seat namespaces. Triage agent: exactly
Read / Write / Grep / Glob / sequential-thinking, no MCP playwright,
no Bash / Edit / NotebookEdit. Discovered 8(c)/8(d)/8(e) were already
shipped during phase 6 wiring (`run-session.ts` defaults
`runPostSessionTriage` → `runTriagePipeline`, `seatDriver` →
`createAgentLauncherDriver`; orchestrator defaults `runIsolationAudit`
to the real implementation at `orchestrator.ts:439`).

**Triage #019 closed — both halves.** Two related defects in
tier-2 projection-assertion matching, surfaced by run
`2026-04-29-2139-3p` where 4 fires landed with-divergence not because
the engine was wrong but because the matcher couldn't validate the
catalog's expect clauses:
- **Placeholder substitution.** New `substituteBindings(value, bindings)`
  recursively walks expect values and replaces `$ACTOR` / `$TARGET`
  with the resolved seat IDs before `expectMatches`. Tier-1 already
  did this via `bindings`; tier-2 didn't.
- **Prose expect skip.** New `isProseExpect(value)` heuristic (string
  with whitespace, not starting with `$`) treats free-form English
  expect values as documentation, surfaces them as informational
  divergences, and does NOT count them toward the failure gate.
  Engine values (UUIDs, kebab-case card types) never contain
  whitespace, so the heuristic is safe.
- +4 regression tests in `scenario-detector.test.ts`. **Verified
  in production this session** — calibration retry coverage.md shows
  `expected={"playerId":"26b21187-..."}` (substitution active) and
  `tier-2 SKIPPED (prose expect, not machine-checked)` (skip active).

**Operator runbook §7 — MCP cross-run collision.** Documented in
`scripts/playtest/README.md`: per-seat MCP servers are long-lived and
shared across whichever agent currently holds them. Cancel in-flight
agents BEFORE dispatching another run, or run 2's calls land on the
same browser as run 1 and both runs' logs become unreliable. Symptom
list + operator process + future-hardening note.

**Calibration retry — `runs/2026-05-01-1654-3p` — 7/7 PASS.** First
end-to-end retry on the new (post-#019) matcher. 3 seats, mini-catalog,
seed 1. Game played to completion. Coverage: 4 distinct fires (FAVOR,
GO-DARK, BURN-THE-FILES, BURNED-DRAW; FAVOR fired twice). Triage: 10
seeds → 10 issue files → INDEX regenerated.

**Validation of prior + this session's work in real seat play:**
- Sub-step #3 hero card lands cleanly — Seat-3 hit BURNED-DRAW, picked
  Random, vibed yes
- FavorReport "Coercion Report" cinematic (last session #010 Gap C)
  called out unprompted by Seat-1 as "highest-quality narrative beat
  observed"
- Asymmetric stamp colors (orange SURRENDERED / red EXTRACTED) noted
  as "strong design detail"
- "Seat2 coerces Seat1 · favor pending" copy from last session #005
  rendered correctly
- #019 fix verified active in coverage.md output (placeholder
  substitution + prose-skip both visible)

**Findings (10 issues):** 3 OPEN · 5 KNOWN-PRODUCT-CALL-CONFIRMED ·
2 LOW-SIGNAL. By severity: 0 P0, 0 P1 (after triage), 10 P2.

The 5 KNOWN-PRODUCT-CALL-CONFIRMED all map to the disconnect-wedge
cluster (B-03/04/05/13) awaiting Briggsy's product call.

**Calibration also surfaced a critical engine bug Briggsy spotted
manually that the agents didn't.** See "Burn the Files engine bug"
under Unfinished Fixes below.

### Unfinished Fixes (this session)

These have prescriptions, not diagnoses. Drop into next session's
queue in order.

1. **Burn the Files: card disappears from game state.** Briggsy played
   `burn-the-files` and the card vanished — not in hand, not in discard.
   Calibration agents missed this because they read aria snapshots
   (which show `myHand` shrunk by 1 + draw pile unchanged — looks like
   a normal play) and the projection allowlist hides `discardPile` from
   non-board views (so they couldn't see the card hadn't landed there
   either). Initial code trace:
   - `src/server/game/engine.ts:481-501` `applyShuffle` does NOT call
     `addToDiscard` and does NOT call `removeCardsFromHand`. It only
     shuffles `state.drawPile`.
   - For other cards, the remove-from-hand + add-to-discard step lives
     in the dispatch chain before `applyCardEffect` is called. Need
     to confirm whether the dispatch path special-cases or skips the
     discard move for `burn-the-files` specifically, or whether
     `applyShuffle` is supposed to do it itself and is missing both
     calls.
   - Briggsy is verifying the bug as of squeaky time. Resume with
     `git log -p src/server/game/engine.ts -- :^*.test.ts | head -200`
     to see how the dispatch chain handled this historically, then
     add `addToDiscard` + `removeCardsFromHand` to `applyShuffle` (or
     whichever boundary owns the move).
   - **Severity: P0 if confirmed** — state invariant violation. Cards
     should not be able to leave hand without entering discard.

2. **Stale `card-played` toast on observer phones during favor-pending
   (P2 OPEN — calibration seed 003).** Seat-3 saw "Seat2 played Call
   in a Favor." persist for the full ~60s favor-pending window.
   Toasts should clear on `nope-window-resolved` semantically and/or
   hard-cap at 8-10s wallclock as a guard. Three fix paths in the
   issue file. Briggsy's call between (A) `nope-window-resolved` clear
   only, (B) hard cap only, (C) both.

3. **Burn the Files: zero phone-side feedback, board has only ticker
   text (P2 OPEN — calibration seed 007).** Code search confirms
   `deck-shuffled` event has zero handling in `src/client/player/`;
   board only narrates via COMMS ticker, no shuffle animation on
   `DrawPile`. Spec calls for "shuffle animation plays on DrawPile +
   status reads 'FILES BURNED'." Three fix paths in the issue file.
   Note the seat-prompt ID `SCN-BURN-THE-FILES` does not match the
   catalog's `SCN-BURN-FILES` (extra "THE") — same root as
   harness bug #5 below.

4. **ACTOR drama beat absent or imperceptible before DefusePlacement
   sheet (P2 OPEN — calibration seed 008).** Two hypotheses: lazy-load
   race on `DramaOverlay` (component imported lazily in
   `Player.tsx:28`; if not mounted when event arrives,
   `setDramaActive(true)` never fires and `showServerSheet` stays
   `true`, letting DefusePlacement open with no gate); OR visual
   conflation with this session's hero card (the drama beat played
   for 2400ms but blurred with DefusePlacement which now also heroes
   the Burned MinimalCard). Recommend eye-in-loop disambiguation
   first (Briggsy on phone, drawing Burned with Extraction in hand,
   reporting whether the BURNED → EXTRACTED beat reads or visually
   collides with the sheet).

5. **Clusterer false-positives — 4 instances in this run (002, 004,
   005, 006).** The triage seed builder populates
   `candidateDuplicate` by markdown-proximity match: it leaks an
   adjacent scenario's `known-product-call:` tag onto seeds whose own
   catalog entry says `none`. Mechanical fix: in the spec builder
   (likely `cluster-suspicions.ts` or `triage-pipeline.ts`),
   look up the matched scenario's `known-product-call:` field directly
   from the parsed catalog and clear `candidateDuplicate` to `(n/a)`
   when the field is `none`. Seeds 002 (Go Dark → falsely linked
   to B-13), 004 + 005 (Favor normal → falsely linked to B-05), 006
   (Burn the Files → falsely linked to B-04) all hit this. P2
   harness bug.

6. **Mini-catalog vs production-catalog scenario ID drift.** Multiple
   seeds noted that `scripts/playtest/fixtures/mini-catalog.md` uses
   shortened scenario IDs that don't match the production catalog at
   `docs/testing/playtest/SCENARIOS.md`:
   - `SCN-FAVOR-NORMAL-01` (mini) vs `SCN-CALL-IN-FAVOR-NORMAL-01`
     (production)
   - `SCN-BURN-THE-FILES-NORMAL-01` (mini) vs `SCN-BURN-FILES-NORMAL-01`
     (production)
   - `SCN-BURNED-DRAW-AXIS11-01` (mini) vs
     `SCN-BURNED-DRAW-AUTO-DEFUSE-01` (production)
   The mini-catalog should mirror production IDs exactly so
   `candidateDuplicate` matching works. P2 harness bug.

7. **EXTRACTED drama overlay text persists in a11y tree across turns
   (Seat-2 suspicion).** Visually absent in screenshots but the text
   node hangs around in the accessibility tree on multiple subsequent
   turns. Likely AnimatePresence exit-completion vs DOM-removal race.
   Accessibility issue — screen readers would announce "EXTRACTED"
   stale-narrate. P2.

8. **Seat-prompt template — gesture vocabulary missing.** Today's
   calibration agents fumbled the single-vs-double-tap discriminator
   exactly as #006/#007 first-time-friction predicted; mid-flight
   `SendMessage` clarifier didn't change behavior. Durable fix:
   bake into `scripts/playtest/agents/seat-scripted.md` and
   `seat-free-play.md` an explicit gesture-vocabulary section before
   the inner-loop instructions. Prevents the same fumble next run.

9. **Seat-prompt template — motion-quality vibe-check questions.**
   Calibration is blind to motion-polish bugs because agents read
   state, not motion. Today's Burn the Files state-disappearance
   went un-flagged. Fix: amend the vibe-check rubric in
   `seat-scripted.md` / `seat-free-play.md` with explicit motion
   prompts: "When you played the card, did the transition from
   staging to gone read as motion (fade, fly, scale-down), or did
   the card teleport?" P3 harness ergonomics.



Briggsy handed me the wheel and went to the hardware store.
"Commit as you go, push when you're done, squeaky if you finish."
Caught a clean run on the 2026-04-29-2139-3p triage queue: 8 OPEN
issues closed across 6 commits, 1110/1110 unit tests, typecheck clean,
zero regressions. Visual verification still pending — bundling the
calibration retry for Briggsy eye-on-loop on his return.

| Commit | Closes | Subject |
|---|---|---|
| `38d4c7f0` | #010 Gap C | feat(favor): close issue #010 Gap C — FavorReport cinematic on both phones |
| `236d637d` | infra | feat(triage-index): add RESOLVED status to issue-index schema |
| `ad4bce5c` | #022 | feat(under-attack): close issue #022 — surface forced-draw count |
| `30837553` | #005 | feat(status-bar): close issue #005 — favor-pending OTHER-alive copy |
| `1e7b847d` | #012/#014/#015 | feat(go-dark): close #012/#014/#015 — drama beat + observer toast |
| `afff4181` | #001/#002/#003/#011/#018 | feat(triage): close — catalog gate at log-write time |

**Issue #010 Gap C — FavorReport cinematic.** ACTOR + TARGET both get a
hero coercion-report dispatch on favor resolution. Same StealReport
vocabulary (cream paper, typewriter header, ochre asset strip, rubber
stamp, dog-ear) but Case 47-D for Duress and two stamp variants:
EXTRACTED (crimson) for ACTOR / receiver, SURRENDERED (amber) for
TARGET / giver. `favor-given` event extended with optional
`cardType?: CardType`; projection allowlist parallel to combo-steal +
card-drawn so only giver+receiver see the card identity. PROTOCOL_VERSION
3 → 4. `gameStore.test.ts` + `engine-phase6.test.ts` expectations
updated. PlayerAlert favor-given branches retired — toast + cinematic
on the same event would compete for attention. New regression test
`engine.pbt.test.ts` pins `favor-given.cardType` privacy invariant
across board / giver / receiver / witness viewpoints.

**Issue-index schema (infra).** `IssueStatus` schema had no terminal-
resolved state. OPEN counts ratcheted forever even after work shipped.
Added `RESOLVED` to the union, the STATUS_VALUES list (FIRST so
substring matcher wins over BLOCKED in resolution prose mentioning prior
blocked dimensions), the byStatus init, and the Summary template.
Regression test pins the substring-precedence trap. Closes a
generalizable workflow gap, not a specific calibration finding.

**Issue #022 — Direct Order under-attack indicator.** Seat-1 hit the
silent double-draw: opponent played Direct Order, seat-1 came in at
`turnsRemaining: 2`, default "End turn / draw (N)" copy on the action
button gave no signal that the first draw wouldn't end the turn. Two
surfaces wired:
- StatusBar swaps "You're up" for "Under attack · N draws" when
  `isMyTurn && turnsRemaining > 1`. Keyed on `attacked-${N}` so a
  stack collapse from 3 → 2 animates the count down.
- SmartActionBox draw button swaps "End turn / draw (pile)" for
  "Forced draw (pile) / N draws this turn". Engine clamps
  `turnsRemaining ≥ 1` post-draw so the branch flips back to default
  on the final forced draw — count communicates progress.
- 2 new SmartActionBox unit tests + 3 new StatusBar unit tests drive
  the gameStore singleton with a real PlayingPlayerView so
  `useCurrentTurn()` reads the same shape it sees in production.

**Issue #005 — favor-pending OTHER-alive StatusBar copy.** Seat-3
mistook a 7-minute silent favor exchange for a frozen game. Default
"[Name] is on deck · 22 in the pile" copy was visually identical to
pre-play state across the entire wait. Player.tsx now derives a
`favorOtherContext: { requesterName, targetName } | null` for OTHER-
alive seats (`!isFavorTarget && !isFavorRequester` during favor-
response) and threads it into StatusBar. StatusBar swaps in
"[requester] coerces [target] · favor pending" copy. Defense-in-depth
test pins isMyTurn precedence — even if a future caller bug routes
both, your own-turn copy still wins. New `StatusBar.test.tsx` (didn't
exist) with 6 tests across both #022 and #005 surfaces.

**Issues #012/#014/#015 — Go Dark drama beat + observer toast.** Three
related vibe gaps, two surfaces:
- DramaOverlay `card-played` case for `cardType === 'go-dark'`
  (combos excluded). ACTOR sees "GONE DARK" (subdued, second-person);
  observers + board see "[NAME] WENT DARK" (third-person). New
  `.gonedark` style — charcoal radial gradient, sodium-vapor text-
  shadow. `transient: true` so a turn-started arrival aborts the beat
  (same treatment as INTERCEPTED).
- PlayerAlert `card-played` toast on observer phones: "[Name] played
  [CardName]." for non-combo, non-Go-Dark, non-extraction plays. Three
  filters: own play (actor sees their own staging confirmation), cards
  with their own DramaOverlay beats (Go Dark / extraction), combos
  (combo-steal carries the meaningful payload).
- No new unit tests for these — behavior chains across event-feed +
  drama-active + multi-component gating that doesn't shallow-test
  cleanly. Existing PlayerAlert / DramaOverlay surfaces follow the
  same precedent: live calibration-run verification.

**Issues #001/#002/#003/#011/#018 — catalog gate at log-write time.**
Five seeds, all the same shape: seat agents invented scenarioIds
(`SESSION-START`, `GAME-START-OBSERVATION`, `TURN-TRANSITION-
SEAT1-TO-SEAT2`, `INTERCEPT-WINDOW-OBSERVED-SEAT1-TURN`) for lifecycle
moments not in `SCENARIOS.md`. Clusterer routed each as a
`scripted-scenario` seed — five wasted triage agent spawns. Mechanical
fix: `parseSeatLogString` + `parseSeatLog` gain optional
`{ validScenarioIds: ReadonlySet<string> }` option. When provided,
every `scenario-fire` entry's scenarioId is cross-checked after schema
validation; mismatches become parse errors with the bad ID and accepted
catalog set in the message. Suspicion / vibe-check / ui-spec-divergence
NOT gated — `relatedScenario` is allowed null and serves a different
axis. `triage-pipeline.ts` `runTriagePipeline` loads catalog FIRST,
derives validScenarioIds, threads into `loadSeatEntries`. +5 log-parser
tests covering reject / accept / opt-out / non-fire passthrough /
empty-catalog message.

**Visual verification still pending.** 1110/1110 unit tests + typecheck
green is necessary but not sufficient — the FavorReport cinematic, Go
Dark drama beat, observer toast, under-attack copy, and favor-pending
OTHER-alive copy all need real-device or calibration-retry verification.
Bundling all of it for Briggsy's next session.

**Local-only changes (gitignored).** The 2026-04-29-2139-3p run dir is
under the rolling-retention gitignore policy, so the issue-file status
flips for #006 and #010 are local. Schema extension that supports
RESOLVED ships in commit `236d637d`.

### THIS SESSION (2026-04-30 morning) — ISSUE #010 PARTIAL CLOSE (FAVOR VIBE GAPS A+B)

Briggsy's "in order" pickup, item 2 of 3 (after the #006/#007 revert).
Issue #010 from the calibration triage: dual-seat
`feltLikeArcher: no` on the Favor exchange — silent database
transaction on both phones. ACTOR stared at locked staging for 7
minutes with no feedback the prompt landed; TARGET surrendered card
with no drama; ACTOR got no acknowledgment of the receive.

**Challenged the premise this time.** The triage agent's Option A
proposed adding a "Double-tap" gesture qualifier to the staging
hint copy — that directly contradicts Briggsy's gesture-vocabulary
call from the #006/#007 revert ("once you figure out tap previews
and double-tap stages, UX should be good"). Skipped Gap 1 entirely.
Gaps 2 (ACTOR has no waiting feedback) and 3 (ACTOR receives
nothing on transfer) verified as real silence holes — engine
produces correct state, presentation layer is absent.

**Gap 2 fix shipped — ACTOR waiting state in SmartActionBox.**
- `Player.tsx` derives `isFavorRequester` (mirror of the existing
  `isFavorTarget`) and `favorTargetName`. New prop
  `favorWaitingFor: { targetName } | null` threaded through
  `StagingArea` to `SmartActionBox`.
- `SmartActionBox` deriveState gains a new branch BEFORE `favorMode`:
  when `favorWaitingFor` is non-null, return `key: 'favor-waiting'`
  with text "Waiting for ${targetName} / to surrender a card",
  interactive: false, standby styling.

**Gap 3 fix shipped — receiver-side toast in PlayerAlert.**
- `PlayerAlert.tsx` favor-given case extended: when
  `event.receiverId === myId`, return text "Coerced a card from
  ${nameOf(giverId)}." with `tone: 'urgent'`. Sharpens the verb to
  match the combo-steal stealer toast — same category of moment
  (forced surrender between operatives).
- The `favor-given` event does not carry cardType (verified in
  `src/shared/types.ts:41`), so the toast can't name the specific
  card. The receiver reads it off their hand. Acceptable tradeoff
  — generic copy beats fabricating server semantics.

**Earth verification.** Live Playwright MCP against real
wrangler+vite+game on a fresh 2-player room. Cycled turns until
favor card landed in Seat1's hand. Played Call in a Favor →
Seat1's phone showed "Waiting for Seat2 / to surrender a card"
(was: misleading "Double-tap a card to stage it" hint). Seat2
surrendered Dash Barlowe → Seat1's phone showed "Coerced a card
from Seat2." urgent toast (was: silent, hand-count just ticked
7→8). Both gaps closed in real environment.

**Skipped Option C (full FavorReport cinematic).** The diagnosis
correctly flagged this as scope-creep risk — favor-given doesn't
emit cardType to the receiver, so a StealReport-style hero beat
would either special-case the protocol or land without the card
identity. Bigger design conversation if A+B leaves a vibe hole on
re-test.

**Side-fix:** stripped CRLF line endings from `Player.tsx` and
`StagingArea.tsx` post-edit. The Edit tool re-wrote both files
with CRLF, which made `git diff` show whole-file rewrites under
LF-canonical repo policy. Caught at pre-commit.

**Test surface:** typecheck clean · 1095/1095 unit tests · full
chromium e2e 12/12 PASS in 43.8s.

### THIS SESSION (2026-04-30 morning) — ISSUES #006/#007 REVERTED (premise was wrong)

Honest accounting: I shipped a fix for triage issues #006/#007 that
broke the app's gesture vocabulary. Briggsy caught it on review
("now if you preview a card, you must stage it... feels inconsistent
... do you feel there is something wrong with the double tap
gesture?"). He was right.

**What the gesture vocabulary actually is:**
- Hand card tap: single = preview, double = stage
- Enlarged card tap: single = return-to-hand, double = stage
- StagingArea tap: single = preview, double = unstage

The discriminator is universal: single-tap = inspect (reversible
peek), double-tap = commit. It's coherent, mobile-native, and
already works the same way across the whole app.

**What I shipped (and reverted):** Read the triage agent's
diagnosis ("tap-on-enlarged dismisses instead of staging — fix it")
verbatim and implemented Option A (single-tap on enlarged card =
stage). That broke the consistency: hand teaches "single = peek,
double = commit," and my "fix" inverted it on the enlarged surface
to "single = commit." A user who's "just looking" at a preview
could accidentally commit by tapping the card.

**Where I failed.** CLAUDE.md says "ask 'why did the old code do
it this way?' — understand before removing." I read the
`single=dismiss, double=stage` comment and inverted without asking
why. The deeper question — "is the gesture wrong, or is this
first-time discoverability friction?" — I never asked. The two
seats in the triage were favor-targets whose first interaction with
the app was the favor prompt, with no preceding turn to teach the
gesture. They tapped twice (got dismissed), then eventually
discovered double-tap on the hand card. That's first-time friction,
not a gesture bug.

**Revert shipped.** `Hand.tsx` restored to original behavior. The
in-code comment now spells out the gesture vocabulary explicitly so
the next agent does not repeat the mistake under the same triage
pressure.

**Regression contract.** Spec `tests/e2e/hand-enlarged-tap-stage.spec.ts`
rewritten to LOCK the consistent gesture (3 tests):
- single-tap on enlarged card returns it to the hand (no staging)
- double-tap on enlarged card stages it
- single-tap on backdrop dismisses without staging
All 3 PASS. Full chromium e2e 12/12 PASS. Future "fixes" against
the same triage pressure now hit the regression spec.

**Kept:** `playwright.config.ts` baseURL `localhost` → `127.0.0.1`.
Unrelated improvement — on Windows, `localhost` resolves to `::1`
first, where another local vite process can squat on IPv6 loopback
while BURNED's vite binds IPv4 + dual-wildcard, silently routing
e2e traffic to the wrong dev server. 127.0.0.1 forces IPv4 and
bypasses the race entirely. Real win, kept across the revert.

**Triage issues #006/#007 reclassified.** Not interaction bugs;
first-time-friction with a coherent gesture vocabulary. The vibe
gap (`feltLikeArcher: no` from same scenario) IS a real issue —
that's #010 (ACTOR-waiting signal + TARGET drama beat), still open
and unaffected by this revert.

**Test surface:** typecheck clean · 1095/1095 unit · 12/12 chromium
e2e (44.0s) · 3/3 new gesture-contract specs (12.5s).

### THIS SESSION (2026-04-30 morning) — ITEM #17 CLOSED, CALIBRATION COVERAGE GATE GREEN

Briggsy "go get em tiger"-style on the ordered queue. Item #17
(catalog drift) closed end-to-end with the judgment call resolved
on-the-fly: it was a false dichotomy. Both scenarios are valuable;
they were misnamed against engine card types.

**The judgment call I framed last night was wrong.**
- `SCN-SKIP-NORMAL-01` referenced `cardType: skip` (doesn't exist).
  The behavior under test (turn ends without draw) IS the canonical
  Skip behavior, and BURNED's name for that card is `go-dark`. So
  the scenario was always testing Go Dark — the catalog just had the
  wrong cardType identifier. **Renamed: SCN-GO-DARK-NORMAL-01.**
- Old `SCN-GO-DARK-NORMAL-01`'s prose described Shuffle ("stack-
  shuffle with no exposed identities", "applyShuffle clears
  pendingFuture") but its cardType said `go-dark`, which is Skip.
  The actual Shuffle card in BURNED is `burn-the-files`. The author
  conflated the BURNED card name "Go Dark" with the colloquial idea
  of obscuring/scrambling. **Renamed: SCN-BURN-THE-FILES-NORMAL-01.**

Both scenarios survive, both test what they were intended to test,
and the names now match the actual cards in `card-defs.ts`. The
production catalog (`SCENARIOS.md`) already has SCN-GO-DARK-NORMAL-01
done correctly — the mini-catalog now matches.

**Mechanical drifts fixed in same edit:**
- favor-requested: `playerId` → `requesterId`
- favor-given: `playerId` → `giverId`, `recipientId` → `receiverId`
- combo-steal: `playerId` → `stealerId`
- `shuffle-applied` → `deck-shuffled`
- Dropped non-existent `turn-ended` event from SCN-GO-DARK-NORMAL-01
  fire signature (engine uses next player's `turn-started` as the
  handoff signal).

**Parallel fix in `agent-launcher.ts`:**
`isRolePrimaryInFireSignature` now scans ALL `where`-field VALUES
for `$ACTOR` / `$TARGET` sigils, not just `where.playerId`. Without
this, the catalog renames would have collapsed primary-role
recognition to a one-line pointer for every favor / combo-steal
scenario. +1 regression test pinning the contract against
`requesterId: '$ACTOR'`.

**Earth verification — `detectFires` replay against saved
`events.jsonl` from `runs/2026-04-29-2139-3p`:**

| Scenario | Tier-1 | Match |
|---|---|---|
| SCN-FAVOR-NORMAL-01 | pass | with-divergence (tier-2 — issue #019) |
| SCN-COMBO-TRIPLE-NAMED-STEAL-NORMAL-01 | fail | no-fire (no triple in session) |
| SCN-INTERCEPT-CHAIN-BURN-01 | fail | no-fire (no intercepts in session) |
| SCN-GO-DARK-NORMAL-01 | pass | with-divergence (tier-2) |
| SCN-BURN-THE-FILES-NORMAL-01 | pass | with-divergence (tier-2) |
| SCN-BURNED-DRAW-AXIS11-01 | pass | with-divergence (tier-2) |

**Coverage: `fired 4 / threshold 1` — primary gate PASSES.**
Previous coverage on the SAME events.jsonl was `fired 0 / threshold 1`.
Mechanical proof that catalog-vs-engine drift was the root cause.

The 4 with-divergence fires all fail at tier-2 because of the
placeholder substitution + redacted-myHand defects already triaged as
issue #019. Separate work, not regression.

The 2 no-fire scenarios are correct: agents didn't play a triple-
of-a-kind combo or any intercepts in the calibration session.
Matcher reporting truth.

**Test surface:** typecheck clean · 1095/1095 unit tests (+1 from
prior 1094: agent-launcher role-primary regression test) ·
`pnpm playtest:phase4-smoke` PASS · `pnpm playtest:phase5-smoke`
PASS · earth replay through `detectFires` against the prior run's
saved events.jsonl confirms 4 real fires.

**Insight 042 status:** redirected → CLOSED. Both layers fixed
(catalog field names + agent-launcher role-primary scan). Judgment
call resolved with renames; both scenarios kept.

### PRIOR SESSION (2026-04-30 overnight, autonomous) — TRIAGE + #18 + REAL #17 ROOT CAUSE

While Briggsy slept, three queue items moved.

**Item #1 (triage agents) — CLOSED.** All 22 `playtest-triage` agents
dispatched in parallel against `runs/2026-04-29-2139-3p/triage-specs/`.
Each wrote one diagnosed issue file. INDEX.md regenerated via new
`scripts/playtest/regen-issue-index.ts` utility. Final triage shape:
**22 issues / 0 P0 · 6 P1 · 15 P2** (one issue lacks severity);
**12 OPEN, 8 KNOWN-PRODUCT-CALL-CONFIRMED, 2 LOW-SIGNAL.**
`verify-calibration`: **7/7 PASS** against the run dir for the first
time with real triage content (was 7/7 with INDEX.md=0 issues
yesterday).

The issues independently corroborate Briggsy's session findings AND
add concrete file:line root causes:
- **005** (P1): `StatusBar.tsx` has no `favor-pending` branch — phone
  controllers for non-target players show stale "X is on deck" during
  Favor exchange. New issue, not in E2E-ISSUE-LIST.
- **006 + 007** (P1): Single-tap on hand card during favor-response
  opens enlarged preview backdrop that intercepts pointer events;
  staging button stays `disabled`. Double-tap is the working path.
  Two seats found it independently. NOT covered by B-05.
- **010** (P1): Favor exchange reads as "form submission" / "database
  transaction" — three concrete root causes pinned to file:line
  (`SmartActionBox.tsx:184`, `SmartActionBox.tsx:196-215`,
  `PlayerAlert.tsx:86-96` + missing favor case in `DramaOverlay`).
- **019** (with-divergence-fire): Tier-2 oracle has TWO
  defects — `$ACTOR` / `$TARGET` placeholder substitution missing
  before string compare; and `myHand[*].type` always redacted, making
  catalog assertions structurally untestable. Affects every scenario
  using those tokens.
- **022**: Direct Order target sees silent double-draw — no "under
  attack" indicator. `currentTurn.turnsRemaining` is in projection
  already; rendering-only fix.
- **001/002/003/011/018**: 5 separate seeds where seat agents
  invented scenario IDs not in `SCENARIOS.md` (SESSION-START,
  GAME-START-OBSERVATION, TURN-TRANSITION-SEAT1-TO-SEAT2,
  INTERCEPT-WINDOW-OBSERVED-SEAT1-TURN). Schema validator should
  cross-reference catalog at log-write time.

**Item #18 (screenshots polluting cwd) — CLOSED.** Three-layer fix:
- `RunDirPaths.screenshotsDir` added; `createRunDirectory` mkdirs
  `<runDir>/screenshots`.
- `BuildSeatPromptInput`+`BuildLaunchSpecsInput` accept
  `screenshotsDir`; `SCREENSHOTS_DIR` placeholder renders into the
  prompt. `createAgentLauncherDriver` derives it from runDir.
- `seat-scripted.md` + `seat-free-play.md` gain a SCREENSHOTS section
  mandating `path: '{{SCREENSHOTS_DIR}}/{{SEAT_ID}}-<ts>-<tag>.png'`,
  a worked example, and an ANTI-PATTERN entry. Insight 042 referenced.

  Verification: `pnpm typecheck` clean; 56/56 unit tests pass across
  run-directory / agent-launcher / seat-factory; phase4-smoke +
  phase5-smoke both PASS.

**Item #17 — REDIRECTED then CLOSED 2026-04-30 morning.** Original
diagnosis was wrong layer (it blamed seat-prompt behavior, but
`coverage-reporter` reads `events.jsonl`, not seat logs). Real root
cause was **catalog drift** in `scripts/playtest/fixtures/mini-catalog.md`
— field-name and event-name mismatches vs the engine plus a parallel
drift in `agent-launcher.ts`. Closed in the next session — see
"THIS SESSION (2026-04-30 morning)" entry above.

### PRIOR SESSION (2026-04-29 late evening) — FIRST END-TO-END CALIBRATION SUCCESS

**Calibration retry attempt #3 (`runs/2026-04-29-2139-3p`) is the first
end-to-end successful calibration in BURNED history.** Three real seat
agents joined a 30-minute live game, fired scripted scenarios, logged
vibe-checks, and surfaced real product findings. `verify-calibration`:
**7/7 PASS for the first time ever against a real session run-dir** —
session.md outcome=success · isolation-audit PASS (0 breaches) ·
events.jsonl 29 lines · 630 myHand entries all `<redacted>` ·
30 entries across 6 seat files · coverage.md renders · issues/INDEX.md
present.

**What unblocked it.** Earlier today's Fix A (board launcher waits for
configured roster, not product minimum) compounded with the **MCP
permissions fix shipped this session** (commit `63880585` —
`mcp__playwright-seat-{1..10}__*` allowlisted in
`.claude/settings.local.json`). Two earlier retry attempts in this
session bounced because every seat agent's first
`browser_navigate` call auto-denied: subagents in background mode
have no foreground UI for prompts, and the global allowlist had
`mcp__playwright__*` (the original server) but not the hyphenated
per-seat namespaces (`mcp__playwright-seat-N__*`) added in Phase 6
Unit 2.5 / insight 031. Closes new item #16.

**Real product findings from the agents (this is the prize):**
- **SCN-FAVOR-NORMAL-01** — Seat-1 ACTOR + Seat-2 TARGET both vibed
  **NO**. ACTOR called it "form submission feel"; TARGET called it
  "database transaction." Real finding for ACTOR: zero feedback that
  prompt is pending on TARGET's side.
- **SCN-BURNED-DRAW-AXIS11-01** — Seat-2 ACTOR vibed **YES**, "best
  beat in the session, genuine tension." DefusePlacement hero card
  read as tactical decision. The fix landed earlier in the session
  (item #14 from the morning) is producing the right beat.
- **SCN-GO-DARK-NORMAL-01** — Seat-1 vibed **UNSURE**, "shuffle
  invisible on phone, count-only feedback."
- **SCN-SKIP-NORMAL-01** — Seat-1 ACTOR vibed **YES** ("clean and
  decisive"); Seat-2 OBSERVER vibed **UNSURE** (no announcement of
  what was played).
- **UX discoverability bug:** Seat-2 found that single-tap on a hand
  card opens an enlarged preview whose backdrop intercepts pointer
  events, so the staging-button stays unreachable; double-tap is the
  working stage path. New players will not discover this.
- **WebSocket drop mid-game:** all three seats observed a ~50s
  reconnect window followed by `ERR_CONNECTION_REFUSED` near the
  session timeout — consistent with orchestrator finalize timing,
  but worth a closer look (insight 036 territory: the harness shut
  down server while seat browsers were still alive).

**Coverage counter shows `fired 0 / threshold 1` despite the agents
referencing 4 distinct scenarios in their logs.** The agents put
scenario references in `vibe-check` and `ui-spec-divergence` entries
(which carry `relatedScenario`), but the formal `scenario-fire`
entryType is what `coverage-reporter` counts. Triage clustering still
picked them up (22 seeds → 22 specs), so the signal isn't lost — it's
just not being counted in the coverage gate. Small prompt-tuning task
for next session — see new item #17.

**Triage agents NOT auto-dispatched** (item #1, still open). 22 specs
under `triage-specs/` but `issues/INDEX.md` shows `Total issues: 0`
because no `playtest-triage` agent ran on each spec. Next session can
either dispatch them in a single parallel volley or document the
manual procedure.

| Commit | Closes | Subject |
|---|---|---|
| `29ad34cb` | item #6 | fix(playtest-harness): wait for ALL configured seats before clicking start |
| `e86a5f92` | item #6 follow-up | fix(join-screen): surface server refusals inline |
| `8f6233d6` | docs | docs(todo): close item #6 — board launcher gate + JoinScreen inline error |
| `243be33e` | chore | chore(join-screen): normalize JoinScreen.tsx to LF line endings |
| `72fda71f` | docs | docs(todo): calibration retry attempt — Fix A earth-verified, blocked on MCP permissions |
| `63880585` | item #16 | chore(permissions): allowlist mcp__playwright-seat-{1..10}__* for harness seats |

### PRIOR SESSION (2026-04-29 evening) — what shipped

Item #6 closed end-to-end with the underlying root cause traced and a
generalised insight captured. Plus a discovered-along-the-way UX gap
on JoinScreen (server refusals were silently dismissed by a 2s toast
the user couldn't catch).

**Item #6 was framed wrong.** The TODO's "third-seat-fails-to-join"
description treated the third seat as the failing party. Real cause:
the orchestrator's board-view launcher polled for `button:has-text(
"Cleared Hot")` and clicked the moment it became visible — but that
selector flips on at the **product minimum** (`canStart >= 2`,
`Lobby.tsx:35`), not the **configured roster** (`config.seats`). With
3+ seats configured, whichever seat's MCP browser was slow to boot
consistently missed the start. Two-step gate fix: launcher now waits
for `[data-player-count="${seats}"]` first (slow wait,
`waitForStartTimeoutMs`), then `button:has-text("Cleared Hot")`
(incidental, fixed 5s), then click. Orchestrator forwards
`config.seats` as `expectedPlayerCount`, validated to [2, 10].

**JoinScreen UX gap (TODO #6 follow-up).** While tracing #6 I learned
the JoinScreen never read `gameStore.lastError`, so server refusals
(`GAME_ALREADY_STARTED`, `NAME_TAKEN`, etc.) only flashed via the
global `<ErrorToast>` for 2s. A user looking at the form below the
toast easily missed the flash and end up clicking Check In repeatedly
with no feedback — exactly the symptom calibration seat-3 reported.
JoinScreen now subscribes to `useLastError`, surfaces the message
inline below the input, persistent until the user types.

Three remaining items in the priority queue: #1 (operator-process —
auto-dispatch triage agents), #7 (operator runbook — MCP cross-run
collision), #15 (open-ended cinematic framing for chain-burn beat).
None are autonomous-friendly without a Briggsy decision or an
eye-in-loop session. Phase 6 calibration retry is the natural next
unblock now that the start-gate hole is closed.

| Commit | Closes | Subject |
|---|---|---|
| `29ad34cb` | item #6 | fix(playtest-harness): wait for ALL configured seats before clicking start |
| `e86a5f92` | item #6 follow-up | fix(join-screen): surface server refusals inline |

**Insights captured:**
- 041 — Orchestrator gate on product minimum, not configured roster.
  Generalised lesson: when an orchestrator polls a UI for "is the
  right state reached," it should poll for the actual desired state,
  not a coincidentally-correlated signal that diverges under
  multi-actor timing. If the desired state isn't visible in the DOM,
  add it as a data attribute rather than re-deriving it from a flag
  that's only equal under specific configurations.

**Test surface:** typecheck clean · 1093/1093 unit tests (+23 from
prior 1070: +12 board-view-launcher count gate / validation /
timeout split, +5 orchestrator config.seats forwarding, +6 JoinScreen
inline server-error surfacing) · `pnpm playtest:phase6-board-launcher-
smoke` PASS (9.4s wallclock, all 4 assertions, new count-gate log
breadcrumbs visible) · full e2e suite (chromium project) PASS 9/9 in
46.7s including 2 new `tests/e2e/join-screen-server-error.spec.ts`
specs that drive the GAME_ALREADY_STARTED path against live wrangler+
vite + the existing `tier1-lifecycle` happy-path coverage.

Earth verification (#6): `pnpm playtest:phase6-board-launcher-smoke`
log output shows the new count-gate firing and resolving against real
DOM:

```
[board-view-launcher] waiting for 2 operatives ([data-player-count="2"], timeout 180000ms)
[board-view-launcher] waiting for "Cleared Hot" (timeout 5000ms)
[board-view-launcher] clicking "Cleared Hot"
```

Earth verification (#6 follow-up): `tests/e2e/join-screen-server-
error.spec.ts` proves the inline error surfaces against a live
GAME_ALREADY_STARTED response and clears on input.

**Eye-in-loop still required for the Phase 6 calibration retry.**
All harness-side blockers identified through the calibration pipeline
(items #1, #3, #4, #5, #6, #13) are now closed. Running the retry
autonomously would skip Briggsy's verification of the full pipeline
against real seat agents — recommend booting the retry as the first
thing next session with eye-in-loop.

### CALIBRATION RETRY ATTEMPT 2026-04-29 evening — PARTIAL: blocked on permissions

Run dir: `docs/testing/playtest/runs/2026-04-29-1958-3p`. Pre-flight
green. Orchestrator booted, manifest emitted, board view spawned.
**Fix A from this session validated against real harness:** board
launcher correctly waited for `[data-player-count="3"]` (not the old
product-minimum 2) — log line `[board-view-launcher] waiting for 3
operatives ([data-player-count="3"], timeout 1800000ms)` is the
direct earth-verification of commit `29ad34cb` against a real
calibration run.

**Blocker:** all 3 dispatched seat agents failed on first action with
`mcp__playwright-seat-N__browser_navigate` permission denial.
`.claude/settings.local.json` has no allowlist for any
`mcp__playwright-seat-*__browser_*` tool, so each call falls to
interactive approval — and Briggsy was AFK. Marker touched manually
to let the orchestrator finalize cleanly (didn't burn the 30-min
sessionTimeoutMs). Outcome: `success` with `coverage FAILED (fired
0 / threshold 1)`. verify-calibration: 6/7 PASS — same checks that
were green for `phase6-launcher-smoke` smokes are now green against
a real session run-dir, including check 6 (coverage.md renders).
Check 7 (issues/INDEX.md) failed as expected — no fires → no issues.

This was always the harness contract, not a regression: the seat
agents are sandboxed via the playwright-seat-N MCP servers per
insight 031, AND the user-level permission gate is the human-in-loop
checkpoint for the actual tool calls. Two enforcement layers,
intentional.

### Permissions blocker — operator decision needed (NEW item)

16. **Pre-approve `mcp__playwright-seat-{1..10}__browser_*` in
    `.claude/settings.local.json` so the calibration retry can run
    autonomously, OR commit to running it with Briggsy at the
    keyboard for first-call approval.** Each seat agent's
    Playwright-MCP namespace is already structurally bounded (insight
    031 — per-seat MCP server, `--isolated` browser, narrow
    frontmatter whitelist that excludes `browser_evaluate`,
    `browser_run_code`, `browser_console_messages`, `browser_tabs`,
    `browser_network_requests`). Auto-approving the whitelisted
    subset (`browser_navigate`, `browser_snapshot`, `browser_click`,
    `browser_fill_form`, `browser_type`, `browser_press_key`,
    `browser_wait_for`, `browser_take_screenshot`, `browser_hover`,
    `browser_select_option`, `browser_close`) would let the
    orchestrator run hands-off. Risk: those 11 tools × 10 seats =
    110 pre-approved permissions; any future addition to a seat's
    tool surface would auto-grant without review. Counter-risk:
    keeping interactive approval means every calibration run blocks
    on ~30+ first-touch prompts, making real autonomous runs
    impossible. Briggsy's call.

### PRIOR SESSION (2026-04-29 morning) — what shipped

Four Phase 6 calibration items closed plus three product/harness
bugs (#9 stray card selection, #11 chain-burn UX + Intercepted hint,
#13 seat-log schema drift). Four open items remain in the priority
queue below — recommended pickup order: **harness item #6
(third-seat-fails-to-join)** for an investigation thread the next
calibration retry will hit. Items #1 and #7 are operator-process
work that needs a human decision; item #15 is open-ended cinematic
framing better paired with a Briggsy eye-on-loop session.

| Commit | Closes | Subject |
|---|---|---|
| `76facca9` | item #3 | feat(playtest-harness): make coverage threshold configurable |
| `cc38ee8d` | item #1 | feat(playtest-harness): wire orchestrator to render real coverage.md |
| `4bfa80ee` |  | fix(playtest-harness): type detectFires mock so tsc accepts mock.calls[0] |
| `31c9d853` | docs | docs(todo): close Phase 6 calibration items #1 + #3 |
| `182cf02c` | item #4 | fix(server): exempt god observer from inactivity-kick close loop |
| `4f6967f0` | item #5 | test(playtest-harness): phase6-heartbeat-smoke (insight 034 regression) |
| `7729cb83` | docs | docs(todo): close Phase 6 calibration items #4 + #5 |
| `9fcb49e8` | item #9 | fix(card-interaction): cancel cross-card rapid taps without rescheduling |
| `d9c40753` | item #11 | fix(smart-action-box): expose Counter button to ACTOR mid-chain-burn |
| `31a98148` | item #13 | fix(playtest-harness): close seat-log schema drift on both ends |

**Insights captured:**
- 038 — Server inactivity-kick closed god observer along with players
  (closed by exempting god from the kick close loop).
- 039 — Tap-discrimination timer strands on cross-input rapid second
  event. `useDoubleTap` cancelled the pending single-tap timer on a
  cross-card second tap, then scheduled a NEW one for the new card,
  stranding an enlarge backdrop on a card the user didn't pick.
  Generalised pattern: delayed-discrimination timers must cancel on
  ALL ambiguous follow-ups, not only the qualifying one.
- 040 — Multi-violation files need multi-error surfaces, and LLM
  authors need concrete examples, not field lists. `verify-
  calibration` was reducing per-file error arrays to their first
  element before reporting; agent prompts listed required fields
  but never showed shape. Fix both ends or drift compounds silently.

**Test surface:** typecheck clean · 1070/1070 unit tests (+33 from
prior 1037: +5 coverage-reporter, +6 config-schema, +6 orchestrator
coverage wiring, +7 useDoubleTap hook-level with fake timers, +7
SmartActionBox chain-burn matrix + hint copy, +2 verify-calibration
multi-error surfacing) · all 7 e2e tests pass including the new
`tests/e2e/hand-cross-card-tap.spec.ts` regression spec (verified to
fail on the pre-fix #9 code via stash-revert-rerun cycle) · `pnpm
playtest:phase4-smoke` and `phase5-smoke` both PASS (template edits
for #13 don't break LaunchSpec rendering or the schema validator) ·
`pnpm playtest:phase6-launcher-smoke` PASS (24/24) · `pnpm
playtest:phase6-heartbeat-smoke` PASS twice (65s wallclock, 2 pings
observed, clean teardown, 0 workerd zombies).

Earth verification (#9): Playwright MCP against live 2-player game
(room `BNFD3P`) — cross-card pointer-event sequence on Dash Barlowe ×2
adjacent stranded zero backdrops; immediate same-card double-tap on
the same hand correctly staged. Screenshots in `temp/post-fix-no-
backdrop.png` + `temp/post-fix-staging-works.png` (gitignored).

Earth verification (#11): Playwright MCP against live 2-player game
(room `4RXMQJ`) — direct `__gameStore.serverSnapshot` mutation
injected an Intercepted into the active player's hand and a
`chainDepth: 1` nope window. SmartActionBox rendered "COUNTER · Ns"
intercept-styled and clickable; single-staged Intercepted (no
window) rendered the two-line "Intercepted is reactive / wait for
the Intercept button" hint. Screenshots in
`temp/intercepted-hint.png` + `temp/actor-counter-button.png`
(gitignored).

**verify-calibration check 6** ("coverage.md renders") GREEN for the
first time against a phase6-launcher-smoke run-dir.

**Eye-in-loop still required for the Phase 6 calibration retry.**
The four fixes that landed today (#1, #3, #4, #5) compound underneath
that retry; running it autonomously would skip Briggsy's
verification of the full pipeline against real seat agents.

### Insight 037 — closed (2026-04-27)

**✅ Insight 037 closed end-to-end (2026-04-27).** SmartActionBox
refactored to keep the `<button>` DOM stable across `state.key` changes;
`AnimatePresence` moved INSIDE the button to crossfade only the inner
text. Non-interactive states render as `<button disabled>` with compound
`.box.invalid` etc. CSS selectors lifting variant specificity over
`.box:disabled`.

Shipped:
- `src/client/player/SmartActionBox.tsx` — single stable `<button>` always
  rendered. `disabled={!state.interactive || buttonDisabled}`. Inner
  `<m.span key={state.key}>` wrapped in `<AnimatePresence mode="wait">`
  for text crossfade.
- `src/client/player/SmartActionBox.module.css` — `.box.standby`,
  `.box.invalid`, `.box.interceptWaiting` compound selectors win source-
  order against `.box:disabled` so each non-interactive variant keeps
  its identity. New `.content` flex column wrapper for the inner span.
- `src/client/player/SmartActionBox.test.tsx` — 5 new unit tests proving
  same `<button>` reference persists across state.key changes (the
  regression contract).

Verification:
- Typecheck clean · `pnpm build` green · 1037/1037 unit tests (+5 new).
- Existing `phase6-smartactionbox-clickability-smoke` still passes
  end-to-end (~14s wallclock; clicked real `.action` button via real
  wrangler+vite+Playwright; god-event landed; isolation audit PASS).
- Phone-side eye-in-loop (Briggsy, 2026-04-27): breathe pulse intact on
  `.action`; `:active { scale(0.97) }` still tactile during breathe;
  text crossfade reads smooth on stage/unstage; no flicker, no
  unmount-flash.

Commits: `65a53ce7` (refactor), `746e8e4e` (test type fix).

Phone budget impact: player initial JS 14.93 KB gzipped (+0.16 KB).
Total phone init ~96.24 KB, still under 100 KB budget.

---

### Insight 036 — closed (2026-04-27)

**✅ Insight 036 closed end-to-end (2026-04-27).** The diagnosis was
substantially revised after rereading the run artifacts: original "P0
real-player" framing was extrapolation. The two triggers we actually
observed were both harness-specific (orchestrator killed wrangler while
seat browsers were live; seat-3's WS handshake never completed).

The defect itself is real — `partysocket@1.1.16` defaults to
`maxRetries: Infinity`, so unbounded retries + the browser's
unsuppressible native "WebSocket connection failed" logs compose into a
storm whenever the server is unreachable.

Shipped:
- `src/client/connection.ts` — `maxRetries: 10`, `debugLogger: () => {}`,
  `'gave-up'` status when consecutive close-without-open count reaches
  the budget. ~75-90s wall-clock retry window before give-up.
- `src/client/player/ConnectionOverlay.tsx` + `.module.css` — terminal
  "// CHANNEL DOWN" UI with Refresh button on `'gave-up'`.
- `scripts/generate-playtest-seat-agents.ts` + seat-scripted/seat-free-play
  templates — added `browser_close` to seat-agent whitelist (Option A:
  agent owns its browser lifecycle), regenerated all 10 `.claude/agents/playtest-seat-N.md`
  files. Seat agents now close their browser before exit, removing the
  "wrangler killed while seat tab still alive" trigger.
- `src/client/connection.test.ts` — 5 unit tests covering threshold,
  reset, and one-time gave-up emission.
- `tests/e2e/reconnect-bounds.spec.ts` — Playwright regression: phone
  offline for 30s keeps console under 100 entries (pre-fix was thousands).

Coverage gap acknowledged in the insight: `setOffline` simulates "no
network" but not "server vanished while browser stayed alive" — the
underlying bounded-retry contract is the same, but a kill-wrangler-mid-
session test would close the gap if a future regression appears.

Full revised diagnosis at `docs/insights/036-websocket-reconnect-log-storm-hangs-browser.md`.

### Phase 6 calibration — pipeline is live; remaining gaps in priority order

**Calibration retry attempt #4 (run 2 — `runs/2026-04-26-1339-3p/`)
completed the full pipeline end-to-end for the first time:** manifest →
3 agent dispatches → seat play → log writes → isolation audit (PASS, 0
breaches) → triage clustering → 4 typed specs → INDEX.md generation.
verify-calibration: 5/7 checks PASS.

What's still missing:

1. **~~Triage agents not auto-dispatched.~~** CLOSED 2026-04-30 overnight.
   All 22 `playtest-triage` agents fired in parallel via the harness
   conversation against `runs/2026-04-29-2139-3p/triage-specs/`. Each
   wrote one diagnosed issue file. INDEX.md regenerated via new
   `scripts/playtest/regen-issue-index.ts` utility — 22 issues / 6 P1 /
   15 P2 / 0 P0; 12 OPEN, 8 KNOWN-PRODUCT-CALL-CONFIRMED, 2 LOW-SIGNAL.
   `verify-calibration` now 7/7 PASS with real triage content.
   Operator process: until a hook wires this in, the conversation
   reads `triage-specs.manifest.json` and dispatches one
   `Agent({subagent_type: 'playtest-triage'})` per seed (lean wrapper
   prompt: "Read your spec at <specPath>, follow it verbatim"), then
   runs `pnpm tsx scripts/playtest/regen-issue-index.ts <issuesDir>`.
   Hook wiring is the next durable step — Phase 6 todo.
2. **~~Coverage.md empty — Unit 10 renderer wiring deferred.~~** CLOSED
   2026-04-29 by commit `cc38ee8d`. Orchestrator now loads catalog +
   detects fires after teardown, calls `buildCoverageReport` +
   `renderCoverageMd`, writes to `paths.coverageMd`, and threads the
   real `CoverageReport` into `appendSessionEnd`. Each step is guarded
   with non-fatal fallback so a missing catalog or corrupt events.jsonl
   logs but does not abort the session-end block. Verified end-to-end:
   `phase6-launcher-smoke` (24/24 assertions, +5 new for coverage.md);
   `verify-calibration` check 6 GREEN for the first time against the
   smoke run-dir. Real calibration retry will re-confirm with non-zero
   fires.
3. **~~Coverage threshold hardcoded at 50.~~** CLOSED 2026-04-29 by
   commit `76facca9`. `Config.coverageThreshold?: number` plumbed
   through `ConfigSchema` (Zod `int().positive().optional()`) +
   `loadConfig` + `CoverageReportInput.coverageThreshold` +
   `buildCoverageReport`. Default remains 50 (PRD §8.2) via the
   exported `DEFAULT_COVERAGE_THRESHOLD` constant. The
   `CoverageReport.threshold` literal type widened from `50` to
   `number`. `calibration.json` sets `coverageThreshold: 1` so the
   6-scenario mini-catalog can satisfy the primary gate. Verified by
   +5 coverage-reporter test cases + +6 config-schema test cases
   (boundary, default, rejection of 0/negative/non-integer).
4. **~~God-subscriber server-side inactivity timeout.~~** CLOSED
   2026-04-29 by commit `182cf02c`. Diagnosis revised after reading the
   code: the original framing ("server is closing the WS proactively
   when no broadcasts flow") was wrong. Real root cause —
   `src/server/room.ts:onAlarm` fires after `INACTIVITY_TIMEOUT_MS =
   15min` of no PLAYER actions and closes EVERY connection (1000
   'Inactivity timeout'), including the orchestrator's god observer.
   Both fix paths the original TODO suggested (client keep-alive,
   per-connection idle relax) were wrong layer — the timer is a
   gameplay-level signal driven by `lastActionTime`, not a WS-traffic
   signal, and is room-wide not per-connection. Real fix: filter god
   out of the kick close loop. Three lines + comment + insight 038.
   Real-environment proof comes from the next calibration run (absence
   of "Inactivity timeout" close on god log).
5. **~~Heartbeat-aware regression smoke.~~** CLOSED 2026-04-29 by
   commit `4f6967f0`. New `pnpm playtest:phase6-heartbeat-smoke` boots
   real wrangler+vite, connects god subscriber with a wrapper-counter
   wsFactory, idles 65s (≥ 2 server ping cycles at 30s each), asserts
   (a) `onFatalClose` still pending, (b) ≥2 pings observed (presence-
   of-presence companion to defend against a server-side heartbeat
   regression), (c) clean disconnect, (d) no workerd zombies. Fills
   the gap left by all other smokes completing in <60s — none of them
   ever exercise the heartbeat. Defends insight 034. Does NOT cover
   the 15-min inactivity-kick path (item #4 above) — that's covered
   by code review + next calibration run.
6. **~~Third-seat-fails-to-join — three independent occurrences.~~**
   CLOSED 2026-04-29 evening by commits `29ad34cb` + `e86a5f92`.
   The TODO's framing was wrong — root cause was NOT a third-seat
   failure. The orchestrator's board-view launcher
   (`scripts/playtest/lib/board-view-launcher.ts:170-175`) polled for
   `button:has-text("Cleared Hot")` and clicked the moment it became
   visible. That selector flips on at the **product minimum**
   (`canStart >= 2` in `Lobby.tsx:35`), not at the **configured
   roster size** (`config.seats`). With 3+ seats configured, whichever
   seat's MCP browser was slow to boot consistently missed the start
   — orchestrator launched the game with the first two arrivals and
   the N-th seat hit `GAME_ALREADY_STARTED` from the in-progress
   server. The N-th seat couldn't see the refusal because JoinScreen
   never read `gameStore.lastError` (only the global 2s toast did).
   Two-part fix: (a) launcher gains `expectedPlayerCount` param +
   `[data-player-count="${seats}"]` data attribute on Lobby roster;
   orchestrator forwards `config.seats`. (b) JoinScreen subscribes to
   `useLastError`, renders server message inline below input,
   persistent until user types. +12 board-view-launcher tests, +5
   orchestrator config.seats-forwarding tests, +6 JoinScreen inline-
   error tests, +2 e2e specs (`tests/e2e/join-screen-server-error.
   spec.ts`). Earth verification: `phase6-board-launcher-smoke` PASS
   in 9.4s with new count-gate log breadcrumbs visible; full e2e
   suite (chromium) 9/9 PASS in 46.7s. Insight 041 captures the
   generalised lesson: orchestrators that poll a UI for state should
   poll for the actual desired state, not a coincidentally-correlated
   signal that diverges under multi-actor timing.
6.  **Earth verification 2026-04-29 evening (calibration retry attempt
    `runs/2026-04-29-1958-3p`):** Fix A confirmed working under real
    harness — orchestrator log shows
    `[board-view-launcher] waiting for 3 operatives ([data-player-count="3"], timeout 1800000ms)`,
    refusing to click "Cleared Hot" until the configured roster
    arrives. Run blocked on a separate issue (item #16 below — MCP
    permissions); item #6 itself remains closed.
7. **MCP browser cross-run collision.** When run 1's seat agents are
   still alive and run 2's agents are dispatched, both try to use the
   same `playwright-seat-N` MCP server / browser instance. Run 2's
   navigates step on run 1's state and lose. Operator process gap: cancel
   in-flight agents BEFORE re-dispatching. Worth noting in operator
   runbook.
16. **~~MCP playwright-seat permissions blocker.~~** CLOSED
    2026-04-29 late evening by commit `63880585`. Briggsy chose Path A
    — `.claude/settings.local.json` now has 10 explicit
    `mcp__playwright-seat-N__*` entries (one per seat). Earth
    verification: calibration retry attempt #3 ran end-to-end with all
    three seat agents successfully navigating, snapshotting, clicking,
    and writing logs. Subagents in background mode no longer auto-deny
    — the allowlist match auto-approves silently as designed.
    Sandboxing remains intact via the agent-frontmatter `tools:`
    whitelist (still excludes `browser_evaluate`, `browser_run_code`,
    `browser_console_messages`, `browser_tabs`,
    `browser_network_requests`).
18. **~~Seat agents write screenshots to project cwd, not the run dir.~~**
    CLOSED 2026-04-30 overnight. Three-layer fix landed:

    - `RunDirPaths.screenshotsDir: string` added to `run-directory.ts`;
      `createRunDirectory` now mkdirs `<runDir>/screenshots`.
      `seat-factory` and `run-directory.test.ts` updated.
    - `agent-launcher.ts`: `SCREENSHOTS_DIR` placeholder added to
      `PLACEHOLDER_NAMES`; `BuildSeatPromptInput` and
      `BuildLaunchSpecsInput` accept `screenshotsDir`. `buildLaunchSpecs`
      threads it through to `buildSeatPrompt`.
      `createAgentLauncherDriver` derives `<runDir>/screenshots`
      automatically. +1 placeholder-substitution test pinning the
      `SCREENSHOTS_DIR` resolution.
    - `seat-scripted.md` + `seat-free-play.md`: SCREENSHOTS section
      mandates `path: "{{SCREENSHOTS_DIR}}/{{SEAT_ID}}-<ISO-ts>-<short-tag>.png"`
      with worked example. ANTI-PATTERNS list now flags omitted-path
      calls. `screenshotHash` field guidance: bare basename only.

    Verification: `pnpm typecheck` clean; 56/56 unit tests pass across
    `run-directory.test.ts` / `agent-launcher.test.ts` /
    `seat-factory.test.ts`; `pnpm playtest:phase4-smoke` PASS;
    `pnpm playtest:phase5-smoke` PASS. Insight 042 captures the
    related calibration-catalog drift discovery.
17. **~~Agents log scenario references in vibe-check / ui-spec-divergence
    entries, NOT formal `scenario-fire` entryType.~~ REDIRECTED 2026-04-30
    morning, then CLOSED same day. Catalog field-name drift fixed; both
    scenarios renamed to match engine card types; agent-launcher
    role-primary scan widened to all where-field values; `detectFires`
    replay against the prior run's saved events.jsonl now reports
    `fired 4 / threshold 1` (was 0 / 1) — primary gate GREEN.** The TODO
    blamed seat-prompt behavior,
    but `coverage-reporter`'s `firedIds` set comes from
    `detectFires(catalogPath, eventsJsonlPath, …)` reading
    `events.jsonl`, NOT from seat-log `scenario-fire` entries
    (`scripts/playtest/lib/scenario-detector.ts:1161-1178` —
    `_seatLogPaths` is unused, prefixed with `_`). Whether agents
    write `scenario-fire` entries is independent of the coverage gate.
    **Real root cause: catalog drift in
    `scripts/playtest/fixtures/mini-catalog.md` vs engine event shapes
    in `src/shared/types.ts:35-65`.** Six scenarios cross-checked
    against the actual `events.jsonl` from run `2026-04-29-2139-3p`:

    - **SCN-FAVOR-NORMAL-01:** catalog `favor-requested where { playerId, targetId }`
      → engine `favor-requested { requesterId, targetId }`. Catalog
      `favor-given where { playerId, recipientId }` → engine
      `favor-given { giverId, receiverId }`. Both events emitted but
      tier-1 matcher rejected on `where`-clause mismatch.
    - **SCN-COMBO-TRIPLE-NAMED-STEAL-NORMAL-01:** catalog `combo-steal where { playerId }`
      → engine `combo-steal { stealerId, targetId, found, cardType? }`.
      No combo-steal fired this run regardless.
    - **SCN-SKIP-NORMAL-01:** catalog `cardType: skip` — there is NO
      `skip` card type. BURNED's `go-dark` ("End your turn without
      drawing") IS Skip per `src/shared/card-defs.ts:17`. Plus catalog
      requires `turn-ended` event which engine never emits.
    - **SCN-GO-DARK-NORMAL-01:** content collision. Title/prose
      describe Shuffle ("stack-shuffle with no exposed identities")
      but `go-dark` is Skip-without-draw, not Shuffle. The actual
      Shuffle card is `burn-the-files`. Plus catalog requires
      `shuffle-applied` event; engine emits `deck-shuffled { playerId }`.
    - **SCN-INTERCEPT-CHAIN-BURN-01:** field shapes match. Didn't
      fire because no chain-burn was attempted in the session.
    - **SCN-BURNED-DRAW-AXIS11-01:** field shapes match. May have
      been blocked by `shape: strict` semantics; needs verification.

    **Secondary drift in agent-launcher.ts:174-191.**
    `isRolePrimaryInFireSignature` only scans `where.playerId` for
    `$ACTOR` / `$TARGET`. After fixing catalog field names, this
    function would no longer recognize seats as ACTOR-primary
    (since `requesterId: $ACTOR` ≠ `playerId: $ACTOR`), and the
    seat would receive a one-line pointer instead of the full
    scenario block. Parallel fix: scan all `where` field values
    for the sigils.

    **Fix scope NOT yet decided** — judgment-call elements
    (SCN-GO-DARK semantic intent: Shuffle vs Skip; SCN-SKIP card-type
    naming) are content decisions that change what the calibration
    is measuring. See `docs/insights/042-calibration-catalog-field-name-drift-from-engine.md`.

    The mechanical fixes (favor field names, combo-steal field
    name, shuffle-applied → deck-shuffled, drop turn-ended,
    agent-launcher role-primary scan) are safe to apply once
    judgment calls are settled.

### Phase 6 calibration — product/UX bugs surfaced (independent of harness work)

These are real bugs the calibration found. Each goes into product triage,
not harness work.

8. **~~AnimatePresence ref-stale on SmartActionBox state swap (insight 037).~~**
   CLOSED 2026-04-27. Refactor landed in commits `65a53ce7` + `746e8e4e`;
   stable button DOM, AnimatePresence moved inside, +5 regression tests.
   Phone-side breathe + press feedback + text crossfade all verified.
9. **~~Stray card selection bug.~~** CLOSED 2026-04-29 by commit
   `9fcb49e8`. Diagnosis: `useDoubleTap`'s pending single-tap timer was
   cancelled by ANY second tap, but a cross-card second tap also
   scheduled a NEW timer for the new card. 400ms later that timer fired
   `onSingleTap(newCardId)` and opened the enlarge backdrop on the
   wrong card — typically blocking End-turn. Fix: cross-card rapid taps
   now cancel + reset without rescheduling (ambiguous intent → no
   action). Same-card double-tap (primary stage gesture) unchanged.
   Coverage: +7 hook-level tests with fake timers (bug-repro fails
   pre-fix, passes post-fix); new e2e spec
   `tests/e2e/hand-cross-card-tap.spec.ts` verified by stash-revert-
   rerun cycle. Earth-verified via Playwright MCP against live 2p
   game (room BNFD3P): cross-card sequence stranded zero backdrops,
   same-card double-tap still staged Dash Barlowe cleanly. Insight 039
   captures the delayed-discrimination-timer pattern.
10. **~~INTERCEPTED toast leaks across turn boundaries.~~** CLOSED
    2026-04-27 by commit `041e45c1`. Diagnosis: not a PlayerAlert /
    StealReport gap — DramaOverlay's nope-played beat (1400ms hold +
    slam-in/out = ~2s total) was overlapping the next player's turn
    when turn-started fired during the animation window. Fix:
    classified beats as transient (only INTERCEPTED today) vs critical
    (BURNED / EXTRACTED / ELIMINATED / WINS); transient aborts via
    GSAP timeline kill on turn-started arrival, or skips queueing
    entirely if turn-started is in the same event batch. Critical
    beats untouched. Verified via Playwright DOM injection.
11. **~~"Can't play Intercepted" UI has no context.~~** CLOSED
    2026-04-29 by commit `d9c40753`. Diagnosis was substantially revised
    after rereading the engine: the original TODO copy ("only opponents
    can play it") is technically wrong. `engine.ts:980` only rejects
    self-nope at chainDepth=0 — ACTOR chain-intercept at chainDepth>=1
    is fully legal. The bug was in the UI, not the rule:
    SmartActionBox's `nopeWindow && !myTurn && isAlive` gate hid the
    Intercept/Counter button from the ACTOR for the ENTIRE window, so
    they never had a way to chain-burn except via direct hand staging,
    which validation rejected with the flat "Can't play Intercepted"
    label. Two-part fix: (a) expose Counter button to ACTOR when
    `chainDepth >= 1`, and (b) replace the flat refusal with a two-line
    hint — "Intercepted is reactive / wait for the Intercept button" —
    for the genuine out-of-window case where the user has staged
    Intercepted alone with no nope context to drive it. +7 unit tests
    covering the chain-burn matrix (chainDepth=0/1/2, has/no
    Intercept, eliminated, click fires, non-actor regression) plus
    +1 hint-copy test. Earth-verified via Playwright MCP against live
    2p game (room 4RXMQJ): direct gameStore mutation injected
    Intercepted + chainDepth=1 nope window for the active player; UI
    rendered "COUNTER · Ns" intercept-styled and clickable, single-
    staged Intercepted showed the two-line hint as designed.
12. **~~Reconnect UX has no upper-bound surface.~~** CLOSED 2026-04-27 by
    insight 036's gave-up state + ConnectionOverlay terminal UI.
13. **~~Schema drift in seat logs (calibration finding).~~** CLOSED
    2026-04-29 by commit `31a98148`. The TODO suggested EITHER prompt
    tightening OR validator improvement; the right call was BOTH —
    drift fights happen at both ends and either alone leaves a hole.
    Two-end fix: (a) `verify-calibration` check 5 now collects ALL
    parse errors per file (not just the first) with block indexes
    prefixed, total count in the header — calibration retry run
    `2026-04-26-1303-3p` had two distinct violations in one file
    (`scenarioId: null` + `questionsTried: <string>`); pre-fix only
    one surfaced. (b) `seat-scripted.md` + `seat-free-play.md` gain
    a "Concrete YAML examples" section with one fully-formed block
    per entryType plus a "Field shape rules" section that calls out
    the drift sources by name (scenarioId always string,
    questionsTried always array, etc.). +2 verify-calibration tests
    pinning multi-error visibility (two drifts one file, two seats
    cross-file aggregation). `pnpm playtest:phase4-smoke` and
    `phase5-smoke` both PASS — template edits don't break the
    LaunchSpec rendering pipeline. Insight 040 captures the
    pattern: multi-violation contexts need multi-error surfaces,
    and LLM authors need examples not just constraints.
14. **~~Agent X card renders larger than other hand cards (NEW 2026-04-27).~~**
    CLOSED 2026-04-27 in two commits: `0f145148` (asset reframe — half-fix)
    and `308bbdbf` (true root cause — `min-height: 2lh` on `.cardDesc`).
    Diagnosis arc: initial hypothesis was asset-only (Agent X figure
    framed tighter than operatives). Asset regen helped but didn't
    eliminate the perception. Pixel-measured at 390×844 revealed the
    real cause: `.cardIllustration` is `flex: 1 1 0` and was absorbing
    21px of vertical space freed by Agent X's one-line description
    ("Wild — counts as any operative type.") vs operatives' two-line
    descriptions. `min-height: 2lh` on `.cardDesc` (at the >=177px
    container breakpoint) pins the description block so outlier cards
    don't yield space to the illustration zone. Verified across phone
    portrait + iPad landscape: all card illusZoneH now identical
    (368px / 465px respectively).
15. **Vibe-check signals (NOT bugs, but worth capturing).** Old seat-2
    v1 vibe-checked SCN-INTERCEPT-CHAIN-BURN-01 as **NO** ("mechanically
    correct but cinematically flat; no dramatic framing or resolution
    beat") and SCN-FAVOR-NORMAL-01 as **UNSURE** ("setup UI was visually
    strong, but resolution never completed"). These are §8.7 acceptance-
    criteria signals. The first ("Archer-coded heist beat") needs a
    framing pass on the chain-burn animation; the second is moot until
    #5 above is closed.

### PRIOR SESSION (2026-04-26 / 27) — what shipped

Three product/test commits + a squeaky-clean. Insight 035 closed end-
to-end with regression protection; calibration retry attempt #4 ran the
full pipeline for the first time and surfaced 14 distinct findings (see
TOP OF THE QUEUE above).

| Commit | Subject |
|---|---|
| `85fa0365` | fix(smartactionbox): lift breathe pulses to ::after pseudo |
| `5c0310f6` | test(playtest-harness): phase6-smartactionbox-clickability-smoke |
| `803ebb61` | chore(playtest-harness): prep calibration retry — bump timeout, random room code |

**Calibration retry results:**
- Run 1 (`runs/2026-04-26-1303-3p/`) — 5-min nope window era, ISOLATION_BREACH
  on screenshots-in-seats-dir. 3 scenarios fired (SCN-FAVOR-NORMAL-01,
  SCN-INTERCEPT-CHAIN-BURN-01, SCN-SKIP-NORMAL-01) before sessionTimeoutMs.
- Run 2 (`runs/2026-04-26-1339-3p/`) — 10s nope window. **PASS isolation, 4
  triage specs produced (first time), 1 scenario fired (SCN-GO-DARK-NORMAL-01),
  verify-calibration 5/7 at the time of the run.** Failures: seat-log
  schema drift (item #13 below, still open) + coverage.md empty (item
  #2 above, CLOSED 2026-04-29 — next calibration retry will rerun
  verify-calibration against a freshly-rendered coverage.md).
- Insight 035 fix held under real harness load (seat-1 v2 successfully fired
  SCN-GO-DARK-NORMAL-01 by clicking `.action`).
- 0 workerd zombies post-teardown.

**Insights captured this session:**
- 036 — WebSocket reconnect log storm (P0 product bug, two seats reproduced).
- 037 — AnimatePresence mode=wait creates ref-stale on state swap
  (different from insight 035; shares the SmartActionBox surface).

**Test surface:** typecheck clean · 1027/1027 unit tests · phase3-smoke ·
phase4-smoke · phase5-smoke · phase6-launcher-smoke · phase6-board-launcher-smoke
all PASS · 0 workerd zombies after each run.

**Calibration cycle (insights 031–035):**
- 031 (Unit 2.5) — Per-seat MCP isolation deferred → integration gap.
  CLOSED by Unit 2.5.
- 032 (attempt #1) — No game-start mechanism under Option A. CLOSED by
  Unit 2.6.
- 033 (attempt #2) — Board-launcher 60s timeout too tight for real agent
  dispatch. CLOSED by `04dc3f45`.
- 034 (attempt #2) — God subscriber heartbeat-killed at 40s; silent
  telemetry loss. CLOSED by `e0967b17` (pong handler + visibility log).
- 035 (attempt #3b) — SmartActionBox breathe animation defeats Playwright
  stability check; agents can join + observe but can't drive the game.
  OPEN — recommended fix (Option 1 above) is product-side.

**Calibration attempt #3b telemetry (last live run, post-heartbeat-fix):**
- god=1 on every broadcast (vs god=0 in attempt #2) ✅
- 0 silent-close warnings ✅
- 3 god events in events.jsonl (limited by SmartActionBox stall, not by
  god disconnect) ✅
- seat-1 logged a clean `scenario-fire` with proper YAML list
  `questionsTried` (schema warning to agents about list format worked) ✅
- Game stalled at turn 1; 4 of 6 mini-catalog scenarios unreachable
  (insight 035) ❌

**Phase 6 Unit 3 — FIRST CALIBRATION ATTEMPT 2026-04-25 — diagnostic
success, end-to-end blocked at the lobby.** Pre-flight green, selftest
green, orchestrator booted, god WS connected, manifest emitted, three
`playtest-seat-N` agents dispatched in parallel. All three agents
successfully navigated, landed in the lobby, and then sat there
forever. Reason: **the Option A harness has no mechanism to start the
game from the lobby.** The "Cleared Hot" / start button lives only on
the board view (`src/client/board`); Phase 6 Unit 2.5's
`skipBrowserLaunch: true` retired the orchestrator-owned chromium
without preserving an analogue of the Phase 3 smoke's board-view
client. No human, no board, no start — agents lobby-waited until I
killed them. Three parallel agents independently reported "still
waiting for the game to start." Zero god-events, no `events.jsonl`
created, no scenario fires. **Insight 032 captured** —
`docs/insights/032-phase-6-option-a-harness-has-no-game-start-mechanism.md`
— with three fix-path options (recommended: Option 1). **Unit 2.6
above implemented Option 1 and proved it works in a real browser.
Unit 3 retry now unblocked.**

**Pre-requisite fixes that landed in commit `8017b899`:**

1. **Selftest stamp reader fix** — `scripts/playtest/lib/orchestrator.ts`
   `defaultReadSelftestStamp` was passing the dual-line stamp file
   (`<ISO>\n<JSON>\n` written by `selftest.ts:writeStamp`) straight to
   `Date.parse`, returning NaN. Fixed: split on `\r?\n`, take line 1.
   `defaultReadSelftestStamp` exported. Six new unit tests in
   `orchestrator.test.ts` cover the dual-line format, single-line legacy,
   CRLF, absent file, malformed line 1, empty file.

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
empirically confirmed before any code touched.

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
1. 🛑 **Phase 6 Unit 3 — RE-RUN the calibration session.** EYE-IN-LOOP.
   STOP before this runs autonomously. Unit 2.6 above unblocked this:
   `pnpm playtest:run` now defaults `launchBoardView: true`, so the
   orchestrator will spawn its own Chromium board page and tap "Cleared
   Hot" once seat agents arrive. Procedure: read
   `<runDir>/agent-specs.manifest.json`, dispatch one
   `Agent({ subagent_type: 'playtest-seat-N', prompt })` per entry,
   touch `<runDir>/agents-done.marker` when all seats exit. Apply
   `assertGodEnvelopeShape` (already exported in
   `scripts/playtest/pre-flight.ts`) against the FIRST real envelope
   per insight 030. Unit 2's `pnpm playtest:verify-calibration <runDir>`
   is the post-run verifier — run it immediately after the session
   ends. Selftest hardening (item 2) is the recommended pre-flight
   cleanup before retry to avoid the workerd-orphan + stale-token
   trap from attempt #1.
2. ✅ **Selftest hardening — SHIPPED 2026-04-25.**
   `scripts/playtest/selftest.ts:bootLiveCtx` now uses `startServers` /
   `stopServers` from `server-controller.ts` (taskkill /F /T process-tree
   teardown on Windows). Pre-fix `child.kill('SIGTERM')` against a
   `shell: true` spawn was orphaning workerd (calibration attempt #2 hit
   a 401 from a stale workerd holding port 8787 with the prior
   `PLAYTEST_TOKEN`). Verified: full selftest run all-PASS in 7.5s, zero
   workerd processes after teardown, `.last-selftest` stamp parsed by
   `defaultReadSelftestStamp`. Also removes the local `shutdownProcess`
   helper (no longer needed). Unit 3 retry trap is closed.
3. **Vite/wrangler dynamic-port plumbing.** `agent-launcher.ts`
   defaults `viteBaseUrl = http://localhost:5173` with no override
   from the orchestrator. When 5173 is squatted, vite lands on
   5175 but seat-agent player URLs still point at 5173 — silent
   misroute potential. Plumb the orchestrator's actual vite port
   into `viteBaseUrl` at agent-launcher-driver construction time.
   Pairs with the existing TODO follow-up "Port 5173 vite collision."
4. **Stamp-reader consolidation.** Two readers for `.last-selftest`:
   `pre-flight.ts:checkSelftestStamp` (multi-line aware) and
   `orchestrator.ts:defaultReadSelftestStamp` (line-1-only, post-fix).
   Two readers for the same file is itself a smell. Extract a shared
   reader to `lib/selftest-stamp.ts` once a third caller appears.
   Not urgent.
5. **Phase 6 Units 5-7 (post-Unit-3).** 5-game series + Briggsy review
   (Unit 5, eye-in-loop x5); doc sweep (Unit 6, prune the legacy
   single `playtest-seat.md` + `playtest-seat.test.ts` if any);
   retrospective (Unit 7).
6. **BURNED card cinematic arc** sub-steps #3 + #4 (DefusePlacement hero
   card + Burned art regen). Pure product work, can interleave with
   harness work.
7. **Real-device playtest** — iPad + phones Emil-pass verification list.

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
  NEW 2026-04-24, ORCHESTRATOR-WIRED 2026-04-29):** `buildCoverageReport(input):
  CoverageReport` + `renderCoverageMd(report, fires, catalog): string`. Pure
  functions. Primary gate `firedCount >= threshold` (default 50 per PRD §8.2,
  configurable via `Config.coverageThreshold` — commit `76facca9`) + secondary
  gate `zeroCellCount === 0` (phase-3 B5 / D13.1). Options-bag signature so
  Phase 4 `selfReports` and Phase 5 `firedByViewport` slot in without
  refactors. Dedup by scenarioId, excludes `knownProductCall`-tagged
  scenarios from `firedCount` per phase-1 D4. Orchestrator wiring landed in
  commit `cc38ee8d`: `runSession` loads catalog + detects fires after
  teardown, builds the coverage report, renders to `paths.coverageMd`, and
  threads the real CoverageReport into `appendSessionEnd`. `selfReports` +
  `firedByViewport` still empty (Phase 4+ todo).

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
3. ~~**Phase 3 Unit 7 selftest polish:** selftest.ts inlines the wrangler
   spawn rather than calling the fixed `startServers`.~~ FIXED 2026-04-25.
   `bootLiveCtx` now calls `startServers`/`stopServers` from
   server-controller.ts; local `shutdownProcess` helper removed. Verified
   end-to-end with full selftest run + zero workerd zombies.
4. **Negative-shape dispatch-rejection evidence (Unit 9 known limitation).**
   scenario-detector currently defaults `shape: negative` scenarios to
   `no-fire` because dispatch errors don't produce god-events today.
   When Phase 4 seat agents land (or whenever rejection logging lands),
   upgrade `tier1Match` in `scenario-detector.ts` to check for positive
   rejection evidence and fire `clean` when observed. Full context in
   the code comment at the `shape === 'negative'` branch.
5. **~~Coverage-reporter orchestrator wiring (Unit 10 deferred).~~**
   CLOSED 2026-04-29 by commit `cc38ee8d`. `runSession` now calls
   `buildCoverageReport` + `renderCoverageMd` after teardown, before
   `appendSessionEnd`. `selfReports` (from seat suspicion logs) and
   `firedByViewport` (from orchestrator viewport rotation) still
   default to empty — those are independent Phase 4+ wiring todos
   tracked under "Phase 6 calibration — pipeline is live" item set.
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
- ✅ **Phase 3 SHIPPED — all 13 units** — Units 1, 2, 3, 3b, 4, 4b, 5, 6,
  7, 8, 9, 10, 10b landed. Live `pnpm playtest:smoke` passes ~10s × 2
  runs. Unit 10 pure functions landed 2026-04-24; orchestrator wiring
  landed 2026-04-29 (commit `cc38ee8d`). See top-of-file §"Phase 3 state
  of the world".
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
