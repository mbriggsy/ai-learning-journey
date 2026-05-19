# Music sourcing — Unit 1.7 (Phase 1 lock: ladder + criteria + cue-map; Phase 3 owns procurement)

> Status: source-type ladder LOCKED, track-shape path LOCKED (Path A —
> full-length composition clip-to-95s), audition framework declared,
> music-cue map shipped to BEAT-SHEET.md preamble. Actual marketplace
> auditioning is a Phase 3 deliverable per plan (Phase 1 declares
> criteria + cue-map; Phase 3 executes audition + procures + files
> `videos/trailer/public/audio/music-bed.mp3`).

## Source-type ladder (LOCKED — DOC-REVIEW elevated marketplace to Tier 2)

| Tier | Source | Audition gate | Verdict |
|------|--------|---------------|---------|
| **1** | **Artlist Pro** ($199/yr) OR **Epidemic Sound Pro** ($204/yr) subscription catalog | 20–30 results per platform across multiple tag intersections → 8–10 finalists → 3 finalists → audition against full BEAT-SHEET.md timing. Lock 1 if any finalist clears §2.2 quality bar. | **Primary** |
| **2** | **Marmoset** / **Songtradr** per-track marketplace ($30–$200/track) | 5–8 hand-picked candidates per platform → audition against BEAT-SHEET.md timing. Lock 1 if any candidate clears §2.2. | **Second-tier-before-Suno** (DOC-REVIEW elevated from reserve-only — copyright vesting + non-AI source materially matters for a portfolio recruiting artifact) |
| **3** | **Suno Pro** ($10/mo) generative | Prompt template + structure (Step 4). | **Last resort.** Fires `music_disclosure_required: true` flag in BEAT-SHEET.md preamble → Phase 7 distribution copy carries AI-music disclosure language |

**Struck from candidate pool:**

- **Udio** — November 2025 settlement disabled all external downloads;
  in-platform streaming/remixing only as of 2026; no `.mp3` export
  possible.
- **Musicbed Individual / Business** — $329.89–$1,208.88/yr (Individual)
  or $1,099–$2,428.88/yr (Business). Over budget for portfolio-piece.
- **Licensed published-artist track** — $500–5000+ for sync license;
  not justified at portfolio-trailer scale.
- **Mubert / Beatoven / Loudly** — surveyed; none Sterling-CODED.
  Documentation hygiene only, not real alternatives.

## Track-shape decision (Step 2.5 — LOCKED Path A)

Audition pass needs a commit to shape BEFORE searching, to avoid wasting
time on mismatched-shape candidates.

| Path | Track shape | Edit complexity | Lossless segments | Status |
|------|-------------|-----------------|-------------------|--------|
| **A (LOCKED default)** | Full-length composition (2:30–3:30) | Clip 95s from a high-arc section; lose either natural intro or resolved outro | Intro + ~60s mid + outro (sting) | **Locked** |
| B (fallback) | 60s cinematic short | Add ~35s loop in mid-section, hide seam under cascade peak | Original intro + outro | Fires only if zero Path A candidate survives Tier 1+2 audition |
| C (edge case) | Two stems from one track | Use intro stem 0–30s + climax stem 30–95s | Both stems | Reserved for licensed-track-with-stems edge case (not expected) |

**Rationale (Path A default):** full-length compositions are the catalog
norm — most Artlist / Epidemic / Marmoset tracks land 2:30–3:30 and
include the dynamic arc the cascade needs (intro → build → peak →
fall → close). Clipping 95s from a high-arc section gets the structural
shape without seam-hiding work. Phase 3 may surface a Path B candidate
during audition; if it outranks Path A finalists on §2.2, the path
decision opens for re-derivation.

## Tier 1 audition criteria

Search criteria for Artlist Pro / Epidemic Sound Pro:

- **Genre:** mid-century brass / bossa nova / spy jazz / lounge
- **BPM:** 100–130 (matches Archer underscore pacing)
- **Mood:** confident, slightly playful, deadpan — **NOT** goofy / wacky
- **Instrumentation:** brass (trumpet / sax lead), upright bass,
  syncopated drums, optional vibraphone or organ accent
- **Length:** ≥95s or loop-friendly (Path A default — full-length)
- **Dynamic shape (LOAD-BEARING):** at least 2 dynamic phases. The
  cascade needs music to swell into the stacked-payoff beat at frames
  1860–1950, **duck pre-anticipated 90% → 30% over frames 1980–2010**
  (matching `transitions.ts` `PAYOFF_DUCK_RAMP_FRAMES`), swell back for
  closing at S06.

Specific reference points (from Archer / similar productions):

- Archer title sequence: "Danger Zone" by Kenny Loggins — pop-rock
  saxophone-led 80s; NOT actually the target. The brainstorm specifies
  the *underscore* mood, not the *title-sequence* mood.
- "Take Five" Dave Brubeck — vibraphone-bass-drums cool jazz mid-century
- "The Look of Love" Burt Bacharach — bossa-noir mid-century
- "Sukiyaki" Kyu Sakamoto — sad-cool brass instrumental cover
- Mancini-era Pink Panther underscore — playful brass / vibraphone

## Tier 1 auditioning protocol (Phase 3 owns execution)

1. **Tag-intersection sweep.** Pull 20–30 results per platform across
   tag intersections like ("spy" + "jazz"), ("bossa" + "instrumental"),
   ("mid-century" + "lounge"), ("noir" + "brass").
2. **First-pass filter to 8–10 candidates.** Match BPM 100–130 + ≥95s
   + 2+ dynamic phases.
3. **Beat-sheet audition.** Audition each candidate in a 30s clip
   against BEAT-SHEET.md scene timing. Pay attention to whether the
   candidate's natural dynamic shape lines up with the cascade arc
   (1050 build → 1860 peak → 1950 stamp → 2010 duck → 2580 close).
4. **Narrow to 3 finalists.** Three listening passes per finalist
   against the full beat sheet.
5. **§2.2 quality gate.** Lock 1 finalist if it clears the Archer-frame
   acceptance test (every frame Archer-grade). Else escalate to Tier 2.

## Tier 2 auditioning protocol (DOC-REVIEW NEW)

1. **Hand-pick.** 5–8 candidates per platform (Marmoset + Songtradr),
   same BPM 100–130 + brass/bossa core criteria as Tier 1.
2. **Beat-sheet audition.** Same protocol as Tier 1 step 3.
3. **§2.2 quality gate.** Lock 1 if any candidate clears. Else escalate
   to Tier 3 (Suno) **with explicit `music_disclosure_required: true`
   flag** added to BEAT-SHEET.md preamble.

## Tier 3 fallback (Suno Pro — DOC-REVIEW: LAST-RESORT, not expected)

Suno commercial-use rights (ToS — check current at execution time):

- Apply to **Pro ($10/mo) and Premier ($30/mo)** tiers. NOT a "Producer"
  tier (early-2025 draft naming, no longer used).
- Subscription must be **active at time of generation**. Free-tier
  generations cannot be retroactively commercialized by upgrading.
- Suno grants perpetual commercial-use license but **does not represent
  that copyright vests in the output**. For a portfolio piece this
  means the trailer's music bed is un-copyrightable as a discrete
  asset.
- AI-generated audio disclosure required on platforms that demand it.

**If Suno fires (DOC-REVIEW SECURITY-LENS):** BEAT-SHEET.md preamble
locks `music_disclosure_required: true`. Phase 7 distribution copy MUST
include AI-music disclosure language in the X post body + portfolio
embed caption ("Music: AI-generated via Suno Pro" or equivalent). This
is separate from the cold-decode copy about agentic-build origin — the
disclosure obligations are distinct claims. Phase 7 plan must absorb
the AI-music-disclosure obligation if Tier 3 fires.

Budget Pro $10/mo as last-resort insurance (no longer "expected
fallback"). If fallback fires, retain subscription receipt + generation
timestamp + the disclosure-flag in `music-license.pdf`.

### Suno prompt template (per plan Step 4)

```
Instrumental mid-century brass / bossa nova spy jazz, 60s
Mancini-Bacharach influence, syncopated trumpet + saxophone lead,
upright bass, brushed drums, vibraphone accents on offbeats.
110bpm, key of D minor. Mood: confident, sardonic, deadpan, slight
playfulness. Structure: 8-bar intro / 32-bar build / 4-bar peak /
8-bar fall to bass-and-drums-only bed / 16-bar close on lead brass.
```

## Pick-rationale criteria (any tier)

A candidate locks IFF:

- 95s+ playable length OR loops cleanly at ≤4-bar increments (Path B)
  OR usable stems available (Path C)
- Has a discernible cascade-friendly structure (intro → build → peak
  → fall → close — at least 2 dynamic phases)
- Brass / bossa core, **not** piano-led generic
- License covers portfolio + Twitter/X distribution (verified via
  Artlist Pro or Epidemic Sound Pro terms-pages)
- Subscription cost ≤$250/yr (Artlist Pro $199 OR Epidemic Pro $204
  covered; Musicbed Individual $329+ over budget); per-track marketplace
  single-license ≤$200 if a hand-picked match outranks the subscription
  catalog

Picked track documented (Phase 3) with: title, artist, source URL,
license type, license-active-period, download path, BPM, key, duration,
edit path (A/B/C). License PDF (or terms-page archive) filed to
`videos/trailer/sample-eval/beat-sheet/music-license.pdf`.

## Music-cue map (LOCKED — shipped to BEAT-SHEET.md preamble)

Each cell declares whether the volume transition is a `step` (single-
frame jump — only acceptable when masked by other audio) or a
`ramp(N frames)` (linear envelope over N frames, no click). Phase 4
implements via `<Audio volume={(f) => interpolate(...)}>` with the
ramp specs below.

| Frame range | Music state | Volume target | Transition shape |
|-------------|-------------|---------------|------------------|
| 0–60 | Brass hook intro | 100% | step (intro is the start) |
| 60–210 | Bed under cold-open speaker | 40% | ramp(30) from 100→40 starting at frame 30 (pre-anticipates the cold-open line at 60) |
| 210–570 | Underscore build (briefing setup) | 50% | ramp(60) from 40→50 starting at S02_START |
| 570–1050 | Continue build (mission background) | 55% | ramp(60) from 50→55 starting at S03_START |
| 1050–1680 | Cascade open, music swells | 60→75% | ramp(630) linear swell across the whole "stat" portion of cascade |
| 1680–1860 | Peak intensification (VO continues through this band; here we just brighten) | 90% | ramp(180) from 75→90 |
| 1860–1950 | Cascade peak hold (no VO) | 90% | hold |
| 1950–1980 | Stamp slap + payoff VO begins; music holds | 90% | hold |
| **1980–2010** | **Pre-anticipated payoff duck** (completes as VO ends) | **30%** | **ramp(30) from 90→30** — `PAYOFF_DUCK_RAMP_FRAMES` per `transitions.ts` |
| 2010–2040 | Bed-only silent visual hold | 30% | hold |
| 2040–2535 | Sparse bed under gameplay capture | 30% | hold (hard cut at 2040; music continues at 30% across the cut — no cross-dissolve) |
| 2535–2580 | Iris-wipe (45 frames) — music rises | 50% | ramp(45) from 30→50 |
| 2580–2790 | Closing underscore | 60% | ramp(60) from 50→60 |
| 2790–2850 | Final brass sting on logo land | 100% | ramp(30) from 60→100 across logo-and-stamp window |

**Anti-pattern guard:** no 60-percentage-point cliffs (the first-draft
1950 sharp drop 90→30 would have clicked audibly). All transitions are
ramped envelopes or held holds.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Music sourcing returns no clean candidates | **Medium-High** (95s cascade-arc + brass/bossa is a low-hit-rate ask) | Medium | Tier 1 audition expanded to 20–30 candidates per platform + 8–10 finalists (was 3). Tier 2 marketplace ($30–$200) elevated to second-tier-before-Suno. Tier 3 Suno fallback budgeted at $10/mo regardless. |
| Suno fallback fires + AI-disclosure obligation flows to Phase 7 | Low (after Tier 1+2 expanded coverage) | Medium | `music_disclosure_required: true` flag in BEAT-SHEET.md preamble + Phase 7 plan absorbs the disclosure obligation. |
| Path A clip-to-95s loses dynamic arc | Low (catalog norm includes arc) | High (cascade payoff loses musical lift) | §2.2 audition gate catches; if Path A finalists all flatline, escalate to Path B (60s short + loop) for next audition round. |
| Music volume cliff at 1950 would click | Resolved | Medium | All transitions ramped envelopes or holds; 60-pt cliff replaced with pre-anticipated 30-frame duck completing at VO end (per `PAYOFF_DUCK_RAMP_FRAMES`). |

## Patterns to follow

- UMB v3 music: Charon noir solo narration over restrained underscore
  (Suno-generated per UMB workflow). **BURNED elevates to licensed
  brass-bossa per R9.**
- License documentation discipline: every track shipped to the trailer
  needs an archived license artifact (Artlist/Epidemic subscription
  active-period proof; Marmoset/Songtradr per-track receipt; Suno
  subscription receipt + generation timestamp).

## Verification

- [x] Source-type ladder locked (Tier 1 → 2 → 3).
- [x] Path A track-shape default locked.
- [x] Tier 1 + Tier 2 audition protocols documented.
- [x] Suno prompt template + disclosure obligation documented.
- [x] Music-cue map filled in BEAT-SHEET.md preamble (with ramp/step
      column).
- [ ] **Phase 3 owns:** actual `music-license.pdf` filing +
      `videos/trailer/public/audio/music-bed.mp3` deliverable. Out of
      Phase 1 scope per plan (Phase 1 locks source-type + criteria +
      cue-map; Phase 3 executes audition + procures + files).
