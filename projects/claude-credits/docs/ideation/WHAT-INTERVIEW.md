# claude-credits — WHAT Interview

**Project**: `projects/claude-credits/` — Vercel-hosted GSAP showcase of `claude-credit` data across the monorepo
**Date**: 2026-05-23
**Status**: WHAT decisions locked. HOW (technical implementation) still to be revised based on these calls.
**Companion docs**: `../../TODO.md` (existing technical plan, pre-dates this interview and needs revision)

---

## Why this doc exists

The existing `TODO.md` is comprehensive on the technical side (Phases 0–8: data extension, scaffold, hero, grid, detail pages, deploy, polish). What was missing was the editorial / product layer:

- WHO is this site for?
- WHAT does it surface beyond raw stats?
- What's the ASK at the end?

The technical TODO assumed answers to those without ever asking them. This interview did the ask. The decisions below now sit upstream of any code work — they steer scope, content, visual direction, and the CTA.

---

## The bar (immutable)

> **"It's so fucking slick, water beads off it."**

This is the metaphor. It stays forever. It is **evocative, not literal**.

The bar is about a SURFACE — high-gloss, hydrophobic, light catching the curve of a bead because the finish underneath is perfect. The car hood is the bar. The droplet sitting on it is the proof. The bar is NOT about water itself.

For claude-credits specifically, that means:

- **Type is the primary instrument.** The 421,633 number doesn't need decoration. It needs presence. Massive display weight, tabular numerals, kerning a print designer would obsess over. Tick-up with an ease that feels like the digits have mass.
- **Surface treatment, not particle effects.** Materials, light, finish. A faint specular sheen that drifts with cursor. A deep teal background that's almost black with one slow gradient breath. The "slick" lives in materials and motion timing, not in things falling or rippling.
- **Negative space is the luxury signal.** Cheap sites cram. Expensive sites breathe.
- **Motion timing is where the bar gets met or missed.** Easing curves, settle times, the weight of a hover.

**Failure condition**: a stranger reacts "wow Claude built this" instead of "wow this is slick." The craft has to be invisible; the product stands on its own.

---

## Locked decisions

### 1. Audience: **AI-curious peers**

Other devs / Anthropic-adjacent folks. Knows what AI collab means; doesn't know the specific projects. Tone is **builder-to-builder, less corporate**, can geek out on the credit tool itself.

**Implications:**
- The `claude-credit` tool is content, not just infrastructure. Peers want to understand what it measures and why.
- Authored / Claude-authored / pipeline-generated / tool-generated split is COMPELLING to this audience, not embarrassing.
- Skip "I am pleased to present my portfolio" energy. Be terse, sharp, builder-coded.
- Light onboarding needed (peers don't need "what is a commit" but DO need "what does authored-vs-pipeline mean in this taxonomy").

### 2. Hero number: **Total volume — one massive number, shock of magnitude**

ONE big total-volume number as the front door. Breakdown surfaces lower on the page, not in the hero.

**Implications:**
- Hero is structurally simple: one massive number + small supporting line ("across N projects · M files · K commits"). No competing visual weights.
- The authorship split (Briggsy / Claude / pipeline / tool) lives BELOW the fold on the landing page, and on per-project detail pages.
- Tabular numerals required for stable digit width during tick-up.
- Don't decorate the number. Frame it cold. The magnitude IS the wow.

### 3. Per-project content: **One-liner + visual + live link (where deployed)**

Each project tile gets:
- Hand-written one-liner ("BURNED — Archer-toned party card game")
- Key visual (screenshot / trailer frame / hero asset / card art)
- Live link button if the project is deployed

Detail page expands with:
- Bigger visual (or gallery)
- 2-3 sentence description of what the project IS and WHY it exists
- "Try it →" button if deployed

**Content collection work attached (real cost):**
- ~9 one-liners to write (voice/positioning calls, Briggsy needs to weigh in)
- ~9 key visuals to source/capture (some exist, some need creating)
- Verify live deploy URLs per project

### 4. Bottom CTA: **Dual — tool pitch + GitHub link**

Primary CTA: "Try `claude-credit` on your own repo" — install command + tool pitch.
Secondary CTA: "Source on GitHub" — link to the monorepo.

**Implications:**
- The site IS a demo of the tool. Peers can install and run it on their own code.
- Need an install section / install command surface near the CTA.
- Two clean CTAs, not a wall of links.

> **🚧 Verification gap (must resolve before locking the CTA):**
> Is `tools/claude-credit/` actually published / installable (npm or otherwise)? Is the monorepo (or at least the tool dir) public on GitHub?
> If no, decide the path: (a) publish before site launch, (b) change CTA to "watch this space," or (c) ship the tool alongside the site as a synchronized release.

### 5. Per-project highlights: **One hand-picked hook per tile, no global superlatives**

Each project tile carries ONE hand-picked highlight stat (e.g., "BURNED · 50 days · 167 tests"). The global hero stays clean — no "fastest project / most active week" superlatives layered on.

**Implications:**
- Specificity lives in the grid, magnitude lives in the hero. Clean separation.
- The hook stat per project is an editorial pick — needs taste, can't be auto-derived.
- Examples of hooks to consider: "BURNED — 50 days zero to playable," "UMB — weekend deployment," "TDR-04 — 487/487 tests."

### 6. Shelved projects (Hide and Seek, Do Not Disturb): **Appear with "shelved" marker**

Both shelved games appear in the grid with a clear visual marker (faded tile / "shelved" badge / muted color). Detail pages explain what was tried.

**Implications:**
- Honest about iteration arc — failures are part of the story for AI-peer audience.
- Need a visual treatment for "shelved" that reads as intentional, not broken.
- Optional: short "what we learned" snippet on shelved detail pages (decided: NOT included for v1 — the marker + project description is enough; full lessons-learned content was a 4th option that didn't win).

### 7. Meta-projects (`claude-credit` tool + `claude-credits` site itself): **Appear in the grid**

The tool powering the site is a project. The site itself is a project. Both appear in the grid.

**Implications:**
- Self-referential is a flex, not a bug. The site shows itself as one of the things being measured.
- Total project count will reflect this (likely 9+ depending on monorepo state).
- For `claude-credits` (this site), the live link IS the site itself — recursive but reads as confidence.

### 8. Taxonomy explainer: **Full on About page + small inline hint near hero**

Full version of "what does authored vs pipeline-generated vs tool-generated actually mean" lives on the About page. A small inline hint or tooltip near the hero makes the taxonomy legible without forcing a page-jump.

**Implications:**
- Peers don't need to leave the landing page to understand what they're looking at.
- About page has room for the full table, examples, and link to claude-credit README.
- The inline hint near the hero is a small UI element — could be a hover tooltip on the breakdown numbers, or a single line of small caps below the breakdown.

---

## Editorial spine

The four-beat shape of the site:

| Beat | What it does | Surface |
|---|---|---|
| 1. Hero | Brag the size | Landing page top |
| 2. Project grid | Show the work + per-project hooks | Landing page below hero |
| 3. Per-project detail | Tell the story | `/project/:name` |
| 4. Bottom CTA | Try the tool / see the code | End of landing page (and possibly persistent footer) |

---

## Bar revisions to the existing TODO

The current `TODO.md` was written before the WHAT interview and contains Claude-authored visual recommendations that fight the bar as now understood. To cut or trim:

| Item in current TODO | Action | Reason |
|---|---|---|
| Literal falling water droplets behind the hero number | **Cut** | Fights the metaphor. The bar is the SURFACE, not the water. Literal droplets read as 2007 Flash kitsch. |
| Iridescent oil-on-water hover accent | **Cut** | Gimmicky, undercuts the gloss. The bar is restraint + materiality. |
| DrawSVG donut reveal + Flip route transition stacked | **Pick ONE** | Two transitional flourishes competing is busy. Pick one and commit. |
| Reference set "Apple / Stripe / Linear / Awwwards" in Phase 8 | **Strip Apple, Linear, Awwwards. Keep Stripe.** | Briggsy doesn't use Apple's interfaces or know the other two. Stripe is the only valid analog (restraint + craft + materiality). Internal coherence to the metaphor IS the bar — don't outsource the reference. |

These revisions need to be applied to `TODO.md` directly when execution begins. Until then, treat the current TODO as "structurally sound but with visual recommendations to override."

---

## Open verification gaps (to resolve before / during execution)

1. **`claude-credit` tool publishability** — see CTA section above. Blocks bottom-CTA copy.
2. **Actual project list** — TODO claims "9 projects." Verify by reading the monorepo. Confirms grid count and content collection scope.
3. **Deploy state per project** — Known live: UMB (undercover-mob-boss.vercel.app), TDR-02 (top-down-racer-02.vercel.app). Unknown: TDR-04, BURNED, others. Affects which tiles get "Try it →" buttons.
4. **Visual asset inventory per project** — What exists vs needs capturing. BURNED has trailer-in-production content. UMB has the deployed site. Shelved games may have salvage. Desktop game (TDR-04) likely needs screenshots.
5. **One-liner + hook per project** — Editorial content from Briggsy / collaboration. Voice + positioning calls.

---

## Raw interview record (for traceability)

The conversation that produced these decisions, condensed:

1. **Q: Audience?** → AI-curious peers (over: public stranger / recruiters / friends+family).
2. **Q: Hero framing?** → Total volume (over: collab split / Claude-as-hero / per-project surprise). Note: Claude recommended collab split; Briggsy overrode with total volume.
3. **Q: Per-project content?** → One-liner + visual + live link (over: stats-only / one-liner only / full case studies).
4. **Q: Bottom CTA?** → Both tool pitch + GitHub (over: tool only / GitHub only / no CTA).
5. **Q: Highlights?** → Per-project hooks only (over: hooks + global superlatives / auto-derived / no hooks).
6. **Q: Shelved projects?** → Appear with marker (over: no marker / hide entirely / with lessons-learned).
7. **Claude's calls** (ready to override, otherwise locked): meta-projects in grid; taxonomy explainer on About + inline hint near hero.

The conversation also re-anchored the bar — confirming "water beads off it" is evocative not literal, killing Claude's earlier mistake of attributing the Apple/Stripe/Linear/Awwwards reference set to Briggsy (it was Claude-written in the TODO and bounced back at him incorrectly).

---

## What comes next

1. Technical exploration: read `tools/claude-credit/` to confirm data shape, verify the project list, check deploy status, audit visual assets.
2. Revise `TODO.md` to incorporate locked WHAT decisions + bar revisions.
3. Begin Phase 0 of the revised TODO (add `firstCommit`/`lastCommit`, `assetBytesByKind`, `topSubcategories` to claude-credit).
4. Phase 1 onward per the revised plan.

This doc is the steering reference for any visual / content decision that comes up during execution. If a future session is about to add a literal droplet or pick up the iridescent hover — this doc is the receipt that says no.
