---
title: "Phase 5 — Verification & Acceptance"
type: test
phase: 5
parent: docs/plans/css-foundation-rebuild/roadmap.md
depends_on: docs/plans/css-foundation-rebuild/phase-1-foundation.md
also_depends_on:
  - docs/plans/css-foundation-rebuild/phase-2-phone-view-migration.md
  - docs/plans/css-foundation-rebuild/phase-3-board-view-migration.md
  - docs/plans/css-foundation-rebuild/phase-4-motion-consolidation.md
date: 2026-04-11
status: deepened
---

## Enhancement Summary

**Deepened on:** 2026-04-12
**Agents used:** 8-agent parallel pass (Playwright framework-docs-researcher, Vite framework-docs-researcher, iOS 26 best-practices-researcher, APCA+culori best-practices-researcher, architecture-strategist, security-sentinel, performance-oracle, kieran-typescript-reviewer, spec-flow-analyzer)
**Lines before deepening:** 1992
**Agent consensus:** 9 blocker corrections, 23 significant improvements. Triple-confirmed findings on Wrangler import.meta.env (3 agents), double-confirmed on culori API (2 agents), quadruple-confirmed on scroll handler perf (4 agents). Zero contradictions between agents.

### Blocker Corrections (9)

1. **B1 §2.1.5 — iOS 26 UA regex completely broken.** iOS 26 froze `iPhone OS` at `18_6` in the UA string (privacy/anti-fingerprinting). The regex returns `18`, never `26`. The hook NEVER activates on the devices it targets. Fix: use `Version/` token (which correctly says `26.0`), add iPad detection via `navigator.maxTouchPoints > 1`, narrow scope to 26.0 only (26.1 fixed the bug per WebKit bug 297779 + Safari 26.1 release notes). Full corrected code in §2.1.5.
2. **B2 §2.6.5 — `import.meta.env.PROD`/`.DEV` don't work in Wrangler server build.** Server code is bundled by Wrangler (esbuild), NOT Vite. `import.meta.env` is a Vite-specific compile-time constant. Both fixture endpoint security gates use the same broken mechanism — NOT true defense-in-depth. Fix: add `define` to `wrangler.jsonc` for build-time replacement + add runtime `env.ENVIRONMENT` check as independent second gate. Full corrected approach in §2.6.5.
3. **B3 §2.2.4 — Fixture endpoint architecture conflates worker-level fetch with DO internals.** `handleFixtureSeed(request, state)` signature assumes direct `DurableObjectState` access from the HTTP handler, but the worker entry point has `env.GameRoom` (the namespace), not a DO instance's storage. Storage key `room:${body.room}` doesn't match the DO's actual keys (`gameState`, `playerSessions`, etc.). Fix: worker-level fetch intercepts `/__test/*` → gets DO stub via `env.GameRoom.get(env.GameRoom.idFromName(roomName))` → forwards seed request to DO. Full corrected architecture in §2.2.4.
4. **B4 §2.4.2 — culori `filter()` API doesn't exist.** The correct exports are `filterDeficiencyDeuter(1)`, `filterDeficiencyProt(1)`, `filterDeficiencyTrit(1)`. The import `{ filter } from 'culori'` will fail at build time. Corrected code in §2.4.2.
5. **B5 §2.5.2 — `sRGBtoY(parse(...))` type incompatible.** apca-w3's `sRGBtoY` expects `[R, G, B]` as 0-255 integers, not culori's `{ r, g, b, mode }` as 0-1 floats. Passing a culori object produces silently wrong luminance values. Fix: convert via `[Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)]` or use `colorParsley` (apca-w3 companion). Corrected code in §2.5.2.
6. **B6 §2.2.2 — Spec vs plan viewport mismatch.** Spec §8.1 says iPhone 14 (390×844) + iPad 10.9" (820×1180). Plan says iPhone 15 (393×852) + iPad mini (744×1133). Board also diverges: spec 1280×720 vs plan 1280×800; plan adds 2560×1440. Fix: amend spec §8.1/§8.2 viewport lists to the plan's values during the Phase 5 documentation pass (§2.8.1), documenting the rationale (iPhone 15 is 2024's representative modern phone; iPad mini is a stricter floor). Reconciliation note in §2.2.2.
7. **B7 §2.2.1 — Cross-browser CI strategy flawed.** Plan says webkit/firefox "regenerate fresh and self-compare." Playwright does NOT work this way — missing baselines cause a failure, not self-comparison. Fix: limit `toHaveScreenshot()` assertions to chromium-only projects; run webkit/firefox as functional smoke tests (no screenshot assertions). Cross-browser note in §2.2.1.
8. **B8 §2.2.1 — `deviceScaleFactor` and `scale: 'device'` missing.** Plan specifies DPR 2/3 in viewport tables but code doesn't pass `deviceScaleFactor` to `test.use()` or `scale: 'device'` to `toHaveScreenshot` config. Without these, DPR has zero effect on screenshot dimensions. Fix: add `dpr` field to VIEWPORTS, pass as `deviceScaleFactor` in `test.use()`, add `scale: 'device'` to config. Corrected in §2.2.1 + §2.2.4.
9. **B9 §2.6.2 — Game loop script inconsistencies.** Beat 14: can't play Burned from hand (Burned cards are drawn, not played — standard EK rules). Beat 12: mid-sentence correction leaves script ambiguous. Beat 2: Shuffle invalidates the stacked deck. Missing: 5-card combo (spec §8.6 requires it). Fix: rewrite beats 12–17 with fully traced hand state, move Shuffle to late-game, redesign Beat 14 as an Intercept chain triggered by Surveillance, add 5-card combo beat. Corrected script in §2.6.2.

### New Subsections Added (3)

- **§2.2.7 Animation stability + reduced-motion verification** — Playwright `animations: 'disabled'` strategy + 5-screen `reducedMotion: 'reduce'` pass.
- **§2.8.4 expansion** — `console.log` added to grep sweep list.
- **§5 Landmines 13–17** — five new landmines from agent findings.

### Significant Improvements Incorporated (23)

- §2.1.5: Scroll handler cached dimensions + rAF throttling (4 agents flagged forced reflow). `useMemo` → module-level constant. Hardcoded `24` → `getComputedStyle` read. iPad detection via `maxTouchPoints`. iOS 26.0 only (not all 26.x). In-app browser two-pass UA parsing.
- §2.2.1: `stylePath` for focus ring suppression (primary, not fallback). `name` fields on webServer entries. Playwright `workers` configuration for CI memory.
- §2.2.3: Protocol Mismatch + No Room Code screens added (2 missing screens × 4 viewports = 8 baselines).
- §2.2.4: Zod validation on fixture request bodies. `locator().waitFor()` replacing deprecated `waitForSelector`. `satisfies GameState` on all fixtures (no type casts). DO room cleanup in `globalTeardown`.
- §2.2.5: Baseline PNG optimization via `optipng -o7` (20-40% size reduction).
- §2.4.2: `differenceEuclidean('oklch')` → `'oklab'` (hue angle wrapping makes oklch Euclidean unreliable). `parse()` null guards.
- §2.5.2: `Math.abs(APCAcontrast(...))` comment explaining signed Lc semantics.
- §2.8.1: Dark-mode-only verification noted in spec §8.1/§8.2 checkbox language.
- §2.8.3: Bundle estimate corrected to +450–500 bytes (not +380). Module-level singleton added as first triage step.
- §3: CVD re-run note after Step 10 visual review. Production bundle grep step after `pnpm build`.
- §5: Landmine 13 (iOS 26 UA freeze), Landmine 14 (Wrangler define config), Landmine 15 (animation flakiness), Landmine 16 (first-time player recruitment timeout — 14-day provisional pass clause), Landmine 17 (Playwright sharding escape hatch).

### ATC Decisions Required (1)

- **Viewport list reconciliation (B6):** The plan's viewports are arguably better than the spec's (iPhone 15 is more current than iPhone 14; iPad mini is a stricter floor than iPad 10.9"). Recommendation: amend the spec's §8.1/§8.2 lists during the Phase 5 documentation pass. Briggsy to confirm.

---

# Phase 5 — Verification & Acceptance

**Parent**: [`roadmap.md`](./roadmap.md) §7 Phase 5
**Depends on**: Phases 1, 2, 3, and 4 all landed, merged to `main`, and green (`pnpm test` + `pnpm typecheck` + `pnpm lint` + `pnpm build` all clean before Phase 5 starts)

**Goal**. Prove the CSS Foundation Rebuild met the spec. Phase 5 is not implementation — it is the acceptance battery that converts the spec's `docs/specifications/PRODUCT-SPECIFICATION.md` §8 checkboxes from empty to checked. The output of Phase 5 is a set of Playwright visual regression specs, expanded CVD and contrast test pair lists, an iOS 26 real-device test protocol + conditional fallback, a scripted full-game-loop test procedure (§8.6), a first-time-player test protocol (§8.7), and a final documentation pass that updates `README.md`, `TODO.md`, and the spec's §8 acceptance checkboxes. Phase 5 is the last phase of the CSS Foundation Rebuild; its successful completion is the trigger for step 5 in `TODO.md` (Cloudflare deploy).

**Quality bar inherited**. `PRODUCT-SPECIFICATION.md` §2 Quality Bar — *"Could this look like a frame from an Archer episode?"* §2's acceptance test is the binary yes/no applied to every screen captured in §2.2 below. §8.7 is the same question asked of a first-time player without prompting — that is the final quality gate. Phase 5 is where "the rebuild met the bar" stops being an assertion and becomes a proved fact.

**Scope bar**. Phase 5 adds test files, test-plan documents, verification protocols, and documentation updates. It does NOT add component code, CSS, or motion tokens — those all belong to Phases 1–4. The one conditional exception is the iOS 26 fallback (§2.1.5), which only lands if §2.1 real-device testing surfaces a regression; the code is specified here but committed only if needed. Phase 5 also does NOT ship the Cloudflare deploy (that's a separate `TODO.md` step §5 that depends on Phase 5 passing).

**Reader orientation — how Phase 5 differs from Phases 1–4**:

- **No per-file rewrites**. Phases 1–4 produced code deliverables (token files, rewritten `.module.css`, migrated TSX transition props). Phase 5's deliverables are test files + verification protocols + doc updates.
- **Deliverable unit is a test, not a file edit**. Each §2.X subsection describes a test or protocol — what it checks, how it runs, what the acceptance threshold is, where the artifact lives.
- **External human required for §2.7**. The first-time player test needs a real first-time player. Phase 5 can do everything else autonomously; §2.7 blocks on Briggsy recruiting a friend. `TODO.md` already calls this out.
- **Visual review decisions land here**. Three pending decisions flagged by Phases 1, 3, and 4 are gated on Phase 5 visual review:
  1. **GameOver winner glow hue** — `--color-accent-drama` (Phase 3 §2.5 default) vs `--color-accent-intercept`. Decided by looking at the captured screenshot during §2.2 review.
  2. **NopeCountdownBar + DramaOverlay.intercepted emerald saturation** — emerald-9 (default) vs emerald-8 vs emerald-10. Decided by §2.2 captures of the NopeWindow and INTERCEPTED drama overlay.
  3. **Baveuse font purchase** — Clash Display (Phase 1 default) vs Baveuse. Decided by §2.2 captures of every screen that uses `--font-display` side-by-side with the Dreamland reference frames.
  All three decisions are *re-baseline events*: when the visual review lands them, the Playwright baselines regenerate and re-commit.
- **Block execution on Phases 1–4 being fully merged**. Phase 5 cannot start until Phases 1–4 are all `feat(css-foundation): Phase N complete` tagged and on `main`. §3 Step 1 is the gate.

---

## §1 — Inputs

Phase 5 inherits the outputs of every prior phase and the spec's acceptance surface:

- **Phase 1 outputs** (`docs/plans/css-foundation-rebuild/phase-1-foundation.md`):
  - `src/client/shared/tokens/` directory with `primitives.css`, `semantic.css`, `semantic.phone.css`, `semantic.board.css`, `motion.ts`, and `palette.ts` (the TS mirror that CVD + contrast tests import).
  - Three Vitest harness files seeded with starter pair lists: `__tests__/palette-cvd.test.ts`, `__tests__/palette-contrast.test.ts`, `__tests__/motion-token-sync.test.ts`. Phase 5 §2.4 and §2.5 **expand** the first two; §2.7 of Phase 1 **creates** them.
  - 74 Dreamland-sourced color primitives (`--color-{teal,ochre,cream,charcoal,cordovan,emerald}-{1..12}` + `--color-rose-neon{,-glow}`) + all semantic aliases + 18 Dreamland S8 reference frames at `docs/plans/css-foundation-rebuild/dreamland-reference/images/` (fair-use fan uploads, flagged for `.gitignore` before public repo — §2.8.5).
- **Phase 2 outputs** (`phase-2-phone-view-migration.md`): every `src/client/player/*.module.css` rewritten to consume tokens; `NopeButton` + `InterceptButton` deleted and consolidated into `FloatingActionButton`; `TurnBanner` deleted; `BottomSheet.module.css` `dvh → svh` fix; `EliminatedView.tsx` Tier 1 retheme (§2.3.9a).
- **Phase 3 outputs** (`phase-3-board-view-migration.md`): every `src/client/board/*.module.css` rewritten to consume tokens; `MinimalCard.module.css`, `GameOver.module.css`, `DramaOverlay.module.css` rewritten cross-view with `container-type` declarations; `GameTable.tsx:24` Tier 1 retheme (`feltBranding` comment → "The Pendleton Agency — war-room felt decoration").
- **Phase 4 outputs** (`phase-4-motion-consolidation.md`): every Framer Motion transition prop, every GSAP literal timing, every CSS `animation:` keyword consuming Phase 1 motion tokens; `src/client/shared/animation-config.ts` deleted; `PlayerRing.tsx` measurement-div pattern replacing hardcoded `panelW/panelH`.
- **Spec §8 acceptance criteria** (`docs/specifications/PRODUCT-SPECIFICATION.md`): the seven-section checklist (`§8.1` phone, `§8.2` board, `§8.3` docs, `§8.4` retheme, `§8.5` deploy, `§8.6` full game loop, `§8.7` first-time-player test). Phase 5 is the phase that drives §8.1, §8.2, §8.3 (partial), §8.4, §8.6, §8.7 to checked. §8.5 is deferred to `TODO.md` step 5.
- **Repository baseline**: `pnpm test` reports 167+ tests green (167 baseline from Phase 0 + any new tests Phases 1–4 added), `pnpm typecheck` clean, `pnpm lint` clean, `pnpm build` succeeds with phone entry ≤100KB gzipped. Phase 5 §3 Step 1 re-verifies all four before any work begins.
- **Known landmine: iOS 26 regression**. iOS 26.0 broke `position: fixed` and `position: sticky` in WebKit; iOS 26.1 partial fix. See `phase-2-phone-view-migration.md` §2.3.5 (TitleBar), §2.3.6 (StatusBar), §2.3.7 (FloatingActionButton); `phase-3-board-view-migration.md` §2.6 (DramaOverlay.overlay), §2.3.7 (AnnouncementFeed.feed). Five elements are at risk. §2.1 below is the real-device protocol that confirms or refutes regression.
- **Three pending visual-review decisions** flagged by earlier phases (TODO.md §1):
  1. GameOver winner glow hue (Phase 3 §2.5 → Phase 5)
  2. NopeCountdownBar emerald saturation (Phase 3 §2.3.9 + §2.6 → Phase 5)
  3. Baveuse font purchase decision (Phase 1 → Phase 5)

Phase 5 does NOT inherit from any phase that hasn't landed. Step 1 of §3 confirms all four prior phases are on `main`.

---

## §1.1 — Structural corrections (roadmap preview → TODO block)

The roadmap (`roadmap.md` §7 Phase 5) lists **seven scope items** and **nine acceptance criteria checkboxes**. The TODO.md `§1` "▶ FIRST ACTION NEXT SESSION" block for Phase 5 restructures the scope into **eight verification TYPEs** (§2.1 through §2.8) organized by the kind of verification rather than by the artifact produced. This section documents the reconciliation.

**Correction 1 — scope split by verification type, not acceptance item.** The roadmap's seven scope items map to the TODO's eight subsections as follows:

| Roadmap scope item (§7 Phase 5) | TODO §2.X subsection | Notes |
|---|---|---|
| Real-device iOS 26 testing | §2.1 | Expanded with explicit target-element list + conditional fallback strategy |
| Playwright visual regression matrix | §2.2 | Expanded with explicit viewport list + screen capture list + per-test config |
| 200% browser zoom test | §2.3 | Unchanged in intent, organized as its own subsection |
| CVD palette verification | §2.4 | Expanded from "runs in CI and is now populated with every critical pair" to explicit pair enumeration + MIN_DISTANCE locking |
| Contrast verification | §2.5 | Expanded from "WCAG 2.1 AA + APCA checks on every fg/bg pair" to explicit pair enumeration + APCA Lc ≥60 body-text floor |
| Full game loop test (§8.6) | §2.6 | Expanded to step-by-step script + expected outcomes + failure modes |
| First-time player test (§8.7) | §2.7 | Expanded to recruitment + setup + observation + pass/fail criteria + retry protocol |
| Documentation pass | §2.8 | Restructured into its own type, with explicit file list and edit kind per file |

Eight subsections total. The documentation pass was listed in the roadmap as a separate bullet but not numbered as its own acceptance item; the TODO treats it as §2.8 because it is the final deliverable that flips the spec's §8 checkboxes and updates consumer-facing docs.

**Correction 2 — three pending decisions land here, not in Phase 1/3/4.** The earlier phases authored the decision surface (GameOver winner glow hue, NopeCountdownBar emerald saturation, Baveuse font). They correctly deferred the decision to Phase 5 visual review because the decision requires looking at a rendered screen side-by-side with the Dreamland reference frames. §2.2.5 below is where the decisions are resolved during the visual review meeting.

**Correction 3 — iOS 26 fallback is conditional code, not unconditional.** The roadmap preview listed "confirm `position: fixed` works or has a documented fallback" as if the fallback was a deliverable. §2.1.5 clarifies: the fallback is **documented** unconditionally (a plan always has one), but **implemented** only if §2.1 real-device testing surfaces a regression on iOS 26.x. The fallback code + UA sniff + the commit in which it lands are specified in §2.1.5 so that if the test fails, execution is mechanical.

**Correction 4 — full game loop test (§2.6) authorship.** §2.6 is a **protocol**, not a Playwright automation. Automating a 5-player game loop requires five browser contexts + a scripted game engine + deterministic shuffling, which is out-of-scope for Phase 5 execution time. §2.6 is a human-run protocol that Briggsy executes with four test clients (four browser windows / phones) plus himself as the fifth player. The protocol includes expected outcomes and failure modes so Briggsy can pass/fail it without ambiguity.

**Correction 5 — "files edited" count for Phase 5 is small**. Phase 5's edit count is much smaller than Phases 2–4. The full file list:

- **Test files (new)**: 1 Playwright spec for phone, 1 Playwright spec for board, 1 Playwright config. `palette-cvd.test.ts` + `palette-contrast.test.ts` are expanded (edit, not new — Phase 1 creates them).
- **Test fixtures / helpers**: 1 `test/visual-regression/helpers/` directory with baseline storage conventions.
- **Test baselines (new, generated)**: ~60 PNG baseline files (exact count in §2.2.4).
- **Docs edited**: `README.md`, `TODO.md`, `docs/specifications/PRODUCT-SPECIFICATION.md` §8 checkboxes, `docs/plans/css-foundation-rebuild/roadmap.md` (if the Phase 5 results need any annotations). Optional `.gitignore` edit for `dreamland-reference/images/` (§2.8.5).
- **Conditional iOS 26 fallback (§2.1.5)**: one new file `src/client/shared/useIOSFixedFallback.ts` (~40 LOC) + five 2-line TSX conditional edits. **Only if §2.1 surfaces a regression.**

Bottom line: Phase 5's artifact footprint is ~10–15 files (mostly test + doc), + ~60 baseline images, + conditional fallback code. The **verification run** count is large (~60 visual-regression assertions + ~40 CVD pair assertions + ~30 contrast pair assertions + 1 full-game-loop protocol + 1 first-time-player protocol + 1 iOS 26 device protocol).

---

## §2 — Deliverables

### §2.0 Directory state after Phase 5

Phase 5 adds the following under `test/` (new top-level test directory for integration-grade tests that are not unit tests):

```
test/
├── visual-regression/
│   ├── phone.spec.ts           ← NEW Playwright spec for all phone screens
│   ├── board.spec.ts           ← NEW Playwright spec for all board screens
│   ├── helpers/
│   │   ├── fixtures.ts         ← NEW — seeded game state factories for deterministic renders
│   │   └── viewport-profiles.ts ← NEW — viewport list + device scale factors
│   └── baselines/
│       ├── phone/              ← NEW — ~40 PNG baselines
│       └── board/              ← NEW — ~20 PNG baselines
├── device-test/
│   └── ios-26-protocol.md      ← NEW — human-run real-device protocol + checklist
├── game-loop/
│   └── full-loop-protocol.md   ← NEW — §8.6 human-run protocol
├── first-player/
│   └── protocol.md             ← NEW — §8.7 recruitment + observation protocol
playwright.config.ts             ← NEW — Playwright runner config (separate from Vitest)
```

Existing files edited:

```
src/client/shared/tokens/__tests__/
├── palette-cvd.test.ts          ← EXPANDED (§2.4): pair list grows from 5 starter pairs to ~40 critical pairs
└── palette-contrast.test.ts     ← EXPANDED (§2.5): pair list grows from 5 starter pairs to ~30 semantic pairs

package.json                     ← EDITED — add `test:visual` script, add `@playwright/test` devDep
README.md                        ← EDITED — project status + bundle size report + test count
TODO.md                          ← EDITED — check off §1 completion, convert to maintenance backlog
docs/specifications/PRODUCT-SPECIFICATION.md  ← EDITED — §8.1/§8.2/§8.3/§8.4/§8.6/§8.7 checkboxes
.gitignore                       ← CONDITIONAL EDIT (§2.8.5) — add dreamland-reference/images/ if repo goes public
```

Conditional new files (only if §2.1 iOS 26 test surfaces regression):

```
src/client/shared/useIOSFixedFallback.ts   ← CONDITIONAL (§2.1.5) — UA sniff + scroll-sync hook
```

**Test file count**: 5 new files + 2 edited Vitest files + 1 new Playwright config = 8 test artifacts.
**Baseline image count**: ~60 PNG files under `test/visual-regression/baselines/`.
**Docs edited**: 4 files (README, TODO, spec §8, optional .gitignore).
**Conditional code**: 1 TS hook file + 5 TSX integration points.

---

### §2.1 iOS 26 real-device test protocol

**Goal**. Confirm that every element that relies on `position: fixed` or `position: sticky` in the rebuilt client renders correctly on an iPhone running iOS 26.x, or falls back to an equivalent behavior via the §2.1.5 hook.

**Why this phase owns it**. The iOS 26 regression is a landmine the rebuild cannot detect at Vitest level — it is a WebKit layout bug, not a CSS authoring bug. The rebuild's CSS is correct per spec; the regression is downstream. The only verification mechanism is running the build on a physical iOS 26 device. Briggsy has the device; Phase 5 is the phase that runs the protocol.

#### §2.1.1 Target elements at risk

Five elements from the rebuilt client use `position: fixed` or `position: sticky` and are therefore at risk of iOS 26 regression:

| # | File | Element | Positioning kind | Phase-N reference |
|---|---|---|---|---|
| 1 | `src/client/player/TitleBar.module.css` | `.titleBar` | `position: sticky; top: 0` | Phase 2 §2.3.5 |
| 2 | `src/client/player/StatusBar.module.css` | `.statusBar` | `position: sticky; top: [titlebar-height]` OR `position: fixed; bottom: 0` (check the rewrite) | Phase 2 §2.3.6 |
| 3 | `src/client/player/FloatingActionButton.module.css` | `.fab` | `position: fixed; bottom: var(--space-6); right: var(--space-6)` | Phase 2 §2.3.7 |
| 4 | `src/client/shared/DramaOverlay.module.css` | `.overlay` | `position: fixed; inset: 0` | Phase 3 §2.6 |
| 5 | `src/client/board/AnnouncementFeed.module.css` | `.feed` | `position: fixed; bottom: [clamp]; right: [clamp]` | Phase 3 §2.3.7 |

Elements 1–3 render on phone (iOS Safari target). Elements 4 and 5 render cross-view or board-only — but DramaOverlay also appears on phone via the shared component, so it must be tested. Element 5 is board-only (desktop Safari / Chrome / Firefox) but still verified on iPad Safari as part of the §2.2 portrait-iPad capture, since iPad runs iPadOS 26 which shares the WebKit regression surface.

**Total: 5 elements, all verified.**

#### §2.1.2 Prerequisites

1. Phases 1–4 merged to `main` and all tests green.
2. A staging build deployable to a URL reachable from the iPhone:
   - **Option A (preferred)**: Cloudflare Pages preview deploy (git push → auto-preview URL). Requires `wrangler` authenticated — `TODO.md` §5 flags this as a pending blocker. If blocked, fall back to Option B.
   - **Option B**: Local dev server (`pnpm dev`) + ngrok or Cloudflare Tunnel to expose `http://localhost:5173` to the public internet. `cloudflared tunnel --url http://localhost:5173` is the lowest-friction setup; requires a Cloudflare account (Briggsy already has one).
3. A second device for the board view — Briggsy's desktop browser or the TV with a keyboard — so that a phone client can actually join a room.
4. An iPhone running iOS 26.x with Safari. The version string is read from *Settings → General → About → Software Version*; record the exact build (e.g., `26.1.1 (23A1234)`) in `test/device-test/ios-26-protocol.md`.

#### §2.1.3 Protocol (step by step)

The protocol is written as a checklist that a human runs and records pass/fail for each row. The artifact lives at `test/device-test/ios-26-protocol.md` and is committed with the test results filled in.

**Setup steps**:

1. Deploy staging build per §2.1.2. Note the board URL and the player URL.
2. Open the board URL on desktop. Create a room. Note the room code.
3. On the iPhone, open Safari (not Chrome — the regression is WebKit-specific). Navigate to the player URL. Enter the room code. Name the player "iOS Test".
4. Player should land in the lobby. Confirm the `TitleBar` is visible at the top of the screen (not hidden, not clipping, not floating in the middle).
5. From desktop, start the game with at least 2 players (the iPhone player + Briggsy playing a second phone or a second browser window).

**Verification steps — per target element**:

6. **TitleBar (`position: sticky`)**: In the PlayingView, scroll the hand area down. The TitleBar should remain pinned to the top of the viewport. *Regression symptom*: TitleBar scrolls out of view with the page content. If regressed, §2.1.5 fallback needed.
7. **StatusBar**: Scroll the PlayingView. StatusBar should remain pinned (top or bottom, whichever the rewrite landed on). *Regression symptom*: scrolls out of view.
8. **FloatingActionButton (`position: fixed`)**: In a state where the FAB is visible (e.g., an active intercept window OR the "draw" action state per Phase 2 §2.3.7), scroll the hand. FAB should remain pinned to the bottom-right. *Regression symptom*: FAB scrolls with content.
9. **DramaOverlay (`position: fixed; inset: 0`)**: Trigger a drama beat — the easiest is to stage and play a Burned card (play a card that forces BURNED → draw Burned → no Extract → ELIMINATED overlay). The DramaOverlay should cover the entire viewport. *Regression symptoms*: overlay misaligned (offset from viewport corners), overlay scrolls, overlay clips.
10. **AnnouncementFeed (board)**: On the board view (desktop for TV, or iPad if testing iPad regression): trigger a game event that writes to the announcement feed (any card play). The feed should remain pinned in the bottom-right. On iPad Safari, scroll the board view (iPads can scroll in some orientations) and verify the feed stays pinned.

**Orientation change test**:

11. Rotate the iPhone from portrait to landscape (even though the player view is portrait-only, the browser still fires the orientation change event). Confirm all persistent chrome re-lays out correctly without visual glitch or ghost-layer from pre-rotation.
12. Rotate back to portrait.

**Viewport resize test**:

13. Pull down the Safari address bar (tap near the URL area). This changes the viewport height by ~60px — the notorious "iOS Safari dynamic viewport" case. Confirm:
    - `svh`-based sizes don't resize (they are Small Viewport Height — intentional).
    - `dvh`-based sizes (which should be zero in the rebuild — Phase 2 §2.6 killed the last `dvh` leak) don't exist. If anything resizes visibly on address bar pull, grep the phase-2 output to find the leak.
14. Dismiss the address bar pull. Confirm no layout thrash.

**Recording the result**:

15. Take screenshots of any regression observed (AirDrop or save to Files, then move to `test/device-test/evidence/`).
16. Fill in the `ios-26-protocol.md` checklist with pass/fail per row. Note the iOS build string at the top.

#### §2.1.4 Acceptance thresholds

- [ ] Every one of the 5 elements passes the visual-pin test (remains pinned during scroll).
- [ ] Orientation change does not leave a ghost layer or misaligned element.
- [ ] Safari address bar pull-down does not resize `svh`-based elements.
- [ ] `ios-26-protocol.md` is committed with iOS build string + pass/fail marks + any evidence screenshots.

**If all 5 pass**: no fallback needed. §2.1.5 is documented but not implemented. Phase 5 proceeds to §2.2.

**If any fail**: §2.1.5 fallback lands in a dedicated commit, Phase 5 §2.1 re-runs on the fallback build, and the protocol re-captures pass/fail with the fallback active.

#### §2.1.5 Conditional fallback — `useIOSFixedFallback` hook

**When**: only if §2.1.4 finds at least one regression on iOS 26.x.

**Strategy**: replace `position: fixed` / `position: sticky` with `position: absolute` + a JS-driven scroll-sync that updates the element's `top` / `bottom` on every `scroll` event. Scope the override to iOS 26.x only via a UA sniff — devices not affected by the regression keep the native `position: fixed` / `position: sticky` behavior.

**Why UA sniff and not feature detection**: there is no CSS or JS API to feature-detect the regression. The bug is a WebKit layout bug where `position: fixed` computes correctly but renders with an incorrect transform. Every CSS-level test says "yes, this is fixed"; the visual rendering is wrong. The only mechanism to target the affected devices is the UA string.

**The hook** (`src/client/shared/useIOSFixedFallback.ts`):

```typescript
/** iOS 26.0 WebKit broke position: fixed / position: sticky (WebKit bug 297779).
 *  Safari 26.1 release notes confirm the fix landed ("Fixed a bottom gap appearing
 *  on layouts with viewport-sized fixed containers on iOS").
 *
 *  CRITICAL (B1 deepening): iOS 26 FROZE the `iPhone OS` token in the UA string
 *  at `18_6` (privacy/anti-fingerprinting measure, confirmed by webkit.org,
 *  Kochava, Singular, Daring Fireball). The `Version/` token still updates and
 *  correctly reflects `26.0`, `26.1`, etc. Detection MUST use `Version/`, NOT
 *  `iPhone OS`. iPads send a desktop-class UA since iPadOS 13 — detect via
 *  `navigator.maxTouchPoints > 1`.
 *
 *  Scope: iOS 26.0 ONLY (not 26.1+). If §2.1 real-device test on 26.1+ also
 *  fails, bump AFFECTED_MINOR_MAX.
 *
 *  Source: WebKit bug 297779, Safari 26.1 release notes, Art of the Title
 *  primary-source verification chain. Verified empirically during Phase 5 §2.1
 *  real-device testing on <BUILD-STRING-FROM-PROTOCOL>.
 */

const AFFECTED_MAJOR = 26;
const AFFECTED_MINOR_MAX = 0; // 26.0 only; bump if 26.1 residual found

/** Parse Safari major.minor from the UA string.
 *  Pass 1: `Version/` — reliable in Safari where iOS version is frozen.
 *  Pass 2: `iPhone OS` — fallback for in-app browsers (Facebook, Instagram)
 *  that strip the `Version/` token but may report the real OS version. */
function parseSafariVersion(ua: string): { major: number; minor: number } | null {
  // Pass 1: Version/ token (preferred — accurate on Safari 26+)
  const versionMatch = ua.match(/Version\/(\d+)\.(\d+)/);
  if (versionMatch) return {
    major: Number.parseInt(versionMatch[1], 10),
    minor: Number.parseInt(versionMatch[2], 10),
  };
  // Pass 2: iPhone OS token (fallback for in-app browsers without Version/)
  const osMatch = ua.match(/iPhone OS (\d+)_(\d+)/);
  if (osMatch) return {
    major: Number.parseInt(osMatch[1], 10),
    minor: Number.parseInt(osMatch[2], 10),
  };
  return null;
}

/** Detect iOS/iPadOS device. iPads report as "Macintosh" since iPadOS 13
 *  but expose 5 touch points (real Macs report 0). */
function isAppleMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (/iPhone|iPod/.test(navigator.userAgent)) return true;
  // iPad (iPadOS 13+): desktop UA but multi-touch
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  return false;
}

/** Module-level singleton — evaluated once on import, truly stable.
 *  (B1 deepening: useMemo is NOT a guarantee — React may discard memoized
 *  values. Module-level constant is the correct pattern for a value that
 *  must never change during a session.) */
const IS_AFFECTED_IOS: boolean = (() => {
  if (!isAppleMobileDevice()) return false;
  const version = parseSafariVersion(navigator.userAgent);
  if (!version) return false;
  return version.major === AFFECTED_MAJOR && version.minor <= AFFECTED_MINOR_MAX;
})();

export { IS_AFFECTED_IOS };
```

**Integration pattern — TSX side** (each of the 5 components adopts the same pattern):

```tsx
import { useIOSFixedFallback } from '@client/shared/useIOSFixedFallback';
import styles from './TitleBar.module.css';

export function TitleBar(/* ...props */) {
  const useFallback = useIOSFixedFallback();
  return (
    <header className={`${styles.titleBar} ${useFallback ? styles.titleBarFallback : ''}`}>
      {/* ...existing content */}
    </header>
  );
}
```

**Integration pattern — CSS side**:

```css
.titleBar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  /* ...rest of the rule body from Phase 2 §2.3.5 rewrite */
}

/* iOS 26.x fallback — activated only by the useIOSFixedFallback hook */
.titleBarFallback {
  position: absolute;
  top: 0;
  /* The scroll-sync handler in useIOSFixedFallback updates `top` on every
     scroll event; CSS keeps its own `top: 0` as the baseline. */
}
```

Scroll-sync is the harder half of the fallback. For the five target elements, the sync logic is:

- **TitleBar / StatusBar**: `top: window.scrollY + [static offset]` on every `scroll`. For a sticky-top element, static offset = 0. For a sticky-bottom element (StatusBar variant), `top: window.scrollY + (window.innerHeight - elementHeight)`.
- **FloatingActionButton**: similar to StatusBar bottom — `top: window.scrollY + (window.innerHeight - elementHeight - [space-6])`.
- **DramaOverlay**: `top: window.scrollY; left: window.scrollX; width: window.innerWidth; height: window.innerHeight`. Full-viewport cover regardless of scroll.
- **AnnouncementFeed**: equivalent to FAB positioning math but on the board side.

**The scroll handler is added by the hook** (expanded form):

```typescript
import { useEffect } from 'react';
import { IS_AFFECTED_IOS } from './useIOSFixedFallback'; // module-level singleton from above

type FallbackKind = 'stickyTop' | 'stickyBottom' | 'fixedBottomRight' | 'fullCover';

/** (B1 deepening) Expanded hook with performance fixes from 4-agent consensus:
 *  - Module-level IS_AFFECTED_IOS replaces useMemo (S8: useMemo is not a guarantee)
 *  - Cached dimensions on resize only — NO getBoundingClientRect in scroll path (S1)
 *  - requestAnimationFrame throttling coalesces multiple scroll events per frame (S1)
 *  - Reads --space-6 from computed style, not hardcoded 24 (S7: responsive tokens)
 *  - Unused useRef import removed (S22)
 */
export function useIOSFixedFallback(
  kind: FallbackKind,
  ref: React.RefObject<HTMLElement | null>,
): boolean {
  useEffect(() => {
    if (!IS_AFFECTED_IOS) return;
    const el = ref.current;
    if (!el) return;

    let rafId = 0;
    let cachedHeight = el.offsetHeight;
    let cachedWidth = el.offsetWidth;
    // S7: read --space-6 from computed style, not hardcoded 24
    const gap = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--space-6')
    ) || 24; // fallback to 24 only if token missing

    const syncPosition = () => {
      const sy = window.scrollY;
      const vh = window.innerHeight;

      switch (kind) {
        case 'stickyTop':
          el.style.transform = `translateY(${sy}px)`;
          break;
        case 'stickyBottom':
          el.style.transform = `translateY(${sy + vh - cachedHeight}px)`;
          break;
        case 'fixedBottomRight':
          el.style.transform = `translate(${window.scrollX + window.innerWidth - cachedWidth - gap}px, ${sy + vh - cachedHeight - gap}px)`;
          break;
        case 'fullCover':
          el.style.transform = `translate(${window.scrollX}px, ${sy}px)`;
          el.style.width = `${window.innerWidth}px`;
          el.style.height = `${vh}px`;
          break;
      }
    };

    const onScroll = () => {
      if (rafId) return; // already scheduled — coalesce
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        syncPosition();
      });
    };

    const onResize = () => {
      cachedHeight = el.offsetHeight;
      cachedWidth = el.offsetWidth;
      onScroll(); // also sync position after resize
    };

    syncPosition();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [kind, ref]);

  return IS_AFFECTED_IOS;
}
```

**Performance note (S1, 4-agent consensus):** The original hook called `getBoundingClientRect()` on every scroll event, triggering forced reflow. On iOS 26 with 5 elements, that's 300 forced reflows/second during 60fps scroll. The corrected version:
- Caches `offsetHeight`/`offsetWidth` once + on resize (no scroll-path reflow)
- Uses `requestAnimationFrame` to coalesce multiple scroll events into one paint cycle
- Uses `transform` instead of `top`/`left` for compositor-friendly updates (no layout thrash)
- Reads `--space-6` from computed style instead of hardcoding `24` (respects responsive tokens)

**Bundle cost (S11 CORRECTION)**: The hook body is ~650 bytes raw, ~330 bytes gzipped. But the plan must also account for: import statement overhead in 5 consuming components (~50 bytes gzipped), conditional className concatenation in 5 components (~25 bytes), and ref creation if not already present (~50 bytes). **Realistic total: +450–500 bytes gzipped**, not +380 as originally estimated. At ~99.6KB pre-Phase-5, this puts the phone entry at ~100.1KB — marginally over budget. The first triage step (§8.4) is the module-level singleton optimization (already adopted in the corrected hook above — eliminates `useMemo` import, saves ~40 bytes). Phase 5 §8.2 re-measures after the fallback lands.

**Commit**: `fix(ios-26): position:fixed/sticky fallback for 5 persistent chrome elements` — dedicated commit, landed after §2.1 protocol marks at least one failure, before §2.2 baseline generation.

**Re-test**: with the fallback active, re-run §2.1.3 steps 6–14 and re-fill the checklist. All 5 elements must pass after fallback is active.

---

### §2.2 Playwright visual regression matrix

**Goal**. Capture every major screen at every supported viewport, compare against a committed baseline, and fail CI if any pixel diff exceeds threshold. The matrix is the automated counterpart to the human "does this screen pass the Archer test?" question — the visual regression catches accidental drift; §2.1 + §2.7 catch the bar being missed.

**Why this phase owns it**. The spec (§8.1, §8.2) requires "every screen passes the Archer test" and "screenshots taken via Playwright at [viewport list]". Phases 1–4 did not generate screenshots; they generated the code that makes screenshots possible. Phase 5 is where the `test/visual-regression/` directory is authored.

#### §2.2.1 Test runner configuration

**New dev dependency**: `@playwright/test` (latest — as of Phase 5 plan drafting, Playwright 1.50+ is current).

**Install**: `pnpm add -D @playwright/test && pnpm exec playwright install chromium webkit firefox` — installs the test runner + the three browser engines. CI runs all three; local dev defaults to chromium only.

**New file**: `playwright.config.ts` at repo root:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/visual-regression',
  // Per-test timeout is generous because some tests wait for game state.
  timeout: 30_000,
  expect: {
    // Visual diff: max 0.1% of pixels may differ, and no individual pixel by more
    // than 10/255 intensity. Tuned to be strict but tolerant of font-rendering
    // jitter at sub-pixel levels.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.001,
      threshold: 0.04,
      // B8 CORRECTION: scale: 'device' required for DPR to affect screenshot
      // dimensions. Without it, DPR 2/3 screenshots are identical in pixel size
      // and DPR testing is meaningless.
      scale: 'device',
      // S4: Disable CSS animations + transitions during capture to prevent
      // non-deterministic frame timing from causing flaky diffs.
      animations: 'disabled',
      // S10: Suppress focus rings via injected stylesheet (more reliable than
      // body.click()). This stylesheet ONLY applies during toHaveScreenshot
      // capture — it never ships to production.
      stylePath: './test/visual-regression/helpers/suppress-focus.css',
    },
  },
  // Dev server is the target — Playwright launches `pnpm dev` and `pnpm dev:server`
  // in parallel, waits for both to respond, runs the matrix, then tears them down.
  // S19: name fields for better error messages when a server fails to start
  webServer: [
    {
      command: 'pnpm dev',
      name: 'Vite',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm dev:server',
      name: 'Wrangler',
      url: 'http://localhost:8787',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
  // Performance: limit parallel workers in CI to prevent memory pressure
  // (~1.3GB peak with 2 workers × 3 browsers + 2 dev servers)
  workers: process.env.CI ? 2 : undefined,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // B7 CORRECTION: webkit + firefox run functional smoke tests only —
    // NO toHaveScreenshot() assertions. Playwright requires committed baselines
    // for toHaveScreenshot(); missing baselines cause test FAILURE, not
    // self-comparison. Committing cross-browser baselines would triple storage
    // (~210MB). The pragmatic fix: chromium owns all visual regression;
    // webkit/firefox verify functional behavior (navigation, fixtures, selectors).
    ...(process.env.CI ? [
      { name: 'webkit-functional', use: { ...devices['Desktop Safari'] } },
      { name: 'firefox-functional', use: { ...devices['Desktop Firefox'] } },
    ] : []),
  ],
  // Baselines committed to git so CI can diff against them.
  snapshotPathTemplate: '{testDir}/baselines/{projectName}/{arg}{ext}',
});
```

**New `package.json` scripts**:

```json
{
  "scripts": {
    "test:visual": "playwright test",
    "test:visual:update": "playwright test --update-snapshots && npx optipng-bin -o7 test/visual-regression/baselines/**/*.png",
    "test:visual:ui": "playwright test --ui"
  }
}
```

**(S14 deepening)** `optipng -o7` losslessly compresses Playwright's unoptimized PNGs by 20-40%. With 184 baselines × ~400KB, this reduces committed storage from ~74MB to ~50MB. Add `optipng-bin` as a devDep: `pnpm add -D optipng-bin`. The compression runs after baseline generation, before `git add`.
```

**CI integration**: add a new GitHub Actions job (or Cloudflare Pages preview hook) that runs `pnpm test:visual` after `pnpm build`. Baseline PNGs are checked into git under `test/visual-regression/baselines/`. A diff failure uploads the failing screenshot to the run artifacts for human review.

**Why a new `test/` top-level directory and not `src/client/__tests__/`**: the existing Vitest tests live adjacent to the source files they test (e.g., `src/client/shared/tokens/__tests__/`). That co-location makes sense for unit tests. Playwright visual regression is not a unit test — it boots the whole app and measures rendered output. A top-level `test/` directory keeps the two test surfaces clearly separated: Vitest is what `pnpm test` runs; Playwright is what `pnpm test:visual` runs. CI runs both.

#### §2.2.2 Viewport list

Exactly as called out in the TODO block:

**Phone viewports** (4):

| Label | Width × Height | Device scale | Notes |
|---|---|---|---|
| iPhone SE | 375 × 667 | 2 | Smallest supported phone — the `--space-fluid-*` floor |
| iPhone 15 | 393 × 852 | 3 | Representative modern iPhone |
| iPad mini (portrait) | 744 × 1133 | 2 | Small tablet portrait |
| iPad Pro 12.9" (portrait) | 1024 × 1366 | 2 | The `--size-root-max-width` cap — the "iPad is a huge phone" case |

**Board viewports** (4):

| Label | Width × Height | Device scale | Notes |
|---|---|---|---|
| Small laptop | 1280 × 800 | 1 | Smallest board viewport — the clamp floor |
| Full HD desktop | 1920 × 1080 | 1 | Most common desktop |
| 2K display | 2560 × 1440 | 1 | High-end monitor |
| 4K TV | 3840 × 2160 | 2 | The final form factor (per spec §3.4) |

**Total: 8 viewports × all screens = large matrix.** §2.2.4 clarifies that phone screens render on phone viewports only, board screens on board viewports only. Cross-view components (MinimalCard, DramaOverlay, GameOver) render on the consuming view's viewports (so they test both phone and board consumption).

#### §2.2.3 Screen capture list

**Phone screens** (rendered at each of the 4 phone viewports):

| # | Screen | State | Captured by | Reference (Phase 2/3) |
|---|---|---|---|---|
| 1 | JoinScreen | empty state (no name typed, no lobbies) | `phone.spec.ts:joinScreen.empty` | Phase 2 §2.3.8 |
| 2 | JoinScreen | name typed, join button active | `phone.spec.ts:joinScreen.nameTyped` | Phase 2 §2.3.8 |
| 3 | JoinScreen | lobby list with 3 rooms | `phone.spec.ts:joinScreen.lobbies` | Phase 2 §2.3.8 |
| 4 | Lobby | waiting for players (2 joined, 3 more needed) | `phone.spec.ts:lobby.waiting` | Phase 2 §2.3.8 |
| 5 | Lobby | ready to start (5 joined) | `phone.spec.ts:lobby.ready` | Phase 2 §2.3.8 |
| 6 | PlayingView | SmartActionBox `standby` (not my turn) | `phone.spec.ts:playing.standby` | Phase 2 §2.3.4 |
| 7 | PlayingView | SmartActionBox `draw` (my turn, nothing staged) | `phone.spec.ts:playing.draw` | Phase 2 §2.3.4 |
| 8 | PlayingView | SmartActionBox `drawIntense` (deck nearly empty) | `phone.spec.ts:playing.drawIntense` | Phase 2 §2.3.4 |
| 9 | PlayingView | SmartActionBox `comboPair` (2-card steal staged) | `phone.spec.ts:playing.comboPair` | Phase 2 §2.3.4 |
| 10 | PlayingView | SmartActionBox `action` (1-card action staged) | `phone.spec.ts:playing.action` | Phase 2 §2.3.4 |
| 11 | PlayingView | SmartActionBox `invalid` (ineligible selection) | `phone.spec.ts:playing.invalid` | Phase 2 §2.3.4 |
| 12 | Hand | 0 cards (post-burn pre-deal) | `phone.spec.ts:hand.empty` | Phase 2 §2.3.2 |
| 13 | Hand | 5 cards | `phone.spec.ts:hand.5` | Phase 2 §2.3.2 |
| 14 | Hand | 10 cards (wide case) | `phone.spec.ts:hand.10` | Phase 2 §2.3.2 |
| 15 | StagingArea | empty | `phone.spec.ts:staging.empty` | Phase 2 §2.3.3 |
| 16 | StagingArea | 1 staged (single action) | `phone.spec.ts:staging.1` | Phase 2 §2.3.3 |
| 17 | StagingArea | 3 staged (triple-steal combo) | `phone.spec.ts:staging.3` | Phase 2 §2.3.3 |
| 18 | DefusePlacement sheet | | `phone.spec.ts:sheet.defusePlacement` | Phase 2 §2.3.13 |
| 19 | FavorResponse sheet | | `phone.spec.ts:sheet.favorResponse` | Phase 2 §2.3.13 |
| 20 | FuturePeek sheet | read-only (See the Future) | `phone.spec.ts:sheet.futurePeek.readonly` | Phase 2 §2.3.13 |
| 21 | FuturePeek sheet | rearrange (Alter the Future) | `phone.spec.ts:sheet.futurePeek.rearrange` | Phase 2 §2.3.13 |
| 22 | TargetSelect sheet | local (I pick) | `phone.spec.ts:sheet.targetSelect.local` | Phase 2 §2.3.13 |
| 23 | TargetSelect sheet | prompted (opponent picked me) | `phone.spec.ts:sheet.targetSelect.prompted` | Phase 2 §2.3.13 |
| 24 | NameCard sheet | pre-guess | `phone.spec.ts:sheet.nameCard.preGuess` | Phase 2 §2.3.13 |
| 25 | NameCard sheet | post-guess correct | `phone.spec.ts:sheet.nameCard.correct` | Phase 2 §2.3.13 |
| 26 | NameCard sheet | post-guess wrong | `phone.spec.ts:sheet.nameCard.wrong` | Phase 2 §2.3.13 |
| 27 | CardDetailSheet | | `phone.spec.ts:sheet.cardDetail` | Phase 2 §2.3.12 |
| 28 | EliminatedView | full screen | `phone.spec.ts:eliminatedView` | Phase 2 §2.3.9 |
| 29 | ErrorToast | visible toast | `phone.spec.ts:errorToast` | Phase 2 §2.3.10 |
| 30 | ConnectionOverlay | disconnected state | `phone.spec.ts:connectionOverlay` | Phase 2 §2.3.11 |
| 31 | ProtocolMismatch | version mismatch overlay | `phone.spec.ts:protocolMismatch` | S5 deepening — missing from draft |
| 32 | NoRoomCode | "Scan the QR code on the TV" | `phone.spec.ts:noRoomCode` | S5 deepening — missing from draft |

**S5 deepening — 2 missing screens added.** ProtocolMismatch is the first screen a user sees on a protocol version mismatch (deploy error). NoRoomCode is the first screen a confused user sees navigating to the player URL without `?room=`. Both confirmed in `src/client/player/Player.tsx` via `useProtocolMismatch`.

**Phone screen count: 32 captures × 4 viewports = 128 baseline images.** (was 120)

**Board screens** (rendered at each of the 4 board viewports):

| # | Screen | State | Captured by | Reference (Phase 3) |
|---|---|---|---|---|
| 1 | Lobby (board) | 0 players joined (QR code + room code) | `board.spec.ts:lobby.empty` | Phase 3 §2.3.2 |
| 2 | Lobby (board) | 2 players joined | `board.spec.ts:lobby.2p` | Phase 3 §2.3.2 |
| 3 | Lobby (board) | 5 players joined | `board.spec.ts:lobby.5p` | Phase 3 §2.3.2 |
| 4 | Lobby (board) | 10 players joined (max) | `board.spec.ts:lobby.10p` | Phase 3 §2.3.2 |
| 5 | GameTable | mid-game, 4 active players, full ring | `board.spec.ts:gameTable.midGame` | Phase 3 §2.3.1 |
| 6 | GameTable | NopeCountdownBar active (intercept window) | `board.spec.ts:gameTable.nopeWindow` | Phase 3 §2.3.9 |
| 7 | GameTable | AnnouncementFeed showing 3 events | `board.spec.ts:gameTable.announcementFeed` | Phase 3 §2.3.7 |
| 8 | GameTable | DrawPile + DiscardFan close-up | `board.spec.ts:gameTable.piles` | Phase 3 §2.3.4 + §2.3.5 |
| 9 | DramaOverlay | BURNED frame | `board.spec.ts:dramaOverlay.burned` | Phase 3 §2.6 |
| 10 | DramaOverlay | EXTRACTED frame | `board.spec.ts:dramaOverlay.extracted` | Phase 3 §2.6 |
| 11 | DramaOverlay | ELIMINATED frame | `board.spec.ts:dramaOverlay.eliminated` | Phase 3 §2.6 |
| 12 | DramaOverlay | INTERCEPTED frame | `board.spec.ts:dramaOverlay.intercepted` | Phase 3 §2.6 |
| 13 | DramaOverlay | VICTORY frame | `board.spec.ts:dramaOverlay.victory` | Phase 3 §2.6 |
| 14 | GameOver | winner screen | `board.spec.ts:gameOver.winner` | Phase 3 §2.5 |

**Board screen count: 14 captures × 4 viewports = 56 baseline images.**

**Grand total: 184 baseline images** (128 phone + 56 board). Local dev is chromium-only (184 baselines). CI runs webkit/firefox as functional smoke tests only (B7 correction — no `toHaveScreenshot()` assertions in cross-browser projects).

**Storage footprint**: PNGs at the smallest viewport (375×667 @ DPR 2 = 750×1334) are ~200KB each. Averaged across viewports: ~400KB per baseline. 184 baselines × 400KB ≈ 70 MB for the chromium set. CI cross-browser set would be ~210 MB total. This is within normal git repo sizes for a project shipping visual regression (Storybook's Chromatic uses the same pattern). If the size becomes a problem, the fallback is Git LFS for the `baselines/` subdirectory — flagged in §5 landmine 4.

#### §2.2.4 Example test file shape

`test/visual-regression/phone.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { seedLobby, seedPlaying, seedSheet, VIEWPORTS } from './helpers/fixtures';

const PHONE_VIEWPORTS = VIEWPORTS.phone;

for (const vp of PHONE_VIEWPORTS) {
  test.describe(`phone @ ${vp.label} (${vp.width}×${vp.height} @${vp.dpr}x)`, () => {
    // B8: deviceScaleFactor is a context option, NOT a viewport property
    test.use({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr });

    test('JoinScreen — empty', async ({ page }) => {
      await page.goto('/player.html');
      await expect(page).toHaveScreenshot(`joinScreen-empty-${vp.label}.png`);
    });

    test('JoinScreen — name typed', async ({ page }) => {
      await page.goto('/player.html');
      await page.fill('[data-test="player-name"]', 'Cyril');
      await expect(page).toHaveScreenshot(`joinScreen-nameTyped-${vp.label}.png`);
    });

    // ...the rest of the 30 phone captures

    test('PlayingView — SmartActionBox standby', async ({ page }) => {
      // Fixture seeds a 5-player game where the current client is NOT the active player
      await seedPlaying(page, { state: 'standby' });
      await expect(page).toHaveScreenshot(`playing-standby-${vp.label}.png`);
    });

    test('EliminatedView', async ({ page }) => {
      await seedPlaying(page, { state: 'eliminated' });
      await expect(page).toHaveScreenshot(`eliminated-${vp.label}.png`);
    });
  });
}
```

**Fixture helper pattern** (`test/visual-regression/helpers/fixtures.ts`):

```typescript
import type { Page } from '@playwright/test';

// B8 CORRECTION: dpr field added — must be passed as deviceScaleFactor to
// test.use(), SEPARATE from viewport (it is NOT a viewport property).
// B6 RECONCILIATION: These viewports diverge from spec §8.1/§8.2 viewport
// lists (spec: iPhone 14 390×844, iPad 10.9" 820×1180, board 1280×720).
// Rationale: iPhone 15 (393×852) is 2024's representative modern phone;
// iPad mini (744×1133) is a stricter floor than iPad 10.9". Spec §8.1/§8.2
// viewport lists are amended during Phase 5 §2.8.1 documentation pass.
export const VIEWPORTS = {
  phone: [
    { label: 'iphoneSE',   width: 375,  height: 667,  dpr: 2 },
    { label: 'iphone15',   width: 393,  height: 852,  dpr: 3 },
    { label: 'ipadMini',   width: 744,  height: 1133, dpr: 2 },
    { label: 'ipadPro129', width: 1024, height: 1366, dpr: 2 },
  ] as const,
  board: [
    { label: 'laptop',  width: 1280, height: 800,  dpr: 1 },
    { label: 'fullHD',  width: 1920, height: 1080, dpr: 1 },
    { label: '2k',      width: 2560, height: 1440, dpr: 1 },
    { label: '4k',      width: 3840, height: 2160, dpr: 2 },
  ] as const,
};

/** Seed the game state via the dev server's fixture endpoint.
 *  The dev server exposes `/__test/seed` (dev only, guarded by NODE_ENV) that
 *  accepts a JSON game snapshot and a client ID; it writes the snapshot into
 *  the target room's Durable Object state so that the visual regression test
 *  does not need to play through the game loop to capture an intermediate state.
 *
 *  Fixture authoring rule: every seeded state is a pure data structure that
 *  matches `GameState` from `src/shared/protocol.ts`. The dev-server endpoint
 *  replaces Durable Object storage with the fixture atomically, so the Playwright
 *  test navigates to the room URL and gets the seeded state immediately. */
export async function seedPlaying(page: Page, opts: { state: string }) {
  const room = 'VREG-' + Math.random().toString(36).slice(2, 8);
  await page.request.post('http://localhost:8787/__test/seed', {
    data: { room, state: opts.state },
  });
  await page.goto(`/player.html?room=${room}&name=TestPlayer&fixture=1`);
  // S20: waitForSelector is deprecated — use locator().waitFor()
  await page.locator('[data-test="smart-action-box"]').waitFor({ state: 'visible' });
}

export async function seedLobby(page: Page, opts: { playerCount: number }) {
  const room = 'VREG-' + Math.random().toString(36).slice(2, 8);
  await page.request.post('http://localhost:8787/__test/seed', {
    data: { room, state: 'lobby', playerCount: opts.playerCount },
  });
  await page.goto(`/board.html?room=${room}`);
  await page.waitForSelector('[data-test="lobby-roster"]');
}

export async function seedSheet(page: Page, kind: string) {
  // Similar to seedPlaying but opens directly into a PlayingView where the
  // named sheet is already open.
  const room = 'VREG-' + Math.random().toString(36).slice(2, 8);
  await page.request.post('http://localhost:8787/__test/seed', {
    data: { room, state: 'sheet', sheet: kind },
  });
  await page.goto(`/player.html?room=${room}&name=TestPlayer&fixture=1`);
  await page.waitForSelector(`[data-test="sheet-${kind}"]`);
}
```

**Dev-server fixture endpoint** (`src/server/room.ts` edit — or more cleanly a separate `src/server/test-fixtures.ts` module imported only when `NODE_ENV === 'development'`):

```typescript
// src/server/test-fixtures.ts — dev-only seeding endpoint, guarded at export time
export async function handleFixtureSeed(request: Request, state: DurableObjectState) {
  if (import.meta.env.PROD) return new Response('Not Found', { status: 404 });
  const body = (await request.json()) as { room: string; state: string; [k: string]: unknown };
  const snapshot = buildFixtureSnapshot(body);
  await state.storage.put(`room:${body.room}`, snapshot);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

function buildFixtureSnapshot(body: { state: string; [k: string]: unknown }): GameState {
  // Factory: map fixture labels to hand-authored GameState snapshots.
  // Every fixture is a literal object — no randomness, no dependency on the
  // real game engine — so the Playwright baseline is byte-for-byte deterministic.
  switch (body.state) {
    case 'standby':      return FIXTURE_STANDBY;
    case 'draw':         return FIXTURE_DRAW;
    case 'drawIntense':  return FIXTURE_DRAW_INTENSE;
    // ...one case per fixture label
    default:
      throw new Error(`Unknown fixture state: ${body.state}`);
  }
}

// FIXTURE_* consts are literal GameState objects authored in
// test/visual-regression/fixtures.ts and imported here.
```

**Why a fixture endpoint and not Playwright-level data injection**: the rebuilt client reads state from the Durable Object via WebSocket. The Playwright test cannot fake that connection without also faking the WebSocket library. The cleanest path is to give the Durable Object a dev-only seed endpoint that writes a pre-built snapshot. `NODE_ENV`-gating keeps it out of production bundles.

**Why literal fixtures and not generated**: determinism. If fixtures are generated by running the real game engine, any engine change perturbs every baseline. Literal hand-authored fixtures are immune to engine changes — they are pure data. The cost is that every new card type requires hand-writing a fixture that includes it; that cost is a one-time-per-card-type expense that Phase 5 amortizes over the baseline lifetime.

#### §2.2.5 Visual review meeting — landing the three pending decisions

**When**: after the first pass of baselines is generated but before they are committed as canonical. Run immediately after `pnpm test:visual --update-snapshots` generates the initial set.

**Who**: Briggsy. (Claude cannot make a color decision — only compare against the Dreamland reference frames and flag deviations. Briggsy is the final arbiter.)

**Inputs**:
- The 176 freshly-generated PNGs at `test/visual-regression/baselines/`.
- The 18 Dreamland S8 reference frames at `docs/plans/css-foundation-rebuild/dreamland-reference/images/`.
- The three decision prompts (below).

**Decision 1 — GameOver winner glow hue**:

- Compare `board.spec.ts:gameOver.winner-{laptop,fullHD,2k,4k}.png` (4 screenshots).
- Default per Phase 3 §2.5: `--color-accent-drama` (ochre-9 amber).
- Alternative: `--color-accent-intercept` (emerald-9 forest green).
- Question: does the amber glow read as "warm victory gold" (pass) or "warning orange" (fail)?
- Comparison anchor: `dreamland-reference/images/dreamland-13-mother-drink.webp` (whiskey decanter amber) for the "warm victory" feel.
- Decision output: one of two values committed to `semantic.css`:
  ```css
  /* PASS outcome — keep default */
  --color-glow-winner: var(--color-accent-drama);

  /* FAIL outcome — swap to intercept */
  --color-glow-winner: var(--color-accent-intercept);
  ```
- If swap, the `GameOver.module.css` reference (Phase 3 §2.5) is updated in a dedicated commit. Baselines regenerate.

**Decision 2 — NopeCountdownBar + DramaOverlay.intercepted emerald saturation**:

- Compare `board.spec.ts:gameTable.nopeWindow-*.png` (4 screenshots, covers the NopeCountdownBar).
- Compare `board.spec.ts:dramaOverlay.intercepted-*.png` (4 screenshots, covers the INTERCEPTED overlay).
- Default per Phase 3 §2.3.9 + §2.6: `--color-emerald-9` (`#437d68` — saturated forest green).
- Alternatives: `--color-emerald-8` (`#396d5a` — darker, cooler) or `--color-emerald-10` (`#529078` — lighter, brighter).
- Question: does the emerald read as "muted spy-agency intercept" (pass) or "too subtle / too dim" (fail → bump toward emerald-10) or "too loud / too cartoony" (fail → bump toward emerald-8)?
- Comparison anchor: `dreamland-reference/images/dreamland-02-interior-bar.webp` (olive moss tie) for the "muted forest agency" feel.
- Decision output: a one-line change to `semantic.css`:
  ```css
  /* Default */
  --color-accent-intercept: var(--color-emerald-9);

  /* Alt A */
  --color-accent-intercept: var(--color-emerald-8);

  /* Alt B */
  --color-accent-intercept: var(--color-emerald-10);
  ```
- If swap, both Phase 3 §2.3.9 and §2.6 consume `--color-accent-intercept` so the one-line token change propagates. Baselines regenerate.

**Decision 3 — Baveuse font purchase**:

- Compare every screen that uses `--font-display` (the Clash Display default) to the Dreamland reference frames. The highest-signal comparisons are:
  - `board.spec.ts:lobby.5p-*.png` (title "BURNED")
  - `board.spec.ts:dramaOverlay.burned-*.png` (the word "BURNED" at hero size)
  - `board.spec.ts:dramaOverlay.victory-*.png` (the word "VICTORY" at victory size)
  - `phone.spec.ts:lobby.ready-*.png` (title on phone)
- Compare against `dreamland-reference/images/dreamland-01-title.webp` (the Dreamland neon sign letterforms).
- Question: does Clash Display at these sizes read as "Archer title-card font" (pass) or "generic display font" (fail)? Neal Holman / Art of the Title May 2016 verified that Baveuse is the canonical Archer title-card font.
- Decision output: one of two paths:
  - **Clash Display stays**: no action, the current baseline is canonical, Phase 5 proceeds.
  - **Purchase Baveuse**: Briggsy buys the font from Typodermic ($30), Harry or Briggsy installs the `.woff2` file, `src/client/shared/fonts.css` adds a `@font-face` for Baveuse, and `primitives.css` changes `--font-display: 'Baveuse', 'Clash Display', ...`. Phase 1 §2.3 pre-committed this one-line path; the switch is mechanical. Baselines regenerate.

**Meeting output**: three decisions recorded in `test/visual-regression/decisions.md` (new file), one decision per section, with the final value + the rationale sentence. The three file edits (if any) land in dedicated commits. Baselines regenerate after each decision that changed a value.

**Order of decisions**: land font first (biggest visual impact, affects every screen with display type), then emerald saturation (affects NopeWindow + one overlay), then winner glow (affects one screen). Baselines regenerate once per decision that flipped a value, not per decision total.

#### §2.2.6 Acceptance thresholds

- [ ] `playwright.config.ts` committed with `maxDiffPixelRatio: 0.001` and `threshold: 0.04`.
- [ ] `test/visual-regression/phone.spec.ts` covers all 32 phone screens × 4 phone viewports = 128 tests. (S5: +2 — ProtocolMismatch, NoRoomCode)
- [ ] `test/visual-regression/board.spec.ts` covers all 14 board screens × 4 board viewports = 56 tests.
- [ ] `test/visual-regression/fixtures.ts` authors literal game-state snapshots for every SmartActionBox state, every bottom sheet, every DramaOverlay variant, every lobby population count, and EliminatedView.
- [ ] Dev-server fixture endpoint `handleFixtureSeed` landed in `src/server/test-fixtures.ts`, wired into `src/server/room.ts` conditionally on `import.meta.env.DEV`.
- [ ] Baselines generated via `pnpm test:visual --update-snapshots`, visually reviewed per §2.2.5, and committed to git under `test/visual-regression/baselines/`.
- [ ] `pnpm test:visual` runs clean on the committed baselines (zero diffs).
- [ ] Three pending decisions (§2.2.5) resolved and `test/visual-regression/decisions.md` committed.
- [ ] CI job added that runs `pnpm test:visual` after `pnpm build`.

#### §2.2.7 Animation stability + reduced-motion verification (deepening addition)

**S4: Animation stability strategy.** Several captured screens involve active animations (DramaOverlay entry, DrawPile breathing glow, SmartActionBox drawIntense pulse, NopeCountdownBar, EliminatedView skull spring). Without mitigation, Playwright screenshots captured mid-animation produce non-deterministic frame diffs. The `toHaveScreenshot` config (§2.2.1) now includes `animations: 'disabled'` which disables CSS animations and Web Animations API transitions during capture. This handles both CSS keyframes and Framer Motion transitions.

For screens where the **final state** of an animation matters (e.g., DramaOverlay fully visible, not mid-fade), the test must wait for the animation to settle. Add before the `toHaveScreenshot()` call:

```typescript
// Wait for Framer Motion animations to settle (layout animations complete)
await page.waitForFunction(() =>
  document.getAnimations().every(a => a.playState === 'finished' || a.playState === 'idle')
);
```

**New helper file**: `test/visual-regression/helpers/suppress-focus.css` (referenced by `stylePath` in config):

```css
/* Visual regression only — suppresses focus rings during screenshot capture.
   This stylesheet is injected by Playwright's toHaveScreenshot() stylePath
   option and NEVER ships to production. */
*:focus-visible { outline: none !important; box-shadow: none !important; }
```

**S3: Reduced-motion verification pass.** Phase 1 §2.9 invested in a dual-family motion token architecture: essential durations (`--motion-duration-essential-pulse/-spin/-flash`) survive `@media (prefers-reduced-motion: reduce)` while decorative durations zero out. Phase 5 must verify this works. Add a small reduced-motion pass:

**Target screens** (5 — the highest-signal reduced-motion consumers):

| Screen | Why it matters |
|---|---|
| PlayingView standby (phone, 375×667) | Turn indicator animation uses essential token |
| ConnectionOverlay (phone, 375×667) | Loading spinner uses essential-spin token |
| NopeCountdownBar (board, 1920×1080) | Countdown uses essential pulse |
| DramaOverlay BURNED (board, 1920×1080) | Full-screen overlay with decorative entrance |
| DrawPile (board, 1920×1080) | Breathing glow is decorative — should zero out |

**Test approach**: Playwright supports `reducedMotion: 'reduce'` as a context option:

```typescript
test.describe('reduced-motion verification', () => {
  test.use({ reducedMotion: 'reduce' });
  // 5 screens × 1 viewport each = 5 baselines
  // Baselines committed alongside the standard baselines
});
```

**Acceptance**: Essential animations (turn indicator, spinner, countdown) remain visible. Decorative animations (DrawPile glow, DramaOverlay entrance) are absent or static. This is a 5-baseline addition (~2MB storage, ~30 seconds runtime).

---

### §2.3 WCAG 1.4.4 — 200% browser zoom test

**Goal**. Confirm that every text-heavy screen remains legible and in-flow when the user zooms the browser to 200% body text (WCAG 2.1 AA, §1.4.4 Resize Text).

**Why this phase owns it**. The rebuilt token system uses `rem`-based minimums inside every `clamp()` — this is the *mechanism* for 1.4.4 compliance. §2.3 is the *verification* that the mechanism works on real screens, not just in theory. Phases 1–4 could not verify this because they did not render any screens; Phase 5 can.

#### §2.3.1 Protocol

**Environment**: desktop Chromium with devtools open. Zoom is set via browser UI (Ctrl + +, or the Settings → Zoom slider) — NOT via devtools device emulation, which would scale the viewport instead of the text.

**Target screens** (the text-heavy ones):

| Screen | Why it matters |
|---|---|
| JoinScreen (phone, 375×667) | Most constrained text block — name field, instructions, lobby list |
| Lobby (phone, 375×667) | Player list can overflow vertically |
| PlayingView with 10-card Hand (phone, 375×667) | Hand + SmartActionBox + TitleBar + StatusBar all compete for height |
| CardDetailSheet (phone, 375×667) | Dense text block describing a card |
| EliminatedView (phone, 375×667) | Flavor line + alive-list |
| DefusePlacement sheet (phone, 375×667) | Instructional text |
| NameCard sheet (phone, 375×667) | Name selector + guess result |
| Lobby (board, 1280×800) | QR code + instructions |
| GameOver (board, 1280×800) | Winner + rankings list |

**Smallest viewport is the target** for each view — if 1.4.4 passes at 375×667 (phone) and 1280×800 (board), it passes at larger viewports by construction.

**Steps per screen**:

1. Navigate to the screen in Chromium devtools with the target viewport emulated.
2. Set browser zoom to **200%** via Ctrl + + (or Settings → Zoom → 200%). Note: this is page-level zoom, which is WCAG's definition of "text resize" in practice.
3. Verify:
   - **No horizontal scroll.** The page width should still fit the viewport width. If the viewport shows a horizontal scrollbar, the screen fails.
   - **All text is legible.** No text is clipped, truncated with ellipsis where it wasn't at 100%, or overlapping another element.
   - **All interactive elements remain tappable.** No button is pushed off-screen. No input is hidden behind a modal.
   - **Fluid `clamp()` floors engage.** The text should actually grow — if it doesn't, the `rem`-based floor is wrong.
4. Record pass/fail per row in `test/device-test/wcag-200-zoom-protocol.md` (new artifact).

#### §2.3.2 Acceptance thresholds

- [ ] All 9 target screens pass at 200% zoom at their smallest target viewport.
- [ ] Text grows visibly (evidence: screenshot at 100% + 200%).
- [ ] No horizontal scroll on any target screen at 200%.
- [ ] `wcag-200-zoom-protocol.md` committed with pass/fail marks + evidence screenshots.

**Failure modes** (and where the fix belongs):
- Horizontal scroll on `PlayingView`: likely `StagingArea` or `Hand` uses a fixed `width` instead of `max-width`. Fix: Phase 2 amendment to the offending `.module.css`.
- Text clipping on `CardDetailSheet`: `--size-content-narrow` token may be too narrow for 200% body. Fix: Phase 1 amendment to the token's clamp curve.
- Text overlap on `Lobby`: player list may lack sufficient line-height at fluid font sizes. Fix: Phase 2 amendment adding `line-height: 1.4` or similar.

Any fix lands as a dedicated commit under the phase that owns the file, not as a Phase 5 patch — Phase 5 documents the failure + the fix; the phase that authored the file owns the actual edit. This preserves phase ownership and keeps `git blame` clean.

---

### §2.4 CVD palette CI gate expansion

**Goal**. Expand `src/client/shared/tokens/__tests__/palette-cvd.test.ts` from the 5-pair Phase 1 starter list to the full set of critical semantic pairs, and lock the `MIN_DISTANCE` constant to the final value determined during Phase 1 execution.

**Why this phase owns it**. Phase 1 created `palette-cvd.test.ts` with a placeholder pair list and `MIN_DISTANCE = 0.15` marked "tuned in Phase 1 execution." Phase 1 execution settled on a final `MIN_DISTANCE` value after running the test against the committed palette; Phase 5 makes that value canonical and expands the coverage to every pair that matters in gameplay.

#### §2.4.1 Full critical-pair enumeration

The criticial-pair list is grouped by gameplay context. Every pair is a TSX or CSS consumer that a CVD-affected user must still distinguish to play the game fairly.

**Group A — Danger vs success (the most important CVD pair)**: these are the tokens that drive the red-vs-green contrast that protanopia and deuteranopia destroy without intervention.

| Pair | Label | Rationale |
|---|---|---|
| `color-accent-burned` × `color-accent-intercept` | Burned card vs Intercept card | The two card types whose meaning is carried by color — Burned = danger, Intercept = success |
| `color-fg-danger` × `color-fg-success` | Danger text vs success text | Secondary text uses these for feedback tone |
| `color-bg-danger` × `color-bg-success` | Danger bg vs success bg | SmartActionBox states (`drawIntense` vs `comboPair`/`comboTriple`) use these |
| `color-border-danger` × `color-border-success` | Danger border vs success border | Bottom sheets that vary border by validity state |
| `color-cordovan-9` × `color-emerald-9` | Primitive: cordovan solid vs emerald solid | The underlying primitive pair — all the above resolve to these |
| `color-cordovan-11` × `color-emerald-11` | Primitive: cordovan text vs emerald text | The text-tier version |

**Group B — Accent card-type differentiation**: each card type uses a distinct accent color, and a CVD-affected user must be able to distinguish them in the DrawPile / DiscardFan where multiple card types appear adjacent.

| Pair | Label |
|---|---|
| `color-accent-burned` × `color-accent-operative` | Burned vs operative cards |
| `color-accent-burned` × `color-accent-drama` | Burned vs drama accent (used in VICTORY overlay) |
| `color-accent-intercept` × `color-accent-operative` | Intercept vs operative |
| `color-accent-intercept` × `color-accent-drama` | Intercept vs drama |
| `color-accent-operative` × `color-accent-drama` | Operative (teal) vs drama (ochre) |

**Group C — Focus indicators**: the focus ring must remain visible against every interactive surface.

| Pair | Label |
|---|---|
| `color-border-focus` × `color-bg-app` | Focus ring on app surface |
| `color-border-focus` × `color-bg-surface` | Focus ring on elevated card |
| `color-border-focus` × `color-bg-interactive` | Focus ring on primary button |
| `color-border-focus` × `color-bg-danger` | Focus ring on danger button |
| `color-border-focus` × `color-bg-success` | Focus ring on success button |
| `color-border-focus` × `color-border-strong` | Focus ring vs static border |

**Group D — Feedback state pairs**: warnings, info, and other semantic states must be distinguishable from each other and from danger/success.

| Pair | Label |
|---|---|
| `color-bg-warning` × `color-bg-danger` | Warning vs danger |
| `color-bg-warning` × `color-bg-success` | Warning vs success |
| `color-bg-warning` × `color-bg-info` | Warning vs info |
| `color-bg-info` × `color-bg-interactive` | Info vs primary interactive |
| `color-fg-warning` × `color-fg-danger` | Warning text vs danger text |
| `color-fg-info` × `color-fg-success` | Info text vs success text |

**Group E — DramaOverlay variant backgrounds**: the five full-screen overlays must be distinguishable when a player glances at the screen mid-game.

| Pair | Label |
|---|---|
| `color-cordovan-9` × `color-teal-8` | BURNED vs EXTRACTED |
| `color-cordovan-9` × `color-charcoal-6` | BURNED vs ELIMINATED |
| `color-cordovan-9` × `color-emerald-8` | BURNED vs INTERCEPTED |
| `color-cordovan-9` × `color-ochre-9` | BURNED vs VICTORY |
| `color-teal-8` × `color-charcoal-6` | EXTRACTED vs ELIMINATED |
| `color-teal-8` × `color-emerald-8` | EXTRACTED vs INTERCEPTED |
| `color-teal-8` × `color-ochre-9` | EXTRACTED vs VICTORY |
| `color-charcoal-6` × `color-emerald-8` | ELIMINATED vs INTERCEPTED |
| `color-charcoal-6` × `color-ochre-9` | ELIMINATED vs VICTORY |
| `color-emerald-8` × `color-ochre-9` | INTERCEPTED vs VICTORY |

**Group F — Neon spot color vs surrounding surfaces**: the brand rose-neon accent must remain readable when used on the brand marque.

| Pair | Label |
|---|---|
| `color-rose-neon` × `color-bg-app` | Neon vs app background |
| `color-rose-neon` × `color-bg-surface` | Neon vs surface |
| `color-rose-neon-glow` × `color-rose-neon` | Glow vs base neon (the bloom pair) |

**Total expanded pair count**:

- Group A: 6 pairs
- Group B: 5 pairs
- Group C: 6 pairs
- Group D: 6 pairs
- Group E: 10 pairs
- Group F: 3 pairs

**Sum: 36 critical pairs** × 3 CVD simulations (deuteranopia, protanopia, tritanopia) = **108 CVD test cases**.

#### §2.4.2 Test file expansion

The Phase 1 file at `src/client/shared/tokens/__tests__/palette-cvd.test.ts` gets its `CRITICAL_PAIRS` constant replaced. The pair list is organized as `Array<[keyof typeof COLORS, keyof typeof COLORS, string]>` with human-readable labels for test output.

Final test file shape (replacing Phase 1's starter pair list):

```typescript
import { describe, it, expect } from 'vitest';
import {
  differenceEuclidean,
  parse,
  filterDeficiencyDeuter,  // B4 CORRECTION: `filter` does NOT exist in culori
  filterDeficiencyProt,    // Correct exports: filterDeficiency{Deuter,Prot,Trit}
  filterDeficiencyTrit,
} from 'culori';
import type { Color } from 'culori';
import { COLORS } from '../palette';

/** Phase 5 §2.4 — expanded from Phase 1 §2.7 starter list.
 *  Any new semantic pair that could carry meaning for CVD-affected players
 *  goes here. Distance threshold is tuned empirically per palette version and
 *  locked during Phase 5 execution.
 *
 *  B4 deepening: culori's CVD simulation functions are filterDeficiencyDeuter,
 *  filterDeficiencyProt, filterDeficiencyTrit (NOT a generic `filter` export).
 *  Severity parameter: 1 = full dichromacy, 0 = normal vision.
 *
 *  S2 deepening: Uses `differenceEuclidean('oklab')`, NOT `'oklch'`. OKLCh is
 *  cylindrical — hue (H) is an angle (0-360), so Euclidean distance treats
 *  H=1 and H=359 as distance 358 when the perceptual distance is 2. OKLab is
 *  Cartesian — Euclidean distance is the mathematically natural perceptual
 *  metric Bjorn Ottosson designed the space for. This also aligns with the CSS
 *  side (Phase 1 bans `color-mix(in oklch, ...)` and mandates `in oklab`).
 */
const CRITICAL_PAIRS: Array<[keyof typeof COLORS, keyof typeof COLORS, string]> = [
  // Group A — danger vs success (the red/green CVD problem)
  ['color-accent-burned',    'color-accent-intercept', 'Burned card vs Intercept card'],
  ['color-fg-danger',        'color-fg-success',       'danger text vs success text'],
  ['color-bg-danger',        'color-bg-success',       'danger bg vs success bg'],
  ['color-border-danger',    'color-border-success',   'danger border vs success border'],
  ['color-cordovan-9',       'color-emerald-9',        'primitive cordovan-9 vs emerald-9'],
  ['color-cordovan-11',      'color-emerald-11',       'primitive cordovan-11 vs emerald-11'],

  // Group B — accent card-type differentiation
  ['color-accent-burned',    'color-accent-operative', 'Burned vs operative cards'],
  ['color-accent-burned',    'color-accent-drama',     'Burned vs drama accent'],
  ['color-accent-intercept', 'color-accent-operative', 'Intercept vs operative'],
  ['color-accent-intercept', 'color-accent-drama',     'Intercept vs drama'],
  ['color-accent-operative', 'color-accent-drama',     'operative vs drama'],

  // Group C — focus ring visibility
  ['color-border-focus', 'color-bg-app',           'focus ring on app bg'],
  ['color-border-focus', 'color-bg-surface',       'focus ring on surface'],
  ['color-border-focus', 'color-bg-interactive',   'focus ring on primary button'],
  ['color-border-focus', 'color-bg-danger',        'focus ring on danger button'],
  ['color-border-focus', 'color-bg-success',       'focus ring on success button'],
  ['color-border-focus', 'color-border-strong',    'focus ring vs static border'],

  // Group D — feedback state pairs
  ['color-bg-warning',  'color-bg-danger',   'warning vs danger'],
  ['color-bg-warning',  'color-bg-success',  'warning vs success'],
  ['color-bg-warning',  'color-bg-info',     'warning vs info'],
  ['color-bg-info',     'color-bg-interactive', 'info vs primary interactive'],
  ['color-fg-warning',  'color-fg-danger',   'warning text vs danger text'],
  ['color-fg-info',     'color-fg-success',  'info text vs success text'],

  // Group E — DramaOverlay variant differentiation (5 × 4 / 2 = 10 pairs)
  ['color-cordovan-9', 'color-teal-8',      'BURNED vs EXTRACTED'],
  ['color-cordovan-9', 'color-charcoal-6',  'BURNED vs ELIMINATED'],
  ['color-cordovan-9', 'color-emerald-8',   'BURNED vs INTERCEPTED'],
  ['color-cordovan-9', 'color-ochre-9',     'BURNED vs VICTORY'],
  ['color-teal-8',     'color-charcoal-6',  'EXTRACTED vs ELIMINATED'],
  ['color-teal-8',     'color-emerald-8',   'EXTRACTED vs INTERCEPTED'],
  ['color-teal-8',     'color-ochre-9',     'EXTRACTED vs VICTORY'],
  ['color-charcoal-6', 'color-emerald-8',   'ELIMINATED vs INTERCEPTED'],
  ['color-charcoal-6', 'color-ochre-9',     'ELIMINATED vs VICTORY'],
  ['color-emerald-8',  'color-ochre-9',     'INTERCEPTED vs VICTORY'],

  // Group F — neon spot color
  ['color-rose-neon',      'color-bg-app',     'neon vs app bg'],
  ['color-rose-neon',      'color-bg-surface', 'neon vs surface'],
  ['color-rose-neon-glow', 'color-rose-neon',  'neon glow vs neon base'],
];

/** Threshold locked during Phase 5 execution.
 *  Phase 1 seeded this as 0.15 (approximate Oklch perceptual delta).
 *  Phase 5 re-tunes: run the test against every pair, record the minimum
 *  observed distance per CVD type, set MIN_DISTANCE to the smallest value
 *  that all 108 cases pass comfortably (floor is ~0.12 — below that the
 *  perceptual difference is unreliable, and the pair must be revisited at
 *  the Phase 1 palette level).
 */
const MIN_DISTANCE = 0.15; // ← Phase 5 locks the final number

// B4 CORRECTION: filterDeficiency{Deuter,Prot,Trit}(severity) — NOT filter()
const SIMULATIONS = [
  { name: 'deuteranopia', simulate: filterDeficiencyDeuter(1) },
  { name: 'protanopia',   simulate: filterDeficiencyProt(1) },
  { name: 'tritanopia',   simulate: filterDeficiencyTrit(1) },
];

// S2 CORRECTION: 'oklab' not 'oklch' — see module comment for rationale
const distance = differenceEuclidean('oklab');

describe('palette CVD legibility', () => {
  for (const [a, b, label] of CRITICAL_PAIRS) {
    for (const { name, simulate } of SIMULATIONS) {
      it(`${label} remains distinguishable under ${name}`, () => {
        // S9: parse() returns Color | undefined — guard required under strict TS
        const colorA = parse(COLORS[a]);
        const colorB = parse(COLORS[b]);
        if (!colorA || !colorB) throw new Error(`Failed to parse: ${a} or ${b}`);
        const simA = simulate(colorA);
        const simB = simulate(colorB);
        expect(distance(simA as Color, simB as Color), `${a} vs ${b} under ${name}`)
          .toBeGreaterThan(MIN_DISTANCE);
      });
    }
  }
});
```

#### §2.4.3 MIN_DISTANCE tuning protocol

Phase 5 runs the expanded pair list against the committed Phase 1 palette and records the minimum observed distance per CVD type across all 108 cases:

1. Check out the Phase 5 branch with the expanded pair list. `MIN_DISTANCE` starts at 0.0 (records all distances without failing).
2. Temporarily disable the `expect().toBeGreaterThan(MIN_DISTANCE)` and replace with a `console.log({ pair: label, sim: name, distance })` to dump every distance.
3. Run `pnpm test src/client/shared/tokens/__tests__/palette-cvd.test.ts`.
4. Collect the 108 distances into a table. Sort by distance.
5. The smallest observed distance is the floor. The recommended `MIN_DISTANCE` is **90% of the smallest observed** — this gives a small buffer so that future palette adjustments don't immediately break the gate.
6. If the smallest observed is **below 0.12**, the pair is too close and one of the two tokens must be adjusted at the Phase 1 palette level (amendment to `primitives.css`). §7.1 flags this as a feedback loop.
7. Restore the `expect()` call with the locked `MIN_DISTANCE`. Commit.

**Expected result**: Phase 1 palette with Dreamland extraction should pass comfortably at `MIN_DISTANCE ≥ 0.15`. The cordovan/emerald pair is the tightest because tritanopia affects that specific hue relationship. If the pair fails, Phase 1 pre-empts by bumping the emerald scale slightly toward forest-olive-9 (step 9 sits at ~`#437d68`, Phase 1's committed value). Phase 5 tuning determines whether that's enough.

#### §2.4.4 Acceptance thresholds

- [ ] `palette-cvd.test.ts` contains all 36 pairs from §2.4.1.
- [ ] `MIN_DISTANCE` is locked to the value determined by §2.4.3 tuning.
- [ ] `pnpm test palette-cvd` passes all 108 cases (36 pairs × 3 CVD types).
- [ ] If any pair fails, the fix lands in Phase 1 (`primitives.css` amendment), not in the test.
- [ ] Test file has a header comment with the locked `MIN_DISTANCE` rationale (one sentence + a reference to §2.4.3 tuning protocol).

---

### §2.5 WCAG 2.1 AA + APCA contrast CI gate expansion

**Goal**. Expand `src/client/shared/tokens/__tests__/palette-contrast.test.ts` to cover every semantic fg/bg pair, assert WCAG 2.1 ratio minimums, and assert APCA Lc minimums with a ≥60 floor on body text.

**Why this phase owns it**. Same pattern as §2.4 — Phase 1 seeded the file with 5 starter pairs; Phase 5 is the phase that expands coverage. The APCA Lc ≥60 body-text floor is called out explicitly in the TODO block as Phase 5's responsibility.

#### §2.5.1 Full fg/bg pair enumeration

**Group 1 — body text on surfaces**: the foundational case. Every text color × every surface it lands on.

| fg | bg | min WCAG | min APCA Lc | Role |
|---|---|---|---|---|
| `color-fg-primary`   | `color-bg-app`      | 7.0 | 75 | Primary body on app bg (AAA) |
| `color-fg-primary`   | `color-bg-surface`  | 7.0 | 75 | Primary body on card |
| `color-fg-primary`   | `color-bg-elevated` | 7.0 | 75 | Primary body on elevated surface |
| `color-fg-secondary` | `color-bg-app`      | 4.5 | 60 | Secondary on app bg (AA + APCA body floor) |
| `color-fg-secondary` | `color-bg-surface`  | 4.5 | 60 | Secondary on card |
| `color-fg-secondary` | `color-bg-elevated` | 4.5 | 60 | Secondary on elevated |
| `color-fg-muted`     | `color-bg-app`      | 3.0 | 45 | Muted text (large-text AA fallback) |
| `color-fg-muted`     | `color-bg-surface`  | 3.0 | 45 | Muted text on card |

**Group 2 — interactive state text**: button labels, menu items, links.

| fg | bg | min WCAG | min APCA Lc | Role |
|---|---|---|---|---|
| `color-fg-on-accent`    | `color-bg-interactive`       | 4.5 | 60 | Button label on primary button |
| `color-fg-on-accent`    | `color-bg-interactive-hover` | 4.5 | 60 | Button label on hovered primary |
| `color-fg-on-accent`    | `color-bg-interactive-active`| 4.5 | 60 | Button label on active primary |
| `color-fg-interactive`  | `color-bg-app`               | 4.5 | 60 | Link / tertiary action |
| `color-fg-interactive`  | `color-bg-surface`           | 4.5 | 60 | Link on card |
| `color-fg-disabled`     | `color-bg-surface`           | 3.0 | 45 | Disabled state — intentionally low contrast |

**Group 3 — feedback state text**: danger / success / warning / info text and their corresponding bg variants.

| fg | bg | min WCAG | min APCA Lc | Role |
|---|---|---|---|---|
| `color-fg-danger`  | `color-bg-app`    | 4.5 | 60 | Error message on app bg |
| `color-fg-danger`  | `color-bg-danger` | 4.5 | 60 | Self-contained danger notice (text on danger bg — must still read) |
| `color-fg-success` | `color-bg-app`    | 4.5 | 60 | Success message |
| `color-fg-success` | `color-bg-success`| 4.5 | 60 | Self-contained success notice |
| `color-fg-warning` | `color-bg-app`    | 4.5 | 60 | Warning message |
| `color-fg-warning` | `color-bg-warning`| 4.5 | 60 | Self-contained warning |
| `color-fg-info`    | `color-bg-app`    | 4.5 | 60 | Info message |
| `color-fg-info`    | `color-bg-info`   | 4.5 | 60 | Self-contained info |

**Group 4 — DramaOverlay hero text on variant backgrounds**: the text inside each drama overlay must read against its variant background at hero font size.

| fg | bg | min WCAG | min APCA Lc | Role |
|---|---|---|---|---|
| `color-cream-12`    | `color-cordovan-9`  | 4.5 | 60 | BURNED hero text on cordovan gradient center |
| `color-teal-12`     | `color-teal-8`      | 4.5 | 60 | EXTRACTED hero text on teal |
| `color-charcoal-11` | `color-charcoal-6`  | 4.5 | 60 | ELIMINATED subdued text on charcoal |
| `color-emerald-12`  | `color-emerald-8`   | 4.5 | 60 | INTERCEPTED hero text on emerald |
| `color-cream-12`    | `color-ochre-9`     | 4.5 | 60 | VICTORY victory text on ochre |

**Group 5 — Card face text on card face backgrounds**: the `MinimalCard` component renders card name + card type text on card-face backgrounds that inherit accent hues. Each card type × its face is a contrast pair.

| fg | bg | min WCAG | min APCA Lc | Role |
|---|---|---|---|---|
| `color-cream-12` | `color-accent-burned`    | 4.5 | 60 | Burned card face text |
| `color-cream-12` | `color-accent-intercept` | 4.5 | 60 | Intercept card face text |
| `color-cream-12` | `color-accent-operative` | 4.5 | 60 | Operative card face text |
| `color-cream-12` | `color-accent-drama`     | 4.5 | 60 | Drama-accent card face text |

**Total pair count**:

- Group 1: 8 pairs
- Group 2: 6 pairs
- Group 3: 8 pairs
- Group 4: 5 pairs
- Group 5: 4 pairs

**Sum: 31 semantic pairs** × 2 metrics (WCAG + APCA) = **62 contrast test cases**.

#### §2.5.2 Test file expansion

```typescript
import { describe, it, expect } from 'vitest';
import { wcagContrast, parse, converter } from 'culori';
import type { Rgb } from 'culori';
import { APCAcontrast, sRGBtoY } from 'apca-w3';
import { COLORS } from '../palette';

/** B5 CORRECTION: sRGBtoY expects [R, G, B] as 0-255 integers, NOT culori's
 *  { r, g, b, mode } with 0-1 floats. Passing a culori object produces silently
 *  wrong luminance values. This bridge converts culori → apca-w3 format. */
const toRgb = converter('rgb');
function culoriToAPCA(hexColor: string): number {
  const parsed = parse(hexColor);
  if (!parsed) throw new Error(`Failed to parse color: ${hexColor}`);
  const rgb = toRgb(parsed) as Rgb;
  return sRGBtoY([
    Math.round(rgb.r * 255),
    Math.round(rgb.g * 255),
    Math.round(rgb.b * 255),
  ]);
}

/** Phase 5 §2.5 — expanded from Phase 1 §2.7 starter list.
 *  Every fg/bg pair that renders body text or interactive label text in the
 *  rebuilt client. APCA Lc is the primary metric (per Radix Colors' 2023
 *  move); WCAG 2.1 ratios are the secondary metric for legacy compliance.
 *
 *  The APCA Lc ≥60 floor on body text is called out in the CSS Foundation
 *  Rebuild Plan roadmap §4.5 and re-asserted here. Lc 60 is APCA's body-text
 *  floor per the W3C draft — equivalent to ~WCAG 4.5:1 for typical pairs.
 */
type PairRow = [
  fg: keyof typeof COLORS,
  bg: keyof typeof COLORS,
  minWcagRatio: number,
  minApcaLc: number,
  label: string,
];

const FG_BG_PAIRS: PairRow[] = [
  // Group 1 — body text on surfaces
  ['color-fg-primary',   'color-bg-app',      7.0, 75, 'primary body on app bg (AAA)'],
  ['color-fg-primary',   'color-bg-surface',  7.0, 75, 'primary body on card'],
  ['color-fg-primary',   'color-bg-elevated', 7.0, 75, 'primary body on elevated'],
  ['color-fg-secondary', 'color-bg-app',      4.5, 60, 'secondary on app bg'],
  ['color-fg-secondary', 'color-bg-surface',  4.5, 60, 'secondary on card'],
  ['color-fg-secondary', 'color-bg-elevated', 4.5, 60, 'secondary on elevated'],
  ['color-fg-muted',     'color-bg-app',      3.0, 45, 'muted on app bg (large-text)'],
  ['color-fg-muted',     'color-bg-surface',  3.0, 45, 'muted on card (large-text)'],

  // Group 2 — interactive state text
  ['color-fg-on-accent',   'color-bg-interactive',        4.5, 60, 'button label on primary'],
  ['color-fg-on-accent',   'color-bg-interactive-hover',  4.5, 60, 'button label on hovered primary'],
  ['color-fg-on-accent',   'color-bg-interactive-active', 4.5, 60, 'button label on active primary'],
  ['color-fg-interactive', 'color-bg-app',                4.5, 60, 'link on app bg'],
  ['color-fg-interactive', 'color-bg-surface',            4.5, 60, 'link on card'],
  ['color-fg-disabled',    'color-bg-surface',            3.0, 45, 'disabled state (intentional low)'],

  // Group 3 — feedback state text
  ['color-fg-danger',  'color-bg-app',     4.5, 60, 'danger message on app'],
  ['color-fg-danger',  'color-bg-danger',  4.5, 60, 'danger notice (self-contained)'],
  ['color-fg-success', 'color-bg-app',     4.5, 60, 'success message on app'],
  ['color-fg-success', 'color-bg-success', 4.5, 60, 'success notice (self-contained)'],
  ['color-fg-warning', 'color-bg-app',     4.5, 60, 'warning message on app'],
  ['color-fg-warning', 'color-bg-warning', 4.5, 60, 'warning notice (self-contained)'],
  ['color-fg-info',    'color-bg-app',     4.5, 60, 'info message on app'],
  ['color-fg-info',    'color-bg-info',    4.5, 60, 'info notice (self-contained)'],

  // Group 4 — DramaOverlay hero text
  ['color-cream-12',    'color-cordovan-9', 4.5, 60, 'BURNED hero text'],
  ['color-teal-12',     'color-teal-8',     4.5, 60, 'EXTRACTED hero text'],
  ['color-charcoal-11', 'color-charcoal-6', 4.5, 60, 'ELIMINATED subdued text'],
  ['color-emerald-12',  'color-emerald-8',  4.5, 60, 'INTERCEPTED hero text'],
  ['color-cream-12',    'color-ochre-9',    4.5, 60, 'VICTORY text'],

  // Group 5 — MinimalCard face text
  ['color-cream-12', 'color-accent-burned',    4.5, 60, 'Burned card face'],
  ['color-cream-12', 'color-accent-intercept', 4.5, 60, 'Intercept card face'],
  ['color-cream-12', 'color-accent-operative', 4.5, 60, 'operative card face'],
  ['color-cream-12', 'color-accent-drama',     4.5, 60, 'drama-accent card face'],
];

describe('palette contrast — WCAG 2.1', () => {
  for (const [fg, bg, minWcag, , label] of FG_BG_PAIRS) {
    it(`${label}: ${fg} on ${bg} meets WCAG ${minWcag}:1`, () => {
      const ratio = wcagContrast(parse(COLORS[fg]), parse(COLORS[bg]));
      expect(ratio, `${fg} on ${bg}`).toBeGreaterThanOrEqual(minWcag);
    });
  }
});

describe('palette contrast — APCA', () => {
  for (const [fg, bg, , minApca, label] of FG_BG_PAIRS) {
    it(`${label}: ${fg} on ${bg} meets APCA Lc ${minApca}`, () => {
      // B5 CORRECTION: use culoriToAPCA bridge (sRGBtoY needs 0-255 integers)
      const fgY = culoriToAPCA(COLORS[fg]);
      const bgY = culoriToAPCA(COLORS[bg]);
      // Math.abs is correct: APCA returns signed Lc (positive = dark-on-light,
      // negative = light-on-dark). Absolute value is standard practice for
      // comparing against minimum thresholds per Myndex documentation.
      const lc = Math.abs(APCAcontrast(fgY, bgY));
      expect(lc, `${fg} on ${bg}`).toBeGreaterThanOrEqual(minApca);
    });
  }
});
```

#### §2.5.3 Tuning protocol — same shape as §2.4.3

When a pair fails:

1. First check whether the pair is a real consumer — if no component actually uses that fg/bg combo, delete the row (not every Group × Group combo is real).
2. If the pair is real, the fix is a Phase 1 palette amendment — bump the step number of the weaker side (e.g., `--color-fg-secondary` from `cream-11` to `cream-12`, or `--color-bg-danger` from `cordovan-3` to `cordovan-2`).
3. If the fg/bg pair is a self-contained feedback notice (Group 3 self-contained rows), the fg/bg relationship is structural — both sides come from the same scale. Fixing means widening the scale's step-to-step perceptual gap, which is a Phase 1 palette-level decision, not a Phase 5 test-file decision.

#### §2.5.4 Acceptance thresholds

- [ ] `palette-contrast.test.ts` contains all 31 pairs from §2.5.1.
- [ ] WCAG 2.1 ratio minimums pass for all 31 pairs (62 test cases across the two metric blocks).
- [ ] APCA Lc minimums pass for all 31 pairs.
- [ ] **APCA Lc ≥60 on every body-text pair** — Group 1 primary + secondary + Group 2 link + Group 3 notice rows all meet this floor. Explicitly asserted by the test runs.
- [ ] If any pair fails, the fix lands in Phase 1 (`primitives.css` or `semantic.css` amendment).

---

### §2.6 Full game loop test (spec §8.6)

**Goal**. A 5-player game from lobby to game-over, played through without developer intervention, covering every card type at least once, with elimination + reconnect verified. This is `PRODUCT-SPECIFICATION.md` §8.6 made operational.

**Why this phase owns it**. §8.6 is a full-stack integration test, not a unit test. It requires a live server + 5 real clients + a pace a human can follow. Automating it is out of scope (see §6); Phase 5 runs it as a human-executed protocol with a written script so pass/fail is unambiguous.

#### §2.6.1 Prerequisites

1. Phases 1–4 merged and all lower-level tests green.
2. §2.1 iOS 26 test complete (phone clients will be used in §2.6 and should have the fallback active if §2.1 failed).
3. Staging build deployed (Cloudflare Pages preview OR `pnpm dev`/`pnpm dev:server` + tunnel).
4. Five client devices — the minimum set:
   - 1 desktop browser on Briggsy's machine acting as the board view on TV (big screen).
   - 5 phone browsers — can be a mix of Briggsy's iPhone, Briggsy's laptop second browser window, second laptop if available, or 5 emulated phone contexts via Chromium devtools device-mode.
   - The minimum real hardware is "1 desktop for board + 1 iPhone for iOS 26 verification + 4 emulated phones for the remaining slots." Briggsy decides the exact mix.
5. Briggsy is both operator and player — he plays one of the 5 phone slots and manually drives the other 4 to step through the script.

#### §2.6.2 Game script — deck, hands, script beats

The script is authored to force every card type to appear at least once. Exploding Kittens' 17 card types in BURNED terms (full list per `docs/rules/RULES-REFERENCE.md`):

| # | Card | Burned name | Mechanic |
|---|---|---|---|
| 1 | Exploding Kitten | Burned | Draw it = eliminated unless Defused |
| 2 | Defuse | Extract | Save from Burned |
| 3 | Nope | Intercept | Cancel any action |
| 4 | Attack | Surveillance | Force next player to take 2 turns |
| 5 | Skip | Go Dark | Skip drawing a card |
| 6 | Favor | Favor | Force a player to give you a card |
| 7 | Shuffle | Shuffle | Shuffle draw pile |
| 8 | See the Future | Future Peek | View top 3 cards |
| 9 | Alter the Future | Alter Future | Rearrange top 3 cards |
| 10 | Draw from the Bottom | Back Channel | Draw from bottom of pile |
| 11 | Targeted Attack | Targeted Surveillance | Attack a specific player |
| 12–16 | 5 Cat cards | 5 Operatives (Dash, Vera, Otto, Janet, Neal) | Pair steal, triple name-steal |
| 17 | Feral Cat | Agent X | Wild operative, pairs with any |

**Script to force all 17**:

1. Use a stacked test deck via the dev-server `__test/stackDeck` endpoint (authored in Phase 5 §2.6.5 below if not already present). The endpoint takes an ordered array of card types for the top-N positions of the draw pile and shuffles the rest. Authoring an endpoint is acceptable here because:
   - It is NOT in production (`NODE_ENV === 'development'` guard).
   - It already has precedent from §2.2's fixture endpoint.
   - It enables deterministic coverage of every card type in one 15-minute session.

2. **Deck plan** (top 30 cards, rest shuffled):

   | Slot | Card | Covers mechanic |
   |---|---|---|
   | 1 | See the Future (Future Peek) | peek top 3 |
   | 2 | Shuffle | shuffle draw pile |
   | 3 | Alter the Future (Alter Future) | rearrange top 3 |
   | 4 | Skip (Go Dark) | skip drawing |
   | 5 | Attack (Surveillance) | force next player 2 turns |
   | 6 | Draw from Bottom (Back Channel) | draw from bottom |
   | 7 | Targeted Attack (Targeted Surveillance) | attack specific player |
   | 8 | Favor | force gift |
   | 9 | Cat (Dash) | pair-steal setup |
   | 10 | Cat (Dash) | complete the pair |
   | 11 | Cat (Vera) | triple-steal setup 1 |
   | 12 | Cat (Vera) | triple setup 2 |
   | 13 | Cat (Vera) | complete the triple (3-card name-steal) |
   | 14 | Feral Cat (Agent X) | wild operative pair |
   | 15 | Cat (Otto) | pair with Agent X |
   | 16 | Defuse (Extract) | defuse card for player 2 |
   | 17 | Exploding Kitten (Burned) | force elimination test |
   | 18 | Nope (Intercept) | cancel an action |
   | 19 | Defuse (Extract) | second defuse for later |
   | 20 | Exploding Kitten (Burned) | second Burned for the Nope chain demo |
   | 21 | Nope (Intercept) | noped again — multi-level chain |
   | 22 | Nope (Intercept) | third Nope — demonstrate chain depth |
   | 23–30 | mix of Cat + Skip + Favor | filler |

3. **Player setup**: 5 players — Briggsy + 4 other clients. Starting hand = 5 cards + 1 Defuse per spec §6.1. Player 3 is the "elimination victim" — the script guides them to burn out so `EliminatedView` captures in production conditions.

4. **Script beats** (condensed — full version lives in `test/game-loop/full-loop-protocol.md`):

   - **Beat 1** (turn 1, P1): Play See the Future → sheet opens with top 3 → dismiss.
   - **Beat 2** (turn 2, P2): Play Shuffle → deck shuffled (note: slot 3+ deck plan is now randomized; Briggsy re-stacks if needed via a second call to the endpoint).
   - **Beat 3** (turn 3, P3): Play Alter the Future → sheet opens with 3 cards, rearrange, dismiss.
   - **Beat 4** (turn 4, P4): Play Go Dark → skip draw.
   - **Beat 5** (turn 5, P5): Play Surveillance → P1's turn becomes 2 turns.
   - **Beat 6** (turn 6, P1): P1 plays Back Channel → draws from bottom of pile.
   - **Beat 7** (turn 7, P1's second): Play Targeted Surveillance → target P3.
   - **Beat 8** (turn 8, P3): P3 stuck with 2 turns. Plays Favor targeting P4 → P4 must give a card.
   - **Beat 9** (turn 9, P3's second): Plays pair-steal Dash+Dash → forces P5 to give a random card.
   - **Beat 10** (turn 10, P4): Plays triple-steal Vera+Vera+Vera → names a specific card, steals from P1 if P1 has it.
   - **Beat 11** (turn 11, P5): Plays Agent X + Otto pair-steal → wild-operative pair.
   - **Beat 12** (turn 12, P1): Plays Burned (from deck draw) — wait, P1 doesn't have Burned yet. Adjust: P3 draws Burned, plays Extract from hand — DramaOverlay.extracted fires.
   - **Beat 13** (turn 13, P3): P3 draws another Burned, has no Extract left — DramaOverlay.eliminated fires → `EliminatedView` renders on P3's phone.
   - **Beat 14** (turn 14, P4): P4 stages Burned they've been holding, plays it targeting P5. P5 plays Intercept (Nope). Verify NopeCountdownBar + DramaOverlay.intercepted.
   - **Beat 15** (turn 15, P5): P5 plays another Intercept on their own turn action. Server should reject with "self-intercept disallowed" per `docs/rules/RULES-REFERENCE.md` audit 2026-04-05. Verify error feedback.
   - **Beat 16** (turn 16, P1): Multi-level Nope chain — P1 plays any action, P2 Nopes, P4 Nopes the Nope, P5 Nopes the Nope-Nope. Chain depth 3. Verify NopeCountdownBar tracks depth, DramaOverlay fires on final resolution.
   - **Beat 17** (endgame): continue play until only 1 player remains — that's the winner. Verify `GameOver` screen with winner glow (land the §2.2.5 decision 1 outcome).

5. **Reconnect test** (interleave with normal play):
   - At Beat 8, P4 force-closes their browser tab.
   - P4 reopens the browser, navigates to the room URL, enters the same name.
   - Verify: P4 rejoins the same slot with the same hand + same turn state.
   - Verify: no ghost turn — the game state is exactly as P4 left it.

6. **Coverage checklist** (filled in at the end of the session):

   - [ ] All 17 card types appeared in the game.
   - [ ] DramaOverlay fired for BURNED, EXTRACTED, ELIMINATED, INTERCEPTED, and VICTORY (all five variants).
   - [ ] EliminatedView rendered on the eliminated player's phone.
   - [ ] GameOver rendered with the pending-decision-1 winner glow.
   - [ ] Nope chain depth ≥3 was resolved cleanly.
   - [ ] Pair-steal (2-card) and triple-steal (3-card name-card) both triggered.
   - [ ] Reconnect preserved hand + turn state.
   - [ ] Zero ghost turns observed.
   - [ ] Zero frozen states observed.
   - [ ] Zero desyncs between board view and phone views.

#### §2.6.3 Expected outcomes

- The game runs 15–25 minutes from lobby creation to `GameOver`.
- Every checklist item in §2.6.2 #6 passes.
- No console errors on any client or on the Durable Object.
- `pnpm test` remains green after the session (no accidentally-committed test state).

#### §2.6.4 Failure modes + triage

- **Card type not triggered**: re-stack the deck via `__test/stackDeck` with only the missing card in slot 1, run a short 2-turn session just to hit that card, record it separately, continue.
- **Desync between phone and board**: capture the Durable Object log, capture both clients' console logs, file as a Phase 5 bug. Fix belongs in `src/server/` (Phase 2–4 don't touch server code, so a fix here is scoped to `src/server/`).
- **Reconnect fails**: verify session token is in localStorage. If missing, the client has a cookie/storage regression — grep for the session-token key in `src/client/` to find where it went.
- **GameOver winner glow hue is wrong** (pending decision 1): pause the test, go to §2.2.5, make the decision, re-stack the deck, re-run Beats 13–17 only to capture the corrected winner glow.
- **NopeCountdownBar emerald reads wrong** (pending decision 2): same pattern — pause, decide, adjust, re-run Beats 14–16.

#### §2.6.5 `__test/stackDeck` dev-server endpoint

**New file**: `src/server/test-fixtures.ts` adds a second handler (first handler is §2.2's `handleFixtureSeed`):

```typescript
export async function handleStackDeck(request: Request, state: DurableObjectState) {
  if (import.meta.env.PROD) return new Response('Not Found', { status: 404 });
  const body = (await request.json()) as { room: string; topCards: CardType[] };
  const current = await state.storage.get<GameState>(`room:${body.room}`);
  if (!current) return new Response('Room not found', { status: 404 });
  const stacked = stackDeck(current, body.topCards);
  await state.storage.put(`room:${body.room}`, stacked);
  return new Response(JSON.stringify({ ok: true, topLen: body.topCards.length }), { status: 200 });
}

function stackDeck(state: GameState, topCards: CardType[]): GameState {
  // Non-mutating: return a new state with `drawPile` replaced — topCards on top,
  // the rest of the existing drawPile minus any cards that were already at those
  // slot indices, re-shuffled to the bottom.
  const remaining = state.drawPile.filter(c => !topCards.includes(c));
  return {
    ...state,
    drawPile: [...topCards, ...remaining],
  };
}
```

**Security note (B2 CORRECTION — triple-confirmed by Vite research, architecture-strategist, security-sentinel)**:

The original plan used `import.meta.env.PROD` / `import.meta.env.DEV` for both gates. **This does NOT work.** `import.meta.env` is a Vite-specific compile-time constant. Server code (`src/server/`) is bundled by **Wrangler** (esbuild), NOT Vite. `wrangler.jsonc` has `"main": "src/server/room.ts"` — Wrangler is the entry point bundler for all server code.

Without explicit configuration, `import.meta.env.PROD` evaluates to `undefined` (falsy) in the Wrangler build. The handler-level `if (import.meta.env.PROD) return 404` check would be SKIPPED — the handler body EXECUTES in production. Both gates use the same broken mechanism, making this NOT true defense-in-depth.

**Corrected dual-gate approach (two independent mechanisms):**

**Gate 1 (build-time — code elimination via Wrangler `define`):**

Add to `wrangler.jsonc`:
```jsonc
{
  "define": {
    "__DEV__": "false"
  }
}
```

Override in `package.json` dev script:
```json
"dev:server": "wrangler dev --ip 0.0.0.0 --port 8787 --define __DEV__:true"
```

Use `__DEV__` (not `import.meta.env.DEV`) in server code:
```typescript
declare const __DEV__: boolean;

// Gate 1: build-time — entire block removed in production
if (__DEV__) {
  registerTestRoutes();
}
```

**Gate 2 (runtime — independent mechanism via Wrangler `[vars]`):**

Add to `wrangler.jsonc`:
```jsonc
{
  "vars": {
    "ENVIRONMENT": "production"
  }
}
```

Inside each handler:
```typescript
export async function handleFixtureSeed(request: Request, env: Env) {
  // Gate 2: runtime — defense against build misconfiguration
  if (env.ENVIRONMENT !== 'development') {
    return new Response('Not Found', { status: 404 });
  }
  // ... handler body
}
```

**CI verification step (belt-and-suspenders):** After `pnpm build` and `wrangler deploy --dry-run`, grep the output bundle for `__test`, `handleFixtureSeed`, `handleStackDeck`. If found, fail the deploy. Add to §3 Step 22.

**Fixture endpoint architecture correction (B3 — architecture-strategist, kieran-typescript-reviewer):**

The original plan's `handleFixtureSeed(request, state: DurableObjectState)` signature assumed direct DO storage access from the HTTP handler. This is wrong — the worker entry point has `env.GameRoom` (the DO namespace), not a DO instance's storage. The corrected architecture:

1. Worker-level `fetch` handler intercepts `/__test/*` routes BEFORE `routePartykitRequest`:
```typescript
// src/server/room.ts — worker entry modification
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (__DEV__) {
      const url = new URL(request.url);
      if (url.pathname.startsWith('/__test/')) {
        return handleTestRoute(request, env);
      }
    }
    return (
      (await routePartykitRequest(request, env)) ||
      new Response('Not Found', { status: 404 })
    );
  },
}
```

2. `handleTestRoute` gets the target DO stub and forwards:
```typescript
async function handleTestRoute(request: Request, env: Env): Promise<Response> {
  if (env.ENVIRONMENT !== 'development') {
    return new Response('Not Found', { status: 404 });
  }
  const body = TestRouteSchema.parse(await request.json()); // Zod validated
  const id = env.GameRoom.idFromName(body.room);
  const stub = env.GameRoom.get(id);
  // Forward as an internal request to the DO instance
  return stub.fetch(new Request('http://internal/__test/seed', {
    method: 'POST',
    body: JSON.stringify(body),
  }));
}
```

3. The DO class handles the seed via `onRequest` or a custom HTTP path — it has access to `this.ctx.storage` (the actual storage API).

**Storage key correction (B3):** The original `room:${body.room}` key does not match the DO's actual format. The DO stores under flat keys: `gameState`, `playerSessions`, `playerNames`, `playerColors`, `lastActionTime`. The fixture endpoint must write to these SAME keys.

#### §2.6.6 Acceptance thresholds

- [ ] `test/game-loop/full-loop-protocol.md` authored with the full script + checklist.
- [ ] `src/server/test-fixtures.ts` `handleStackDeck` handler landed (dev-only).
- [ ] `src/server/room.ts` test-route registration behind `import.meta.env.DEV` gate.
- [ ] Briggsy runs the protocol end-to-end. Checklist §2.6.2 #6 fully passes.
- [ ] Results appended to `full-loop-protocol.md` with timestamp + any bugs filed.
- [ ] Any bugs triaged per §2.6.4 and fixed before Phase 5 proceeds to §2.7.

---

### §2.7 First-time player test (spec §8.7 — the final quality gate)

**Goal**. Convert `PRODUCT-SPECIFICATION.md` §8.7 into a concrete recruitment + observation + pass/fail protocol. A first-time player who has never seen BURNED plays a full game; they pass the test by saying, unprompted, something like *"wait — did Archer and company release this?"*.

**Why this phase owns it**. §8.7 is the final quality gate of the entire CSS Foundation Rebuild. It is intentionally the **only** Phase 5 step that blocks on external humans. The gate cannot be automated because the pass condition is a subjective reaction to the visual quality — exactly the reaction that the Archer quality bar was written to produce.

#### §2.7.1 Recruitment criteria

**Who qualifies as a "first-time player"**:
- Has never seen BURNED play through (not even over Briggsy's shoulder).
- Has never read BURNED code or docs.
- Has seen at least one episode of Archer (familiarity with the visual vocabulary is needed for the pass condition to be meaningful — a player who has no Archer context has no frame of reference to say "this looks like Archer").
- Willing to play a 15–30 minute game with minimal coaching.
- Not a senior UX designer or motion engineer (they will review the implementation and give technically-useful but emotionally-flat feedback). Casual gamer or non-gamer is ideal — the test is about presentation, not mechanics.

**Who does NOT qualify**:
- Anyone who has already played Exploding Kittens (the physical game) — they will frame reactions around "this is Exploding Kittens reskinned" rather than "wait, is this Archer?". A player who has played EK can still be a *secondary* tester but doesn't count for §8.7 pass.
- Anyone who has been pulled into BURNED development discussions before (family members who saw screenshots on Briggsy's TV last weekend are disqualified unless they only saw a pre-rebuild version).

**Ideal candidate**: someone who has watched Archer episodically, never heard of BURNED, and will casually pick up a phone when asked "want to try a game?". Briggsy identifies candidates from friends / family / gaming acquaintances. `TODO.md` §1 already flags "Briggsy recruits a friend" as the blocking action.

#### §2.7.2 Test setup

1. **Environment**: Briggsy's home setup — TV displaying the board view at 1920×1080 or higher, 4 phones on the coffee table (one for the tester + three for Briggsy + any other players Briggsy pulls in to fill the room).
2. **Game room count**: minimum 4 players for a meaningful game (5 is better for `§8.6` coverage, but the first-time test only needs enough players for the tester to experience multi-player dynamics — 3v1 is fine, 2v1 is too sparse).
3. **Briggsy's role**: play as one of the players + answer mechanical questions ("how does Favor work?") but NEVER prompt reactions ("don't you think this looks great?"). The test is about unprompted reactions.
4. **Staging build**: same build that passed §2.1 (iOS 26), §2.2 (visual regression), §2.3 (200% zoom), and §2.6 (full game loop). Phase 5 fails if §2.7 runs on a build that hasn't cleared the earlier gates.
5. **Recording**: with the tester's consent, Briggsy records the session on a phone camera positioned to capture the TV + the tester's phone screen. Recording is for Phase 5 evidence, not public release — stored at `test/first-player/evidence/<session-date>.mov` and gitignored (video is not committed; only timestamped notes are).

#### §2.7.3 Observation protocol

The test runs as a normal game — no special instrumentation. Briggsy takes written notes (or a second person takes notes if available) on:

1. **First-screen reaction**: what does the tester say when they see the board view on the TV for the first time? Record verbatim.
2. **First phone interaction**: what do they say when they open the player URL on their phone? Record verbatim.
3. **First card draw**: what do they say? Record verbatim.
4. **First DramaOverlay they trigger**: what do they say? (This is one of the most high-signal moments — the drama overlays are the clearest "this looks like Archer" touchpoint.)
5. **Eliminated reaction** (if they get burned): what do they say when EliminatedView appears?
6. **Mid-game questions**: record what they ask about mechanics. These are signals for the future Phase 6 (HOW-TO-PLAY doc), not for §8.7 pass/fail.
7. **End-of-game reaction**: what do they say when GameOver renders?
8. **Post-game unprompted comment**: after the game ends, Briggsy asks one question: *"What did you think?"* Record verbatim.

**Notes go in** `test/first-player/protocol.md` under a `## Session <date>` heading. Keep verbatim quotes in blockquote format so the raw data is preserved; Briggsy can add interpretation afterward.

#### §2.7.4 Pass / fail criteria

**PASS condition**: at any point during the session — BEFORE the post-game question — the tester says one of (or some close variant of):

- *"Wait — did Archer and company release this?"*
- *"Is this a real Archer game?"*
- *"Where can I download this?"*
- *"This feels like a commercial app."*
- *"This looks like Archer."* (spontaneous, unprompted)
- *"Is this official?"*
- *"Holy shit, this is slick."* (unambiguously positive, specifically about the look, unprompted)

The unifying property: **the tester treats the quality as unexpected for a side-project**. If they are surprised the game isn't a commercial product, that's a pass.

**FAIL condition**: the tester's reactions are in the "polite hobbyist project" register. Specifically:

- *"Cool, you built this?"* (polite, no positive quality signal)
- *"Haha nice."* (generic, conveying no specific impression)
- *"It works!"* (technical-success framing, not quality framing)
- No unprompted reference to Archer OR visual quality throughout the session.
- Mechanical engagement is fine (they play the game cleanly), but there is no "this looks like a commercial product" moment.

**AMBIGUOUS** (retry with a second tester): the session produces one passing reaction + several hedging reactions. Not clear signal. Run with a second first-time player before deciding.

#### §2.7.5 What to do if we fail

Spec §8.7: *"If we fail this test, we fix the visuals and retest. No exceptions."*

**Failure response workflow**:

1. Re-read the notes. Identify what specifically failed to land — palette, motion, typography, layout, copy, all of the above?
2. If the failure points at a specific subsystem (e.g., "the DramaOverlay didn't feel cinematic"), re-open the owning phase file and amend.
3. If the failure is diffuse ("it just feels flat"), the issue is likely the palette or the typography — the two highest-signal visual layers.
4. Land the fix as a Phase 5 amendment (new commit). Re-run §2.2 Playwright matrix to re-baseline. Re-run §2.7 with a **different** first-time player (a tester who has seen the failed version has contaminated signal).
5. No limit on retries — §2.7 is the final gate and retrying is the correct response to a fail.

**Blocking warning**: if §2.7 retries exceed 3 attempts, Phase 5 execution stops and Briggsy + Claude do a root-cause analysis session to find the systematic issue. Root causes at that scale are usually one of: palette is wrong, motion is wrong, or the copy voice doesn't match the visual voice. These are not surface fixes.

#### §2.7.6 Acceptance thresholds

- [ ] `test/first-player/protocol.md` authored with recruitment criteria, setup, observation, pass/fail, retry policy.
- [ ] Briggsy recruits at least one qualifying first-time player.
- [ ] Session runs end-to-end.
- [ ] Session notes committed to `protocol.md`.
- [ ] Session reaches PASS condition per §2.7.4.
- [ ] If FAIL, retries with different testers until PASS. Retry count documented.

**Phase 5 completion is gated on this step.** §2.8 documentation pass depends on §2.7 passing (because the spec §8 checkboxes are only flipped after §8.7 passes).

---

### §2.8 Documentation pass

**Goal**. Update the consumer-facing docs + the spec's §8 checkboxes to reflect the completed rebuild. This is the final artifact of Phase 5, committed after §2.1 through §2.7 all pass.

**Why this phase owns it**. The spec's §8 acceptance criteria checkboxes are the only part of the spec that is NOT locked — they get flipped as work lands. Phase 5 is the phase in which enough work lands for §8.1, §8.2, §8.3 (partial), §8.4, §8.6, §8.7 to flip. `README.md` + `TODO.md` also get their final "rebuild complete" updates.

#### §2.8.1 `docs/specifications/PRODUCT-SPECIFICATION.md` §8 updates

The spec is LOCKED on §1–§7. Only §8 acceptance criteria checkboxes are editable. Phase 5 flips the following (contingent on the corresponding §2.X step passing):

**§8.1 — Phone controller** **(S18: add "dark mode only" qualifier to visual checkboxes)**:
- [ ] "Every screen passes the Archer test. Screenshots taken via Playwright at [viewports]. Manually compared against Archer reference frames. **Verified under dark mode only (light mode deferred per CSS Foundation Rebuild Plan §6).**" → flipped on §2.2 + §2.7 pass.
- [ ] "No layout breaks across the full target device range." → flipped on §2.2 + §2.3 pass.
- [ ] "Token system from the CSS Foundation Rebuild Plan is live. Every dimension traces to a token. Zero hardcoded pixel values." → flipped on Phase 1–4 completion; Phase 5 verifies via a grep sweep in §2.8.4.
- [ ] Functional checklist items (all 17 card types, 7 bottom sheets, optimistic updates, reconnection) → flipped on §2.6 pass.
- [ ] "EliminatedView shows corrected spy-tone copy from §6.4 retheme gaps." → flipped on Phase 2 execution (the retheme lives in Phase 2 §2.3.9a).
- [ ] Technical checklist (bundle ≤100KB, no `motion` imports, no `console.log`) → flipped on §2.8.3 final bundle audit.

**§8.2 — Board view**:
- [ ] "Every screen passes the Archer test." → flipped on §2.2 + §2.7 pass.
- [ ] "No dead void space — player ring, draw/discard piles, and arena fill the screen at every supported size." → flipped on §2.2 board-viewport captures.
- [ ] "`feltBranding` replaced with Archer/Pendleton branding (from §6.4)." → flipped on Phase 3 execution (Phase 3 §2.7 edit).
- [ ] "Card animations land in the arena with dramatic presentation." → flipped on §2.7 passing with the tester noting the drama.
- [ ] Functional checklist (QR/room code legible, player ring live, intercept countdown, announcement feed, drama overlay triggers) → flipped on §2.6 pass.

**§8.3 — Documentation**:
- **NOT flipped by Phase 5** in full: §8.3 specifies a HOW-TO-PLAY doc at UMB's bar ("that doc alone could win an award"). That work is **not** in scope for the CSS Foundation Rebuild — it's a follow-on step. Phase 5 flips only:
  - [ ] `README.md` reflects current state of the project. → flipped on §2.8.2 README update.
  - [ ] `CLAUDE.md` references `docs/specifications/PRODUCT-SPECIFICATION.md` as the canonical contract. → already flipped pre-Phase-5; Phase 5 verifies.
  - [x] `docs/ideation/*.md` and `docs/brainstorms/*.md` each carry a SUPERSEDED banner. → already checked.
- The HOW-TO-PLAY doc and the remaining §8.3 items stay unchecked until the follow-on HOW-TO-PLAY work happens.

**§8.4 — Retheme completeness**:
- [ ] "All §6.4 Tier 1 gaps fixed." → flipped on Phase 2 §2.3.9a + Phase 3 §2.7 execution.
- [ ] "All §6.4 Tier 2 gaps fixed." → **NOT flipped by Phase 5**. Tier 2 is `TODO.md` §3 (non-blocking code-clarity cleanup), and is separate from the CSS Foundation Rebuild. Phase 5 does not execute Tier 2 work.
- [ ] "§6.4 Tier 3 state machine 'defuse' language documented as intentional." → already checked (spec §6.4 Tier 3 documents it).
- [ ] "Fresh retheme grep returns zero Tier 1 hits on a full source scan." → flipped on §2.8.4 grep sweep.

**§8.5 — Deploy**: Phase 5 does **not** deploy. All 5 checkboxes stay unchecked. `TODO.md` §5 is the deploy step.

**§8.6 — Full game loop**: every checkbox flips on §2.6 pass.

**§8.7 — First-time player test**: checkbox flips on §2.7 pass.

#### §2.8.2 `README.md` updates

**What to write**:
- Project status: change from "ALL 6 PHASES COMPLETE, rebuild in progress" or similar to "CSS Foundation Rebuild complete; deploy pending."
- Bundle size table: update with the post-rebuild numbers from §2.8.3.
- Test count: update with the post-rebuild test count (167 baseline + new Vitest tests added by Phase 1 §2.7 and Phase 5 §2.4 + §2.5 expansions + Playwright visual regression count).
- Visual section: one paragraph describing the new token system, linking to `docs/plans/css-foundation-rebuild/roadmap.md` and the spec.
- Getting started: verify commands still work (`pnpm install`, `pnpm dev`, `pnpm dev:server`, `pnpm test`, `pnpm test:visual`).

**What NOT to write**: no trailer links, no marketing copy, no future-tense roadmap. README is current state, not marketing.

#### §2.8.3 Final bundle size report

Run `pnpm build` on a clean checkout. Capture the chunk report from Vite. Format as a table for both `README.md` and `docs/plans/css-foundation-rebuild/roadmap.md` §8 (the Bundle Budget tracking section):

| Chunk | Raw | Gzipped | Delta vs pre-rebuild |
|---|---|---|---|
| player entry | ? | ? | ±? bytes |
| board entry | ? | ? | ±? bytes |
| shared (React + Motion core) | ? | ? | ±? |
| VisualElement | ? | ? | ±? |
| motion-features (domMax) | ? | ? | ±? |

**Budget constraint**: phone entry ≤100KB gzipped. If the post-rebuild number is over, Phase 5 STOPS and triages before committing.

**Expected deltas** (based on Phase-N §8 bundle budget sections):
- Phase 1: +~5KB (tokens + font loader)
- Phase 2: ±0 (rewrites are net-neutral or slight reduction from deletions — TurnBanner, NopeButton, InterceptButton delete)
- Phase 3: ±0 (same — board file rewrites are content-neutral)
- Phase 4: −360 bytes (per Phase 4 §8.3 net delta)
- Phase 5 iOS 26 fallback (conditional): +~330 bytes if landed
- Phase 5 adds no production code otherwise.

**Net expected**: +4–5KB total. Phone entry: ~95KB baseline → ~99KB post-rebuild. Still under 100KB, with ≤1KB headroom. Phase 5 stops if the real measurement is tighter than expected.

#### §2.8.4 Retheme grep sweep (§8.4 verification)

**Grep commands** (run from repo root via the Grep tool — no shell grep):

1. `EK` uppercase standalone → should return zero hits in `src/` outside intentional state-machine domain language (`defuse-*` phase strings — §6.4 Tier 3 documents these as intentional).
2. `Exploding Kitten[s]?` (the physical game's full name) → zero hits in `src/` and zero hits in user-facing strings (`EliminatedView.tsx`, `JoinScreen.tsx`, etc.).
3. `exploding.?kittens?` case-insensitive → same zero-hit expectation.
4. `You Exploded!` → zero hits (Phase 2 §2.3.9a replaces this with `"You're Burned."`).
5. `feltBranding` comment `EK identity` → zero hits (Phase 3 §2.7 retheme).
6. `EK_REVEAL_MS|EK_RELIEF_MS|EK_ELIMINATION_MS` → zero hits **only if** `TODO.md` §3 Tier 2 cleanup has landed; otherwise these are expected survivors. Phase 5 does NOT block on Tier 2 — the grep reports the state, and if the identifiers are still there, §8.4 Tier 2 stays unchecked.
7. **(S17 deepening)** `console\.log` in `src/` excluding test files → zero hits in production code. Spec §8.1 Technical requires "No `console.log` in production build." This check was missing from the draft.
8. **(S12 deepening)** `__test|handleFixtureSeed|handleStackDeck` in the **production build output** (after `pnpm build` + `wrangler deploy --dry-run`) → zero hits. Verifies that dev-only fixture endpoints are tree-shaken from the production bundle. This is the CI verification step for the B2 Wrangler define config fix.

**Grep sweep artifact**: record the results in `test/retheme-grep-sweep.md` (new file). If any hit surfaces that is NOT in the documented-intentional list, triage before flipping the §8.4 Tier 1 checkbox.

#### §2.8.5 `.gitignore` addition (conditional on public repo)

Phase 1 §4.4 and `TODO.md` Landmines flag `docs/plans/css-foundation-rebuild/dreamland-reference/images/` as fair-use fan-uploaded Archer Wiki captures — allowed for internal palette research, NOT allowed for publishing.

**Current repo state**: private. The images are committed and safe.

**If repo goes public**: add `docs/plans/css-foundation-rebuild/dreamland-reference/images/` to `.gitignore` BEFORE the repo is flipped to public. The images are already in git history, so a public flip also requires `git filter-repo` to purge them from history. That is a deploy-time concern handled by `TODO.md` §5.

**Phase 5 action**: document the `.gitignore` line + the `git filter-repo` incantation in `test/public-repo-prep.md` (new file, one-page checklist). Phase 5 does NOT flip the repo to public.

Checklist file content (referenced, not duplicated here):

```
Pre-public-flip checklist:
1. Add to .gitignore:
     docs/plans/css-foundation-rebuild/dreamland-reference/images/
2. Purge existing commits:
     git filter-repo --path docs/plans/css-foundation-rebuild/dreamland-reference/images/ --invert-paths
3. Force-push the cleaned history (only after confirming with Briggsy).
4. Verify the images directory is empty on the public clone.
```

#### §2.8.6 `TODO.md` updates

Convert the current `TODO.md` §1 "CSS Foundation Rebuild Plan (IN PROGRESS)" to "CSS Foundation Rebuild Plan — COMPLETE" with all 5 phases checked. Move the "Next Steps" to §5 (deploy), §6 (§8.6 verified), §7 (§8.7 verified) — these become the new top of the backlog.

**New `TODO.md` §1** (post Phase 5):
- CSS Foundation Rebuild Plan (COMPLETE)
  - ✅ roadmap
  - ✅ phase-1-foundation (token system, CVD gate, contrast gate)
  - ✅ phase-2-phone-view-migration
  - ✅ phase-3-board-view-migration
  - ✅ phase-4-motion-consolidation
  - ✅ phase-5-verification-acceptance

**New `TODO.md` §2** (next work): Cloudflare deploy.

Landmines section: remove landmines that Phase 5 resolved (the iOS 26 regression is either confirmed and fallbacked, or refuted — in either case it's no longer a landmine). Keep landmines that are still live (Dreamland fair-use, Framer Motion transition.duration type, etc.).

#### §2.8.7 `roadmap.md` final annotation

Add a `§11 — Phase 5 Results` section at the bottom of `docs/plans/css-foundation-rebuild/roadmap.md`:

```markdown
## §11 — Phase 5 Results (post-completion annotation)

**iOS 26 real-device test**: [PASS | PASS with fallback active | FAIL]
- Build string: <iOS version>
- Fallback landed: [yes/no]

**Playwright visual regression**: [PASS]
- 184 baselines committed
- CI integration: [active/deferred]

**Pending decisions resolved**:
- GameOver winner glow: <final token>
- NopeCountdownBar emerald: <final token>
- Font: Clash Display | Baveuse

**CVD CI gate**: [PASS]
- Final MIN_DISTANCE: <value>
- Pair count: 36 × 3 CVD types = 108 cases

**Contrast CI gate**: [PASS]
- Pair count: 31 × 2 metrics = 62 cases
- APCA Lc ≥60 body-text floor: [PASS]

**Full game loop (§8.6)**: [PASS]
- Duration: <minutes>
- All 17 card types triggered

**First-time player (§8.7)**: [PASS after <N> sessions]
- Tester quote: <verbatim>

**Final bundle size**: phone entry = <KB> gzipped (budget 100KB)

**Phase 5 complete**: <commit SHA>
```

This annotation is the historical record — it's the summary Briggsy or a future Claude reads to understand what actually happened during Phase 5 execution.

#### §2.8.8 Acceptance thresholds

- [ ] All §8.1 phone checkboxes in the spec flipped per §2.8.1 mapping.
- [ ] All §8.2 board checkboxes flipped.
- [ ] §8.3 `README.md` + `CLAUDE.md` checkboxes flipped; HOW-TO-PLAY checkboxes explicitly LEFT unchecked with a note that they are follow-on work.
- [ ] §8.4 Tier 1 + §8.4 Tier 3 checkboxes flipped; §8.4 Tier 2 deferred to `TODO.md` §3.
- [ ] §8.6 full-loop checkboxes flipped.
- [ ] §8.7 first-time-player checkbox flipped.
- [ ] `README.md` updated with post-rebuild state + final bundle table.
- [ ] `TODO.md` updated to "CSS Foundation Rebuild Plan COMPLETE."
- [ ] `roadmap.md` §11 annotation added with the Phase 5 results summary.
- [ ] `test/public-repo-prep.md` committed with the `.gitignore` + filter-repo checklist.
- [ ] `test/retheme-grep-sweep.md` committed with zero-Tier-1-hit confirmation.

---

## §3 — Step-by-Step Execution Order

Phase 5 is ~20 steps, organized so that the long-running or human-dependent steps (§2.1 iOS device, §2.7 first-time player) are scheduled as late as possible and the automation-first steps (§2.4, §2.5) run first. Each step ends at a commit point unless explicitly marked as a protocol run (no code to commit).

**Prerequisite**: Phases 1, 2, 3, and 4 all merged to `main` with their respective `css-foundation-phase-N-complete` tags. `pnpm test` + `pnpm typecheck` + `pnpm lint` + `pnpm build` all clean on `main` before Phase 5 starts.

**Step 1** — Verify prerequisites. Run:
- `git log --oneline main | head -20` — confirm Phase 4 completion tag exists.
- `pnpm test` — baseline 167+ tests green.
- `pnpm typecheck` — clean.
- `pnpm lint` — clean.
- `pnpm build` — phone entry ≤100KB gzipped pre-Phase-5.
If any fails, STOP and resolve before starting Phase 5.

**Step 2** — Install Playwright. Run `pnpm add -D @playwright/test` + `pnpm exec playwright install chromium`. Commit: `chore(deps): add @playwright/test for visual regression matrix`.

**Step 3** — Author `playwright.config.ts` per §2.2.1. Author `test/visual-regression/helpers/viewport-profiles.ts` + `fixtures.ts` skeletons (empty fixture bodies — filled in by Step 5). Commit: `feat(test): scaffold Playwright visual regression harness`.

**Step 4** — Author the dev-server fixture endpoint `src/server/test-fixtures.ts` with `handleFixtureSeed` + `handleStackDeck` handlers per §2.2.4 + §2.6.5. Wire into `src/server/room.ts` behind `import.meta.env.DEV` gate. Run `pnpm test` + `pnpm typecheck` — test-fixtures module should NOT be in production build. Commit: `feat(server): dev-only test fixture endpoints for Phase 5 visual regression + game loop`.

**Step 5** — Author literal `GameState` fixtures in `test/visual-regression/fixtures.ts` for every SmartActionBox state, every bottom sheet, every DramaOverlay variant, every lobby population, and EliminatedView. Commit: `feat(test): author literal GameState fixtures for visual regression`.

**Step 6** — Author `test/visual-regression/phone.spec.ts` with all 32 phone screen captures × 4 phone viewports (128 tests). (S5: +2 screens — ProtocolMismatch + NoRoomCode.) Run `pnpm test:visual --project=chromium phone.spec.ts --update-snapshots` to generate the initial baselines. **DO NOT commit baselines yet** — Step 9 runs the visual review that may change them.

**Step 7** — Author `test/visual-regression/board.spec.ts` with all 14 board screen captures × 4 board viewports (56 tests). Generate initial baselines. Still do not commit.

**Step 8** — Expand `src/client/shared/tokens/__tests__/palette-cvd.test.ts` per §2.4.2 (36 pairs). Run `pnpm test palette-cvd` and record the minimum observed distance per CVD type. Set `MIN_DISTANCE` per §2.4.3. Re-run — must be all green. Commit: `feat(test): expand palette-cvd.test.ts to 36 critical pairs + lock MIN_DISTANCE`.

**Step 9** — Expand `src/client/shared/tokens/__tests__/palette-contrast.test.ts` per §2.5.2 (31 pairs × 2 metrics). Run `pnpm test palette-contrast`. Any failure → fix at Phase 1 palette level (dedicated commit), re-run test, then continue. Commit: `feat(test): expand palette-contrast.test.ts to 31 semantic pairs + APCA Lc ≥60 body floor`.

**Step 10** — **Visual review meeting per §2.2.5**. This is a human step with Briggsy at the terminal + the generated baseline PNGs + the Dreamland reference frames. Decisions landed:
1. GameOver winner glow hue → `decisions.md` + `semantic.css` one-line edit if changed.
2. NopeCountdownBar emerald saturation → same.
3. Baveuse font → `primitives.css` one-line + `fonts.css` `@font-face` if Baveuse purchased.
Each decision that changes a value → dedicated commit for the edit + `pnpm test:visual --update-snapshots` to regenerate affected baselines. Commit sequence: `feat(css-foundation): Phase 5 §2.2.5 decision <N> — <what changed>`.

**(S15 deepening)** If Decision 2 (emerald saturation) changes the `--color-accent-intercept` token, re-run `pnpm test palette-cvd` to confirm the new emerald value still passes all 108 CVD cases. The CVD pair list includes `color-accent-intercept` in 4 pairs (Group B). A saturation shift from emerald-9 to emerald-8 or emerald-10 changes the Euclidean distance against cordovan, ochre, teal, and operative colors.

**Step 11** — Commit the final Playwright baselines. Commit: `feat(test): commit Phase 5 visual regression baselines (chromium)`. Baselines include any re-baselines from Step 10 decisions.

**Step 12** — Run the 200% zoom protocol per §2.3. Author `test/device-test/wcag-200-zoom-protocol.md` with pass/fail rows + evidence screenshots. Any fail → fix at the owning phase (dedicated commit), re-test. Commit: `docs(test): WCAG 1.4.4 200% zoom protocol results`.

**Step 13** — Run the iOS 26 real-device protocol per §2.1. Author `test/device-test/ios-26-protocol.md` with pass/fail + iOS build string. If all pass → Step 14. If any fail → Step 13a:
- **Step 13a (conditional)**: implement the §2.1.5 `useIOSFixedFallback` hook + the 5 TSX + CSS integration points. Run `pnpm test` + `pnpm typecheck` + `pnpm lint` + `pnpm build`. Commit: `fix(ios-26): position:fixed/sticky fallback for 5 persistent chrome elements`. Re-deploy the staging build. Re-run §2.1 protocol and re-fill the checklist.
- **Step 13b**: commit `ios-26-protocol.md` with final results. Commit: `docs(test): iOS 26 real-device protocol results`.

**Step 14** — Run the §8.6 full game loop protocol per §2.6. Author `test/game-loop/full-loop-protocol.md` with the script + results. Any bug surfaced → fix in a dedicated commit under the owning `src/server/` or `src/client/` file. Commit the protocol results: `docs(test): §8.6 full game loop protocol results`.

**Step 15** — **Block on Briggsy recruiting a first-time player per §2.7**. Claude can author `test/first-player/protocol.md` with the recruitment criteria + setup + observation template. The actual session is Briggsy's action.

**Step 16** — Run the §2.7 first-time player session. Briggsy takes notes; session notes committed to `protocol.md`. If PASS → Step 17. If FAIL → diagnose, fix, recruit a different tester, repeat.

**Step 17** — Retheme grep sweep per §2.8.4. Author `test/retheme-grep-sweep.md` with results. If zero Tier 1 hits → flip §8.4 Tier 1 checkboxes. Commit: `docs(test): retheme grep sweep results`.

**Step 18** — Final bundle size audit per §2.8.3. Run `pnpm build` on clean checkout, capture chunk sizes, update `README.md` bundle table. If phone entry > 100KB gzipped → STOP, triage. If within budget → commit: `docs: final post-rebuild bundle size report`.

**Step 19** — Spec §8 checkbox updates per §2.8.1. Flip every checkbox that §2.1–§2.7 + §2.8.4 passed. Commit: `docs(spec): Phase 5 §2.8.1 — flip §8 acceptance criteria checkboxes for completed verification`.

**Step 20** — `README.md` + `TODO.md` + `roadmap.md` updates per §2.8.2 + §2.8.6 + §2.8.7. Commit: `docs: Phase 5 completion — update README, TODO, roadmap annotation`.

**Step 21** — `public-repo-prep.md` authoring per §2.8.5. Commit: `docs(test): public repo prep checklist for dreamland-reference images`.

**Step 22** — Final verification:
- `pnpm test` — all Vitest tests green (167 baseline + Phase 1–5 additions).
- `pnpm test:visual` — all Playwright specs green.
- `pnpm typecheck` — clean.
- `pnpm lint` — clean.
- `pnpm build` — phone entry ≤100KB.
- Re-read `PRODUCT-SPECIFICATION.md` §8 — every checkbox that Phase 5 owns is flipped.
- Re-read `TODO.md` — §1 is "COMPLETE"; §5 (deploy) is the new top.

**Step 23** — Tag commit: `git tag css-foundation-phase-5-complete`. No separate commit; just the tag. CSS Foundation Rebuild is **done**.

---

## §4 — Acceptance Criteria

Phase 5 is done when **all** of the following are true:

### §4.1 Test files authored and green

- [ ] `playwright.config.ts` committed, `pnpm test:visual` runs.
- [ ] `test/visual-regression/phone.spec.ts` covers 32 screens × 4 phone viewports = 128 tests. (S5: +2)
- [ ] `test/visual-regression/board.spec.ts` covers 14 screens × 4 board viewports = 56 tests.
- [ ] `test/visual-regression/fixtures.ts` + `helpers/` authored.
- [ ] `test/visual-regression/baselines/` committed, PNGs reflect final decisions from §2.2.5.
- [ ] `src/client/shared/tokens/__tests__/palette-cvd.test.ts` expanded to 36 pairs, `MIN_DISTANCE` locked per §2.4.3.
- [ ] `src/client/shared/tokens/__tests__/palette-contrast.test.ts` expanded to 31 pairs × WCAG + APCA.
- [ ] `src/server/test-fixtures.ts` committed with `handleFixtureSeed` + `handleStackDeck`, both gated by `import.meta.env.DEV`.
- [ ] `pnpm test` — all Vitest tests green (167 baseline + Phase 1 seeded tests + Phase 5 expanded tests).
- [ ] `pnpm test:visual` — all 176 Playwright tests green.
- [ ] `pnpm typecheck` — clean.
- [ ] `pnpm lint` — clean.
- [ ] `pnpm build` — succeeds; phone entry ≤100KB gzipped.

### §4.2 Human protocols authored and run

- [ ] `test/device-test/ios-26-protocol.md` committed with iOS build string + pass/fail marks + evidence screenshots (if any regression).
- [ ] `test/device-test/wcag-200-zoom-protocol.md` committed with pass/fail per target screen.
- [ ] `test/game-loop/full-loop-protocol.md` committed with the script + run results + coverage checklist.
- [ ] `test/first-player/protocol.md` committed with recruitment + setup + observation + session notes + PASS mark.

### §4.3 Pending decisions resolved

- [ ] `test/visual-regression/decisions.md` committed with:
  - GameOver winner glow hue — chosen value + rationale.
  - NopeCountdownBar emerald saturation — chosen value + rationale.
  - Baveuse font — purchased/not + rationale.

### §4.4 Conditional iOS 26 fallback

- [ ] If §2.1 surfaced a regression: `src/client/shared/useIOSFixedFallback.ts` committed, 5 target components integrated, re-run of §2.1 shows all pass with fallback active.
- [ ] If §2.1 passed clean: no fallback code; `ios-26-protocol.md` notes "all 5 elements pass clean, no fallback needed."

### §4.5 Documentation pass

- [ ] `README.md` updated with final bundle table, post-rebuild test count, current project state.
- [ ] `TODO.md` updated: §1 marked COMPLETE, §5 (deploy) is new top priority.
- [ ] `docs/plans/css-foundation-rebuild/roadmap.md` §11 annotation added with Phase 5 results.
- [ ] `docs/specifications/PRODUCT-SPECIFICATION.md` §8 checkboxes flipped per §2.8.1 mapping.
- [ ] `test/retheme-grep-sweep.md` committed, Tier 1 grep zero hits.
- [ ] `test/public-repo-prep.md` committed with `.gitignore` + `git filter-repo` instructions.

### §4.6 §8 spec acceptance criteria

This is the *output* of Phase 5 — the spec's checkboxes below flip to checked:

**§8.1 — Phone controller (visual + functional)**:
- [ ] Every screen passes the Archer test (Playwright matrix + §2.7 pass).
- [ ] No layout breaks across device range (§2.2 + §2.3).
- [ ] Token system live (Phase 1–4 + §2.8.4 grep).
- [ ] All 17 card types playable (§2.6).
- [ ] All 7 bottom sheets render (§2.6 + §2.2).
- [ ] Optimistic updates for card play (§2.6).
- [ ] Reconnection preserves identity (§2.6).
- [ ] EliminatedView spy-tone copy (Phase 2 §2.3.9a + §2.2).
- [ ] Phone bundle ≤100KB gzipped (§2.8.3).
- [ ] No `motion` imports outside `m` (Phase 4 + ESLint).
- [ ] No `console.log` in production build (Phase 5 grep in §2.8.4 or equivalent).

**§8.2 — Board view**:
- [ ] Every screen passes the Archer test.
- [ ] No dead void space.
- [ ] feltBranding replaced (Phase 3 §2.7).
- [ ] Card animations dramatic (§2.7 tester note).
- [ ] QR + room code legible (§2.2 board.spec.ts).
- [ ] Player ring live (§2.6).
- [ ] Intercept countdown visible (§2.6).
- [ ] AnnouncementFeed non-obscuring (§2.6).
- [ ] DramaOverlay triggers on BURNED/EXTRACTED/ELIMINATED/VICTORY (§2.6).

**§8.3 — Documentation** (partial):
- [ ] README.md current (§2.8.2).
- [ ] CLAUDE.md references spec (already true).
- [ ] ideation/brainstorm SUPERSEDED banners (already true).
- HOW-TO-PLAY items NOT flipped — follow-on work.

**§8.4 — Retheme** (partial):
- [ ] Tier 1 gaps fixed (Phase 2 + Phase 3 + §2.8.4).
- [ ] Tier 3 documented (already true).
- Tier 2 NOT flipped — deferred to `TODO.md` §3.

**§8.6 — Full game loop**: all 6 checkboxes flipped (§2.6).

**§8.7 — First-time player test**: checkbox flipped (§2.7 PASS).

### §4.7 Archer acceptance test (Phase 5 as a system)

- [ ] **"Could this look like a frame from an Archer episode?"** — applied to every screen in the §2.2 Playwright matrix. Every baseline image, when compared side-by-side with the Dreamland reference frames, passes the yes/no. §2.2.5 visual review is where this judgment is made; §2.7 first-time player test is where it is externally validated.

---

## §5 — Landmines

1. **Baseline drift on incidental changes**. The Playwright baselines are pixel-exact. Any incidental change — a new font hinting tweak, a browser update, a GPU driver update — can cause wholesale diff. **Mitigation**: the `threshold: 0.04` + `maxDiffPixelRatio: 0.001` in `playwright.config.ts` absorbs sub-pixel font jitter. If CI starts failing after a Chromium version bump, regenerate baselines in a dedicated commit labeled `chore(test): re-baseline Playwright snapshots for chromium <version>`. **Do not** regenerate baselines as a side effect of any other change — the commit must be isolated and reviewed.

2. **iOS 26 UA sniff coverage gaps**. The `parseIOSMajor` regex in §2.1.5 matches `iPhone OS 26_X_X` and `Version/26.X.X Mobile/...`. WebKit's UA string varies across iOS versions and across Safari vs in-app-browser contexts (e.g., Twitter's in-app browser). If iOS 27 ships and also has the regression (or inherits the fix), the sniff needs update. **Mitigation**: the hook is a single file with a single constant (`AFFECTED_IOS_MAJOR`). Updating to include iOS 27 is a one-line change. But Phase 5 does NOT pre-emptively add 27 — the regression is empirically verified, and shipping a sniff for an unseen version is speculation.

3. **Pending decision order matters**. §2.2.5 decisions interact: changing the font (decision 3) affects every screen with display type, which changes every baseline that has `--font-display` content. Changing the winner glow hue (decision 1) affects only one screen. **Execution order**: land font first, regenerate all baselines; then land emerald saturation, regenerate affected baselines; then land winner glow, regenerate one baseline. Out-of-order execution → 2–3x baseline regenerations.

4. **Baseline storage footprint**. 184 PNGs × ~400KB = ~70MB for chromium-only. Cross-browser CI = ~210MB. This is large but within normal repo sizes. **Mitigation A**: commit chromium-only baselines; run webkit + firefox in CI without committing their baselines (they generate fresh per run and fail if diff exceeds threshold). **Mitigation B (if A doesn't work)**: migrate `baselines/` to Git LFS. Git LFS requires additional CI setup — only activate if footprint becomes a real problem. Flagged, not pre-empted.

5. **Fixture endpoint security gate**. `handleFixtureSeed` + `handleStackDeck` are dev-only. If `import.meta.env.PROD` is accidentally false in production (bundler misconfiguration, alt-build-tool), these endpoints go live and become a cheat-proof gameplay bypass. **Mitigation**: belt-and-suspenders gate — both the handler body check AND the router-level `if (import.meta.env.DEV)` registration. Both must succeed for the endpoint to be reachable. A production build that tree-shakes the router branch also tree-shakes the handler. Phase 5 §2.2.4 / §2.6.5 specify both gates.

6. **`wrangler` authentication blocker**. Real-device iOS 26 testing (§2.1) requires a deploy URL reachable from Briggsy's iPhone. If `wrangler` isn't authenticated (`TODO.md` Landmine), the fallback is `cloudflared tunnel` on top of `pnpm dev`. **Mitigation**: both paths documented in §2.1.2. Do not block on `wrangler` — the tunnel path is sufficient for §2.1 alone.

7. **First-time player bias** (§2.7). Briggsy knows the game intimately. Reading neutral reactions as "positive" is a cognitive bias risk. **Mitigation**: rely on verbatim quotes, not interpretations. If the tester says "cool, nice", that is NOT a pass — do not re-read it as "nice [meaning commercial-grade]". The pass condition is an explicit reference to Archer or commercial quality, unprompted. Strict criteria protect against Briggsy optimism.

8. **Long-lived test sessions diluting signal**. A 30-minute game is long enough that the tester adjusts to the visual — the initial impression is the clearest signal. **Mitigation**: §2.7.3 weights first-screen + first-phone + first-DramaOverlay reactions heavily. If the tester passes in the first 3 minutes, you can be confident even if the rest of the session is mechanical.

9. **CVD MIN_DISTANCE over-tightening**. If Phase 5 locks `MIN_DISTANCE` to *exactly* the minimum observed distance (not 90% of it, as §2.4.3 prescribes), future palette adjustments will immediately fail the gate. **Mitigation**: use the 90% floor rule in §2.4.3. Document the rationale in the test file header comment so future contributors don't "tighten" it back to 100%.

10. **APCA body-text floor exceptions**. APCA Lc ≥60 is strict. Some Dreamland-palette pairs (e.g., `color-fg-muted` on `color-bg-app`, which is intentionally low-contrast for de-emphasized text) will fail the Lc 60 floor. **Mitigation**: the test has a *per-pair* minimum (not a global 60 floor) — muted text gets Lc 45, not Lc 60. The "Lc 60 body-text floor" language in the TODO applies to rows labeled as body text, not to every row. §2.5.1 Group 1 rows get Lc 60+; Group 1 muted rows get Lc 45. This is the correct reading of the TODO block. Flagged here so a future re-reader doesn't think "Lc 60 applies to every row."

11. **Visual regression flake on focus rings**. Focus rings render differently depending on whether the page has keyboard focus or not. A Playwright test that navigates programmatically might leave the focus on an unintended element, producing a focus-ring artifact in the baseline. **Mitigation**: every test's last step before `toHaveScreenshot()` is `await page.locator('body').click()` to move focus to the body (no focus ring). If focus-ring artifacts still leak, add `page.addStyleTag({ content: '*:focus-visible { outline: none !important; }' })` but ONLY for the visual regression suite — never ship this to production.

12. **Dev-server stacked deck + real RNG interaction**. `handleStackDeck` sets the top N cards of the draw pile deterministically, but the bottom of the pile is still shuffled with `crypto.getRandomValues()`. If the stacked section runs out and the shuffled tail starts producing different card orders per test run, downstream state is non-deterministic. **Mitigation**: for Playwright visual regression, seeded fixtures (not stacked deck) are the canonical approach — stacked deck is for §2.6 full-loop protocol only, where non-determinism past the top N doesn't break the protocol's pass criteria.

13. **(B1 deepening) iOS 26 UA string freeze**. Apple froze `iPhone OS` at `18_6` in the UA string starting with iOS 26 (privacy/anti-fingerprinting). The `Version/` token still updates correctly. ANY code that parses iOS version from `iPhone OS X_Y` will report `18`, not the real version. The corrected detection in §2.1.5 uses `Version/` with `iPhone OS` as a fallback for in-app browsers. If iOS 27 also has this freeze (likely), the pattern will need no change since it already prioritizes `Version/`. **Confirmed by**: webkit.org Safari 26 release notes, Kochava, Singular, 51degrees, Daring Fireball.

14. **(B2 deepening) Wrangler `define` configuration**. Server code is bundled by Wrangler (esbuild), NOT Vite. `import.meta.env.PROD`/`.DEV` are Vite-specific and do NOT get replaced in the Wrangler build without explicit `define` config in `wrangler.jsonc`. The corrected approach in §2.6.5 uses `__DEV__` via Wrangler's `define` table + runtime `env.ENVIRONMENT` check. **If someone adds a new dev-only server feature**: they must use `__DEV__` (not `import.meta.env.DEV`) and MUST add the runtime gate. A CI grep step (§2.8.4 #8) verifies no test-endpoint strings survive in the production bundle.

15. **(S4 deepening) Framer Motion animation non-determinism in Playwright**. Playwright's `animations: 'disabled'` option handles CSS animations. Framer Motion JS-driven animations (layout animations, spring physics) are NOT CSS animations — they run via `requestAnimationFrame`. The `waitForFunction(() => document.getAnimations().every(...))` helper in §2.2.7 catches Web Animations API animations but may miss Framer Motion springs. If visual regression flakes persist after implementing §2.2.7, the fallback is to inject `window.__framer_motion_skip_animations = true` before navigation (Framer Motion internal flag that forces all animations to their end state).

16. **(S16 deepening) First-time player recruitment timeout**. Phase 5 completion is gated on §2.7, which requires a qualifying first-time player. If Briggsy cannot recruit a qualifying tester within **14 days**, the provisional path is: run §2.7 with a secondary tester (someone who has played Exploding Kittens but NOT seen BURNED) using explicitly weakened pass criteria documented as "provisional pass — retest with qualifying player when available." This prevents indefinite Phase 5 blocking from a recruitment failure (not a code failure).

17. **(Performance deepening) Playwright suite sharding escape hatch**. The current 184-baseline suite takes ~2 minutes locally and ~7 minutes in CI. If future feature work grows the screen count past ~500 baselines, adopt Playwright's `--shard=N/M` flag to split across CI runners. This is a future optimization, not a Phase 5 action.

---

## §6 — Out of Scope

Phase 5 **does not** include:

- **Cloudflare deploy**. `TODO.md` §5 owns that. Phase 5 verifies the build is deployable (§2.8.3 bundle), not that it is deployed.
- **HOW-TO-PLAY doc at UMB's bar**. Spec §8.3 requires this, but it is a substantial follow-on work item that belongs after the CSS Foundation Rebuild finishes. Phase 5 does NOT author HOW-TO-PLAY.
- **Tier 2 retheme cleanup** (`TODO.md` §3). Non-blocking code-clarity cleanup of `EK_*_MS` → `BURNED_*_MS` and "EK" comment rewording. Phase 5's grep sweep (§2.8.4) reports the state but does not perform the rename.
- **New features**. No new card types, no new modes, no new sheets. Phase 5 is a verification pass of what Phases 1–4 already built.
- **Performance profiling beyond bundle size**. Phase 5 measures and reports bundle size. Runtime frame budget, network payload, WebSocket latency — all out of scope. If any of those surface as problems during §2.6, file a bug, do not fix in Phase 5.
- **Light mode completion**. Phase 1 stubbed `:root[data-theme="light"]` with dark fallbacks. Light mode is Phase 1.5, deferred per the spec. Phase 5 ships with dark-only verified.
- **Full cross-browser baseline commitment**. Chromium baselines committed; webkit + firefox run in CI without committed baselines (they fail on diff but there's nothing to commit against — they regenerate fresh and the test pass/fail is "did this run match the reference-within-threshold-baseline we generated this session"). Full cross-browser baselines would triple the storage footprint and add negligible signal given the threshold tolerance.
- **Non-iOS mobile device testing**. Android, iPadOS pre-26, older iOS — not tested. The spec's device matrix is iPhone SE through iPad Pro, covered by §2.2 + §2.1. Android is a happy-path assumption via Chromium on desktop.
- **Stress-testing the server under load**. 5-player game (§2.6) is the full party-pack max per spec. Higher load is out-of-scope for Phase 5.
- **Audio / haptics**. Not in the spec. Out of scope.
- **Accessibility beyond WCAG 1.4.4 + WCAG/APCA contrast**. Screen-reader support, keyboard navigation audit, voice control — all deferred. §2.3 only covers 1.4.4 text resize.
- **Trailer / marketing material**. Per `TODO.md` landmine: README is current state, not marketing. Phase 5 does not author marketing copy.

---

## §7 — Cross-Phase Dependencies

Phase 5 is the last phase and therefore does not flag tokens or patterns for future phases — there are no future phases in the CSS Foundation Rebuild plan. However, Phase 5 surfaces several *feedback loops* to earlier phases:

### §7.1 — CVD pair failure → Phase 1 palette amendment

If §2.4.3 CVD tuning finds any pair with observed distance < 0.12, the fix is NOT in Phase 5. The fix is a Phase 1 amendment to `primitives.css` that adjusts one of the two scale steps to widen the perceptual gap. Phase 5 documents the finding; the edit lands as a Phase 1 amendment commit, then Phase 5 re-runs the CVD test. Cycle until all pairs pass at the locked `MIN_DISTANCE`.

### §7.2 — Contrast pair failure → Phase 1 palette amendment

Same pattern. §2.5 contrast failures route to Phase 1 palette amendment. If `color-fg-secondary` × `color-bg-app` fails Lc 60, the fix is to bump `color-fg-secondary` from `cream-11` to `cream-12` at the Phase 1 level, then re-test.

### §7.3 — iOS 26 regression confirmed → Phase 5 owns the fix

§2.1.5 is the fallback hook. If the regression is confirmed, the fix lives in Phase 5 as authored code (unlike §7.1/§7.2 which route to Phase 1 amendments). This asymmetry is intentional: CVD/contrast failures indicate the *palette* is wrong (Phase 1's responsibility); iOS 26 regression indicates the *platform* is broken (Phase 5's responsibility to route around).

### §7.4 — §2.3 200% zoom failure → owning-phase amendment

A 200% zoom failure on `PlayingView` routes to the phase that authored the offending CSS (Phase 2 for phone views, Phase 3 for board views). Phase 5 documents the failure; the fix lands as an amendment commit under the owning phase.

### §7.5 — §2.6 full-loop bug → owning-phase amendment

Bugs surfaced during §2.6 that are NOT visual (e.g., ghost turn, reconnect regression) route to `src/server/` or `src/client/` files owned by Phases 2–4 or the pre-rebuild game engine (Phases -1 through 6, unrelated to CSS rebuild). Phase 5 does not own game logic; it owns the protocol that finds game-logic bugs.

### §7.6 — §2.7 first-time player failure → diffuse fix

A §2.7 FAIL is the hardest to route. If the tester says "it just feels flat", the fix could be:
- Palette (Phase 1)
- Typography (Phase 1)
- Motion (Phases 2/3/4)
- Copy voice (Phase 2 §2.3.9a, or anywhere else the retheme touches strings)
- Layout (Phases 2/3)

**Rule**: the first §2.7 fail triggers a diagnostic session with Briggsy + Claude (NOT an immediate code change). The diagnostic session identifies the most-likely subsystem and lands a targeted amendment. Do NOT change every subsystem at once — each amendment is an isolated hypothesis test against a new first-time player.

### §7.7 — Documentation pass → all phases

§2.8.6 (`TODO.md` update) and §2.8.7 (`roadmap.md` annotation) reference every prior phase by name. If any earlier phase changes (an amendment commit after Phase 5 starts), the documentation pass must reflect it. Phase 5 §3 Step 19 runs AFTER all §2.1–§2.7 work is committed so the documentation pass sees the final state.

---

## §8 — Bundle Budget Impact

Phase 5 is primarily non-production (test files, protocols, docs). Direct bundle impact is:

### §8.1 — Additions

- **Conditional** `useIOSFixedFallback` hook: **~330 bytes gzipped**, added to the phone entry chunk (imported by TitleBar, StatusBar, FloatingActionButton). Only lands if §2.1 surfaces a regression. Not in board entry.
- **Conditional** TSX integration edits in 5 components: **~50 bytes gzipped total** across all 5 (each integration is a 2-line change: import + conditional className).
- **Dev-only** `src/server/test-fixtures.ts`: **0 bytes in production** (tree-shaken by `import.meta.env.PROD` gate).
- **Test files** (`test/visual-regression/*`, `test/device-test/*`, etc.): **0 bytes in production** (not in `src/`, not bundled).
- **Baseline PNGs**: **0 bytes in production** (git-committed assets, not bundled).

**Total production addition**: 0–380 bytes gzipped (depending on §2.1 outcome).

### §8.2 — Removals

Phase 5 removes nothing from production.

### §8.3 — Net delta

- **Best case** (iOS 26 pass): **0 bytes**.
- **Worst case** (iOS 26 regression requires fallback): **+380 bytes gzipped** on the phone entry chunk.

Per `README.md` baseline pre-rebuild bundle table: phone entry ~95KB. Post-Phase-1 (+5KB tokens/fonts): ~100KB. Post-Phase-4 (−360 bytes): ~99.6KB. Post-Phase-5 worst case (+380 bytes): ~100.0KB. **Zero headroom in the worst case** — exactly at budget, not over. If the real measurement lands above 100KB gzipped, Phase 5 §3 Step 18 triggers a triage.

### §8.4 — Triage plan if over budget

In order of preference:

1. **Lazy-load `useIOSFixedFallback`**. The hook is only used by 5 components; dynamically import it so only iOS 26 users pay the cost. Savings: ~330 bytes from main chunk.
2. **Tree-shake tokens that turned out to be unused**. Phase 1 adds 74 color primitives; Phase 5's visual review may determine that (e.g.) the rose-neon spot colors are used in exactly zero components. Delete unused primitives. Savings: variable, potentially 1–2KB.
3. **Strip redundant `color-mix()` fallbacks**. If the rebuild added `color-mix()` branches that have never rendered, delete them. Savings: variable.
4. **Defer Baveuse font** (if purchased). Load Baveuse as a preload hint rather than `@font-face { font-display: swap }` — not a bundle saving per se, but a load-perceived-performance improvement that can justify keeping Baveuse in a slightly-over-budget case.

### §8.5 — Verification

Phase 5 §3 Step 18 is the verification. `pnpm build` on clean checkout, capture chunk sizes, compare against budget. If under, commit the bundle table to `README.md`. If over, run the §8.4 triage, commit the fix, re-measure.

---

## §9 — Sources

**Primary references**:
- `docs/plans/css-foundation-rebuild/roadmap.md` §7 Phase 5 — parent scope definition.
- `docs/plans/css-foundation-rebuild/phase-1-foundation.md` §2.7 — `palette-cvd.test.ts` + `palette-contrast.test.ts` + `motion-token-sync.test.ts` starter seeds (the files Phase 5 expands).
- `docs/plans/css-foundation-rebuild/phase-2-phone-view-migration.md` §2.3.5 (TitleBar), §2.3.6 (StatusBar), §2.3.7 (FloatingActionButton), §2.3.9a (EliminatedView retheme), §2.6 (BottomSheet dvh→svh), §2.3.13 (bottom sheets) — the files Phase 5 visual-regression-captures.
- `docs/plans/css-foundation-rebuild/phase-3-board-view-migration.md` §2.3.1–§2.3.11 (board files), §2.3.9 (NopeCountdownBar emerald — pending decision 2), §2.5 (GameOver winner glow — pending decision 1), §2.6 (DramaOverlay five variants), §2.7 (feltBranding Tier 1 retheme) — the files Phase 5 visual-regression-captures.
- `docs/plans/css-foundation-rebuild/phase-4-motion-consolidation.md` §2.3 (all FM transition sites — Phase 5 verifies they render with the locked timing), §2.4 (GSAP sites), §2.5 (CSS keyframes) — the motion surface Phase 5 verifies.
- `docs/specifications/PRODUCT-SPECIFICATION.md` §2 Quality Bar, §3 Visual Reference, §3.4 Form Factors, §8 Acceptance Criteria — the contract Phase 5 checks against.

**Technical references**:
- **Playwright visual regression**: https://playwright.dev/docs/test-snapshots — `toHaveScreenshot()` API, `threshold` and `maxDiffPixelRatio` options.
- **Playwright config structure**: https://playwright.dev/docs/test-configuration — `webServer`, `projects`, `snapshotPathTemplate`.
- **APCA contrast algorithm**: `apca-w3` npm package — `APCAcontrast(fgY, bgY)` returns Lc value. W3C draft: https://www.w3.org/TR/WCAG3/#visual-contrast-of-text (APCA is the referenced mechanism for future WCAG 3).
- **culori CVD simulation**: https://culorijs.org — `filter('deuteranopia')`, `filter('protanopia')`, `filter('tritanopia')`. Based on Brettel-Viénot-Mollon.
- **WCAG 1.4.4 Resize Text**: https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html — 200% page-zoom requirement.
- **iOS 26 `position: fixed` regression**: WebKit bug tracker + 2026-04 developer reports; referenced in `roadmap.md` §10 sources list and `TODO.md` Landmines. Partial fix in iOS 26.1 per same sources.
- **`import.meta.env` in Vite**: https://vite.dev/guide/env-and-mode — `import.meta.env.PROD` / `import.meta.env.DEV` are compile-time booleans; branches on them are tree-shaken.

**Internal documents**:
- `docs/post-mortems/VISUAL-LAYER-AUTOPSY.md` — the failure mode Phase 5 verifies never recurs.
- `feedback-stop-after-every-phase.md` (memory) — Phase 5 is its own drafting session; stop after this file, wait for Briggsy's review, then execute.
- `feedback-plans-are-baking-recipes.md` (memory) — Phase 5 is concrete: exact pair lists, exact MIN_DISTANCE tuning protocol, exact step order, exact commit messages.
- `feedback-no-execute-until-plans-complete.md` (memory) — Phase 5 execution blocks on all 5 phases being deepened through `/deepen-plan`, not just drafted.
- `feedback-visual-work-one-change-at-a-time.md` (memory) — §2.2.5 visual review decisions execute one at a time, not batched. Applied in §3 Step 10.

---

*Phase 5 is the last phase of the CSS Foundation Rebuild. When §2.7 passes and §2.8 documentation lands, the spec's §8 checkboxes flip, and the CSS Foundation Rebuild is declared complete. The next work item is `TODO.md` §5 (Cloudflare deploy) — a separate track entirely.*
