# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10). Spec itself is frozen; only §8 Acceptance Criteria checkboxes get updated as work lands.
- **167/167 tests, typecheck clean** (verified 2026-04-11).
- **Game is functional** — staging, hand, board, all card types, nope chains, elimination all working.
- **Visual layer is FRAGILE** — see `docs/post-mortems/VISUAL-LAYER-AUTOPSY.md`. **Rebuild IS NOW IN PROGRESS** — `docs/plans/css-foundation-rebuild/`.
- **CSS Foundation Rebuild Plan is MID-DRAFT** — roadmap + phase-1 + phase-2 + phase-3 all COMPLETE (2026-04-11); phases 4-5 not started. See step 1 below.
- **Dreamland S8 is the palette reference season** (Holman's stated favorite; warm cocktail-lounge mid-century). 18 reference frames at `docs/plans/css-foundation-rebuild/dreamland-reference/images/`; fair-use posture documented in `dreamland-reference/README.md`. Palette extracted into Phase 1 §2.2 (74 Dreamland-sourced color primitives).
- **Saul Bass is VERIFIED, not a hallucination** (corrected 2026-04-11) — Neal Holman primary source at Art of the Title May 2016. See `feedback-hallucinated-references.md` in memory for correction detail. Adjacent verified influences: Jack Kirby, Steve Ditko, Mad Men, 1960 Bond, OSS 117, Pink Panther, mid-century furniture, deliberate anachronism (all sourced to Holman / Adam Reed / Salon / A.V. Club).
- **Phrasing! is a cross-phase design goal** — running gag across all phases, target cadence 3-5 distinct beats. See `roadmap.md` §3.6. Phase 2 committed beat: EliminatedView flavor line #9 (*"Penetrated by enemy assets. ...Phrasing."*).
- **CLAUDE.md has "The Contract" section** pointing at the spec. Key sections Claude should know by heart: §2 Quality Bar, §3 Visual Reference, §3.4 Form Factors, §7 ADRs, §8 Acceptance Criteria.

## Next Steps (in priority order)

### 1. CSS Foundation Rebuild Plan (IN PROGRESS — mid-draft 2026-04-11)

**Plan directory**: `docs/plans/css-foundation-rebuild/`

| File | Status | Notes |
|---|---|---|
| `roadmap.md` | ✅ **COMPLETE** | Parent doc: research, decisions, token taxonomy, phase structure. Includes §3.6 "Recurring design motifs" — phrasing as cross-phase gag. |
| `phase-1-foundation.md` | ✅ **COMPLETE** | Token system + motion TS/CSS twin + CVD harness. 74 Dreamland-sourced color primitives. Every value committed, not placeholder. |
| `phase-2-phone-view-migration.md` | ✅ **COMPLETE** | All 14 phone files + cross-view BottomSheet are full rewrites. 2235 LOC. Ready for `/deepen-plan`. |
| `phase-3-board-view-migration.md` | ✅ **COMPLETE** | 2753 LOC. 14 file rewrites (10 board modules + 1 fonts-mono + 3 cross-view) + 1 TSX retheme edit. Three audit corrections vs. roadmap documented in §1.1. Ready for `/deepen-plan`. |
| `phase-4-motion-consolidation.md` | ❌ NOT STARTED | |
| `phase-5-verification-acceptance.md` | ❌ NOT STARTED | |

#### ▶ FIRST ACTION NEXT SESSION: write Phase 4

Per `feedback-stop-after-every-phase.md`, Phase 4 is its own session — one phase, stop, review, next. Phase 4 owns motion consolidation: 22 Framer Motion transition sites, 2 GSAP call sites (`PlayerRing.tsx:55-57`, `DramaOverlay.tsx:123-128`), 15 CSS `@keyframes` durations, 13 CSS `transition` declarations. All consume motion tokens. `motion-token-sync.test.ts` ensures TS ↔ CSS drift detection. Phase 4 also resolves the `PlayerRing.tsx:70-71` hardcoded `panelW` values by having TSX read the computed `--size-player-panel-width` from a measurement div (Phase 3 landmine §5.1).

**Phase 4 structure is DIFFERENT from Phases 2/3.** Phases 2/3 were per-file CSS rewrites; Phase 4 is an audit-and-edit sweep across already-rewritten files plus TSX components. Organize Phase 4 by motion-site TYPE, not by file:
- **§2.3** — 22 Framer Motion transition sites. One subsection per site with before/after TSX snippets (import `MOTION` from `@client/shared/tokens/motion`, replace inline `{ duration: X, ease: [...] }` with token reference). Group by source file: Hand, StagingArea, PlayingView, SmartActionBox, EliminatedView, GameOver, DramaOverlay, BottomSheet, CardDetailSheet, sheets/*.
- **§2.4** — 2 GSAP call sites: `PlayerRing.tsx:55-57` (turn-transition `fromTo`), `DramaOverlay.tsx:123-128` (drama `fromTo` + `to`). Before/after with TSX import from `motion.ts` + duration/easing swap.
- **§2.5** — 15 CSS `@keyframes` duration edits. For each: file path + keyframe name + new `var(--motion-duration-*)` reference. These files were already rewritten in Phases 2/3 so Phase 4 is surgical edits, not wholesale rewrites.
- **§2.6** — 13 CSS `transition` declaration edits. Same surgical pattern as §2.5.
- **§2.7** — PlayerRing TSX ↔ CSS coupling resolution: read `--size-player-panel-width` from a measurement div's computed style at layout time (Phase 3 landmine §5.1).
- **§2.8** — Unique springs to name: `EliminatedView.tsx:34` `{ stiffness: 400, damping: 15 }` → `MOTION_SPRINGS.punchy` (already in Phase 1 motion.ts), `GameOver.tsx:52` `{ stiffness: 200, damping: 20 }` → `MOTION_SPRINGS.gentle` (also in Phase 1).
- **§2.9** — Literal duplicates removal: `GameOver.tsx:80` `{ stiffness: 300, damping: 24 }` → `MOTION.snappy`, `GameOver.tsx:101` `{ stiffness: 250, damping: 25 }` → `MOTION.deliberate`.

Phase 2/3 per-file template still applies for the CSS sections (§2.5 + §2.6), but Phase 4's new template for TSX sites is: `**Site**` (file:line) → `**Current**` (TSX snippet) → `**Replacement**` (TSX snippet with import) → `**Why this token**` (single-sentence justification).

**Full-rewrite rules** (from `feedback-plans-are-baking-recipes.md`):
- Zero hardcoded hex. Every color via `var(--color-*)` semantic token.
- Zero hardcoded spacing. Every value via `var(--space-N)` or `var(--space-fluid-tight|base|loose)`.
- Zero hardcoded font sizes. Via `var(--text-micro|caption|body|callout|title|display)` — phone scale is svh-based.
- Zero hardcoded radii. Via `var(--radius-xs|sm|md|lg|xl|2xl|full)` or semantic alias.
- Zero hardcoded shadows. Via `var(--shadow-sm|md|lg|xl)` or `var(--shadow-glow-accent|danger|success|drama)`.
- Zero hardcoded motion timing. Durations via `var(--motion-duration-instant|fast|base|slow|dramatic)`, easings via `var(--motion-ease-standard|emphasized|decelerate|accelerate|anticipate)`.
- Zero hardcoded z-index. Via `var(--z-base|raised|sticky|overlay|modal|toast|max)`.
- Zero `var(--foo, #hex)` fallbacks. If the token doesn't exist, add it to Phase 1.
- Zero `vw` in phone view. Exception: `width: 100vw` for full-bleed backdrops inside `position: fixed` containers, with a comment.

#### ▶ Then: Phase 5 (one per session per `feedback-stop-after-every-phase.md`)

After Phase 4 complete:
- **Phase 5** — verification & acceptance. Real iOS 26 device test (`position: fixed` regression is a known landmine per Agent C research), Playwright viewport regression matrix across phone + board brackets, 200% browser zoom WCAG 1.4.4 test, CVD CI gates, WCAG+APCA dual contrast tests, §8.6 full game loop, §8.7 first-time-player test prep.

#### ▶ Then: `/deepen-plan` all 5 phases sequentially

Per `feedback-no-execute-until-plans-complete.md`: **do NOT begin `/ce:work` until all 5 phases are deepened and cross-phase contradictions resolved.** Deepening is where Phase 2's Phase-1 cross-phase flags (see below) get resolved.

**Workflow rules that MUST be honored (from memory)**:
- `feedback-stop-after-every-phase.md` — write ONE phase file, stop for Briggsy's review, then next. Do NOT batch phases in one turn.
- `feedback-plans-are-baking-recipes.md` — plans have actual values and actual code; execution is mechanical.
- `feedback-no-execute-until-plans-complete.md` — deepen ALL, THEN execute.

#### Cross-phase tokens flagged during Phase 2 draft (add to Phase 1 during deepening)

- `--color-bg-overlay-light` (60% alpha) — needed by `ConnectionOverlay.module.css` (§2.3.11) and `BottomSheet.module.css` (§2.6)
- `--color-bg-overlay-heavy` (85% alpha, aliases current `--color-bg-overlay`) — same consumers
- `--size-content-narrow` (fluid clamp, ~280-320px range) — **5 consumers** across the phase: `JoinScreen.form` (300px), `JoinScreen.lobbyList` (320px), `CardDetailSheet.hint` (280px), `EliminatedView.flavor` + `.aliveList` (`min(90%, 320px)` ×2). Phase 1 deepening should introduce one token and migrate all 5, replacing the earlier narrower `--size-card-detail-max` flag (which was a one-consumer version of the same need). See §2.3.8 cross-phase concern for the unification rationale.
- **Phase 1 visual-review pass needed** on `--radius-input` and `--radius-button` semantic aliases (currently both = `--radius-sm` = 4px). Phase 2 §2.3.8 JoinScreen and §2.3.13 sheets both consume them, applying a deliberate 12px → 4px visual change. If visual review against Dreamland reference stills shows the new sharper inputs/buttons fail the §2.2 Archer test, the fix is amending Phase 1's aliases (not overriding in component CSS).

#### Cross-phase tokens flagged during Phase 3 draft (add to Phase 1 during deepening)

See `phase-3-board-view-migration.md` §7 for the full list and rationale. Summary: **27 new Phase 1 tokens** needed for Phase 3 executability:
- **14 in `semantic.board.css`**: 3 board fluid-spacing (`--space-fluid-{tight,base,loose}-board`), 3 board text-scale (`--text-{micro,caption,callout}-board`), 7 board sizing (`--size-player-panel-width`, `--size-lobby-roster-max-width`, `--size-title-accent-width`, `--size-rankings-max-width`, `--size-felt-reticle`, `--size-felt-diamond`, `--size-discard-card-width`), plus **1 amendment**: expand existing `--size-draw-pile-width` from 80→160 to 120→240 to match pre-rebuild visual weight.
- **14 in `semantic.css`**: 8 MinimalCard text-clamp floors/ceilings (`--text-card-name-{min,max,large-min,large-max}`, `--text-card-desc-{min,max,large-min,large-max}`), 6 DramaOverlay text-clamp tokens (`--text-drama-{hero,subdued,victory}-{min,max}`).
- **3 in `primitives.css` + `motion.ts`**: motion ambient durations (`--motion-duration-pulse` 1400ms, `--motion-duration-pulse-slow` 2500ms, `--motion-duration-ambient` 4000ms) for long-loop animations (DrawPile breathe, Lobby + GameOver button pulse, Lobby waiting dots).

**Pending decisions for Phase 5 visual review** (during `/ce:work` Phase 5 execution):
- **GameOver winner glow hue** — Phase 3 §2.5 locks the winner-text glow to `--color-accent-drama` (ochre-9 amber). If visual review prefers cooler, the alternative is `--color-accent-intercept` (emerald-9 forest green). Decision gate is visual review, not plan-time.
- **NopeCountdownBar + DramaOverlay.intercepted emerald saturation** — Phase 3 §2.3.9 and §2.6 both shift from cool cyan to muted emerald-9. If the countdown bar feels too subtle during the intercept window at large viewports, bump to emerald-8 or emerald-10 after the CVD CI gate confirms the contrast stays legal.

#### Pending decisions for Phase 1 visual review (during `/ce:work` Phase 1 execution)

- **Baveuse font evaluation** — Baveuse (Ray Larabie / Typodermic Fonts, ~$30) is verified Archer title font per Neal Holman / Art of the Title May 2016. Phase 1 starts with Clash Display already loaded via `--font-display`. If Phase 1 visual review against Dreamland reference stills fails the §2.2 Archer test, switch to Baveuse — one-line token value change. Decision gate is visual review during `/ce:work` Phase 1, not plan-time.
- **Order *The Art of Archer* book** — Neal Holman, Dey Street / HarperCollins, 2016, ISBN 978-0062441010. $15–25 on Amazon. Not a blocker; if it arrives before Phase 1 palette lock, cross-reference against frame-extracted hex values. **Claude cannot place the order — action item for Briggsy or Harry.**

### 2. Tier 1 retheme gaps (§6.4 in spec — BLOCKS visual lock)

**Partially resolved in plan drafts. Still needs `/ce:work` execution to land in source.**

- ✅ **RESOLVED IN PHASE 2 DRAFT** (§2.3.9a): `src/client/player/EliminatedView.tsx:45` — title changed to **`"You're Burned."`** (was `"You Exploded!"`).
- ✅ **RESOLVED IN PHASE 2 DRAFT** (§2.3.9a): `src/client/player/EliminatedView.tsx:8-17` — flavor pool updated to 9 lines with phrasing beat. Kept 3 originals, reworded 1 (dropped "BOOM"), added 4 Archer-tone replacements, added 1 phrasing beat (*"Penetrated by enemy assets. ...Phrasing."*). Final pool lives in Phase 2 §2.3.9a.
- ✅ **RESOLVED IN PHASE 3 DRAFT** (§2.7): `src/client/board/GameTable.tsx:24` — one-line comment retheme ("Branded felt decoration — EK identity" → "The Pendleton Agency — war-room felt decoration"). CSS-side `feltBranding` SVG palette shifted to Dreamland cordovan/ochre via §2.3.1 data-URI hex updates.

**Source-of-truth for these changes**: `docs/plans/css-foundation-rebuild/phase-2-phone-view-migration.md` §2.3.9a. When `/ce:work` executes Phase 2, it applies these TSX edits — no separate task needed.

### 3. Execute Tier 2 retheme cleanup (§6.4 in spec — code clarity, non-blocking)
Exact file:line prescriptions:
- `src/server/game/engine.ts` lines 153, 216, 260, 478, 581, 654, 703, 708, 711, 1035, 1040 — rename "EK" shorthand to "Burned" in comments (11 instances)
- `src/shared/constants.ts:21-23` — rename `EK_REVEAL_MS` → `BURNED_REVEAL_MS`, `EK_RELIEF_MS` → `BURNED_RELIEF_MS`, `EK_ELIMINATION_MS` → `BURNED_ELIMINATION_MS`. Coordinated rename across all call sites (grep first).
- `src/server/game/engine.ts:1040` — change error message `'No EK in hand'` to `'No Burned card in hand'`
- `src/client/board/Arena.tsx:7` — change comment `"EK reveal"` to `"Burned reveal"`

**Do NOT touch** internal state machine `defuse-pending` / `defuse-place` / `{ type: 'defuse' }` names. §6.4 Tier 3 documents the decision: too much blast radius (server, client selectors, Zod schemas, tests, Durable Object hibernated state) for zero user-facing benefit.

### 4. Execute CSS Foundation Rebuild — `/ce:work` Phases 1-5 in sequence

**Blocked on**: Phases 1-5 all drafted AND all deepened AND cross-phase contradictions resolved. See step 1.

Execution order (one phase per session, commit between each):
1. `/ce:work docs/plans/css-foundation-rebuild/phase-1-foundation.md` — establishes token system, creates `src/client/shared/tokens/`, deletes `theme.ts`/`theme.css`. Zero component migration. `palette-cvd.test.ts` + `palette-contrast.test.ts` + `motion-token-sync.test.ts` start passing.
2. `/ce:work docs/plans/css-foundation-rebuild/phase-2-phone-view-migration.md` — 14 phone `.module.css` rewritten, TurnBanner deleted, NopeButton+InterceptButton consolidated to FloatingActionButton, EliminatedView Tier 1 retheme (TSX edits), BottomSheet `dvh → svh` fix.
3. `/ce:work docs/plans/css-foundation-rebuild/phase-3-board-view-migration.md` — 11 board files, MinimalCard/GameOver/DramaOverlay cross-view rewrites, feltBranding Tier 1 fix.
4. `/ce:work docs/plans/css-foundation-rebuild/phase-4-motion-consolidation.md` — all motion (FM + GSAP + CSS keyframes) consume tokens.
5. `/ce:work docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md` — iOS 26 device test, visual regression matrix, §8.6 full-loop, §8.7 first-time-player prep.

Each phase runs `pnpm test` + `pnpm typecheck` + `pnpm lint` + `pnpm build` before committing. Phone bundle stays ≤100KB gzipped.

### 5. Deploy to Cloudflare (per ADR-01 in spec)
- Client: Cloudflare Pages (git-push deploy, preview URLs per commit)
- Server: Cloudflare Workers + Durable Objects via `wrangler deploy`
- Free tier — $0 cost
- Prerequisite: `wrangler` CLI setup + authentication (not yet done — will block first deploy)
- Rollback procedure: `wrangler versions list` → `wrangler versions deploy <version-id>`

### 6. Full Game Loop Test (§8.6 in spec)
5-player game from lobby to game-over without errors. Every card type played at least once. Elimination test (EliminatedView displays, eliminated player cannot act). Reconnect test (force-close browser mid-game, rejoin same slot with same hand). Zero ghost turns, frozen states, desyncs.

### 7. First-Time Player Test (§8.7 in spec — the FINAL quality gate)
A friend who has never seen BURNED plays a full game. **Pass condition:** they say some version of *"wait — did Archer and company release this?"* or *"this feels like a commercial app, not a side project."* **Fail condition:** polite *"cool, you built this?"* energy. Fix visuals and retest if we fail. No exceptions.

## Non-BURNED Follow-ups
- **Build `/product-specification` skill** — tracked in `project_skills_next_steps.md` in Claude's memory. Design and workflow fully proven in today's BURNED spec session; skill needs scaffolding (SKILL.md + `reference/question-banks.md` + optional `reference/example-burned.md`). Future session, fresh context, invoke `skill-creator` skill to scaffold.

## Landmines
- **Saul Bass is VERIFIED** — Neal Holman, Art of the Title May 2016, verbatim: *"Almost every work by Saul Bass was a heavy influence on Archer."* Not a hallucination. See `feedback-hallucinated-references.md` in memory for the correction. Lesson stands: verify external references against a primary source before calcifying them across multiple files.
- **Dreamland S8 is palette reference; image files are fair-use only** — 18 frames at `docs/plans/css-foundation-rebuild/dreamland-reference/images/` are fan-uploaded Archer Wiki captures (FX/FXX copyright). Allowed: internal palette research, palette extraction. NOT allowed: publishing, marketing, shipping with game. **If repo goes public, add `dreamland-reference/images/` to `.gitignore`** — flagged in Phase 1 §4.4 and Phase 5 as a pre-deploy check.
- **Visual layer clean-slate scope boundary** — visual layer (CSS + tokens + motion timing) is replaceable; game logic, protocol, server, tests, Framer Motion library choice, Cloudflare infrastructure stay untouched. See `project-burned-clean-slate-visual.md` in memory.
- **Framer Motion `transition.duration` is Number, not string** — you cannot pass `var(--motion-duration-base)` to a Framer Motion `transition` prop. Motion tokens must be a TypeScript object in `motion.ts` AND mirrored as CSS custom properties in `primitives.css`. The `motion-token-sync.test.ts` CI test prevents drift. Phase 1 §2.6 and §2.7 cover the pattern.
- **iOS 26 broke `position: fixed` and `position: sticky`** (partially fixed in 26.1). This is the exact pattern BURNED uses for TitleBar, StatusBar, floating FloatingActionButton. Phase 5 gates visual lock on real iOS 26 device testing.
- **Hand cards at height:100% + aspect-ratio OVERFLOWS the screen** — don't do this again. Current fix: aspect-ratio on the SLOT wrapper, not the card.
- **No global `box-sizing: border-box`** — added manually to `.card` and `.hand`. Container queries measure content-box, so thresholds adjusted (115px and 177px instead of 140px and 200px).
- **`overflow: hidden` on staging section clips absolutely-positioned elements** — labels must be inside the box, not floating on the border.
- **CSS `justify-content: center` on scroll containers clips left overflow** — use `::before`/`::after` flex spacers + JS scroll centering instead.
- **Framer Motion `layoutId` on staged cards causes border flash** when siblings exit — removed. `transition: none` on `[data-selected]` prevents remaining flicker.
- **`game_over` phase still uses snake_case** while all other phases use kebab-case.
- **NopeWindow stores full GameAction in persisted state** — no versioning for hibernated payloads.
- **CSS Modules without tokens = organized chaos.** Each module makes independent sizing decisions. UMB worked because every dimension flows from shared clamp() tokens. See `docs/post-mortems/VISUAL-LAYER-AUTOPSY.md`.
- **Internal state machine uses "defuse" terminology (NOT a gap)** — see §6.4 Tier 3 in spec. Intentionally left alone. Do NOT rename.
- **Cloudflare `wrangler` not yet authenticated** — will block step 5 deploy until resolved.
- **PRODUCT-SPECIFICATION.md v1.0 is LOCKED** — spec is frozen. Only §8 acceptance criteria checkboxes get updated. Don't edit §1-§7 without a product-level reason.
- **Memory files are NOT in this git repo** — they live at `C:/Users/brigg/.claude/projects/C--Users-brigg-ai-learning-journey/memory/` and persist locally per machine.
