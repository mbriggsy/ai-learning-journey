# claude-credits — TODO

**Status:** All phases (−1 through 9) deepened + doc-reviewed. **Preflight −1 executed 2026-05-24** (YAML, deploy-verify, worksheet draft done). **Then Briggsy locked 3 scope changes** (no CTA / no meta tiles / no publish) — see the SCOPE CHANGE block below. Next actionable: Briggsy reviews `docs/editorial.md`, then Phase 0 (reconcile the plan to the 3 locks first). Phase plans 0/4/5/6/7 carry stale assumptions — reconcile each before coding it.

> **House rule — TODO is NOT a diary.** Actionable items only. No session history, no "what we did" logs, no narrative addenda. The git log has the history. If a line isn't an open thing Claude or Briggsy can act on, it doesn't belong here. Strip cruft when you find it.

## Where the depth lives

- **`docs/ideation.md`** — WHAT decisions (audience, hero framing, content shape, CTA, bar revisions, mobile + light/dark, **§11 authorship-is-silent**). The steering reference. Re-read before any visual or content call.
- **`docs/plans/`** — full plan, one file per phase. Start at `docs/plans/README.md` (the index) then open the phase file you're working. Frontmatter `deepened:` / `doc-reviewed:` tells you each phase's state.

Read both before touching code.

---

## Next: finish deepening the remaining phases

Same drill each: deepen to the **decisions-not-code** bar (native `ce:plan` — lock decisions/contracts/the bar, render fully-decided values concretely, defer execution-discovery) → `/ce:plan deepen` → 6-reviewer `/document-review` → stamp `deepened:` / `doc-reviewed:` frontmatter → commit.

- [x] **Phase 6 — about** (`phase-6-about.md`) — **deepened + doc-reviewed 2026-05-24.** Authorship line = closing sign-off (locked). Taxonomy table reframed: "counted in totals?" measurement column, NOT a "credited?" verdict (ideation §1 forbids the authored-vs-generated comparison).
- [x] **Phase 7 — bottom CTA** (`phase-7-cta.md`) — **deepened + doc-reviewed 2026-05-24.** Locked the CTA-state plumbing: a typed `src/lib/cta.ts` (`resolveCtaCopy` + `CURRENT_CTA_STATE` + `SOURCE_URL`) is the build-time channel — NOT `stats.json`, NOT a markdown parser. `cta.test.ts` reads `editorial.md`'s `## CTA state` and asserts `CURRENT_CTA_STATE` matches (drift/stale-state guard). About §2 + the CTA both call `resolveCtaCopy` (parity by construction). Reuses `LiveLinkButton` + ScrollTrigger. Cascades APPLIED to phase-6 (§2 imports the module), phase-preflight (−1.1 sets the constant), phase-4 (refresh race must run unconditionally).
- [x] **Phase 8 — deploy** (`phase-8-deploy.md`) — **deepened + doc-reviewed 2026-05-24.** Resolved the freshness model (Briggsy-locked): **refresh runs LOCALLY via a dedicated `refresh-credits` skill** (NOT a global squeaky edit, NOT CI — a clean runner has no JSONLs → null tokens); Vercel git-integration deploys, monorepo build-skip via `vercel.json` `ignoreCommand`; **LIGHT** verify workflow (bundle build only, no tests/no tool-build → no false alarms); `vercel.json` INHERITS Phase 1 §1.11's stricter CSP (don't loosen); first deploy via `vercel --prod`. **Decision 9: render an "as of <date>" from existing `scannedAt`** (staleness honesty). Cascade APPLIED: README line 71 + #11 + new 8d, Phase 2 line 99, Phase 6 §5 (+ its dep/risk tables), Phase 3 hero sub-line.
- [x] **Phase 9 — visual polish (THE BAR)** (`phase-9-polish.md`) — **deepened + doc-reviewed 2026-05-24.** Builds ON the Phase 1 motion foundation (4 named eases mapped to surfaces, NOT redefined). Locked: data-number honesty (no overshoot on ANY real value — generalized past the hero), per-surface reduced-motion behavior (gentler, not "instant everything"), transform/opacity perf contract, GSAP-in-React lifecycle (useGSAP scope/revertOnUpdate + ScrollTrigger.batch + 3-condition leak check), cold-watch rubric + **agent-panel stranger-proxy** (N=1 doctrine) + AI-slop checklist, and the 4 Phase-1→Phase-9 handoffs (stylelint token-boundary / radius roles / Satoshi subset / light-dark CSS DRY-up). **Cascade APPLIED:** `100dvh`→`100svh` across README + phase-1/2/3; sparkline monotone-cubic locked at **Phase-5 build** time (hand-rolled, no D3 dep); README motion-principles + Audience(§11) + verification item 15 reconciled.

(Preflight −1's PLAN is already deepened + doc-reviewed — it's not a deepening task. Its *execution* is the first step below.)

## SCOPE CHANGE — 2026-05-24 (Briggsy locked 3 decisions; reconcile before executing affected phases)

The site celebrates the WORK, not the tool. Three locks (recorded authoritatively in `docs/ideation.md` §4 + §7 and `docs/plans/README.md`):
1. **No bottom CTA** — the page ends on the work. No button, no install command, no GitHub link.
2. **No meta tiles** — `claude-credit` (tool) + `claude-credits` (site itself) cut from the grid. Grid = **9 real projects + 1 "the misses" coda = 10 surfaces** (was 12).
3. **Tool not published** to npm. `claude-credit` is the internal tape measure.
   - **+ Claude's call (Briggsy to veto):** meta is excluded from the **hero combined totals** too, not just tiles — counting the site's own build tokens is circular/inflationary. `~/.claude-credit-projects.yaml` now has only `projects:` + `archive:` (meta array dropped).

**Reconcile these phase plans to the 3 locks BEFORE coding each (their bodies still assume meta tiles / dual CTA):**
- [ ] **phase-0** — drop `meta:` from the 0.6b parser (only `archive:` remains); `kind: 'meta'` discriminator + `status: 'meta'` enum value become unused → remove or leave inert (decide at exec). Status enum likely collapses to `'active' | 'shelved'`.
- [ ] **phase-4-grid** — 10 surfaces not 12; delete the "the tools" divider + meta band; keep active band + "the misses".
- [ ] **phase-5-detail** — no detail pages for tool/site; "Try it →"/"Source →" per-project links stay.
- [ ] **phase-6-about** — remove the `resolveCtaCopy` import / CTA-state dependency (About §2). About may still explain the taxonomy (what the numbers mean) as light context.
- [ ] **phase-7-cta** — GUTTED. No CTA buttons, no `cta.ts`, no `cta.test.ts`, no CTA-state tracking. Rewrite the phase as "how the page ends on the work" (the close), or fold into Phase 3/9.

## Then: execute

**Preflight −1 — DONE except Briggsy's worksheet review** (`phase-preflight.md`):
- ✅ −1.1 publish gate → resolved as NO publish (tool stays internal); tool README de-implied (`pnpm add claude-credit` → "not published" note). No CTA-state to record.
- ✅ −1.2 YAML → `projects:` (9) + `archive:` (6); meta dropped per scope change. Validated via js-yaml. Backup at `~/.claude-credit-projects.yaml.bak.2026-05-24`.
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
- **NO bottom CTA, NO meta tiles, tool NOT published** (Briggsy locked 2026-05-24 — see SCOPE CHANGE block above + ideation §4/§7). The whole `cta.ts` / `resolveCtaCopy` / `CURRENT_CTA_STATE` / `cta.test.ts` plumbing the old plan described is DEAD — do not build it. Phase 7 is gutted. Per-project "Try it →" live links stay (they point at the work, not the tool).
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
