# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10). Spec itself is frozen; only §8 Acceptance Criteria checkboxes get updated as work lands.
- **167/167 tests, typecheck clean** (verified 2026-04-11).
- **Game is functional** — staging, hand, board, all card types, nope chains, elimination all working.
- **Visual layer is FRAGILE** — see `docs/post-mortems/VISUAL-LAYER-AUTOPSY.md`. **Rebuild IS NOW IN PROGRESS** — `docs/plans/css-foundation-rebuild/`.
- **CSS Foundation Rebuild Plan is FULLY DRAFTED + PHASES 1-3 DEEPENED** — roadmap + all 5 phase files COMPLETE (2026-04-11). **Phase 1 deepened 2026-04-11 via 12-agent pass** (commit `ba6f18ce`). **Phase 2 deepened 2026-04-11 via 8-agent pass** (~80 prescriptive fixes, 2235→3200 lines). **Phase 3 deepened 2026-04-12 via 8-agent pass** (5 blocker fixes, 114 color-mix srgb→oklab corrections, 13 ease-token renames, @layer wrapping rule, WCAG contrast fixes, DrawPile drop-shadow perf fix, 22 new Phase 1 tokens + 3 amendments; 2753→2895 lines). Phases 4-5 still need deepening. See step 1 below.
- **Dreamland S8 is the palette reference season** (Holman's stated favorite; warm cocktail-lounge mid-century). 18 reference frames at `docs/plans/css-foundation-rebuild/dreamland-reference/images/`; fair-use posture documented in `dreamland-reference/README.md`. Palette extracted into Phase 1 §2.2 (74 Dreamland-sourced color primitives).
- **Saul Bass is VERIFIED, not a hallucination** (corrected 2026-04-11) — Neal Holman primary source at Art of the Title May 2016. See `feedback-hallucinated-references.md` in memory for correction detail. Adjacent verified influences: Jack Kirby, Steve Ditko, Mad Men, 1960 Bond, OSS 117, Pink Panther, mid-century furniture, deliberate anachronism (all sourced to Holman / Adam Reed / Salon / A.V. Club).
- **Phrasing! is a cross-phase design goal** — running gag across all phases, target cadence 3-5 distinct beats. See `roadmap.md` §3.6. Phase 2 committed beat: EliminatedView flavor line #9 (*"Penetrated by enemy assets. ...Phrasing."*).
- **CLAUDE.md has "The Contract" section** pointing at the spec. Key sections Claude should know by heart: §2 Quality Bar, §3 Visual Reference, §3.4 Form Factors, §7 ADRs, §8 Acceptance Criteria.

## Next Steps (in priority order)

### 1. CSS Foundation Rebuild Plan (DRAFTING COMPLETE — awaiting deepening 2026-04-11)

**Plan directory**: `docs/plans/css-foundation-rebuild/`

| File | Status | Notes |
|---|---|---|
| `roadmap.md` | ✅ **COMPLETE** | Parent doc: research, decisions, token taxonomy, phase structure. Includes §3.6 "Recurring design motifs" — phrasing as cross-phase gag. |
| `phase-1-foundation.md` | ✅ **DEEPENED 2026-04-11** (commit `ba6f18ce`) | 2164 lines. 12-agent parallel deepening pass landed: 7 blocker code corrections, 6 new subsections (§2.9-§2.14 — reduced-motion dual-family, `@property`, `@layer`, safe-area, font loading, lint rules), 8 cross-phase token resolutions, 4 ATC decisions locked (codegen palette, drop `--motion-duration-instant`, raise `--text-body` floor 14→15px, keep neon 2-spot). See §Enhancement Summary at top of file for full delta. |
| `phase-2-phone-view-migration.md` | ✅ **DEEPENED 2026-04-11** | 3200 lines. 8-agent parallel deepening pass: 5 position:fixed→absolute migrations, 14 `@layer components` wrappers (empirically verified), 6 essential-motion token swaps, 6 safe-area migrations, 4 new TSX class-rename cascade sections (§§2.3.4b, 2.3.5b, 2.3.6b, 2.3.9b), BottomSheet§2.6 corrected (no structural rewrite needed, CSS-only fix), §2.7 expanded to 6 consumer-site `theme.ts` boundary edits, WCAG touch-target fix, NopeButton confirmed orphaned. 7 Phase 1 follow-up items locked. See §Enhancement Summary at top of file. |
| `phase-3-board-view-migration.md` | ✅ **DEEPENED 2026-04-12** | 2895 lines. 8-agent parallel deepening pass: 5 blocker corrections (114× color-mix srgb→oklab, 13× --motion-ease-standard→base, @layer wrapping rule added, 3 WCAG contrast fixes, DrawPile drop-shadow perf split), container-type strategy corrected (phone=inline-size, board=size), forced-colors blocks added to 2 CTAs, +0rem WCAG trick on 7 cqi clamps, per-role --color-fg-on-* tokens, 3 dead token proposals pruned (27→22 new + 3 amendments). See §Enhancement Summary at top of file. |
| `phase-4-motion-consolidation.md` | ✅ **COMPLETE** | ~1400 LOC. 24 FM TSX sites + 3 GSAP tweens + 4 CSS surgical edits + PlayerRing TSX↔CSS measurement-div resolution + `animation-config.ts` deletion. Five audit corrections vs. roadmap documented in §1.1 (real counts: 24 FM, 2 GSAP files/3 tweens, 4 CSS keyframe stragglers, 0 CSS transition edits). Ready for `/deepen-plan`. |
| `phase-5-verification-acceptance.md` | ✅ **COMPLETE** | ~1990 LOC. 8 verification-type subsections (§2.1–§2.8) organized around the TODO block: iOS 26 real-device protocol + conditional `useIOSFixedFallback` hook, 176-baseline Playwright visual regression matrix (30 phone × 4 vp + 14 board × 4 vp), WCAG 1.4.4 200% zoom protocol, 36-pair CVD expansion, 31-pair WCAG+APCA contrast expansion, §8.6 full-loop protocol w/ dev-only `handleStackDeck` endpoint, §8.7 first-time-player protocol, documentation pass. §2.2.5 visual review lands the 3 pending decisions (winner glow, emerald saturation, Baveuse). Ready for `/deepen-plan`. |

#### ▶ FIRST ACTION NEXT SESSION

```
/deepen-plan phase 4
```

Phases 1-3 are DEEPENED. Phase 4 is next (~1920 lines, smallest remaining). Phase 3 deepening surfaced 22 new Phase 1 tokens + 3 amendments (see §7 in Phase 3 plan) — these accumulate until the cross-phase sweep step 6 below.

**Deepen one phase per session, in order, with review pauses between each** (per `feedback-stop-after-every-phase.md` — the rule applies to deepening the same way it applied to drafting):

1. ✅ **`/deepen-plan docs/plans/css-foundation-rebuild/phase-1-foundation.md`** — DONE 2026-04-11, commit `ba6f18ce`
2. ✅ **`/deepen-plan docs/plans/css-foundation-rebuild/phase-2-phone-view-migration.md`** — DONE 2026-04-11, 8-agent pass, ~80 fixes
3. ✅ **`/deepen-plan docs/plans/css-foundation-rebuild/phase-3-board-view-migration.md`** — DONE 2026-04-12, 8-agent pass, 5 blockers fixed, 2753→2895 lines
4. `/deepen-plan docs/plans/css-foundation-rebuild/phase-4-motion-consolidation.md` ← **next session starts here**
5. `/deepen-plan docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md`
6. **Phase 1 follow-up sweep** — after Phases 2-5 are deepened, re-edit `phase-1-foundation.md` to fold in every remaining cross-phase token request the original deepening didn't catch. (See "STILL OPEN" lists below — many tokens from the Phase 3 27-token flag list were not resolved in the Phase 1 deepening and will surface again.)
7. **Cross-phase contradiction sweep** — final reconciliation across all 5 deepened phases. Any place Phase N's deepening introduces a token or constraint that contradicts what Phase M assumed → fix in one place, not both.
8. **THEN** — `/ce:work docs/plans/css-foundation-rebuild/phase-1-foundation.md` (execution begins).

**Do NOT begin `/ce:work` until all 5 phases are deepened and cross-phase contradictions resolved.**

**Workflow rules that MUST be honored (from memory)**:
- `feedback-stop-after-every-phase.md` — deepen ONE phase per session, stop for Briggsy's review, then next. Do NOT batch phases in one turn.
- `feedback-plans-are-baking-recipes.md` — plans have actual values and actual code; execution is mechanical. Deepening adds MORE detail, not less.
- `feedback-no-execute-until-plans-complete.md` — deepen ALL, THEN execute.
- `feedback-wait-for-all-agents.md` — `/deepen-plan` spawns parallel research agents. Wait for ALL of them to report back before beginning synthesis.
- `feedback-sequential-thinking-always.md` — after parallel agents return, use Sequential Thinking for the synthesis pass.

#### Phase 1 deepening outcomes (2026-04-11, commit `ba6f18ce`)

**Read this before starting Phase 2 deepening.** The Phase 1 deepening landed structural changes that Phase 2+ inherits automatically but which are NOT in the Phase 2 draft text yet. The Phase 2 deepening pass will surface these as "the draft references X but Phase 1 now has Y" contradictions — that's expected, resolve in Phase 2's deepened output.

**What's now locked in Phase 1** (full detail in `phase-1-foundation.md` §Enhancement Summary):

- **New subsections §2.9-§2.14 that Phase 2-5 must obey:**
  - **§2.9** Reduced-motion dual-family tokens: `--motion-duration-essential-pulse/-spin/-flash` survive `@media (prefers-reduced-motion: reduce)`. Gameplay-signal animations (turn-indicator, loading spinner, Nope/Intercept/Burned flash) MUST use these, not the decorative durations that zero out.
  - **§2.10** `@property` declarations for every `--color-*` and `--motion-duration-*`. Phase 2+ authors adding a new token must also add its `@property` registration with byte-matching `initial-value`.
  - **§2.11** `@layer primitives, semantics, semantics-phone, semantics-board, components, overrides;` cascade ordering. **Every Phase 2+ `.module.css` file wraps its content in `@layer components { ... }`.** Phase 2 draft doesn't mention `@layer` — deepening must add it.
  - **§2.12** Safe-area tokens (`--inset-top/-bottom/-left/-right`, `--size-viewport-safe`) + `viewport-fit=cover, interactive-widget=resizes-content` meta tag. Phase 2 phone-root rewrites must use `min-height: var(--size-viewport-safe)`, not raw `100svh`.
  - **§2.13** Clash Display `@font-face` with `font-display: optional` + single-weight preload. Phase 2+ doesn't need to touch fonts (Phase 1 owns them), but the `--font-display` token is locked as Clash Display until Baveuse decision gate during `/ce:work` Phase 1 visual review.
  - **§2.14** Six CI lint rules enforced on `pnpm lint`:
    1. Ban custom-property DEFINITIONS (`--color-*`, `--space-*`, `--motion-*`, `--text-*`, `--size-*`, `--radius-*`, `--shadow-*`, `--z-*`, `--inset-*`) inside any `.module.css` — tokens live only in `src/client/shared/tokens/`.
    2. Ban `@keyframes` / `animation:` declarations with hardcoded `Ns`/`Nms` durations — must use `var(--motion-duration-*)`.
    3. Ban `position: fixed` in `src/client/player/**/*.module.css` — use `position: sticky` inside a flex column (WebKit bug 297779).
    4. Ban `dvh`/`vh` in `semantic.phone.css` (phone is `svh`-only).
    5. Ban `color-mix(in oklch, ...)` anywhere (Safari live bug, use `in oklab`).
    6. Ban `--color-accent-neon` in combination with `:hover`/`:focus`/`:active`/`:disabled` pseudo-classes (spot color, not a scale).

- **ATC decisions locked (do not re-litigate):**
  - **Decision 1 — codegen palette.** `scripts/generate-palette.ts` reads `primitives.css`, emits `src/client/shared/tokens/palette.generated.ts`. Hooks: `predev`, `prebuild`, `pretest`. `.gitignore` excludes the generated file. `palette-sync.test.ts` DELETED — drift is structurally impossible. Tests import from `./palette.generated`, NOT `./palette`.
  - **Decision 2 — `--motion-duration-instant` DROPPED.** YAGNI — no Phase 2-5 consumer. Phase 2+ code that was going to reference `fast/instant` distinctions only uses `fast` now. If Phase 4's motion literal audit surfaces a real sub-fast need, it re-adds the token then.
  - **Decision 3 — `--text-body` floor 14 px → 15 px.** Every `--text-body` consumer in Phase 2 gets a free 1 px bump. Clamp formula: `clamp(0.9375rem, calc(0.9375rem + (100svh - 667px) * (3/699)), 1.125rem)`.
  - **Decision 4 — neon 2-spot pattern locked.** `--color-neon-magenta` + `--color-neon-magenta-glow`. Lint Rule 6 enforces no pseudo-class combos.

- **Renames Phase 2 draft needs to absorb:**
  - `--color-rose-neon*` → `--color-neon-magenta*` (primitives); `--color-accent-neon*` unchanged (semantic pointer updated to point at new name)
  - `--motion-ease-standard` → `--motion-ease-base`; `MOTION_EASINGS.standard` → `MOTION_EASINGS.base`
  - `--radius-pill` DELETED — consumers use `--radius-full` directly
  - `--z-max` DELETED — `--z-toast: 3000` is the ceiling
  - `--text-micro` DELETED — merged into `--text-caption`
  - `--size-card-width` / `--size-card-height` in phone file → `--size-phone-card-width` / `--size-phone-card-height`
  - `--size-card-width` / `--size-card-height` in board file → `--size-board-card-width` / `--size-board-card-height`

- **New Phase 1 execution steps Phase 2 inherits downstream consequences from:**
  - **Step 8a cardAccent migration** (BEFORE step 16 theme.ts delete): `theme.ts:cardAccent()` moves to `palette.ts` or new `card-accents.ts`. `MinimalCard.tsx:28` and `FuturePeek.tsx:70` imports updated. This is CRITICAL — step 16 theme.ts delete will compile-break if 8a is skipped.
  - **Step 16a orphan `[data-theme="light"]` cleanup**: grep-delete every `[data-theme="light"]` selector block from 11 verified `.module.css` files before step 16 deletes `theme.ts`. These selectors become dead code the moment `theme.ts` goes and are landmines if anyone ever forces `data-theme="light"` at runtime.

- **Cross-phase tokens the Phase 1 deepening RESOLVED** (marked ✅ below in the phase-specific lists). 8 resolved: `--size-card-detail-max`, `--space-fluid-base-board`, `--space-fluid-loose-board`, `--text-hero-subdued`, `--size-player-panel-width`, `--size-player-panel-height`, `--motion-duration-ambient`, `--motion-duration-dots`.

- **Cross-phase tokens the Phase 1 deepening DID NOT RESOLVE** (STILL OPEN below). The cross-phase scan agent I ran during Phase 1 deepening flagged the 8 above but missed the Phase 3 draft's larger 27-token flag list. Phase 2-5 deepening will surface them; follow-up sweep step 6 folds them in.

**Phase 5 draft notes for the /deepen-plan agents** (areas flagged by the drafter for extra attention):
- **Baseline storage footprint** (Phase 5 §5 landmine 4) — 176 PNGs × ~400KB ≈ 70MB committed to git. Phase 5 hedges with Git LFS as a fallback. Deepening should decide: bake LFS in proactively, or keep the hedge and pay the cost. If repo goes public (`TODO.md` Landmines), LFS is cleaner.
- **Dev-only fixture endpoints** (Phase 5 §2.2.4 + §2.6.5) — `src/server/test-fixtures.ts` adds `handleFixtureSeed` + `handleStackDeck`, double-gated by `import.meta.env.PROD` check AND router-level `import.meta.env.DEV` registration. Deepening should verify Vite 8 tree-shakes the router branch correctly in production — context7 check on Vite's `import.meta.env` tree-shaking guarantees.
- **iOS 26 fallback is conditional** (Phase 5 §2.1.5) — `useIOSFixedFallback` hook authored but only lands if §2.1 real-device test surfaces regression. Deepening may want to cross-reference the `parseIOSMajor` regex against actual iOS 26.x UA strings gathered from WebKit bug tracker, and decide whether to elevate the fallback to unconditional.
- **APCA Lc floor semantics** (Phase 5 §5 landmine 10) — "APCA Lc ≥60 on body text" applies per-row, not globally. Muted text intentionally gets Lc 45. Future re-readers can misread this. Deepening should verify the per-row minimums in the test file match the TODO's intent.

#### Cross-phase tokens flagged during Phase 2 draft — ALL RESOLVED in Phase 2 deepening

- ✅ **RESOLVED** — `--color-bg-overlay-light` (60% alpha) + `--color-bg-overlay-heavy` (85% alpha) — formulas locked in Phase 2 §7. Phase 1 follow-up sweep adds both to `semantic.css`, replacing the single `--color-bg-overlay`. Both reach `--color-shadow-base` for future light-mode retheme.
- ✅ **RESOLVED** — `--size-content-narrow` — formula `clamp(280px, calc(280px + (100svh - 667px) * (40 / 699)), 320px)`. SUPERSEDES `--size-card-detail-max` (Phase 1's first deepening had a 280→400 single-consumer version; Phase 2 deepening unified 5 consumers and narrowed the ceiling to 320). Phase 1 follow-up sweep replaces the old token.
- ✅ **RESOLVED** — Phase 1 follow-up sweep adds `html, body { position: relative; height: var(--size-viewport-safe); overflow: hidden }` + `#root { position: relative; height: 100% }` positioning contract to `semantic.phone.css` §2.12 — enables the 5-site `position: absolute`-against-root migration.
- ✅ **RESOLVED** — `card-accents.ts` locked as definitive `cardAccent` migration target (NOT `palette.ts` — codegen-reserved per Decision 1). Phase 1 follow-up removes the "or palette.ts" ambiguity.
- ⏳ **DEFERRED TO VISUAL REVIEW** — `--radius-input` and `--radius-button` semantic aliases (both = `--radius-sm` = 4px). Decision deferred to `/ce:work` Phase 1 visual review against Dreamland reference stills.

#### Cross-phase tokens flagged during Phase 3 — DEEPENED 2026-04-12

See `phase-3-board-view-migration.md` §7 (corrected in deepening) for the full list. Original draft proposed 27 tokens; deepening pruned 3 dead proposals and clarified all decisions. **Final: 22 new Phase 1 tokens + 3 range amendments = 25 Phase 1 changes.** Phase 1 deepening already resolved 5; **17 new + 3 amendments remain for Phase 1 follow-up sweep step 6.**

**Resolved ✅ by Phase 1 deepening (5):**
- ✅ `--space-fluid-base-board` — exists in §2.5 (needs AMENDMENT: max 32→40px per Phase 3 deepening)
- ✅ `--space-fluid-loose-board` — exists in §2.5 (needs AMENDMENT: max 64→80px per Phase 3 deepening)
- ✅ `--size-player-panel-width` — exists in §2.5 (needs AMENDMENT: min 160→180px per Phase 3 deepening)
- ✅ `--motion-duration-ambient` (4000ms) — exact match, no amendment needed
- ✅ `--text-hero-subdued` — exists but NOT a Phase 3 dependency (DramaOverlay uses cqi-based split tokens instead; hero-subdued is vw-based board-only, stays for future consumers)

**Pruned ✗ by Phase 3 deepening (3 dead proposals deleted):**
- ✗ `--space-fluid-tight-board` — never consumed by any Phase 3 CSS
- ✗ `--text-micro-board` — never consumed + name conflicts with deleted `--text-micro`
- ✗ `--text-callout-board` — never consumed by any Phase 3 CSS

**Still need Phase 1 follow-up ❌ (17 new + 3 amendments):**
- ❌ `--text-caption-board` (8 consumers across 5 files — the most-needed missing token)
- ❌ 6 board sizing tokens: `--size-lobby-roster-max-width`, `--size-title-accent-width`, `--size-rankings-max-width`, `--size-felt-reticle`, `--size-felt-diamond`, `--size-discard-card-width`
- ❌ `--size-draw-pile-width` AMENDMENT: expand 80→160 to 120→240
- ❌ 8 MinimalCard text-clamp tokens: `--text-card-name-{min,max,large-min,large-max}`, `--text-card-desc-{min,max,large-min,large-max}`
- ❌ 6 DramaOverlay text-clamp tokens: `--text-drama-{hero,subdued,victory}-{min,max}` (cqi-based min/max pairs, architecturally different from `--text-hero-subdued`)
- ❌ `--motion-duration-pulse` (1400ms, **decorative** — zeros under reduced-motion). SEPARATE from `--motion-duration-essential-pulse` (same value, essential, survives). Both tokens needed.
- ❌ `--motion-duration-pulse-slow` (2500ms, decorative)

**Key Phase 3 deepening decisions locked:**
- `color-mix(in oklab, ...)` everywhere — 114 srgb→oklab corrections (Phase 1 §4.2 ban enforced)
- `--motion-ease-base` everywhere — 13 corrections (Phase 1 rename #19)
- `@layer components { ... }` wrapping — new universal rule #13 for all 14 CSS files
- Phone entry uses `container-type: inline-size` (not `size`) — `100cqb` falls back to `100svh` correctly
- `--motion-duration-pulse` ≠ `--motion-duration-essential-pulse` — two tokens, same value, different reduced-motion behavior
- DrawPile breathing: static `drop-shadow` + opacity-animated `::after` pseudo (perf fix)
- WCAG fixes: pileLabel→`--color-fg-muted`, empty→`--color-fg-disabled`, devLink bumped 60→80%
- `card-accents.ts` (not `palette.ts`) — all references corrected
- Phase 5 data-URI hex drift CI check flagged as missing from Phase 5 draft

**Pending decisions for Phase 5 visual review** (during `/ce:work` Phase 5 execution):
- **GameOver winner glow hue** — Phase 3 §2.5 locks the winner-text glow to `--color-accent-drama` (ochre-9 amber). If visual review prefers cooler, the alternative is `--color-accent-intercept` (emerald-9 forest green). Decision gate is visual review, not plan-time.
- **NopeCountdownBar + DramaOverlay.intercepted emerald saturation** — Phase 3 §2.3.9 and §2.6 both shift from cool cyan to muted emerald-9. If the countdown bar feels too subtle during the intercept window at large viewports, bump to emerald-8 or emerald-10 after the CVD CI gate confirms the contrast stays legal.

#### Cross-phase tokens flagged during Phase 4 draft (fully resolved in Phase 1 deepening)

See `phase-4-motion-consolidation.md` §7 for full rationale. All 3 items resolved or acknowledged:
- ✅ **`--motion-duration-dots` (1500ms) + `MOTION_DURATIONS.dots`** — Phase 1 deepening picked **Option A** (add to the scale). Added to §2.2 as `--motion-duration-dots: 1500ms` and to §2.6 `motion.ts` as `MOTION_DURATIONS.dots: 1.5`. Phase 4 §2.5.4 reference is consistent.
- ✅ **`--size-player-panel-height`** — added to §2.5 as `clamp(90px, calc(90px + (100vw - 1280px) * (57/2560)), 147px)` (roughly 4:7 panel ratio). Pair with `--size-player-panel-width` complete.
- 🕐 **`BOARD_BREAKPOINTS` TS export (non-blocking)** — still deferred. Phase 4 still deletes PlayerRing's inline breakpoint conditionals without reintroducing them. Flagged for Phase 5 or later.

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
