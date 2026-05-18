# MUSHRA Listening Protocol — R4 Dash Cadence-Match Gate

> **Operator-facing protocol** for Phase 0 Unit 0.2 Step 3.
> Self-contained — does not require the phase plan open during a run.

## 1. Purpose

Determine whether each engine path (A / B / C-Gemini / C-OpenAI) lands
the Dash narration in the **Target Band** cluster of `cadence-spec.md`
*without* tipping into the **Ceiling** (actor / character recognition).
Output is the Step 4 disposition that locks a single winning voice
path (or escalates to Step 5's Path D / brainstorm-restructure).

This is **register-recognition testing**, not actor-identity testing
(per Roadmap ADR #13, Sterling-CODED not Sterling-cloned). Listeners
rate whether the voice lands in the *deadpan-spy / noir-narrator /
sardonic-detective* cluster — they are NOT asked to identify Benjamin
or Sterling Archer. (Forced-choice Ceiling probe is a measurement
mechanism, not an identity-test goal — see §10.5.)

## 2. Listener count decision (sliding ladder vs full N=6)

Briggsy makes this call at Phase 0 entry. Document the choice here
before recruitment opens:

> **Selected protocol:** _____________ (Tier 1 / Tier 2 / Tier 3 default)
> **Rationale:** _____________
> **Decision date:** _____________

| Tier | N | Listener composition | Pass threshold | Elapsed |
|---|---|---|---|---|
| **Tier 1** (sliding ladder, fast) | 2 | Briggsy + Harry | Both agree winner is Target Band AND neither flags Ceiling (forced-choice probe still mandatory) | ~1 hour |
| **Tier 2** (escalation on split) | 4 | Tier 1 + 2 fresh non-overlapping (1 Archer-fan + 1 cold) | ≥3/4 register cluster AND ≥3/4 character-fit AND no Ceiling triggers AND joint-pass | ~1 week |
| **Tier 3** (default, research-grade) | 6 (8 target) | 3+ Archer-fans + 3+ cold (mix from Discord network) | All four §10 gates + joint-pass per §10.6 | 2–3 weeks |

**Sliding-ladder caveat.** Tier 1 / 2 trade rigor for execution
velocity. Appropriate when Phase 6's cold-decode panel (ADR #21,
fresh listeners) is reliably scheduled to re-validate before
trailer ship. NOT appropriate if Phase 6 re-spec cost would dominate
the saved calendar weeks. Default = Tier 3 unless explicitly waived.

## 3. Recruitment flow

1. **Discord DM template (Briggsy sends to each candidate).** Include:
   - Session length: ~25–30 minutes (hard cap 35).
   - What they'll hear: ~6 short audio clips, ~15s each, deadpan-spy
     register.
   - What they'll do: rate naturalness 0–100, describe each clip in
     their own words, answer 3 yes/no questions per clip.
   - Three candidate 30-min slots over the next 7 days.
   - Privacy/consent note (full text in §4).
   - Compensation: none (peer favor, ack via Discord thanks).

2. **Listener confirmation.** Within 48h, listener selects slot.
   Briggsy records in `listener-roster.md`:
   - Name / Discord handle.
   - Archer-fan / cold flag.
   - Selected slot.
   - Assigned per-listener URL token (see Step 3a `hosting-decision.md`).

3. **Pre-session reminder.** 1 hour before slot, Briggsy DMs the
   WebMUSHRA URL + token + reminder of session shape.

4. **Post-session ack.** Listener confirms "done" via Discord. Briggsy
   verifies results landed in the backend (Cloudflare Worker D1 row
   OR localhost PHP results file per `hosting-decision.md`).

## 4. Consent + retention + privacy notice

Listeners are human subjects providing perception judgments —
GDPR/CCPA-relevant personal data depending on jurisdiction. Required
elements:

**Consent statement** (sent with recruitment DM, repeated on WebMUSHRA
onboarding screen as explicit "I agree" checkbox — NOT a buried ToS
link):

> *You'll listen to ~6 audio clips and provide ratings + open-text
> descriptions. Your responses (ratings, open text, optional
> name/handle for follow-up) will be retained for ~90 days after
> Phase 6 trailer release for evaluation analysis. You may withdraw
> consent and request deletion at any time. Responses are not
> published verbatim outside the BURNED development workspace.*

**Retention policy:**

- 90 days from Phase 6 trailer release date.
- After that, listener-identifying fields are stripped; ratings
  retained anonymized for institutional learning.
- Cross-cited in `PHASE-0-EXIT.md`.

**Deletion-on-request:** any listener emailing / DMing Briggsy can
request full removal. Briggsy deletes within 7 days and confirms by
reply.

## 5. Stimulus set

Six audio clips presented per session (5 + 1 reference if the panel
strictly counts the reference as a separate stimulus — most MUSHRA
setups count the reference as a sub-element of each trial):

| Slot | Clip | Source | Role |
|---|---|---|---|
| Anchor | Band-limited TTS (low quality) | `preflight/anchor-bandlimited.wav` | Calibrates MUSHRA scale toward 0 |
| Reference | Non-Benjamin Sterling-coded voice-actor reel | `reference/reference-clip.wav` (see §6) | Calibrates MUSHRA scale toward 100; is the **cadence target**, not identity reference |
| Candidate 1 | Path A — ElevenLabs Voice Library preset | `elevenlabs/path-a-preset.wav` | Engine candidate |
| Candidate 2 | Path B — Briggsy IVC (if shipped, else skipped) | `elevenlabs/path-b-clone.wav` | Engine candidate |
| Candidate 3 | Path C-Gemini — Director's Chair | `gemini/path-c-gemini.wav` | Engine candidate |
| Candidate 4 | Path C-OpenAI — instructions-steered | `openai/path-c-openai.wav` | Engine candidate |

**Paragraph used:** the 20s deadpan exposition (Paragraph 1) from
`scripts/sample-script-dash.ts` — that single paragraph runs across
all candidates + reference + anchor.

**Reserve for other Units:**

- Scream clip (Paragraph 3) — reserved for **Unit 0.6 R5 Scream Eval**,
  NOT for this MUSHRA panel. Listener fatigue across 12+ judgments
  per stimulus is the constraint.
- Monologue clip (Paragraph 2) — reserved for **character-fit
  confirmation** with a reduced question set after the main eval, if
  the deadpan-exposition results are ambiguous on Question Q3 (§9.3).

## 6. Reference clip selection criteria (LOCKED)

The MUSHRA naturalness threshold is **±10 points relative to this
reference clip**, not an absolute floor. Selection cannot be deferred
to listener-panel start without leaving the gate's anchor
unconstrained.

**Selection rules** (Roadmap P1.20):

1. **Source:** voices.com top-100-rated mid-baritone-male voice-actor
   portfolio reel OR voice123.com equivalent. Must have explicit
   "deadpan / spy / noir narrator / film-noir / sardonic detective"
   demo tagging in actor's profile.
2. **Industry rating:** reel must be rated by ≥3 independent sources
   (voices.com reviews, Backstage profile, actor's own portfolio
   testimonials) as standard-of-genre delivery. Not vanity recordings
   or hobbyist reels.
3. **Independent of Briggsy's network.** Claude (the engineer-on-task)
   selects via marketplace search; candidate list of 3 reels reviewed
   by Briggsy AND the Step 0.5 cold-reader (the non-Archer-fan
   engineering peer who validated the cadence-spec). Both must agree
   the finalist represents the Target Band cluster before lock.
4. **Documented here with:**
   - Source URL.
   - Actor name + license / attribution.
   - Why this reel anchors the cluster (1–2 sentences).
   - The 2 alternates considered + why they didn't win.
5. **Lock timing:** BEFORE stimulus order is finalized (§7) and
   BEFORE listener panel begins. Reference clip filename:
   `reference/reference-clip.wav` (≤15s, trimmed from the actor's
   reel).

### 6.1 Reference clip — selection record

> *To be filled in when Claude completes marketplace research and
> Briggsy + cold-reader sign off.*

- **Finalist:** _____________
- **Actor name:** _____________
- **Source URL:** _____________
- **License / attribution:** _____________
- **Why this anchors the cluster:** _____________
- **Alternate 1 (not selected):** _____________ — _____________
- **Alternate 2 (not selected):** _____________ — _____________
- **Briggsy sign-off date:** _____________
- **Cold-reader sign-off date:** _____________
- **Lock date:** _____________

## 7. Stimulus order — Latin square (P2.30)

"Randomized per listener" with N=6 covers <1% of possible orderings
(6/720 = 0.83%); listener fatigue across slot-1 vs slot-6 creates
systematic ordering bias. Use a 4×4 Latin square covering the 4
candidates + 2 random orderings for the remaining 2 listeners.

The **anchor is always FIRST** for every listener (per ITU-R BS.1534-3
calibration convention). The **reference is always present** in each
MUSHRA trial as the comparison floor/ceiling.

### 7.1 Latin-square assignment table (N=6)

| Listener slot | Anchor | C1 (Path A) | C2 (Path B) | C3 (C-Gemini) | C4 (C-OpenAI) |
|---|---|---|---|---|---|
| L1 | 1 | 2 | 3 | 4 | 5 |
| L2 | 1 | 3 | 4 | 5 | 2 |
| L3 | 1 | 4 | 5 | 2 | 3 |
| L4 | 1 | 5 | 2 | 3 | 4 |
| L5 | 1 | (random — see §7.2) | | | |
| L6 | 1 | (random — see §7.2) | | | |

### 7.2 Random-fill rows for L5 + L6

L5 + L6 receive uniformly-random candidate orderings drawn at panel
start. Record actual assignment here when the WebMUSHRA YAML config
is generated:

- **L5 ordering:** _____________
- **L6 ordering:** _____________

### 7.3 If Path B is dropped (Briggsy declines IVC indefinite retention)

Drop Candidate 2 from the table; Latin square collapses to 3×3 with
3 random orderings for L4–L6. Document the collapse decision in
`results.md`.

## 8. Hosting + access control

Per Step 3a `hosting-decision.md` — read that file for the chosen
hosting path (Cloudflare Tunnel from laptop / Cloudflare Pages
subpath + Worker bridge / VPS fallback) + access-control hardening
(non-guessable subpath + per-listener token + Cloudflare Access).

Required before listener panel begins:

- [ ] Hosting option selected + setup verified.
- [ ] Per-listener tokens generated + recorded in `listener-roster.md`.
- [ ] CSP override applied if Option 2 (Cloudflare Pages subpath).
- [ ] Pollution-recovery procedure documented + token rotation plan
      tested.

## 9. Session UX

Per ITU-R BS.1534-3 + WebMUSHRA conventions:

### 9.1 Onboarding

- Consent checkbox (full §4 text inline, NOT linked).
- MUSHRA explanation: *"You'll hear a reference clip and several test
  clips. Rate each test clip relative to the reference on a 0–100
  scale. 100 = indistinguishable from reference quality. 0 = obviously
  degraded / synthetic."*
- Naturalness definition: *"In this study, 'naturalness' means: does
  this sound like a human deliberately recorded this, vs.
  synthetic / robotic? It is NOT 'is this real audio of a real
  person.'"*
- Session length estimate: ~25 minutes. Hard cap 35.

### 9.2 Practice trial

- Use a generic voice-actor demo clip (NOT one of the test stimuli).
- Listener rates → instant feedback that's NOT scored.
- Purpose: calibrate the slider + acclimate to the question shape.

### 9.3 Anchor calibration

- Low-quality anchor MUST be explicitly rated first.
- If listener rates anchor >40, prompt is shown: *"This was meant as
  a low-quality reference — are you sure?"* with option to re-rate.
- Anchor calibration grounds the MUSHRA scale toward 0.

### 9.4 Main trial (4 candidates × question set in §10)

- Each candidate presented in the listener's Latin-square slot.
- Per-stimulus question set in §10.
- Listener can replay each clip unlimited times.
- Responses persist locally in browser storage between stimuli
  (closing the tab mid-session + re-entering with the same token
  resumes from last-rated stimulus).

### 9.5 Completion screen

- Confirmation: *"Thank you — your responses have been recorded.
  You can close this tab now. Briggsy will follow up if any response
  needs clarification."*
- Triggers final results-submit POST (idempotent — duplicate submits
  deduplicated by listener token).
- On submission failure: *"Your responses didn't save. Please retry,
  or message Briggsy in Discord if this persists"* + Retry button.

## 10. Question instrument (per stimulus)

Five questions per candidate stimulus. Reference + anchor get only
the naturalness rating (Q1).

### 10.1 Q1 — Naturalness (MUSHRA standard)

> *"Rate this clip's naturalness from 0–100."*

Slider, 0–100. Anchored to the reference clip (rated ~100 by listener
under usual MUSHRA convention).

### 10.2 Q2 — Open description (Target Band detection)

> *"Describe this voice in your own words — register, tone, character
> archetype it suggests."*

Free-text response, ~30 seconds of typing. Listening for descriptors
in the Sterling-coded register cluster:

- Target Band cluster: *deadpan, dry, sardonic, spy, detective,
  film-noir, briefing-room, noir-narrator, Twilight-Zone-adjacent,
  Marlowe-adjacent, world-weary, 1940s-detective, wry, arched,
  Archer-coded*
- Floor cluster: *generic narrator, audiobook, documentary,
  AI-assistant, podcast-intro, neutral, doesn't sound like anything*

NOT listening for actor names (Q5 handles that explicitly).

### 10.3 Q3 — Character-fit (the trailer's brief)

> *"Does this voice match a fictional spy-agency briefer named Dash
> Barlowe, narrating ~90% of a short trailer's runtime?"*

Options: **Yes** / **No** / **Mixed**.

### 10.4 Q4 — Uncanny check

> *"Does anything about this voice sound obviously synthetic or off?"*

Options: **Yes** / **No** + free-text *"If yes, what?"*

### 10.5 Q5 — Forced-choice Ceiling probe (MANDATORY per stimulus)

> *"Does this voice sound like any specific actor or character you
> can name? If yes, who, and how confident are you that it's them?"*

Options: **No** / **Yes (low confidence)** / **Yes (med confidence)**
/ **Yes (high confidence)** + free-text *"who?"*

**Why mandatory** (P1.15): engineering-peer listeners often don't
volunteer "Jon Benjamin" or "Sterling Archer" in open description
(politeness, vocabulary gap, no actor-name in working memory).
Conditional follow-up depended on unprompted volunteering — Ceiling
drift slipped through that gate historically. Forced choice makes
Ceiling detection a measurement, not a hope.

**Ceiling trigger** (§11):

- ANY **Yes (med)** or **Yes (high)** response naming "Jon Benjamin"
  / "Sterling Archer" / "Archer" → Ceiling band triggered.
- **No** or **Yes (low)** → no Ceiling trigger (low-confidence hits
  are noise; engineering peers may guess characters under prompt
  pressure even when the stimulus is non-specific).

### 10.6 Bonus-signal disambiguation (conditional follow-up)

If a listener invokes Archer / Sterling unprompted in Q2 open
description, the protocol shows a follow-up question:

> *"You mentioned Archer / Sterling — does this voice sound like the
> same ACTOR (you'd recognize the speaker), or the same STYLE
> (deadpan-spy register but a different voice)?"*

- **Same style** → register pass, target achieved.
- **Same actor** → Ceiling band triggered (per §11).

## 11. Acceptance threshold (Step 4)

A candidate clears R4 IFF **all four individual gates pass AND the
joint-pass requirement is satisfied**:

### 11.1 Register cluster

≥4 of 6 listeners' Q2 open-description responses include ≥2 terms
from the Sterling-coded register cluster (deadpan / dry / sardonic /
spy / detective / film-noir / Archer-coded / briefing-room /
noir-narrator / Marlowe-adjacent / Twilight-Zone-adjacent / wry /
world-weary / 1940s-detective). Term matching is **case-insensitive
substring** — "Deadpan-spy" matches "deadpan" + "spy".

### 11.2 Character-fit

≥5 of 6 listeners answer Q3 **Yes** or **Mixed**. Tighter than the
register-cluster gate because character-fit directly tests the
trailer's brief; register-cluster tolerates phrasing variance,
character-fit doesn't.

### 11.3 Uncanny check

≤1 of 6 listeners answer Q4 **Yes** ("obviously synthetic") with
free-text capture of what sounded synthetic. Zero-of-6 is
hair-trigger-brittle (any single false-positive kills a candidate);
one-of-6 with diagnostic free-text is defensible — Briggsy + Claude
triage what sounded synthetic at Step 5 (engine artifact vs.
cadence-spec problem vs. listener taste).

### 11.4 MUSHRA naturalness

Mean Q1 naturalness within **±10 points** of the reference clip's
mean Q1 rating. Reference-anchored, not an absolute threshold.
Production TTS in 2024–2025 literature clusters 65–85 MUSHRA against
high-quality references; anchoring to OUR specific reference clip is
the ITU-R BS.1534-3 convention and removes the floating-absolute
problem.

### 11.5 Joint-pass

≥4 listeners must clear **register-cluster AND character-fit AND not
flag synthetic** — **same listener across all three dimensions**.

Without joint-pass, a candidate could pass each individual gate 4-of-6
with *different* 4s — meaning *no single listener* cleared all three
for the same candidate. Joint-pass ensures coherent endorsement.

### 11.6 No Ceiling trigger

ANY Ceiling trigger (Q5 forced-choice med/high naming Benjamin /
Sterling / Archer OR Q2-derived bonus-signal "same actor") →
Ceiling halt procedure (§12). Independent gate: a candidate that
passes 11.1–11.5 but triggers Ceiling is DISQUALIFIED.

### 11.7 Multi-candidate winner selection

If multiple engines clear all six gates, pick **lowest-cost** (cheapest
to operate over Phase 2 voice-pipeline production runs).

## 12. Ceiling-band halt procedure (MANDATORY)

When Ceiling band triggers (either via Q5 forced-choice or Q2
bonus-signal):

1. **Do NOT lock this candidate** under any disposition (cleared /
   restructured / cut). The candidate is dead for Phase 0.
2. **Step 5 re-spec triggers** — strip identity-suggesting
   characteristics from `cadence-spec.md` (typically: remove any
   mannerism that recapitulates Benjamin's specific vowel placement,
   laugh signature, or rhythmic tic; tighten the "What NOT to encode"
   §3.7 row of the cadence-spec table).
3. **Spec-revision cap: 3 rounds.** After three Step-4 Ceiling-trigger
   failures, the cadence-spec is treated as fundamentally unachievable
   at the Sterling-CODED bar with the legal floor intact. Surface to
   Briggsy as a **brainstorm-level question** routing to Step 5's
   Brainstorm-Restructure Memo (the played-straight Sterling-CODED
   thesis may need to ship synthetic-tinged OR pivot form factor —
   see plan Step 5 Options (i) / (iv)).
4. **`PHASE-0-EXIT.md` records the Ceiling history.** Fields:
   - `Ceiling-band triggered: [Y/N]`
   - `Re-spec iterations: [N]`
   - `Final disposition cleared after re-spec: [Y/N]`
5. **Listener follow-up:** any listener whose response triggered
   Ceiling gets a personal Discord ack from Briggsy: *"Thanks — you
   spotted what we were testing for. We're re-running with adjusted
   spec."* No data is silently discarded.

## 13. Voice lock is PROVISIONAL until Phase 6

Even when Step 4 clears (all four individual gates + joint-pass + no
Ceiling trigger), the locked voice is **not absolute**. Phase 6 runs
a separate N=6 cold-decode panel (ADR #21) with FRESH listeners who
have NOT participated in Phase 0. If Phase 6's panel volunteers
"that's Archer" / "this IS Sterling," the voice lock is invalidated
mid-Phase-6.

**Rollback contract** (cross-cited in `PHASE-0-EXIT.md`):

- Phase 0 disposition records `Voice lock provisional: Y` — Phase 6
  N=6 cold-decode panel must re-validate before disposition becomes
  final.
- **Phase 4-entry mini-cold-decode (optional but recommended).**
  Before Phase 4 commits scenes to rendering, run a 2-listener
  cold-decode mini-panel on a single ~20s rendered scene with the
  locked voice. Mini-panel listeners NOT from Phase 0 pool. If
  mini-panel volunteers Ceiling, halt scene commits and re-spec.
- **Phase 6 re-spec budget.** If Phase 6 N=6 panel triggers Ceiling:
  Phase 0 Step 5 re-spec (~$24 ElevenLabs re-run + 3–7 days new
  panel) + Phase 4 re-render of every voiced scene (~12–24 hours
  render time at production CRF). Budget = 2–4 weeks elapsed + ~$24
  engine spend. Documented expected-cost, not a project-killer.
- **Phase 6 listener-pool independence.** ADR #21 — Phase 6's N=6
  panel must be FRESH listeners, zero overlap with Phase 0's pool.

## 14. Failure → Step 5 fail-action ladder

If Step 4 fails (any gate, any Ceiling trigger), route to the plan's
**Step 5 Fail-Action Ladder**:

- **Path A fail** → try Path B.
- **Path B fail** → eliminate Path B (no Professional Voice Cloning
  auto-escalation), proceed to Path C (C-Gemini first, then C-OpenAI).
- **Both Path C variants fail** → Phase 0 exits with **Path D
  Sub-phase 0a deliverable**: voice-actor casting brief + AI-disclosure
  contract template + budget request ($150–500 for 60–90s read).
  Briggsy explicitly approves spend + contract before casting begins.
- **3-round spec-revision cap exceeded across all paths** → brainstorm-
  restructure memo (Sterling-CODED thesis may need to pivot).

## 15. Amendments

| Date | Change | Trigger |
|---|---|---|
| 2026-05-17 | Initial draft. | Step 3 protocol-doc deliverable. |
