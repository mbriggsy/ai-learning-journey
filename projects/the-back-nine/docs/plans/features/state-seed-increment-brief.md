---
title: "The state-carrying seed increment — build brief"
doc-type: build-spec
status: shipped
---

# The state-carrying seed increment — build brief

**Status: EXECUTABLE (pilot-decided 2026-07-16 under Briggsy's full-decision-rights GO; no council convened — no one-way doors, no framing forks: every deliverable is DEV-only or a test).** The parent law is [`state-tax-build-spec.md`](state-tax-build-spec.md) (ratified 2026-07-15) — where this brief is silent, the spec + house idioms govern. The filed requirement is `docs/caddie/cold-read-log.md:37`: the four unwalkable priced faces ride "a state-carrying seed increment (seed + walk targets + fit arms + outcome pins) before their first cold read."

## Mission

Make walkable, fit-pinned, and engine-outcome-pinned:

1. the PRICED verdict affirmation + narrowed-residual SET (the NC/PA/FL sentences — **both route mounts**)
2. the PRICED panel-row face (the answered `retirement-state` seat)
3. the CVD selected-picker face
4. the `stalenessStateTax` gate note

Plus the cards' noted coverage artifact: the ANSWERED-`'elsewhere'` face (the unpriced direction the 2026-07-15 bundle never showed the lenses).

## Settled forks (do not re-litigate; a deviation needs a dated supersession block in this file)

**F1 — five new seeds; ZERO edits to existing seeds.**
- `nc` / `pa` / `fl` / `elsewhere` = clones of `retiredOnTrack` (66/65 both retired — the state clause renders ONLY inside the `medicarePricedNote` block, `ConfidenceStatement.tsx:445-458`, so the household must be all-65+) with `retirementState: 'NC' | 'PA' | 'FL' | 'elsewhere'` respectively.
- `datenc` = clone of `stillWorkingAllMedicare` (the `date65` seed) + `retirementState: 'NC'` — the date route's affirmation mount (`FuckOffDate.tsx:406-419`) rides its OWN producer (`dateStatePriced`, `intakeMap.ts:798`); insight 080's lesson: the second producer gets its own live witness.
- Existing seeds stay **byte-identical**: `?seed=retired`'s UNANSWERED panel-row face is a walked, regression-live surface (Card 2, chair fix #1 — `assumptionStateUnsetNote`). `date65`'s purpose (the insight-080 no-false-unpriced witness) is pinned; never repurpose it.
- Registration: draft const + `DEV_SEEDS` entry (`devSeeds.ts` — the only dispatch table); the registry auto-iterates into the validator-acceptance test.

**F2 — the stale variant is `?vault=statestale` (base seed `nc`).**
- New `AGED_PLANTS` entry (`devSeeds.ts:1597-1604`). Extend `doctorStaleVault` (`:1164-1202`) **conditionally — only when the scenario carries a state-tax vintage stamp** — to write a divergent, plausible OLDER NC profile (the `taxVintageDetail` "pre-OBBBA dev fixture" idiom at `:1190`), coherent with the −2y / −760d anchor. `stale`/`datestale` outputs stay byte-identical (their bases carry no state) — pin that.
- The clock's firing predicate is `staleness.ts:470-476` (saved stamp present ∧ household state priced ∧ `stateProfileKey` diverges — **read the real stamp shape at `stateTax.ts:414` / `:405` before writing the doctor**). FL never fires (constitutional $0) — that's why the base is `nc`.
- Must hydrate with a **CLEAN badge** (the drifted-vault clean-badge law) AND fire `controls.stateTaxMoved` → the `stalenessStateTax` note (`copy.ts:1288`) at the gate.

> **F2 SUPERSESSION (2026-07-16, in-flight — S2's insight-033 live drive caught the F2 shape refusing to render):** F2's original shape routed `statestale` through the FULL `doctorStaleVault` (−2y `startCalendarYear` → 2024). The engine's own priced-state lower bound (`simulate.ts:640-643`, from the 2026-07-15 ultramode fold — its comment names "an aged dev plant" as the exact anticipated caller) correctly REFUSES a priced-NC household whose year-0 precedes NC's earliest rate row (2026), so the affirm recompute demotes to the R19 calm indeterminate and no verdict hero renders. The engine is right; the plant was organically impossible (no 2024 save could carry `retirementState` — the field shipped 2026-07-15). **The superseding shape: `statestale` rides its OWN light doctor** — `savedAt` −150d (a mid-Feb-2026 save, same calendar year as the UNTOUCHED `startCalendarYear` 2026 = coherent), tax/health/blend stamps left fresh (a 2026 save carries 2026 vintages), ONLY the household's own state profile diverged one rate-step back (the dev-fixture idiom). The state-stamp divergence logic MOVES out of `doctorStaleVault` into the light doctor (one home); `doctorStaleVault` carries a comment naming why it must never take a priced-state base. Yield: the gate fires the `stalenessStateTax` note in ISOLATION (a cleaner face-#4 cold read) and the final hero renders the NC clause on the engine-proven borderline verdict.

**F3 — purpose pins (`devSeeds.test.ts`; the house idiom; insight 081 — pin the producer's OUTPUT).**
- Every new seed: `pricedStateForRun(draft)` === its state (or `undefined` for `elsewhere`) via the REAL producer (`intakeMap.ts:808`) — never draft truthiness.
- `nc`: an engine INEQUALITY pin vs the state-absent twin (the `'order'` seed idiom, `devSeeds.test.ts:403`) — NC tax must move a real wire statistic. Record the engine-proven outcomeState; on drift, re-tune the account knob, never loosen the pin (the standing C3 law — record un-retuned drift first if any existing pin moves, expected NONE since no existing seed is touched).
- `pa` / `fl`: engine-derive the relation vs the absent twin and pin what the ENGINE says. Working memory says PA ≈ $0 on IRA draws and FL = $0 constitutional ⇒ likely byte-identity — **DERIVE, never assume**; if PA is not byte-identical, pin the true relation and say so in the test comment.
- `elsewhere`: byte-identity to the absent twin (reduce-to-spine keys on `PRICED_STATES` MEMBERSHIP, spec S2.5) + `pricedStateForRun === undefined`.
- `datenc`: async date-route pin (provisional tier, 120s-timeout idiom, `devSeeds.test.ts:197-245`) + the `dateStatePriced` output === `'NC'`.
- `statestale`: a pure staleness-reader test (injected epoch day) proving the doctored vault fires `stateTaxMoved`, + the clean-badge hydrate arm.

**F4 — fit arms (`e2e/vertical-fit.spec.ts`; house MUSTs: `gotoSeedFinal`, presence companions, one-visible-disclaimer, density tier, `WALK_FLOOR`).**
- `nc` joins the `SPINE_SEEDS` matrix (`{seed: 'nc', medicareNote: true}`) → the auto 3-viewport set; plus a residual-text pin (contains "North Carolina") at the REAL tier.
- `pa`, `fl`: bespoke arms at BOTH laptop tiers (1536×791 + 1280×800): `assertResolvedSpine` + frame fit + their residual text ("Pennsylvania … untaxed" — the LONGEST variant, the wrap-risk arm; "Florida has no state income tax") + snug-leading where the house asserts it.
- `elsewhere`: one REAL-tier arm — the `verdictMedicareResidual` monolith VERBATIM + no state clause + frame fit.
- `datenc`: one REAL-tier date-route arm — the fod trio presence + the affirmation text + the ORDER contract (graphs → in-frame disclaimer → doors LAST).
- `statestale`: a vault arm copying the `?vault=stale` block shape (`:439`): gate CTAs in-frame + the `stalenessStateTax` note pinned BY NAME alongside the other fired notes + affirm → the final-tier frame law.
- Mutation-proofing: ≥1 planted mutant per new assert family (state-clause swap → red; note suppression → red), red then reverted, recorded in the commit body. **Never `git checkout --` to revert a planted mutant on a dirty tree — Edit only.**

**F5 — caddie walk targets (`e2e/caddie-walk.spec.ts`).**
- `seed:nc|pa|fl|elsewhere|datenc` ride the existing `walkSeed` grammar (landing + door walk — the Assumptions-door capture IS the priced/answered panel-row face).
- `vault:statestale` rides `walkVaultReturn`; extend the doors condition (`:581`) to include it (the gate note is the target).
- The CVD selected-picker face: in `walkIntakeFork` (which already picks NC, `:500-504`), capture the PICKED picker as a crop AND under all three CVD arms (extend the CVD capture to this static region — builder's mechanical choice how). The read law: the selected segment must be distinguishable in EVERY arm without hue (the weight+fill+ring redundancy, `intake.css:367-372`).
- The walk never runs concurrently with the full suite.

**F6 — doc sync (the stats-single-source law).** TODO.md's dev-seed header block, any doc enumerating seeds/vault keys (grep `date65` + `datestale` across `docs/` and `.claude/`), `verify:doc-stats` counts, and the caddie SKILL's known-targets list if it enumerates targets.

## Ship gates

`pnpm typecheck` · `pnpm lint` · full `pnpm test` · fresh `pnpm build` THEN `pnpm verify:bundle` (insight 057 — never a stale dist; DCE proof: the dev passphrase grep in `dist/` stays 0, new seed keys absent from dist) · `pnpm verify:fit` (new arm count, green) · `pnpm verify:doc-stats` · `verify:aca` / `verify:state-tax` untouched-green. Commit + push; **CI confirmed green by EXPLICIT run id.** THEN `/ultramode-code-review`. THEN the Caddie pre-walk of the new faces (targets in F5). **Dialect findings STAPLE to O14** (filed 2026-07-15) — never fixed as riders; chair fixes only for real blockers per the batched-oracle law.

## Landmines (carry-forward, binding)

- **Insight 079:** the vault plant splices the disk's own bytes over fabricated fields — the new variant rides the EXISTING splice machinery; verify the `savedAt` splice holds for `statestale`.
- **Insight 073:** no new persisted fields in this increment (the stamp already ships); the doctored stamp must keep the savedAt-blind identity CLEAN.
- **Insight 033:** verify each gate's target actually renders BEFORE pinning it — drive each seed live once before writing its arm.
- **Insight 075:** any fit fix proves a MEASURED delta in the failing regime before shipping.
- **Insight 082:** if a new frame overflows, degrade down the ordered ladder (whitespace → leading → subordinate type register) — NEVER content cuts.
- **Harness:** ports 4190 (fit) / 4195 (caddie) dedicated, `--strictPort`; http + `127.0.0.1` never `localhost`; the `testMatch`/`testIgnore` mirrors are load-bearing; never import constants from a `*.spec.ts` (shared constants live in `reviewSurface.ts`); masked currency fields never `fill()`; fit specs are outside tsconfig `include` — a type error there won't surface in `pnpm typecheck`.
- `devSeeds.ts` is DEV-only, DCE'd from prod — confirm with the dist grep after the fresh build.
