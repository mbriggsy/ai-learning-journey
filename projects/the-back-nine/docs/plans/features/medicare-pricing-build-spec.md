---
title: "The Post-65 Medicare Pricing Engine Unit — Build Spec"
doc-type: build-spec
status: shipped
---

# The Post-65 Medicare Pricing Engine Unit — Build Spec

> **Provenance:** council-ratified 2026-07-10, **9/10 high, NO veto, action=execute** (run `wf_4c8cd836-b22`, 9 elders + red team, 23 agents; `docs/council-log.md` top row) over a 6-reader recon sweep (`wf_8bacb39a-59a`). This is the executable shape; where it conflicts with older prose (TODO.md:50's filing, the roadmap note), **this spec supersedes**, each supersession dated. The closest sibling precedent is the senior-bonus sunset unit (council-log 2026-07-09): ONE commit, no riders, DND-012 hand-derived fixtures on the runtime path, dev-seed drift recorded before any re-tune.
>
> **Identity:** a wf-tracked Act-3 follow-up engine unit, **not a U-number** (U14–U17 are taken by Act 4). The council-REQUIRED U11 filing this closes: "price base Part B (+ full IRMAA via the seed regime) for households the ACA gate never covers."

## Why (one paragraph)

An all-65+ household is priced **$0 Medicare every year** — base Part B ($202.90/mo/person) and the IRMAA surcharge both — because `taxOverlay.ts:1422` gates all Medicare pricing on `acaTable !== undefined` (= `healthcareEnabled`, set only via intake's `healthcareOn`, which requires the ACA quote pair AND a pre-65 member, `intakeMap.ts:498,539-548,621-628`). Gross SS enters cash at full value (`simulate.ts:303,376`), so net cash is overstated by the full premium: the cardinal calm-but-wrong-OPTIMISTIC sin, live on the core already-retired demographic — the exact subject of the U11 honesty-hawk veto. The machinery to fix it **already exists and is tested** (`medicareAnnualCost` healthOverlay.ts:477-487; the 2-yr lagged feed-forward taxOverlay.ts:1422-1465; CMS-pinned constants health.ts:145-177; the seed the household already answers at intake, spread onto params unconditionally at intakeMap.ts:549). The unit opens one gate, honestly, both routes.

## The red team's verified mechanism fact (build against it, chair- and pilot-verified at source)

`dateSearch.ts:222` forces `healthcareEnabled: true` on **every date candidate** (docstring :144-145). So a **still-working all-65+ household already prices Medicare on the date route today**, while the age-keyed `medicareUnpriced` predicate (`healthSheetChrome.ts:302-308`) shows them "Medicare's own costs … aren't priced into these numbers … would pull the picture down some, never up" (`copy.ts:781-782`) — a **pre-existing live false statement** (direction: pessimistic double-discount, per the hawk). The spine $0 gap is the optimistic sin. The unit fixes both; each named with its true direction in any narration.

## HARD CONSTRAINTS (hawk-armed conditional vetoes — violating any one is a build stop)

1. **The disclosure predicate must key off the run's ACTUAL route-aware pricing decision — NEVER off ages** (and not off any age proxy like "all-65+ AND seedComplete"). Mutant-proven: mutate ages while holding the pricing decision constant → the note must not reappear.
2. **The affirmative "Medicare is priced in" line ships TOGETHER with the narrowed residual disclosure** — the affirmative alone (implying ALL Medicare is priced) is a new optimistic lie.
3. **The real-flat Part B disclosure ships** (Tier-1 mandatory — the one residual leaning optimistic).
4. **The copy reconciliation (spendHelp) is NOT deferred** — it rides this commit.

## Phase A — the gate (Fork 1a: widen the intake gate)

- **One seam:** `intakeMap.ts:539-548` grows a `medicareOnly` branch — for a household with **all ages known and no member < 65**, emit `healthcareEnabled: true` WITHOUT `enrolledPremium`/`slcsp` (the ACA quote pair an all-65+ household never enters). ACA pricing self-skips on the existing `pre65 > 0` price gate (`taxOverlay.ts:1528-1534`). REJECTED by the council: a decoupled `medicareEnabled` toggle (forks four `acaTable`-gated sites — pricing :1422, history recording :1599-1612, readout emission, seed validation — into a permanent drift surface). Also REJECTED (withdrawn in rebuttal): gating enable on `seedComplete` — the seed is already a required intake fact (missing-fact gate at `intakeMap.ts:168-173`; buildParams returns null on absence), so a second gate prices nothing and only adds drift.
- **Verify the ACA validation arms tolerate the Medicare-only shape** (healthcareEnabled true, ACA streams absent): the slcsp coverage loop skips every year with no pre-65 member (`simulate.ts:757` guard, :800-812 arms), the date-route ACA coverage rule's all-65+ exception (`simulate.ts:895-910`), and every `.every()` stream guard (presence-gated). Planted-fail proof for each arm touched.
- **Insight-076 discharge (structural):** the irmaaMagiSeed coverage validation (`simulate.ts:805-836`) already nests in `if (o.healthcareEnabled)` — widening the gate makes it fire for the all-65+ run. **Pin it:** an absent-seed all-65+ params object → the R19 **calm indeterminate** (`overlay irmaaMagiSeed[t] required …`), never a silent tier-1 $0, never the overlay's mid-path throw (`taxOverlay.ts:1441-1446`).
- **Byte-identity:** the widening flips ONLY previously-unpriced spine all-65+ households. Date-route all-65+ candidates already carried `healthcareEnabled: true` → **no golden fixture moves** (red-team-confirmed; build must prove: full suite + the goldens byte-identical, and record which dev-seed outcome pins legitimately drift — see Drift protocol).
- **Readout:** `wantHealth` (`simulate.ts:1337`) now emits the HealthYearSink series for the all-65+ headline run wherever `healthReadout` is requested — the existing medicare/step facts in `healthSheetChrome.ts:206-248` are the (already-shipped) render seat for priced households; **no new render seat** (the TODO.md:53 "rendered by no surface" advisory is STALE — retire it in the docs pass).

## Phase B — containment (Fork 2: the additive premise, ratified)

**Ruling:** entered spending EXCLUDES Medicare premiums; the tool adds Part B + IRMAA on top. It is the pinned engine premise (`taxOverlay.ts:303-308`, `fundingNet = net + medicareCostThisYear` :1495), the shipped oopHelp promise (`copy.ts:159-160`), internally consistent with gross SS (draw = S+P−G ≡ reality's S−G+P), and the conservative side of insight 055 (every omission channel is optimistic/cardinal; every double-count channel is pessimistic/safe). Insight 024: never infer containment from the lump spend figure — make it explicit at the interface.

- **Rider (i):** rewrite `spendHelp`'s bare "insurance" (`copy.ts:79-80`) to the PRECISE boundary — the tool adds Part B + the income surcharge; the user budgets Part D plan + Medigap premiums inside their spending figure. That precise sentence IS the containment contrast at the field where double-entry is likeliest (`model.ts:1394-1397` mandates the contrast in question copy). Craftsman's-lead first draft; copyGuard-clean.
- **Rider (ii):** SS stays gross — verify the FRA-statement instruction (`copy.ts:70-72`) needs no change and no netting enters anywhere.
- **Installed base:** NO silent migration of anyone's entered spend. The corrected copy must be **re-entry visible** (a returning user who baked premiums into spending self-corrects on the walk-through). FILE a named follow-up for the installed-base double-count (pessimistic-safe; ~zero real pre-launch base; not a ship blocker).

## Phase C — the UI handoff (Fork 4: minimal, re-keyed)

- **Retire the age-based full-gap claim entirely:** `verdictMedicareUnpriced` + `rothMedicareUnpricedNote` copy keys and the age-only `medicareUnpriced(people)` predicate. Do NOT re-scope to any age proxy (hard constraint 1).
- **New predicate:** "was Medicare priced this run" — single-sourced from the same seam that decides pricing (the intake gate / the run's overlay + the date route's forced-true), never a UI re-derivation from ages. Spine route: true iff the headline run carried `healthcareEnabled` (post-widening: every all-known-ages household, both branches). Date route: structurally true (`dateSearch.ts:222`). The single-producer complement discipline (`healthSheetChrome.ts:294-301` claims insight-027 compliance its own age predicate violates — fix the docstring with the code).
- **Replace with two lines, shipping together (hard constraint 2):**
  - **The narrowed residual disclosure** — what remains unpriced: Part D base plan premium, Medigap, purchased Part A, state income tax, and the real-flat Part B modeling choice. Direction line composed off the residual set: "could be a little tighter than shown" — NEVER the old false unidirectional "never up". May remain age-derived in its own display gating ONLY because on-Medicare ⟺ 65+ makes age the true domain **there**; it must never assert base Part B/IRMAA are unpriced.
  - **The affirmative inclusion line** on the all-65+ verdict surface — names that Medicare (base Part B + the income surcharge) IS priced in, so a worse-looking number has its cause named (the household reaches no Healthcare door — `healthPriced` needs a pre-65 member, and the door STAYS ACA-scoped this unit).
  - **Dissent to resolve at build (tone, not correctness):** quote a representative first-year dollar vs qualitative naming. Default to QUALITATIVE unless a clean, honest, route-available figure (household's own frame, tabular-nums, no false universality — note `healthReadout` is spine-only, undefined on the date route) reads calm in the Caddie walk.
- **Roth lever:** the surcharge a conversion trips is now PRICED — the lever's note flips accordingly (the two-arm preview genuinely moves); keep the residual boundary honest there too.
- **Door stays ACA-scoped.** The Medicare-only door/sheet rides a later cold-read-bearing surface unit (contract #1 of the U11 filing). No confidence-grade cap exists live to lift (council-verified: no numeric consumer; Act 4 not started).
- **verify:fit:** re-pin `.cs-medicare-note` (or its successor class) per-seed HONESTLY on the new predicate; ADD a date-route all-65+ still-working arm; re-prove the one-frame law at 1536×791 AND 1280×800 (the freed/changed hero line moves the frame).
- **Copy keys:** governed prefixes only (verdict*/roth* nets for the copyGuard sweeps); catastrophe/hedge gates as the guard demands; every figure names its source/owner/era per the comprehension law.

## Phase D — scope artifacts (Fork 3)

- **Part D base:** stays OUT ("plan-specific, the user budgets their chosen plan", `healthOverlay.ts:468-469`) — covered by the residual disclosure.
- **Hold-harmless:** OUT. NO constant, no loud disclosure (a nominal COLA-coupled provision in a real-dollar engine; IRMAA payers are statutorily NOT held harmless; a decorative constant is the insight-074 trap; the omission is conservative → D8 silence).
- **Survivor SSA-44 recheck:** stays out (`rothConversionIsSsa44LifeChangingEvent: false`), already disclosed at `copy.ts:773`, pessimistic-safe.
- **Real-flat Part B:** KEPT (no escalation modeled — no sourced real-growth constant exists, and constants discipline forbids a default, burned/062) but **DISCLOSED** (hard constraint 3). Sharpening from red-team attack 5: real-flat under-penalizes IRMAA cliff-CROSSING specifically — **elevate the Medicare-cost-trend constant to a documented Act-4-solver-BLOCKING forward landmine** (architecture forward-landmines + roadmap).
- **The 2028 IRMAA top-tier re-index TRIPWIRE test** (dated, `seniorBonusSunset.tripwire` precedent — `topTierFrozenThrough: 2027` re-indexes in 2028), NOT `reVerifyEveryBuild` (a known dated deterministic event, not per-build legislative volatility).

## Phase E — ship gates (Fork 5; all mutant-proven where marked)

1. **DND-012 externally-derived (hand-arithmetic) fixtures on the RUNTIME pricing path** (senior-bonus C1 — never a stand-in primitive), covering: the **t = lookback seed→history handoff crossing** (insight 014's crossing-year law), a **tier-edge `<`/`<=` witness** on an exact integer threshold, and the **survivor MFJ→single lagged +2yr filing flip** (the widow's-cliff halved single thresholds).
2. **Reduce-to-spine byte-identity BOTH directions** + a **new Medicare-only OFF arm** with burned/027 presence companions (the ON arm must show the cost; the OFF arm byte-identical to the tax-only overlay).
3. **The 076/R19 planted-fail arm** (mutant-proven): absent-seed all-65+ → calm indeterminate; never silent $0; never mid-path throw.
4. **The date-route regression witness:** still-working all-65+ household shows NO false "not priced" note; mutate ages holding the pricing decision → the note does not reappear (hard constraint 1's pin).
5. **The affirmative-line reachability witness** (attack 3): the all-65+ verdict surface names priced Medicare — rendered live, not just unit-mounted (insight 048's class).
6. **HSA qualified-cap check:** `hsaQualifiedSpend = oopMedical + (owner-65+ ? medicareCost : 0)` (`taxOverlay.ts:1479-1485`) now grows for all-65+ — verify against Pub 969 semantics and confirm the oopMedical containment gate premise (`simulate.ts:924-949`) holds (premiums are engine-funded on top, never budget-track-funded).
7. **The 2028 tripwire** (Phase D).
8. **Drift protocol (senior-bonus C3):** RECORD each all-65+ dev-seed's UN-retuned drift BEFORE any re-tune — `?seed=retired`, `?vault=stale`, `?vault=datestale` (cost up → survival down is the honest direction); never blind the cold-read oracle. `?seed=health` (61/59, ACA-priced) must NOT drift — its stability is itself a pin.
9. **verify:fit** re-proven at 1536×791 + 1280×800 incl. the new/changed note arms + the date-route all-65+ arm; **full suite** + typecheck + lint + `verify:bundle` (fresh build first, insight 057) + `verify:doc-stats` + `verify:aca`.
10. **Docs amended in-pass:** architecture §5 (reduce-to-spine table's healthcare OFF condition — the gate is no longer ACA-synonymous), §6 (R19 regime note), §7.2 (the all-65+ pricing path + the ratified containment answer), the forward-landmine entry (Phase D), roadmap's U11 note, TODO (close the filing; RETIRE the stale :53 base-vs-surcharge advisory).
11. **A Caddie pre-walk of every changed surface on BOTH routes** before Briggsy's cold read (the fork-4 tone slice is ⚑ yours-to-close — ships PILOT-CLEARED under the grant, his eye supersedes and scores the tape).
12. **ONE commit, no riders** (the senior-bonus shape). Push → CI green **by explicit run id**.

## Explicitly OUT (do not build)

- A decoupled `medicareEnabled` overlay toggle (rejected 1b).
- Any age-keyed disclosure predicate or age-proxy re-scope (hawk veto).
- Hold-harmless modeling or constant; Part D base premium; Medigap; purchased Part A pricing.
- Part B escalation/trend modeling (Act-4-blocking landmine instead).
- The Medicare-only Healthcare door/sheet (later surface unit).
- Silent migration of any user's entered spending.
- The fiduciary's current-law-as-written caveat (stays separately filed for Briggsy — never a rider).
