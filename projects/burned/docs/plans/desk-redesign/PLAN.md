---
title: "Desk Redesign — Arena as Mother's Office"
type: feat
date: 2026-04-22
status: shipped
executed_on: 2026-04-22
note: Board ships as-is. Asset polish (ashtray/tumbler/dossier-stack) + BlotterContent→DeskSurface rename deferred indefinitely.
---

# Desk Redesign — Arena as Mother's Office

**Status:** Shipped 2026-04-22 — `Nameplate.tsx` + `DossierFeed.tsx` extracted; blotter metaphor retired in rendering; board reads as polished mahogany desk. **Board ships as-is.** Phase 5.5 asset work (ashtray, tumbler, closed dossier stack) + `BlotterContent` → `DeskSurface` rename deferred indefinitely — not currently tracked; revisit only if a future visual pass surfaces them.

**Premise:** Retire the cream-paper blotter concept. The central play surface becomes the polished mahogany desk itself. Cards sit on wood (dimensionally honest). COMMS becomes a manila dossier (a real object, not a region of paper). Status becomes a brass nameplate (physical, not a text strip). Closer to an Archer screenshot. Unified arena. No more 2D-paper-holding-3D-cards contradiction.

---

## Why

**The problem the blotter solved:** provide a cream field for dossier typography + delineate a play surface inside the teal felt.

**The problem the blotter created:**
1. **Dimensional contradiction.** Cards are 3D objects with weight and shadow. Paper is flat. Placing 3D cards on a 2D paper underlay is subtly wrong — users feel it even if they can't name it. The discard hero has to fight its own context to assert depth.
2. **Semantic mismatch on COMMS.** Radio traffic / live event stream wants to feel alive (teletype, terminal, scrolling folder). Paper implies *static, pre-written intel*. Ink entries on a piece of paper is a polite metaphor-violation.
3. **Redundant brand chrome.** The CASE BANNER (top) is a briefing document. The blotter (middle) is a briefing document. The folder tab (middle) is a briefing document. Three "this is classified paper" signals on one arena. One is enough.
4. **Decoration overload.** L-brackets + reticle + corner diamonds + folder tab + dog-ear + fiber grain + rule between piles + status strip border — eight decorative systems competing for the eye instead of cooperating.

**What the desk concept solves:**
1. Cards on wood is dimensionally honest (500 years of card-game precedent)
2. COMMS as a manila dossier folder is semantically honest (a real thing that accumulates entries)
3. The existing mahogany wood frame promotes from *chrome around the play surface* to *the play surface itself* — the arena becomes more unified, not more decorated
4. Closer to Archer. Mother's desk. Malory's office. Real reference.

---

## Visual reference (load before starting)

**Archer show references to study:**
- **S01E01 "Mole Hunt"** — Malory's office introduced. Mahogany desk, ashtray, phone, dossiers. The desk *IS* the scene.
- **S03 / S04 opening sequences** — agency briefing room. Characters gathered around a wooden table with intel spread across it. Photos, dossiers, glasses, cigars.
- **S02E02 "A Going Concern"** — Mother at her desk, file folders open, manila dossiers stacked. Note: folders have colored tabs (red, manila), interior is cream paper with typed entries + photos paperclipped in.

**Desk vocabulary inventory (what lives on the desk):**
- Ashtray (smoked-out cigar stub)
- Old rotary phone or intercom
- Manila dossier folders (some closed, some fanned open)
- Glass tumbler (whisky, half-finished)
- Penholder
- Blotter (the REAL kind — corner blotters, not a full-desk sheet)
- Photographs (paperclipped to dossiers)
- Rubber stamps + ink pad
- A lamp casting warm pool of light

**We don't add all of these.** But this is the vocabulary well. The arena should feel like it could have any of them; the ones we render are editorial choices.

---

## What retires

Code/assets that go away under the desk concept:

| File | What retires | Why |
|------|--------------|-----|
| `src/client/board/GameTable.module.css` | `.blotter`, `.blotterTab`, `.feltBranding` reticle + corner-diamond SVGs, `.blotter::before` L-brackets, `.blotter::after` dog-ear, `@keyframes blotterFiberDrift` | All propping up the paper concept |
| `src/client/board/BlotterContent.module.css` | Entire grid restructure — the 40/60 piles-comms split dissolves; COMMS moves to a sidebar object | Paper-interior grid becomes wood-surface + object-sidebar |
| `src/client/board/BlotterContent.tsx` | Component renames to `DeskSurface.tsx` or similar; COMMS extracts into `DossierFeed.tsx`; status strip extracts into `Nameplate.tsx` | Reflect the new conceptual model |
| `src/client/shared/tokens/semantic.board.css` | `--color-paper-face`, `--color-paper-shadow`, `--color-paper-rule`, `--color-stamp-active` tokens either retire or reassign | Paper tokens were blotter-specific. Wood tokens become the primary play-surface palette. |
| Positional tokens: `--pos-blotter-top`, `--pos-blotter-left`, `--size-blotter-width`, `--size-blotter-height` | Retire; replace with desk positioning | Blotter is gone |

What **stays**:
- Mahogany wood frame (gets promoted)
- Venetian blind rake ambient (sun drift keeps its role as window-light atmosphere)
- CASE BANNER at top (stays on paper — correct metaphor for a briefing document)
- PlayerStrip at bottom (operatives roster is independent of the play-surface concept)
- DrawPile + DiscardFan components (the card objects themselves — they just move from "on paper" to "on wood")
- DramaOverlay (independent)
- All card art + player portraits

---

## Phase breakdown

Five phases. Each is a commit point. Stop after every phase, review, then proceed.

### Phase 1 — Strip the blotter, promote the desk

**Goal:** remove every blotter element. The central surface is raw mahogany wood. Cards temporarily float on wood without any styling of their context. The arena should feel under-decorated and a little lonely — that's correct at this stage.

**Concrete work:**
1. Delete `.blotter`, `.blotterTab`, `.feltBranding` (reticle + diamonds), `.blotter::before`, `.blotter::after`, `@keyframes blotterFiberDrift` from `GameTable.module.css`
2. Delete corresponding positional tokens (`--pos-blotter-*`, `--size-blotter-*`)
3. In `BlotterContent.tsx` (temporarily keep the filename), strip the paper chrome. Interior grid becomes `display: grid` on the wood surface directly. No paper background. No borders.
4. The piles + COMMS + status will look "naked" on wood. That's expected for this phase.
5. Run typecheck + tests.
6. **Commit:** `refactor(arena): retire blotter paper concept, promote mahogany desk as play surface`

**What should look right:** the wood frame now IS the play surface. Venetian blinds still rake. CASE BANNER at top still reads. Cards sit on wood.

**What should look wrong (fix in Phase 2):** the COMMS feed reads as free-floating text on wood. The piles look disconnected. The status strip is invisible. This is fine — Phase 2 onward addresses each.

---

### Phase 2 — Cards on wood: depth, shadow, polish

**Goal:** cards earn their place on wood with real tabletop shadows + subtle wood reflection.

**Concrete work:**
1. **Wood surface polish.** The mahogany frame currently provides the border. Extend the wood grain INTO the play area via a central wood-gradient fill behind the cards. Use token `--color-mahogany-*` (if not already defined, introduce it — see Phase 0 below).
2. **Cast shadow under each pile.** `DrawPile.module.css` + `DiscardFan.module.css` get stronger drop-shadows + a subtle wood-grain reflection on the card's underside (simulated with a bottom-edge gradient blend).
3. **Tabletop "bed" markers.** Not outlines, not L-brackets. Maybe: a faint burn mark or ring mark where the draw pile usually sits. A grease-pencil rectangle. A dossier-corner flap peeking out from under the discard. Optional — pick ONE subtle anchor per pile, not both. Test: "does this help the card sit, or does it compete?"
4. **No paper anywhere in this zone.** Resist the urge to add a "tray" or "mat" — that's just the blotter in disguise.
5. **Commit:** `feat(arena): desk surface — cards on mahogany with tabletop shadows`

**Phase 0 prerequisite (do before phase 2):** audit existing mahogany tokens. If the current wood frame uses hardcoded gradients rather than named tokens, introduce `--color-wood-surface-light`, `--color-wood-surface-mid`, `--color-wood-surface-dark`, `--color-wood-grain-rule` so Phases 2-5 can consume them semantically.

---

### Phase 3 — COMMS as manila dossier

**Goal:** retire the COMMS-as-paper-region pattern. Replace with a manila dossier folder sitting on the desk — pages "added" as events land.

**Concrete work:**
1. **New component:** `DossierFeed.tsx` + `DossierFeed.module.css`. Import from `BlotterContent.tsx` (which by now has probably been renamed `DeskSurface.tsx`).
2. **Visual model:**
   - Outer **manila folder** with a colored tab (top-right — opposite corner from the CASE BANNER tab so they balance, not compete)
   - Folder has a slight angle (3-5° tilt) to suggest it was tossed on the desk
   - Inside: a stack of "report pages" — each recent event is a paper strip with typed or typewriter text
   - Newest event strip sits ON TOP of the stack (visually obvious)
   - Older strips peek out from underneath with slight offset
   - Max ~4 visible; older slip out the back of the folder (scrolled / faded)
3. **Tab color:** cordovan-8 (wine). The CASE BANNER tab at the top of the paper stays whatever it is; this dossier tab is its own thing.
4. **Typography inside dossier strips:** typewriter mono, same as current announcements, but now on warm-cream paper slips with visible edges / shadows (not flat chips on a paper region).
5. **New-event motion:** instead of CRT flicker, new strip *slides in from under the folder cover* with a subtle stamp impact (clip-path inset reveal from left + scale-up bounce). Closer to "new intel being slid across the desk."
6. **Idle state:** folder cover shows a classified stamp + Case ID. When no events have landed, only the cover is visible. First event triggers the cover-opening animation.
7. **Commit:** `feat(arena): COMMS as manila dossier folder — intel strips stacked on desk`

**Risk:** this is the most ambitious phase. Manila folders with papers layered inside are fiddly to render. If it doesn't land in 2 attempts, fall back to Option 2 below.

**Option 2 (fallback):** teletype tape — perforated paper strip coming out of a small machine housing. Simpler DOM, same "alive feed" reading.

---

### Phase 4 — Status strip → brass nameplate

**Goal:** the live "whose turn is it" indicator becomes a physical object — a brass desk nameplate engraved with the active player's codename.

**Concrete work:**
1. **New component:** `Nameplate.tsx` + `Nameplate.module.css`.
2. **Visual model:**
   - Brass/gold rectangular plate with beveled edges (CSS gradients can simulate this cleanly)
   - Engraved black text — active player's agent name (SABLE ASHWORTH, VERA KHAN, etc.)
   - Small engraved subtext: "// ON DECK" or "// ACTIVE"
   - Sits on a small dark-wood stand (thin wooden base under the brass)
   - Position: along the bottom edge of the desk surface, centered or offset-left under the dossier
3. **State transitions:**
   - On turn change: the brass plate "swaps" via a coin-flip animation (3D rotateY + crossfade) to the new codename
   - Alternatively, plate slides out and new one slides in (less showy, more grounded)
   - Pick the coin-flip for Phase 4; the showy move is on-brand for showcase
4. **Typography:** engraved text uses the mono font with very heavy weight (800-900), letter-spacing 0.12em, in a dark-brown "etched" color with a faint highlight along the top of each letter (gradient, simulates the brass reflection)
5. **Commit:** `feat(arena): brass nameplate replaces status strip — turn handoff on 3D coin flip`

---

### Phase 5 — Polish pass + Archer grounding

**Goal:** the arena now reads like a frame from Archer. Add ~2-3 scene-setting details that push it from "good desk" to "Mother's office."

**Concrete work — pick 2-3 from this list, not all:**
- **Ashtray + stubbed cigar** in an upper corner of the desk surface. Tiny, decorative, atmospheric. Cigar smoke could ambient-drift (1-1.5s GPU-composited opacity).
- **Glass tumbler with whisky** in another corner. Catches the venetian-blind highlight.
- **Closed dossier stack** under/beside the active dossier. "Other cases" vocabulary.
- **Photograph paperclipped to the corner** of the dossier — it's the active player's portrait photo (reuses existing roster art). Changes on turn handoff.
- **Rubber stamp sitting on the desk** — visible, vague "CLASSIFIED" text. When a move happens, the stamp briefly lifts + slams down near the discard with a stamp-thud motion (optional; cinematic).
- **Lamp cast** — warm pool of light from above, concentrated on the play zone. Already kind of there in the radial-gradient spotlight; could be tuned to cast off the upper-right like a desk lamp.

**Rules for Phase 5:**
- Every decoration must earn its place. If you can't answer "what does this tell the player?", it doesn't belong.
- No decoration may compete with cards-on-desk for the focal point. Corner elements only.
- Ambient motion on ≤ 2 items (e.g., cigar smoke + lamp flicker). More than that and we're back to the blotter problem.

**Commit:** `feat(arena): scene-setting details — Mother's office grounding`

---

## Measurements + reference values

**Positioning (phone doesn't apply — these are board-view values at 1920×1080 baseline):**

| Element | Position | Size |
|---------|----------|------|
| CASE BANNER (paper) | top: 4% | width: 65vw, height: auto |
| Desk surface (wood fill) | inset: 15% top, 18% sides, 24% bottom | (derived) |
| DossierFeed | right: 18%, top: 25% | width: 28%, height: 40% |
| Pile stack (draw + discard, inline) | center-left of desk | discard ~22% wide, draw ~10% wide |
| Nameplate | center-bottom of desk | width: 22%, height: 6% |
| PlayerStrip | bottom: 2% | full width |

**Tokens to introduce (Phase 0):**

```css
--color-wood-surface-light:  #5a3520;   /* highlight, where the lamp hits */
--color-wood-surface-mid:    #3d2414;   /* primary surface tone */
--color-wood-surface-dark:   #1f120a;   /* shadow edges, ink-burn marks */
--color-wood-grain-rule:     color-mix(in oklab, var(--color-wood-surface-light) 18%, transparent);

--color-manila-face:         #c9b085;   /* dossier folder cream-tan */
--color-manila-shadow:       #9d8660;
--color-manila-tab:          var(--color-cordovan-8);  /* wine tab, NOT burned-fire */

--color-brass-highlight:     #e8c072;
--color-brass-mid:           #b28744;
--color-brass-shadow:        #6e5328;
--color-brass-engrave:       #2a1e0c;
```

---

## Success criteria (what "done" looks like)

Apply the Product Spec §2 test: **"Could this look like a frame from an Archer episode?"**

Specifically:
1. A still frame of the arena (no motion) should read as *a desk in an office* — not *a UI with paper decorations*.
2. Cards visibly sit ON the desk with proper shadow. No cognitive dissonance between card dimensionality and surface dimensionality.
3. COMMS reads as *intel being added to a folder*, not *ink appearing on a page*.
4. Status indicator is a physical object (nameplate), not a text strip.
5. At-most 3 scene-setting decorations on the desk. Not 8.
6. Venetian blinds, CASE BANNER (paper), PlayerStrip unchanged in identity — they were never the problem.

**Anti-success:** if the new arena looks busier than the old one, we failed. The desk concept's core promise is *fewer decorations, each doing more work*.

---

## What's NOT in scope

- Phone view (no desk; phone is its own deal)
- PlayerStrip redesign (separate concern)
- Card art (separate concern)
- CASE BANNER paper (correct as-is)
- Venetian blinds (correct as-is)
- DramaOverlay (independent system)

---

## Execution order when the session starts

1. Read this plan
2. Read the three visual references (browser tab or reference image pull)
3. Phase 0 tokens first — introduce wood/manila/brass palette
4. Phase 1 retire blotter
5. Commit
6. Phase 2 cards-on-wood
7. Commit
8. Phase 3 dossier (biggest risk; take time)
9. Commit
10. Phase 4 nameplate
11. Commit
12. Phase 5 scene setting (pick 2-3 items, resist more)
13. Commit
14. Squeaky clean + PR

**Estimated session count:** 2-4 sessions depending on ambition. Phase 3 dossier could be a session by itself.

**Rollback plan:** every phase is a commit. If Phase 3 dossier doesn't land after 2 attempts, revert that commit, ship the Option-2 teletype fallback, continue.
