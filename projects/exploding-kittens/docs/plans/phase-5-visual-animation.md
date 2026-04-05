---
title: "Phase 5: Visual Design & Animation"
type: feat
phase: 5
parent: roadmap.md
planned: 2026-04-05T11:41AM EDT
deepened:
executed:
reviewed:
---

# Phase 5: Visual Design & Animation

**THE Phase.** 40%+ of total effort. Water beads off it.

**Goal:** Dark + premium, full theatrical drama. Every interaction feels premium.

## Tasks

### Theme System
- `theme.ts` — near-black background (#0a0a0f), accent colors per card type (neon red = Kitten, electric blue = Defuse, toxic green = Nope, amber = Attack), glow effects, modern sans-serif typography
- CSS custom properties across board + player
- Card type color coding (edge glow, subtle gradient)

### Card Component
- `Card.tsx` — typographic dark premium: bold name, subtle icon, glowing edge per type. Dark face, light text. Premium poker card feel.
- Hover/selected: glow intensification
- Back design for draw pile
- `React.memo` (cards are pure)

### Framer Motion — Card Animations
- Hand entry: spring (`stiffness: 300, damping: 24`)
- Hand exit: fly toward discard
- `AnimatePresence mode="popLayout"` — gap closes smoothly
- **`LayoutGroup`** + `layoutId` — cross-container morphing
- Card flip: `rotateY` spring, `backfaceVisibility: hidden`
- `layout="position"` — auto-animate reorder
- Staggered deal: `variants` with `delayChildren: 0.3, staggerChildren: 0.1`

### Board — Dramatic Moments (useAnimate)
- **Exploding Kitten reveal:**
  1. Card lifts (anticipation, 0.5s)
  2. Slow flip (rotateY, 1.5s spring)
  3. Screen flashes red
  4. **Canvas particle explosion** (requestAnimationFrame, particle pool, NOT CSS)
  5. Screen shake (spring damped)
  6. Defuse: reverse particles, fade to blue, relief
  7. No Defuse: intensify, avatar shatters, elimination
- **Nope chain:** impact shake per Nope, chain counter, Yup/Nope alternating colors
- **Normal card play:** slide from player → center → discard
- **Turn transitions:** subtle pulse on active player

### Board Layout Polish
- Player ring: responsive 2-10, smooth elimination transitions
- Draw pile: stacked offset (depth), count overlay
- Discard: top card visible, slight fan beneath
- Typography hierarchy

### Phone UI Polish
- Smooth scrolling
- Color-coded action buttons
- **Accessibility:** unique icon badge per card type (WCAG 1.4.1 — never color alone). 4.5:1 text contrast, 3:1 non-text. Card names always visible. High-contrast mode option.

### Profiling (mandatory)
- Chrome DevTools **CPU 4x slowdown**
- Profile Framer Motion on simulated mid-range phone
- Verify canvas particles don't drop frames
- Fix jank before sign-off

## Tests

- Visual regression snapshots
- Animation timing matches game logic (single source of truth)
- Responsive layout: 2, 5, 10 players

## Done When

The Exploding Kitten reveal makes people go "holy shit." Cards feel satisfying. Dark theme is cohesive. Profiling passes on mid-range simulation.
