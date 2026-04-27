# ATC — TODO

## Next up (in order)

1. **Briggsy:** phone-read `03-execute.md`. Greenlight or redirect.
2. **Claude:** draft `04-review.md` (multi-agent code review + `/distill` mechanics + the review gate).
3. **Claude:** draft `05-evidence.md` (evidence package — the eyeball-lands-here phase, where Briggsy actually reviews).
4. **Claude:** draft `skills.md` (catalog: Microsoft, Databricks, CE, Anthropic, ours; selection notes for the RTM-extraction skill among the mcpmarket candidates).

## Open architectural decisions (no action needed yet)

- **PRD template vs contract.** Captured in `01-prd.md` Open Questions. Resolves after 1-2 real PRDs land and we see whether structure drift bites.
- **RTM column shape.** Agreed in principle: `req_id`, `type`, `description`, `legacy_anchor`, `rebuild_anchor`, `test_case`, `status`, `correctness_flag`, `divergence`. Schema not formally written down. Likely lands during `skills.md` drafting or RTM-extraction skill selection.
- **Filename `01-prd.md` vs `01-contract.md`.** Currently `01-prd.md`. Open if Briggsy wants to rename.

## Landmines for next session

- `ideation/prompt.txt` is gitignored. Don't try to commit it.
- Burned/ files in working tree (calibration.json, screenshots) are out of scope for ATC. Leave them alone — they're Briggsy's playtest WIP.
- Don't suggest manual seeding of `/brief` library (already removed once — see commit `0014ab09`). Empty is fine; the loop fills via `/distill`.
- Don't reintroduce "paint-by-numbers" / "actual code" / "commit points" into plans. ATC plans follow `ce:plan`'s "decisions, not code" bar — see Open Questions in 01-prd.md and the locked 02-plan.md framing.

## Session 1 reference (commit range)

ATC scaffolded across commits `e871c6e4..0014ab09` on `main`. Full doc series + README live on origin.
