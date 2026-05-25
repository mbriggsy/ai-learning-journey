# claude-credits — TODO

**Status:** All phases (−1 through 9) deepened + doc-reviewed. **Preflight −1 executed 2026-05-24.** Briggsy locked the scope (2026-05-24/25): **no CTA · clean tiles · no meta tiles but meta counted in totals · no publish** — propagated across ideation + README + every affected phase plan (0/2/3/4/5/6/7), drift-safe + `/ce:review`'d; preflight under a superseded banner; lesson in `docs/insights/001`. `coded:` frontmatter on all 12 phases. **The plan set is internally consistent.** Next actionable: Briggsy reviews `docs/editorial.md` (voice) + sends burned's live URL; then Phase 0 (code the data contract). See DECISIONS LOCKED block for the full record.

> **House rule — TODO is NOT a diary.** Actionable items only. No session history, no "what we did" logs, no narrative addenda. The git log has the history. If a line isn't an open thing Claude or Briggsy can act on, it doesn't belong here. Strip cruft when you find it.

## Where the depth lives

- **`docs/ideation.md`** — WHAT decisions (audience, hero framing, content shape, CTA, bar revisions, mobile + light/dark, **§11 authorship-is-silent**). The steering reference. Re-read before any visual or content call.
- **`docs/plans/`** — full plan, one file per phase. Start at `docs/plans/README.md` (the index) then open the phase file you're working. Frontmatter `deepened:` / `doc-reviewed:` tells you each phase's state.

Read both before touching code.

---

## Next: finish deepening the remaining phases

Same drill each: deepen to the **decisions-not-code** bar (native `ce:plan` — lock decisions/contracts/the bar, render fully-decided values concretely, defer execution-discovery) → `/ce:plan deepen` → 6-reviewer `/document-review` → stamp `deepened:` / `doc-reviewed:` frontmatter → commit.

- [x] **Phase 6 — about** (`phase-6-about.md`) — **deepened + doc-reviewed 2026-05-24.** Authorship line = closing sign-off (locked). Taxonomy table reframed: "counted in totals?" measurement column, NOT a "credited?" verdict (ideation §1 forbids the authored-vs-generated comparison).
- [x] **Phase 7 — the close** (`phase-7-cta.md`) — **REFRAMED 2026-05-25** (was "bottom CTA"). Briggsy locked no CTA (ideation §4) → the page ends on the work. ALL CTA-state plumbing CUT: no `cta.ts` / `resolveCtaCopy` / `CURRENT_CTA_STATE` / `cta.test.ts` / command block / STATE machinery. Phase now builds the summative closing beat (magnitude restatement, nothing clickable). `doc-reviewed:` cleared — reframed content needs a fresh review pass before coding. See SCOPE CHANGE block below.
- [x] **Phase 8 — deploy** (`phase-8-deploy.md`) — **deepened + doc-reviewed 2026-05-24.** Resolved the freshness model (Briggsy-locked): **refresh runs LOCALLY via a dedicated `refresh-credits` skill** (NOT a global squeaky edit, NOT CI — a clean runner has no JSONLs → null tokens); Vercel git-integration deploys, monorepo build-skip via `vercel.json` `ignoreCommand`; **LIGHT** verify workflow (bundle build only, no tests/no tool-build → no false alarms); `vercel.json` INHERITS Phase 1 §1.11's stricter CSP (don't loosen); first deploy via `vercel --prod`. **Decision 9: render an "as of <date>" from existing `scannedAt`** (staleness honesty). Cascade APPLIED: README line 71 + #11 + new 8d, Phase 2 line 99, Phase 6 §5 (+ its dep/risk tables), Phase 3 hero sub-line.
- [x] **Phase 9 — visual polish (THE BAR)** (`phase-9-polish.md`) — **deepened + doc-reviewed 2026-05-24.** Builds ON the Phase 1 motion foundation (4 named eases mapped to surfaces, NOT redefined). Locked: data-number honesty (no overshoot on ANY real value — generalized past the hero), per-surface reduced-motion behavior (gentler, not "instant everything"), transform/opacity perf contract, GSAP-in-React lifecycle (useGSAP scope/revertOnUpdate + ScrollTrigger.batch + 3-condition leak check), cold-watch rubric + **agent-panel stranger-proxy** (N=1 doctrine) + AI-slop checklist, and the 4 Phase-1→Phase-9 handoffs (stylelint token-boundary / radius roles / Satoshi subset / light-dark CSS DRY-up). **Cascade APPLIED:** `100dvh`→`100svh` across README + phase-1/2/3; sparkline monotone-cubic locked at **Phase-5 build** time (hand-rolled, no D3 dep); README motion-principles + Audience(§11) + verification item 15 reconciled.

(Preflight −1's PLAN is already deepened + doc-reviewed — it's not a deepening task. Its *execution* is the first step below.)

## DECISIONS LOCKED 2026-05-24/25 — the plan set is reconciled to these (current truth)

The site celebrates the WORK, not the tool. Authoritative in `docs/ideation.md` §3/§4/§7 + `docs/plans/README.md`:
1. **No bottom CTA** — the page ends on the work (no button / install / GitHub link). Phase 7 reframed "Bottom CTA" → "**The close**" (a summative magnitude beat, nothing clickable); all `cta.ts` / `resolveCtaCopy` / `CURRENT_CTA_STATE` / `cta.test.ts` plumbing CUT.
2. **Clean tiles** — NO buttons on a project tile; the whole tile is ONE click → its detail page. The live/source links (**"Try it →"** where hosted + **"Source →"** always) live on the **detail page** (Phase 5), not the tile.
3. **No meta TILES, but meta IS counted in totals** ("count everything", Briggsy 2026-05-25). The tool + this site feed the hero magnitude via `report.meta[]` (scanned, summed into `combined`, `editorial: null`, NO tile/detail/asset-copy). `~/.claude-credit-projects.yaml` = `projects`(9) + `meta`(2) + `archive`(6). Project COUNT = 9 active + 6 shelved (the 2 meta feed magnitude, not the "N projects" tally — confirm at Phase 3).
4. **Tool NOT published** to npm — the internal tape measure.

Grid = **9 project tiles + 1 "the misses" archive coda = 10 surfaces** (no meta tiles, no "the tools" divider).

**Reconciliation status:** ideation + README + all 11 phase plans are consistent with the above — drift-safe (bodies + code blocks grepped, not just headers), `/ce:review`'d, lesson distilled to `docs/insights/001`. `phase-preflight` retains its pre-pivot body under a superseded banner (executed history). `coded:` frontmatter on all 12 phases.

**Open follow-up:** phase-7's reframed "close" has `doc-reviewed:` cleared — wants a `/document-review` pass before it codes (simple surface, low risk). Exact close composition = a Phase 9 + Briggsy-taste call.

## Then: execute

**Preflight −1 — DONE except Briggsy's worksheet review** (`phase-preflight.md`):
- ✅ −1.1 publish gate → resolved as NO publish (tool stays internal); tool README de-implied (`pnpm add claude-credit` → "not published" note). No CTA-state to record.
- ✅ −1.2 YAML → `projects:`(9) + `meta:`(2) + `archive:`(6). meta scanned for **totals only** (no tiles — "count everything"). Validated via js-yaml. Backup at `~/.claude-credit-projects.yaml.bak.2026-05-24`.
- ✅ −1.3 deploy verify → 3 live (TDR-02, TDR-04, UMB, all 200 + fingerprinted), 6 null (in worksheet `## Deploys to fix`). Squatter methodology held — no false positives.
- ✅ −1.5 worksheet → `docs/editorial.md` drafted (9 rows + the misses, corrected UMB/TDR asset paths, no meta, no CTA block).
- [ ] **Briggsy reviews `docs/editorial.md`** — voice/oneLiners/hookStat picks/descriptions/archive one-liners + check the sign-off boxes. Also veto/confirm the meta-excluded-from-totals call.
- Cascade commit (preflight→phase-0/4/5) is MOOT — those amendments were already absorbed when each phase was individually deepened. Verified.

→ then Phase 0 (data contract code — reconcile first per above) → 1 → 2 → … → 9. Verify each in the browser (BOTH modes, mobile) before moving on — runtime truth > green tests.

---

## Landmines

- **Authorship is SILENT** (ideation §11, locked 2026-05-24). The site brags by showing the WORK, NOT a who-wrote-what scoreboard, and owes no one proof. NO authorship-split viz, NO "0 lines" headline. Per-tile **tier bar is CUT** (Phase 4); per-project **AUTHORED-BY split is CUT** (Phase 5). About gets only the warm light-touch line.
- **Phase 4 grid sort = `grandTotals.authoredLines` desc** (tie-break `projectName`). File-classification-derived → rotation-immune AND immune to the git-attribution inversion. Never re-derive it from `linesByAuthor`.
- **git-attribution inversion:** git credits `mbriggsy` as commit author, Claude as `Co-Authored-By`, so a naive `linesByAuthor` reading INVERTS the truth (credits the human). MOOT for v1 (no authorship surface ships), but real if any future surface ever shows authorship.
- **NO bottom CTA · clean tiles (no tile buttons) · meta counted-but-not-tiled · tool NOT published** (Briggsy, 2026-05-24/25 — see DECISIONS LOCKED block above + ideation §3/§4/§7). The whole `cta.ts` / `resolveCtaCopy` / `CURRENT_CTA_STATE` / `cta.test.ts` plumbing is DEAD — do not build it; Phase 7 is "the close." Per-project live/source links live on the **detail page**, NOT the tiles. Meta (tool + site) feeds `combined` totals but gets no tile.
- Editorial one-liners + hook stats are voice/positioning calls — needs Briggsy in the loop, can't be auto-derived (preflight −1.5 worksheet).
- **Editorial is a HARD dependency for the Phase 5 detail page** (not just tiles): every project with a detail page needs at least `oneLiner` + `description`, or a data-sparse project (esp. the smallest real ones — `tic-tac-toe`, `pacman`) renders a near-empty "detail." Source editorial in the `docs/editorial.md` worksheet before executing Phase 5. (Meta projects are cut, so the old `claude-credit`/`claude-credits` data-sparse caveat no longer applies.)
- **Phase 0 publish surface drops `largestSingleCommit.sha`** (Phase 5 cascade, privacy). Phase 0's `stripForPublish` denylist + `ALLOWED_KEY_PATHS` must exclude it; commit-cadence DATES are published by design. Re-run Phase 0 `pnpm test` after.
- Bar constraints in `docs/ideation.md` are load-bearing: NO falling water droplets, NO iridescent hover. **The water-beads metaphor IS the bar — not any single reference site.** References calibrate specific choices, never dictate look. Awwwards / Webby / "site of the day" are explicitly disqualified.
- Mobile is first-class (anchor: UMB's `public/how-to-play.html`). Never default to "doesn't break."
- Light AND dark are both first-class. Briggsy's Windows is LIGHT — he lands on the light version by default. Both must pass the water-bead bar in Phase 9.
- **Hero = `tokensProcessed` dominant + `tokensFresh`/window honest sub-line + lines/counts supporting** (Phase 3 Option A, locked). Not the other way around.
- **Session JSONLs rotate after ~30 days.** Any token tally is a window-bounded FLOOR, never lifetime. UI MUST surface the window on every token surface.
- **Worktree slugs are separate.** Claude Code session JSONLs in git worktrees produce slugs like `<parent>--claude-worktrees-<name>-<hash>`. The token parser MUST merge worktree slugs into the parent, or stats undercount.
- **Refresh runs LOCALLY, never in CI** (Phase 8 Decision 1, load-bearing). Token data lives only in `~/.claude/projects/*.jsonl` on the dev machine; a CI runner publishes null tokens → empty hero. The dedicated `refresh-credits` skill builds the tool → `pnpm refresh` → commit → push. Never "move refresh to CI for convenience."
- **Phase-8 execution carries two cross-phase notes** (recorded in phase-8 Cascade): (1) **render `scannedAt` as "as of <date>"** in the Phase 3 hero sub-line + Phase 6 About §5 — no new field, the data already exists; (2) **add XSS HARD-patterns** (`/<script/i`, `/javascript\s*:/i`) to Phase 2's publish-guard when Phase 2 executes (security finding — scans everywhere, zero false positives).
- **Verify workflow is LIGHT by choice** (Phase 8 Decision 6, Briggsy-locked): `vite build` only — NO sibling-tool build, NO tests, NO secret-grep. Upgrading to the full posture (tests + tool-build + `grep GEMINI dist/`) is a trivial future add, not v1.
- `.env` files (gitignored at root) hold the Gemini key + future per-project secrets. Don't roll back.
