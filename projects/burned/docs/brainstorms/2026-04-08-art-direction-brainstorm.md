> **SUPERSEDED — see [`docs/specifications/PRODUCT-SPECIFICATION.md`](../specifications/PRODUCT-SPECIFICATION.md)**
>
> This document is historical context preserved for archaeological purposes. The authoritative contract for BURNED is the product specification (locked v1.0 on 2026-04-10). When any statement here contradicts the spec, the spec wins. Do not use this document as a source of truth for product decisions, quality bar, visual direction, or architecture.
>
> **Known drift:** uses generic "water beads" quality language instead of the Archer-specific binary acceptance test; references GSAP where the current stack is Framer Motion (ADR-04).

---

# BURNED — Art Direction Brief

**Date:** 2026-04-08
**Status:** Superseded 2026-04-10 — was Complete at time of writing

---

## What We're Defining

The complete visual identity for BURNED. Not a reskin — a ground-up art direction that makes this game unmistakable from across a room. The existing theme system (tokens, CSS modules, semantic colors) stays as infrastructure. Everything visual on top of it gets rebuilt.

**Quality bar:** So fucking slick that water beads off it. Too much polish is not enough polish. PWA wow factor — the kind of thing where someone sees it on a TV and asks "what is that?"

**Tools:** `/frontend-design` for distinctive interface work. GSAP-tier animation ambition. Imagen 4 for character art. No loyalty to existing visuals.

---

## Creative Foundation (Locked)

These were decided during the retheme (2026-04-08) and are NOT open for discussion:

- **Game:** BURNED — spy-comedy card game, Exploding Kittens Party Pack mechanics
- **Setting:** The Pendleton Agency — nobody knows who Pendleton was
- **Tone:** Archer-DNA — spy craft is real, people are brilliant disasters, dry humor throughout
- **Characters:** Dash Barlowe, Vera Khan, Otto Prang, Janet Broadside, Neal Proctor, Agent X
- **Mechanics:** Zero changes from Party Pack. Same cards, same counts, same engine.

---

## Key Decisions

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | **Visual style** | Mid-century modern — Saul Bass meets spy title sequences | Bold, saturated, geometric. NOT noir (that's UMB), NOT cartoon (that's original EK). Matches Archer's actual art direction. |
| 2 | **Card art** | Archer-style illustrated portraits | Stylized, bold linework, flat color fills, angular geometry. Characters in signature moments/poses. Each card feels like a personnel file illustration. Imagen 4 generation. |
| 3 | **Palette temperature** | Warm mid-tones | Deep teals, burnt oranges, rich creams, saturated accent pops. Cocktail lounge vibes. Not dark/noir, not light/pastel — WARM. |
| 4 | **Board vs phone** | Same palette, different intensity | Board is the showpiece — richer, more saturated, more dramatic. Phone is the tool — same colors, slightly muted for readability at arm's length. One identity, two contexts. |
| 5 | **Copy tone** | Full Archer voice | Every text element drips personality. Error messages are snarky. Game over roasts you. Card descriptions are mini jokes. "Your cover is blown. HR has been notified." |
| 6 | **Drama moments** | Title card interstitial overlays | Giant typographic stamps slam over the game — "BURNED." in massive Clash Display. Like UMB power overlays but with mid-century typography. Full-screen color shifts underneath. |
| 7 | **Animation ambition** | Cinematic / GSAP-tier | Not "smooth enough." CINEMATIC. Title cards slam. Cards flip with weight. Eliminations hit hard. Every transition is a moment. `/frontend-design` skill for execution. |
| 8 | **Typography** | Clash Display (display) + General Sans (body) | Already loaded as variable fonts. Clash Display is PERFECT for mid-century title cards. General Sans is clean for UI. |

---

## Visual Language

### Color Palette Direction

Warm mid-century modern — think vintage cocktail lounge meets classified briefing room.

**Background surfaces:**
- Deep teal-greens and warm charcoals (board)
- Slightly lighter, warmer variants (phone)
- Rich cream for card faces and light accents

**Card type accents (CVD-safe, high-contrast):**
- **Burned:** Alarm red — unmistakable danger
- **Extraction:** Cool blue — relief, safety
- **Action cards (Ambush, Ghost, etc.):** Warm amber/gold — active, aggressive
- **Operative cards:** Each character gets a signature color from the warm palette
- **Agent X (wild):** Something that pops against everything else

*Exact hex values determined during theme.ts overhaul — I own all color decisions (Briggsy is color blind). Every choice tested for CVD safety and contrast ratios.*

### Card Design

Cards should feel like **classified dossier illustrations** rendered in mid-century style:
- Bold geometric frames
- Flat color backgrounds per card type
- Archer-style character portraits (operatives + Agent X)
- Iconic action illustrations (non-character cards)
- Card name in Clash Display, description in General Sans
- Subtle paper/grain texture (CSS, not image — bundle budget)

### Board Layout

The TV screen is the **war room:**
- Draw pile as a central dramatic element (not a small stack in the corner)
- Player ring with presence indicators
- Discard fan showing recent plays
- Announcement feed with Archer-voice commentary
- Generous whitespace (mid-century modern breathes)

### Phone Layout

The phone is the **field agent's device:**
- Hand of cards as the primary focus
- Smooth card selection with tactile feedback (haptics)
- Bottom sheets for complex interactions (target select, future peek, extraction placement)
- Clear turn state — YOUR TURN is unmissable
- Muted palette for extended viewing comfort

### Drama System (Title Card Overlays)

Full-screen typographic moments that slam over the game:

- **"BURNED."** — Red overlay, massive Clash Display, when someone draws the card
- **"EXTRACTED."** — Blue wash of relief, when someone defuses
- **"ELIMINATED."** — Desaturation + rank number, when someone's out
- **"INTERCEPTED."** — Sharp yellow flash, when a Nope lands
- **"LAST ONE STANDING."** — Victory, gold everything

Each overlay: fast in (slam), hold for dramatic beat, fade to reveal consequence. Timeline-based animation, not spring physics.

### Micro-interactions

Water beads polish on EVERYTHING:
- Card hover/select: subtle lift + shadow shift
- Button press: satisfying scale bounce
- Turn transition: smooth color temperature shift
- Draw pile: slight breathing animation when it's your turn
- Nope countdown: tension-building pulse

---

## Resolved: Animation Library (Hybrid)

**Framer Motion** stays for all UI component animation (card flips, sheets, hover states). **GSAP** added for the drama overlay system only (title card slams, timed holds, cinematic sequences). Clean boundary: UI = FM, full-screen drama = GSAP. ~25KB gzipped cost offset by SVG→PNG migration savings.

## What This Brief Does NOT Cover

- Exact hex color values (determined during theme.ts implementation)
- Animation timing curves (determined during implementation with /frontend-design)
- Imagen 4 prompt engineering (determined during test image generation)
- Sound design (deferred — nail visuals first)
- Animation library decision — RESOLVED: hybrid (FM for UI, GSAP for drama overlays)

---

## Implementation Order (from TODO)

1. **Imagen 4 test image** — ONE character (Dash Barlowe) to align on illustration style
2. **Theme.ts palette overhaul** — New warm mid-century colors
3. **CardIllustration.tsx → external assets** — Replace inline SVGs with Imagen 4 art
4. **Recalibrate Gauntlet** — Score against this brief, not the old noir direction
5. **Run Gauntlet round 2** — Target 8.5+ on both views

---

## Success Criteria

- Someone who's never seen the game asks "what is that?" when they see the board on a TV
- The phone feels like a premium app, not a game controller
- Screenshots look like they belong in a design portfolio
- Every drama moment makes the room react
- You can tell it's BURNED from a blurry screenshot across a room
