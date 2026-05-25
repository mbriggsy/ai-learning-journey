---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-24T21:28:02-04:00
doc-reviewed: 2026-05-24T21:45:00-04:00
---

# Phase 7 — Bottom CTA

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. Read [phase-1-scaffold.md](phase-1-scaffold.md) (the semantic tokens — `--font-mono`, `--surface-elevated`, `--border-subtle`, `--text-primary/secondary/muted`, `--accent-focus`, `--space-*` — and the motion foundation: `useGSAP`, `ease.arrive`, `duration.reveal`, `stagger.supportingLines`, `prefersReducedMotion()`, `import.meta.env.DEV`, the `<Name>/<Name>.module.css` convention this phase REUSES), [phase-2-data-wiring.md](phase-2-data-wiring.md) (so you know the CTA is the ONE landing surface that reads NO `stats.json` — see Decision 5), [phase-4-grid.md](phase-4-grid.md) (the **`LiveLinkButton`** shared leaf this phase reuses for the secondary CTA, and the **ScrollTrigger registration + global `ScrollTrigger.refresh()` race** this phase depends on but does NOT duplicate — see Decision 9), and [phase-6-about.md](phase-6-about.md) Decision 3 (the install-snippet **parity** contract — About §2 and this CTA call the SAME `resolveCtaCopy`). This file is the decisions-not-code recipe for the landing page's closing beat.

Phase 7 lands the **bottom CTA** — the editorial spine's closing beat (ideation §4 / editorial spine beat 4: "Try the tool / see the code"). It lives at the **bottom of the Landing page, below the project grid — NOT footer-pinned**. It is the site's pitch for the `claude-credit` tool itself: a primary "install + run it on your own repo" command, and a secondary "Source on GitHub" link. The site IS a demo of the tool; this is where a convinced peer acts on it. It is the **only landing surface that consumes no `stats.json` data** — its sole dynamic input is the resolved CTA state (published / not-yet-published), which it reads from a typed config module, not the data layer.

The bar for "Phase 7 done": the closing beat renders the install command (when published) in a clean selectable mono block — no fake terminal chrome — that **scrolls rather than crushes** at 360–430px; the secondary GitHub link is a real ≥44px focus-ringed target; the block reflects whichever state preflight −1.1 resolved (A/C published → command block; B not-published → deliberate prose, no empty box; UNRESOLVED → STATE-B default + a dev-visible failure, never a literal placeholder) **and a test fails loud if that state has drifted from `editorial.md`'s receipt**; it reveals on scroll in the site's `weighted` dialect and, if the motion layer dies, **stays fully visible**; both light and dark pass the water-bead bar; command and link text pass a **measured** contrast probe in both modes (Briggsy is color blind — never eyeball it); the headline reads like a sharp builder-to-builder line on a cold read. **Eye-on-browser in BOTH modes, BOTH published/unpublished states, is the gate — green tests are not enough** (manifesto).

---

## Decisions locked at this deepening (read before executing)

1. **The resolved CTA state reaches the app through a typed module `src/lib/cta.ts` — NOT through `stats.json`, NOT by parsing `editorial.md` at build — and a test keeps the constant honest against the `editorial.md` receipt** (the one real architecture decision this phase owns; the stub and About §2 both hand-waved it). Verified gap: `stats.json` (Phase 2) is the *only* runtime data channel and it is generated **purely from `claude-credit` output** (`buildMultiProjectReport`) — it carries per-project `EditorialContent`, but the **site-level `## CTA state` block lives in `docs/editorial.md`**, a hand-authored worksheet (created in preflight −1.5, filled by −1.1) that **nothing in the build pipeline reads**. So "reads the editorial.md block at build time" (About §2's phrasing) has no wired mechanism. Resolution:
   - `src/lib/cta.ts` exports a pure **`resolveCtaCopy(state)`** (the state→copy mapping, unit-tested) + a single hand-maintained **`CURRENT_CTA_STATE`** constant + the constant **`SOURCE_URL`**. `editorial.md`'s `## CTA state` block stays the **human source-of-truth receipt**; `cta.ts` is the **committed machine mirror** an `import` resolves at build time (a TS import *is* "read at build time"). Preflight −1.1's resolution sets `CURRENT_CTA_STATE` (Cascade → preflight, now applied).
   - **The mirror is ENFORCED, not hoped** (doc-review fix — adversarial + scope-guardian). `cta.test.ts` reads `docs/editorial.md`'s `## CTA state` block, parses the resolved state letter, and asserts it **equals `CURRENT_CTA_STATE`**. This restores the drift-immunity the rejected parser had — at near-zero cost and **without** coupling the *build* to markdown shape (a **test** that breaks on a format change fails LOUD and safe in CI/local; a *build pipeline* that silently ships wrong data is the danger). This is what catches the worst case (Decision 3): the tool gets published but `CURRENT_CTA_STATE` is left stale at `B`/`unresolved`.
   - **Rejected: a markdown parser in `refresh-stats.ts`** that extracts the block into `stats.json`. It mixes hand-authored copy into a data-derived artifact and couples the *build* to the doc's markdown shape. The parity *test* above gets the drift-immunity benefit without putting markdown parsing on the publish path.
   - **Rejected: a second fetched file** (`public/data/cta.json`). A second network resource + Suspense surface for one constant is not worth it; a bundled import is simpler and has zero runtime cost.

2. **`resolveCtaCopy` is the single shared install-string source, owned + tested here; `src/lib/cta.ts` is created by whichever consumer executes first** (parity with About §2 is by construction). About §2 is **install-only**; Phase 7 carries **install + a first-run line**. So `resolveCtaCopy(state)` returns BOTH `install` and `firstRun`; About §2 consumes `.install`, Phase 7 consumes both. "Parity" = the **same install string from the same function**, NOT the same layout. Phase 6 Decision 3 explicitly reserved this: *"If Phase 7 already unit-tests this state→snippet mapping, inherit it — do NOT duplicate."* This phase writes that test (`src/lib/cta.test.ts`); About §2 inherits it and verifies its own block by eye.
   - **Creation-order guard (doc-review fix — adversarial):** Phase 6 (About) is sequenced *before* Phase 7, and "plans are menus not orders." So `src/lib/cta.ts` is a **hard prerequisite for About §2** as much as for this CTA: **whichever of {About §2, Phase 7} executes first CREATES `src/lib/cta.ts` + `cta.test.ts`**; the second consumer imports the existing module. The Cascade flags this on Phase 6 so About §2 doesn't reference a module with no producer.

3. **Four states, locked structure; the published-vs-not branch is guarded against a silent stale state** (mirrors About §2's state discipline; the headline/prose prose is voice-tunable in the −1.5 worksheet, the *structure* is locked here):
   - **STATE A** (unscoped, published): headline **"Try `claude-credit` on your own repo"** + a mono command block with the **install** line `npm i -g claude-credit` AND the **first-run** line `claude-credit --all --json > stats.json` + the secondary "Source on GitHub →".
   - **STATE C** (scoped, published): identical, install line `npm i -g @mbriggsy/claude-credit`.
   - **STATE B** (not yet published): headline **"`claude-credit` ships alongside this site"** + plain body prose pointing at the repo + **NO command block** + the secondary source link (which **IS** the "watch the repo" affordance — do not invent a separate watch link). Must read as a deliberate paragraph, never a broken/empty STATE A. **Prose copy is finalized in the −1.5 worksheet** (Briggsy's voice review) and must **echo the −1.1 receipt wording** ("ships alongside this site — watch the repo"); avoid an unverifiable imminent-release *promise* — "watch the repo" is the honest, durable affordance even if publication slips (doc-review — adversarial: a forward-looking timing claim rots).
   - **STATE UNRESOLVED** (the `CURRENT_CTA_STATE` constant is missing/`'unresolved'`): render **STATE B copy as the safe default** AND **fail loud in dev** (`console.error` gated to `import.meta.env.DEV`). `resolveCtaCopy('unresolved')` returns the STATE-B shape with `degraded: true`; the component fires the dev error when `degraded`. **Never an empty mono box, never a literal placeholder string.**
   - **The silent-stale-state hole + its guard (doc-review fix — adversarial P1).** The dev `console.error` only fires for `'unresolved'` — it does **NOT** catch the worse case: the tool IS published (true A/C) but `CURRENT_CTA_STATE` was left at a stale `'B'` (which returns `degraded: false` → no signal), silently telling peers to "watch the repo" for an installable tool, and `import.meta.env.DEV` strips even the unresolved signal from prod. The app can't self-detect the "true" state. **The guard is the Decision-1 parity test** (`cta.test.ts` asserts `CURRENT_CTA_STATE` matches `editorial.md`'s resolved receipt) — that is the load-bearing protection against a stale state shipping, not the dev console. Run it in CI / pre-deploy.

4. **The command block is clean selectable mono — NO fake terminal chrome — and the copy-cleanliness of the prompt is verified in WebKit, not assumed** (frontend-design + emil; the one novel visual element no sibling phase has designed). A quiet bordered block (`--surface-elevated` + `--border-subtle` + `--radius-tile`), `--font-mono` (JetBrains), text **selectable** with `cursor: text` so the affordance reads (doc-review — design-lens: nothing else signals "select me" until the Phase 9 copy button). **No window dots / traffic lights / faux title bar** — that is the AI-slop signal the bar forbids. A decorative **`$ ` prompt** so a peer reads it as a shell command:
   - **Prompt copy-cleanliness (doc-review fix — feasibility):** the intent is that selecting a line copies the command WITHOUT the leading `$ `. `user-select: none` on a `::before` reliably excludes it in Chromium/Firefox, but **WebKit/Safari has historically included `::before` content in a range copy anyway** — and the AI-peer audience skews Mac/Safari. So: (a) the verify gate tests select-and-copy **explicitly in WebKit/Safari**, not just Chromium; (b) **fallback if WebKit pollutes** — render the prompt as a separate `aria-hidden` sibling element with `user-select: none` outside the selectable command span, or **drop the decorative prompt entirely**. A clean copy beats a decorative `$`. Never ship a prompt that pollutes the copy.
   - **No copy-to-clipboard button in v1** — parity with About §2's deferral; it is the prime **Phase 9** nicety and MUST then use a text-swap ("copied", never color-only — Briggsy is color blind), a `:focus-visible` ring, ≥44px, and an `aria-label`. (`cursor: text` is the v1 interim affordance and must NOT be treated as "copy already solved" when Phase 9 adds the button.)
   - The command lines are **info-bearing → `--text-primary`** (passes the contrast probe in both modes); the `$` prompt is decorative → `--text-muted`.

5. **The CTA reads NO `stats.json` — it is data-independent, so there is NO Phase 0 precondition gate.** Unlike hero/grid/detail, nothing here iterates `projects[]` or reads `combined.*`/`tokens`. Its only dynamic input is `CURRENT_CTA_STATE` (a committed constant). This is why the phase has no `useStats()` call, no null-degrade-on-data branch, and no `dist/taxonomy.d.ts` grep — and why it can be built even if Phase 0 hasn't executed. (Note — "data-independent of `stats.json`" is NOT "independent of reality": STATE B's copy is a claim about the tool's real publish status; the Decision-1 parity test is what keeps that claim honest — see Decision 3.)

6. **The secondary CTA REUSES `LiveLinkButton` (Phase 4), not a new component.** `LiveLinkButton({ href, label })` already renders `<a target="_blank" rel="noopener noreferrer">` in `--accent-primary` with the arrow, `position: relative; z-index: 1`, `min-height: 44px`, padding, a `:focus-visible` ring (`--accent-focus`), `border-radius: var(--radius-chip)`. The CTA passes `label="Source on GitHub →"` + `href={SOURCE_URL}`. This is exactly the reuse Phase 4's cascade predicted. No new leaf component.

7. **Motion = the site's reveal dialect only; NO bespoke flourish** (emil restraint + the README "one wow moment per surface" rule). The CTA is **below the fold** → it reveals on scroll via **ScrollTrigger (registered in Phase 4 — reused, no new plugin)**. It is seen **once per visit** ("occasional" in emil's frequency table) → a standard reveal is correct, not removed. It is **one section, not a list** → a **single `ScrollTrigger` (start `'top 85%'`, `once: true`)** with a small child stagger (headline → command-block-or-prose → secondary), `stagger.supportingLines` (0.08 = 80ms, top of emil's 30–80ms band) — **NOT `ScrollTrigger.batch`** (that is the tile-list pattern). The CTA is **not** one of the README's named wow moments (hero counter, tile hover, detail donut, route cross-fade) — so it gets **no bespoke flourish**; the reveal *is* its motion.

8. **The P0 invisible-content guard is load-bearing here too** (same class as the grid's): the hidden initial state is applied by **`gsap.set(..., { autoAlpha: 0 })` in JS, NEVER a CSS `opacity: 0` default**, and `prefersReducedMotion()` returns **before** any `gsap.set`. A dead motion layer (ScrollTrigger absent, JS throw, trigger never fires) then degrades to a **fully-visible CTA**, never a blank closing beat. No motion on the secondary link or the command block (insight 035 — no continuous motion on interactive/click targets).

9. **Reveal position depends on Phase 4's GLOBAL `ScrollTrigger.refresh()`; this phase does not duplicate it, but the dependency is now an explicit invariant + a Phase-4 cascade** (doc-review fix — adversarial P1 + feasibility). The CTA sits below the hero + grid + hero images; their late settling (fonts, images) shifts the CTA's trigger position. Phase 4 wires the global self-heal (`Promise.race([document.fonts.ready, timeout(1500)])` + `window load`, both → `ScrollTrigger.refresh()`), fired from `ProjectGrid`. `ScrollTrigger.refresh()` is global + idempotent → it refreshes the CTA's trigger too. Two risks the original draft left implicit:
   - **Empty-grid edge:** Phase 4's `buildGridModel.isEmpty` makes `ProjectGrid` "render nothing." `useGSAP` is a hook (runs before any `return null`), so the refresh race still fires **provided it is not gated behind the `isEmpty` path**. On *this* site the 12-surface grid is never genuinely empty (an empty grid means an empty `stats.json` → the hero is broken too), so this is defense-in-depth, not a live bug — but resting on an unstated invariant is the failure the manifesto forbids. **Cascade → Phase 4:** state that the `ScrollTrigger.refresh()` race must run **unconditionally** in `ProjectGrid`'s `useGSAP` (not gated on `isEmpty` or on `[data-tile]` existing).
   - **Co-mount invariant (stated, not hoped):** **`BottomCta` MUST co-mount on a route with a `ProjectGrid` that runs the refresh race (Landing, in v1).** If a future change renders `BottomCta` on a route without the grid, Phase 7 must then wire its own `requestAnimationFrame(() => ScrollTrigger.refresh())` + `document.fonts.ready` self-heal. v1 relies on the co-mount; the invariant is written so a later edit can't break it silently. Verify with throttled images that the CTA reveals at the right position.

10. **`/frontend-design` + `/emil-design-eng` both fired at this deepening** (Briggsy's "as appropriate"). The closing-beat composition (negative space, type-led restraint, the centered close bookending the centered hero, anti-slop) is the frontend-design call; the command-block material treatment, the `cursor: text` + prompt copy-cleanliness, the reveal-vs-no-flourish restraint, and reduced-motion are the emil calls. Baked into the recipe below, not deferred to Phase 9 (Phase 9 is final polish iteration + the copy-button nicety, not first-build design).

11. **Three commits, static-first — matching the sibling rhythm** (doc-review fix — scope-guardian: separability, not size, is the commit-granularity criterion). C1 = `cta.ts` + `cta.test.ts` (pure logic + the receipt-parity test, no markup — a clean green rollback point). C2 = the static `BottomCta` composition (both state branches at final visible state, no motion) + `BottomCta.module.css` + the Landing wire (its own eye-on-browser verify gate). C3 = motion (reveal stagger + reduced-motion + P0 guard). This isolates the only non-trivially-reversible step (markup + CSS) from the trivially-correct pure logic, and matches Phases 3/4's rhythm. Separability — not size — is the commit-granularity criterion: `cta.ts` green-tested is a clean rollback point that merging it with markup would lose.

---

## Source facts (verified at deepening, 2026-05-24)

**The CTA-state plumbing gap (the decision Phase 7 owns):**
- `stats.json` is generated only from `buildMultiProjectReport` (read of `tools/claude-credit/src/cli.ts` `--all --json` path + `phase-2-data-wiring.md`). It carries per-project `EditorialContent`; it has **no site-level CTA field**.
- The `## CTA state` block is authored into **`projects/claude-credits/docs/editorial.md`** by preflight −1.1 Step 5 (`phase-preflight.md`). `refresh-stats.ts` does **not** read `docs/`. → no existing channel to the app; `src/lib/cta.ts` is that channel, and `cta.test.ts` reconciles it against the `editorial.md` receipt (Decision 1).

**Verbatim CTA copy per state** (from `phase-preflight.md` −1.1, the source `resolveCtaCopy` encodes):
- **STATE A:** install `npm i -g claude-credit` · first-run `claude-credit --all --json > stats.json`
- **STATE B:** *(no published install)* — prose "ships alongside this site — watch the repo"; first-run: none
- **STATE C:** install `npm i -g @mbriggsy/claude-credit` · first-run `claude-credit --all --json > stats.json`

**Source / GitHub facts:**
- GitHub remote is **public** (preflight −1.1 verified `https://api.github.com/repos/mbriggsy/ai-learning-journey` → 200). **`SOURCE_URL = https://github.com/mbriggsy/ai-learning-journey`** is **decided and safe today** — no dependency, no gate.
- Whether the *primary* CTA shows a command block depends on −1.1's A/B/C resolution (`CURRENT_CTA_STATE`); the *secondary* source link is unconditional.

**Phase 1 / Phase 4 primitives inherited (consume — do NOT redefine; verified at deepening):**
- Tokens (semantic, mode-aware): `--font-mono` (JetBrains), `--font-display` (Satoshi, the headline), `--surface-elevated`, `--surface-glass-blur`, `--border-subtle`, `--radius-tile`, `--radius-chip`, `--text-primary` (command lines, AA), `--text-secondary`, `--text-muted` (decorative `$` only), `--text-link`, `--accent-primary`, `--accent-focus`, `--space-*`, `--text-display-md`, `--text-body`, `--text-meta`. **Info-bearing text uses `--text-primary`/`--text-secondary` (≥7:1), NEVER `--text-muted`** (the shared `--text-muted` measured ~2.9–3.3:1 and fails WCAG AA for body text — Phase 3 cascade raises its floor, but don't lean on it for the command).
- `LiveLinkButton` (`src/components/LiveLinkButton/`, Phase 4): prop-shaped `{ href, label? }`, the shared external-link leaf (Decision 6).
- Motion (Phase 1/4): `useGSAP` + the registered **`ScrollTrigger`** (Phase 4) from `@/motion/gsap-context`; `ease.arrive` (`weighted-arrive`); `duration.reveal` (0.8); `stagger.supportingLines` (0.08); `prefersReducedMotion()` + the `global.css` reduced-motion backstop. Easings are boot-imported in `main.tsx` (Phase 1 landmine). **No new GSAP plugin.**
- `import.meta.env.DEV` — confirmed valid in this Vite stack (BURNED uses it identically; `false` in the prod bundle so the dev `console.error` is stripped).
- Component convention (Phase 3): `src/components/<Name>/<Name>.tsx` + `<Name>.module.css`; `useGSAP(() => {…}, { scope: ref })`; `prefersReducedMotion()`-first.
- `clsx@^2.1.1` (Phase 3) is available for the state-conditional classes.

**Institutional insights that bind this page** (`projects/burned/docs/insights/`):
- **068** — match the site's `weighted` motion dialect (Decision 7). **035** — no continuous motion on interactive click targets (Decisions 7/8). **010 / 051** — measure command/link contrast in both modes; CVD intuitions are wrong-direction (Briggsy color blind — the "done" bar). **006** — CSS fallback declarations precede the modern property. **012** — if `@layer` is in play, wrap the component CSS in the project's layer.

**Mobile / overflow anchor** (`projects/undercover-mob-boss/public/how-to-play.html`): UMB's scroll idiom is `overflow-x:auto` on a wrap around an intrinsically-wide child. The CTA is mono *lines*, not a table, so it substitutes per-line `white-space: nowrap` to force intrinsic width — AND the `.commandWrap` needs an explicit `max-width: 100%` (`place-items: center` would otherwise size it to content and the scrollbar would never engage — feasibility fix). Verify the longest command scrolls inside the block at 360px, never overflowing the page.

---

## The CTA contract (locked composition — top to bottom)

A centered closing beat that bookends the centered hero. Generous top air (a movement break — `var(--space-24)` above) so it reads as a deliberate exhale, not a crowded footer. **Nothing footer-pinned**; it scrolls as the last content of the Landing page. Both modes; type-on-background, no card around the whole beat (the command block is the only bordered surface).

```
        ··· (generous negative space — the close, not a footer) ···

                  Try  claude-credit  on your own repo            (1) headline — Satoshi display;
                       └ mono inline ┘                                 the tool name in --font-mono inline
                                                                       (size/baseline-corrected vs Satoshi)

              ┌─────────────────────────────────────────────┐
              │ $ npm i -g claude-credit                    →│   (2) command block — mono, selectable
              │ $ claude-credit --all --json > stats.json   →│       (cursor:text); `$ ` prompt clean-copy
              └─────────────────────────────────────────────┘       verified in WebKit; scrolls w/ right-edge
                                                                     cue on mobile  [STATE A/C only]

                          Source on GitHub →                    (3) secondary — LiveLinkButton,
                                                                     ≥44px, focus ring (unconditional)

   ── STATE B (not published) replaces (2) with: ──
                  claude-credit ships alongside this site
                       watch the repo                           (prose, same grid gap as STATE A so the
                          Source on GitHub →                     beat height is stable; type-on-background;
                                                                 the source link IS the watch affordance)
```

*(Copy is ILLUSTRATIVE for the headline/prose — exact words are voice-finalized in the −1.5 worksheet, per Phase 6's handling of §1/§2 prose, and must echo the −1.1 receipt. The install/first-run command strings come verbatim from the resolved CTA state via `resolveCtaCopy`. The STRUCTURE — which elements appear per state — is locked.)*

**Element specs:**

| # | Element | Source | Type / token | Color | State / null behavior |
|---|---|---|---|---|---|
| 1 | Headline | `resolveCtaCopy(...).published` picks the copy | `--font-display` (Satoshi), `--text-display-md`+ ; inline tool name in `--font-mono`, **size/baseline-corrected** (`.toolName`, Decision below) | `--text-primary` | A/C → "Try `claude-credit`…"; B/UNRESOLVED → "`claude-credit` ships alongside this site" |
| 2 | Command block | `resolveCtaCopy(...).install` + `.firstRun` | `--font-mono`, selectable, `cursor: text`; `$ ` prompt clean-copy (WebKit-verified, Decision 4); `.commandWrap` `overflow-x:auto; max-width:100%` + per-line `nowrap` + right-edge scroll cue | command `--text-primary`; `$` `--text-muted` | A/C → render both lines; **B/UNRESOLVED → omit the block entirely**, render the prose line instead. No copy button v1. |
| 3 | Secondary link | `SOURCE_URL` (const) | `LiveLinkButton` `{href, label:"Source on GitHub →"}`, `min-height:44px`, `:focus-visible` ring | `--accent-primary` | **always present** (the source is decided + safe today; in STATE B it doubles as the "watch the repo" affordance) |

---

## Output structure (what this phase adds)

```
projects/claude-credits/
├── src/
│   ├── lib/
│   │   ├── cta.ts                 # NEW — CtaState · resolveCtaCopy() · CURRENT_CTA_STATE · SOURCE_URL (created by first consumer of {About §2, Phase 7})
│   │   └── cta.test.ts            # NEW — state→copy mapping (A/B/C/unresolved) + sourceUrl invariant + the editorial.md↔CURRENT_CTA_STATE parity guard (vitest, node env)
│   ├── components/
│   │   └── BottomCta/
│   │       ├── BottomCta.tsx          # NEW — composition + state branch + dev fail-loud + reveal (useGSAP)
│   │       └── BottomCta.module.css   # NEW — closing-beat layout, mono command block, scroll cue, both modes, mobile + safe-area
│   └── pages/
│       └── Landing.tsx            # MODIFIED — append <BottomCta/> below <ProjectGrid/>
└── (reuses LiveLinkButton + ScrollTrigger from Phase 4; clsx from Phase 3; NO new package deps)
```

Scope declaration, not a constraint — the per-commit file lists below are authoritative. (`src/lib/cta.ts` may already exist if About §2 was built first — Decision 2; this phase imports it rather than re-creating it.)

---

## Dependencies

**No new package deps.** `LiveLinkButton` (Phase 4), `ScrollTrigger` (registered Phase 4, ships inside `gsap@^3.14.2`), `clsx@^2.1.1` (Phase 3) all already exist. `vitest.config.ts` already globs `src/**/*.test.ts` (Phase 3) → `cta.test.ts` runs with no config change. The parity-guard test reads `docs/editorial.md` from disk (node `fs`) — fine in the vitest `node` env. **No Phase 0 data dependency** (Decision 5).

---

## Execution — three commits, ordered (static-first)

Each commit has a verify gate. Don't proceed past a red gate (manifesto: runtime truth > "it compiles").

### Commit 1 — `src/lib/cta.ts` + tests (pure logic + the receipt-parity guard)

The pure-logic concentrate, with a clean green rollback point before any markup (Decision 11).

**7.1a — `src/lib/cta.ts`** (pure resolver + the single hand-maintained state constant + the source URL):
- `type CtaState = 'A' | 'B' | 'C' | 'unresolved'`.
- `interface ResolvedCta { published: boolean; install: string | null; firstRun: string | null; sourceUrl: string; degraded: boolean }` — **no `state` passthrough field** (doc-review — scope-guardian: it had zero consumers; the component branches on `published`/`degraded`, callers already hold `CURRENT_CTA_STATE`).
- `resolveCtaCopy(state: CtaState): ResolvedCta` — pure, exhaustive `switch`:
  - `'A'` → `{ published: true, install: 'npm i -g claude-credit', firstRun: 'claude-credit --all --json > stats.json', degraded: false }`
  - `'C'` → same but `install: 'npm i -g @mbriggsy/claude-credit'`
  - `'B'` → `{ published: false, install: null, firstRun: null, degraded: false }`
  - `'unresolved'` (and the `default`) → same shape as `'B'` but `degraded: true`
  - all carry `sourceUrl: SOURCE_URL`.
- `CURRENT_CTA_STATE: CtaState` — **the single value preflight −1.1 sets.** A loud comment marks it: *"Machine mirror of `docs/editorial.md` `## CTA state`. Set by preflight −1.1 when the publish gate resolves. The `cta.test.ts` parity guard fails loud if this drifts from the editorial.md receipt. Default `'unresolved'` → STATE-B copy + dev fail-loud until −1.1 resolves."* Default `'unresolved'`.
- `SOURCE_URL = 'https://github.com/mbriggsy/ai-learning-journey'` (decided + safe today).
- **Bootstrap note:** if `cta.ts` is created (by About §2 or this phase) before −1.1 has been run, leave `CURRENT_CTA_STATE = 'unresolved'`; −1.1 sets it (and writes the matching `editorial.md` receipt) when it resolves. The parity test (7.1b) skips/﹩is-pending when the `## CTA state` block is absent and asserts equality once it exists — it must not hard-fail merely because preflight hasn't run yet (it fails on *drift*, not on *absence*).

**7.1b — `src/lib/cta.test.ts`** (the state→copy mapping + the receipt-parity guard):
- A → unscoped install + the first-run line + `published: true` + `degraded: false`.
- C → scoped install (`@mbriggsy/claude-credit`) + the first-run line + `published: true`.
- B → `install: null`, `firstRun: null`, `published: false`, `degraded: false`.
- `unresolved` → STATE-B copy (null install/firstRun, `published: false`) AND `degraded: true`.
- Invariant: `sourceUrl === SOURCE_URL` for every state.
- Parity guard: the STATE-A install string equals the exact `npm i -g claude-credit` literal (the string About §2 also renders).
- **Receipt parity (Decision 1 — the drift/stale-state guard):** read `docs/editorial.md`; if a `## CTA state` block with a resolved `State: A|B|C` is present, assert it **equals `CURRENT_CTA_STATE`**. If the block is absent or still shows the `[A | B | C]` placeholder (preflight not run), the assertion is **skipped (pending)**, not failed — it guards against *drift*, never against *not-yet-resolved*.

**7.1c — `vitest` runs** — no config change (Phase 3's glob covers `src/**/*.test.ts`).

**Verify gate:**
```
pnpm test        # cta.test.ts green: A/B/C/unresolved + sourceUrl invariant + receipt-parity (skipped-pending pre-preflight, equality once resolved); Phase 2–4 tests still green
pnpm typecheck   # clean (exhaustive switch; no unused; no `state` field)
```

**Commit:** `feat(claude-credits): cta-state resolver + editorial.md receipt-parity guard`

---

### Commit 2 — static `BottomCta` composition + CSS + Landing wire (no motion)

The layout / state / responsive / contrast truth gate. Real states, FINAL visible state, NO animation.

**7.2a — `src/components/BottomCta/BottomCta.tsx`** (static composition):
- `const cta = resolveCtaCopy(CURRENT_CTA_STATE)`.
- Dev fail-loud: `if (cta.degraded && import.meta.env.DEV) console.error('BottomCta: CTA state unresolved — set CURRENT_CTA_STATE in src/lib/cta.ts from editorial.md ## CTA state. Rendering STATE B.')`. **Never throws** (the page must still render); never shows the user a placeholder. (The *stale-but-not-unresolved* case is caught by the C1 receipt-parity test, not here — Decision 3.)
- Branch on `cta.published`: published → headline "Try `claude-credit`…" + the mono command block (`cta.install` line + `cta.firstRun` line, `$ ` prompt) ; not published → headline "`claude-credit` ships alongside this site" + the prose line, **no block**.
- Always render `<LiveLinkButton href={cta.sourceUrl} label="Source on GitHub →" />`.
- **Reveal hooks placed now (so C3 only adds the `useGSAP` block):** put a stable `data-reveal` attribute (or collect a ref) on each of the three reveal targets — headline, the command-block-OR-prose element, the link wrapper. **Build the reveal target list per state** so STATE B (no command block) reveals the prose element, not a null ref (feasibility fix — a null in the `gsap.set` array would throw inside `useGSAP`, defeating the P0 guard). `clsx` drives the `published`/`not-published` class.

**7.2b — `src/components/BottomCta/BottomCta.module.css`** (closing-beat layout + the command block, both modes, mobile):
- `.cta`: centered (`display:grid; place-items:center; gap: var(--space-6)`), `padding: var(--space-24) var(--space-6) var(--space-16)`, `text-align:center`. NOT `position: fixed`/footer-pinned.
- `.headline`: `--font-display`, `--text-display-md` (or one step up), `--text-primary`. The inline tool name `.toolName { font-family: var(--font-mono) }` — **with optical correction** (doc-review — design-lens: JetBrains Mono reads larger and sits differently than Satoshi at equal em): start at `font-size: 0.88em` + a small `vertical-align` tweak; the verify gate includes a cold look at the inline span in both modes.
- `.commandWrap`: `overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%; position: relative` (the `max-width:100%` is load-bearing — `place-items:center` would otherwise size it to content and the scroll never engages — feasibility fix).
- `.commandBlock`: `--surface-elevated` + `backdrop-filter: blur(var(--surface-glass-blur))`, `--border-subtle`, `--radius-tile`, `padding: var(--space-4) var(--space-6)`, `font-family: var(--font-mono)`, `--text-primary`, `user-select: text`, **`cursor: text`** (the v1 selectability affordance — design-lens). Each command line `white-space: nowrap`. **No window-dots / faux titlebar.**
- `.command::before { content: '$ '; color: var(--text-muted); user-select: none }` — decorative prompt. **WebKit copy-cleanliness is a verify-gate item (Decision 4); fallback = an `aria-hidden` sibling span or dropping the prompt if Safari pollutes the copy.**
- **Scroll cue** (doc-review — design-lens; color-blind-safe — fades to the block's own surface token, not a fixed color): `.commandWrap::after { content:''; position:absolute; right:0; top:0; bottom:0; width: var(--space-8); background: linear-gradient(to right, transparent, var(--surface-elevated)); pointer-events:none }`, suppressed via a `data-scrolled` attribute (set in JS when `scrollLeft + clientWidth >= scrollWidth - 2`) → `[data-scrolled]::after { display:none }`.
- `.prose` (STATE B): `--font-body`, `--text-secondary`, `max-width: ~46ch`, balanced wrap, **type-on-background (no bordered container), using the same grid gap as STATE A** so the closing-beat height is stable whether published or not (design-lens — a collapsed STATE B reads as "broken", not "deliberate"); the `LiveLinkButton` below follows the same gap rule in both states.
- Mobile (`@media (max-width: 600px)`): `padding-top: var(--space-16)`; **`padding-bottom: calc(var(--space-16) + env(safe-area-inset-bottom, 0px))`** so the source link clears the iPhone home indicator (README locks `viewport-fit=cover` — design-lens fix); step the command mono font down one notch; keep the scroll wrap + cue.
- Both modes via existing semantic tokens — no new physical colors.

**7.2c — `src/pages/Landing.tsx`**: append `<BottomCta />` below `<ProjectGrid />`.

**Verify gate (eye-on-browser — runtime truth, BOTH modes, BOTH states):**
```
pnpm dev
```
- `CURRENT_CTA_STATE = 'A'`: headline (inline mono `claude-credit` sits optically right against Satoshi — cold look, both modes) + command block (both lines; `cursor:text` on hover) + "Source on GitHub →" opens the repo in a new tab.
- **Prompt copy-cleanliness in WebKit/Safari** (not just Chromium): select a command line, copy, paste → no leading `$ `. If Safari pollutes, apply the Decision-4 fallback before proceeding.
- Toggle the constant: `'C'` → scoped install; `'B'` → headline + prose + source link, **no command block, no empty box**, and the beat height stays close to STATE A (no collapse); `'unresolved'` → STATE-B render + a dev `console.error`, never a placeholder string.
- **360 / 375 / 390 / 430px:** the longest command (`claude-credit --all --json > stats.json`) **scrolls inside the block** with the right-edge cue (which disappears at full scroll) — no page horizontal scroll, no crush; the source link clears the home-indicator safe area.
- **Contrast probe (measured, both modes):** command lines + headline + link pass AA; the `$` prompt may be muted (decorative).
- **Cold-read voice check:** the headline reads like a sharp builder-to-builder line, not a generic "Get started today!" CTA.

**Commit:** `feat(claude-credits): bottom CTA composition (static) — command block + scroll cue + source link, both states`

---

### Commit 3 — reveal motion (scroll-triggered stagger + reduced-motion + P0 guard)

Layer motion onto the verified-correct static composition.

**7.3a — `BottomCta.tsx` reveal** — one `useGSAP(() => {…}, { scope: ctaRef })` block (Decisions 7–9):
- `if (prefersReducedMotion()) return` — **first**, before any `gsap.set` (Decision 8). Content stays at C2's final visible state.
- `gsap.set(<the per-state reveal targets>, { autoAlpha: 0, y: 24 })` — hidden state in JS only (Decision 8); the targets are the three `data-reveal` elements placed in C2, built per state so STATE B reveals the prose element (no null ref).
- A **single** `ScrollTrigger` (`trigger: ctaRef.current, start: 'top 85%', once: true, onEnter`) → `gsap.to(<same targets>, { autoAlpha: 1, y: 0, duration: duration.reveal, ease: 'weighted-arrive', stagger: stagger.supportingLines, overwrite: true })`. **Not** `ScrollTrigger.batch` (Decision 7).
- **No** refresh race here — relies on Phase 4's global `ScrollTrigger.refresh()` (Decision 9; the co-mount invariant). StrictMode-safe because the `gsap.set` + trigger live in the `useGSAP` scope (dev double-invoke reverts cleanly).
- No motion on the `LiveLinkButton` or the command block beyond the shared reveal (insight 035).

**Verify gate (eye-on-browser, dev AND preview — the prod bundle is the real gate):**
```
pnpm dev                     # StrictMode active
pnpm build && pnpm preview   # prod bundle
```
- **Reveal:** scroll to the bottom — headline → command-block-or-prose → source link fade+rise with the weighted stagger, once. Same `weighted` motion as the hero/grid. Cold-watch the total settle (≤~1s for the last element).
- **P0 (dead layer):** force a throw at the top of the `useGSAP` body → the whole CTA is **still fully visible** (including in STATE B). The load-bearing gate.
- **Reveal position:** throttle the network so hero images/fonts load late → the CTA reveals at the correct scroll position (Phase 4's global `refresh()` fired), not early/stuck.
- **Reduced motion:** OS flag → CTA visible immediately, no reveal/stagger; nothing left hidden.
- **Both modes**, no console errors, no CSP violations in preview.

**Commit:** `feat(claude-credits): bottom CTA reveal — weighted scroll-triggered stagger + reduced-motion`

---

## Landmines

| Landmine | Guard |
|---|---|
| **CTA state has no wired channel to the app** | `src/lib/cta.ts` is the build-time channel: `resolveCtaCopy(CURRENT_CTA_STATE)`. `editorial.md ## CTA state` is the human receipt; cta.ts mirrors it (Decision 1). NOT parsed from markdown at build, NOT in `stats.json`. |
| **Stale `CURRENT_CTA_STATE` ships silently (e.g. `B` after the tool publishes)** | `cta.test.ts` reads `editorial.md`'s `## CTA state` and asserts it equals `CURRENT_CTA_STATE` (Decision 1/3). The dev `console.error` only covers `'unresolved'` (and is stripped from prod) — the **test** is the real guard. Run it in CI / pre-deploy. |
| **`cta.ts` mirror is a hope, not enforced** | The receipt-parity test enforces it — restores the rejected-parser's drift-immunity without putting markdown parsing on the build path (Decision 1). |
| **Install block hardcodes "published" / renders empty when unresolved** | `CURRENT_CTA_STATE` defaults `'unresolved'` → STATE-B copy + dev `console.error` (Decision 3). Never an empty mono box / literal placeholder. |
| **Parity drift with About §2** | Both import `resolveCtaCopy` from the same `src/lib/cta.ts`. About uses `.install` only; Phase 7 adds `.firstRun`. The unit test lives here; About inherits it (Decision 2). |
| **About §2 references `cta.ts` before it exists (build order)** | `src/lib/cta.ts` is created by whichever of {About §2, Phase 7} executes first; it's a hard prereq for About §2 (Decision 2 + Cascade → Phase 6). |
| **Fake terminal chrome reads as AI slop** | Clean bordered mono block, NO window dots / faux titlebar (Decision 4). |
| **`$ ` prompt gets copied (esp. Safari/WebKit)** | `::before` + `user-select:none` is unreliable in WebKit. Verify select+copy in Safari; fallback = `aria-hidden` sibling span or drop the prompt (Decision 4). A clean copy beats a decorative `$`. |
| **Command crushes / overflows / scroll never engages at 360px** | `.commandWrap { overflow-x:auto; max-width:100% }` (the `max-width` is load-bearing under `place-items:center`) + per-line `white-space:nowrap` + right-edge scroll cue. Verify the longest first-run line scrolls. |
| **No affordance that the command is selectable (no copy button v1)** | `cursor: text` on the block (Decision 4). Phase 9 adds the copy button (text-swap, not color-only; focus ring; ≥44px; aria-label). |
| **Command/headline text fails WCAG AA (Briggsy color blind)** | Command lines + headline + link use `--text-primary`/`--accent-primary` (AA); only the decorative `$` prompt may be `--text-muted`. Measured probe in BOTH modes (insights 010/051). |
| **Scroll cue relies on color (color-blind) / never hides at full scroll** | Cue fades to the block's own `--surface-elevated` (not a fixed color) and is suppressed via a JS `data-scrolled` flag at full scroll (Decision 4 / 7.2b). |
| **STATE B collapses / reads as "broken, not deliberate"** | STATE B prose uses the same grid gap as STATE A (stable beat height), type-on-background, link follows the same gap (7.2b). |
| **Source link hidden behind iPhone home indicator** | `padding-bottom: calc(var(--space-16) + env(safe-area-inset-bottom,0px))` on mobile (README `viewport-fit=cover`). |
| **Inline mono headline span sits/bumps wrong vs Satoshi** | `.toolName` `font-size: ~0.88em` + `vertical-align` correction; cold look in both modes at `--text-display-md` scale. |
| **Blank closing beat if the motion layer dies** | Hidden state via `gsap.set({autoAlpha:0})` in JS, NEVER CSS `opacity:0`; `prefersReducedMotion()` before `gsap.set`. Dead layer → fully visible (Decision 8). P0 gate. |
| **Null reveal target in STATE B throws inside `useGSAP`** | Build the reveal target list PER STATE (prose element in B, command block in A/C) — never a null ref in the `gsap.set` array (7.2a). |
| **CTA reveals at the wrong scroll position (late images/fonts)** | Relies on Phase 4's global `ScrollTrigger.refresh()`; **co-mount invariant** + Phase-4 cascade (refresh race runs unconditionally, even on an empty grid) (Decision 9). Throttled-images gate. |
| **`ScrollTrigger.batch` misused for one section** | The CTA is one section, not a tile list → a single `ScrollTrigger` + child stagger, not `batch` (Decision 7). |
| **Inventing a bespoke flourish for the CTA** | The CTA is not a README named wow moment → reveal-dialect only, no bespoke motion (Decision 7, emil). |
| **Adding a `useStats()` call / data dependency** | The CTA is data-independent of `stats.json` (Decision 5). No `useStats`, no Phase 0 gate. |
| **Footer-pinning the CTA** | It is the page's closing CONTENT beat, scrolled to — `padding`/flow, never `position: fixed` (contract). |
| **StrictMode double-reveal in dev** | `gsap.set` + the `ScrollTrigger` live inside `useGSAP({scope})` → dev double-invoke reverts cleanly (mirror Phase 3/4). |

---

## System-wide impact

- **Interaction graph:** `BottomCta` mounts on `Landing` below `ProjectGrid`. It consumes **no shared state and no `useStats()`** — its only input is the `CURRENT_CTA_STATE` constant. It reuses `LiveLinkButton` (Phase 4) and the registered `ScrollTrigger` (Phase 4), and depends (by stated invariant) on `ProjectGrid`'s global `ScrollTrigger.refresh()` co-mounting on Landing (Decision 9).
- **API-surface parity:** `src/lib/cta.ts`'s `resolveCtaCopy` is the **single source** of the install string for BOTH this CTA and About §2 (Phase 6). Parity = same install string from the same function, NOT same layout (About is install-only; the CTA adds the first-run line). The shared surface is the **module** (created by the first consumer; tested here; the receipt-parity guard keeps `CURRENT_CTA_STATE` honest against `editorial.md`).
- **Unchanged invariants:** does not touch `stats.json`, the data contract, the strip-for-publish surface, the hero, the grid, or the route transition. Adds `src/lib/cta.ts` + the `BottomCta/` component, extends `Landing.tsx` (one append). Registers no new GSAP plugin.
- **Integration coverage:** the CTA-state → copy mapping AND the `editorial.md`↔`CURRENT_CTA_STATE` reconciliation are the behaviors worth asserting (owned here, the mapping inherited by About §2). Everything else is static markup verified by eye + the contrast probe + the cold voice read.

---

## Cascade (corrections this deepening forces elsewhere — applied in the deepen commit)

Per "propagate the most-recent locked decision, report after" (2026-05-24).

### `phase-6-about.md` (About §2 — reconcile to the shared module) — APPLIED
Phase 6's §2 wording ("reads the resolved `editorial.md ## CTA state` block… don't assume a shared component exists yet") is reconciled: §2 **imports `resolveCtaCopy(CURRENT_CTA_STATE)` from `src/lib/cta.ts`** and renders **`.install` only** (STATE A/C → mono line; B/UNRESOLVED → prose, no block; `degraded` drives the dev fail-loud). Edits applied to Phase 6 Decision 3, the §2 section-specs row, the cross-phase-deps row, the test-scenarios note, the System-Wide-Impact parity line, the Sources row, and the prereq line. **Added (Decision 2 creation-order guard):** `src/lib/cta.ts` is a hard prerequisite for §2 — whichever of {About §2, Phase 7} runs first creates it.

### `phase-preflight.md` (−1.1 — set the constant when the gate resolves) — APPLIED
−1.1 Step 5 now also sets `CURRENT_CTA_STATE` in `projects/claude-credits/src/lib/cta.ts` to the resolved state (if the file exists; otherwise the `editorial.md` receipt is the record and Phase 7/About set the constant from it when they build). `editorial.md` is the human receipt; `cta.ts` is the imported mirror; `cta.test.ts` reconciles them.

### `phase-4-grid.md` (ScrollTrigger refresh must be unconditional) — APPLIED
Phase 4's `ProjectGrid` reveal `useGSAP` must run the `ScrollTrigger.refresh()` self-heal race **unconditionally** — NOT gated on `isEmpty` or on `[data-tile]` existing — because the Phase 7 CTA's reveal position depends on it (Decision 9). Noted on Phase 4 Decision 10 + its landmine.

### `README.md` (no change)
The "CTA" decision row ("Dual: primary + secondary") and editorial-spine beat 4 already match. (The README cadence reconciliation was Phase 8's and is now done; the CTA carries no cadence claim either way.)

---

## Out of scope for Phase 7 (explicit "later")

- **Copy-to-clipboard button** on the command block → **Phase 9** nicety (text-swap "copied" not color-only, focus ring, ≥44px, aria-label — Decision 4). The `cursor: text` affordance is the v1 interim.
- Final motion-timing polish (stagger feel, reveal settle), the cold-watch water-bead pass → **Phase 9** (Phase 7 ships a correct, on-spec first build).
- Open Graph / Twitter Card preview for share-out → out of scope for v1 (README).
- Analytics / click tracking on the CTA → out of scope (README: no telemetry).
- The README/§8.3 cadence-copy reconciliation → **Phase 8** (TODO landmine; the CTA carries no cadence claim).
- A markdown parser that ingests `editorial.md ## CTA state` into the *build* → rejected (Decision 1); the receipt-parity *test* gets the drift benefit without it. Revisit only if the CTA ever becomes multi-valued/dynamic (it does not).
- A publish name outside the two encoded literals (`claude-credit` / `@mbriggsy/claude-credit`) → preflight −1.1 only produces A/B/C; a third org scope would be a −1.1 change, not a Phase 7 one.

---

## Verification (Phase 7 done gate)

1. ✅ `pnpm test` green — `cta.test.ts`: A → unscoped install + first-run + published; C → scoped install; B → null install/firstRun + not published + not degraded; unresolved → STATE-B copy + `degraded:true`; `sourceUrl` invariant; STATE-A install string matches the literal About §2 renders; **receipt-parity (skipped-pending pre-preflight; asserts `CURRENT_CTA_STATE` == `editorial.md` state once resolved)**. Phase 2–4 tests still green.
2. ✅ `pnpm typecheck` clean (exhaustive `CtaState` switch; no `state` field; no unused).
3. ✅ `pnpm dev` AND `pnpm build && pnpm preview`: the CTA renders the resolved state — A/C → command block (install + first-run), B → prose, no empty box.
4. ✅ Toggle `CURRENT_CTA_STATE` through A/C/B/unresolved: each renders correctly; unresolved → STATE-B + dev `console.error`; never a literal placeholder / empty mono box. STATE B beat height stays close to STATE A (no collapse).
5. ✅ **Prompt copy-cleanliness in WebKit/Safari** (not only Chromium): select a command line, copy, paste → clean `npm i -g …` with no leading `$ `. Fallback applied if Safari pollutes (Decision 4).
6. ✅ Command block **scrolls** at 360/375/390/430px (longest first-run line) with the right-edge cue that disappears at full scroll; no page horizontal scroll; source link clears `env(safe-area-inset-bottom)`.
7. ✅ Secondary "Source on GitHub →" is a real ≥44px `:focus-visible` target opening `https://github.com/mbriggsy/ai-learning-journey` in a new tab; present in EVERY state.
8. ✅ Reveal-on-scroll: headline → command-block-or-prose → source link fade+rise with the weighted stagger, once; reads as the site's `weighted` dialect; STATE B reveals the prose element (no null-ref throw).
9. ✅ **P0:** force a dead motion layer (throw in `useGSAP`) → the whole CTA is still visible (both states). The load-bearing gate.
10. ✅ Reveal position self-heals with throttled images/fonts (Phase 4 global `refresh()`); CTA reveals at the right scroll position.
11. ✅ `prefers-reduced-motion`: CTA visible immediately, no reveal/stagger; nothing left hidden.
12. ✅ BOTH modes (light + dark, OS + `?theme=`): closing beat reads as a deliberate centered exhale; command block legible glass; inline mono headline span sits optically right vs Satoshi; no `--accent-stat-highlight` gold spent here.
13. ✅ A **measured** contrast probe passes for the headline, command lines, and link in BOTH modes; the headline passes a **cold-read voice check** (sharp builder-to-builder, not generic CTA-speak).
14. ✅ No `useStats()` call / no `stats.json` read (Decision 5); no new GSAP plugin registered.
15. ✅ No console errors; no CSP violations in preview.

Then open [phase-8-deploy.md](phase-8-deploy.md) and start.

---

← [Phase 6 — About page](phase-6-about.md) | [Index](README.md) | Next → [Phase 8 — Deploy](phase-8-deploy.md)
