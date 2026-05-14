# BURNED — TODO

Operator's queue. Actionable items only. **Not a diary** — git log has
the history. (Rule: `feedback-todo-is-not-a-diary.md`.)

---

## 1. Active priorities

**Triage backlog `2026-05-08-2022-5p` fully closed 2026-05-09.** All
P1s closed. All P2s closed. The Claude-actionable triage queue from
this run is empty — only Briggsy-only carryover (§4) and the
HOW-TO-PLAY draft (§7) remain. Four sprints landed in the closing
session: Falsify Intel rearrange (#004/#005/#006), Burn the Files
ember-breath (#037), HIT-variant catalog hardening (#021), and a
three-beat Phrasing! batch on the COMMS feed + observer-favor toast
(see §6).

Current state (verified 2026-05-13 end-of-session):

- Tests: **1407 pass** | 6 expected fail (68/68 files green). +9 vs
  2026-05-11 close: `dev-take-card` parser + apply tests (3 parser
  cases — well-formed, missing playerName, extra-keys rejection; 6
  apply cases — happy-path with takenCount, idempotent on empty hand,
  case-insensitive resolve, PLAYER_NOT_FOUND, NOT_PLAYING, immutability).
- Build: clean (`pnpm build`).
- Phone initial JS: **~99.17 KB gzipped** (player 19.00 + shared 65.71
  + VisualElement 14.46). Unchanged from 2026-05-11 — this session's
  work landed entirely in server code + scripts (no phone-bundle
  surface touched).
- **0.83 KB headroom** under the 100 KB ceiling.
- Board chunk: 15.00 KB gz (+0.02 KB for the `.nopeSlot` wrapper +
  CSS rule; board-side only, doesn't touch phone budget).
- Protocol still v6 (no shape changes this session — pure code-side
  fixes).
- Triage state, run `2026-05-08-2022-5p`: **0 OPEN · 0 BLOCKED** ·
  29 RESOLVED · 7 LOW-SIGNAL · 2 KNOWN-PRODUCT · 1 DUPLICATE. P1 6 · P2 33.

### 1.1 Cluster results

| Cluster | Sev | IDs | Result |
|---|---|---|---|
| A. ConnectionOverlay blocks Intercept | 2× P1 | 001, 023 | ✅ `ba77e42e` |
| B. Back Channel cinematics flat | 3× P1 + 4× P2 | 008, 009, 012, 013, 014, 025, 028 | ✅ `6cdc51c5` |
| C. Falsify Intel rearrange | 4× P2 + 030 engine | 003, 030, 004, 005, 006 | ✅ design sprint shipped 2026-05-09 |
| D. Intercept observability | 3× P2 | 011, 022, 027 | ✅ `28ff4011` |
| E. Direct Order vocabulary | 2× P2 | 031, 032 | ✅ `cb3655cb` |
| F. Burn the Files | 3× P2 | 033, 036, 037 | ✅ ember-breath shipped 2026-05-09 |
| G. Favor UX gaps | 3× P2 | 016, 017, 034 | ✅ `d3c76528` |
| H. StealReport missing card art | 1× P2 | 020 | ✅ `beed50e9` |
| I. Harness oracle false-positives | 1× P1 + 2× P2 | 002, 015, 021 | ✅ HIT-variant catalog guard shipped 2026-05-09 |
| Singletons | — | 039 portal ✅ · 038 LOW-SIGNAL | ✅ `a24bc89f`, `d3c76528` |

### 1.2 Closures

**Closed 2026-05-09** — #004 + #005 + #006 (Falsify Intel rearrange
design sprint): replaced tap-to-assign-number form with vertical
`Reorder.Group` drag-to-reorder. Each slot renders the canonical
`MinimalCard` (same component as hand/staging) with `compact` padding
that shifts MinimalCard's `@container (max-width: 114)` threshold —
name chrome stays visible at smaller card sizes where 3 fit in
viewport. Slot has full-bleed `BottomSheet` (new `tall` prop) so the
dossier dominates rather than reads as a modal. Redact-stamp priority
markers (01/TOP, 02/MID, 03/BOTTOM) overlay each card's bottom-right
corner with alternating hand-stamped rotation. Single-tap a card →
enlarge to detail view (description visible) with custom 8px movement
threshold to discriminate tap from drag. "Commit File" CTA pinned at
sheet bottom. Implementation: `FalsifyIntelRearrange.tsx` behind a
`lazy()` boundary — sync-importing `Reorder` would pull the ~27 KB
`layout-*` chunk into the always-loaded player entry. Rearrange UI +
drag/layout chunks prefetched at idle from `player/main.tsx`.

**Closed 2026-05-09** — #037 (Burn the Files ember-breath drama beat):
`DramaOverlay.tsx` gains an `appendEmberFlicker` helper running in
parallel with the hold window, anchored at a new `HOLD_START_LABEL`
that `appendHoldAndExit` plants. Two layers, one asymmetric arc each
across the 1200ms hold (no metronomic pulses): text `--ember-pulse`
1.0→1.18→1.0 (5/8 inhale `sine.out` + 3/8 exhale `sine.in`) modulating
text-shadow blur radius + color-mix alpha; overlay `filter:
brightness()` 1.0→1.06→1.0 (17/24 + 7/24, slightly slower flare so
layers don't lock). `.burnedfiles .text` CSS uses `--ember-pulse` in
`calc()` and `color-mix()` so GSAP can drive intensity without ever
touching the element's filter or opacity (preserves the
drama-beat-timing runtime gate). Design ratified by Emil-design-eng
review across two passes: V1 metronomic 280ms-half-period yoyos read
as ~4 strobes inside the hold; V2 single asymmetric breath shipped.
A V3 sub-perceptual `scale` crackle layer was prototyped + A/B'd —
indistinguishable from breath-alone, dropped per Emil's "every layer
earns its keep" rule. Crackle pattern preserved in git history (search
`CRACKLE_HALF_SEC`) for resurrection if a future playtest reports
breath-alone reads inert. Pinned follow-ups: next-day fresh-eyes
review + real-device phone-hardware pass (§4 carryover).

**Closed 2026-05-09** — #021 (HIT-variant catalog hardening): the
seat-3 false-positive on an intercepted pair-steal traced to inclusive-
only recognition criteria in the scenario catalog — agents inferred
fire from front-of-list signals (staged combo, nope window, counter
window) without validating the terminal condition. Three HIT-variant
scenarios (`SCN-PAIR-OPERATIVES-HIT-01`,
`SCN-TRIPLE-OPERATIVES-NAMED-HIT-01`,
`SCN-TRIPLE-AGENTX-ONLY-NAMED-HIT-01`) now carry a uniform **"Do NOT
self-report this scenario if:"** guard explicitly enumerating the
intercepted-outcome failure mode and pointing to the unambiguous
terminals (StealReport modal observed AND hand-count net delta of +1
for pair / +1 for triple — H-1 / H-2 respectively). Counter window
appearing alone is explicitly NOT sufficient. Pure catalog edit — no
engine, projection, or oracle change. Future hardening if the catalog
guard alone is insufficient: Option C from issue #021 (oracle-side
self-report validation in the detector pipeline).

### 1.3 Open follow-ups (queued)

_None. Closed in recent sessions:_

**2026-05-13 evening — HOW-TO-PLAY web asset shipped + 8 polish commits.**

Initial ship + 8 follow-up commits across the session. The page lives at
`howtoplay.html` (Vite entry at `src/client/howtoplay/`), opens at
`/howtoplay.html` in dev, `/howtoplay` in prod. **Spec §8.3 all four
checkboxes ✅.** Full description of the artifact in §7 below.

Commit chain (this session, in order):

1. `b48fd4fd` — feat: initial HOW-TO-PLAY ship (9 acts, dossier
   composition, 2 Imagen assets, GSAP scroll-reveal, reading-progress,
   brass-plaque CTA).
2. `1d119fee` — fix: Arsenal entries stack card-above-text instead of
   side-by-side. The 3-column outer grid × the `auto 1fr` inner grid
   left text columns at ~120px, breaking rules into chimneys of single
   words. Inner layout is now `flex column`, card centers above full-
   width text.
3. `6504de7d` — fix: retheme — "Two Skips, two Shuffles" → "Two Intel
   Briefings, two Reassigns, two Go Darks" (BURNED card names). Plus
   Burn the Files rules "Shuffle the deck" → "Reshuffle" (verb as
   mechanic, not as card name). Full grep sweep clean for
   Skip/Shuffle/Defuse/Nope/Exploding Kitten/See the Future/Alter the
   Future/Draw from the Bottom/Attack/Cat/Feral Cat outside the
   intentional fair-use attribution in ActSignoff.
4. `23f2f72e` — fix: Combos — matching rule extracted from pair tactic
   into a dedicated "Footnote · Eligible cards" aside below the triple
   scene, so it lands once and covers both pair and triple.
5. `681cfbeb` — fix: Combos — moved hoarder tactic + Phrasing! into
   combined triple tactic. (Intermediate step; superseded by 094468c5.)
6. `094468c5` — fix: Combos — final placement. Triple tactic shrinks
   back to the private-naming insight only. Eligible Cards footnote
   absorbs the hoarder tactic + Phrasing!. Pair scene now lean (rules +
   stage); triple keeps the bluff insight; rules + economy + Phrasing!
   live in the footnote.
7. `22b2d683` — fix: card aspect-ratio. Caught when operative card
   heads were getting cropped in the Arsenal. Sources are mixed
   aspect: action cards 384×384 (1:1 square), operatives 269×384 (2:3
   portrait, head at top of frame). My Card component forced 1:1 with
   object-fit:cover — center-crop ate ~15% top/bottom on operatives.
   Fix: portrait 5:7 card frame (matches in-game MinimalCard) +
   object-fit:contain on the art. Every source pixel survives. Action
   cards get matting top/bottom; operatives fill the frame with ~1%
   side letterbox. Cards in the doc now read as the same metaphor as
   in-game cards.
8. `487877ef` — polish(Emil-lens): 6 interaction fixes — Roster card
   hover guarded by `@media (hover: hover) and (pointer: fine)`,
   Roster photo scale 400ms → 250ms, PlayCTA button gains
   `:active scale(0.97)` + arrow nudge on hover, back-link gains
   `:active scale(0.97)` + extends transition to include `transform`.
9. `9ef77e7d` — fix: card label color/corner alignment. Briggsy
   noticed Direct Order / Extraction / Intercepted labels were "a
   pixel or two off." Two causes: (a) label `border-top` used 25%
   ochre-9 mix while card outer border uses 35% — two amber lines at
   different shades read as misalignment, (b) label had
   `border-radius: 0` relying on `overflow: hidden` to mask, leaving
   subpixel slivers at corners. Fix: matched border-top to 35%, added
   `border-bottom-left/right-radius: inherit` so corners follow the
   card's interior curve natively.

Health (HOW-TO-PLAY only):
- Bundle: `howtoplay-*.js` 95.24 KB (33.08 KB gz) + `howtoplay-*.css`
  62.29 KB (10.43 KB gz) + shared GSAP chunk 69.42 KB (27.21 KB gz).
  Not under the 100 KB phone ceiling — separate entry, separate chunk,
  loaded only when reader hits `/howtoplay.html`.
- Player phone initial JS bundle unchanged (still 99.17 KB gz).
- Typecheck clean. CSS lint clean (new files).
- 2 Imagen 4 assets at `public/assets/howtoplay/`:
  `pendleton-crest.png`, `operations-manual-plate.png`. Script:
  `scripts/generate-htp-assets.ts`.

LAN URL for phone testing (Briggsy):
- `http://192.168.1.151:5173/howtoplay.html` while `pnpm dev` is up.

**Unfinished prescription — surface the HOW-TO-PLAY from the Lobby:**

Right now the page exists at `/howtoplay.html` but no surface in the
game itself links to it. First-time players who land on the Lobby
won't know to read it. Add a discreet link.

- **File:** `src/client/board/Lobby.tsx`
- **Insert after** the QR section block (after line 51 — the closing
  `</div>` of `.qrSection`) but BEFORE the roster block (line 53).
- **Markup:**
  ```tsx
  <a
    href="/howtoplay"
    target="_blank"
    rel="noopener"
    className={styles.briefLink}
  >
    First-timer? Read the brief →
  </a>
  ```
- **Companion CSS** in `Lobby.module.css` (append near the existing
  `.hint` rule):
  ```css
  .briefLink {
    margin-top: var(--space-3);
    font-family: var(--font-mono);
    font-size: clamp(0.7rem, 0.6rem + 0.3vw, 0.9rem);
    font-weight: 600;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--color-ochre-10);
    opacity: 0.85;
    text-decoration: none;
    transition: opacity var(--motion-duration-fast) var(--motion-ease-decelerate);
  }
  .briefLink:hover,
  .briefLink:focus-visible {
    opacity: 1;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  ```
- **URL handling:** `/howtoplay` works in prod (Cloudflare Pages strips
  `.html`). In dev, the browser will 404; either accept that as
  dev-only or use `import.meta.env.DEV ? '/howtoplay.html' : '/howtoplay'`.
- **Acceptance:** link visible on the Lobby below the QR/room code,
  doesn't break the existing layout, opens the brief in a new tab so
  players don't lose the room code in their tab history. Verify at
  1366×768, 1920×1080, and a 4K-projection-via-laptop scenario.

**2026-05-13 — real-device filter verification + dev tooling + persistence race:**

- **Filter verified end-to-end on real hardware (room 1234).** All
  four target-requiring stages exercised with one 0-card opponent
  (Vera) AND with all opponents at 0 (Vera + Dash both drained,
  Michael holds the test hand): Favor / pair / triple all filter as
  designed, Direct Order regression check intact (0-card players
  still appear because Direct Order doesn't extract from hand), empty
  TargetSelect renders cancel-only and restores staged cards on
  cancel. No buttons rendered when none should be. Filter commit
  `176e43b0` cleared the eye-in-loop gate.

- **`dev-take-card` god-mode action + CLI (commit `cbbf35e9`).**
  Symmetric counterpart to `dev-give-card` — empties a named
  player's hand in one call (discarded cards vanish, not routed to
  discard pile — this is god-mode scenario setup, not in-rules play).
  Built to verify the 0-card-target filter without multi-turn manual
  gameplay setup. Reusable for any future scenario needing a 0-card
  target. New: `applyDevTakeCard` + Zod schema + room.ts dispatch
  branch + `scripts/dev-take-card.ts` CLI + `pnpm dev:take` script.

- **Persistence race fix in dev-action handler (commit `36c1af9f`,
  verified by forced wrangler reload).** Discovered during testing:
  ran `pnpm dev:take 1234 vera`, ack reported "Took 8 cards", but
  Vera still had 8 cards on the board. Re-ran — ack reported the
  same 8 cards. Root cause: `void this.persistState()` is fire-and-
  forget; wrangler hot-reload between the in-memory mutation and the
  storage write reverts state on DO reinstantiation. Fix: dev-action
  handler now `await`s persistState before sending the ack. Widened
  `enqueue` task signature to `() => void | Promise<void>` —
  `actionQueue.then(task)` chains async tasks naturally. Verified by
  forced-reload test: dev:take → touch room.ts → wrangler reloaded →
  dev:take again returned "Took 0" (state held). Normal play actions
  keep fire-and-forget (no production hot-reload exists; natural
  gameplay retry covers any dev-mode race for play actions).

**2026-05-11 — SCENARIOS.md sign-off + Favor empty-hand follow-through:**

- **SCENARIOS.md catalog signed off — DRAFT → LOCKED 2026-05-11 at
  engine.ts@e6b31b5c.** SHA pinned at original draft for audit
  integrity. 6 Column-divergence atomicity candidates dispositioned:
  4 dismissed unreachable via UI filters (Extraction proactive, Direct
  Order eliminated target, BC empty deck, Favor self-target), 1
  dismissed not-a-bug (Intel→BC is intended strategy). #5 Favor target
  silence closed by following bullet. Spec-level + plan-doc items
  unchanged. Harness phase fully closed.

- **Favor + combo-steal target list excludes 0-card players.** New
  pure helper `getEligibleTargets` in
  `src/client/player/eligibleTargets.ts` replaces the inline filter
  at `Player.tsx:541`. Reason-conditional: `call-in-a-favor`,
  `combo-pair`, and `combo-triple` exclude `cardCount === 0` targets
  (hand-extraction class); `direct-order` and the null/default case
  keep the original alive + not-self shape. Mirrors the four
  atomicity-gap dismissals from SCENARIOS.md lock — UI filter blocks
  the engine edge, engine branch stays as defense-in-depth so the
  harness can still seed the empty-hand path. 9 unit tests cover all
  reasons + the all-others-empty edge.

**2026-05-11 — couch-validation session (prior block):**

- **Direct Order self-target — hidden on phone TargetSelect (engine
  unchanged).** Briggsy couch: actor could pick themselves with
  Direct Order. Code was intentional per RULES-REFERENCE §13.8
  ("could be funny for trolling"), but reads as bug to a first-time
  player who can't see §13.8. UI now filters self across all target
  reasons; engine remains permissive (replay / harness validity,
  still pinned by `engine.test.ts:414`). RULES doc §13.8 also
  corrected — claimed "equivalent to taking your turns normally" but
  engine actually nets **+1 turn** (current consumed, target gets +2,
  actor ends with 2 remaining). Filter at `Player.tsx:544`.

- **Intercept-during-pause clears `pausedAtMs` on the new chain
  window.** Briggsy couch: intercept played while host had paused
  the window left the new chain window born paused; next decider's
  countdown stayed frozen until host hit Resume. Root cause:
  `handleNope` built the new window via `...state.nopeWindow` spread,
  carrying `pausedAtMs` forward. Fix: destructure-drop `pausedAtMs`
  before the spread (matches the resume path's pattern at
  `engine.ts:123`). Intercept play now implicitly cancels host hold.
  New regression test "intercept play during pause clears pausedAtMs
  and starts a fresh running chain window" in `engine.test.ts`.

- **NopeCountdownBar slot reserve — case-banner static text no
  longer shifts ~70 px on dial mount/unmount.** Briggsy couch: the
  static briefing chunk (Operation / BURNED / Case File / Briefed by
  M.) bounces when the dial appears. Root cause: case-banner uses
  `justify-content: center`; dial mounting added ~140 px of column
  content, shifting the centered static chunk by ~70 px. The earlier
  "~10 px, acceptable" call in commit `4e4431c9` was an eyeball
  estimate — real measured shift was 70 px. Fix: new token
  `--size-nope-slot` (clamp 128→172 px, scales alongside
  `--size-nope-dial`), wraps `<NopeCountdownBar />` in a
  fixed-height `.nopeSlot` div inside the case-banner. Slot reserves
  the dial's column contribution whether mounted or not. Verified
  empirically: **0.00 px delta** on every static line across
  mount/unmount.

- **Actor staging gate during own nope window — `play-in-flight`
  block.** Briggsy couch: Dash plays Go Dark, intercept window
  opens, Dash can still stage cards from his hand. Root cause:
  `deriveInteractionPermission` didn't consider the nope window —
  `isMyTurn` stayed true, `subPhase` stayed `turn-active`,
  permission returned `allowed: true`. Fix: new `nopeWindowActive`
  param + new reason `play-in-flight`; gate fires when
  `isMyTurn && nopeWindowActive`. Favor-response branch
  short-circuits before the new gate so a chained nope on a Favor
  doesn't lock the target. Chain-intercept (Counter button) is
  unaffected — routes through SmartActionBox, not staging. 3 new
  tests cover the gate + reason ordering + favor-target preservation.

- **"Tribute" copy → spy-register replacements.** Briggsy couch:
  "Michael wants tribute" reads medieval/fantasy, breaks Pendleton
  Cold-War-spy voice. PlayerAlert observer pool for `call-in-a-favor`:
  `"X wants tribute."` → `"X is putting the squeeze on."` Board
  COMMS feed `favor-requested` pool: `"X demands tribute from Y"` →
  `"X taps Y for a favor"`. Two stale "tribute" mentions remain in
  dev-facing comments (`PlayerAlert.module.css:10`, `PlayerAlert.tsx:500`)
  — not user copy, leaving alone.

**2026-05-10:**

- **PlayerStrip ACTIVE pill — REMOVED entirely.** Original report was
  "ACTIVE pill clips bold caps on real-device." Three padding-bump
  fixes (3→5→7px top), then a flex-center fix, all read as "still
  clipped." Root cause traced (with sequential-thinking + Emil lens):
  the `transform: rotate(-3deg)` on bold-800 mono caps at small sizes
  produced sub-pixel anti-aliasing flat-tops that READ as clipping
  even though no glyph was pixel-clipped. Briggsy's call: kill the
  pill — the tile's active state (translateY lift + paper-face bg
  swap + brighter ochre top hairline + darker text) already carries
  the signal unambiguously. `.activeTag` JSX removed from
  `PlayerStrip.tsx:71`, CSS rule deleted, file header comment
  updated. Banked lesson: tilt + bold + small + tight metrics = anti-
  aliasing optical clip. Diagnose before padding-bumping.
- **Nameplate name/state redundancy** — fresh ask, same session. Big
  brass plate was duplicating the active player's codename already
  shown by PlayerStrip's nameplate. Path chosen: hide the name (now
  visually-hidden `.nameSr` for a11y/tests), promote the subtext to
  be the focal engraved text on the brass plate (clamp 15→22px,
  weight 800, full engrave shadow). Plate now reads "// ON DECK" /
  "// DEFUSING" / "// HANDING OVER" / "// STANDBY" / "// COMMS DOWN"
  — the STATE is the engraving, not a redundant name. Flip animation
  + standby/offline behaviors preserved.
- **Direct Order / Reassign / Call in a Favor target consequence
  toast** — observer pool ("X put you on assignment" / "X kicked the
  work down the line" / "X is calling in a marker") doesn't tell the
  target it's them, leaving the intercept-decision window blind for
  a first-time player. All three card-played events now carry
  `targetId` (engine: Direct Order = chosen, Reassign =
  `getNextAlivePlayer`, Favor = chosen). PlayerAlert routes viewer
  === target to urgent toasts:
  - Direct Order: "X put you on assignment. 2 turns in a row!"
  - Reassign: "X kicked the assignment to you. 2 turns in a row!"
  - Favor: "X is calling in a marker from you!"
  Non-target observers keep the existing flavor pool. Bundle
  +0.07 KB gz (99.05 / 100 KB).
- **Nameplate shows codename during prompts that target a different
  player** — favor-response is the canonical case: actor plays the
  favor card during THEIR turn, target is a different human handling
  the prompt. The brass plate's prior name-hide (turn redundancy
  with PlayerStrip) broke this — observers saw "// HANDING OVER" or
  "// COMMS DOWN" with no indication of WHO. New `Subject.showName`
  flag fires when `prompt.playerId !== currentTurn.currentPlayerId`,
  toggling the plate's big-name styling back on for those prompts.
  Defuse / future-rearrange / name-card prompts all target the active
  turn player (already named by PlayerStrip), so they keep the
  state-only engraving. Hard refresh required on already-open tabs.
- **NopeCountdownBar moved below "Briefed by M." footer** — was
  between the divider and the briefer. New placement reads as static
  briefing → live transmission stratum below.
- **Pause control on the intercept countdown — physical-play parity
  for "hold on, I gotta think"** — new host-only action pair
  (`pause-nope-window` / `resume-nope-window`) wired board-side only,
  no phone UI. Engine freezes `deadlineMs` while paused (clearing
  pausedAtMs on resume after advancing the deadline by elapsed pause
  duration); room.ts clears the expiry setTimeout on pause and
  re-schedules on resume. Protocol bumped to v6 — new ClientMessage
  variant `host-action` with `HostClientAction` payload, new
  `NopeWindowView.pausedAtMs` field, new `nope-window-paused` and
  `nope-window-resumed` events. Board UI: pause button below the
  dial; when paused, ring color softens to drama-amber, drain
  freezes (hook captures live `strokeDashoffset` via getComputedStyle
  and pins it), label flips "Intercept" → "Paused", button text
  flips "Hold" → "Resume". 7 new engine tests + COMMS feed narration
  for both events. Phone bundle unchanged (99.05 KB gz); board +0.38
  KB gz for button + CSS.

---

## 2. Gameplay bugs from 2026-05-08 harness run — DONE

All seven items (§2.1-§2.7) closed. Run dir at
`docs/testing/playtest/runs/2026-05-08-0935-3p` (gitignored —
`pnpm playtest:purge --session-id 2026-05-08-0935-3p` when done).

§2.2 (nope-window observer info gap) closed in `3c82c572` —
PlayerAlert toast persists through nope window for observers.

---

## 3. Playtest harness — DONE

Production-bar runs work. All §3.1-§3.5 items closed. Operator skill
`/playtest-run` shipped at `.claude/skills/playtest-run/SKILL.md`
(commit `57872c41`) — codifies seat + triage dispatch dances.

§3.2 (coverage threshold semantics) closed in `0a174691` — split into
per-run `threshold` (default 15) + `seriesTarget` (default 50,
informational).

**SCENARIOS.md signed off 2026-05-11.** Status flipped DRAFT → LOCKED
at original draft SHA `e6b31b5c` (proof-by-use against subsequent
engine states — 3+ harness runs produced no scenario-grammar drift).
6 engine-correctness divergence candidates dispositioned: 4 dismissed
unreachable via UI filters, 1 dismissed not-a-bug (Intel→BC is
strategy), 1 kept open as real-device watch item (Favor empty-hand
target silence). Spec-level + plan-doc items unchanged. Harness phase
fully closed.

---

## 4. Carryover requiring Briggsy

Real-life sessions only Briggsy can do.

- **Real-device verification of `/howtoplay.html`** — open
  `http://192.168.1.151:5173/howtoplay.html` on phone (LAN URL while
  `pnpm dev` is up) and read the whole document. Check at minimum: hand
  fan in Act III (cards uniform, no clipped heads), Burn beat (red glow
  + Cover Blown stamp), Roster cards (all 6 operative heads visible,
  hover sticking is gone on touch — tap shouldn't leave a card lifted),
  Arsenal entries (rules text reads as paragraphs, not chimneys), the
  card labels (Direct Order / Extraction / Intercepted — no
  pixel-or-two misalignment), the PlayCTA brass plaque press feedback,
  the back-link tap response. **First-time-player test** is the spec
  §8.7 acceptance gate for this artifact too — a stranger reading the
  doc should react with some version of *"wait, did Archer actually
  release this?"*.
- **Real-device playtest** — iPad Pro 1366 + 4-8 phones. Verify
  triple-steal deferred commit, Favor staging, discard hero from couch,
  Burned two-beat on non-drawer phones, Emil press-feedback on phone +
  TV, Nameplate flip 400ms vs 250ms, perspective 1000px vs 600px.
- **8-player stress test** — PlayerStrip layout at max count on real TV;
  COMMS scroll under event volume; nameplate legibility from couch;
  verify tile growth at 1920 + 4K beyond the 1366×1024 baseline.
- **Physical hardware verification** — push to Cloudflare Pages, open on
  actual TV with phone controllers.
- **Canonical 200% zoom human-run pass.** (No spec section defines a
  protocol — earlier "spec §2.3 protocol" reference was stale, §2.3
  is the first-time-player line. Open desktop browser, walk a 2-3
  player game at 200% zoom, flag layout/text/button breakage.)
- **First-time-player session** (spec §8.7 — the quality bar,
  cashed in).
- **Visual review meeting** — GameOver glow, Nope emerald saturation,
  Baveuse font, drama-accent CARD FACE inspection (Reassign / Direct
  Order / Go Dark / Intel Briefing / Falsify Intel / Burn the Files /
  Back Channel). Earlier "spec §2.2.5" reference was stale — no such
  section. Acceptance criterion lives at spec §2.2 ("could this look
  like a frame from an Archer episode?") + §3 visual reference.
Remaining ⏸ rows in `E2E-ISSUE-LIST` (C-13, C-15, C-16-19) are blocked
on product/asset decisions — surface in a visual review.

The 2026-05-07 couch eyeball-pack design calls all closed in this
session: StealReport stamp dropped (`17514aae` — also fixed Case 47-B
occlusion as side effect), NopeCountdownBar anchored into case banner
(`4e4431c9`), drama tier hierarchy ship-as-is, FuturePeek swipe ship-
as-is, Burned-draw drama beat verdicted distinct
(`d555af9a` — perception artifact, no fix needed).

---

## 5. Landmines (still relevant)

Active warnings only. Older landmines have moved to `docs/insights/` and
`CLAUDE.md`.

- **HOW-TO-PLAY: card aspect contract** (commit `22b2d683`). Card
  source art is MIXED aspect: 11 action cards are 384×384 (1:1
  square), 6 operative cards are 269×384 (2:3 portrait). The howtoplay
  `Card` component renders at portrait 5:7 frame with
  `object-fit: contain` so every source pixel survives. Action cards
  display as a centered square with ~20% matting top + bottom;
  operatives nearly fill the frame with ~1% side letterbox. This
  matches the in-game `MinimalCard.module.css` aspect-ratio: 5/7 +
  contain pattern (line 33, 81-85). Do NOT force 1:1 with cover —
  that crops operative heads.
- **HOW-TO-PLAY: card label corners + amber color** (commit `9ef77e7d`).
  The card label uses `border-bottom-left/right-radius: inherit` from
  the card frame so its bottom corners curve cleanly with the rounded
  card, instead of relying on `overflow: hidden` to mask square
  corners (which leaves subpixel slivers). Label `border-top` uses the
  SAME `color-mix(in oklab, var(--color-ochre-9) 35%, transparent)` as
  the card's outer border — different opacity reads as misaligned
  even when geometry is correct.
- **HOW-TO-PLAY: vite entry registration** (commit `b48fd4fd`). The
  `howtoplay` entry is in `vite.config.ts` `rolldownOptions.input`
  alongside board/player. Don't remove it. Dev URL is
  `/howtoplay.html`; prod URL is `/howtoplay` (Cloudflare Pages strips
  `.html`).
- **HOW-TO-PLAY: Imagen prompt gotcha — hex codes bake in as text**
  (caught in title plate v1). DO NOT reference hex codes like
  `#94 7226` in Imagen prompts — the model renders them as literal
  visible text in the output. Always describe colors in words ("burnt
  orange," "warm gold"). Regenerator script:
  `scripts/generate-htp-assets.ts` with `HTP_ASSET=<filename>` env var
  to target one asset (filenames: `pendleton-crest`,
  `operations-manual-plate`, `desk-scene`; or `all` for the batch).
- **HOW-TO-PLAY: separate mono font import** (commit `b48fd4fd`). The
  page imports `src/client/howtoplay/fonts-mono-htp.css` for
  JetBrains Mono. Cannot share `src/client/shared/fonts-mono.css`
  because that one is documented board-only (per its header comment).
  If you add another mono-using surface, follow the per-surface
  font-face declaration pattern, not import-the-board's-file.
- **HOW-TO-PLAY: scroll-reveal motion ownership** (commit `b48fd4fd`).
  GSAP + ScrollTrigger registered ONCE on the howtoplay page via
  `useScrollReveal()` mounted at App root. Every `<DossierPage>` gets
  a `data-reveal` attribute and animates on enter. Reduced-motion
  branch sets `opacity: 1` immediately. Don't add another
  ScrollTrigger.register() call elsewhere on this page; the singleton
  guard handles it.
- **`detectFailedLaunch: true` is OPT-IN per call site** (commit
  `64ecda46`). `pnpm playtest:run` opts in. Tests with stubbed god (no
  events.jsonl writes) leave it off so happy-path coverage tests don't
  trip on the absence of a real game. New `'failed-launch'` is a
  legitimate `SessionOutcome` variant — handle it explicitly in any
  outcome-switching code added downstream (coverage, retention,
  reporting).
- **Viewport rotation is now per-seat** (commit `873d45e9`). With 3
  viewports configured + 3 seats, each seat gets a different shape
  (round-robin via `i % viewports.length`). Don't assume all seats
  share viewports[0] anymore. `viewportsExercised` in the session
  report now reflects the actual exercised set.
- **`createTriageLauncherDriver` exists but is NOT wired into
  `runSession`** (per `run-session.ts:200-240` operator-doc comment).
  The `/playtest-run` skill landed (commit `57872c41`) but the
  in-process triage launcher driver is still a future option — the
  current skill orchestrates triage agents from the operator's side
  via Agent tool calls per the manifest. If you ever want
  in-orchestrator triage spawn, wire via `opts.waitForTriageMarker`.
- **`nopeWindowMs` is now optional end-to-end** (commit `b29ba31c`).
  Series configs (2p/3p/5p/8p/10p) and `default-config.json` no longer
  carry the field. Production tier defaults from
  `src/shared/constants.ts:NOPE_WINDOW_MS` (10s flat) take over via
  engine fallthrough at `engine.ts:1332`. `calibration.json` retains an
  explicit override (10s) for legitimate calibration deviation. Adding
  the field back to a series config means "this run deviates from
  production" — make sure that's deliberate.
- **Coverage threshold split: per-run vs series** (commit `0a174691`).
  `coverageThreshold` config field now means PER-RUN gate (default 15).
  `CoverageReport.seriesTarget` (default 50) is informational only —
  surfaced in coverage.md as cumulative across-runs context. Don't
  conflate the two; calibration.json's `coverageThreshold: 1` overrides
  the per-run gate (which is what calibration always meant).
- **Triage issue summaries are now tracked in git** (commit `37150919`).
  `runs/*/issues/*.md` and `runs/*/issues/INDEX.md` are
  gitignore-allowlisted; the rest of each run dir (logs, screenshots,
  events.jsonl, server/, scrubbed/, etc.) stays gitignored. Closure
  records survive `pnpm playtest:purge`. Adding a new gitignored file
  type under `runs/` requires no allowlist change; un-ignoring a new
  artifact type does.
- **PlayerAlert observer toast persistence semantic** (commit `3c82c572`).
  Card-played observer toast now persists through the nope window
  (`persistUntil: ['nope-window-resolved']`) for ALL non-favor cards.
  Favor stays on `persistUntil: ['favor-given']` (longer window). The
  observer X dismiss button now appears on every persistent toast,
  not just the favor case. Filtered cards (extraction / burn-the-files
  / falsify-intel / combos) still skip the toast — DramaOverlay or
  StealReport own those moments.
- **NopeCountdownBar lives INSIDE the case-banner aside, in a
  fixed-height `.nopeSlot`** (commits `4e4431c9` original + 2026-05-11
  slot-reserve follow-up). The dial is wrapped in `<div
  className={styles.nopeSlot}>` whose `height: var(--size-nope-slot)`
  reserves the dial's column contribution whether the dial is mounted
  or not. This prevents the case-banner's `justify-content: center`
  from shifting the static briefing chunk by ~70 px on
  mount/unmount (the original "~10 px acceptable" call from 4e4431c9
  was an eyeball estimate — real measured shift was 70 px). If the
  NopeCountdownBar wrapper's natural height changes (new content,
  font-scale tweak, dial geometry change), keep `--size-nope-slot` in
  `semantic.board.css` ≥ wrapper natural max height across the
  viewport band — otherwise the slot will overflow OR collapse and
  the bounce returns.
- **StealReport + FavorReport rubber stamps removed** (commits
  `17514aae` + `09a4ae44`). The rubber-stamp visual + thunk
  choreography + `--motion-duration-stamp` token are GONE. Body text
  carries the verdict on both reports. The `--motion-ease-overshoot`
  primitive stays (zero current consumers but generic curve worth
  preserving for future spring cinematics).
- **`LobbyView.hostConnected: boolean` is REQUIRED** on the
  server-projected lobby view. New lobby-view fixtures must include
  `hostConnected: true|false`.
- **`host-connect` payload may carry `sessionToken?: string`** (B-01).
  Optional in Zod (`z.string().uuid().optional()`); board clients mint a
  UUID via `getOrCreateHostSessionToken()`. Old clients that don't send
  fall through to no-token branch.
- **WS close code `4002`** reserved for E-08 identify-timeout closures.
  Don't reuse.
- **`hostSession` persists across DO restarts** via `ctx.storage`. Clear
  in storage AND in-memory if you ever need to forcibly evict a host.
- **Zod v4 strictly enforces RFC 4122 v4 UUID** version + variant bits.
  Test fixtures need real-shaped UUIDs (not all-1s patterns).
  `crypto.randomUUID()` produces conforming output.
- **`PROTOCOL_VERSION = 6`** (was 5, bumped 2026-05-10 for `host-action`
  pause/resume + `NopeWindowView.pausedAtMs`). Hard-refresh dev tabs
  after pulling any protocol bump. `protocolVersion?: number` on the
  `join` payload — optional in Zod so old clients hit
  `PROTOCOL_MISMATCH` not a generic Zod failure.
- **`deriveInteractionPermission` requires a `nopeWindowActive: boolean`
  arg** (2026-05-11 — `play-in-flight` gate). When the actor's card
  is in flight awaiting intercept resolution, staging is blocked.
  Chain-intercept (Counter button) still works — routes through
  SmartActionBox, not staging. New `'play-in-flight'`
  `InteractionBlockReason` variant — handle it in any
  reason-switching code added downstream. Favor-response branch
  short-circuits before the new gate so a chained nope on a Favor
  doesn't lock the target. Test file `useInteractionPermission.test.ts`
  has the three regression cases.
- **Sheet button race-class convention.** Every sheet with a terminal
  action button (NameCard, FuturePeek, DefusePlacement, TargetSelect)
  uses the two-track guard pattern: sync `submittedRef` + async
  `submitted` state. New sheets follow the same shape.
- **Triage closure hygiene** (caught 2026-05-09 on Falsify sprint
  #004/#005/#006). When a fix commit closes one or more triage issues,
  three updates land in the SAME commit (or an immediate follow-up):
  (1) **Subject line cites issue ID(s)** — `fix(...): close X-NN — summary`.
  Topic-only refs (`"TODO #11"`) hide commits from `E2E-ISSUE-LIST`
  git-grep audits and from triage-archeology grep.
  (2) **Issue body Status field flips** — `🟡 BLOCKED ...` →
  `✅ RESOLVED`, with a `**Resolution:**` line citing the commit SHA +
  what shipped. Preserve the original `**Disposition:**` as
  `**Original disposition (pre-fix):**` for audit trail.
  (3) **Regenerate INDEX.md** — `pnpm exec tsx
  scripts/playtest/regen-issue-index.ts <RUN_DIR>/issues`. INDEX is
  derivative of the body Status fields; skipping (2) leaves it stale
  even after regen. Note: the script wants the `issues/` subdir as its
  arg, NOT the run dir. The `.claude/skills/playtest-run/SKILL.md:230`
  example writes `<RUN_DIR>` which is wrong — use the `issues/` path.
- **Pre-starting dev servers breaks the orchestrator.** `pnpm
  playtest:run` spawns its own wrangler with `PLAYTEST_TOKEN` baked in
  via `.env`. Pre-starting `pnpm dev:server` binds 8787 with no token
  → orchestrator's god-connect gets HTTP 401 → `code=4004`. Don't
  pre-start dev servers when running the harness — it owns the
  lifecycle.
- **Persistence is fire-and-forget for normal play actions, AWAITED
  for dev-actions** (commit `<this commit>`, 2026-05-13). `room.ts`
  calls `void this.persistState()` at 13+ call sites for play /
  reconnect / host actions — in production this is fine (worker is
  stable, no hot-reload). In dev mode, wrangler hot-reload between a
  mutation and the storage write can revert state on DO
  reinstantiation. The dev-action handler at `room.ts:521-555` now
  uses `await this.persistState()` because dev-actions are operator
  intent with no retry path. Normal play actions remain fire-and-
  forget — they have natural retry via gameplay if a hot-reload
  swallows a write. If you add a new dev-action OR observe a real
  production persistence race, follow the dev-action handler's
  pattern: `async () => { ... await this.persistState(); ... }`. The
  `enqueue` task signature was widened to `() => void | Promise<void>`
  to support this — `actionQueue.then(task)` naturally chains async
  tasks.

---

## 6. Phrasing! beats (planned)

Tone DNA — see `docs/PRODUCT-SPECIFICATION.md` §3.5. Cadence is
**abundance, not restraint** — seed Phrasing! generously across all
✅ surfaces. Land beats wherever they fit naturally; over-saturation is
unlikely if you respect the ❌ guards (no errors, no repeat-view, no
rule text).

**Shipped (18):**

- ✅ EliminatedView flavor pool — *"Penetrated by enemy assets.
  ...Phrasing."* (`src/client/player/EliminatedView.tsx:17`)
- ✅ DossierFeed `favor-given` board narration —
  *"X put out for Y. ...Phrasing."* (`src/client/board/events.ts`)
- ✅ DossierFeed `combo-steal` board narration —
  *"X drilled Y for it. ...Phrasing."* (`src/client/board/events.ts`)
- ✅ DossierFeed `future-peeked` board narration —
  *"X went deep on the deck. ...Phrasing."* (`src/client/board/events.ts`)
- ✅ PlayerAlert `favor-given` observer toast —
  *"X put out for Y. ...Phrasing."* (`src/client/player/PlayerAlert.tsx`)
- ✅ PlayerAlert observer sweep — six per-card pools
  (`src/client/player/PlayerAlert.tsx`):
  - Direct Order — *"X got Y to do it for them. ...Phrasing."*
  - Reassign — *"X made someone else take it. ...Phrasing."*
  - Call in a Favor — *"X needs someone to come through. ...Phrasing."*
  - Back Channel — *"X slipped in through the back. ...Phrasing."*
  - Intel Briefing — *"X is checking what's coming. ...Phrasing."*
  - Go Dark — *"X turned off the lights. ...Phrasing."*
- ✅ GameOver winner-subtitle pool (board view) —
  *"X came out on top. ...Phrasing."* (`src/client/shared/GameOver.tsx`)

**HOW-TO-PLAY (shipped 2026-05-13, +6 beats):**

- ✅ Dash Barlowe roster dossier flourish — *"Tell him you read his
  file. He's been waiting. …Phrasing."* (`src/client/howtoplay/acts/
  ActRoster.tsx`)
- ✅ Sable Ashworth roster dossier flourish — *"Do not let her near
  the deck. Or the matches. …Phrasing."* (`ActRoster.tsx`)
- ✅ Mission act, M's signoff sentence — *"Try to look like you've
  done this before. …Phrasing."* (`ActMission.tsx`)
- ✅ Combos act, Footnote · Eligible cards — *"...if a particular
  target has been hoarding, do the heist anyway. They'll learn.
  …Phrasing."* (`ActCombos.tsx`)
- ✅ Intercept act, lede — *"…Most of the table will start counting
  on their fingers. …Phrasing."* (`ActIntercept.tsx`)
- ✅ Signoff act, M's closing — *"Good luck, operative. Don't burn.
  …Phrasing."* (`ActSignoff.tsx`)

**Planned beats (queue):**

- [ ] **Lobby / waiting copy** — implicit phrasing in idle states.
  Currently `Lobby.tsx` uses *"Awaiting check-in"* + animated dots
  and *"Opening secure channel"* + dots. Both are tonally strong as
  written; explicit Phrasing! callout would cheapen the Pendleton
  voice. Skip unless a new idle surface lands that wants explicit
  cadence (host-handoff, multi-room transition, etc.).
- [ ] **DramaOverlay beat** — one rare, high-drama interrupt where a
  Phrasing! beat lands inside the cinematic. BURNED-draw is a candidate
  ("Burned" + reaction copy). Coordinate with motion design — beat must
  not interrupt the cinematic's pacing. Flagged risky for solo Claude
  session; pair with a motion/timing review before shipping.
- [ ] **Loading / connection messages** — `ConnectionOverlay.tsx`
  currently shows *"Opening channel..."* and *"Re-establishing
  channel..."* (transient) and *"// CHANNEL DOWN"* (terminal-error,
  ❌ surface). The transient strings are too brief and too rare for a
  Phrasing! beat to land naturally; revisit if a longer-lived loading
  state is added (asset preload, multi-server handshake, etc.).

Append to spec §3.5 "Shipped beats" list as each lands. Saturation
guardrail: each pool sized so Phrasing! lands at ~25% (e.g. 1
Phrasing! variant per 4-line pool) — abundance without exhausting the
joke.

---

## 7. HOW-TO-PLAY — DONE 2026-05-13

Shipped as `howtoplay.html` — *"Operations Manual"* dossier-style web asset
at a new Vite entry `src/client/howtoplay/`. 9-act long-scroll document
themed as a classified Pendleton Agency case file (47-B). Spec §8.3 all
four checkboxes flipped to ✅.

Composition (act by act):

- **Act 0 — Cover:** Pendleton crest seal (Imagen 4) + Saul Bass title
  plate (Imagen 4) + CLASSIFIED slam stamp + manila paper + classification
  banner top/bottom + file tab + originator/clearance/reading-time
  metadata + signature line + handwritten marginalia.
- **Act I — The Mission:** M's three-sentence brief with Roman-numeral
  beats + first Phrasing! beat ("Try to look like you've done this before.
  …Phrasing.").
- **Act II — The Roster:** Six operative dossier cards (Dash, Vera, Sable,
  Janet, Neal, Agent X) using existing roster portraits. Photo frame +
  tape + threat-dot + last-seen + Archer-tone blurb. Otto footnote.
- **Act III — The Loop:** Three-beat staged sequence — fanned hand, play-
  then-draw arrow, BURNED card reveal with `burn-fire` glow + Cover Blown
  stamp. The cinematic centerpiece.
- **Act IV — The Arsenal:** 17 cards in 6 mechanical groups (Coercion,
  Intelligence, Cover Ops, Defense, Survival, The Operatives) — each card
  art + classification stamp + rules + tactic line.
- **Act V — Special Operations (combos):** Pair-steal + triple-name-steal
  scenes with card stacks + arrow + outcome.
- **Act VI — The Intercept Chain:** 4-step chain visualization with depth
  numbers, left-border colors (red cancelled / green proceeds), per-step
  outcome stamps. Plus a 3-bullet summary box.
- **Act VII — Remote Briefing:** 3-step host-table / share-room-code /
  share-your-face guidance + lag advisory.
- **Act VIII — Sign-off:** M's closing with final Phrasing! beat + CASE
  CLOSED stamp + fair-use disclaimer + bottom classification banner.
- **CTA plaque:** "You've Been Briefed." brass-plaque component routes
  back to `/`.

Tech notes:

- New Vite entry added at `vite.config.ts` `rolldownOptions.input.howtoplay`.
- Bundle: `howtoplay-*.js` 95 KB (33 KB gz) + `howtoplay-*.css` 62 KB
  (10 KB gz) + GSAP split chunk 69 KB (27 KB gz). NOT under the 100 KB
  phone ceiling — separate entry, separate chunk, loaded only when reader
  hits `/howtoplay.html`.
- Consumes existing token system: `primitives.css` (Dreamland scales),
  `semantic.css` (font families), with a page-scoped `dossier.css` layer
  adding paper/stamp/desk/typography tokens.
- Scroll-reveal motion via GSAP + ScrollTrigger (registered once, killed
  on unmount). Reduced-motion path sets opacity:1 immediately.
- Reading-progress indicator at the right edge (hidden under 720px).
- Imagen 4 assets at `public/assets/howtoplay/`: `pendleton-crest.png`,
  `operations-manual-plate.png`. Script: `scripts/generate-htp-assets.ts`
  (set `HTP_ASSET=<filename>` to regenerate one; `HTP_ASSET=all` for the
  full batch including `desk-scene` which is generated but unused).
- All 17 rules-accurate per `docs/RULES-REFERENCE.md`. No 5-Different
  combo (correctly excluded per Party Pack edition).
