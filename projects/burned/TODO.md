# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10). Spec itself is frozen; only §8 Acceptance Criteria checkboxes get updated as work lands.
- **167/167 tests, typecheck clean** (verified 2026-04-11).
- **Game is functional** — staging, hand, board, all card types, nope chains, elimination all working.
- **Visual layer is FRAGILE** — see `docs/post-mortems/VISUAL-LAYER-AUTOPSY.md`. **Rebuild IS NOW IN PROGRESS** — `docs/plans/css-foundation-rebuild/`.
- **CSS Foundation Rebuild Plan is PARTIALLY DRAFTED** — roadmap + phase-1 complete; phase-2 partial (11 of 14 files are full rewrites, 4 remain as transformation specs + 1 minor cleanup); phases 3-5 not started. See step 1 below.
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
| `phase-2-phone-view-migration.md` | ⚠️ **PARTIAL — 11 of 14 full rewrites done** | See sub-status below. |
| `phase-3-board-view-migration.md` | ❌ NOT STARTED | |
| `phase-4-motion-consolidation.md` | ❌ NOT STARTED | |
| `phase-5-verification-acceptance.md` | ❌ NOT STARTED | |

#### ▶ FIRST ACTION NEXT SESSION: finish Phase 2

Phase 2's remaining work is converting 4 transformation-spec sections to full rewrites + 1 minor label cleanup. The pattern was ratified 2026-04-11 (`feedback-plans-are-baking-recipes.md` in memory): full concrete CSS blocks, not substitution lists.

| § | File | Current | Target LOC | Effort |
|---|---|---|---|---|
| §2.3.4 | `SmartActionBox.module.css` | Labeled "(partial)" but content is mostly complete | ~140 LOC | **Minor** — remove "(partial)" framing, add any missing `:focus-visible` states |
| §2.3.8 | `JoinScreen.module.css` | Transformation spec only | ~160 LOC | **BIG** — 205 LOC original; every `var()` fallback is stale UMB noir palette |
| §2.3.11 | `ConnectionOverlay.module.css` | Transformation spec only | ~38 LOC | Medium |
| §2.3.12 | `CardDetailSheet.module.css` | Transformation spec only | ~40 LOC | Medium — one of 2 genuinely clean files in the audit |
| §2.3.13 | `sheets/sheets.module.css` | Transformation spec only | ~190 LOC | **BIGGEST** — 228 LOC original, 40+ classes for all bottom-sheet prompts (TargetSelect, PeekResult, FavorPick, ComboNameStealer, FuturePeek, DefusePlacement) |

**Pattern to follow** (reference examples already in the file):
- §2.3.5 TitleBar — good short-file template
- §2.3.6 StatusBar — another short template
- §2.3.9 EliminatedView — medium template, shows how to handle Tier 1 retheme copy edits
- §2.3.14 player-hardening.css — global CSS template
- §2.6 BottomSheet.module.css — cross-view template

Each has: `**Current problems**:` → `**Rewritten file content**:` (complete CSS in markdown code fence) → `**Acceptance for this file**:` (checkbox list).

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

#### ▶ Then: Phases 3, 4, 5 (one per session per `feedback-stop-after-every-phase.md`)

After Phase 2 complete:
- **Phase 3** — board view migration. 11 `.module.css` files. Kill the `@media (min-width: 1280px)` hard-pixel doubling (6 files affected), fix GameTable's `3vh 4vw` axis mix, resolve `feltBranding` Tier 1 retheme, unify Lobby's green gradient with GameTable's teal-charcoal palette. Phase 3 also owns `MinimalCard.module.css`, `GameOver.module.css`, `DramaOverlay.module.css` (all cross-view).
- **Phase 4** — motion consolidation. 22 Framer Motion transition sites + 2 GSAP call sites (`PlayerRing.tsx:55-57`, `DramaOverlay.tsx:123-128`) + 15 CSS `@keyframes` durations + 13 CSS `transition` declarations. All consume motion tokens. `motion-token-sync.test.ts` ensures TS ↔ CSS drift detection.
- **Phase 5** — verification & acceptance. Real iOS 26 device test (`position: fixed` regression is a known landmine per Agent C research), Playwright viewport regression matrix across phone + board brackets, 200% browser zoom WCAG 1.4.4 test, CVD CI gates, WCAG+APCA dual contrast tests, §8.6 full game loop, §8.7 first-time-player test prep.

#### ▶ Then: `/deepen-plan` all 5 phases sequentially

Per `feedback-no-execute-until-plans-complete.md`: **do NOT begin `/ce:work` until all 5 phases are deepened and cross-phase contradictions resolved.** Deepening is where Phase 2's Phase-1 cross-phase flags (see below) get resolved.

**Workflow rules that MUST be honored (from memory)**:
- `feedback-stop-after-every-phase.md` — write ONE phase file, stop for Briggsy's review, then next. Do NOT batch phases in one turn.
- `feedback-plans-are-baking-recipes.md` — plans have actual values and actual code; execution is mechanical.
- `feedback-no-execute-until-plans-complete.md` — deepen ALL, THEN execute.

#### Cross-phase tokens flagged during Phase 2 draft (add to Phase 1 during deepening)

- `--color-bg-overlay-light` (60% alpha) — needed by `ConnectionOverlay.module.css` and `BottomSheet.module.css`
- `--color-bg-overlay-heavy` (85% alpha, aliases current `--color-bg-overlay`)
- `--size-card-detail-max` (max-width for CardDetailSheet modal)

#### Pending decisions for Phase 1 visual review (during `/ce:work` Phase 1 execution)

- **Baveuse font evaluation** — Baveuse (Ray Larabie / Typodermic Fonts, ~$30) is verified Archer title font per Neal Holman / Art of the Title May 2016. Phase 1 starts with Clash Display already loaded via `--font-display`. If Phase 1 visual review against Dreamland reference stills fails the §2.2 Archer test, switch to Baveuse — one-line token value change. Decision gate is visual review during `/ce:work` Phase 1, not plan-time.
- **Order *The Art of Archer* book** — Neal Holman, Dey Street / HarperCollins, 2016, ISBN 978-0062441010. $15–25 on Amazon. Not a blocker; if it arrives before Phase 1 palette lock, cross-reference against frame-extracted hex values. **Claude cannot place the order — action item for Briggsy or Harry.**

### 2. Tier 1 retheme gaps (§6.4 in spec — BLOCKS visual lock)

**Partially resolved in plan drafts. Still needs `/ce:work` execution to land in source.**

- ✅ **RESOLVED IN PHASE 2 DRAFT** (§2.3.9a): `src/client/player/EliminatedView.tsx:45` — title changed to **`"You're Burned."`** (was `"You Exploded!"`).
- ✅ **RESOLVED IN PHASE 2 DRAFT** (§2.3.9a): `src/client/player/EliminatedView.tsx:8-17` — flavor pool updated to 9 lines with phrasing beat. Kept 3 originals, reworded 1 (dropped "BOOM"), added 4 Archer-tone replacements, added 1 phrasing beat (*"Penetrated by enemy assets. ...Phrasing."*). Final pool lives in Phase 2 §2.3.9a.
- ⏳ **DEFERRED TO PHASE 3 (not yet drafted)**: `src/client/board/GameTable.tsx:24` — audit `feltBranding` element, replace with Archer/Pendleton-era decorative element. Board view = Phase 3's responsibility.

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
