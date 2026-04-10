# BURNED Visual Layer Autopsy

> **⚠️ SUPERSEDED — HISTORICAL RECORD**
>
> This is the post-mortem that **triggered** BURNED's product specification authoring session on 2026-04-10. Its diagnosis and recommendations are **no longer canonical** — current doctrine lives in:
>
> - **`docs/specifications/PRODUCT-SPECIFICATION.md`** v1.0 — the product contract (especially §2 Quality Bar, §3.4 Form Factors, §6.4 Retheme Gaps, ADR-05 Visual Consistency)
> - **`docs/insights/009-product-specification-authoring.md`** — the session that authored the spec and absorbed this autopsy's lessons
>
> **Preserved for historical context only.** When this document disagrees with the current state of `docs/specifications/PRODUCT-SPECIFICATION.md`, **the spec wins.** Moved from `docs/` to `docs/post-mortems/` on 2026-04-10 to signal its historical status.

*Why it's fragile, why UMB isn't, and what instructions triggered UMB's success.*

---

## Executive Summary

BURNED's presentation layer is fragile because it was built **component-first without a design system**. Each CSS module makes independent sizing, spacing, and typography decisions with hardcoded pixel values. UMB's visual layer works because it was built **system-first** — every dimension flows from shared design tokens with `clamp()` scaling. The game logic is solid (167 tests, clean protocol). Only the CSS layer is broken.

But the deeper question is: **what did Briggsy do differently with UMB that made it work?** The answer isn't one magic instruction — it's a sequence that was followed for UMB and skipped for BURNED.

---

## Part 1: What Made UMB Work

### The North Star Statement

UMB's Phase 4 plan contained this explicit quality mandate:

> *"The SPEC goal is 'indistinguishable from a polished commercial party game' — this phase carries that burden."*

This wasn't aspirational. It was a **design requirement** embedded in the plan before a line of CSS was written. Every subsequent decision — the noir palette, glassmorphism tokens, responsive clamp() scales, animation timing hooks — traced back to this statement.

BURNED has creative direction ("Archer visual language — literal show vocabulary") but never had an equivalent **visual architecture requirement**. The theme was defined. The CSS strategy was not.

### The Design System Was in the Plan

UMB's Phase 4 plan literally specified:

- The noir color palette as CSS custom properties (every hex, every variant)
- Glassmorphism tokens (`--glass-bg`, `--glass-blur`, `--glass-border`)
- Responsive spacing scale (`--space-xs` through `--space-xl`, all `clamp()`)
- Responsive typography scale (`--text-xs` through `--text-3xl`, all `clamp()`)
- Animation architecture: which effects use CSS keyframes, which use GSAP, timing hooks for sequencing

**This was planned before coding.** The design system wasn't discovered during implementation — it was specified as deliverables.

BURNED went from sketch → code. The sketch defined WHAT the layout looks like. Nobody defined HOW it should scale, what tokens it should use, or what the responsive strategy should be.

### Vanilla DOM Forced Discipline

UMB used vanilla DOM + GSAP. No React. No CSS Modules. No component encapsulation. This meant:

- ONE `base.css` with global tokens — everything pulled from the same pool
- ONE `host-base.css` with responsive scales — every dimension coordinated
- No place to hide magic numbers behind component isolation

BURNED uses React + CSS Modules. Each component has "its own styles" which *sounds* clean but enables every file to make independent decisions. `Hand.module.css` uses `gap: 12px`. `StagingArea.module.css` uses `gap: 10px`. `SmartActionBox.module.css` uses `padding: 8px 16px`. Three components, three sets of magic numbers, zero coordination.

**CSS Modules without shared tokens = organized chaos.** The encapsulation creates an illusion of architecture.

### Art Direction Brief Before Implementation

UMB had an art direction brief that covered:

- Exact color palette with named roles (noir-gold, noir-blood, noir-cream)
- Extended color variants for depth (gold-light, gold-dark, gold-deep)
- Typography pairing (Cinzel for display, Cormorant Garamond for body)
- Glassmorphism as a visual language (not just a technique — a system with tokens)
- Art deco decorative elements (corner accents, pinstripe textures, film grain)
- AI asset generation with consistent aesthetic (Imagen 4, versioned prompts)

BURNED has character definitions and a thematic direction, but no CSS architecture brief. The visual identity lives in the card art (which is excellent) but the layout and UI chrome have no documented standard.

### The Sequence That Worked

Looking at UMB's evolution, the sequence was:

1. **State the quality bar explicitly** — "indistinguishable from commercial"
2. **Write the visual architecture into the plan** — tokens, scales, responsive strategy, animation hooks
3. **Build the foundation before any components** — `base.css` with complete token system
4. **Enforce the quality bar on every decision** — "water beads" standard applied to visuals

In BURNED, steps 2 and 3 were skipped. We went from "here's a sketch" → "code it." The sketch defined the goal. Nobody defined the architecture to achieve it.

---

## Part 2: What's Wrong with BURNED

### Two Card Sizing Systems in One Layout

The staging area sizes cards by **width**: `clamp(130px, 42vw, 200px)` with height from aspect-ratio. The hand sizes cards by **height**: stretch to fill container, width from aspect-ratio. Two philosophies. When the viewport changes, they respond differently — staging scales with viewport WIDTH, hand scales with viewport HEIGHT. On a portrait phone these happen to align. On anything else, they diverge.

### Wrong Scaling Axis

The player view is portrait. The constraining dimension is **HEIGHT** (staging + hand + title + status all compete for vertical space). But card sizing uses `42vw` — scaling with viewport **WIDTH**. The preferred value tracks the wrong axis.

### Rigid Flex Ratios

`flex: 42 1 0` and `flex: 58 1 0` mean "staging gets 42% of height." But 42% of what?

- On phone (667px): 42% ≈ 250px. Reasonable.
- On iPad landscape (820px): 42% ≈ 316px. Cards overflow.
- On iPad Pro (1024px): 42% ≈ 400px. Cards float in void.

The ratio encodes viewport assumptions. It should be content-aware.

### Hardcoded Values Everywhere

Spacing across BURNED's CSS modules:

| File | Values Used |
|------|-------------|
| PlayingView.module.css | 2px, 6px |
| StagingArea.module.css | 8px, 10px |
| Hand.module.css | 8px, 12px, 16px, 120px |
| SmartActionBox.module.css | 8px, 16px, 40px |
| TitleBar.module.css | 4px, 6px, 7px, 10px |
| StatusBar.module.css | 4px, 12px, 32px |
| MinimalCard.module.css | 6px, 10px, 20px, 24px, 28px |
| InterceptButton.module.css | 16px, 72px, 80px |

No rhythm. No scale. No coordination. Each file is an island.

### The Session Failure: Cascading Patches

The 2026-04-09 session produced 6 failed layout iterations:

1. `max-width: 480px` → "Not responsive"
2. Side-by-side at 768px → Dead voids, tiny cards
3. `max-width: 600px` + vertical → Cards overlap
4. Side-by-side at 1200px → 960px tall monster cards
5. `min(100svh, 900px)` + `max-width: 600px` → SmartActionBox too narrow
6. Remove SmartActionBox max-width → Breaks on Pixel

Each patch addressed one symptom while creating another. The foundation was never questioned. This violated the cardinal rule: *"If the design isn't stunning — redesign it. Don't bolt polish onto bad bones."*

---

## Part 3: What Briggsy Should Know

### What Works with Claude (Lessons from UMB)

1. **State the quality bar as a design requirement, not an aspiration.** "Indistinguishable from commercial" is actionable. "Make it look good" is not.

2. **Embed visual architecture in the plan.** UMB's Phase 4 plan specified token scales, color palettes, and animation hooks. Claude executed faithfully because the PLAN contained the architecture. Without it, Claude makes ad-hoc decisions per component.

3. **Demand a design system before components.** In UMB, `base.css` existed before any component CSS. Every component consumed tokens. In BURNED, components were built first and never got a shared foundation.

4. **Vanilla DOM constraints helped.** Without React's encapsulation, UMB couldn't hide fragmentation. BURNED's CSS Modules enabled isolated decisions that feel modular but aren't systematic. This isn't an argument against React — it's an argument for building the token system first regardless of framework.

5. **The "water beads" standard works when applied to architecture, not just polish.** In UMB, the quality bar was applied to the CSS system design. In BURNED, it was applied to individual component aesthetics (card art, animations) but not to the structural CSS.

### What Doesn't Work

1. **Sketch → Code without a CSS architecture step.** The sketch defines WHAT. Claude needs to be told (or asked to propose) HOW — the token system, scaling strategy, responsive approach.

2. **Patching layout problems with constraints.** Every `max-width`, `min()`, and breakpoint added today was a patch. Claude should have stopped after the first failure and said "the foundation is wrong."

3. **Assuming CSS Modules = design system.** Module-per-component organization hides the lack of shared tokens. It looks clean in the file tree but produces fragmented, brittle CSS.

---

## Part 4: What's NOT Broken

- **167/167 tests passing**, 0 lint errors, typecheck clean
- **Game engine**: pure dispatch, property-based tests, all card types
- **Protocol**: clean types, Zod validation, state projection with allowlists
- **React components**: hooks, state management, bottom sheets, card play flow
- **Framer Motion animations**: smooth, reduced-motion respected
- **New components** (TitleBar, StatusBar, SmartActionBox, InterceptButton): functionally correct
- **Card art**: excellent Imagen 4 assets with consistent mid-century modern style
- **Game rules**: fully audited, edge cases handled, canonical reference doc

The CSS layer is the only problem. The game works. The visuals need a foundation.

---

## Part 4: The Missing Artifact — Vibes vs Requirements

### How UMB's Spec Actually Got Created

Git history shows SPEC.md was dated March 15, 2026 — one day before the phase plans (March 16), six days before the commit (March 22). The spec was the **first artifact**, not a byproduct of the CE workflow. It was the input.

The spec was born from a conversation. Briggsy and Claude spitballed the product — what should it feel like, how should the phone/TV split work, what's the quality bar. Then Claude **wrote it down** as SPEC.md. The vibe became a document. The document became a contract.

That contract survived every context window reset. Every new session loaded the spec. Every phase plan was built against it. When Claude made a CSS decision, the spec said "indistinguishable from a polished commercial party game" — that's not a suggestion, it's a requirement with acceptance criteria attached.

### What Happened in BURNED (and H&S, and DND)

The same vibes happened. Briggsy said "water beads." Briggsy said "wow over simplicity." Briggsy said "Archer-tone spy comedy." These are exactly the kind of statements that became UMB's spec. But in BURNED, they went into:

- **Memory files** — `feedback-water-beads-polish.md`, `feedback-wow-over-simplicity.md`
- **CLAUDE.md rules** — "The goal is PERFECT"
- **Creative direction docs** — character names, theme, tone

These are **suggestions and context**. They might get loaded into a session, might not. They're scattered across 10+ files. Nothing says "this is the contract." Nothing has acceptance criteria. Nothing defines what "done" looks like visually.

**The vibe-to-spec gap:** When Briggsy says "so slick water beads off it" during a conversation, it should become a line in a spec with teeth — not a memory file that Claude may or may not reference. In UMB, Claude captured these vibes into SPEC.md during the ideation conversation. In BURNED, Claude captured them as feedback memories and moved on to building.

### The Proposed Fix: A `/product-spec` Skill

The pattern across four projects:

| Project | Spec? | Visual Result |
|---------|-------|---------------|
| UMB | Yes — SPEC.md with quality bar, screens, acceptance criteria | Masterpiece |
| Hide & Seek | No | "Visuals painful" — shelved |
| Do Not Disturb | No | "Greybox terrible" — shelved |
| BURNED | No (roadmap only) | Fragile, six failed layout iterations |

A `/product-spec` skill would:

1. **Run before the CE workflow** — before brainstorm, before plans, before code
2. **Force the product conversation** — what is this, how should it feel, what's the quality bar
3. **Capture vibes as requirements** — "water beads" becomes an acceptance criterion, not a memory
4. **Define screens and visual architecture** — not just game mechanics
5. **Produce SPEC.md** — a persistent contract that survives context resets
6. **Feed into CE workflow** — brainstorm and plans build on the spec, not on air

The spec captures the non-negotiables. The CE workflow breaks them into buildable phases. Without the spec, the CE workflow produces technically correct but vision-less output — exactly what happened with BURNED's roadmap.

### Why This Keeps Happening

The trap is **false familiarity**. After UMB succeeded, subsequent projects felt like "we know how to do this." The vibing conversation shortened. The spec step got skipped. The CE workflow ran on thin input. Three projects in a row.

The skill prevents this by making the spec step **mandatory and structured**. You can't skip it because it's the first slash command you run. And it asks the questions you'd skip when you "already know" — how does it scale, what's the token system, what does the phone view look like at every viewport, what does "done" mean.
