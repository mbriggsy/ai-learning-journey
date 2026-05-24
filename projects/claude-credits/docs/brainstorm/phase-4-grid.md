# Phase 4 — Project grid

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is just the phase steps.

Below the hero, on the landing page. Grid of 11 project tiles.

**Each `ProjectTile.tsx`:**
- Glass-effect card: `backdrop-filter: blur(20px)` over a translucent dark layer
- Top-left: project name in display type
- Top-right: project age ribbon ("47d") using `git.projectAgeDays`
- **One-liner** (from `editorial.oneLiner`) under the title — single line, builder-coded voice
- **Hero visual** (from `editorial.heroImage` → `/assets/<projectName>/hero.png`) — 16:9 or square crop, sits below the one-liner
- **Hook stat** (from `editorial.hookStat`) — display-type number + small caps label, sits over or beside the visual
- Bottom: `TierBar` showing authored / pipeline-generated / tool-generated proportions
- **Live link button** ("Try it →") only if `editorial.liveUrl` present
- **Status marker**: `StatusMarker` component renders nothing for `active`, a "shelved" badge for `shelved`, a "meta" indicator for `meta`. Shelved tiles get reduced opacity (~0.75) so they read as intentionally muted, not broken.
- Hover (desktop, `@media (hover: hover) and (pointer: fine)` only): subtle scale to 1.02, glass slightly brightens. GSAP `gsap.to()` with the `weighted` ease. **No ripple. No cursor-tracking effects.**
- Touch (mobile): tile shows enough visual affordance in its settled state — no hover-stuck behavior. Tap target ≥ 44×44px.
- Click: routes to `/project/:name`

**Tile order:** by `grandTotals.allBytes` descending. Meta-projects (`claude-credit`, `claude-credits`) sort to the end regardless of size, with a quiet divider above them ("the tools").

**Layout:** CSS Grid, `repeat(auto-fit, minmax(320px, 1fr))`. Collapses to single column below ~360px. Tiles must look DELIBERATE in single-column, not stretched-desktop-fallback — narrower padding, full-width hero visual, hook stat sits below the visual instead of beside it.

---

← [Phase 3 — Hero](phase-3-hero.md) | [Index](README.md) | Next → [Phase 5 — Project detail](phase-5-detail.md)
