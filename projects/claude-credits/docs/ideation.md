# claude-credits — locked product decisions

The WHAT decisions for the site. Visual / content / scope calls that sit upstream of any code work. If a future session is about to pick a direction that conflicts with what's here, this doc is the receipt that says no.

Companion: `brainstorm/README.md` (full implementation plan, phases linked one file each), `../TODO.md` (next actionable steps).

---

## The bar (immutable)

> **"It's so fucking slick, water beads off it."**

The metaphor. It stays forever. **Evocative, not literal.**

The bar is about a SURFACE — high-gloss, hydrophobic, light catching the curve of a bead because the finish underneath is perfect. The car hood is the bar. The droplet sitting on it is the proof. The bar is NOT about water itself.

For claude-credits specifically:

- **Type is the primary instrument.** Hero numbers don't need decoration; they need presence. Massive display weight, tabular numerals, kerning a print designer would obsess over. Tick-up with an ease that feels like the digits have mass.
- **Surface treatment, not particle effects.** Materials, light, finish. A faint specular sheen that drifts with cursor. A deep background with one slow gradient breath. The "slick" lives in materials and motion timing.
- **Negative space is the luxury signal.** Cheap sites cram. Expensive sites breathe.
- **Motion timing is where the bar gets met or missed.** Easing curves, settle times, the weight of a hover.

**Failure condition:** a stranger reacts "wow Claude built this" instead of "wow this is slick." The craft has to be invisible; the product stands on its own.

---

## Locked decisions

### 1. Audience: AI-curious peers

Other devs / Anthropic-adjacent folks. Knows what AI collab means; doesn't know the specific projects. Builder-to-builder voice, terse and sharp.

- The `claude-credit` tool is content, not just infrastructure. Peers want to understand what it measures.
- Authored / Claude-authored / pipeline-generated / tool-generated split is COMPELLING to this audience, not embarrassing.
- Light onboarding needed: peers don't need "what is a commit" but DO need "what does authored-vs-pipeline mean."

### 2. Hero: ONE massive number — combined Claude API tokens consumed

Tokens primary. The AI-native metric, biggest magnitude shock for the AI-peer audience.

- Lines authored, project count, files, commits drop to a supporting line below.
- Window footnote required ("across N days of session retention") — session JSONLs rotate after ~30 days; never claim lifetime totals without external billing data.
- Tabular numerals for stable digit width during tick-up.
- Don't decorate the number. Frame it cold. The magnitude IS the wow.

### 3. Per-project tile: one-liner + visual + live link

Each tile: hand-written one-liner, key visual (screenshot / trailer frame / hero asset / card art), live link button if deployed.

Detail page expands with bigger visual (or gallery), 2-3 sentence description, "Try it →" button if deployed.

### 4. Bottom CTA: dual — tool pitch + GitHub link

Primary: "Try `claude-credit` on your own repo" with install command. Secondary: "Source on GitHub" to the monorepo. Two clean CTAs, not a wall of links. The site IS a demo of the tool.

### 5. Per-project highlight: ONE hand-picked hook per tile

Each tile gets one editorial hook stat (e.g., "BURNED · 50 days · 167 tests"). Editorial pick — needs taste, can't be auto-derived.

No global superlatives. Specificity in the grid, magnitude in the hero.

### 6. Shelved projects appear with a "shelved" marker

Both Hide and Seek and Do Not Disturb appear in the grid with a clear visual marker (faded tile / "shelved" badge / muted color). Detail pages explain what was tried. Honest about iteration arc — failures are part of the story. Visual treatment must read as intentional, not broken.

### 7. Meta-projects appear in the grid

The `claude-credit` tool and `claude-credits` site itself appear in the grid alongside the products. Self-referential is a flex.

### 8. Taxonomy explainer: full on About + inline hint near hero

Full version on the About page; small inline hint near the hero so peers don't need to leave the landing page to understand what they're looking at.

### 9. Mobile: first-class

Mobile must SHINE, not just "doesn't break." Responsive desktop-led, but every surface holds at phone widths.

Anchor reference: `projects/undercover-mob-boss/public/how-to-play.html` — match its polish (dvh-safe viewport, breakpoint-scaled type, single-column collapse that reads deliberate).

### 10. Light AND dark mode: both first-class

Both palettes get their own design pass; both must pass the water-bead bar. `prefers-color-scheme` honored automatically. Manual toggle UI is v1.1; OS respect is the v1 first-class behavior.

Token architecture: semantic-over-physical so modes are CSS variable swaps, not parallel stylesheets.

The bar metaphor ports: midnight gloss (dark) and sunlit Polaroid (light) are both surfaces water beads off.

---

## Editorial spine

| Beat | What it does | Surface |
|---|---|---|
| 1. Hero | Brag the size | Landing page top |
| 2. Project grid | Show the work + per-project hooks | Landing page below hero |
| 3. Per-project detail | Tell the story | `/project/:name` |
| 4. Bottom CTA | Try the tool / see the code | End of landing page |

---

## Bar constraints (what NOT to do)

| Constraint | Why |
|---|---|
| NO literal falling water droplets | Bar is the SURFACE, not the water. Reads as 2007 Flash. |
| NO iridescent oil-on-water hover accents | Gimmicky, undercuts the gloss. Bar is restraint + materiality. |
| ONE visual flourish per surface | Two transitional flourishes competing is busy. |
| NO global superlatives ("fastest project / most active week") | Specificity belongs in per-project hooks, not the hero. |
| Reference set: Stripe ONLY | Apple/Linear/Awwwards stripped. Internal coherence to the metaphor IS the bar. |
