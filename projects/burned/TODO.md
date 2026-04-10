# BURNED — TODO

## Current State
- **PRODUCT-SPECIFICATION.md v1.0 LOCKED** — `docs/specifications/PRODUCT-SPECIFICATION.md` (2026-04-10). Spec itself is frozen; only §8 Acceptance Criteria checkboxes get updated as work lands.
- **167/167 tests, typecheck clean** (as of 2026-04-09; re-verify with `pnpm test` + `pnpm typecheck`).
- **Game is functional** — staging, hand, board, all card types, nope chains, elimination all working.
- **Visual layer is FRAGILE** — see `docs/post-mortems/VISUAL-LAYER-AUTOPSY.md`. Rebuild is gated on the **CSS Foundation Rebuild Plan** (not yet generated).
- **CLAUDE.md has "The Contract" section** pointing at the spec. Key sections Claude should know by heart: §2 Quality Bar, §3 Visual Reference, §3.4 Form Factors, §7 ADRs, §8 Acceptance Criteria.

## Next Steps (in priority order)

### 1. Generate CSS Foundation Rebuild Plan (fresh session, priority #1)
The plan must be derived from `docs/specifications/PRODUCT-SPECIFICATION.md`:
- §2 Quality Bar ("could this be a frame from an Archer episode?")
- §3 Visual Reference (Archer the TV show, literal)
- §3.4 Form Factors (phone = portrait, constraining axis = HEIGHT, primary unit = `svh`; board = landscape, constraining axis = WIDTH, primary unit = `vw`)
- §6 Screens (full component inventory)
- ADR-04 (smooth animation within bundle budget)
- ADR-05 (visual consistency via shared token system)

**How:** Fresh Claude Code session. Load the spec. Run `/ce:ce-plan` or equivalent planner. Output should be `docs/plans/2026-04-XX-css-foundation-rebuild-plan.md` with token scales, clamp formulas, animation language, migration steps.

**The plan generator should pick up the Archer quality bar the same way UMB's phase 4/5 plans picked up "indistinguishable from a polished commercial party game"** — transitive enforcement. Evidence in `feedback-transitive-contract-pattern.md` in Claude's memory.

### 2. Execute Tier 1 retheme gaps (§6.4 in spec — BLOCKS visual lock)
Exact file:line prescriptions:
- `src/client/player/EliminatedView.tsx:45` — change `"You Exploded!"` title. Candidates: `"Cover Blown"`, `"You're Burned"`, `"Mission Failed"`. Final copy TBD.
- `src/client/player/EliminatedView.tsx:8-17` — CUT 4 flavor lines (`"Blown to smithereens."`, `"Rest in pieces."`, `"You had a blast."`, `"Ka-boom, baby."`). KEEP (`"Your cover's blown."`, `"Game over, hotshot."`, `"Catastrophic failure."`). REWORD `"BOOM. You're cooked."` (keep "cooked," lose "BOOM"). ADD 4 new Archer-tone dry-comedy replacements.
- `src/client/board/GameTable.tsx:24` — audit `feltBranding` element (comment says "EK identity baked into the table"). Replace with Archer/Pendleton-era decorative element.

### 3. Execute Tier 2 retheme cleanup (§6.4 in spec — code clarity, non-blocking)
Exact file:line prescriptions:
- `src/server/game/engine.ts` lines 153, 216, 260, 478, 581, 654, 703, 708, 711, 1035, 1040 — rename "EK" shorthand to "Burned" in comments (11 instances)
- `src/shared/constants.ts:21-23` — rename `EK_REVEAL_MS` → `BURNED_REVEAL_MS`, `EK_RELIEF_MS` → `BURNED_RELIEF_MS`, `EK_ELIMINATION_MS` → `BURNED_ELIMINATION_MS`. Coordinated rename across all call sites (grep first).
- `src/server/game/engine.ts:1040` — change error message `'No EK in hand'` to `'No Burned card in hand'`
- `src/client/board/Arena.tsx:7` — change comment `"EK reveal"` to `"Burned reveal"`

**Do NOT touch** internal state machine `defuse-pending` / `defuse-place` / `{ type: 'defuse' }` names. §6.4 Tier 3 documents the decision: too much blast radius (server, client selectors, Zod schemas, tests, Durable Object hibernated state) for zero user-facing benefit.

### 4. Execute CSS Foundation Rebuild (against plan from step 1)
Only after step 1 is complete. Implementation follows the plan — tokens in `theme.css`, component `.module.css` files migrated to consume tokens, layout hacks removed, `max-width` constraints gone, rigid flex ratios replaced with content-aware sizing. Test on phone, tablet portrait, desktop at all supported sizes.

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
