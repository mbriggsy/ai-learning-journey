# The invariant catalog — what the draft policy promises, measured against its own source

> **Phase 0 deliverable of [`torture-chamber-plan.md`](torture-chamber-plan.md).
> Status: FLEET-VERIFIED v2, awaiting Briggsy's eye — the Phase 0 gate.**
> v1 written 2026-08-20 from source; then adversarially verified the same day by an independent
> six-agent fleet (four section verifiers, two fresh-eyes hunters; 531k tokens, 86 tool calls).
> Verdicts on v1: **14 CONFIRMED · 8 CORRECTED · 1 REFUTED · 31 missed contracts found.**
> Everything below is post-fleet. Line numbers WILL rot (insight 029) — each citation also names
> a greppable anchor, and the anchor wins.
>
> **The honest taxonomy — four kinds of entry, never conflated:**
> - **PROMISED** — code enforces it; a violation inside the chamber means the chamber broke it.
> - **EMERGENT** — true today via data or arithmetic, enforced by nothing. The chamber's best
>   hunting ground: find the room where the emergence breaks.
> - **ASPIRATIONAL** — what we want to be true and no code promises. The chamber's test targets.
> - **DOCTRINE** — a documented operating rule for humans, enforced by no code and not
>   chamber-testable. Kept for context only.

## The two-minute read (what the fleet changed)

1. **C6 got demoted from aspiration to THEOREM — and the probe moved.** For engine-recommended
   picks, slack going negative is *arithmetically impossible* (needs never reopen; each own pick
   moves slack by 0 or −1; forcing pins it at 0). A chamber hunting that jump would report false
   safety. The real hunting ground is **off-policy edges**: auto-pick draining past the 12-row
   queue, and the exhausted-position rebuild offering nothing at slack 0.
2. **The exhaustion scenario is a trilemma, not a silence.** Total exhaustion of all forced
   positions: engine prints an empty deltas block → ladder hard-refuses (an accidental tripwire)
   → replay **crashes**. Partial exhaustion (K gone, DEF stocked) is genuinely silent on every
   path. The early-K/DEF adversarial room will hit all three; the chamber must expect each.
3. **The second-QB failure has an unguarded back door.** An our-pick that isn't on the 174-row
   board enters the forcing arithmetic (`_my_counts`) but not the value arithmetic (`_my_pts`) —
   forcing believes QB is filled while the deltas still price a QB as needed, all draft long.
   No v1 invariant covered it. (B6)
4. **The engine itself has NO draft-shape guard.** Traded-pick/reversal protection lives in the
   ladder's path only. Raw-engine rooms with exotic shapes produce internally inconsistent state
   — rosters right, clock wrong — and over-attribution can silently **disarm forcing**. (C8)
5. **The sandbox will lie about the market unless gated.** Synthetic player names fail the ADP
   join, and the "market" projection silently becomes its own null arm — correctly labeled only
   in `pool_source`. Any projection conclusion must gate on that field first (insight 008, one
   level up). (H8)
6. **F2 as v1 wrote it was simply wrong** — a traded pick between two OTHER teams warns and
   continues *by design*. Only ours/underivable refuses. A chamber asserting blanket refusal
   fails against correct code.

## The policy's chain of custody (who owns what)

`draft-kit/lineup_value.py` is the brain (marginal lineup value, must_fill).
`draft-kit/draft_engine.py` applies it: the **LINEUP DELTAS** block + **ENDGAME** filter
(:752-820). `scripts/precompute_ladder.py` **parses** that block into the queue — re-implements
nothing ("THE ENGINE IS THE ONLY ORACLE", :27-30), hard-refuses when the block is missing
(:644-648). `scripts/replay_mock.py` is a **parallel implementation** of the strategy on the
same brain (`replay()`, :48-103) — the fast path, governed by G.

---

## A — Feed, state, and gate integrity

- **A1 (PROMISED).** Engine hard-exits (1) on interior pick_no gaps or duplicates.
  `draft_engine.py:453-465`, anchor `# --- integrity gate:`. Every pick reaches the gate (ingest
  appends unconditionally, :422-451). Boundary notes: a TRAILING truncation is invisible by
  construction (contiguous prefix passes — insight 020's landmine); a pick missing the `pick_no`
  key dies earlier as a KeyError at the `:422` sort, not as the gate's message.
- **A2 (PROMISED).** Board state derives from `max(pick_no)`, never `len(picks)`
  (`draft_engine.py:455`; all clock state :466-470 follows from it).
- **A3 (PROMISED).** The contamination reference never comes from the feed being checked
  (`reference_draft_id`, `precompute_ladder.py:504-545`, anchor `NEVER THE FEED`; engine gates
  :199/:205 use argv's EXPECT only). Near-miss to know: `draft_engine.py:252` falls back to the
  feed's id ONLY to decide whether disk cargo may serve as a *shape* oracle. And the gate checks
  nothing when unarmed (`if EXPECT and …`, :205) — the chamber arms every room explicitly.
- **A4 (PROMISED).** `_synth` appends contiguous picks and refuses an unresolvable name
  (`precompute_ladder.py:548-571`). Caveat: contiguity is guaranteed by the CALLER's sort at
  :576, not by `_synth` — a harness calling it on an unsorted feed can mint duplicates (which A1
  then refuses).
- **A5 (PROMISED).** The ladder pre-sanitizes: rows with falsy `pick_no` are silently dropped
  BEFORE the engine sees them (:576; same in backtest :708) — so a planted malformed row can
  "pass" the gate for the wrong reason. Missing default feed = pre-draft-normal (empty feed
  proceeds, :784-790); an explicit `--feed` that is missing hard-refuses. Empty-feed rooms are
  valid chamber states.
- **A6 (PROMISED — the engine's fatal-gate family).** Beyond A1: >1 distinct `draft_id` in the
  feed (`:198-212`, anchor `HOLDS MORE THAN ONE DRAFT`) · feed id ≠ EXPECT · any
  `draft_slot > TEAMS` and two more picks-derived shape disproofs (`:282-296`) · cargo
  teams/rounds disagreeing with argv (`:264-268`). **Chamber consequence: stamp `draft_id` on
  every synthetic pick** — ids are stringified, so a missing key becomes `"None"` and trips the
  multi-draft or EXPECT gate before the policy ever runs. With ZERO picks both contamination
  gates pass vacuously — pick-zero rooms cannot exercise them.
- **A7 (PROMISED — seat-oracle outcomes, three distinct).** Our `picked_by` on the wrong slot →
  exit 1; populated `draft_order` missing Briggsy's id → exit 1; non-bijective `draft_order` →
  demoted to `[unverified]`, NOT fatal (`draft_engine.py:311-332`; banner :380-388). Synthetic
  rooms either stamp `picked_by=1390750540631150592` consistently onto OUR slot's picks or omit
  it entirely; omission yields the `**` UNVERIFIED banner in the preamble every parser sees.
- **A8 (EMERGENT — lower-bound ghosts).** `pick_no <= 0` passes the gap/dupe gate (it scans
  `range(1, n+1)`) and `draft_slot <= 0` passes the seat gate (checks only `max > TEAMS`) —
  ghost picks join rosters and taken-sets silently (`:457`, `:282`). A fuzzer must not expect
  refusals here; a ghost that shifts THE CALL is a finding.
- **A9 (PROMISED).** Absent default picks.json → graceful `[pre-draft]`; a MALFORMED file →
  deliberate raw traceback (`:145-154` — "cannot tell" vs "the answer is no" must not share a
  branch). The chamber classifies that traceback as designed behavior.
- **A10 (EMERGENT — one cargo file, two encodings).** `reference_draft_id` opens the cargo
  `utf-8` (:531) while `cargo_draft_id` opens it `utf-8-sig` (:452-453). A BOM'd
  `sleeper_draft.json` therefore DISARMS the contamination gate while the seat derivation and
  the out-path holdback still succeed — divergent gate states off one byte sequence. Chamber
  cargo staging must control encoding deliberately.

## B — Queue construction

- **B1 (PROMISED).** The queue IS the engine's LINEUP DELTAS order, verbatim
  (`precompute_ladder.py:654`; parse preserves stdout order, `_section` bounds the block;
  refusal :644-648). Under forcing, the queue verbatim-inherits the filtered endgame list.
- **B2 (PROMISED).** A candidate scores what he adds to the best legal lineup with unfilled
  slots pre-filled at replacement (`lineup_value.py:21-68`; applied `draft_engine.py:805-807`).
  **Oracle caveats:** "replacement" for K/DEF is **0.0 by construction** (`lineup_value.py:
  125-126` — their board pts are bare vorp), so an open K/DEF slot pre-fills at zero and a
  candidate K/DEF's delta is his full flat vorp (exactly what D1's counterfactual rides on).
  The FLEX pad is `max(fill)` across RB/WR/TE (:51-53), not per-position — a hand-computed
  closed-form room (H2) cannot match to the decimal without both rules.
- **B3 (PROMISED, torture target).** Only the top `CANDIDATE_WINDOW = 40` by board rank get
  deltas before forcing (`draft_engine.py:787-788`; constant `lineup_value.py:98`; same slice
  `replay_mock.py:71`, so the probe transfers to the fast path). Scope: the window gates the
  QUEUE only — K/DEF still surface in TIER CLIFFS and the ladder's projection pool.
- **B4 (PROMISED, with a boundary the fleet mapped).** Ties and zero-deltas fall back to board
  order (sort key `(-delta, r)`, :807; doctrine :763-764). **Deltas can go NEGATIVE** (a
  candidate below replacement displaces the pad — routine late-draft), and the display gate
  `_d > 0.05` (:819) prints negatives and small-positives identically as `+0.0, bench` while
  the SORT uses exact values: negatives sort below all zeros regardless of rank, and a Δ=+0.04
  row sorts above every true zero while wearing the bench label. **Assert board-order only over
  rows whose delta is exactly 0.0, never over rows wearing the label.**
- **B5 (PROMISED — a cap, not a guarantee).** Queue depth is CAPPED at `BEST_N = 12`
  (`draft_engine.py:481`, `:818`) — exactly 12 only when ≥12 candidates survive; the endgame
  filter (≤3 per allowed position) and thin pools print fewer, so the queue is SHORTEST exactly
  when forcing is on. The 14-pick turn gap (seats 1/8) can drain past it either way; auto-pick
  then falls to Sleeper's board.
- **B6 (EMERGENT — the off-board back door; no v1 invariant covered it).** An our-pick that
  fails the board join enters `_my_counts` (forcing arithmetic — rosters take every pick,
  `draft_engine.py:450, :783`) but NOT `_my_pts` (lineup value — only board-joined rows,
  `:448-449, :780-782`). Draft an off-board QB and forcing believes QB is filled while
  marginal_pts still pads QB at replacement — **a second QB shows a positive delta all draft**:
  the 2026-08-19 failure resurrected through a door the forcing cannot see. First-class torture
  room; oracle = cross-check the two views every state.
- **B7 (EMERGENT — acknowledged-unguarded).** Name-drift availability leak: `taken_keys` holds
  SLEEPER spellings, availability filters on BOARD spellings; a drifted rendering with no
  player_id leaves a drafted man on BEST AVAILABLE — nameable as THE CALL — with every gate
  green (`draft_engine.py:440-447`, anchor `second, unguarded route`). Sole defense is the
  human-read unmatched-picks report. Torture room: drifted name + missing id, assert the
  drafted man is absent from the queue.
- **B8 (EMERGENT — the metadata split-brain; MEASURED LIVE in the chamber's first equivalence
  run, 2026-08-20).** The inverse of B6: a pick with a valid `player_id` but empty/absent
  `metadata` joins the board by frozen id — so `my_board_rows` and every lineup delta stay
  CORRECT — while `rosters[]` takes its POSITION from `metadata.position` alone
  (`draft_engine.py:425` `md.get("position", "?")`, `:450`). Our roster then counts as
  `{"?": N}`, `must_fill` sees ZERO filled slots, and **forcing fires rounds early with K/DEF
  in the rebuild** (observed: DEF topping the queue at our 9th pick of a 16-round room).
  Value math right, forcing arithmetic corrupted. Dormant on real Sleeper feeds (metadata is
  always populated); a hard H7 contract for synthetic ones — and a real-feed torture probe:
  what does a partially-populated metadata (position missing, name present) do on draft night?

## C — The endgame forcing

- **C1 (PROMISED).** Trigger is `must_total >= my_remaining > 0` (`draft_engine.py:796`;
  `replay_mock.py:83` identical semantics) — `>=`, not the `==` the prose claims
  (`lineup_value.py:77`). With slack < 0 the filter persists but feasibility is never restored
  (each forced pick decrements both sides by exactly 1). **Scope (fleet find): in the replay,
  forcing exists only inside the DELTA arm** — the naive arm is the no-forcing control by
  construction (`replay_mock.py:76-89`); mutants and diffs must target the delta arm only.
- **C2 (PROMISED, probes rewritten by the fleet).** Forced candidates rebuild from the FULL
  pool, top-3 by board rank per allowed position (`draft_engine.py:798-803`).
  **(a)** The `[:3]`-by-rank can exclude a higher-delta 4th ONLY if board rank and vorp invert
  *within a single position* — measured 2026-08-20: **0 such inversions on the shipped board**
  (within a position, delta is monotone in pts = vorp + constant fill, so top-3-by-rank ≡
  top-3-by-delta today; VBD-LEANS divergence is cross-position and cannot fire this). D1-shaped:
  probe with a synthetic board carrying an inversion; tripwire the real board.
  **(b)** An exhausted position contributes zero candidates — see C7 for what actually happens.
- **C3 (PROMISED).** ENDGAME banner prints above the filtered rows (:811-817; insight 016).
- **C4 (PROMISED).** `must_fill` arithmetic (`lineup_value.py:71-84`). Pinned property (feeds
  C6): the total is non-increasing per added body and decreases by at most 1 — the
  need-decrement and spare-increment cases are mutually exclusive.
- **C5 (ASPIRATIONAL — the chamber's primary target).** Unattended queue-top never strands a
  mandated slot in any feasible room. Observed once (insight 030's replay: DEF1/K1/QB1/RB2/TE1
  filled, re-run 2026-08-20). No code promises it elsewhere; the unpromised surface is exactly
  C7 + B5's drain + B6's back door.
- **C6 (THEOREM on-policy; ASPIRATIONAL off-policy — fleet demotion).** For engine-recommended
  picks, slack (`my_remaining − must_total`) moves by exactly 0 or −1 per own pick and needs
  never reopen — a +1→−1 jump is **arithmetically impossible**, and slack==0 always triggers
  forcing, so on-policy slack never goes negative. **The chamber probe is the off-policy edge:**
  the pick at slack 0 that does NOT come from the filtered list — auto-pick draining past the
  12-row queue (B5), or C7's empty forced rebuild letting Sleeper's board take a non-mandated
  player.
- **C7 (PROMISED — the exhaustion trilemma; corrects v1's "silent").** ALL forced positions
  exhausted: engine prints an EMPTY deltas block → the ladder's B1 refusal fires downstream (an
  accidental tripwire) → the replay path CRASHES unhandled (`min()` on empty /
  `cands[0]` IndexError, `replay_mock.py:91, :95`). **PARTIAL exhaustion (one mandated position
  gone, others stocked) is genuinely silent on every path** — the ENDGAME banner still names
  the slot while the rows silently lack it. The early-K/DEF room (D2) hits all three; the
  chamber expects refusal on the real path, a crash on the fast path, and silence on partial —
  or it misclassifies each.
- **C8 (EMERGENT — engine shape blindness can DISARM forcing).** The engine has NO
  traded-pick/reversal guard (that is the ladder path's `shape.py` only): it trusts each pick's
  `draft_slot` for roster attribution (`:427`) while the clock/wait/between-seats math is pure
  snake (`:403-412`). An exotic-shape room through the raw engine yields rosters-right,
  clock-wrong state at exit 0 — and over-attribution to our seat makes
  `_my_remaining = ROUNDS − len(rosters[MY_SLOT])` hit 0 or negative, which **silently disarms
  forcing** (`_my_remaining > 0`, :796).

## D — The K/DEF deferral

- **D1 (EMERGENT at draft time; the rule lives upstream — fleet correction).** No K/DEF filter
  exists anywhere in the draft-time path (engine, brain, ladder queue, replay). Deferral holds
  because the board ranks them below the window: best K 158, best DEF 151, 0 K/DEF inside rank
  40 (verified 2026-08-20) vs `CANDIDATE_WINDOW = 40`. **The deferral rule DOES exist at
  board-build time:** `rerank.py:reorder()` (:107-126, anchor `K and DEF sink to the bottom`)
  deliberately sinks every K/DEF below every skill player — so the emergence survives any board
  rebuilt through rerank, and breaks only on a board built AROUND it. Counterfactual (engine's
  own comment :789-795): without the window, the math takes a DEF at ~pick 69 the moment the
  lineup saturates (open K/DEF slots pre-fill at 0.0 — B2 — so a candidate K's delta is his
  full flat vorp). Tripwires: `min K/DEF rank > CANDIDATE_WINDOW`; torture with it broken.
- **D2 (EMERGENT — feasibility).** 10 K / 14 DEF on the board for 8 teams needing 8 each
  (verified 2026-08-20): 3 hoarded Ks or 7 DEFs exhaust the position → C7. Scope: exhaustion is
  of the ENGINE'S board pool; real Sleeper bots can draft off-board K/DEF (32 exist), which
  changes nothing for chamber rooms whose picks come from the board.
- **D3 (EMERGENT — the forcing is nearly redundant on the shipped shape; MEASURED by the
  mutant control, 2026-08-20).** In benign full-length rooms, `forcing-removed` was INVISIBLE:
  by the natural forcing time (~pick 110+ of 128), pool shrinkage has pulled K/DEF inside the
  40-deep window anyway, and their positive deltas (open slot pre-fills at 0.0 — B2) beat the
  zero-delta bench, so the un-forced policy fills them regardless. The forcing's bite is real
  but THIN: it requires the pool to still hold 40+ skill players above K/DEF at our final
  picks — reachable via K/DEF hoarding plus deep-drafting rooms, and provable in a shortened
  room (the mutant control's 11-round forcing-bite room strands both slots the moment forcing
  is removed). Consequence: the forcing is the belt over the window's suspenders — keep both,
  and know that battery findings about forcing will concentrate in exotic rooms, not benign
  ones.

## E — Squeeze warnings (advisory surface)

- **E1 (PROMISED — with TWO slacks, never conflated).** `mandatory_squeeze` warns only about
  K/DEF (`MANDATORY_OFF_BOARD`, `precompute_ladder.py:243`): CRITICAL at slack < 0 and
  slack == 0, WARNING at slack 1-2 (:271-285). **This slack is
  `len(our_remaining_picks) − (K/DEF slots owed)` — NOT C6's `my_remaining − must_total`.** With
  skill starters also unfilled, E1's slack reads HIGHER than the true squeeze (3 picks left +
  K, DEF, QB all open → E1 says WARNING slack 1 while every pick is actually spoken for). Skill
  starvation has no squeeze line at all; the ENDGAME banner fires at forcing, not before.
- **E2 (DOCTRINE).** The starvation remedy is the null model — draft them yourself, or clear
  the queue and let Sleeper's board fill K/DEF — never a need-sorted queue (:264-269; insight
  024 defect 3). Fleet note: "Sleeper's fallback fills K/DEF on schedule" is an **n=1
  observation** (Mock #2: Dicker, Patriots), not a documented vendor guarantee.
- **E3 (EMERGENT — the squeeze can silently disarm).** `parse_our_needs` returns `[]` BOTH for
  "starters full" AND for an unparsed/renamed ROSTERS-NEEDS block (:224-231) — a format drift
  disarms the entire squeeze warning as a false-green, unlike the deltas/base parses which
  hard-refuse. Also: slack is pick-count arithmetic only — **zero kickers left on the board with
  picks to spare prints no warning** (no availability term, :271-285). Both are H3 plants.

## F — Ladder gates and output safety

- **F1 (PROMISED, with a named hole — fleet correction).** Hold-back is keyed on the ARMED
  reference vs the cargo's stated identity, NEVER the feed (`resolve_out`, :459-501): mismatch →
  `ladder.<id>.json`; unidentifiable cargo → `ladder.unarmed.json`; explicit `--out` always
  wins. **The hole:** an UNARMED run (stale cargo, :539-543; or the `--cargo temp/draft.json`
  file form without `--draft-id`) whose cargo still states the league's id falls through to the
  LIVE `ladder.json` (:496-501) with the contamination gate disarmed. The chamber NEVER relies
  on F1 — every room passes explicit `--out` into the sandbox; F1 probes target the two enforced
  branches only.
- **F2 (PROMISED — narrower than v1 claimed; fleet refutation).** A traded pick touching OUR
  roster — or traded picks with underivable ownership — refuses (`UnsupportedShape`,
  `shape.py:247-269`, caught `precompute_ladder.py:829-842`, exit 2). A trade between two OTHER
  teams **warns loudly and CONTINUES by design** (our pick numbers stay exact; shape.py:199-216
  records why blanket refusal is the wrong build). A missing traded-picks cargo = check not run
  (:221-236). Chamber asserts refusal ONLY for ours/underivable; warn-and-continue otherwise.
- **F3 (PROMISED).** Snake cross-check: the ladder re-derives the slot from `our_pick` with its
  own snake and refuses on mismatch — a shape check, NOT a seat check (:609-618; insight 005
  named in the comment). **Fleet limit: it cannot catch a SHARED wrong snake** — both sides
  hardcode plain-snake, so on a reversal draft they AGREE and emit a confident queue for the
  wrong pick order. Standalone ladder runs have no snake-type/reversal gate (that lives in
  `shape.py:97-99` on run_engine's path; `grep reversal draft_engine.py` = 0 hits). Dormant on
  this league (`reversal_round: 0` verified) — assert the precondition, then break it.
- **F4 (PROMISED — the ladder's refusal family).** Any nonzero engine exit → ladder SystemExit,
  no degraded output (:327). Fewer than 3 parsed BEST AVAILABLE rows → refusal (:595-598) — a
  near-exhausted synthetic board reads as "format drift". No `YOUR next pick` line (a COMPLETE
  draft) → refusal (:600-602): **the draft's end is structurally unreachable for the ladder.**
  End-of-draft chamber states expect these as oracles, not instrument errors.
- **F5 (PROMISED — seat provenance machinery).** No `--slot` + null `draft_order` → hard NO
  SEAT refusal (:808-815). Three non-interchangeable channels (:298): only the `**` banner
  means seat-unconfirmed; `[unverified]` lines are NOT seat alarms (insight 009's false-red
  direction). A derived seat downgrades the engine's draft_order check to CIRCULAR (:907-923).
  Asymmetry: a stale cargo CANNOT arm the contamination gate but CAN supply the seat, age-noted
  only (:817-822) — the wrong-seat-after-recreate adversarial edge.

## G — Cross-implementation equivalence (the fast path's license)

- **G1 (ASPIRATIONAL — must be PROVEN before the fast path scales; divergence list now
  complete per fleet).** `replay_mock.replay()` delta ≡ engine LINEUP DELTAS top pick at every
  our-pick state. Verified identical: window · `>=` trigger · `(-delta, rank)` tie-break ·
  top-3-per-position rebuild. **Pinned divergences:**
  (a) replay KeyErrors on a no-id board row (`replay_mock.py:92`, second site `:100`) where the
  engine falls back to `vorp + fill` (`draft_engine.py:774-778`) — dormant, 174/174 ids;
  (b) availability keying: replay id-only (`:68`), engine name-OR-id (`:474-475`);
  (c) **rounds/shape sourcing:** replay derives rounds from the feed itself
  (`max(pick_no)//max(draft_slot)`, `:60` — correct only on a COMPLETE recording; truncation
  silently shrinks rounds and SHIFTS the forcing trigger) and hardcodes `LIVE_STARTERS`/
  `FLEX_SLOTS` (`:124`), while the engine takes ROUNDS from argv and honours FF_STARTERS/FF_FLEX
  overrides (`draft_engine.py:78-113`);
  (d) an off-board our-pick (B6) is a state the replay cannot represent at all.
  U3 discipline: sampled cross-checks every run, hard-fail on divergence — with (c)/(d) pinned
  so they are not "rediscovered" as chamber bugs.
- **G2 (EMERGENT — the replay is ungated and optimistically biased).** No integrity gate on the
  fast path: gapped/duplicated/truncated feeds are consumed without complaint (A1 guards the
  engine path only). And **collisions erase opponents' picks**: when our arm takes a player an
  opponent took later, `taken.add` no-ops and the opponent drafts NOTHING — no substitute — so
  the pool our later picks see is richer than any real room (`:68`). The docstring calls this
  "first-order only"; mechanically it is a measurable per-room bias. **Chamber requirement: a
  collision counter reported per room, and integrity checks run on every synthetic feed before
  the fast path consumes it.**

## H — Chamber preconditions and instrument contracts

- **H1 ✅ (2026-08-20, twice).** Insight 030 reproduced to the decimal through the real code:
  naive **695.4** / delta **1087.2** / **+391.8** — by me (0.10s) and independently by the
  verification fleet (0.07s).
- **H2.** A deterministic no-noise room, hand-computable, must match exactly (insight 021).
  128 picks at LEAGUE shape (16 rounds — `docs/league.md`); the committed fixture room is
  120/15. The closed form NEEDS B2's two fill rules (K/DEF = 0.0; FLEX pad = max fill) to land
  to the decimal.
- **H3 (planted mutants — the chamber must catch every one).** Forcing trigger removed ·
  candidate window removed (D1's counterfactual: K/DEF jump the queue at saturation) ·
  board-order queue restored (must reproduce the nine-WR five-QB wreck — naive arm verified
  2026-08-20: QB5/TE1/WR9, zero RB/K/DEF) · `[:3]` rebuild narrowed to `[:1]` ·
  **squeeze silently disarmed** (rename the ROSTERS/NEEDS header — E3's false-green) ·
  **cliff-EMPTY suppressed** (break `parse_cliffs` — no tier ever flags EMPTY while all else
  stays green, `precompute_ladder.py:997`) · **needs()/must_fill divergence** (edit one of the
  parallel twins — see H9). A chamber that misses a plant measures nothing (insight 008).
- **H4 (feasibility accounting, defined inline — v1's dangling citation fixed).** Every
  generated room is accounted for in the run report as PASS, FINDING, or INFEASIBLE, and the
  three counts sum to rooms generated — no silent drops, no silent caps.
- **H5 (measured cost basis, 2026-08-20).** In-process replay, full 15-round room, both arms:
  0.07-0.10s. One engine subprocess: 0.05-0.2s. Full chain: 0.5-0.8s. Real-path budget ≈ 3-4s
  per 16-round room evaluated at every our-pick. Fast path needs G1 proven first.
- **H6 (the scoring oracle, pinned — fleet find).** Decision space and scoring space are
  DIFFERENT metrics by design: arms CHOOSE by marginal points over a replacement-prefilled
  lineup, but are JUDGED by `replay_mock.score()` — raw startable VORP, `fill=None`, an empty
  slot scores ZERO ("this is Sunday", `:107`). score() IS the chamber's scoring oracle;
  swapping the metrics mis-ranks arms and cannot reproduce H1.
- **H7 (room-generator preconditions).** Synthetic picks: well-formed (`pick_no` ≥ 1 present —
  A5/A8), `draft_id` stamped on every pick (A6), `picked_by` stamped consistently or omitted
  (A7), **`metadata` populated with `first_name`/`last_name`/`position`/`team`** (B8 — an empty
  metadata corrupts the forcing arithmetic while every other gate stays green; caught live
  2026-08-20), feeds sorted before `_synth` (A4), integrity-checked before the fast path (G2).
  Synthetic boards: full row schema (`name/r/pr/pos/tier/badges` hard-indexed — KeyError
  mid-print otherwise), **unique normalized names** (`board_by_name` and the ladder's `id_of`
  are both last-wins — a duplicate silently aliases two players), no `⚠`/`·` in names (corrupts
  the cliff-flag cut), no within-position rank/vorp inversions unless deliberately probing
  C2(a), K/DEF below the window unless deliberately probing D1. Cargo staged with deliberate
  encoding (A10). FF_STARTERS/FF_FLEX is the roster-shape injection channel — validated
  loudly, but alien position keys are accepted and become unfillable mandated slots (an
  injectable C7), and FLEX eligibility is hardcoded in two places — flex_ok stays fixed across
  sweeps.
- **H8 (instrument contracts — how the chamber must READ its patient).** The engine's stdout is
  a parse contract: the ↳ note marker is load-bearing (four real notes begin with a digit),
  cliff flags are cut on `\s{2,}[⚠·]`, and no body line may echo a section heading
  (`draft_engine.py:716-724, :698-704, :688-692`). `live_values` refusals fire MID-OUTPUT
  (truncated advisory + nonzero exit — check exit status, not section presence). In a sandbox
  the ADP join fails and the "market" projection silently becomes the null arm — **gate every
  projection reading on `pool_source`** (:376-381). Projection caps: `short_by` reported,
  gap-0 = duplicate run with empty `assumes_gone`, and K/DEF CAN legitimately appear in the
  projection pool (cliff names feed it) though never in the queue — a "no K/DEF anywhere"
  oracle is wrong. `backtest` never forwards `draft_file` (seat runs unstaged there — benign,
  provenance discarded) and hard-refuses zero scored rows.
- **H9 (a free oracle — fleet find).** `draft_engine.needs()` (:503-513) and
  `lineup_value.must_fill` (:71-84) are parallel implementations of the same question, agreeing
  today by construction, enforced by nothing. The chamber asserts their consistency on every
  state — and H3 plants a mutant in one twin to prove the assertion bites.
