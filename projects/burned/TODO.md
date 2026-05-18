# BURNED — TODO

Operator's queue. Actionable items only. **Not a diary** — git log has
the history. (Rule: `feedback-todo-is-not-a-diary.md`.)

---

## 1. Active priorities

### Status (verified 2026-05-18)

- Tests: **1407 pass** (root suite) | 6 expected fail (68/68 files green)
- Trailer subpackage tests: **165 pass** — preflight trim contract + Gemini adapter slot guards (Step 0.5) + ElevenLabs JSON schema + OpenAI fence extraction + script-leak guards (Step 1.5) + Sterling-LANA four-axis shape contract on `PARAGRAPH_3_SCREAM` (Unit 0.6) + Pendleton-vocab translation + earned-Phrasing! entendre contract on `TONE_SAMPLE_PARAGRAPH` (Unit 0.4) + R14 cold-open candidate line text + machine-wordplay surface + VOICE_DIRECTION guard + Janet voice/voice_settings lock (Unit 0.3)
- Typecheck: clean (`pnpm typecheck` root + `videos/trailer/`)
- Phone player entry: **19.17 KB gz** — under the 100 KB ceiling
- DramaOverlay lazy chunk: 2.34 KB gz
- HOW-TO-PLAY bundle: `howtoplay-*.js` 99.04 KB (33.90 KB gz) + `howtoplay-*.css` 65.83 KB (10.68 KB gz) + shared GSAP chunk 69.42 KB (27.21 KB gz)
- Protocol version: **v6**

### Origin trailer

All 8 phase plans drafted, deepened, and document-reviewed. Source of
truth: `docs/plans/origin-trailer/` (phase-0 through phase-7 + `roadmap.md`
with the ADR ledger). Plan set is the recipe — execution begins here.

**Phase 0 — ✅ CLOSED 2026-05-18.** All 5 unit dispositions consolidated
in `videos/trailer/PHASE-0-EXIT.md`; signoff sentinels written to
`videos/trailer/sample-eval/{r14-cold-open/briggsy-review-0.3,PHASE-0-EXIT}.signoff`.
Phase 1 (beat-sheet-lock) unblocked.

**Phase 0 unit roll-up (verified 2026-05-18):**

- Unit 0.1 (scaffold) — ✅ shipped `e5ca0d7e`
- Unit 0.2 Step 0 (Sterling cadence-spec.md) — ✅ shipped `56c8b9ba`
- Unit 0.2 Steps 0a + 1 + 3 (TTS-readiness probe + sample script +
  MUSHRA protocol) — ✅ scaffolded `4d6aac64`; engine execution still
  gated on ElevenLabs Creator $22/mo (OpenAI key landed 2026-05-18)
- **Unit 0.5 (composite-viability spike) — ✅ CLEARED `b971d3d6`** —
  all 5 Remotion integration points render cleanly in MP4 export.
  Spike-results: `videos/trailer/sample-eval/spike/spike-results.md`.
  Phase 4 inherits all production patterns; Phase 4 Unit 4.0 font
  spike DROPS from scope (variable-axis weight syntax works).
- **Unit 0.2 Step 0.5 (spec sanity check) — ✅ PASS (single-reader
  fallback) 2026-05-18.** Gemini Director's Chair adapter
  (`cadence-spec-gemini.md`) + generator (`generate-preflight-clip.ts`)
  shipped; `gemini-spec-test.wav` rendered 14.80 s on
  `gemini-3.1-flash-tts-preview` voice `Charon`. Reader A (Briggsy)
  vibe-check: *"Patrick Warburton"* → Target Band cluster (Warburton
  is a deadpan-baritone-sardonic voice actor — Brock Samson / Lemony
  Snicket narrator archetype). No Benjamin / Sterling Archer / catchphrase
  reference volunteered → no Ceiling hit per cadence-spec §5.2.
  Reader B single-reader fallback elected per plan §Step 0.5 step 6.
  Disposition + Warburton-adjacent sub-note carried forward in
  `preflight/preflight-decision.md`. Step 1.5 adapter already canonical
  (built ahead-of-schedule).

**Unit 0.6 (R5 Sterling-Screams-Lana Cameo Eval) — ✅ CLOSED 2026-05-18.**
Path A v3 (`[shouts] VEEEEEEEERAAAA!!!`) locked as winning Dash scream
after three-variant audition (v1 short-burst → partial; v2 wrong-vowel
drag → failed shape; v3 first-vowel drag → ship).

Sterling-LANA four-axis acoustic shape now characterized in
`videos/trailer/sample-eval/r4-dash/cadence-spec.md` §3.6: (1) flat
pitch, (2) 6-12 dB amplitude jump, (3) first-vowel drag, (4) accent
anchored on first syllable. Canonical text locked into
`PARAGRAPH_3_SCREAM` constant in `videos/trailer/scripts/sample-script-dash.ts`.
Adapter scream notes updated. Disposition + sign-off at
`videos/trailer/sample-eval/r5-scream/scream-eval.md` +
`briggsy-review-0.6.signoff`.

**Unit 0.4 (Tone Prototype Gate) — ✅ CLOSED 2026-05-18.** Path A
Roger v2 paragraph (`"... Try and find a human one. Hard to put down.
…Phrasing."`) locked as played-straight tone winner after a 2-variant
audition. v1 shipped with an unearned Phrasing! beat (no
double-entendre setup preceding the catchphrase); Briggsy caught it on
audition and explained the mechanic — Phrasing! fires on a "that's
what she said"-style trigger requiring an entendre-coded setup line.
v2 inserts `"Hard to put down."` (literal: page-turner; entendre on
"hard") to earn the beat. Reader A: *"it's good"* → ship.

Played-straight register is now LOCKED for Phase 1 beat-sheet-lock
(not provisional). The earned-Phrasing! rule is asserted by a contract
test in `tone-prototype.test.ts` and documented in the paragraph
constant's header comment. Full gap-comedy decode test continues to
defer to Phase 6 N=6 cold-decode panel per cross-phase ADR #21.
Disposition + sign-off at
`videos/trailer/sample-eval/tone/eval.md` +
`briggsy-review-0.4.signoff`. v1 preserved as
`sample-eval/tone/sample.v1.mp3` (gitignored, on-disk only) for
unearned-vs-earned A/B reference.

**Unit 0.3 (R14 cold-open decode) — ✅ CLOSED 2026-05-18.** Two-phase
audition: (1) line audition picked Candidate #4 ("He's a machine, this
kid. Honestly at this point I'm just impressed.") over #5 (#5 carried
robotic-tail defect on kicker). (2) Voice audition ran 4 variants
(Sarah → Matilda → Sloane → Kristen, all matriarch-tuned) after Sarah
was flagged as too "reassuring" for Janet's tough-matriarch character.
Sloane (ElevenLabs **Shared Library**, `m8AHWg36LJTQWKmfeGVv`) +
matriarch-tuned voice_settings (stability 0.85, style 0.05, speed
0.92) won the A/B over Kristen. Canonical `candidate-4.mp3` is exact
audited Sloane bytes (sha256
`4a9db27108689e2eeb241174843ea020a7c1cfe953e23655fee83b2216119f7d`);
re-rendered `cold-open-candidate-4.mp4` consumes that audio.

Disposition + line iteration + Janet voice iteration at
`videos/trailer/sample-eval/r14-cold-open/{decode-eval.md,candidates.md}`.
Sentinel signoffs at
`videos/trailer/sample-eval/{r14-cold-open/briggsy-review-0.3,PHASE-0-EXIT}.signoff`.

Unit 0.2 disposition:
`videos/trailer/sample-eval/r4-dash/unit-0.2-disposition.md`.
Unit 0.5 spike disposition:
`videos/trailer/sample-eval/spike/spike-results.md`.

**Phase 0 Unit 0.2 closure summary:**
- Step 5 winner: **Path A — ElevenLabs Roger** (`CwhRBWXzGAHq8TQ4Fs17`,
  model `eleven_v3`) per Reader A audition 2026-05-18
- OpenAI (onyx): dropped to Floor — "too robotic"
- Gemini (Charon): Target Band secondary — kept as backup option
- Steps 3a / 3 / 4 skipped (single-reader fallback continued —
  Reader A audition produced clear winner; WebMUSHRA infrastructure
  unnecessary)
- Path B (voice clone): not exercised, opt-in option preserved for
  Phase 4 if elected
- Phase 4 trailer assembly carry-forwards documented in disposition
  doc (voice_settings tuning, alternate voices, Warburton-adjacent
  flag, bracket-tag refinement, Path B opportunity)

**Open follow-up (NOT blocking):** Path A voice-filter scoring
treats female-voice keyword matches equally with male. Picked voice
(Roger) is correct because of the gender label bonus, but ranking
presentation is misleading. Fix when Path A voice gets revisited in
Phase 4 if needed.

**Phase 0 ladder status (ALL CLOSED):**
- Unit 0.2: ✅ CLOSED (Roger / ElevenLabs Path A locked)
- Unit 0.5: ✅ CLEARED (composite viability all 5 integration points)
- Unit 0.6: ✅ CLOSED (R5 scream — Path A v3 `[shouts] VEEEEEEEERAAAA!!!`)
- Unit 0.4: ✅ CLOSED (tone — Path A v2 earned-Phrasing! "Hard to put down")
- Unit 0.3: ✅ CLOSED (cold-open #4 + Janet/Sloane matriarch-tuned)

**Next unblocked work: Phase 1 — Beat Sheet Lock.** Phase 1 reads
`videos/trailer/PHASE-0-EXIT.md` to scaffold beat-sheet around the
locked dispositions. Plan: `docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`.

After Phase 1: sequential Phase 2 → Phase 7 execution.

### Deploy migration — quarantined (separate commit when ready)

partykit → Cloudflare Workers migration is mid-flight, uncommitted:

- `board.html`, `player.html`, `public/_headers` — preconnect / CSP host
  swapped to `burned.briggsy007.workers.dev`
- `src/server/room.ts` — `burned-cxa.pages.dev` added to `allowedOrigins`
- `src/client/howtoplay/acts/ActRemote.tsx` — copy URL `burned.pages.dev`
  → `burned-cxa.pages.dev`
- `../../.github/workflows/deploy-burned.yml` — untracked CI workflow

Not bundled into origin-trailer commits. Deserves its own deploy commit
when ready. Phase 5 Unit 5.0 Step 5 carries a 2026-05-24 deadline for the
local-dev fallback path if migration isn't finalized by then.

---

## 2. Landmines

Active warnings only. Older landmines have moved to `docs/insights/` and
`CLAUDE.md`.

- **Janet voice = Sloane + matriarch-tuned, NOT Roger defaults**
  (2026-05-18 Unit 0.3 close). Janet's locked voice is **Sloane**
  (`m8AHWg36LJTQWKmfeGVv`, ElevenLabs **Shared Library** — not the local
  library) with matriarch-tuned voice_settings override:
  `stability: 0.85, similarity_boost: 0.75, style: 0.05,
  use_speaker_boost: true, speed: 0.92`. This DIVERGES from Unit 0.2's
  Roger defaults (`stability: 0.70, style: 0.15, speed: 0.95`). The
  divergence is essential — Briggsy auditioned Sarah-with-Roger-defaults
  + Matilda-with-matriarch-tuned + Sloane-with-matriarch-tuned +
  Kristen-with-matriarch-tuned, and the matriarch-tuned settings are
  the ones that strip the upbeat baseline that creates "reassuring" /
  "professional" warmth in mature American female voices. If anyone in
  Phase 4 authors new Janet dialogue and re-renders, they MUST use
  `COLD_OPEN_SPEAKER.voiceSettings` from `cold-open-prototype.ts`, NOT
  the Roger defaults from `cadence-spec-elevenlabs.json`. The contract
  test in `cold-open-prototype.test.ts` enforces the profile shape on
  the constant; the renderer `generate-cold-open-clip.ts` consumes it
  via the constant. Don't hardcode voice_settings in a new Phase 4
  Janet-renderer script — import from the single source of truth.
  Phase 4 may want a similar character-voice lock for Sable + Vera +
  Neal + Otto + Agent X if any of them speak in the trailer — each
  would need its own voice audition cycle following this pattern.

- **Origin-trailer doc drift after Unit 0.6 §3.6 expansion** (2026-05-18,
  closure of `ed03e598`). The Sterling-LANA four-axis characterization
  (flat pitch + amp jump + first-vowel drag + accent anchor) now lives
  in `videos/trailer/sample-eval/r4-dash/cadence-spec.md` §3.6 and the
  ElevenLabs adapter notes. Stale references in:
  · `cadence-spec-gemini.md:136` and `cadence-spec-openai.md:48,92` —
    encode the original 2-axis "volume-discontinuous-not-pitch" framing
    only. Currently dead-code (Path C engines dropped to backup per
    Unit 0.2 disposition); if either engine is ever reactivated for
    Phase 4/6 fallback, re-derive each adapter's scream section from
    `cadence-spec.md` §3.6 before rendering, otherwise the engine will
    produce a no-drag burst instead of the Sterling-LANA call.
  · `docs/plans/origin-trailer/phase-1-beat-sheet-lock.md` lines 414,
    415, 1224, 1234, 1441 inline `"VERAAA!!!"` rather than pointing at
    the `PARAGRAPH_3_SCREAM` constant. When Phase 1 beat-sheet-lock
    executes, fix: replace the inline string with a constant reference
    so the canonical `VEEEEEEEERAAAA!!!` text is what ships.
  · `docs/plans/origin-trailer/phase-0-gate-resolution.md` references
    to "VERAAA!!!" are HISTORICAL (the eval procedure that resolved to
    the new canonical text). Don't retroactively edit — they document
    the path, not the destination.

- **Push to Briggsy's repos is now autonomous; force-push to
  main/master is the carve-out.** Policy inverted 2026-05-18 after
  the auto-mode classifier blocked `/distill` citing two autonomous
  Phase 0 Unit 0.2 pushes (`56c8b9ba` + `4d6aac64`). Briggsy's
  correction: *"and let's update whatever command that allows you to
  push w/o me say 'yes' every time, I've never said no."* The
  binding rule lives in `~/.claude/settings.json` `autoMode.allow`
  (natural-language rule the classifier LLM reads at decision
  time). Memory cross-ref: [[feedback-push-without-asking]]. The
  one carve-out: force-push to main/master still needs explicit
  ask per the system-prompt's "NEVER force-push to main/master"
  rule. Non-force pushes to main/master and pushes (force or not)
  to feature branches all clear without confirmation.
- **Absolute-positioned cards in `.fan` are anchored to `.piles` center,
  not `.fan` center** (commit `b274a12b`, 2026-05-14). The three discard
  layers (`.top`, `.behind1`, `.behind2`) are `position: absolute` with
  no explicit top/left, which puts their static position at the center
  of the nearest flex parent. The flex chain is `.piles` (centered) →
  `.pileSection` (centered) → `.fan` (centered) → cards. Because every
  link is centered, the cards' fixed positions are determined by
  `.piles` center, not `.fan` center. **Consequence:** changing `.fan`
  width does NOT move the cards or change which pixels get clipped at
  the `.piles overflow:hidden` boundary. The cards spill 0.827W from
  fan-center after rotation; the clip ancestor (`.piles`) must be wide
  enough to contain that spread, period. Bumping `.fan` width is a NOP
  from the user's POV. If you ever see "fan-width edit didn't change
  anything," that's why — go widen the column, not the frame. Geometry
  scratchpad lives in `DiscardFan.module.css` next to the `.fan` rule.
- **Blotter grid is 50/50 by intention** (commit `b274a12b`). Don't
  revert to 40/60 favoring COMMS without re-running the math at the
  iPad-tall-viewport 300px card-width floor. The hero discard's
  rotated peek-card bbox is ~496px wide there; 40% column = 395px
  content area = 50px clipped per side, every game. COMMS's longest
  event line (~38 chars ≈ 270-300px) fits easily at 50%.
- **`// CAPS LETTERSPACED` is non-interactive chrome vocabulary**
  (commit `96744440`, 2026-05-14). Codebase-wide pattern: `//
  Deploy Operative`, `// Briefing`, `// Operation`, `// Standing By`,
  `// CHANNEL OPEN` — all static labels. Putting `// LABEL` on a
  tappable element camouflages affordance: users read it as another
  label, not a link. First Operations Manual ship used `// OPERATIONS
  MANUAL` and Briggsy flagged it as visually indistinguishable from
  the surrounding chrome. Fix was to drop the `//` prefix and replace
  with a trailing `→` arrow (the brief's PlayCTA established that
  vocabulary already). When adding a new interactive element to a
  classified-chrome surface, reach for `→` / `↗` / a bracket-shape
  container — NOT the `//` prefix.
- **Touch-device affordance needs its own gate** (commit `96744440`).
  `@media (hover: hover) and (pointer: fine)` is the project-wide
  guard against phantom sticky-hover on touch (per `MinimalCard`,
  `joinButton`, `startButton`, `reclaimButton`, `playAgain`). Side
  effect: any hover-only affordance signal is INVISIBLE on phones.
  Pattern shipped for the Operations Manual arrow: a parallel `@media
  (hover: none) and (pointer: coarse)` rule that drives a slow
  periodic transform-keyframe attract loop on the arrow. Touch
  devices get the equivalent "alive" cue. Use this dual-gate pattern
  whenever a new tappable element relies on hover motion as its
  affordance signal — phones see neither hover nor `:active` until
  AFTER the tap, so without the touch-side attract loop the element
  reads as static.
- **HOW-TO-PLAY back/CTA return-trip pattern** (commit `96744440`,
  `src/client/howtoplay/returnToGame.ts`). The brief's "Back" link
  and bottom CTA both used `href="/"` which 404s in Vite dev (no
  root index) and lands on the wrong surface in prod (Pages
  `_redirects` sends `/` → `/board.html`, wrong for phone readers
  who came from `/player.html?room=X` and would lose room context).
  Fix: `returnToGame` onClick handler. If `window.history.length > 1`
  → `history.back()` (same-tab nav case). Else → `window.close()`
  (new-tab from `target="_blank"` case — closes brief, user lands
  back on their game tab with state intact). `e.preventDefault`
  blocks the broken href fallback; middle/right-click still follows
  href as a niche escape hatch. Any future link inside HOW-TO-PLAY
  that needs to "return to game" should use this helper, NOT a
  hardcoded href. Adding HOW-TO-PLAY entry points from other game
  surfaces is fine — the existing `target="_blank"` on those source
  links makes `window.close()` the natural return path.
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
- **HOW-TO-PLAY: card label corners + amber color** (commit `9ef77e7d`,
  refined `f87dc09e`). The card label's bottom-corner radius is now
  `var(--card-radius-inner)` = `calc(--card-radius - --card-border-w)`
  for concentric curves with the visible inner edge. Label `border-top`
  uses the SAME `color-mix(in oklab, var(--color-ochre-9) 35%,
  transparent)` as the card's outer border — different opacity reads
  as misaligned even when geometry is correct.
- **HOW-TO-PLAY: card treatments use REAL border-width, not inset
  box-shadow** (commit `f87dc09e`). `.tx-glow` overrides
  `--card-border-w: 2px` + `border-color: var(--drama-amber)`.
  `.tx-burn` overrides `--card-border-w: 3px` (border-color already
  burn-fire). DO NOT add `box-shadow: ... inset` ring layers back —
  inset shadows paint BELOW content per spec, so the label's solid
  background overpaints them at the label's vertical extent, making
  the colored ring visibly shrink AT the label (reads as "label is
  wider than the rest of the card"). Real borders shrink the content
  area so the label fits inside the ring automatically; the existing
  `--card-radius-inner` calc resolves concentric corners.
- **HOW-TO-PLAY: card-width tokens live on `.desk`, NOT on `.card`**
  (commit `f87dc09e`). `--card-w-sm/md/lg` are defined in
  `styles.css` on `.desk` as defaults. Defining them on `.card` (the
  prior location) blocks inheritance — outer scopes (e.g. ActLoop's
  `.handFan` portrait override) couldn't override the local
  declaration. If you ever need a per-context card size, set the
  token on a parent of `.card`, NOT on `.card` itself.
- **HOW-TO-PLAY: hand-fan portrait card bump scoped to `.handFan`**
  (commit `f87dc09e`, ActLoop.module.css). On portrait orientation,
  `.handFan` overrides `--card-w-sm` to `clamp(95px, 70px + 8vw, 130px)`
  and tightens overlap to `margin-inline: -2.75rem`. Landscape uses
  the default token from `.desk`. If you add another fanned hand
  surface, scope its own token override the same way — don't bump
  the global default.
- **HOW-TO-PLAY: bottom marginalia clears the bottom aside via
  `margin-bottom: 3rem`** (commit `f87dc09e`). Each act with a
  bottom aside/summary box adds `margin-bottom: 3rem` to that
  element so the absolutely-positioned bottom-left handwritten
  Marginalia (78% opacity blue) doesn't bleed into the dark aside
  above. Marginalia's `position: absolute; bottom: 1rem` puts it in
  the same y-band as the aside's bottom edge by default. Combos uses
  `:last-of-type` because it has back-to-back asides — only the last
  one needs the clearance. If you add a new act with a bottom aside +
  bottom-left marginalia, follow the same pattern.
- **HOW-TO-PLAY: FileTab component is GONE** (commit `f87dc09e`).
  Removed across all 10 acts + component files deleted. The
  decorative folder-tab overlapped body copy on phone and didn't
  earn its keep. Don't reintroduce — if you need a visual
  section-marker on phone, design for the constrained width first.
- **HOW-TO-PLAY: vite entry registration** (commit `b48fd4fd`). The
  `howtoplay` entry is in `vite.config.ts` `rolldownOptions.input`
  alongside board/player. Don't remove it. Dev URL is
  `/howtoplay.html`; prod URL is `/howtoplay` (Cloudflare Pages strips
  `.html`).
- **HOW-TO-PLAY: Imagen prompt gotcha — hex codes WITHOUT trailing
  negatives bake in as text** (caught in title plate v1; reworded
  2026-05-17 per Phase 3 deepening repo-research). Original landmine
  said "DO NOT reference hex codes like `#94 7226` in Imagen prompts."
  Visual inspection of shipped assets (`public/assets/howtoplay/
  pendleton-crest.png` + `operations-manual-plate.png` +
  `public/assets/arena/blotter.png` + `mahogany-horizontal.png` —
  all generated by `scripts/generate-htp-assets.ts` +
  `scripts/generate-briefing-assets.ts` which BOTH use hex codes in
  prompts) shows ZERO baked hex-text. **Working recipe**: hex codes
  are OK IF every prompt ends with explicit negative suppressors —
  "absolutely NO additional text NO words NO numbers NO hex codes NO
  color codes beyond [whitelisted text if any]". The shipping
  scripts use this pattern; the outputs are clean. The original
  landmine warning was overstated. **Rule**: hex codes safe with
  negative suppressors at end; hex codes unsafe without them.
  Regenerator script: `scripts/generate-htp-assets.ts` with
  `HTP_ASSET=<filename>` env var to target one asset (filenames:
  `pendleton-crest`, `operations-manual-plate`, `desk-scene`; or
  `all` for the batch).
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
  for dev-actions** (commit `36c1af9f`, 2026-05-13). `room.ts`
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
- **Phrasing! queue — surfaces resolved** (2026-05-14 / 2026-05-15).
  (1) Lobby/idle copy: SKIPPED — "Awaiting check-in" / "Opening secure
  channel" already tonally strong in Pendleton voice; explicit
  Phrasing! callout would cheapen it. (2) ConnectionOverlay strings:
  SKIPPED — too transient/rare for a beat to land. (3) DramaOverlay
  BURNED-draw beat: SHIPPED 2026-05-15 as `BURNED_PHRASING_POOL` in
  DramaOverlay.tsx — 6 wire-report sub-caption variants ("// CASE
  CLOSED", "// FILE TERMINATED", "// COVER COMPROMISED", "// OPERATIVE
  BURNED", "// CASE CLOSED. NEXT.", "// TOAST.") that surface beneath
  the victim-name caption on the non-drawer/board cinematic. These are
  **tonal cousins, not literal Phrasing! catchphrase landings** — they
  juxtapose formal `//` chrome with Archer-deadpan kickers ("TOAST.",
  "NEXT.") rather than the double-entendre-plus-callout pattern of
  spec §3.5 shipped beats. A literal "...Phrasing." landing on the
  BURNED cinematic was considered but rejected: the cinematic is the
  game's heaviest dramatic moment and a comedic callout would compete
  with the beat. If a future surface wants a literal Phrasing! landing,
  spec §3.5 catalog remains the source of truth.
