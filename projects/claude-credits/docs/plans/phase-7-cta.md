---
created: 2026-05-24T09:46:48-04:00
deepened: 2026-05-25
doc-reviewed:
reframed: 2026-05-25
coded:
---

# Phase 7 — The close

> **REFRAMED 2026-05-25.** This phase was "Bottom CTA" (install the tool + GitHub link). Briggsy locked **no bottom CTA — the page ends on the work** (ideation §4). The entire CTA build is CUT: no `src/lib/cta.ts`, no `cta.test.ts`, no `resolveCtaCopy` / `CURRENT_CTA_STATE` / `SOURCE_URL`, no command block, no STATE A/B/C machinery, no install copy, no GitHub-link button. **Do not build any of that.** `doc-reviewed` is intentionally cleared — the reframed content needs a fresh review pass before this phase codes. The git history holds the old CTA recipe if ever needed.

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions (esp. the CTA row: **None — the page ends on the work**), and visual system. Read [phase-1-scaffold.md](phase-1-scaffold.md) (semantic tokens + the motion foundation: `useGSAP`, `ease.arrive`, `duration.reveal`, `stagger.supportingLines`, `prefersReducedMotion()`, the `<Name>/<Name>.module.css` convention), [phase-3-hero.md](phase-3-hero.md) (the hero's `combined.*` magnitude this close echoes, and its null-degrade pattern), and [phase-4-grid.md](phase-4-grid.md) (the grid this beat follows + the global `ScrollTrigger.refresh()` race this beat depends on but does NOT duplicate).

Phase 7 lands **the close** — the editorial spine's final beat (ideation §4 / editorial-spine beat 4: "the page ends on the magnitude of the work"). It sits at the **bottom of the Landing page, below the project grid — NOT footer-pinned**. It is the last content a visitor scrolls to. There is **nothing to click**: no button, no install command, no source link. The magnitude of the work is the final word.

The bar for "Phase 7 done": the close reads as a deliberate, generous exhale that bookends the centered hero — never a crowded footer, never a dangling empty band; it restates the work's magnitude as a quiet summative line (see Decision 2) with no NaN/undefined when data is present and a clean degrade when it isn't; it reveals on scroll in the site's `weighted` dialect and, if the motion layer dies, **stays fully visible**; both light and dark pass the water-bead bar; it holds at 360–430px with safe-area bottom padding; and — the cold-read test — a stranger reaches the bottom and feels the size of the work land, not "here's a pitch." **Eye-on-browser in BOTH modes is the gate** (manifesto).

---

## Decisions locked at this reframe (read before executing)

1. **No CTA, no interactive close.** No `<BottomCta>`, no command block, no install copy, no "Source on GitHub" button, no `src/lib/cta.ts` / `cta.test.ts` / `resolveCtaCopy` / `CURRENT_CTA_STATE` / `SOURCE_URL`. The tool is not pitched and not published (ideation §4, §7). The component built here renders **type-on-background only** — nothing clickable. (Per-project "Try it →" / "Source →" links live on the tiles + detail pages, Phases 4/5 — they point at the *work*. The close has none.)

2. **The close restates the magnitude as the final word** (Briggsy's direction, 2026-05-24: *"20 projects. 4.2B tokens. that's the whole story."*). A quiet summative line/number that echoes the hero's `combined.*` — the work's size, stated cold, as the last thing seen. It reuses the hero's data, not a new source.
   - **Reads `combined` from `useStats()`** (the same context the hero + grid use) — project count + a magnitude figure (tokens and/or authored lines; exact figures are a −1.5/Phase-9 voice+taste call). **Honesty rule inherited:** any token figure carries the retention-window framing the hero uses (ideation §2; never a bare "lifetime" claim). The "as of `<date>`" freshness is the hero/About's job, not repeated here unless it reads naturally.
   - **Null-degrade** (mirror the hero): if `combined` is null/empty, the close renders its static summative copy WITHOUT broken numbers — never `NaN`, never an empty band. Worst case it degrades to a single quiet line with no figure.
   - **OPEN DESIGN QUESTION → Phase 9 + Briggsy taste:** the exact composition of the close — pure restated-number echo, a one-line summative sentence, or a near-silent negative-space exhale with a single figure. Phase 7 ships the structural slot + the data wire + the bar-compliant baseline; the final treatment is a Phase 9 polish call (Phase 9 is where the close gets its water-bead pass). Do NOT over-design it at first build; do NOT invent decoration.

3. **Motion = the site's reveal dialect only; NO bespoke flourish** (emil restraint + README "one wow moment per surface"). The close is below the fold → it reveals on scroll via the **`ScrollTrigger` registered in Phase 4** (reused, no new plugin): a **single `ScrollTrigger`** (`start: 'top 85%'`, `once: true`) with a small child stagger if there's more than one line (`stagger.supportingLines`, `ease: 'weighted-arrive'`, `duration.reveal`). It is **not** a README named wow moment → no bespoke motion; the reveal *is* its motion. **NOT `ScrollTrigger.batch`** (that's the tile-list pattern).

4. **P0 invisible-content guard** (same class as the grid/old-CTA): hidden initial state via **`gsap.set(..., { autoAlpha: 0 })` in JS, NEVER a CSS `opacity: 0` default**, and `prefersReducedMotion()` returns **before** any `gsap.set`. A dead motion layer (ScrollTrigger absent, JS throw, trigger never fires) degrades to a **fully-visible close**, never a blank ending. Build the reveal-target list defensively (no null refs in the `gsap.set` array).

5. **Reveal position relies on Phase 4's GLOBAL `ScrollTrigger.refresh()`; this phase does not duplicate it** (co-mount invariant). The close sits below the hero + grid + hero images; their late settling shifts its trigger position. Phase 4 fires the global self-heal (`Promise.race([document.fonts.ready, timeout(1500)])` + `window load` → `ScrollTrigger.refresh()`) unconditionally from `ProjectGrid` (Phase 4 Decision 10). `ScrollTrigger.refresh()` is global + idempotent → it refreshes the close's trigger too. **Invariant:** the close MUST co-mount on a route with a `ProjectGrid` that runs the refresh race (Landing, v1). If a future change renders the close on a grid-less route, it must wire its own `document.fonts.ready` → `ScrollTrigger.refresh()` self-heal.

6. **Not footer-pinned.** Generous top air (`var(--space-24)`) so it reads as a deliberate exhale, not a crowded footer. It scrolls as the last content of the Landing page — `padding`/flow, never `position: fixed`.

7. **Mobile + reduced-motion are first-class.** Holds at 360/375/390/430px (negative space scales, no horizontal scroll); `padding-bottom: calc(var(--space-16) + env(safe-area-inset-bottom, 0px))` so nothing sits under the iPhone home indicator (README `viewport-fit=cover`). Reduced-motion → close visible immediately, no reveal/stagger, nothing left hidden.

---

## Output structure (what this phase adds)

```
projects/claude-credits/
├── src/
│   ├── components/
│   │   └── Close/
│   │       ├── Close.tsx          # NEW — summative magnitude restatement (type-on-background, nothing clickable) + reveal (useGSAP)
│   │       └── Close.module.css   # NEW — closing-beat layout, negative space, both modes, mobile + safe-area
│   └── pages/
│       └── Landing.tsx            # MODIFIED — append <Close/> below <ProjectGrid/>
└── (reuses ScrollTrigger from Phase 4 + useStats() from Phase 2; NO cta.ts, NO new package deps)
```

No `src/lib/cta.ts`, no `cta.test.ts`. (Component name `Close` is illustrative — pick a non-reserved name if `Close` collides; e.g. `ClosingBeat`.)

---

## Execution — two commits (static-first)

### Commit 1 — static `Close` composition + CSS + Landing wire (no motion)

- **7.1a — `Close.tsx` (static):** read `combined` via `useStats()`; render the summative line(s) per Decision 2 with null-degrade (no `NaN`, no empty band). Type-on-background, nothing clickable. Place stable `data-reveal` refs on the reveal target(s) for C2.
- **7.1b — `Close.module.css`:** centered closing beat (`display:grid; place-items:center; gap: var(--space-6)`), `padding: var(--space-24) var(--space-6) var(--space-16)`, `text-align:center`, NOT footer-pinned. Display-type figure in `--font-display` + `.tabular`; supporting line `--text-secondary`. Mobile (`@media (max-width:600px)`): `padding-bottom: calc(var(--space-16) + env(safe-area-inset-bottom,0px))`; step type down. Both modes via semantic tokens only; no `--accent-stat-highlight` gold spent here (the hero owns the one gold moment).
- **7.1c — `Landing.tsx`:** append `<Close />` below `<ProjectGrid />`.
- **Verify gate (`pnpm dev`, BOTH modes):** the close reads as a deliberate exhale; the magnitude restatement is correct against the real data (and degrades cleanly with empty `stats.json`); no horizontal scroll at 360–430px; clears the home-indicator safe area; cold-read — the size of the work lands, it does NOT read as a pitch.
- **Commit:** `feat(claude-credits): the close — summative magnitude beat (static)`

### Commit 2 — reveal motion (scroll-triggered + reduced-motion + P0 guard)

- **7.2a — `Close.tsx` reveal:** one `useGSAP(() => {…}, { scope: closeRef })` — `if (prefersReducedMotion()) return` FIRST; `gsap.set(<targets>, { autoAlpha:0, y:24 })` (JS only); a single `ScrollTrigger` (`start:'top 85%'`, `once:true`, `onEnter`) → `gsap.to(<same targets>, { autoAlpha:1, y:0, duration: duration.reveal, ease:'weighted-arrive', stagger: stagger.supportingLines, overwrite:true })`. No refresh race here (relies on Phase 4's global, Decision 5). No `ScrollTrigger.batch`.
- **Verify gate (`pnpm dev` AND `pnpm build && pnpm preview`):** reveal fires once in the weighted dialect; **P0** — force a throw in `useGSAP` → close still fully visible; reveal position self-heals with throttled images/fonts; reduced-motion → visible immediately; both modes; no console/CSP errors.
- **Commit:** `feat(claude-credits): the close — weighted scroll reveal + reduced-motion`

---

## Landmines

| Landmine | Guard |
|---|---|
| **Resurrecting the CTA / a tool pitch** | ideation §4 is locked: the page ends on the work. NO button, NO install copy, NO source link, NO `cta.ts`. The close is type-on-background only. |
| **Over-designing the close at first build** | The exact composition is a Phase 9 + Briggsy-taste call (Decision 2). Phase 7 ships the slot + data wire + bar-compliant baseline; no invented decoration. |
| **Bare "lifetime" token claim in the restatement** | Inherit the hero's retention-window honesty (ideation §2). A token figure carries the window framing; never an unqualified lifetime number. |
| **`NaN` / empty band when data is null** | Null-degrade like the hero — render the static summative copy without figures, never a broken number or empty closing band (Decision 2). |
| **Blank close if the motion layer dies** | Hidden state via `gsap.set({autoAlpha:0})` in JS, NEVER CSS `opacity:0`; `prefersReducedMotion()` before `gsap.set`. Dead layer → fully visible (Decision 4). P0 gate. |
| **Close reveals at the wrong scroll position (late images/fonts)** | Relies on Phase 4's global, unconditional `ScrollTrigger.refresh()` + the co-mount invariant (Decision 5). Throttled-images gate. |
| **`ScrollTrigger.batch` misused for one section** | The close is one section, not a tile list → a single `ScrollTrigger` + child stagger (Decision 3). |
| **Footer-pinning the close** | It's the page's closing CONTENT beat, scrolled to — `padding`/flow, never `position: fixed` (Decision 6). |
| **Close hidden behind iPhone home indicator** | `padding-bottom: calc(var(--space-16) + env(safe-area-inset-bottom,0px))` on mobile (Decision 7). |
| **StrictMode double-reveal in dev** | `gsap.set` + the `ScrollTrigger` live inside `useGSAP({scope})` → dev double-invoke reverts cleanly. |

---

## System-wide impact

- **Interaction graph:** `Close` mounts on `Landing` below `ProjectGrid`. It consumes `combined` from `useStats()` (read-only, same context as hero/grid) and reuses the registered `ScrollTrigger` (Phase 4). It depends (by stated invariant) on `ProjectGrid`'s global `ScrollTrigger.refresh()` co-mounting on Landing (Decision 5). It adds NO new package deps, NO new GSAP plugin, NO `cta.ts`.
- **Removed vs the old CTA phase:** `src/lib/cta.ts`, `cta.test.ts`, `resolveCtaCopy`, `CURRENT_CTA_STATE`, `SOURCE_URL`, the command block, `LiveLinkButton` reuse at the close, the STATE A/B/C machinery, and the `editorial.md ## CTA state` receipt-parity test are all GONE. About (Phase 6) no longer imports `cta.ts` (reconciled). Preflight −1.1 no longer sets a CTA constant (resolved as "no publish, no CTA").
- **Unchanged invariants:** does not touch `stats.json`, the data contract, the strip-for-publish surface, the hero, the grid, or the route transition. Adds the `Close/` component + one `Landing.tsx` append.

---

## Out of scope for Phase 7 (explicit "later")

- The final close composition + its water-bead polish pass → **Phase 9** (Decision 2 open question).
- Open Graph / Twitter Card preview for share-out → out of scope for v1 (README).
- Analytics / telemetry on the close → out of scope (README: no telemetry).
- Any tool pitch, install path, or npm publish → permanently out (ideation §4, §7).

---

← [Phase 6 — About page](phase-6-about.md) | [Index](README.md) | Next → [Phase 8 — Deploy](phase-8-deploy.md)
