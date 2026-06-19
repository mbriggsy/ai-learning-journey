# Doc Restructure — Resumable Plan (CP0)

> **What this is:** the doc re-authoring plan recovered from the session that crashed at
> ~02:25 AM on 2026-06-18 (session `9aee25fb-263b-475f-822a-1235545bc13f`). The crash hit
> seconds after the plan was presented — *before* you said "go" and *before* anything touched
> disk. So **nothing was lost to git**; this file is the volatile-transcript plan made permanent.
> This is scaffolding (the recipe, not the dish) — **delete it when the restructure lands.**
>
> **Status (2026-06-18):** GREEN-LIT for the full ground-up rewrite. The target structure +
> the four radical moves are locked (see *Q6* below). The foundation (CP1 + CP1.5) is committed,
> **M1 (the migration ledger) is DONE**, and **M2 (the four hubs) is DONE** — `product` / `roadmap` /
> `architecture` / `glossary` re-authored present-tense from the ledger (SS sub-engine folded into
> architecture §7.7; accumulation as first-class engine content; R40 de-special-cased; all four
> changelog/Summary sections killed; zero dead links; 942 tests still green).
> **M6 steps 1–3 are DONE** (zero-loss gate passed; `features/` demolished; sweep clean — commit `0d5ccf48`).
> **The open fork is M6 step 4** (the P→Act code-comment sweep — revealed NON-mechanical: Q1-tangled scope +
> stale pre-fold content like `model.ts:551`). **`TODO.md` item 0 is the live handoff** — read it first; this
> file is held only because it records the step-4 obligation, and step 5 deletes it once step 4 is decided.
> Rationale: `.recovery/doc-restructure-judge-output.md` (judge fan-out — note its "preserve"
> spine was overridden by Q6). Must-survive net: `.recovery/docs-quarry-inventory.json` (16 docs)
> + `.recovery/quarry-roadmap.json`.

---

## ▶ RESUME HERE (fresh session)

Foundation (CP1 + CP1.5), **M1 (the migration ledger)**, **M2 (the four hubs)**, **M3 (the
`decisions/` records)**, **M4 (the four plans)**, and **M5 (the two research docs)** are done and
committed. The **entire new tree is now authored present-tense.** To continue cold:
1. **This file** — the locked decisions (Q1–Q6), the target tree, the M1–M6 sequence.
2. **The ledger** — `.recovery/migration-ledger.md`: the rewrite SPEC + the must-survive net M6 greps
   against. Every fact is routed to its new-tree home by section, with disposition + a **Review Queue
   appendix** (the 74 verify findings + the 14 cross-home relocations). The quarry
   (`docs-quarry-inventory.json` + `quarry-roadmap.json`, 1,078 facts) is its source — expand a
   `sig`/digest back to its full claim only when a gate check is ambiguous.

Start at **M6 — the zero-loss gate + demolition (the hard backstop; nothing is deleted before it
passes).**
1. **The zero-loss grep.** For every ledger item's signature, confirm the fact is accounted-for in the
   new tree (canonical at its home, or a live pointer). Walk the **Review Queue appendix** (74 findings +
   14 relocations) — each `[fixed:*]` must hold in the authored docs. ONLY when 100% homed:
2. **Demolish `docs/plans/features/`** (`social-security.md`, `other-income.md`, `portfolio-holdings.md` —
   now fully duplicated into `decisions/` + `plans/`) and **repoint `docs/README.md`'s feature-plan row**
   (the last referrer — it currently lists the three `plans/features/*` docs; repoint to the `decisions/`
   records + `plans/2-first-answer`).
3. **Final tree-wide forward-only sweep** — the insight-018 blast-radius grep on every superseded phrase,
   across ALL of `docs/` (not just the plans), confirming zero `## Superseded`/`## Changelog` headings and
   zero dated-supersession framing survive.
4. **The P→Act code-comment sweep (Q3b, ~18 source files)** — its own atomic commit (the source comments
   that say "Phase 1/2/3/4" → "Act 1/2/3/4"; IDs unchanged, comments-only, stays green under typecheck).
5. **Delete `RESTRUCTURE-PLAN.md` + `.recovery/`** — the scaffolding is the recipe, not the dish.

> **M5 carry-forward notes (for M6):**
> - Both research docs are present-tense: the `verify:aca` gate + the `[CORRECTED]` markers + the
>   per-figure `directionalUntilPinned` discipline are **kept** (present truth); the Strands-1/3 history
>   appendix (consumability + regulatory) was **stripped** (canonical in product.md — the research keeps
>   pointers); the dated requirements-changelog + provenance were dropped (git log keeps them).
> - **`engine-validation-and-tax.md` is now the COMPLETE verified-figure register** (the second M5 pass —
>   a verification against the ledger found research was missing ~6 categories of number-rows the ledger
>   routes to it as canonical, with `ss-computation.md`'s "canonical in research" pointer dangling). Added,
>   each with citation + a pin-pass row: the **SS benefit-computation constants** (the full POMS rule-set +
>   the $920/$1,025/$350 oracle dollars), the **R40 income tax facts** (alimony/pension/rental/annuity),
>   the **engine numeric bounds** (gross-up k≈0.74 / `GROSS_UP_MAX_PASSES` / `ENGINE_MAX_DOLLAR`) + the
>   **survivor-spending ratio** (0.75 Blanchett), the **passphrase-strength floor** (zxcvbn ≥3 / len ≥12 +
>   the GPU guess-rate), and the **accumulation reference figures** (Notice 2025-67 / Rev. Proc. 2025-19 /
>   the 161-family ticker table). `ss-computation.md`'s standalone rule-set table was replaced by a pointer
>   (its §-sections keep the factors their formulas cite); `other-income-r40.md` + `decisions/README.md`
>   repointed. So M6's grep for every SS/R40/bounds signature now resolves in research, the ledger-routed
>   home.
> - **Crypto-stack rationale — DONE.** Strand 2's comparative storage/crypto decisions (skip-SAB, the
>   PBKDF2-vs-Argon2id KDF fallback, Jazz-rejected/Evolu-in-reserve, login-vs-data recovery, the
>   Tauri/keyring desktop-port landmine) live present-tense as the **"Local-first / E2E architecture
>   rationale"** section, pointing to architecture §7.3/§10 for the invariants. No `decisions/crypto-stack.md`
>   was minted (M3 decision). It is NOT a ledger row, so the M6 grep won't look for it — a deliberate keep.
> - 326/326 relative links in `docs/` resolve. The working tree is clean at the M5 commit.

> **M2 carry-forward note (for M6's double-check):**
> - Ledger row `glossary.md#67` (the BenefitPerson/H/L SS terms) carried a stale verify-pass note that
>   "architecture §7 has no SS section." M2's radical-move #1 **creates** that section (architecture §7.7),
>   so SS terms route to architecture §7.7 as the dominant routing intends; that note is **resolved by M2**.

---

## The mission (the spine, never drift from this)

Re-author the docs **forward-only**, ground-up, from the reader's need — *not* by migrating the
old tree. The homework is done; we are **not** re-litigating or re-deriving a single decision.
We are rewriting how the docs **narrate** what we're building and how to build it.

**Forward-only means:** no "previously," no "supersedes," no changelog sections. Nobody cares
how we got here. The hard-fought battles are **kept** — but as **present-tense truth**
("we do X because Y"), never as a story of what we changed our minds about. `git log` keeps the
journey. Load-bearing reasoning lives in `decisions/` present-tense.

**The bar (two tests, the second is harder):**
- **The Craig test** — a techie stranger reads top-down and thinks *"clean, I get it"* — not
  *"this is all over the place, wtf is 'First Answer'."*
- **The you-cold test (the real bar)** — *you*, two days / a month removed, pick this up and
  don't feel lost in your own project. A foundation you can't read cold isn't a foundation —
  it's a liability with good test coverage.

**Cohesion comes from the frame, never from trimming depth.** All as-built facts — the numbers,
the survivor-floor bug write-up, the `[CORRECTED]` markers, the live ACA legislative status —
are **kept as present truth, never cut.**

---

## Locked decisions

### Q1 — Numbering: **stable IDs, hidden from the story, supersession annotations stripped.**
Clean renumbering was **rejected** (you pushed, I pushed back, you locked the pushback). Why:
- Every `R/U/C/D/M` reference in `src/` is in a **comment or test name** — never an identifier.
  So a renumber stays green under `typecheck`/`test` → the drift is **silent**: hundreds of
  comments quietly pointing at the wrong requirement, no gate catches it. In a "calm-but-wrong
  is the sin" repo, that's the cardinal failure, manufactured invisibly.
- Blast radius = a 5-level compound taxonomy (`P1·U2`, `U3·M5`, `C3·§3b`…) across ~84 source
  files, 35 insight files, 98 commits — plus immutable git history.
- It buys Craig **nothing** — he never sees the numbers.
- **So:** IDs stay stable, vanish from the narrative, and every "(Supersedes v1 …)" annotation
  is stripped.

### Q2 — Reader line: **two bars decouple at the front door.**
- **Cohesion** applies **everywhere, top to bottom** — every doc tells one clean story in its
  lane. A builder doc may be *deep*; it is never allowed to be *scattered*. (This is what
  Craig's "all over the place" reaction is really about — non-negotiable in every file.)
- **Zero-jargon / explain-to-a-stranger** applies to the **front door only** — README + the
  *narrative* half of `product`. Past that, builder docs may say CRN, reduce-to-spine, MAGI,
  lexicographic, with the glossary one click away.
- The funnel: **README** = pure Craig, zero jargon. **product** = Craig story on top
  (question → answer → recommendation → cardinal rule), a **visible seam**, then builder depth
  below. Everything else = builder surfaces, dense but cohesive.
- Rejected: "whole top level for Craig" (would wreck `architecture.md` for its real reader);
  a separate Craig-only page (README *is* that page — no second narrative home).

### Q3 — Act names: **plain-functional, Craig never sees them, "Act" stays the word.**
| Act | Name | What it delivers |
|---|---|---|
| 1 | **The Engine** | the foundation — nothing user-facing ships here |
| 2 | **Where You Stand** | the first answer: the confidence statement / your date |
| 3 | **The Levers You Hold** | build the budget + steer withdrawals & conversions (**you** drive) |
| 4 | **The Recommended Route** | the solver proposes the smartest strategy (**it** drives) |

"Where You Stand" covers both states (confidence statement for the retired, the date for the
still-working) in one phrase. "Levers You Hold" → "Recommended Route" makes the Act 3→4 handoff
legible: you drive the manual controls, then the co-pilot drives the recommendation.

### Q3b — The `P{n}` → `Act {n}` code-comment sweep: **do it NOW, not later.**
Deferring would recreate the exact Q1 failure (renamed in docs, not code) and contradicts the
cohesion-everywhere bar. Guardrails: **scope to the phase word only** (`P{n}` → `Act {n}`); the
`U`/`C`/`D`/`M`/`§` IDs stay untouched; **verify each `P` is really "Phase" per-hit** before
replacing; land it as its **own atomic commit**. ~18 stale source files.

### Q4 → Q6 — `features/` is DISSOLVED ENTIRELY (this supersedes the old `capabilities/` idea).
**Green-lit 2026-06-18.** The earlier plan moved `features/` → a prettier `capabilities/` folder.
Rejected — that still preserves the fossil. SS / other-income / portfolio-holdings have their own
docs **only because of when they were added.** Tax, healthcare, the date-search, the store — every
bit as much "capabilities" — live inline *by kind* (architecture §7 + the act plans), and nobody
ever wrote a `tax.md`. The brave move is symmetry: **delete `features/`; fold each by kind.**

(Two alternative trees were stress-tested and rejected: *by-capability* shards the invariants +
the R-ledger across silos and recreates the bolt-on at the top level; *by-reader* duplicates every
fact and breaks the README-is-Craig's-page lock. The by-kind spine wins on merit — the reader's
nine questions are invariant — so the tree shape mostly stays; the radical work is the content.)

### Q6 — the four radical moves (the whole rewrite)
1. **DELETE `features/`.** SS mechanics → architecture (an overlay-peer §7 entry); SS / R40 /
   portfolio **decisions** → `decisions/` records; R40 / portfolio **requirements** → product;
   their **build steps** → the Act-2 plan. No `capabilities/` folder is created.
2. **DISSOLVE the "accumulation fold."** The biggest fossil — **37 flags** framing C1–C3 as "the
   2026-06-08 amendment" across three plans. The IDs stay (Q1-locked); the dated-amendment FRAMING
   dies; accumulation becomes first-class engine content in `plans/1-engine` + architecture.
3. **PROMOTE `decisions/`** from one near-empty record to the real rationale home:
   `accumulation-fuck-off-date` (exists) + `ss-computation` + `other-income-r40` (the 9 KTDs) +
   `portfolio-holdings` (the 3 open ATC calls).
4. **RIGHT-SIZE the inverted plans.** plan-3 (80 KB) + plan-4 (104 KB) are huge specs for
   *unbuilt* acts vs the 48 KB *shipped* engine plan. Keep every contract/decision; cut the
   over-specification.

Dropped from the old plan: the `capabilities/` folder and the capability×act matrix — unnecessary
scaffolding; the roadmap's **requirement→unit trace already is the cross-cutting index** (the
"show me everything SS touches" view) and works exactly like tax/healthcare do today.

### The ID-scheme decoder (belongs in the glossary — defined nowhere today)
- **R** = **Requirement** — the product contract (R1–R40). *What* must be true.
- **U** = **Unit** — a build unit (U0–U17, globally unique across all acts). *How* it's built.
- **C / D** = two extra unit-tracks from the 2026-06-08 accumulation fold — **C** at engine
  altitude, **D** at intake/answer altitude (so U-numbering didn't have to renumber).
- **P → Act** = **Phase** — the four big groupings (the thing being renamed).
- **M** = **Milestone** — sub-steps inside a unit (code comments only, e.g. `U3·M5`).
- **§** = a section within a plan/doc.

So `P1·U2` reads "Phase 1, Unit 2" → becomes "Act 1, Unit 2."

---

## The target tree

```
README.md                        # ✅ world-facing front door (done CP1.5) — repoint dead feature rows
docs/
├── README.md          # ✅ thin index (done CP1.5) — repoint the dead feature rows at M6
├── product.md         # why + what + the R1–R40 ledger (R40 de-duped, present-tense)
├── roadmap.md         # status + the four acts + You-Are-Here + R→unit trace (the cross-cutting index)
├── architecture.md    # how it works + invariants index (done CP1) + SS overlay §7 + accumulation contracts
├── glossary.md        # vocabulary, define-once (SS terms repoint to architecture)
├── plans/             # build guidance, one per act, present-tense, right-sized
│   ├── 1-engine.md          (The Engine — shipped; C1–C3 integrated, fold-framing GONE)
│   ├── 2-first-answer.md    (Where You Stand — in progress; R40 + portfolio build folded in)
│   ├── 3-controls.md        (The Levers You Hold — not started; HALVED)
│   └── 4-recommendation.md  (The Recommended Route — not started; HALVED)
├── decisions/         # the rationale home (GROWS from 1 → 4 records)
│   ├── accumulation-fuck-off-date.md   (exists — reframe present-tense)
│   ├── ss-computation.md               (NEW — from features/social-security)
│   ├── other-income-r40.md             (NEW — the 9 KTDs, from features/other-income)
│   └── portfolio-holdings.md           (NEW — the 3 open ATC calls)
├── research/          # verified numbers, present-tense (history appendix stripped, live strands kept)
└── insights/          # the /brief + /distill gotcha ledger — UNTOUCHED (40 one-fact files)

DELETED:  docs/plans/features/   (3 docs dissolved by kind)
```

Net: ~17 rewrite-candidate docs → ~14. `features/` (3) deleted; `decisions/` born +3; the two
biggest plans halved; every surviving doc rewritten present-tense. Disposition for every
must-survive fact is the **migration ledger** (M1) — nothing is dropped without a logged home.

---

## Foundation (done) + the rewrite sequence (M1–M6; each = one commit = one resume point)

**Foundation — committed:**
- **CP0** — ✅ (`d74f6045`). Recovered this plan from the crashed session.
- **CP1** — ✅ (`d02af8b1`). Legends + front door: roadmap ID-scheme legend + the four locked
  act names + `scoping` status; architecture invariants index; glossary Act entry + two pointer
  meta-entries; `insights/README` shorthand decoder; single-voice `docs/README`. Verified (4 lenses).
- **CP1.5** — ✅ (`2f227e0a`). Root `README` = single front door; `docs/README` = thin index; the
  act-name drift in the root README fixed.

**The rewrite — M1–M6 (start here next session):**
- **M1 — the migration ledger. ✅ DONE (this commit).** All 1,081 quarry facts routed to their new-tree
  home (by kind: invariant→architecture, requirement→product, decision/KTD→decisions, number→research,
  definition→glossary, status→roadmap, build-step→plans, lesson→insights-already) in
  `.recovery/migration-ledger.md`. Built by a 17-agent extract workflow (zero-loss: every chunk returned
  its exact count), then an adversarial verify pass (27 per-home critics + a global consistency gate, 74
  findings), then a 24-agent fix pass (79 corrections applied verbatim) + a deterministic README
  dual-canonical sweep (21 flips). Acceptance tests pass: no signature is canonical more than once; the
  four locked decisions hold; 1,081 blocks intact. The 74 findings + 14 cross-home relocations ride along
  as the ledger's **Review Queue appendix** (M2–M5 watch-list, M6 double-check). Build trail in `.recovery/`
  (`m1-ledger-parts/`, `build-ledger.sh`, `verify-result.json`, `fix-rehomes.json`).
- **M2 — the hubs. ✅ DONE (this commit).** Rewrote `product`, `roadmap`, `architecture`, `glossary`
  present-tense from the ledger. SS sub-engine folded into architecture **§7.7** (overlay-peer) + a new
  longevity **§7.6**; accumulation kept as first-class engine content (no "fold" framing); senior-bonus
  sunset marker + engine-output (terminal-value percentiles + depth-of-failure) contracts added; R40
  de-special-cased from a "live, build-ready" appendix into a normal R-ledger group; the consumability/
  incumbent thesis + present-tense regulatory (Prong-A) rationale folded into product. All four
  `Superseded/changelog` sections deleted; every supersession parenthetical stripped. Glossary SS terms
  repointed → architecture §7.7. Verified: zero forward-only fossils, zero dead links (decisions/* homes
  named in inline code pending M3 linkify), 942 tests still green.
- **M3 — `decisions/`. ✅ DONE.** Created `ss-computation` (§1–§12 + the SSA rule-set + the
  `realizedClaimAgeAtDeath` survivor-floor bug as institutional record + the ~75% survivor-spending
  co-location + the MFJ→single switch), `other-income-r40` (9 KTDs + the OUT-list-with-directions +
  provenance corrections + the five-seam frame), `portfolio-holdings` (the household-blend model + the
  pending multi-holding recommendation + the §1014 basis decision) from the (still-present) feature docs;
  reframed `accumulation-fuck-off-date` present-tense (stripped its `Superseded/changelog` section + the
  v2-thesis Problem-frame story); linkified the three M2 inline-code refs; repointed `decisions/README`.
  §1014 + no-tax-blind-arm rehomed per the ledger; crypto-stack left in research. 312/312 links resolve.
- **M4 — the plans. ✅ DONE.** plan-1 carries the SS sub-engine as first-class build content (folded from
  the dissolving feature doc) + C1–C3 with no "fold" framing; plan-2 carries the R40 5-unit + portfolio
  multi-holding builds, pointing into the `decisions/` records; plan-3 + plan-4 changelogs stripped (the
  oracle cases (i–v) + §1014 after-tax objective + U14-built-first note were already present). All four
  present-tense; 318/318 links resolve.
- **M5 — research. ✅ DONE (two passes).** Pass 1: both research docs present-tense — kept the live
  Strand-4/5 numbers + the `verify:aca` gate + the `[CORRECTED]` markers + `directionalUntilPinned`
  discipline; stripped the Strands-1/3 history appendix (→ product.md) + the dated changelog/provenance;
  reframed the crypto-stack rationale present-tense (the "Local-first / E2E architecture rationale"
  section). **Pass 2 (the verification catch): `engine-validation-and-tax.md` is now the COMPLETE
  verified-figure register** — grew it to hold the SS benefit-computation constants, the R40 income tax
  facts, the engine numeric bounds + survivor-spending ratio, the passphrase floor, and the accumulation
  reference figures (each with citation + a pin-pass row), and replaced `ss-computation.md`'s standalone
  rule-set table with a pointer (de-dangling its "canonical in research" claim). 326/326 links resolve.
- **M6 — the zero-loss gate + demolition.** Grep the new tree for every ledger item's signature; every
  must-survive fact accounted-for? THEN delete `docs/plans/features/`, repoint `docs/README`'s feature
  rows, run the final tree-wide forward-only sweep (insight-018 blast-radius grep). The **P→Act
  code-comment sweep** (Q3b, ~18 source files) lands here as its own atomic commit. Finally delete this
  `RESTRUCTURE-PLAN.md` + `.recovery/` (the scaffolding is the recipe, not the dish).

**Cross-cutting truth gate** (the cardinal rule made mechanical): every strip pass runs the
**insight-018 blast-radius grep** on the phrases it removes; all as-built facts are kept as present
truth, never cut. The M6 gate is the hard backstop — no demolition until the ledger is 100% homed.

---

## Q5 — Cardinal-rule duplication: **LOCKED — one home, pointers everywhere.**

The cardinal rule was stated 4× (README + product banner + §2 + R25). Ruling (2026-06-18):
**collapse the copies, keep the presence.** One canonical full statement in `product §2`; the
plain-language version on README (different audience, legitimately its own wording); everywhere
else **references** it — "per the cardinal rule →" — instead of restating. Same one-home-
pointers-everywhere move as the numbering lock: drumbeat without four copies to drift.
