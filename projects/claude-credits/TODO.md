# claude-credits — TODO

**Status:** planning complete. Ready to execute Phase −1.

## Where the depth lives

- **`docs/ideation.md`** — WHAT decisions (audience, hero framing, content shape, CTA, bar revisions, mobile + light/dark addenda). The steering reference. Re-read before any visual or content call.
- **`docs/plans/`** — full plan, one file per phase. Start at `docs/plans/README.md` (the index — bar, locked decisions, visual system, verification checklist) then open the phase file you're executing.

Read both before touching code.

---

## Next: Phase −1 — Pre-flight verifications

Resolve before Phase 0. Details for each step live in `docs/plans/phase-preflight.md`.

- [ ] **−1.1** Check `claude-credit` tool publishability (npm + GitHub) → drives the primary CTA copy
- [ ] **−1.2** Add meta-projects to `~/.claude-credit-projects.yaml` (tools/claude-credit + projects/claude-credits) → final grid = 11 tiles
- [ ] **−1.3** Curl-audit deploy URLs for the 6 unknown projects: burned, data-engineering, hooks, pacman, skills, tic-tac-toe (known live: UMB, TDR-02, TDR-04)
- [ ] **−1.4** Visual asset inventory — per project, list "exists vs needs capture"
- [ ] **−1.5** Draft `docs/editorial.md` worksheet — one-liner + hook stat + 2-3 sentence description per project, 11 rows. Briggsy reviews/edits the voice.

After Phase −1 → Phase 0 (data extensions in `claude-credit` tool: see `docs/plans/phase-0-data-gaps.md`).

---

## Landmines

- Editorial one-liners + hook stats are voice/positioning calls — needs Briggsy in the loop, can't be auto-derived.
- Bar constraints in `docs/ideation.md` are load-bearing: NO falling water droplets, NO iridescent hover. **The water-beads metaphor IS the bar — not any single reference site.** References are a curated bench (Stripe, Linear, Vercel, NYT digital features, Cassie Evans / Sarah Drasner GSAP demos, UMB's `how-to-play.html`) used to calibrate specific choices, never to dictate look. Awwwards / Webby / "site of the day" lists are explicitly disqualified — they pull toward the slop signals.
- Mobile is first-class (anchor: UMB's `public/how-to-play.html`). Never default to "doesn't break."
- Light AND dark are both first-class. Briggsy's Windows is set to LIGHT — he lands on the light version of his own site by default. Both modes must pass the water-bead bar in Phase 9.
- **Hero = tokens consumed (primary), lines authored (secondary).** Not the other way around. Tokens are the AI-native magnitude shock for the AI-peer audience.
- **Session JSONLs rotate after ~30 days.** Any token tally is a window-bounded FLOOR, never lifetime. UI MUST surface the window on every token surface. Hardcoded honesty requirement, not optional.
- **Worktree slugs are separate.** Claude Code session JSONLs run in git worktrees produce slugs like `<parent>--claude-worktrees-<name>-<hash>`. The token parser MUST merge worktree slugs into the parent project, or stats undercount.
- `.env` files (4 across monorepo) are gitignored at root. Don't roll back. Hold Gemini API key + future per-project secrets.
