# ai-journey-stats — locked product decisions

The WHAT decisions for the site. Visual / content / scope calls that sit upstream of any code work. If a future session is about to pick a direction that conflicts with what's here, this doc is the receipt that says no.

Companion: `plans/README.md` (full implementation plan, phases linked one file each), `../TODO.md` (next actionable steps).

---

## The bar (immutable)

> **"It's so fucking slick, water beads off it."**

The metaphor. It stays forever. **Evocative, not literal.**

The bar is about a SURFACE — high-gloss, hydrophobic, light catching the curve of a bead because the finish underneath is perfect. The car hood is the bar. The droplet sitting on it is the proof. The bar is NOT about water itself.

For ai-journey-stats specifically:

- **Type is the primary instrument.** Hero numbers don't need decoration; they need presence. Massive display weight, tabular numerals, kerning a print designer would obsess over. Tick-up with an ease that feels like the digits have mass.
- **Surface treatment, not particle effects.** Materials, light, finish. A faint specular sheen that drifts with cursor. A deep background with one slow gradient breath. The "slick" lives in materials and motion timing.
- **Negative space is the luxury signal.** Cheap sites cram. Expensive sites breathe.
- **Motion timing is where the bar gets met or missed.** Easing curves, settle times, the weight of a hover.

**Failure condition:** a stranger reacts "wow Claude built this" instead of "wow this is slick." The craft has to be invisible; the product stands on its own.

---

## Locked decisions

### 1. Audience: AI-curious peers

Other devs / Anthropic-adjacent folks. Knows what AI collab means; doesn't know the specific projects. Builder-to-builder voice, terse and sharp.

- The site does NOT pitch the `project-metrics` tool (§4, §7) — but the About page may explain *what the numbers mean* (the taxonomy) as light context, so a curious peer trusts the receipts. That's explaining the magnitude, not promoting the apparatus.
- Peers geek on the **WORK and its breadth** — the magnitude (tokens), the variety of what got built (code, tests, plans, prompts, images, audio, video), the cadence — NOT a *provenance scoreboard*. **The authored-vs-pipeline-vs-tool tier split is provenance ("how the magic was made") and is NOT the story** (Briggsy, 2026-05-24; reconciled with §11 — authorship/provenance is silent). The site surfaces *what exists*, framed by KIND, never an authored-vs-generated comparison. *(Superseded the earlier "the tier split is COMPELLING / peers need to understand authored-vs-pipeline" framing — that was the premise §11 + the detail-page deepening retired.)*
- Light onboarding needed: peers don't need "what is a commit," but the About page still explains what the `project-metrics` taxonomy measures (for the curious) — as light context, never a scoreboard.

### 2. Hero: ONE dominant number — combined Claude API tokens processed

`tokensProcessed` is the dominant number — the AI-native magnitude shock for the AI-peer audience. The dual-token data contract (Phase 0) splits the metric: `tokensProcessed` (includes cache re-feeds — the big number) and `tokensFresh` (excludes cheap re-feeds — the honest "work done" signal).

- **Hero = `tokensProcessed` as the massive counter.** `tokensFresh` + the retention window ride directly beneath as a **quiet, muted honest sub-line** — subordinate by design, NOT a competing weight. The AI-peer audience knows cache-reads inflate `processed`; surfacing `fresh` in the same glance is the credibility anchor that pre-empts the "juiced numbers" read.
- Lines authored, project count, files, commits drop to a supporting line below the sub-line.
- Window footnote required ("across N days of session retention") — session JSONLs rotate after ~30 days; never claim lifetime totals without external billing data.
- Tabular numerals for stable digit width during tick-up; the tick-up locks its magnitude unit so the suffix never flickers.
- Don't decorate the number. Frame it cold. The magnitude IS the wow.

### 3. Per-project tile: CLEAN — one-liner + visual + hook, no buttons (Briggsy, 2026-05-25)

Each tile: hand-written one-liner, key visual (screenshot / trailer frame / hero asset / card art), ONE hook stat. **No buttons on the tile** — the whole tile is one clean click → the detail page. (A button inside a clickable card is a competing click target; the grid stays calm and uniform, which is the more on-bar, on-thesis read for a body-of-work showcase.)

The **detail page is where you act:** a **"Source →"** link (always — every project has a repo folder, and the code IS the craft a peer geeks on) + a **"Try it →"** live link (only where the project is actually hosted). It also surfaces the project's WORK as a single-column editorial scroll: tokens consumed, a media-asset donut (the one flourish), a "what got built" breadth inventory (code/tests/plans/prompts/images/audio/video by kind), and commit cadence. It makes **no authorship/provenance claim** (§11). See `plans/phase-5-detail.md`.

### 4. No bottom CTA — the page ends on the work (Briggsy, 2026-05-24)

**The site is the drippy celebration of the WORK, not a pitch for the tool.** It ends on no button, no install command, no "Source on GitHub" link, nothing to click — the work is the final word.

> **UPDATE 2026-05-27 (Briggsy).** The close now states the work's *thesis* at display weight — *"Claude wrote all of it. Briggsy directed — and answered a question or two."* (the §11 sign-off, promoted from About) — rather than re-printing the hero's magnitude figures, which read as padding (Phase 9 cold-read). Still nothing-to-click; the magnitude shock stays the hero's job. Supersedes Phase 7's three-figure magnitude stack.

- `project-metrics` is the *tape measure* we used to count the work. It is ours, internal, **not a product the site promotes**. We do NOT publish it to npm for v1.
- Supersedes the earlier "dual CTA — tool pitch + GitHub link / the site IS a demo of the tool" framing. That made the visit end on tool-promotion, which is exactly what this site is not about.
- **Downstream:** Phase 7 (the "bottom CTA" phase) is gutted — its job becomes "design how the page *ends* on the work," not "build CTA buttons." The `cta.ts` / `resolveCtaCopy` / CTA-state-tracking plumbing (Phase 7 + About §2) is dead — remove it during Phase 7 reconciliation.
- Per-project **live/source links live on the DETAIL page, not the tiles** (§3) — "Source →" always + "Try it →" where hosted. Those point a visitor at the actual *work* (the running game/app, or its source), not at the tool. Different thing — they stay.

### 5. Per-project highlight: ONE hand-picked hook per tile

Each tile gets one editorial hook stat (e.g., "BURNED · 50 days · 167 tests"). Editorial pick — needs taste, can't be auto-derived.

No global superlatives. Specificity in the grid, magnitude in the hero.

### 6. Shelved projects appear with a "shelved" marker

Both Hide and Seek and Do Not Disturb appear in the grid with a clear visual marker (faded tile / "shelved" badge / muted color). Detail pages explain what was tried. Honest about iteration arc — failures are part of the story. Visual treatment must read as intentional, not broken.

### 7. Meta-projects do NOT appear — celebrate the work, not the apparatus (Briggsy, 2026-05-24)

The `project-metrics` tool and the `ai-journey-stats` site itself are **cut from the grid.** A tile for the tape measure, and a tile for the very page you're standing on, are navel-gazing — the site is about the WORK, not its own construction.

- Grid = the **9 real projects** + the **"the misses"** collective archive tile = **10 surfaces** (was 12). No "the tools" divider, no meta band.
- **Meta IS counted in the hero's combined totals** (Briggsy, 2026-05-25 — "count everything"). The tool + the site's own build are real work and feed the big magnitude number; they're just not given tiles. Briggsy accepted knowingly that this site's own construction (the `ai-journey-stats` JSONLs) is likely one of the largest single token sinks, so the hero number is heavily weighted toward "making the showcase itself."
- Consequence: `~/.project-metrics-projects.yaml` KEEPS the `meta:` array (tool + site) so they're scanned + summed into `combined`. Phase 0's 0.6b parser scans `meta[]` → contributes to `combined.*`, with `editorial: null`, and **emits no tile** — meta lives in its own `report.meta[]` array that the grid / detail / asset-copy steps all IGNORE (no `kind` field needed; the array IS the separation; `status` enum stays `'active' | 'shelved'` since only active projects carry editorial).
- **Project-COUNT semantics** (lean, confirm at Phase 3): the "N projects" count = the **9 active + 6 shelved = 15** portfolio entries. The 2 meta feed the token/line/byte magnitude but are NOT counted as "projects" (the tool and the site-about-the-work aren't portfolio projects). Magnitude counts everything; the project tally counts the portfolio.
- Supersedes the earlier "meta excluded from totals" note.
- Supersedes "Meta-projects appear in the grid / self-referential is a flex."

### 8. Taxonomy explainer: full on About + inline hint near hero

Full version on the About page; small inline hint near the hero so peers don't need to leave the landing page to understand what they're looking at.

### 9. Mobile: first-class

Mobile must SHINE, not just "doesn't break." Responsive desktop-led, but every surface holds at phone widths.

Anchor reference: `projects/undercover-mob-boss/public/how-to-play.html` — match its polish (dvh-safe viewport, breakpoint-scaled type, single-column collapse that reads deliberate).

### 10. Light AND dark mode: both first-class

Both palettes get their own design pass; both must pass the water-bead bar. `prefers-color-scheme` honored automatically. Manual toggle UI **shipped in v1** (2026-05-27, promoted from v1.1 once real use showed hiding a mode behind OS settings was the gap); OS preference remains the default.

Token architecture: semantic-over-physical so modes are CSS variable swaps, not parallel stylesheets.

The bar metaphor ports: midnight gloss (dark) and sunlit Polaroid (light) are both surfaces water beads off.

### 11. Authorship is NOT a feature — show the work, not a scoreboard

The site brags by being stunning and showing the WORK — magnitude, projects, polish. It does NOT make a who-wrote-what claim a loud feature. Claude wrote all of it (Briggsy only ever touched `.env` API keys — ATC, not pilot); that's the ambient truth of the whole thing, not a comparison to surface.

- NO human-vs-Claude authorship split viz, NO "0 lines authored by the human" headline, NO proof mechanism. This is our experiment — it owes no one proof.
- The hero's magnitude (tokens / lines / projects) IS the flex — it shows off the work without litigating authorship.
- Consequence: the per-tile tier bar is cut (Phase 4) and the per-project "AUTHORED BY" split is cut/reframed (Phase 5) — both are the same noise.
- The "autonomous-SDLC experiments" framing may appear as LIGHT context on the About page, never as a scoreboard. **Candidate line for that light touch** (Briggsy, 2026-05-24): *"Claude wrote all of it. Briggsy directed — and answered a question or two."* — a warm, self-deprecating nod to the ATC/pilot dynamic that earns a smile, not a metric or proof. **Placement (Briggsy 2026-05-27): the LANDING CLOSE at display weight AND the About footer** — promoted from a quiet About-only footnote to the site's final, most-prominent word, superseding Phase 7's three-figure magnitude stack (the hero already owns the magnitude). Stays §11-compliant: a warm note, never a metric/scoreboard.

---

## Editorial spine

| Beat | What it does | Surface |
|---|---|---|
| 1. Hero | Brag the size | Landing page top |
| 2. Project grid | Show the work + per-project hooks | Landing page below hero |
| 3. Per-project detail | Tell the story | `/project/:name` |
| 4. The close | The page ends on the project's thesis at display weight — *"Claude wrote all of it…"* — no CTA, nothing to click (§4/§11, updated 2026-05-27) | End of landing page |

---

## Bar constraints (what NOT to do)

| Constraint | Why |
|---|---|
| NO literal falling water droplets | Bar is the SURFACE, not the water. Reads as 2007 Flash. |
| NO iridescent oil-on-water hover accents | Gimmicky, undercuts the gloss. Bar is restraint + materiality. |
| ONE visual flourish per surface | Two transitional flourishes competing is busy. |
| NO global superlatives ("fastest project / most active week") | Specificity belongs in per-project hooks, not the hero. |

---

## References — the bar is the metaphor, not a site

The water-beads metaphor IS the bar. Surface treatment, materials, light, motion timing, negative space. **References calibrate specific choices (kerning, hover weight, settle ease) — they do not dictate look.** A site copied is a site we lost to AI slop.

### Reference bench (curated — calibrate, don't imitate)

| Reference | Use for |
|---|---|
| **Stripe** | Gradient breath + restrained motion + settle timing |
| **Linear** | Materials-aware surfaces + tight type + hover weight |
| **Vercel** | Type-led restraint (and it's the host) |
| **NYT digital features** | Editorial type + restrained scroll motion |
| **Cassie Evans / Sarah Drasner GSAP demos** | Motion-craft canon for specific eases and reveals |
| **UMB's `public/how-to-play.html`** | Mobile bar + responsive type clamps (already the locked mobile anchor) |

Look at one when calibrating a *specific* choice. Never adopt a *look* from one. If a rewrite reads "matches the bench" but doesn't read "water beads off it," the bench led us astray — drop back to the metaphor.

### Explicitly disqualified (the slop signals)

| Source | Why disqualified |
|---|---|
| **Awwwards** | Aggressive cursor effects, scroll-jacking, parallax horror, custom cursors, 3D-on-load. Canonical "wow they built this" gallery — our exact failure condition. |
| **Webby Awards** | Diluted/corporate award culture; not a craft signal. |
| **"Site of the Day" / Mindsparkle / "best landing pages 20XX"** | Same family — optimize for attention, opposite of restraint. |
| **Apple marketing pages** | Aspirational consumer marketing; wrong genome for an AI-peer showcase. (Apple HIG for accessibility specs — tap target minimums, etc. — is fine and unrelated.) |

If a future session is about to import a vibe from a disqualified source, this section is the receipt that says no.
