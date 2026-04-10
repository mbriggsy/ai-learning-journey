# Gauntlet Calibration — Post Art-Direction Baseline (2026-04-09)

These are the expected baseline scores after the art direction overhaul:
- Warm teal-charcoal palette (was noir purple-black)
- Imagen 4 illustrations on all 17 card types (was monochrome SVG sketches)
- Archer visual language — literal show vocabulary (bold line illustration, flat color fills, warm teal/orange/cream)

The evaluator should use these to anchor scoring. Be honest — new art doesn't fix layout problems.

## What Changed (Art Direction Overhaul)

1. **Card illustrations:** Every card now has a unique Imagen 4 WebP illustration. Action cards show thematic scenes (burning ID badge, helicopter extraction, venetian blinds). Operative cards show character portraits. No more monochrome SVG sketches.
2. **Color palette:** Warm teal-charcoal surfaces, burnt orange/amber/cream accents. Per-card-type accent colors. Light mode has warm parchment feel.
3. **Typography:** Clash Display (display) + General Sans (body) — already in place pre-overhaul.

## What Hasn't Changed (Potential Remaining Issues)

- Board layout structure (draw pile, player ring, discard fan)
- Phone hand layout and card sizing
- Animation system (Framer Motion, no GSAP drama overlays yet)
- Card name display (truncation may still occur on long names)
- Board void space — art on cards doesn't fix empty space between them
- No drama overlays (BURNED/EXTRACTED/ELIMINATED title cards)
- No micro-interactions beyond basic hover/select

## Calibration Rules

### Distinctiveness
- Cards now have unique illustrated art: floor rises from 4 to 6
- If art style is consistent and thematic (mid-century spy): can score 7-8
- To score 9+: needs drama overlays, custom transitions, the "what is that?" factor

### Game Feel  
- Art on cards adds personality but doesn't fix layout/tension issues
- If board still has 60%+ void: Game Feel cannot exceed 6
- If phone still shows 1.5 cards: Game Feel cannot exceed 6
- No drama overlays = tension arc still flat = ceiling of 7

### Craft
- WebP images should render crisply (256px, retina-friendly)
- If card names still truncate: Craft cannot exceed 7
- If illustrations look pixelated or blurry: Craft -2 points
- Check img loading behavior (lazy load, no layout shift)

### Clarity
- Art should reinforce card identity (burned = fire, extraction = rescue)
- If illustrations make cards HARDER to identify: Clarity -2
- Turn state, draw pile count, player info: check all still visible

## Expected Score Range (Before Evaluating)

| View | Expected Composite | Reasoning |
|------|-------------------|-----------|
| Board | 6.0-7.5 | Art lifts Distinctiveness significantly. Layout/void may still drag Game Feel. |
| Player | 6.5-8.0 | Art + warm palette on phone should feel premium. Hand layout still the bottleneck. |

**Important:** These are predictions. Score what you actually see, not what you expect. If the art made things worse somehow, score accordingly.
