# Voice cast lock — Unit 1.3 evidence

**Date:** 2026-05-18
**Author:** Phase 1 Unit 1.3 (Voice Cast Lock & Per-Line Assignment)
**Status:** ✅ Both voices locked from Phase 0 outcomes — no Path D
escalation, no deferred sub-units, no scream reopen.

## Phase 0 → Phase 1 outcome trace

| Phase 0 unit | Outcome (sentinel-locked)                                                                                              | Source                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Unit 0.2 (R4) | **Path A — ElevenLabs Roger**, voice ID `CwhRBWXzGAHq8TQ4Fs17`, model `eleven_v3`, Roger-defaults voice_settings        | `videos/trailer/PHASE-0-EXIT.md` §Section 1                                                     |
| Unit 0.3 (R14) | **Janet** (Malory-coded executive-dryness matriarch) voiced by **ElevenLabs Eleanor – Gracious and Authoritative** (Shared Library) `2qQJWjw5XdG80GreshqG`, model `eleven_v3`, **cunty-matriarch-tuned** voice_settings (NOT Roger defaults). Phase 0 originally locked Sloane (`m8AHWg36LJTQWKmfeGVv`); Phase 2 Unit 2.3 re-locked to Eleanor after the cunty canary rejected Sloane as too polished. | `videos/trailer/PHASE-0-EXIT.md` §Section 2 (Phase 0 Sloane lock) + Phase 2 Unit 2.3 (Eleanor re-lock) |
| Unit 0.4 (R2) | Played-straight Sterling-CODED tone gate cleared; earned-Phrasing! mechanic locked (entendre setup required)            | `videos/trailer/sample-eval/tone/eval.md`                                                       |
| Unit 0.6 (R5) | **R5 KEPT** — Sterling-LANA scream `VEEEEEEEERAAAA!!!` cleared via Path A Roger with `[shouts]` bracket-tag self-closing | `videos/trailer/sample-eval/r5-scream/scream-eval.md`                                           |

**Voice cast count: 2** (Dash + Janet). Sable / Vera / Neal / Otto / Agent X retain visual roster slots in S03 card flash only — no VO lines.

**Path D NOT engaged.** Phase 0 Unit 0.2 cleared Path A on first pass (no need to escalate to voice-actor delivery). Unit 1.3a (engine selection + cadence-adapter prefixTag locks + voice-preset IDs) fires immediately on Phase 0 exit. Unit 1.3b (Path D actor casting / studio booking / NDA / 1-3 week wait) is **deferred indefinitely** — no work scheduled. Phase 2 voice pipeline can begin against the full locked cast.

## Branch resolution (R5 + R14 outcome matrix)

Per Critical Constraints §Voice-cast cap, four reachable branches in
the R5 × R14 outcome matrix. Phase 0 outcomes resolve to **Row 2**:

| R5 outcome | R14 cold-open speaker | Speaking roles | Scream beat |
|------------|----------------------|----------------|-------------|
| Kept (Path A cleared) | Vera | Dash + Vera | Dash screams Vera's name at frame 2730 |
| **Kept (Path A cleared, Phase 0 locked)** | **Janet** | **Dash + Janet** | **Dash screams Vera's name at frame 2730; Vera visible in S03 card flash only** ← **THIS BRANCH** |
| Kept | Sable | Dash + Sable | Dash screams Vera's name at frame 2730; Vera visible in S03 card flash only |
| Cut (Vera removed) | Sable | Dash + Sable | Frame 2730 beat replaced with chuckle SFX from gameplay |
| Cut (Vera removed) | Janet | Dash + Janet | Same |

## Per-line voice + engine assignment (16 cues)

Every line in `videos/trailer/src/lib/script.ts BURNED_TRAILER_LINES`
carries a `voice` field (one of `'dash' | 'sable' | 'janet' | 'vera'`)
and a `cadenceAdapter.engine` field. The shipped state:

| Line ID            | Scene | Frame | Voice  | Engine          | prefixTag         | Notes                                                                                                                                                                          |
| ------------------ | ----- | ----- | ------ | --------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S01-cold-open      | S01   | 60    | janet  | elevenlabs-v3   | `[sarcastic]`     | Inline `[sarcastic]` tag before "Honestly" per Phase 0 Unit 0.3 cadence-spec.md. **voice_settings override via `scripts/cold-open-prototype.ts COLD_OPEN_SPEAKER`** — see handoff §below |
| S02-briefing       | S02   | 219   | dash   | elevenlabs-v3   | `[sarcastic]`     | Sterling-CODED briefing-room formality                                                                                                                                          |
| S03-roster         | S03   | 570   | dash   | elevenlabs-v3   | `[sarcastic]`     | 3× `[BEAT 0.3s]` internal markers expand to per-engine pause primitive                                                                                                          |
| S03-deck           | S03   | 1007  | dash   | elevenlabs-v3   | `[sarcastic]`     | 2× `[BEAT 0.4s]`/`[BEAT 0.3s]`; trailing "Or ensure your colleagues don't." runs without preceding beat                                                                          |
| S04-cue-01         | S04   | 1380  | dash   | elevenlabs-v3   | `[sarcastic]`     | 2-word cascade ledge                                                                                                                                                            |
| S04-cue-02         | S04   | 1440  | dash   | elevenlabs-v3   | `[sarcastic]`     | HTP scroll begins                                                                                                                                                               |
| S04-cue-03         | S04   | 1530  | dash   | elevenlabs-v3   | `[sarcastic]`     | "name redacted for compliance" in-character substitute                                                                                                                          |
| S04-stat-01        | S04   | 1620  | dash   | elevenlabs-v3   | `[sarcastic]`     | Stat 1 enters                                                                                                                                                                   |
| S04-stat-02        | S04   | 1740  | dash   | elevenlabs-v3   | `[sarcastic]`     | Stat 1 decays; Stat 2 enters                                                                                                                                                    |
| S04-stat-03        | S04   | 1890  | dash   | elevenlabs-v3   | `[sarcastic]`     | Stat 3 enters                                                                                                                                                                   |
| S04-stat-04        | S04   | 2010  | dash   | elevenlabs-v3   | `[sarcastic]`     | Source-fixed: "research budget" matches `ActRoster.tsx:153-158`                                                                                                                 |
| S04-payoff         | S04   | 2280  | dash   | elevenlabs-v3   | `[sarcastic]`     | R3 truth-collision; leadFramesHint 2; fadeInMs 5 / fadeOutMs 30                                                                                                                  |
| S05-gameplay-vo    | S05   | 2610  | dash   | elevenlabs-v3   | `[sarcastic]`     | Em-dash pauses for sotto-voce conspiratorial register                                                                                                                           |
| S05-scream         | S05   | 2730  | dash   | elevenlabs-v3   | `[shouts]`        | Self-closing ElevenLabs v3 tag; Sterling-LANA four-axis shape; `skipSilenceremove: true`; `fadeInMs: 0`                                                                          |
| S06-close          | S06   | 2910  | dash   | elevenlabs-v3   | `[sarcastic]`     | Earned-Phrasing! setup ("Hold it tight" carries the entendre)                                                                                                                   |
| S06-phrasing       | S06   | 3144  | dash   | elevenlabs-v3   | `[excited]`       | `fadeOutMs: 50` with FFmpeg qsin curve per plan Step 7. Interjective callback cadence — `PHRASING_INTERJECTIVE_SETTINGS` in `elevenlabs.ts` (stab 0.30 / style 0.65 / speed 1.05) per Phase 2 Unit 2.4 re-tune.  |

## Janet voice_settings handoff mechanism

The amendment 2026-05-18 open follow-up flagged a decision: how does
Phase 2 know Janet's `voice_settings` differ from Dash's Roger
defaults? **Two options:**

- **(A)** Extend `Line` schema with `voiceSettingsOverride?:
  ElevenLabsVoiceSettings` field — explicit per-line override carried
  in the machine contract.
- **(B)** Phase 2 reads from
  `videos/trailer/scripts/cold-open-prototype.ts COLD_OPEN_SPEAKER`
  constant when `voice === 'janet'` — implicit cross-reference;
  Janet's settings are the canonical override anywhere she speaks.

**Locked: Option (B).** Reasoning:

1. **Single source of truth.** The Eleanor cunty-matriarch-tuned profile
   (Phase 2 Unit 2.3 re-lock; was Sloane in Phase 0) is already locked in
   `COLD_OPEN_SPEAKER.voiceSettings` with a contract test asserting the
   profile shape (`cold-open-prototype.test.ts`). Duplicating into a
   `Line.voiceSettingsOverride` field creates two surfaces that can
   silently diverge.
2. **Scope.** Only one Line carries the Janet voice in the current
   trailer (S01-cold-open). Adding a schema field for a single use
   case is over-engineering.
3. **Future Janet dialogue.** If Phase 4 author additional Janet
   beats, they all flow through the same Phase 0 contract — the
   override stays consistent by construction.
4. **Phase 2 implementation cost.** Phase 2 voice pipeline branches
   on `voice` already to dispatch per-engine renderers. Adding "when
   `voice === 'janet'`, import `COLD_OPEN_SPEAKER.voiceSettings`" is
   a 3-line change.

The S01-cold-open `Line.cadenceAdapter.notes` field carries the
explicit pointer:

> `"Inline [sarcastic] tag before 'Honestly' per Phase 0 Unit 0.3
> cadence-spec.md. Voice settings override per COLD_OPEN_SPEAKER
> constant in scripts/cold-open-prototype.ts (Eleanor cunty-matriarch-
> tuned per Phase 2 Unit 2.3 re-lock: stability 0.40, similarity 0.75,
> style 0.45, speaker_boost true, speed 0.85). Voice ID
> 2qQJWjw5XdG80GreshqG (Shared Library)."`

If a future revision adds a second non-Dash voice (Sable / Vera /
Neal / Otto), the handoff mechanism extends naturally: each named
voice maps to a Phase 0 prototype constant that owns the override.
The schema stays clean.

## Total runtime accounting (R4 share check)

R4 requires Dash sustained narration **~90% of voiced runtime** (per
DOC-REVIEW product-lens resolution — "of voiced runtime" not "of
total clock"; Phase 1 doesn't ship a re-open hedge).

| Voice  | Spoken seconds (sum of expectedFrames / FPS)                          | Share        |
| ------ | --------------------------------------------------------------------- | ------------ |
| Janet  | 5.00 s (S01-cold-open: 150 frames)                                    | 6.6 %        |
| Dash   | 70.17 s (sum of remaining 15 cues' expectedFrames)                    | **93.4 %**   |
| **Total voiced** | **75.17 s**                                                     | **100 %**    |

**93.4 % ≥ 90 % R4 target.** ✓

Total clock: 106.00 s. Voiced: 75.17 s. Unvoiced surface: 30.83 s
(gameplay audio carries S05 between scream cue + iris wipe; brass
hook + R15 #1 stamp at S01 head; music duck + 1.0 s silent payoff
hold at S04 tail; closing music sting tail at S06).

## Scream cue (R5 contingent) — locked

R5 cleared at Phase 0 Unit 0.6 (Path A Roger + `[shouts]` self-closing
ElevenLabs v3 tag). Scream beat retained in script.ts as `S05-scream`
with `cueType: 'scream'`, `skipSilenceremove: true`, `fadeInMs: 0`,
`fadeOutMs: 30`, `leadFramesHint: 1`. The Sterling-LANA four-axis
acoustic shape (flat pitch + 6-12 dB amplitude jump + first-vowel
drag + accent anchored on first syllable) is encoded in
`cadenceAdapter.notes`; renderer applies per Phase 0 Unit 0.6
cadence-spec.md §3.6.

If a future revision cuts R5 (e.g., distribution context shifts the
identity-attribution risk profile), drop the S05-scream Line + replace
with a no-VO gap; script.test.ts will still pass because the
"exactly one scream cue" assertion is on the cueType, not on a
line-id requirement.

## Path D contingency — deferred indefinitely

Phase 0 Path A cleared on first pass for both Dash (Unit 0.2 Roger)
and Janet (Unit 0.3 Sloane; Phase 2 Unit 2.3 re-locked to Eleanor). Path D (voice-actor delivery) has no
trigger condition active. Unit 1.3b deliverables (actor casting,
studio booking, NDA, cadence-direction packet) **NOT shipped**. If a
future cycle wants to reopen voice-actor delivery (e.g., for portfolio
distribution where TTS attribution carries risk), the Unit 1.3b shape
in the plan body remains the recipe.

## Provenance

- Plan source: `docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`
  §Unit 1.3 (Voice Cast Lock & Per-Line Assignment)
- Voice constants source: `videos/trailer/scripts/cold-open-prototype.ts`
  (Janet/Sloane), `videos/trailer/PHASE-0-EXIT.md` §Section 1 (Dash/Roger)
- Machine contract: `videos/trailer/src/lib/script.ts`
  `BURNED_TRAILER_LINES`
- Test enforcement: `videos/trailer/src/lib/script.test.ts` §"BURNED_TRAILER_LINES integrity"
  asserts 2-voice cast + S01-only-Janet + single scream cue
