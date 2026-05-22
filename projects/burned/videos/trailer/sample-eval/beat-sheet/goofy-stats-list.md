# Goofy-stats list — Unit 1.6 (DRAFT — cold-read gate pending)

> Status: Stat pool drafted, finalists locked, hat-count audit complete,
> Stat 3 phrasing **provisionally updated from "Two of them with hats" to
> "Five of them with hats" per Step 1.5 audit reality.** Cold-read gate
> (Step 4, N≥3 reviewers, per-reviewer-floor consensus) NOT yet run —
> needs human cold-readers. Until the gate clears, Stat 3 (and the rest
> of the R11 stat set) are provisional.

## Stat pool

Per plan Step 1, 15 candidate dry+absurd pairings sourced from
authoritative BURNED stats (TODO.md §1 squeaky 2026-05-16, README,
git history, source tree). Per `feedback-stats-single-source.md` —
every dry stat verified against the actual source, not working
memory.

| # | Dry stat | Absurd companion | Source |
|---|----------|------------------|--------|
| P1 | 14,000 pages of documentation | + 6 sticky notes (recovered) | docs/ + sticky-note inventory (fictional) |
| P2 | 1,407 tests passing | 6 deliberately unrehearsed ("the memorable ones") | TODO.md §1 (1,407 pass | 6 expected fail (68/68 files)) |
| P3 | 17 asset profile illustrations | 2 of them with hats **← AUDIT FAILED, see Step 1.5** | public/assets/cards/ count |
| P4 | 7 operatives in active roster | + 1 who is, technically, all of them. Don't ask | brainstorm roster + Agent X mechanic |
| P5 | ~~68 mission-rehearsal files~~ + ~~"engine.test.ts"~~ | **R6-INELIGIBLE — raw filename = SDLC vocab; doc-review removed from backup list** | (n/a) |
| P6 | 120 distinct operations in the deck | Including one that ends your career instantly | RULES-REFERENCE.md card count + BURNED card mechanic |
| P7 | 36 protocol revisions | 6 of them are just "we changed our minds" | git log + PROTOCOL_VERSION = 6 |
| P8 | Cover identity: "card game" | Active threat level: medium | self-described BURNED purpose |
| P9 | 0 surviving timeline drafts | (the field asset claims this is intentional) | git history shows iterative spec rewrites |
| P10 | 9 named operatives total | + 1 named Dolores Grieves, who runs HR and may also be the field asset | Pendleton roster + Dolores NPC |
| P11 | Asset turnaround: 4 sessions | Asset turnaround if you don't count weekends: also 4 sessions | session-history-based |
| P12 | 100 KB phone bundle ceiling | Phone bundles currently shipping: 19.17 KB | TODO.md §1 measured |
| P13 | Forensic dossier pages | Number of dossiers with footnotes citing other dossiers: 4 | docs/conventions/ + cross-refs |
| P14 | Mission rehearsal contingencies: 1,407 | Most-rehearsed: "the field asset gets the deck wrong" | top-failing test (BURNED-draw edge cases) |
| P15 | Active runtime in shipped form: 106 seconds | Total time spent timing it: longer than that | meta-stat |

## Step 1.5 — Hat-count audit (PRE-GATE, per plan doc-review reorder)

**Universe of audit:** all 17 files in `public/assets/cards/*.webp`
(11 action cards + 6 operative portraits; Otto's portrait is NOT in
the deck per `ActRoster.tsx:153-158` and is therefore NOT in the 17
asset illustrations). Audit dated 2026-05-18.

**Method:** visual inspection of every `.webp` for a clearly-readable
hat (fedora, trilby, porkpie, bowler, cap) on a primary depicted
figure. Tiny figures-within-photos (intel-briefing) and unclear
silhouettes (extraction's helicopter rappeller) coded NO HAT for
conservative count.

| Card | Hat? | Notes |
|------|------|-------|
| agent-x.webp | ✅ | Black fedora pulled low (matches `regen-agent-x.ts:31` prompt) |
| back-channel.webp | ✅ | Fedora silhouette in phone booth |
| burn-the-files.webp | ❌ | Burning file cabinet only, no figure |
| burned.webp | ✅ | Two fedora figures at car in rain (the trailer's namesake card) |
| call-in-a-favor.webp | ✅ | Left figure at bar wears a fedora |
| dash-barlowe.webp | ❌ | Slicked-back hair, no hat (matches `regen-dash.ts:27` prompt) |
| direct-order.webp | ❌ | Silhouetted figure behind desk, suit, no visible hat |
| extraction.webp | ❌ | Distant silhouette rappelling from helicopter; not clearly readable as a hat |
| falsify-intel.webp | ❌ | Man at computer, no hat |
| go-dark.webp | ✅ | Fedora figure walking down rainy street |
| intel-briefing.webp | ❌ | Top-down shot, gloved hand handling photos; photos within depict fedora silhouettes but the card's primary subject is the hand+photos tableau |
| intercepted.webp | ❌ | Dolores Grieves (white hair, no hat) |
| janet-broadside.webp | ❌ | Silver chignon, no hat |
| neal-proctor.webp | ❌ | Short hair, glasses, no hat |
| reassign.webp | ❌ | Hands passing folder, no figures with hats |
| sable-ashworth.webp | ❌ | Long hair, no hat |
| vera-khan.webp | ❌ | Ponytail, no hat |

**Hat count: 5 of 17.**

**Disposition (per Step 1.5 protocol):** hat count ≥ 3 → rewrite to
actual count OR pivot to alternative absurd companion.

**Decision:** rewrite to actual count.

> New Stat 3 phrasing: *"Seventeen asset illustrations. Five of them
> with hats."*

Rationale: minimal surgery to the line shape that survived the
deepening drafts; "five out of seventeen" preserves the oddly-specific
noticed-detail comedic energy the original "two" was reaching for; the
larger number actually emphasizes the "why-would-you-count" Archer-CODED
register more strongly (a small absurd number could read as accidental;
"five" reads as *deliberate audit*).

### Backup pivot (held in reserve for cold-read gate soft-fail)

If cold-read gate scores Stat 3 weakest of the four pairings (≤1
reviewer scores ≥1):

> Alternate Stat 3: *"Seventeen asset illustrations. One of them is
> literally just a file cabinet on fire."*

Verifiable (`burn-the-files.webp` = no figures, just an inanimate
burning file cabinet — the most literal possible "asset"). Sterling-CODED
deadpan-noticing-the-obvious-absurdity register. The thematic resonance
(burning files = the trailer-namesake card mechanic) is a secondary
read.

Plan-suggested alt (preserved for completeness): *"Two of them appear
to be the same person at different ranks."* — not verifiable without
further audit; held only if both primary and file-cabinet alternates
soft-fail.

## Step 2 — Selection criteria (per plan)

For S04's 4 stat cue slots, pick 4 from the pool that:

1. Span different stat domains (planning / testing / asset / personnel)
   to avoid "stat about tests, stat about tests, stat about tests"
   rhythm.
2. The dry stat is verifiable (cite source in BEAT-SHEET.md).
3. The absurd companion is short enough to read in the 60-frame
   caption window (≤8 words ideal, ≤12 words hard cap).
4. The pairing structure (dry + absurd) lands faster than a single
   long sentence — the gap between the two halves IS the joke.
5. No companion line is meaner-than-Archer (no companion targets
   Briggsy, the team, or any real human — only fictional operatives
   or abstract concepts are fair game).

## Step 3 — 4 finalists (POST-AUDIT)

| Slot | Finalist | Source-verified | Domain |
|------|----------|-----------------|--------|
| S04 Stat 1 (frame 1620) | P2: *"Mission rehearsal: fourteen hundred and seven contingencies war-gamed."* | TODO.md §1 — 1,407 pass | testing → rehearsal |
| S04 Stat 2 (frame 1740) | P2-companion: *"Six of them, deliberately unrehearsed — the 'memorable ones.'"* | TODO.md §1 — 6 expected-fail | testing → unrehearsed |
| **S04 Stat 3 (frame 1890)** | **P3-revised: *"Seventeen asset illustrations. Five of them with hats."*** | `public/assets/cards/*.webp` count = 17 ✓; hat audit 2026-05-18 = 5 ✓ (this doc) | asset |
| S04 Stat 4 (frame 2010) | P4'': *"Seven on the roster. Six in the deck. One on the research budget. Don't ask."* | `ActRoster.tsx:18-75` (6 deck operatives) + `ActRoster.tsx:153-158` (Otto research budget) ✓ | personnel |

Domain span: rehearsal / unrehearsed (testing) / asset / personnel —
4 of 5 plan-named domains (planning intentionally not directly
represented; the S04 narration line opens with "Operational planning."
which carries that domain into the cascade head).

## Step 4 — Cold-read gate (DEFERRED — Claude cannot close)

Per plan Step 4 — protocol locked: **N=3 reviewers minimum**, per-
reviewer-floor consensus (≥2 of 3 reviewers each score ≥1 on the same
pairing). Recorded stimulus distributed async via Discord/DM.

**Status (2026-05-18):** Claude has drafted, audited counts, and locked
phrasing per audit reality. The consensus gate REQUIRES human
cold-readers — `feedback-elite-team-standard.md` + plan ATC ask #3:
"Cold-read gate for Unit 1.6 needs ≥ 3 reviewers per the
per-reviewer-floor consensus; can't be Claude-solo."

**Next step Claude cannot complete:** generate a Sterling-CODED audio
stimulus (~30s, all 4 finalists read deadpan) for distribution. Phase
2 voice pipeline produces TTS WAVs by design; until Phase 2 fires, a
human-read interim could substitute IF Briggsy or another reviewer is
willing to record. Until either pipeline lands, the gate is open.

**Soft-fail handling (per plan, pre-recorded):** if exactly 1 pairing
fails per-reviewer-floor, swap from pool. Backup candidates:
- For Stat 3 specifically: file-cabinet pivot (above)
- Pool reserves (any slot): P6 deck-of-120, P11 weekend-asset-turnaround
- P5 mission-rehearsal-files REMOVED per doc-review (raw filename
  R6-ineligible).

**Hard-fail handling (per plan, pre-drafted):** if ≥2 pairings fail
per-reviewer-floor, R11 cuts. Cascade VO Stat 1–4 cues drop;
cascade becomes purely visual. Two-bridge structure pre-drafted in
plan Step 4:
- Bridge cue 1 (frame ~1730): *"Fourteen thousand pages of forensic
  dossiers. Drafted on weekends."*
- Bridge cue 2 (frame ~2070): *"By a field asset, deliberately not
  named. Don't ask."*

Bridge cues NOT yet shipped in `BURNED_TRAILER_LINES` (commented out
for the R11-keep path; only activates if R11 cut fires).

## Step 5 — Stat-source verification

Per `feedback-stats-single-source.md`:

- **P1 NOT USED** in locked finalist set — the "fourteen thousand pages"
  line lives in S04-cue-02 narration AND in R11-cut bridge line, not as
  a Stat-1 caption. (If a future rev wants "14,000 pages" as a numeric
  stat caption, run `Get-ChildItem docs/ -Recurse -File -Filter *.md |
  Get-Content | Measure-Object -Line` to verify magnitude before
  shipping.)
- **P2 verified.** TODO.md §1 (verified 2026-05-18): **1,407 pass | 6
  expected fail (68/68 files)**. Stat 1 ("Mission rehearsal: fourteen
  hundred and seven contingencies war-gamed") + Stat 2 ("Six of them,
  deliberately unrehearsed") matches exactly. ✓
- **P3 verified post-audit.** `public/assets/cards/*.webp` = 17 files
  ✓ (verified via Glob, excludes `_archive/`). **Hat audit 2026-05-18 =
  5** (this doc, table above). Original draft "Two with hats" was a
  fictional plant by an earlier deepening pass; Step 1.5 audit
  surfaces the actual count + rewrite per protocol.
- **P4'' verified.** `ActRoster.tsx` OPERATIVES array (lines 18-75) = 6
  entries (Dash, Vera, Sable, Janet, Neal, Agent X); Otto's "research
  budget" aside at lines 153-158: *"busy with the (unsanctioned,
  off-books, almost certainly illegal) research budget."* Stat 4
  ("Seven on the roster. Six in the deck. One on the research budget.
  Don't ask.") matches the dossier source exactly. ✓

## Patterns to follow

- UMB v3 stat-list precedent: V3S08_ThePunchline.tsx — cite-and-pair
  pattern.
- `feedback-stats-single-source.md` — grep-and-verify discipline.

## Anti-pattern guard

- No "167 tests passing" / generic LinkedIn-coded stat without absurd
  companion ships.
- No companion targets real humans (Briggsy / team) — fictional
  operatives + abstract concepts only.
- No companion contains raw SDLC vocab (`script.test.ts` R6 grep
  enforces).

## Verification

- [x] 15-candidate pool documented (Step 1).
- [x] Hat-count audit complete; outcome locked in Step 1.5; Stat 3
      phrasing updated to actual count.
- [x] 4 finalists selected per Step 3 selection criteria.
- [x] Per-finalist source verification per Step 5.
- [ ] Cold-read gate consensus (N≥3 human reviewers) — **OPEN.**
- [x] BEAT-SHEET.md S04 cue table reflects locked Stat 3 phrasing
      (updated in same commit as this doc).
- [x] `script.ts` `S04-stat-03` text matches the locked Stat 3 phrasing.

## Pending follow-ups

- **Cold-read gate (Briggsy / human-coordinated):** ≥3 reviewers, async
  stimulus, per-reviewer-floor scoring. Triggers either ship-as-locked,
  partial swap (Stat 3 pivot to file-cabinet alternate), or full R11
  cut (bridge lines activate).
- **R15 #5 subhead** (Unit 1.9): Briggsy decides from 3 candidates in
  plan AMENDMENT 2026-05-18 (recommended: option (a) *"Honestly at this
  point we're just impressed."*). Not blocking on stats.
