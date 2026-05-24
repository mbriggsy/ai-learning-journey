# claude-credits — TODO

**Status:** Deepening in progress. **Phases 0–4 deepened + doc-reviewed** (paint-by-numbers recipes). Phases 5–9 + the preflight plan remain. **No code until ALL phase plans are deepened and contradictions resolved** (house rule).

> **House rule — TODO is NOT a diary.** Actionable items only. No session history, no "what we did" logs, no narrative addenda. The git log has the history. If a line isn't an open thing Claude or Briggsy can act on, it doesn't belong here. Strip cruft when you find it.

## Where the depth lives

- **`docs/ideation.md`** — WHAT decisions (audience, hero framing, content shape, CTA, bar revisions, mobile + light/dark, **§11 authorship-is-silent**). The steering reference. Re-read before any visual or content call.
- **`docs/plans/`** — full plan, one file per phase. Start at `docs/plans/README.md` (the index) then open the phase file you're working. Frontmatter `deepened:` / `doc-reviewed:` tells you each phase's state.

Read both before touching code.

---

## Next: finish deepening the remaining phases

Same drill each: deepen to paint-by-numbers → `/ce:plan deepen` → 6-reviewer `/document-review` → stamp `deepened:` / `doc-reviewed:` frontmatter → commit.

- [ ] **Phase 5 — detail page** (`phase-5-detail.md`) — **NEXT.** Lighter now: the AUTHORED-BY authorship split is CUT (authorship is silent — ideation §11). Show the project's WORK — tokens, AssetDonut (DrawSVG), commit cadence. Reuses Phase 4's `LiveLinkButton` + `src/lib/format.ts`.
- [ ] **Phase 6 — about** (`phase-6-about.md`) — place the captured light-touch line: *"Claude wrote all of it. Briggsy directed — and answered a question or two."* (ideation §11). Full taxonomy explainer lives here.
- [ ] **Phase 7 — bottom CTA** (`phase-7-cta.md`) — depends on preflight −1.1 (is `claude-credit` publishable?) for the primary CTA copy.
- [ ] **Phase 8 — deploy** (`phase-8-deploy.md`) — must resolve the open "where does `pnpm refresh` run" question (a clean CI runner has NO session JSONLs → tokens would be null; leading option = refresh locally + commit, Action only deploys — see phase-2 Open Decision #2).
- [ ] **Phase 9 — visual polish (THE BAR)** (`phase-9-polish.md`) — where the bar gets met; budget half the time here.
- [ ] **Preflight −1** (`phase-preflight.md`) — deepen/verify the pre-execution checklist (tool publishability, `~/.claude-credit-projects.yaml` meta/archive extension, deploy-URL curl audit, visual-asset inventory, editorial worksheet).

## Then: execute (only after every plan above is deepened)

Preflight −1 verifications → Phase 0 (data contract code) → 1 → 2 → … → 9. Verify each in the browser (BOTH modes, mobile) before moving on — runtime truth > green tests.

---

## Landmines

- **Authorship is SILENT** (ideation §11, locked 2026-05-24). The site brags by showing the WORK, NOT a who-wrote-what scoreboard, and owes no one proof. NO authorship-split viz, NO "0 lines" headline. Per-tile **tier bar is CUT** (Phase 4); per-project **AUTHORED-BY split is CUT** (Phase 5). About gets only the warm light-touch line.
- **Phase 4 grid sort = `grandTotals.authoredLines` desc** (tie-break `projectName`). File-classification-derived → rotation-immune AND immune to the git-attribution inversion. Never re-derive it from `linesByAuthor`.
- **git-attribution inversion:** git credits `mbriggsy` as commit author, Claude as `Co-Authored-By`, so a naive `linesByAuthor` reading INVERTS the truth (credits the human). MOOT for v1 (no authorship surface ships), but real if any future surface ever shows authorship.
- Editorial one-liners + hook stats are voice/positioning calls — needs Briggsy in the loop, can't be auto-derived (preflight −1.5 worksheet).
- Bar constraints in `docs/ideation.md` are load-bearing: NO falling water droplets, NO iridescent hover. **The water-beads metaphor IS the bar — not any single reference site.** References calibrate specific choices, never dictate look. Awwwards / Webby / "site of the day" are explicitly disqualified.
- Mobile is first-class (anchor: UMB's `public/how-to-play.html`). Never default to "doesn't break."
- Light AND dark are both first-class. Briggsy's Windows is LIGHT — he lands on the light version by default. Both must pass the water-bead bar in Phase 9.
- **Hero = `tokensProcessed` dominant + `tokensFresh`/window honest sub-line + lines/counts supporting** (Phase 3 Option A, locked). Not the other way around.
- **Session JSONLs rotate after ~30 days.** Any token tally is a window-bounded FLOOR, never lifetime. UI MUST surface the window on every token surface.
- **Worktree slugs are separate.** Claude Code session JSONLs in git worktrees produce slugs like `<parent>--claude-worktrees-<name>-<hash>`. The token parser MUST merge worktree slugs into the parent, or stats undercount.
- `.env` files (gitignored at root) hold the Gemini key + future per-project secrets. Don't roll back.
