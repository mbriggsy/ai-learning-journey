---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-24T21:06:09-04:00
doc-reviewed: 2026-05-24T21:14:58-04:00
---

# Phase 6 — About page

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. Read [phase-1-scaffold.md](phase-1-scaffold.md) (the `/about` route + `src/pages/About.tsx` placeholder this phase REPLACES, the semantic type/spacing tokens, the `ease.arrive`/`duration.reveal` motion foundation + `prefersReducedMotion()` discipline, and the `useGSAP`/`<Name>.module.css` conventions this phase REUSES), [phase-3-hero.md](phase-3-hero.md) (the inline taxonomy hint this page is the **deep version of** — its three tier labels are this page's consistency anchor), [phase-5-detail.md](phase-5-detail.md) (the precondition gate that already verifies the Phase 0 token fields — Phase 6 inherits it, see Decision 4), and [phase-7-cta.md](phase-7-cta.md) (which owns `src/lib/cta.ts` — the shared `resolveCtaCopy` install-string source §2 reads, see Decision 3). This file is the decisions-not-code recipe for the About page.

Route: `/about` (scaffolded in Phase 1 `App.tsx`). Phase 6 replaces the Phase 1 `About.tsx` placeholder (`<h1>about</h1>` + "Taxonomy explainer lands in Phase 6." + a "← home" link).

The About page is the site's **only prose surface** and its **densest text surface** — a quiet, plain-typography reading page for AI-curious peers who want to understand what the `claude-credit` tool measures and how. It is **text-and-tables only**: no donut, no sparkline, no counter, no sheen. The single motion moment is one quiet page-fade-in. It exists to (a) make the taxonomy legible — the deep version of the hero's `AUTHORED · PIPELINE-GENERATED · TOOL-GENERATED — what each tier means →` hint — and (b) point peers at the tool's source. Authorship stays SILENT (ideation §11); the one warm nod is a closing sign-off.

The bar for "Phase 6 done": every section renders with no broken layout in BOTH modes; the taxonomy table is complete AND readable (grouped, not 30 flat rows) and scrolls — never crushes — at 360–430px with a visible scroll affordance and tier labels that stay anchored; body and table-cell text pass a **measured** contrast probe in both light and dark (this is the most text-dense surface and Briggsy is color blind — never eyeball it); §1/§2 prose passes a **cold-read voice check** (reads like a sharp builder-to-builder line, not a generic README intro — the README failure condition is a voice failure); the page-fade speaks the site's `weighted` motion dialect and degrades to the final visible state instantly under `prefers-reduced-motion`; the install block reflects whatever preflight −1.1 resolved (never a hardcoded "published" assumption, never an empty box). **Eye-on-browser in BOTH modes + a contrast probe + a cold voice read is the gate — green tests are not enough** (manifesto).

---

## Decisions locked at this deepening (read before executing)

1. **The warm authorship line is a CLOSING SIGN-OFF — the page's ONE sanctioned authorship nod** (ATC call, 2026-05-24; ideation §11 reserved placement as "a Phase 6 call"). The locked line — *"Claude wrote all of it. Briggsy directed — and answered a question or two."* — lands **last**, after all explanatory content, separated by a movement divider. The work speaks first; the warm nod arrives once the tool/taxonomy/methodology have been read.
   - **It IS the page's single permitted who-wrote-what reference** — sanctioned by §11 as the "light touch," NOT a claim that the page makes *zero* authorship references. The honest framing is "one quiet nod, never a scoreboard," not "none." Nothing else on the page allocates authorship, and the "how the numbers are counted" copy must not drift into a second authorship claim.
   - **Rendering:** quiet prose, **`--text-secondary` (≥7:1) — never `--text-muted`** ("quiet" means reduced font-size/weight + generous air, NOT reduced contrast — this is the densest text page and the contrast gate is real). **Centered, `max-width: ~40ch`** — a marked, deliberate departure from the left-aligned reading column so it reads as an endnote, not a continuation. NOT a stat, callout, scoreboard, or proof mechanism.
   - **Accepted tradeoff (name it so a future session doesn't "fix" it):** placing the only warm line last means an early-bouncing reader may never reach it. This is intentional — the line is a reward for finishing, not a hook. Do not hoist it into the intro (that re-opens the §11 silence tension).
   - Describe the line's tone as **warm**; do not propagate "self-deprecating" as a voice directive for the page's other prose (the −1.5 worksheet's voice anti-anchor bans self-deprecating for project copy — the sign-off is exempt because it's the §11-sanctioned verbatim line, not authored project copy).

2. **The taxonomy table is GROUPED, and its scope column is a MEASUREMENT fact, not a credit verdict** (frontend-design/emil restraint + the ideation §1 reconciliation below). The full tree is 3 tiers × 10 categories × ~30 subcategories — 30 flat rows would bury the page. Render it as **3 tier row-groups → 10 category rows**, each category row carrying its subcategories as a comma-separated **examples** cell + a **"counted in totals?"** cell. Complete (a real reference peers can geek on) AND readable. The top-level tier labels reuse the hero hint **verbatim** — `AUTHORED`, `PIPELINE-GENERATED`, `TOOL-GENERATED` — so the page delivers exactly the meaning the hero hint's `→ what each tier means` promised. The table is **static content derived from the taxonomy definition, NOT from per-project `stats.json`** (it describes the scheme, not any project's numbers).
   - **§1 RECONCILIATION (load-bearing — this changed at doc-review).** Ideation §1 (locked 2026-05-24) **supersedes** the earlier "peers need to understand authored-vs-pipeline" framing: *"the tier split is provenance… is NOT the story… framed by KIND, never an authored-vs-generated comparison"* (§11: authorship is silent, never a scoreboard). A **"credited?"** column that adjudicates *credited / credited / not-credited* IS that authored-vs-generated comparison and is therefore **CUT**. In its place, the column answers a pure **measurement-scope** question that belongs on a "how the numbers are counted" surface: **"counted in totals?"** — does this kind of file feed the headline magnitude, or is it tracked-but-excluded?
   - **The honesty hook is now methodological, not authorial** (this is *why* the table earns its place): `authored` → **counted**; `pipeline-generated` → **counted**; `tool-generated` → **tracked, not counted** (build output / lockfiles / caches are recorded but **excluded from the totals so the magnitude isn't padded with `pnpm-lock`**). That is the trustworthy "here's exactly what the big number includes and what it leaves out" beat — the same honesty as §4's retention-window footnote — with no who-wrote-what verdict.
   - **Locked cell values** (so an implementer doesn't interpret): `AUTHORED` → "counted", `PIPELINE-GENERATED` → "counted", `TOOL-GENERATED` → "tracked, not counted". Text strings, never color-only (Briggsy is color blind).
   - **Tier semantics are quoted from the source of truth** (`taxonomy.ts` header). The source's own wording uses "credit"/"not counted as credit" internally; the SITE reframes to the counted/excluded measurement language above (the tool's internal doc may say "credit"; the public page must not adjudicate it). See "Source facts (verified)".

3. **The install block (§2) reads the resolved CTA state via `resolveCtaCopy(CURRENT_CTA_STATE)` from `src/lib/cta.ts` — never hardcoded, with a safe fallback** (Phase 7's shared module — the build-time machine mirror of `editorial.md`'s `## CTA state` block; About and Phase 7 import the same function). Preflight −1.1 (is `claude-credit` publishable?) is **unresolved** at this deepening (`npm view claude-credit version` not run), and it sets `CURRENT_CTA_STATE` when it resolves (`editorial.md`'s block is the human receipt — authored in preflight −1.5; `cta.ts` is the imported mirror). The block must render whichever state −1.1 lands:
   - **STATE A** (unscoped, published): a `--font-mono` install line `npm i -g claude-credit` in a quiet mono block.
   - **STATE B** (not yet published): **no mono block at all** — render plain body prose *"`claude-credit` ships alongside this site — watch the repo"* + the source link (`--text-link`). STATE B must read as a deliberate prose paragraph, not a broken/empty STATE A.
   - **STATE C** (scoped, published): mono block `npm i -g @mbriggsy/claude-credit`.
   - **STATE UNRESOLVED (degenerate, must handle):** if `CURRENT_CTA_STATE` is `'unresolved'` (preflight −1.1 hasn't set it — its default), `resolveCtaCopy` returns the STATE-B shape with `degraded: true`. Render **STATE B copy as the safe default** AND fail loudly in dev (`console.error` gated to `import.meta.env.DEV`) — **never an empty mono box and never a literal placeholder string**. Plans are menus not orders; nothing structurally forces preflight-before-Phase-6, so this path is real.
   - **Parity with Phase 7 = same install string from the same function, not same block.** Phase 7 (deepened 2026-05-24) carries STATE A install + a `claude-credit --all --json > stats.json` first-run line; About §2 is **install-only** (`resolveCtaCopy(...).install`) and deliberately does NOT render that first-run line. "One resolution, two surfaces" means both call `resolveCtaCopy(CURRENT_CTA_STATE)` from `src/lib/cta.ts` — the shared surface is **that module** (Phase 7 owns it + its unit test), not a shared layout. **Do NOT hardcode STATE A.** The shipped `tools/claude-credit/README.md` carries an `npm link` install line that *implies* published — preflight −1.1 owns hedging it; §2 reflects the resolution, never asserts published.

4. **§4 explains the TOKEN methodology, holds true where tokens are null, and inherits Phase 5's precondition gate** (the hero's dominant number is tokens, so an honest "how it's counted" page must explain them). Cover, in plain builder-to-builder English: **`tokensProcessed`** (input + output + cache-creation + cache-read — the magnitude number) vs **`tokensFresh`** (excludes cheap cache re-feeds — the honest "work done" signal), derived by parsing **local Claude Code session JSONLs**.
   - **Write it to hold where tokens are null** (doc-review adversarial — the meta projects `claude-credit`/`claude-credits` ship `tokens: null` on a clean deploy box; §4 is static copy and can't suppress like a per-project renderer). Frame as *"tokens are measured from local session logs **where present**"* — never implying every project/surface carries a token count. If the site's own meta rows show no token figure, §4's wording must not contradict that.
   - **Retention-window honesty (load-bearing):** session JSONLs rotate after ~30 days, so any token tally is a **window-bounded floor, never a lifetime total** — the copy must say so (mirrors README gates 8b/8c; the word "lifetime" appears nowhere).
   - **Gate (corrected at doc-review — the fields are interface members, NOT named exports):** before finalizing the token copy, confirm `tools/claude-credit/dist/taxonomy.d.ts` declares `interface TokenStats { … tokensProcessed: number; tokensFresh: number; … }` AND that `ProjectReport` carries `tokens: TokenStats | null`. This is the **same precondition Phase 5 already gates on before its C1** — Phase 6 **inherits that gate result** (don't re-roll a parallel check; require Phase 5's gate green). A grep for `export const tokensProcessed` would fail even on success — verify the interface shape, not a named export.
   - Plus a link to `tools/claude-credit/README.md` for full detail.

5. **§5 (update cadence) states the DECIDED-regardless fact, decouples it from the deploy trigger, and flags the README staleness** (Phase 8 is undeepened; "where does `pnpm refresh` run" is open). Two independent facts, written so neither implies the other triggers it:
   - **What regenerates the numbers (decided regardless of Phase 8):** the figures are produced by the `claude-credit` tool, and because token counts come from **local Claude Code session history, regeneration runs where that history lives — a developer's machine, not a stateless CI runner** (a clean runner has no JSONLs and would publish null tokens). This is the same retention-window honesty §4 commits to, and it's the most genuinely-interesting builder-to-builder detail on the page — surface it, don't hide it for Phase-8 safety.
   - **What deploys the site (decided):** the site auto-deploys from `main` (Vercel). State this as a *separate* fact — do NOT phrase it as "a push regenerates the numbers."
   - **Do NOT assert "the GitHub Action regenerates the numbers on every push"** — that mechanism is explicitly undecided and the leading option is the opposite.
   - **Cross-source contradiction flagged (CLAUDE.md "contradictions mean STOP"):** `docs/plans/README.md` line 71 ("GitHub Action on every push to main, runs claude-credit…") and `docs/plans/phase-8-deploy.md` §8.3 both currently assert the forbidden mechanism — they are themselves Phase-8-stale. §5 must **not** mirror the README cadence line. Phase 8's deepening owns reconciling README line 71 + this copy (a TODO landmine records this so it isn't lost).

6. **The page-fade is exactly ONE tween on the page wrapper, in the site's `weighted` dialect** (emil insight 068 — a foreign motion idiom reads "off"; scope discipline — README mandates "no animation beyond a quiet page-fade-in"). On mount: `gsap.set` the page wrapper `autoAlpha: 0` (JS-hidden — **never CSS `opacity:0`**, the P0 invisible-content guard, so a dead motion layer leaves all reading content visible), then fade to `autoAlpha: 1` with `ease.arrive` + `duration.reveal` (0.8s), optional small `y` rise. **`prefersReducedMotion()`-first** → final visible state instantly, no tween.
   - **The section-stagger option is CLOSED** (doc-review scope — a stagger is N sequential tweens, more than the one fade README permits, and risks below-fold content briefly hidden during the tween). One wrapper tween only. (The insight-043 `'<'` caution is therefore moot here — no multi-tween sequence exists to mis-anchor.)
   - **No motion on interactive targets** — the source link gets no pulse/hover-loop (insight 035); any decorative motion rides a wrapper/pseudo-element.

7. **Exact editorial PROSE is deferred to the −1.5 worksheet / execution, with a voice gate; the plan locks SHAPE, not words** (decisions-not-code bar; mirrors Phase 5's `editorial` handling). The "What is claude-credits" and "What is `claude-credit`" paragraphs are author-controlled voice (terse, builder-to-builder, AI-peer audience) sourced in the preflight −1.5 editorial worksheet.
   - **Voice gate (doc-review product — this is the site's ONLY prose surface and the README failure condition is a VOICE failure):** the §1/§2 prose must pass a **cold-read test** (read aloud cold — if it reads like a generic tool-README intro rather than a sharp builder-to-builder line, rewrite). Seed the −1.5 worksheet with one anti-example (the generic version) per section as a "not this" anchor, not just a positive brief. This gate is part of the "done" bar.

8. **EDITORIAL (−1.5 worksheet) is a HARD dependency for §1/§2 + the install state — not soft** (doc-review; consistent with how Phase 5 treats editorial as a hard blocker for detail pages). The page *shell* (taxonomy table, methodology, cadence, source link, sign-off) can be built before the worksheet lands, but §1/§2's finalized prose and §2's resolved install state require the worksheet authored. Treat it as a Phase-6 blocker for *finalizing* the page, not optional polish.

9. **frontend-design + emil principles are BAKED here; the full visual polish pass is Phase 9** (Briggsy's "as appropriate"). For a mandated plain-typography page the design work IS restraint — reading measure, type scale, table legibility, vertical air, the single quiet fade — already constrained by the locked semantic tokens + institutional insights, and folded into Decisions 1–6 + the section specs. The heavy `/frontend-design` + `/emil-design-eng` skill passes (contrast probe across both palettes, final table treatment, polish) belong to Phase 9 where this page gets its mode-aware design gate alongside the rest of the site — not re-run at plan time on a text page.

---

## Source facts (verified at deepening, 2026-05-24)

**Taxonomy — SHIPPED and stable** (`tools/claude-credit/src/taxonomy.ts`; examples from `tools/claude-credit/README.md` "Default classifications"; the tier/category/subcategory lists below were verified verbatim against the source at doc-review). The table content is this:

Tier semantics (quote from the `taxonomy.ts` header — then reframed to the public measurement language per Decision 2):
- **AUTHORED** — "Claude + Briggsy wrote it directly (code, docs, prompts)." → **counted in totals**
- **PIPELINE-GENERATED** — "Claude built the pipeline; pipeline produced this (Imagen images, TTS voices, ffmpeg renders, regen scripts)." → **counted in totals**
- **TOOL-GENERATED** — "Compiler/bundler/package-manager output." → **tracked, not counted** (excluded from the totals so the magnitude isn't padded with `pnpm-lock`)

Tier → category → subcategories (code order):

| Tier | Category | Subcategories | Example paths (for the "examples" cell) |
|---|---|---|---|
| **AUTHORED** | `code` | source, tests, test-fixtures, config, build-scripts, schemas, styles, markup | `.ts/.tsx/.py/.rb` under `src/`; `*.test.*`, `__tests__/**`; `package.json`, `*.config.*`, `.github/workflows/**` |
| AUTHORED | `docs` | plans, specifications, conventions, adrs, insights, readmes, narrative, triage, general | `docs/plans/**`, `README.md`, `CLAUDE.md`, `TODO.md` |
| AUTHORED | `data` | game-content, generation-prompts, lookup-tables | `prompts/**`, `voice-scripts/**`, `imagen-prompts/**` |
| AUTHORED | `process` | commit-messages | git commit message bodies |
| **PIPELINE-GENERATED** | `assets` | images, audio, video, fonts, misc-media | `.png/.webp`, `.mp3/.wav`, `.mp4/.webm`, `.woff2` |
| PIPELINE-GENERATED | `iteration-receipts` | sample-eval-runs, regen-scripts | `sample-eval/**`, `scripts/regen-*.ts` |
| **TOOL-GENERATED** | `compiled` | compiled | `dist/**` build output |
| TOOL-GENERATED | `lockfiles` | lockfiles | `pnpm-lock.yaml`, `package-lock.json`, `Cargo.lock` |
| TOOL-GENERATED | `snapshots` | snapshots | test snapshot files |
| TOOL-GENERATED | `caches` | caches | `.cache/**`, `.turbo/**`, `.vite/**` |

Classification is **first-match-wins** through a built-in ruleset (README) — each file routes to exactly one subcategory; lines/bytes sum per subcategory. **Re-verify this table against `taxonomy.ts` after Phase 0 executes** — Phase 0 adds token fields and could touch `taxonomy.ts`; the table is a static snapshot and must not drift.

**Counting methodology — line/byte/git all SHIPPED** (`src/counter.ts`, `src/git-stats.ts`):
- **Lines:** `totalLines` = `\n` terminators (plus one for a final line with no trailing newline); `nonBlankLines` = lines with ≥1 character that isn't space/tab/CR. Files > 20 MB record bytes only (no line count); only text-classified files are line-counted (binaries → bytes only).
- **Asset iteration (git-based, subtree-scoped):** `assetModificationEvents` = every commit that added/modified/deleted an asset file (`git log --name-only`, asset extensions); `discardedAssetFiles` = unique asset paths ever deleted (`git log --diff-filter=D`). The "iteration in place" + "discarded along the way" story.
- **Tokens (Phase 0 addition — `TokenStats` interface, gated per Decision 4):** parse local Claude Code session JSONLs; `tokensProcessed` = input + output + cache-creation + cache-read; `tokensFresh` = input + output + cache-creation (excludes cache reads). `tokens: TokenStats | null` — null where there's no local JSONL (e.g. the meta projects on a clean deploy). JSONLs rotate ~30 days → **window-bounded floor, never lifetime**.

**Source / install facts:**
- GitHub remote (verified `git remote -v`, repo is public): **`https://github.com/mbriggsy/ai-learning-journey`**. Tool subtree: `…/tree/main/tools/claude-credit`. The "Open source" link (§6) is **decided and safe today** — no dependency.
- Install snippet (§2) is **OPEN** — gated on preflight −1.1 states A/B/C, with a STATE-UNRESOLVED fallback (Decision 3).

**Phase 1 primitives inherited (consume — do NOT redefine; all verified to exist at doc-review):**
- Route `/about` + `src/pages/About.tsx` placeholder (replace its body). Pages live in `src/pages/`; components in `src/components/<Name>/<Name>.tsx` + `<Name>.module.css`.
- Motion: `useGSAP` from `@/motion/gsap-context`; `ease.arrive` (the reveal/page-load ease); `duration.reveal` (0.8); `prefersReducedMotion()` (single source of truth) + the `global.css` reduced-motion CSS backstop. **Easings must be side-effect-imported at boot** (`main.tsx`) or `parseEase` returns undefined (Phase 1 landmine). No new GSAP plugin needed for a fade.
- Type/spacing tokens (semantic): `--font-body` (Inter), `--font-display` (Satoshi, section headings), `--font-mono` (JetBrains, the install snippet); `--text-display-md` (headings), `--text-body-lg`/`--text-body`/`--text-meta`; `--leading-body` (1.55); `--space-*`; `--surface-page`, `--surface-divider`, `--text-primary`, `--text-secondary`, `--text-link`, `--border-subtle`. **Info-bearing text uses `--text-secondary` (≥7:1), NEVER `--text-muted`** (the shared `--text-muted` measured ~2.9–3.3:1 and fails WCAG AA for body text — Phase 3 cascade).

**Institutional insights that bind this page** (`projects/burned/docs/insights/`):
- **068** — match the site's `weighted` motion dialect (Decision 6).
- **035** — no continuous motion on interactive click targets (Decision 6).
- **010 / 051** — art-directed palettes miss contrast guarantees and CVD prose-intuitions are wrong-direction: **measure** body + table-cell contrast in both modes, don't eyeball (the "done" bar).
- **006** — CSS fallback declarations must precede the modern property (`100vh` before `100svh`, etc.).
- **012** — if `@layer` is in play, wrap the About component CSS in the project's layer; keep any `@font-face` unlayered.

**Mobile / table anchor** (`projects/undercover-mob-boss/public/how-to-play.html`): the taxonomy table reuses the `.table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch }` idiom around a `min-width`'d table so it **scrolls on phone instead of crushing columns**; body copy sits in a capped reading column (~68–72ch) at `--leading-body`.

---

## The page contract (locked composition — top to bottom)

A single-column reading page. Body prose in a reading column: `max-width: ~68–72ch`, `margin: 0 auto`, with mobile horizontal padding (`var(--space-4)`) so text never touches the screen edge at 360px. The taxonomy table may run wider inside its scroll wrapper. **Movements** separated by air + a hairline `--surface-divider` **between movements only**. Persistent back-link top-left. **Nothing boxed in a card** — type-on-background, like the detail page.

**Movement grouping (locked — divider placement):** §1 | divider | §2 | divider | §3 | divider | (§4 · §5 · §6 are ONE movement — air between them, no internal dividers) | divider | sign-off.

```
  ← home                                                    (persistent back-link, top-left)

  ┌─ §1 · WHAT IS claude-credits ─────────────────────────────────┐
  │  heading + 2–3 sentence builder-to-builder explainer          │  ← prose, reading column
  └────────────────────────────────────────────────────────────────┘
  ──────────────────────────────────────────────────────  (divider)

  ┌─ §2 · WHAT IS claude-credit ──────────────────────────────────┐
  │  heading + 2–3 sentence explainer of the tool                 │
  │  ┌ install ┐  npm i -g claude-credit   (STATE A; selectable)  │  ← mono <code>, no copy button v1
  │  └─────────┘  (STATE B → prose "ships alongside this site")    │     (data-driven from CTA state)
  └────────────────────────────────────────────────────────────────┘
  ──────────────────────────────────────────────────────  (divider)

  ┌─ §3 · TAXONOMY EXPLAINED ─────────────────────────────────────┐
  │  one-line framing + the GROUPED table:                        │
  │   TIER          CATEGORY   EXAMPLES            COUNTED IN      │  ← .table-wrap scrolls on mobile,
  │                                                TOTALS?         │     sticky tier column, edge cue
  │   AUTHORED      code       .ts under src/…     counted         │
  │                 docs       docs/plans, README  counted         │   ...
  │   PIPELINE-GEN  assets     .png .mp3 .mp4 …    counted         │
  │   TOOL-GEN      lockfiles  pnpm-lock.yaml      tracked,        │
  │                                                not counted     │  ← the methodology honesty hook
  └────────────────────────────────────────────────────────────────┘
  ──────────────────────────────────────────────────────  (divider)

  ┌─ §4 · HOW THE NUMBERS ARE COUNTED ────────────────────────────┐
  │  plain-English summary: lines (total vs non-blank), asset      │
  │  iteration (git-based), tokens (processed vs fresh, measured    │
  │  from local session logs WHERE PRESENT + the ~30-day floor,    │
  │  never "lifetime"). → full detail: link to claude-credit README│
  └────────────────────────────────────────────────────────────────┘

  ┌─ §5 · UPDATE CADENCE ─────────────────────────────────────────┐
  │  two decoupled facts: numbers regenerate via the tool, run     │  ← Phase-8-dependent trigger;
  │  locally where session history lives; the site auto-deploys    │     copy stays mechanism-honest
  │  from main (Vercel).                                          │
  └────────────────────────────────────────────────────────────────┘

  ┌─ §6 · OPEN SOURCE ────────────────────────────────────────────┐
  │  one line + → github.com/mbriggsy/ai-learning-journey          │  ← plain styled <a>, focus ring
  └────────────────────────────────────────────────────────────────┘
  ──────────────────────────────────────────────────────  (divider)

  ┌─ CLOSING SIGN-OFF ────────────────────────────────────────────┐
  │            "Claude wrote all of it. Briggsy directed —        │  ← --text-secondary, centered
  │             and answered a question or two."                  │     ~40ch, quiet, generous air
  └────────────────────────────────────────────────────────────────┘
```

*(Copy is ILLUSTRATIVE — exact prose for §1/§2 comes from the −1.5 editorial worksheet; the install line comes from the resolved CTA state.)*

**Section specs:**

| # | Section | Source | Layout / type | Null & degrade behavior |
|---|---|---|---|---|
| 0 | Back-link | static → `<Link to="/">` | top-left, `--text-secondary`, `:focus-visible` ring, ≥44px tap target | always present |
| 1 | What is claude-credits | editorial prose (−1.5 worksheet) | heading `--font-display` `--text-display-md`; body `--text-body-lg`/`--text-body` `--leading-body`, reading column ~68–72ch + mobile padding | copy is authored (hard dep, Decision 8); cold-read voice gate |
| 2 | What is claude-credit + install | prose + `resolveCtaCopy(CURRENT_CTA_STATE).install` (`src/lib/cta.ts`) | heading + prose; STATE A/C → install line in `--font-mono` selectable `<code>` block (no copy button v1); STATE B → prose only, no block | STATE B → no mono block; **STATE UNRESOLVED (`degraded`) → STATE B default + dev fail loud** (Decision 3); never empty box / literal placeholder |
| 3 | Taxonomy table | `taxonomy.ts` structure (static) | one-line framing + grouped table (3 tier groups → 10 category rows, examples cell, **"counted in totals?"** cell) inside `.table-wrap` (`overflow-x:auto`, `min-width:~560px`), **sticky tier column** + **right-edge scroll cue** | static — always renders; scrolls (never crushes) on mobile with tier labels anchored |
| 4 | How the numbers are counted | shipped methodology + Phase 0 token fields | prose summary (lines / asset iteration / tokens "where present" + window-floor) + link to `tools/claude-credit/README.md` | token sentences gated on Phase 5's precondition (Decision 4); copy holds where tokens null; line/asset copy always valid |
| 5 | Update cadence | decided-regardless facts (Decision 5) | short prose — two decoupled facts | deploy trigger Phase-8-deferred; do NOT mirror README line 71 |
| 6 | Open source | `https://github.com/mbriggsy/ai-learning-journey` | one line + **plain styled `<a rel="noopener noreferrer">`**, `:focus-visible` ring, ≥44px tap target | decided + safe today |
| 7 | Closing sign-off | the locked §11 line (static) | quiet prose `--text-secondary` (NOT `--text-muted`), **centered `max-width:~40ch`**, divider above, generous air; NOT a stat | always present; the one sanctioned authorship nod, never a scoreboard |

---

## Cross-phase dependencies & risks

| Dependency / risk | State | Handling |
|---|---|---|
| **Editorial −1.5 worksheet** ← §1/§2 prose + install CTA state | OPEN (not authored) | **HARD dependency** for finalizing §1/§2 + the install state (Decision 8); the shell builds without it. |
| **Install snippet** (§2) ← preflight −1.1 sets `CURRENT_CTA_STATE` in `src/lib/cta.ts` | OPEN (−1.1 not run → defaults `'unresolved'`) | §2 calls `resolveCtaCopy(CURRENT_CTA_STATE)`; UNRESOLVED → STATE B default + dev fail-loud (Decision 3); never hardcode STATE A. |
| **Token methodology** (§4) ← Phase 0 `TokenStats` fields | Planned, not in shipped tool | Inherit Phase 5's precondition gate (verifies the interface in `dist`); copy holds where `tokens` null (Decision 4). |
| **Update-cadence copy** (§5) ← Phase 8 "where `pnpm refresh` runs" | OPEN architecture decision | §5 states decided-regardless facts, decoupled; deploy trigger deferred (Decision 5). |
| **README line 71 + phase-8 §8.3** assert the forbidden "Action regenerates on every push" cadence | Phase-8-stale | §5 must NOT mirror README line 71; Phase 8 reconciles when it deepens (TODO landmine records it). |
| **Shipped README install line** (`npm link`) implies published | Contradiction flagged in preflight | Resolving −1.1 fixes it; §2 reflects the resolution. |
| **Parity with Phase 7's CTA** | Phase 7 deepened (owns `src/lib/cta.ts` + its test) | Parity = same install string from the shared `resolveCtaCopy`, not same block; About §2 is install-only (no first-run line) (Decision 3). |
| **Body/table contrast** in two art-directed palettes | Risk (insights 010/051; Briggsy color blind) | Measured contrast probe in BOTH modes is part of the "done" bar — not eyeballed. |
| **Taxonomy table staleness** if `taxonomy.ts` evolves in Phase 0 | Risk | Re-verify the table against `taxonomy.ts` after Phase 0 executes (Source facts note). |

No edits to other phases' docs are required by this deepening (read-only consumption of Phase 1/3/5/7/8 contracts). The README-line-71 / §8.3 cadence staleness is Phase 8's to reconcile; it's recorded as a TODO landmine so it isn't lost.

---

## Output structure (what this phase adds)

```
projects/claude-credits/
├── src/
│   └── pages/
│       ├── About.tsx                 # MODIFIED — replace placeholder with the six sections + sign-off + the fade
│       └── About.module.css          # NEW — prose/layout/divider/reading-column/table-wrap styles
└── (LiveLinkButton NOT used here — §6 is a plain styled <a>)
```

**Taxonomy table stays INLINE in `About.tsx` with a co-located static data array by default** (doc-review scope — a single-use, propless, logic-free 10-row table does not earn a component boundary). Extract to `src/components/TaxonomyTable/` ONLY if it later takes props / is reused, or if the data array + render exceeds ~60 lines in `About.tsx`. If a unit test for the data shape is wanted, co-locate `taxonomy-data.test.ts` next to the array — no component boundary needed.

---

## Dependencies

**No new package deps.** Fade uses the Phase 1 `useGSAP` + `ease.arrive` + `duration.reveal` (no new GSAP plugin). `clsx` (Phase 3) available for the install-block state classes. `vitest` config already globs `src/**/*.test.ts`.

---

## Implementation Units

- [ ] **Unit 1: Static About content — all six sections + closing sign-off, both modes, responsive, NO motion**

**Goal:** Replace the `About.tsx` placeholder with the full reading page at final visible state: §1–§6 + the closing sign-off, the grouped taxonomy table (sticky tier column + scroll cue in a `min-width:~560px` `.table-wrap`), the CTA-state-driven install block (with the STATE-UNRESOLVED fallback), the methodology summary (tokens "where present" + window-floor), the decoupled cadence copy, the plain GitHub source link. Static only — the fade lands in Unit 2.

**Requirements:** ideation §1 (taxonomy = KIND, never an authored-vs-generated comparison), §8 (taxonomy explainer full on About), §11 (authorship silent + the closing nod), README "Pages", the "done" bar.

**Dependencies:** Phase 1 (route + placeholder + tokens). HARD: editorial −1.5 worksheet for §1/§2 prose + the resolved CTA state (Decision 8) — the shell (table, methodology, cadence, source link, sign-off) builds first; §1/§2 prose + install line slot in from the worksheet.

**Files:**
- Modify: `src/pages/About.tsx`
- Create: `src/pages/About.module.css`
- Create (only if the CTA-state→snippet mapping is a pure helper not already owned by Phase 7): a co-located test — but see Test scenarios: prefer inheriting Phase 7's coverage.

**Approach:**
- Compose the seven movements per the page contract; dividers between movements only (§4·§5·§6 are one movement).
- **Taxonomy table (Decision 2):** 3 tier row-groups → 10 category rows; columns = tier (group header) · category · examples · **counted in totals?**. Tier labels verbatim (`AUTHORED`/`PIPELINE-GENERATED`/`TOOL-GENERATED`). Cell values: counted / counted / "tracked, not counted" (text, never color-only). Wrap in `.table-wrap` (`overflow-x:auto`, `-webkit-overflow-scrolling:touch`) over a `min-width:~560px` table; **tier column `position:sticky; left:0`** with a `--surface-page` background so labels stay anchored during horizontal scroll; **right-edge scroll cue** (fade-mask or equivalent affordance) so mobile users see it's scrollable.
- **Install block (§2, Decision 3):** branch on the resolved `editorial.md ## CTA state` — A/C render a selectable `--font-mono` `<code>` install line (no copy button v1); B renders prose + the source link, no mono block; **UNRESOLVED/placeholder → STATE B default + fail loud in dev**. No copy button in v1 (a copy-to-clipboard control is a Phase 9 nicety; if added it must use a text swap "copied" — never color-only — with a focus ring + ≥44px + aria-label).
- **§4 methodology:** plain-English lines (total vs non-blank), git-based asset iteration, tokens (processed vs fresh) "measured from local session logs **where present**" + the ~30-day window-floor sentence (never "lifetime"); link to `tools/claude-credit/README.md`. Token sentences only after Phase 5's precondition gate is green.
- **§5 cadence:** two decoupled facts (Decision 5) — regeneration runs locally where session history lives; the site auto-deploys from `main`. Do not mirror README line 71.
- **§6 source:** plain styled `<a href="https://github.com/mbriggsy/ai-learning-journey" rel="noopener noreferrer">`, `:focus-visible` ring, ≥44px.
- **Closing sign-off:** the locked §11 line as `--text-secondary`, centered, `max-width:~40ch`, after a divider — not a stat.
- **Type/contrast:** reading column ~68–72ch + mobile `var(--space-4)` padding, `--leading-body`; all info-bearing text `--text-secondary`+ (never `--text-muted`); both modes via existing semantic tokens (no new physical colors).

**Patterns to follow:** Phase 5 detail page (movement rhythm, divider discipline, `--text-secondary` for info text, no cards, concrete responsive values baked in); UMB `how-to-play.html` `.table-wrap` + reading-column recipe; Phase 7's `editorial.md ## CTA state` as the install-string source.

**Test scenarios:**
- *Happy path (install block):* CTA state A → `npm i -g claude-credit`; C → `npm i -g @mbriggsy/claude-credit`; B → prose + source link, no install line. **Phase 7 owns the state→copy unit test (`src/lib/cta.test.ts`) — inherit it, do NOT duplicate;** verify About's block by eye-on-browser.
- *Edge (STATE UNRESOLVED):* CTA-state block absent or placeholder → renders STATE B copy + a dev-visible failure signal; never an empty mono box or a literal `<one line>`.
- *Edge (taxonomy table data):* the static array yields all 3 tiers + 10 categories with correct counted-value per tier (counted / counted / "tracked, not counted") and tier labels matching the hero hint verbatim — assert the array shape if co-located.
- *Pure styling/prose (§1, §4–§6, sign-off):* **Test expectation: none — static markup/copy; verified by eye-on-browser + the contrast probe + the cold voice read, not unit tests.**

**Verification:**
- `/about` renders all six sections + the closing sign-off with no broken layout in BOTH light and dark.
- Taxonomy table is complete (3 tiers, 10 categories, "counted in totals?" column) and **scrolls** at 360/375/390/430px with a **visible scroll cue** and the **tier column staying anchored** — never crushes; no horizontal scroll on the page body.
- Install block reflects the resolved CTA state (toggle all three by editing the source) AND the UNRESOLVED fallback renders STATE B + fails loud — never a hardcoded published assumption, never an empty box.
- §4 token sentences appear only after Phase 5's precondition gate is green, read true where `tokens` is null, and the word "lifetime" appears nowhere; the window-floor sentence is present.
- §5 reads as two decoupled facts and does not claim a push regenerates the numbers.
- A **measured** contrast probe passes for body + table-cell text in BOTH modes; §1/§2 pass a **cold-read voice check**.
- Keyboard-tab reaches the back-link and the source link with visible `:focus-visible` rings; tap targets ≥44px.

- [ ] **Unit 2: The quiet page-fade-in (one tween)**

**Goal:** Add the page's single motion moment — one quiet fade-in on mount — speaking the site's `weighted` dialect, degrading to the final visible state instantly under reduced motion.

**Requirements:** README "No animation on this page beyond a quiet page-fade-in"; the "done" bar (motion dialect + reduced-motion).

**Dependencies:** Unit 1 (static page must verify correct in both modes first — never debug layout through a running animation).

**Files:**
- Modify: `src/pages/About.tsx` (add the `useGSAP` reveal owner)
- Modify: `src/pages/About.module.css` (only if a wrapper node is needed; do NOT add a CSS `opacity:0` initial state)

**Approach:**
- `prefersReducedMotion()` branch FIRST → final state, no tween.
- Else `useGSAP(() => { … }, { scope: ref })`: `gsap.set` the page wrapper `autoAlpha: 0` (JS-hidden — never CSS `opacity:0`), fade to `autoAlpha: 1` with `ease.arrive` + `duration.reveal` (optional small `y` rise). **ONE tween on the wrapper — no section stagger** (Decision 6).
- No motion on the source link (insight 035).

**Execution note:** Implement only after Unit 1's static page verifies correct in both modes.

**Test scenarios:**
- *Happy path:* with motion allowed, the page content ends fully visible (`autoAlpha: 1`) after the tween — assert the end state, not mid-tween frames.
- *Edge (reduced motion):* with `prefersReducedMotion()` true (or the OS flag set), content is at final visible state immediately, no tween; nothing left hidden.
- *Edge (dead motion layer):* if GSAP never runs, content is still visible (proves no CSS `opacity:0` initial state).

**Verification:**
- The fade reads as the same weighted motion as the rest of the site (not a foreign default ease) — eye-on-browser.
- OS `prefers-reduced-motion: reduce` → the page appears instantly, fully readable, no flash of hidden content.
- The source link has no continuous motion; focus rings unaffected.

---

## System-Wide Impact

- **Interaction graph:** consumes the Phase 1 `/about` route + the (no-op in Phase 1) `[data-route-transition]` seam; reads the resolved `editorial.md ## CTA state` for §2 (the only dynamic input). No new shared state.
- **API surface parity:** §2's install string and Phase 7's CTA primary both call `resolveCtaCopy(CURRENT_CTA_STATE)` from `src/lib/cta.ts` — parity means same install string from the same function, NOT same layout (About is install-only; Phase 7 carries the extra first-run line). The shared surface is that module (Phase 7 owns it + its test), not a shared component.
- **Unchanged invariants:** does not touch `stats.json`, the data contract, the strip-for-publish surface, or any other phase's components. Taxonomy table is static (from the scheme), not per-project data.
- **Integration coverage:** the CTA-state → install-string mapping is the one behavior worth a render/unit assertion — and it's preferably owned once (Phase 7 / a shared lib), not duplicated here. Everything else is static markup verified by eye + contrast probe + cold voice read.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Install block hardcodes a published assumption / renders empty when CTA state is unresolved | Data-drive from the resolved CTA state; STATE-UNRESOLVED → STATE B default + fail loud (Decision 3) |
| §4 gate checks the wrong thing (named export) and passes/fails wrongly | Gate on the `TokenStats` interface shape + `tokens: TokenStats \| null`; inherit Phase 5's precondition gate (Decision 4) |
| §4 describes token numbers that don't exist for the meta projects (`tokens:null`) | Copy framed "measured from local session logs where present" — holds under null (Decision 4) |
| §5 mirrors the Phase-8-stale README line 71 cadence | Decoupled decided-regardless facts; do not mirror README line 71; Phase 8 reconciles (Decision 5 + TODO landmine) |
| Taxonomy table crushes / tier labels lost on phone | `.table-wrap` `overflow-x:auto` + `min-width:~560px` + sticky tier column + scroll cue (verify 360–430px) |
| "counted in totals?" column slips back into an authorship scoreboard | It's a measurement-scope fact, not a credit verdict (Decision 2 / §1 reconciliation); cell values locked |
| Body/table text fails contrast in one palette (densest text page) | Measured probe in both modes is part of the gate; `--text-secondary` never `--text-muted` (insights 010/051) |
| §1/§2 prose reads as generic AI-slop docs copy | Cold-read voice gate in the "done" bar + a "not this" anti-example in the −1.5 worksheet (Decision 7) |
| Fade leaves content hidden if GSAP fails / reduced-motion | JS-hidden `autoAlpha` only (never CSS `opacity:0`); one wrapper tween; `prefersReducedMotion()`-first (Decision 6) |

---

## Sources & References

- **Locked product decisions:** `docs/ideation.md` §1 (taxonomy = KIND, never an authored-vs-generated comparison — the §1 reconciliation in Decision 2), §8 (taxonomy explainer), §11 (authorship silent + the closing-nod line)
- **Plan index + visual system:** `docs/plans/README.md` (NB: line 71 cadence is Phase-8-stale — see Decision 5)
- **Depth/style anchor + token-field precondition gate:** `docs/plans/phase-5-detail.md`
- **Taxonomy + methodology source:** `tools/claude-credit/src/taxonomy.ts`, `tools/claude-credit/src/counter.ts`, `tools/claude-credit/src/git-stats.ts`, `tools/claude-credit/README.md`
- **Hero hint anchor:** `docs/plans/phase-3-hero.md` (the `AUTHORED · PIPELINE-GENERATED · TOOL-GENERATED — what each tier means →` link)
- **Install-snippet source + states:** `docs/plans/phase-7-cta.md` (deepened — owns `src/lib/cta.ts` + the state→copy test), `docs/plans/phase-preflight.md` (−1.1 states A/B/C → sets `CURRENT_CTA_STATE`, −1.5 editorial worksheet)
- **Cadence dependency:** `docs/plans/phase-8-deploy.md` (undeepened), `docs/plans/phase-2-data-wiring.md` Open Decision #2
- **Foundation:** `docs/plans/phase-1-scaffold.md` (route, tokens, `ease.arrive`/`duration.reveal`, `prefersReducedMotion()`, `useGSAP`)
- **Mobile/table anchor:** `projects/undercover-mob-boss/public/how-to-play.html`
- **Institutional insights:** `projects/burned/docs/insights/` — 068 (motion dialect), 035 (motion on click targets), 010/051 (palette contrast/CVD), 006 (CSS fallback order), 012 (unlayered CSS modules)

---

← [Phase 5 — Project detail](phase-5-detail.md) | [Index](README.md) | Next → [Phase 7 — Bottom CTA](phase-7-cta.md)
