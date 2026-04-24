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

## Bundle Sizes

Last measured 2026-04-23. Re-run `pnpm build` and update after material changes.

| Chunk | Raw | Gzipped | Load |
|-------|-----|---------|------|
| player entry | 47.73 KB | 14.77 KB | Initial |
| board entry | 41.41 KB | 14.05 KB | Initial |
| shared (React + Motion core, `config-*`) | 209.65 KB | 66.83 KB | Initial (shared) |
| VisualElement (`is-ref-object-*`) | 39.93 KB | 14.40 KB | Initial (shared) |
| motion-features (domMax) | 83.57 KB | 27.41 KB | Lazy (prefetched) |

**Phone initial JS: ~96 KB gzipped** (under 100 KB budget, ~4 KB headroom)

## Workers / Protocol Landmines

- **`src/server/room.ts` may ONLY export the `GameRoom` class** (and the default worker handler). Any other named export crashes Wrangler boot. Helpers and constants live in `src/server/validation.ts` (mirrors constants tests need) or a new server-side module.
- **Session tokens live in `sessionStorage`, not `localStorage`.** Per-tab isolation fixes dev-launcher multi-tab clobber. Closing a tab fully kills the session; closed-tab players fall back to name-reclaim.
- **Name-reclaim mid-game.** Server's `handleJoin` accepts bare-name rejoin if (a) name matches an existing player and (b) no other device is actively connected as that name. Identity theft blocked by the `activelyConnected` check — don't relax.
- **Protocol version bumps.** When the wire format changes, bump `PROTOCOL_VERSION` in `src/shared/protocol.ts` AND update `gameStore.test.ts`. Mismatched clients get "Game updated — please refresh."
- **Origin allowlist** at `src/server/room.ts` connection accept. Localhost + LAN for dev; `https://burned.pages.dev` in prod. Any new dev origin must be whitelisted.

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
