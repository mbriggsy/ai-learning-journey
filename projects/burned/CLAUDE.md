# BURNED — Project Conventions

## The Contract

See **`docs/PRODUCT-SPECIFICATION.md`**. That document is the non-negotiable contract for what BURNED *is*, what quality bar it must meet, and what "done" looks like. It is loaded every session as the source of truth for product-level decisions.

**Sections Claude should know by heart:**
- **§2 Quality Bar** — *"Could this look like a frame from an Archer episode?"* is the binary yes/no acceptance test applied to every screen, card, button, and transition state.
- **§3 Visual Reference** — **Archer the TV show**, literal visual vocabulary. Not "mid-century modern in general," not "Saul Bass." Archer, specifically.
- **§3.4 Form Factors** — Phone controller = portrait, constraining axis = **HEIGHT**, primary unit = **`svh`**. Board view = landscape, constraining axis = **WIDTH**, primary unit = `vw`. Do not mix axes.
- **§7 ADRs** — nine locked architectural decisions (Cloudflare Workers + Durable Objects, React 19, Framer Motion + LazyMotion, visual consistency via shared tokens, Zod at WS boundary, allowlist projection, pure sync dispatch, protocol versioning). Do not reopen without a product-level reason.
- **§8 Acceptance Criteria** — seven surfaces with checkbox criteria that define "done." Updated as work lands. §8.7 is the final quality gate (first-time player reaction test).

**When any memory file, brainstorm doc, ideation doc, or other historical source contradicts `docs/PRODUCT-SPECIFICATION.md`, the product specification wins.**

The spec does not generate code. It generates the *next artifact* — the CSS Foundation Rebuild Plan — which is where code generation begins. See `TODO.md` for the prioritized work queue.

## Commands

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Vite dev server (board + player views, port 5173) |
| `pnpm dev:server` | Wrangler dev server (Durable Object, port 8787) |
| `pnpm dev:cleanup` | Kill orphan workerd + report port-5173/8787 binders. Run when a prior session left stale processes blocking dev boot. |
| `pnpm build` | Typecheck + production build |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm lint` | ESLint (import boundary enforcement) |

## Entry Points

- `src/client/board/` — TV/shared screen view (landscape)
- `src/client/player/` — Phone controller view (portrait)
- `src/server/room.ts` — Cloudflare Durable Object game server
- `src/shared/protocol.ts` — Shared types (zero runtime deps)

## Import Boundaries (ESLint-enforced)

- `src/shared/` — types, constants, pure functions ONLY. No DOM, no side effects, no runtime libraries.
- `src/client/shared/` — React hooks, components. Client only.
- `src/server/` — Cloudflare Workers Durable Object room (partyserver), game engine, Zod validation. Server only.
- `src/server/` MAY import from `src/shared/`. `src/shared/` MUST NOT import from `src/server/` or `src/client/`.
- `src/client/` MAY import from `src/shared/`. `src/client/` MUST NOT import from `src/server/`.

## Type Architecture

- Pure TS types in `src/shared/protocol.ts` — zero runtime dependencies. This is what clients import.
- Zod schemas in `src/server/validation.ts` — runtime parsing at WebSocket boundary. Server only.
- Types derived from data (`as const satisfies` + `typeof`), never parallel enums.
- `CardType` derived from `CARD_DEFS` — adding a card type to the array updates the union automatically.

## Security Conventions

- State projection uses **allowlist pattern** — every field explicitly picked. Object spread from GameState banned in projection functions. New fields excluded by default.
- All server randomness uses `crypto.getRandomValues()` / CSPRNG. `Math.random()` banned in `src/server/`.
- `dispatch(state, action)` is pure and synchronous. No timers, no I/O, no async. Serial action queue in room.ts is the only concurrency control.
- Production WebSocket connections MUST use WSS. Cloudflare handles this automatically.
- Reject WebSocket messages exceeding 4KB before `JSON.parse`.
- Board projection includes player card COUNT only. Card identities never sent to board view.

## State Management

- `useSyncExternalStore` with selector hooks. Components subscribe to specific state slices.
- Never pass full game state as props.
- Optimistic updates via store-level overlay pattern (not `useOptimistic` — incompatible with WebSocket stores).

## CSS Strategy

- CSS modules with CSS custom properties for theming.

## Phone Bundle Budget

- <100KB gzipped initial JS. Measured after each phase.

## Vite Dev URLs

- Use `.html` extension (`/board.html`, `/player.html`). Bare paths don't work in Vite dev server.

## Framer Motion

- Components use `m` from `motion/react`, never `motion` (LazyMotion strict mode enforces this).
- Both entry points wrap in `MotionProvider` — `m` components crash without it.

## Vite 8 Notes

- `rolldownOptions` not `rollupOptions` (breaking change).
- `resolve.tsconfigPaths: true` built-in — no `vite-tsconfig-paths` plugin.
- `import.meta.dirname` replaces `__dirname`.

## Testing

- Vitest 4, `globals: false` — explicit imports from `'vitest'`.
- `restoreMocks: true` — aggressive cleanup between tests.
- fast-check for property-based tests via `@fast-check/vitest`.
- React component tests use `environment: 'jsdom'` per-file override.
- **Drama-beat runtime gate.** `tests/e2e/drama-beat-timing.spec.ts` samples computed opacity per animation frame and asserts the *rendered* beat shape (total visible duration ±15%, peak-sustained ≥60% of designed). It complements `DramaOverlay.test.ts`, which only pins `tl.totalDuration()` (the engine's accounting). The Vitest pin passed for ~10 days while every drama beat clipped to ~30% — that's the gap this E2E spec closes. Includes a fault-injection test that paints a bug-shape arc directly so we know the canary is sensitive, not numb. Sampling methodology is portable to chrome-devtools-mcp's `evaluate_script` for interactive agent-driven verification.
- **Framer cinematic runtime gate.** `tests/e2e/framer-hand-enlarge-shape.spec.ts` extends the same per-rAF sampling pattern to a Framer Motion cinematic (the hand→enlarge transition). Beyond shape (time-to-peak < 800ms, peak-sustained ≥ 6 frames), it asserts a **co-ordination invariant**: while the card is mid-scale (∈ [0.4, 0.95]) the median `filter: blur` must be ≥ 0.5px. The blur-mask deliberately layered on top of the scale arc is what hides MinimalCard's container-query layout-rejig — a future "perf cleanup" that strips it would be visually broken but engine-clean. Sensitivity proven empirically: temporarily zeroing the blur in `Hand.tsx` flips the test red with a clear message; the in-spec fault-injection canary paints a scale-only arc and asserts the same shape. This is a TEMPLATE for future cinematic gates (BottomSheet enter/exit, layoutId reflashes, status strip crossfade) — same sampler, different selectors + assertions.
- **Framer BottomSheet runtime gate.** `tests/e2e/framer-bottom-sheet-shape.spec.ts` applies the template to BottomSheet's translateY enter/exit. Asserts time-to-peak < 800ms, peak-frames ≥ 8 at translateY ≤ 5px, AND a **position invariant** (insight 013 catch): at peak the sheet's bottom edge must sit within 50px of the viewport bottom — a `contain: layout` trap on an ancestor would push the position:fixed dialog away from the bottom, and median-of-peak-bottom-gaps catches it cleanly. Driven via a `__testForceLocalTarget` DEV hook in `Player.tsx` that flips `localTargetMode` directly, bypassing the full game-flow path through staging + target select. Hook is DEV/test-guarded and verified tree-shaken by `verify-prod-bundle.ts`. The activation logic in `findActivation()` skips frames before Framer's `initial={translateY 100%}` applies — there's a one-rAF window where content has no transform and reads as translateY 0 at the wrong layout position, which would otherwise pollute the peak measurement.
- **Framer status-strip crossfade gate.** `tests/e2e/framer-status-strip-shape.spec.ts` pins the `AnimatePresence mode="wait"` contract on `StatusBar.tsx`'s exit-then-enter swap. Counts the number of frames where TWO `.inner` spans simultaneously have opacity ≥ 0.5 — that's the ghost-overlap signature of a `mode="sync"` regression where both old and new content render concurrently during the transition. Tolerance is 1 overlap frame for browser layout-pipeline edge cases. Trigger uses `gameStore.applyOptimistic` to flip BOTH `isMyTurn` AND `currentTurn.currentPlayerId` (StatusBar reads them via separate selectors — flipping just one leaves the key stuck). Fault-injection canary paints two synthetic spans at opacity 0.7 simultaneously and asserts the detector counts ≥3 overlap frames, proving the gate is not numb.
- **Framer Hand-reorder gate (insight 047 corrected).** `tests/e2e/framer-hand-reorder-shape.spec.ts` pins the actual cinematic shape: `popLayout` + `layout="position"` is structurally a fast-snap, not a multi-frame spring. Asserts `timeToSettleMs ≤ 500ms` (snappy spring window) AND `midPlateauMs ≤ 150ms` (catches the two-phase regression that would result from removing `mode="popLayout"`). The fault-injection canary paints a synthetic two-phase shape (smooth Phase 1 → 350ms plateau → snap to final) and asserts both thresholds trip. Insight 047's original animate.transform-conflict hypothesis was empirically wrong — four fix variants all produced identical instant snaps; the snap behavior is `popLayout`'s structural reflow, not a transform clobber. See insight 047 for the full diagnostic chain. Side finding: `layout={dealComplete ? 'position' : false}` makes Framer skip projection-node initialization on the false branch — `onLayoutAnimationStart` callbacks never fire even after the toggle flips true. Visible cinematic is identical (same fast-snap), so we left it; future sessions touching the deal-in cinematic should consider switching to a parent-mount gate instead.
- **Framer Nameplate rotateY gate (insight 014).** `tests/e2e/framer-nameplate-rotateY-shape.spec.ts` pins the opacity-at-edge-on contract on `Nameplate.tsx`'s coin-flip (`rotateY 0 → ±90 → 0`). Parses the rotation angle from computed `matrix3d(...)` (index 0 = cos, index 8 = sin → atan2; falls back to 0° for the 2D `matrix(...)` collapse case) and asserts that across all sampled frames where `|rotateY| ∈ [80°, 100°]`, the maximum opacity is ≤ 0.3. Trigger uses `__gameStore.applyOptimistic` on the BOARD page to flip `currentTurn.currentPlayerId` (Nameplate's key composes as `turn:<id>`). Catches the regression where someone removes opacity tweens trusting Chrome's backface-culling — Chrome's compositor collapses `rotateY(0deg)` to a 2D identity matrix, breaking 3D backface-visibility, and the back face would flash mirrored at edge-on. Sensitivity proven empirically: stripping opacity from `Nameplate.tsx` initial/animate/exit flips the gate red with `1.00 / 0.3` and explicit "Restore opacity 0 ↔ 1 alongside the rotateY" remediation. Fault-injection canary paints a synthetic plate stuck at `rotateY 90° opacity 1` (with custom-scoped sampler bypassing the production `[class*="plateContent"]` selector) and asserts the same opacity cap trips.

## Bundle Sizes

Last measured 2026-05-06 (Phase 5 §2.8.3 final audit). Re-run `pnpm build` and update after material changes.

| Chunk | Raw | Gzipped | Load |
|-------|-----|---------|------|
| player entry | 54.25 KB | 16.09 KB | Initial |
| board entry | 42.13 KB | 14.29 KB | Initial |
| shared (React + Motion core, `config-*`) | 210.15 KB | 67.01 KB | Initial (shared) |
| VisualElement (`is-ref-object-*`) | 39.93 KB | 14.40 KB | Initial (shared) |
| motion-features (domMax) | 83.57 KB | 27.41 KB | Lazy (prefetched) |

**Phone initial JS: ~97.5 KB gzipped** (under 100 KB budget, ~2.5 KB headroom). Phase 5 §2.8.3 expected ~99 KB post-rebuild; we're 1.5 KB under that. All dev hooks (`__gameStore`, `__testInjectEvent`, `__testForceLocalTarget`) tree-shake correctly — verified by `pnpm verify:bundle` (9 JS chunks × 15 forbidden strings, all clean).

## Workers / Protocol Landmines

- **`src/server/room.ts` may ONLY export the `GameRoom` class** (and the default worker handler). Any other named export crashes Wrangler boot. Helpers and constants live in `src/server/validation.ts` (mirrors constants tests need) or a new server-side module.
- **Session tokens live in `sessionStorage`, not `localStorage`.** Per-tab isolation fixes dev-launcher multi-tab clobber. Closing a tab fully kills the session; closed-tab players fall back to name-reclaim.
- **Name-reclaim mid-game.** Server's `handleJoin` accepts bare-name rejoin if (a) name matches an existing player and (b) no other device is actively connected as that name. Identity theft blocked by the `activelyConnected` check — don't relax.
- **Protocol version bumps.** When the wire format changes, bump `PROTOCOL_VERSION` in `src/shared/protocol.ts` AND update `gameStore.test.ts`. Mismatched clients get "Game updated — please refresh."
- **Origin allowlist** at `src/server/room.ts` connection accept. Localhost + LAN for dev; `https://burned.pages.dev` in prod. Any new dev origin must be whitelisted.
- **Playtest seat agents bind one MCP Playwright server PER SEAT** (`playwright-seat-1` … `playwright-seat-10` in `.mcp.json`, all spawned with `--isolated`). Seat agents are `playtest-seat-1.md` … `playtest-seat-10.md` — generated by `scripts/generate-playtest-seat-agents.ts`. Each agent's frontmatter `tools:` whitelists ONLY its own `mcp__playwright-seat-N__*` namespace; cross-seat tool calls are structurally impossible. Don't merge servers, don't add `browser_tabs` to any whitelist (still a peek vector), and don't hand-edit the generated files — re-run the generator. Insight 031 explains the architectural arc (Phase 4 D15 Option A deferred → discovered at Phase 6 Unit 3 integration). The legacy single `.claude/agents/playtest-seat.md` is Option B reference only — pruned in Unit 6 doc sweep.

## Engine Invariants (quick reference)

Canonical rules in `docs/RULES-REFERENCE.md`. Non-obvious engine behaviors worth knowing by heart:

- **Attack / TargetedAttack formula:** `(turnsRemaining - 1) + 2`, NOT `turnsRemaining + 2`. No cap — `turnsRemaining` grows unboundedly with stacking. Elimination mid-attack collapses remaining to 1 for next player.
- **Triple-steal cards DO NOT leave hand until name commits.** `handleCombo` for `comboSize === 3` only stages; `handleNameCard` does the discard + nope-window. Moving discard into `handleCombo` silently destroys 3 cards on cancel.
- **`handleNopeWindowExpired` checks the named-steal branch FIRST**, before legacy `pendingSteal`. Flip the order → 3-of-a-kind never resolves.
- **`applyShuffle` clears `pendingFuture`.** Any future card mutating draw-pile order must do the same (Intel Briefing peek + shuffle left stale IDs otherwise).
- **`nope-window-opened` is declared in `src/shared/types.ts:35` but NEVER emitted.** Engine emits `card-played`, `nope-played`, `nope-window-resolved`. Clients derive "window open" from `state.nopeWindow !== null`.
- **Combo `card-played.cardType` uses `cards[0]!.type`** (engine.ts:597 pair, :887 triple), NOT `matchType`. Client submission order `[AgX, op]` vs `[op, AgX]` produces different emitted cardType. Diverges from `combo-validation.ts:67` which derives matchType from first non-wild.
- **`MAX_NOPE_CHAIN = 10`**, chain-burn IS legal via `state.nopeWindow.generation` advancement. A-01 fix only rejected PROACTIVE single-Intercept plays, not chain-burn.
- **Eliminated players still receive full `PlayerView` broadcasts.** `projectForPlayer` returns `player?.hand ?? []`. Action dispatches from eliminated seats rejected at `engine.ts:115`.
- **Favor empty-hand auto-resolves.** `applyFavor` emits `favor-requested` + `favor-given {giverId === targetId}` with NO card transfer. Same for targets holding only Burned (filter excludes `c.type === 'burned'`). Locked by `rules-gaps-exhaustive.test.ts:220-244`.
- **All prompt-timeouts are gone.** Party-game policy: "game waits for you." Only Nope window has a server timer. Adding auto-resolve-by-timer to any pending prompt REVERSES the policy — product decision, not regression fix.
- **`pendingNameCard.cardIds` is projection-private.** Server-only; clients see `pendingPrompt = { type: 'name-card', ... }`.

## Client Patterns

- **`useSyncExternalStore` + notify rule.** When a single message updates multiple store slices that components read together, write ALL slices before triggering `notify()`. See `docs/insights/017-react-re-renders-read-stale-store-slice-if-update-order-wrong.md`.
- **`gameStore` is a singleton export.** HMR may not hot-replace reliably after editing — hard-refresh required.
- **`useCardPlay` has `maxStaged` param.** Favor mode passes `1` (auto-swap on second tap). Normal play passes `3`. Don't change to "reject second tap" without reviewing favor UX.
- **Favor-target keeps interaction LIVE.** Carve-out in `deriveInteractionPermission`: `pendingPrompt.type === 'favor-response' && playerId === myPlayerId` returns `{ allowed: true }`. Don't remove — lets the target double-tap their hand instead of opening a sheet.
- **`useDramaActive()` is the modal gate.** Any sheet / overlay that could cover a BURNED → EXTRACTED sequence must gate on it.
- **FuturePeek has NO countdown.** Old auto-close was bugged AND violated "game waits for you." User-triggered `Got it` only.
- **DramaOverlay burned is 2 beats for non-drawer, 1 beat for drawer.** `getDramaBeats` returns an array; queue processor handles multi-beat. Drawer distinction: `myPlayerId === event.playerId`. Board always sees both beats.
- **StealReport queue is local React state.** Multiple combo-steals while a player is away queue with `+N more` chip.
- **`combo-steal.cardType` is PRIVATE to stealer + target.** `stripPrivateEventFields` in `src/server/projection.ts` strips from public board + non-party players.
- **Hand sort lives in `useSortedHand`.** `TYPE_PIN_PRIORITY` pins Extraction rightmost, Intercepted second-rightmost.
- **`MinimalCard :active` scope.** Selector `.card:not([aria-disabled='true']):not([data-selected]):active` — both exclusions load-bearing. `[data-selected]` has `transition: none` for layoutId reflash dodge; `[aria-disabled='true']` is DiscardFan cards.
- **Intercept button bypasses outer `disabled` prop** in `SmartActionBox.tsx`.
- **Card illustration uses `object-fit: contain`, not `cover`.**
- **DiscardFan tilt pattern.** Top card centered; behind1 tilts left (-7°), behind2 tilts right (+7°). Preserve alternating tilt if adding fan layers.
- **Draw pile is decorative, discard is the hero.** `--size-draw-pile-width` ≈ 60% of `--size-discard-card-width`. Don't "unify."
- **Discard sizing media query.** `(min-height: 1000px) and (min-width: 1300px)` gates `flex-direction: column` on `.piles` + larger discard clamp (300→480px stacked vs 160→300px side-by-side).
- **`.table` box-sizing load-bearing.** `height: 100vh; box-sizing: border-box` so fixed-position status bar anchors to visible viewport edge.
- **DramaOverlay cqi factors pair with min tokens.** Hero 9cqi/32px, subdued 6cqi/24px, victory 8cqi/40px.

## Motion Conventions

- **`--motion-ease-accelerate` is ease-in.** Never point UI exit transitions at it — reads sluggish. `MOTION.exit` is `decelerate`-based. New easings should avoid `accelerate` for UI.
- **DramaOverlay fadeout uses GSAP `power2.out`, NEVER `power2.in`.** Emil rule #1: exits use ease-out because the user watches most closely at the start of the exit.
- **Framer transforms and CSS `:active` don't compose on the same element.** See `docs/insights/015-framer-transforms-lose-css-cascade.md`. Apply interactive states to a child.
- **CSS animations override `:active { transform }` without `animation: none`.** See `docs/insights/016-css-animation-vs-active-transform.md`.
- **`backface-visibility: hidden` is unreliable in Chrome.** See `docs/insights/014-backface-visibility-unreliable-in-chrome.md`. Use opacity crossfade at edge-on midpoint instead.
- **`contain: layout` (and siblings) trap `position: fixed` descendants.** See `docs/insights/013-contain-layout-traps-fixed-descendants.md`.
- **Case banner cascade timings (board mount) load-bearing.** `GameTable.module.css`: label 50ms, operation 120ms, sub 190ms, divider 260ms, footer 330ms, stamp 450ms; `DrawPile.module.css`: topCard 700ms, topSecretLabel 1000ms, fileNumber 1100ms. Tighten any → verify full arc reads "briefing → impact → folder lands."
- **Hand→enlarge + StagingArea crossfade use blur-mask.** `filter: blur(4px → 0 → 4px)` alongside `scale: 0.35 → 1 → 0.35`. MinimalCard's container-query thresholds flip mid-scale; 4px blur smooths the rejig. Don't exceed 6px — Safari mobile rasterization gets expensive.
- **Hover rules gated strict.** `@media (hover: hover) and (pointer: fine)` on every `:hover` in JoinScreen / SmartActionBox / GameOver / MinimalCard / Lobby startButton. Hybrid touch+trackpad laptops no longer fire sticky hover on tap.
- **Lobby disabled-sheen uses layered backgrounds, not pseudo-element.** `::after` is `display: none` when disabled; `::before` owns the `// ` prefix. Sheen is a `background-position` animation.
- **`keyframes stampDrop` and `caseBannerLineIn` live in `GameTable.module.css`.** `topCardDrop` and `topCardLabelIn` live in `DrawPile.module.css`. NOT in `tokens/primitives.css`.
- **DrawPile `.stack` has infinite breathe on scale; don't add scale to `.topCard`.** Would compound with parent breathing (1.025) and throb. `translateY(-24px → 0)` is the safe axis.
- **Nameplate standby is a KEYED SUBJECT, not null.** `STANDBY_SUBJECT` has `key: 'standby'`, `name: '.'`, `subtext: 'Standby'`, `standby: true`. Name-hide selector `.plateContent[data-standby='true'] .name { visibility: hidden }` — scoped to plateContent specifically so exiting standby plate keeps blank-name through rotateY exit.
- **`.nameplate` has opacity transition** (`--motion-duration-slow`). Wrapper opacity 0.55→1 during first coin flip. New `.nameplate` opacity changes inherit — scope via different selector if needed.
- **TargetSelect has button stagger; NameCard does NOT.** `@keyframes optionStagger` scoped to `.optionList > .optionBtn`. NameCard's 25 buttons would be ~1000ms cascade — motion soup.
- **PlayerStrip `.tile::before` uses `transform: scaleY()`, NOT `height`.** Fixed 3px; idle `scaleY(0.667)` ≈ 2px; active `scaleY(1)` ≈ 3px. GPU-composited — don't re-introduce a `height` transition.
- **SmartActionBox press scale.** `:active { animation: none; transform: scale(0.97) }` — explained in insight 016.
- **DefusePlacement ± buttons use `:active { scale(0.95) }`.** Deeper than 0.97 default — small round buttons show less motion per unit-scale. Don't go tighter than 0.93 (visible distortion on border-radius and font).
- **EliminatedView skull `scale(0.6)`.** Breaks Emil's 0.95 minimum intentionally (peak-ceremony rule-softening). Don't go back to 0.4 without explicit "0.6 lost the punch" verdict.
- **GameOver stagger is 80ms per row.** Play-again button delay tracks (`0.8 + rankings.length * 0.08 + 0.3`). Change both.
- **Status strip key is `statusText || '__standby__'`.** Falsy statusText maps to `// STANDBY` placeholder; unkeyed branch breaks `mode="wait"`.

## Dev Tooling

- **`pnpm dev:launch`** uses Chrome's positional-URL multi-tab mode. `chrome.exe [flags] url1 url2 url3`. Popup blocker irrelevant. If you re-introduce browser-side spawning, the isolated `.chrome-dev-profile/` re-blocks popups.
- **Lobby debug toolbar was removed.** Don't restore Whiskrs/Mittens/Tuna/Pickles quick-join `<a>` strip. `pnpm dev:launch` owns dev-time spawning.
- **Layout-sweep detector only flags `overflow: hidden|clip`.** Elements with `overflow: visible` don't clip — pseudo-elements with negative `inset`, focus rings, tooltips extend by design. Flagging `visible` re-surfaces ~57 false positives.
- **`window.__gameStore` dev hook.** Guarded by `import.meta.env.DEV`. Tree-shaken from prod — `E-03` regression test greps `dist/**/*.js` for the string.
- **`window.__testInjectEvent(event)` dev hook.** Same guard, same tree-shake. Pushes a synthetic `GameEvent` into `accumulatedEvents` + notifies — DramaOverlay/PlayerAlert/StealReport fire their real motion pipeline without needing a multi-player game flow to reach a specific moment. Used by `drama-beat-timing.spec.ts`. Verified by `verify-prod-bundle.ts` sentinel.
- **`chrome-devtools-mcp` wired in `.mcp.json`.** Sits alongside the 11 Playwright seats; loads on Claude Code session start. CDP-level access (perf traces, heap snapshots, real-device remote attach, network/CPU throttling) — fills the gap Playwright wraps but doesn't expose. Use it for *quantitative motion / memory / perf* work that DOM-state polling can't see. Eye-in-loop motion calibration was the original driver (memory note `feedback-eye-in-loop-beats-calibration-for-motion.md`).
- **`.chrome-dev-profile/` is gitignored.** Delete to reset dev Chrome profile.
- **Wrangler local SQLite corruption recovery.** `taskkill //F //IM workerd.exe && rm -rf .wrangler/state`.
- **Dev launcher popup throttling.** User gesture must remain active; don't `setTimeout` `window.open` calls.

## Imagen Asset Workflow

See also `docs/insights/018-imagen-priors-engineer-around-dont-fight.md` for the meta-lesson on unbreakable priors.

- **Critical-eyeball-before-presenting is non-negotiable.** Tell Briggsy what you ACTUALLY see — flaws included — before he has to point them out.
- **Full-bleed is the deck standard.** Prompt pattern: `'the scene fills the entire square frame edge to edge with NO white borders NO vignette NO padding'`.
- **Asset archive convention.** `public/assets/roster/_archive/<name>-<date>-<tag>.png`. Rejected variants suffix `-<reason>-rejected.png`.
- **Imagen anomaly retry pattern.** ~3/50 rolls return total anomalies (golden retriever, cliff landscape, CAD drawing). Retry once — always fixes by second roll.
- **Imagen safety filter inconsistent.** Retry a failed generation before assuming the prompt is unsafe.
- **Regen scripts are per-character.** `set -a && source .env && set +a && npx tsx scripts/regen-<name>.ts`. Output to `temp/roster/<name>.png`; eyeball before swapping into `public/assets/roster/`.

## Characters

5 operatives in the card deck + Otto (roster only) + Agent X (wild). All locked as Archer archetypes (1:1 mapping):

| BURNED name | Archer counterpart | Category |
|---|---|---|
| Dash Barlowe | Sterling Archer | Operative |
| Vera Khan | Lana Kane | Operative |
| Sable Ashworth | Cheryl Tunt | Operative |
| Janet Broadside | Malory Archer | Operative |
| Neal Proctor | Cyril Figgis | Operative |
| Otto | Krieger | Roster only (not in card deck) |
| Agent X | — | Wild |

Visual-DNA rule: when a character appears in a new card or arena surface, preserve their established design. The Archer "visually archetype / named differently" contract is load-bearing for tone — breaking it changes what BURNED feels like.
