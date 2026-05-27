---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-25T00:00:00-04:00
doc-reviewed: 2026-05-25T11:05:47-04:00
reframed: 2026-05-25T00:00:00-04:00
coded: 2026-05-26
code-reviewed: 2026-05-27
---

# Phase 7 — The close

> **REFRAMED 2026-05-25.** This phase was "Bottom CTA" (install the tool + GitHub link). Briggsy locked **no bottom CTA — the page ends on the work** (ideation §4). The entire CTA build is CUT: no `src/lib/cta.ts`, no `cta.test.ts`, no `resolveCtaCopy` / `CURRENT_CTA_STATE` / `SOURCE_URL`, no command block, no STATE A/B/C machinery, no install copy, no GitHub-link button. **Do not build any of that.** The git history holds the old CTA recipe if ever needed. **Reframed content doc-reviewed 2026-05-25** (two rounds: composition locked as the three-figure stack, motion contract hardened — see Decisions 2 + 5 and the Cascade note to Phase 4).

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions (esp. the CTA row: **None — the page ends on the work**), and visual system. Read [phase-1-scaffold.md](phase-1-scaffold.md) (semantic tokens + the motion foundation: `useGSAP`, `ease.arrive`, `duration.reveal`, `stagger.supportingLines`, `prefersReducedMotion()`, the `<Name>/<Name>.module.css` convention), [phase-2-data-wiring.md](phase-2-data-wiring.md) (the `useStats()` NON-NULL `MultiProjectReport` contract + field-level null discipline this close consumes — `useStats()` and `combined` are defined here), [phase-3-hero.md](phase-3-hero.md) (the hero's `combined.*` magnitude + null-degrade predicate this close mirrors; the close leads with project breadth, not a token echo — Decision 2), and [phase-4-grid.md](phase-4-grid.md) (the grid this beat follows + the global `ScrollTrigger.refresh()` race this beat consumes as its PRIMARY positioning heal — Decision 5; the close covers the already-in-view case locally and fires no global refresh of its own).

Phase 7 lands **the close** — the editorial spine's final beat (ideation §4 / editorial-spine beat 4: "the page ends on the magnitude of the work"). It sits at the **bottom of the Landing page, below the project grid — NOT footer-pinned**. It is the last content a visitor scrolls to. There is **nothing to click**: no button, no install command, no source link. The magnitude of the work is the final word.

The bar for "Phase 7 done": the close reads as a deliberate, generous exhale that bookends the centered hero — never a crowded footer, never a dangling empty band; it states the work's magnitude as the locked three-figure stack (projects · tokens · authored lines — see Decision 2) with no NaN/undefined when data is present and a clean degrade (drop the token line) when it isn't; it reveals on scroll in the site's `weighted` dialect and, if the motion layer dies, **stays fully visible**; both light and dark pass the water-bead bar; it holds at 360–430px with safe-area bottom padding; and — the cold-read test — a stranger reaches the bottom and feels the size of the work land, not "here's a pitch." **Eye-on-browser in BOTH modes is the gate** (manifesto).

---

## Decisions locked at this reframe (read before executing)

1. **No CTA, no interactive close.** No `<BottomCta>`, no command block, no install copy, no "Source on GitHub" button, no `src/lib/cta.ts` / `cta.test.ts` / `resolveCtaCopy` / `CURRENT_CTA_STATE` / `SOURCE_URL`. The tool is not pitched and not published (ideation §4, §7). The component built here renders **type-on-background only** — nothing clickable. (Per-project "Try it →" / "Source →" links live on the **detail pages** only, Phase 5 — the tiles are clean, no buttons, ideation §3. Those point at the *work*. The close has none.)

2. **The close is a three-figure magnitude stack — composition LOCKED** (Briggsy, 2026-05-25; his instinct: *"20 projects. 4.2B tokens. that's the whole story."*). Three figures, stacked and declarative, **no sentiment/tagline line**, **leading with breadth** so it reads as the *accumulation* of everything just scrolled — NOT a bare echo of the hero (which leads with tokens; a re-print of the same lead figure reads as redundancy, not a climax). Pure magnitude; **no authorship/autonomy claim** (ideation §11 — the work is the brag, silent on who built it).

   **The locked stack (top → bottom):**
   1. **Project count** (leads) — `report.projects.length + (report.archiveCollective?.projectCount ?? 0)` (active + shelved; DERIVED, **not** a `combined` field; `report.meta` feeds magnitude but is NOT in the count, mirroring the hero, Phase 3). Leading with projects — the breadth the grid just demonstrated — avoids echoing the hero's token lead.
   2. **Token magnitude** — `combined.totalTokensProcessed`. Carries the retention-window honesty as a small line beneath the stack: "(tokens measured over a `<N>`-day window)" from `combined.tokenWindowDays` — never a bare "lifetime" claim (ideation §2). The "as of `<date>`" freshness stays the hero/About's job.
   3. **Authored lines** — `combined.totalAuthoredLines` (file-classification-derived, rotation-immune; verified in `taxonomy.ts:133-146` per Phase 3).

   - **Null-degrade — LOCKED, layered, structurally non-empty:** mirror the hero's *layered* guards, each line shown independently:
     - **Project count = the structural floor — ALWAYS shown.** It's derived from `report.projects.length` (+ archive), which must exist for the site to render at all → the close can never be fully empty.
     - **Token line + window line:** shown iff **`combined.tokenWindowDays !== null`** — the "did we measure tokens" signal (clean clone / CI have no JSONLs → `tokenWindowDays === null`, and `totalTokensProcessed === 0`). NOT `combined` being null (Phase 2 guarantees `combined` is a non-null object) and NOT `totalTokensProcessed > 0` (that conflates a genuine measured-zero with unmeasured — the bug Phase 3's hero predicate fixes). When `null`, drop both lines.
     - **Authored-lines line:** shown iff **`combined.totalAuthoredLines > 0`** (mirrors the hero's secondary guard, Phase 3 — a CI tarball with no git can read 0; never render a "0 lines" beat).
     - **Worst case** (CI tarball: no JSONLs, no git → tokens null, lines 0): the close degrades to a single line, *"Fifteen projects."* — non-empty, no `NaN`, no empty band. Normal case shows all three.

   - **Phase 9 still owns the water-bead pass** — type scale/weight, the negative-space envelope, reveal feel, light/dark calibration. What is LOCKED here is the **composition** (which three figures, their order, the declarative no-tagline shape, the fallback); Phase 9 *polishes that shape, it does not design it from scratch* — mirroring how the hero was designed at its Phase 3 build and only polished at Phase 9, so the public Phase 8 deploy never carries an undesigned final beat. Do NOT add decoration beyond the locked stack.

3. **Motion = the site's reveal dialect only; NO bespoke flourish** (emil restraint + README "one wow moment per surface"). The close is below the fold → it reveals on scroll via the **`ScrollTrigger` registered in Phase 4** (reused, no new plugin): a **single `ScrollTrigger`** (`start: 'top 85%'`, `once: true`) with a small child stagger if there's more than one line (`stagger.supportingLines`, `ease: 'weighted-arrive'`, `duration.reveal`). It is **not** a README named wow moment → no bespoke motion; the reveal *is* its motion. **NOT `ScrollTrigger.batch`** (that's the tile-list pattern).

4. **P0 invisible-content guard** (same class as the grid/old-CTA): hidden initial state via **`gsap.set(..., { autoAlpha: 0 })` in JS, NEVER a CSS `opacity: 0` default**, and `prefersReducedMotion()` returns **before** any `gsap.set`. A dead motion layer (ScrollTrigger absent, JS throw, trigger never fires) degrades to a **fully-visible close**, never a blank ending. Build the reveal-target list defensively (no null refs in the `gsap.set` array).

5. **Reveal position: Phase 4's GLOBAL `ScrollTrigger.refresh()` is PRIMARY; the close does NOT fire its own global refresh — it self-covers the already-in-view case with a LOCAL post-settle rect-check** (settled 2026-05-25 after two review rounds; see the note). The close sits below the hero + grid + hero images; their late settling shifts its trigger position. Phase 4 fires the global self-heal (`Promise.race([document.fonts.ready, timeout(1500)])` + `window load` → `ScrollTrigger.refresh()`) unconditionally from `ProjectGrid` (Phase 4 Decision 10), global + idempotent → it positions the close's below-fold trigger too. **Two risks the review surfaced, and how this resolves them:**
   - *Already-in-view (the close fits on screen at load — tall desktop / short page):* a plain `once:true` trigger may never fire `onEnter` if its start is already passed → invisible final beat. Covered by 7.2a's **local post-settle rect-check** (`fonts.ready`/timeout → rAF → reveal if in view), NOT a global refresh.
   - *Silent break if `ProjectGrid` is refactored away / made conditional:* the below-fold trigger would then position against pre-settle layout. **Accepted-minor:** it still reveals on the scroll crossing (just possibly a few px early/late from the font/image shift) — never invisible. *(Round 1 added a close-owned `ScrollTrigger.refresh()` to harden this; round 2 removed it — a second global refresh recomputes EVERY trigger and can reflow already-revealed grid tiles, a worse cost than the rare, minor mis-position it guarded. The rect-check covers the only catastrophic case.)*

6. **Not footer-pinned.** Generous top air (`var(--space-24)`) so it reads as a deliberate exhale, not a crowded footer. It scrolls as the last content of the Landing page — `padding`/flow, never `position: fixed`.

7. **Mobile + reduced-motion are first-class.** Holds at 360/375/390/430px (negative space scales, no horizontal scroll); `padding-bottom: calc(var(--space-16) + env(safe-area-inset-bottom, 0px))` so nothing sits under the iPhone home indicator (README `viewport-fit=cover`). Reduced-motion → close visible immediately, no reveal/stagger, nothing left hidden.

---

## Output structure (what this phase adds)

```
projects/ai-journey-stats/
├── src/
│   ├── components/
│   │   └── Close/
│   │       ├── Close.tsx          # NEW — three-figure magnitude stack (type-on-background, nothing clickable) + reveal (useGSAP)
│   │       └── Close.module.css   # NEW — closing-beat layout, negative space, both modes, mobile + safe-area
│   └── pages/
│       └── Landing.tsx            # MODIFIED — append <Close/> below <ProjectGrid/>
└── (reuses ScrollTrigger from Phase 4 + useStats() from Phase 2; NO cta.ts, NO new package deps)
```

No `src/lib/cta.ts`, no `cta.test.ts`. (Component name `Close` is illustrative — pick a non-reserved name if `Close` collides; e.g. `ClosingBeat`.)

---

## Execution — two commits (static-first)

**Precondition (Phase 7 codes after Phase 0/2/3/4):** `combined.totalTokensProcessed`, `combined.tokenWindowDays`, and `combined.totalAuthoredLines` must exist on the non-null `combined` (Phase 0 Batch A adds the token fields; `totalAuthoredLines` is already in `taxonomy.ts:137`). The hero (Phase 3) + grid (Phase 4) already consume these, so by Phase 7 they're proven present — but read field names from [phase-2-data-wiring.md](phase-2-data-wiring.md) / [phase-3-hero.md](phase-3-hero.md), never from a pre-Phase-0 `dist`.

### Commit 1 — static `Close` composition + CSS + Landing wire (no motion)

- **7.1a — `Close.tsx` (static):** read `combined` via `useStats()`; render the **locked three-figure stack** per Decision 2 — project count (derived) · token magnitude + window line · authored lines, declarative, no tagline — with the locked null-degrade (when `combined.tokenWindowDays === null`, drop the token + window lines; keep projects + authored lines). No `NaN`, no empty band. Type-on-background, nothing clickable. Place a stable `data-reveal` ref on EACH stack line (each is a reveal target for C2's stagger).
- **7.1b — `Close.module.css`:** centered closing beat (`display:grid; place-items:center; gap: var(--space-6)`), `padding: var(--space-24) var(--space-6) var(--space-16)`, `text-align:center`, NOT footer-pinned. Display-type figure in `--font-display` + `.tabular`; supporting line `--text-secondary`. Mobile (`@media (max-width:600px)`): `padding-bottom: calc(var(--space-16) + env(safe-area-inset-bottom,0px))`; step type down. Both modes via semantic tokens only; no `--accent-stat-highlight` gold spent here (the hero owns the one gold moment).
- **7.1c — `Landing.tsx`:** append `<Close />` below `<ProjectGrid />`.
- **Verify gate (`pnpm dev`, BOTH modes):** the close reads as a deliberate exhale; the three-figure stack (projects · tokens · lines) is correct against the real data; the null-degrade is correct and layered — `tokenWindowDays === null` `stats.json` → token + window lines drop, projects + lines remain; the worst case (also `totalAuthoredLines === 0`) → projects-only, *"Fifteen projects."* (never empty, never `NaN`); no horizontal scroll at 360–430px; clears the home-indicator safe area; cold-read — the size of the work lands, it does NOT read as a pitch.
- **Commit:** `feat(ai-journey-stats): the close — summative magnitude beat (static)`

### Commit 2 — reveal motion (scroll-triggered + reduced-motion + P0 guard)

- **7.2a — `Close.tsx` reveal:** one `useGSAP(() => {…}, { scope: closeRef })`, in this order:
  - `if (prefersReducedMotion()) return` FIRST (before any `gsap.set`).
  - `gsap.set(<targets>, { autoAlpha:0, y:24 })` (JS only — never a CSS `opacity:0` default).
  - **One-shot reveal (true idempotency):** `let revealed = false; const reveal = () => { if (revealed) return; revealed = true; gsap.to(<targets>, { autoAlpha:1, y:0, duration: duration.reveal, ease:'weighted-arrive', stagger: stagger.supportingLines, overwrite:true }) }`. The `revealed` flag — **not `overwrite` alone** — is what guarantees the two reveal paths (rect-check + `onEnter`) can't double-fire or restart a mid-flight tween (round-2: `overwrite` restarts from interpolated values → a visible stutter, not a clean no-op).
  - **`refreshInit` y-reset (load-bearing, mirrors Phase 4 Decision 9) WITH explicit cleanup:** `const resetY = () => gsap.set(<targets>, { y: 0 }); ScrollTrigger.addEventListener('refreshInit', resetY)` **and `return () => ScrollTrigger.removeEventListener('refreshInit', resetY)`**. Why the reset: the hidden `y:24` displaces the close's measured top during every `ScrollTrigger.refresh()`, so without it `start:'top 85%'` is computed 24px low. **Why the cleanup is mandatory:** `ScrollTrigger.addEventListener` registers on GSAP's global event bus, which `useGSAP`/context revert does **NOT** remove (verified against Phase 3's explicit-listener-cleanup pattern, phase-3 §619-620) — without `removeEventListener`, the StrictMode dev double-invoke leaks a second `resetY` listener closing over torn-down refs. (`invalidateOnRefresh` does NOT apply — the reveal runs in `onEnter`, not as the trigger's own animation.) **⚠ The same cleanup gap exists in Phase 4 Decision 9 — the pattern Phase 7 inherits. Fix it in Phase 4 first; see Cascade.**
  - **Below-fold reveal:** a single `ScrollTrigger` (`start:'top 85%'`, `once:true`, `onEnter: reveal`). No `ScrollTrigger.batch` (tile-list pattern). Trigger positioning relies on Phase 4's global refresh (Decision 5, PRIMARY) — **the close fires NO `ScrollTrigger.refresh()` of its own** (round-2: a close-owned refresh recomputes ALL triggers globally and can reflow already-revealed grid tiles).
  - **Already-in-view reveal — POST-SETTLE (round-2 fix to the round-1 guard):** the rect-check must run AFTER fonts/images settle, NOT synchronously at trigger creation — `useGSAP` is `useLayoutEffect` (pre-paint, pre-settle), so a synchronous `getBoundingClientRect()` reads stale layout and mis-fires both ways. Run it in a settle gate: `Promise.race([document.fonts.ready, timeout(1500)]).then(() => requestAnimationFrame(() => { if (!revealed && closeRef.current && closeRef.current.getBoundingClientRect().top < window.innerHeight * 0.85) reveal() }))`. This reveals an already-in-view close (tall viewport / short page) once layout is real; the below-fold case is left to `onEnter`. It is a **local** check (no global `refresh()`); the `revealed` flag keeps it safe against a later `onEnter`. The `closeRef.current` null-guard covers unmount before the promise resolves. **Verify at a tall viewport / short page (close in view on first paint), in BOTH dev and preview.**
- **Verify gate (`pnpm dev` AND `pnpm build && pnpm preview`):** reveal fires once in the weighted dialect; **P0 (dead layer)** — force a throw in `useGSAP` → close still fully visible; **already-in-view (finding #4)** — load at a tall viewport / short page so the close is in view on first paint → it reveals (rect-guard fired), verified in **dev AND preview**; **StrictMode (residual)** — in `pnpm dev` (StrictMode double-invoke) the close ends VISIBLE, not re-hidden by the `once:true` revert (verify separately from the prod gate, as Phase 4 does); below-fold reveal position self-heals with throttled images/fonts (Phase 4's global refresh) AND the already-in-view path fires after settle (the local rect-check), with NO visible reflow of already-revealed grid tiles (the close adds no global refresh); reduced-motion → visible immediately; both modes; no console/CSP errors.
- **Commit:** `feat(ai-journey-stats): the close — weighted scroll reveal + reduced-motion`

---

## Landmines

| Landmine | Guard |
|---|---|
| **Resurrecting the CTA / a tool pitch** | ideation §4 is locked: the page ends on the work. NO button, NO install copy, NO source link, NO `cta.ts`. The close is type-on-background only. |
| **Over-designing the close / adding decoration** | Composition is LOCKED (Decision 2 — the three-figure stack). Phase 7 builds exactly that shape + data wire; Phase 9 polishes type/space/reveal feel. No figures beyond the three, no tagline, no invented decoration. |
| **Already-in-view close never reveals (invisible final beat)** | A plain `ScrollTrigger` may not fire `onEnter` for an element already past `start` at load. Rect-check guard (`getBoundingClientRect().top < innerHeight*0.85` → `reveal()` immediately) + a tall-viewport verify case (Decision 4 / 7.2a, finding #4). The dead-layer P0 guard does NOT cover this — separate guard. |
| **Bare "lifetime" token claim in the stack** | The token line carries the retention-window line beneath it (ideation §2); never an unqualified lifetime number. |
| **`NaN` / empty band when token data is null** | Null-degrade (Decision 2): when `tokenWindowDays === null`, drop the token + window lines, keep projects + authored lines (file-classification-derived, never null) → the close is structurally never empty, never a broken number. |
| **Blank close if the motion layer dies** | Hidden state via `gsap.set({autoAlpha:0})` in JS, NEVER CSS `opacity:0`; `prefersReducedMotion()` before `gsap.set`. Dead layer → fully visible (Decision 4). P0 gate. |
| **Close reveals at the wrong scroll position (late images/fonts)** | Below-fold positioning heals via Phase 4 Decision 10's global, unconditional `ScrollTrigger.refresh()` (PRIMARY); the close fires NO global refresh of its own (avoids reflowing already-revealed grid tiles). Already-in-view is covered by the local post-settle rect-check (7.2a). Throttled-images gate. |
| **`y:24` hidden offset throws off `ScrollTrigger.refresh()` measurement** | `refreshInit` listener resets `y:0` during measurement (7.2a, mirrors Phase 4 Decision 9) — **registered with a named handler and removed in `useGSAP` cleanup** (`ScrollTrigger.addEventListener` is global, not context-reverted). Without the reset, `start:'top 85%'` is computed 24px low. |
| **`ScrollTrigger.batch` misused for one section** | The close is one section, not a tile list → a single `ScrollTrigger` + child stagger (Decision 3). |
| **Footer-pinning the close** | It's the page's closing CONTENT beat, scrolled to — `padding`/flow, never `position: fixed` (Decision 6). |
| **Close hidden behind iPhone home indicator** | `padding-bottom: calc(var(--space-16) + env(safe-area-inset-bottom,0px))` on mobile (Decision 7). |
| **StrictMode double-invoke leaves close hidden / leaks a `refreshInit` listener** | `gsap.set` + the `ScrollTrigger` revert via `useGSAP({scope})`, BUT the `refreshInit` listener is global → it MUST be removed in the cleanup return (7.2a), or the dev double-invoke leaks a second `resetY`. The `once:true` revert path differs from `batch`, so the close gets its OWN dev verify case (Commit 2 gate): confirm it ends VISIBLE in dev (scroll-in AND already-in-view paths) and that only one `refreshInit` listener survives the double-invoke. |

---

## System-wide impact

- **Interaction graph:** `Close` mounts on `Landing` below `ProjectGrid`. It consumes `combined` from `useStats()` (read-only, same context as hero/grid) and reuses the registered `ScrollTrigger` (Phase 4). Below-fold trigger positioning relies on `ProjectGrid`'s global `ScrollTrigger.refresh()` (PRIMARY); the already-in-view case is covered by the close's own LOCAL post-settle rect-check; the close fires NO global refresh of its own (Decision 5). It adds NO new package deps, NO new GSAP plugin, NO `cta.ts`.
- **Removed vs the old CTA phase:** `src/lib/cta.ts`, `cta.test.ts`, `resolveCtaCopy`, `CURRENT_CTA_STATE`, `SOURCE_URL`, the command block, `LiveLinkButton` reuse at the close, the STATE A/B/C machinery, and the `editorial.md ## CTA state` receipt-parity test are all GONE. About (Phase 6) no longer imports `cta.ts` (reconciled). Preflight −1.1 no longer sets a CTA constant (resolved as "no publish, no CTA").
- **Unchanged invariants:** does not touch `stats.json`, the data contract, the strip-for-publish surface, the hero, the grid, or the route transition. Adds the `Close/` component + one `Landing.tsx` append.

---

## Cascade (cross-phase corrections this review forces)

- **✅ Phase 4 Decision 9 — `refreshInit` listener cleanup (FIXED 2026-05-25).** This review found the same global-listener leak in Phase 4's grid reveal (it registered `ScrollTrigger.addEventListener('refreshInit', …)` and wrongly claimed `useGSAP` scope reverts it). Phase 4 codes BEFORE Phase 7, so it was corrected in `phase-4-grid.md` (Decision 9 + 4.3b + landmine): named `resetTileY` handler + `removeEventListener` in the `useGSAP` cleanup, plus a dev listener-survival verify case. Phase 7 inherits the corrected pattern (its own 7.2a does the same).

---

## Out of scope for Phase 7 (explicit "later")

- The close's **water-bead polish pass** (type scale/weight, negative-space envelope, reveal feel, light/dark calibration) → **Phase 9**. The *composition* is LOCKED here (Decision 2 — the three-figure stack); Phase 9 polishes that shape, it does not redesign it.
- **Forward-flag → Phase 9:** Phase 9's cold-watch rubric currently has NO row for "the close" (the final editorial-spine beat). Phase 9's deepening should add a "close" row with its own "beads when…" criterion. (Not edited here — a Phase 7 review does not silently mutate Phase 9's doc; flagged so it isn't lost.)
- Open Graph / Twitter Card preview for share-out → out of scope for v1 (README).
- Analytics / telemetry on the close → out of scope (README: no telemetry).
- Any tool pitch, install path, or npm publish → permanently out (ideation §4, §7).

---

← [Phase 6 — About page](phase-6-about.md) | [Index](README.md) | Next → [Phase 8 — Deploy](phase-8-deploy.md)
