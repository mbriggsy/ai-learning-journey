# Phase 9 — Visual polish iteration (THE BAR)

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is just the phase steps.

This is where the bar gets met or missed. After Phase 8 ships a working site, iterate. **This is where `/frontend-design` and `/emil-design-eng` skills fire.** Use them.

## Polish protocol
1. **Side-by-side compare against Stripe.** What does Stripe have that we don't? Type weight, negative space, settle timing, hover weight. Also compare against `projects/undercover-mob-boss/public/how-to-play.html` for the mobile bar.
2. **The cold-watch test — FOUR captures (desktop-dark, desktop-light, mobile-dark, mobile-light):** record all four, watch them cold a day later. If you'd say "wow Claude built this" on any one of them — diagnose. Both modes must shine on both surfaces. Light is not a fallback for dark; it gets its own polish pass.
3. **Common polish wins (in priority order):**
   - Counter ease — tweak until ticks feel weighty, not mechanical
   - Hero supporting line stagger — should feel inevitable
   - Hover micro-interactions — restrained, not bolted on; gated to `(hover: hover)` so touch never traps state
   - Type leading and tracking on big numbers — kerning matters at 20rem AND at 4rem (test both)
   - Asset donut DrawSVG timing — slow reveal, watch a designer's pace
   - Cadence sparkline curve — Catmull-Rom or monotone-spline; never straight segments
   - Route transition — simple cross-fade only; resist the urge to add motion
   - **Mobile-specific:** safe-area inset padding under iOS chrome; tap-highlight color set to transparent; no janky `100vh` chrome-jump on scroll (use `100dvh`)
4. **No new features until the bar is hit.** Add motion polish, not surface area.

## Skill triggers
- **`/frontend-design`** — when picking type scales, spacing tokens, hover behaviors, route-transition timing. Activates here, not earlier.
- **`/emil-design-eng`** — when deciding the invisible-detail set: which animations make it in, which get cut. The "would Emil keep this?" lens for each motion decision.

---

After Phase 9, run the [Verification checklist](README.md#verification).

← [Phase 8 — Deploy](phase-8-deploy.md) | [Index](README.md)
