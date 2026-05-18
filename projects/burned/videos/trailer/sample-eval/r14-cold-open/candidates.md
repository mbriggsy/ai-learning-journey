# R14 Cold-Open Candidates — Unit 0.3

> **Phase 0 Unit 0.3 Step 1 record.** Documents the candidate-line pool
> for the trailer's 5-second binary autonomy hook. Section A is
> brainstorm-original lines REJECTED because they miss R14's
> machine-wordplay requirement — kept for audit trail, NOT rendered or
> tested. Section B is the TESTED stimuli — the two lines that ship
> through the SpikeColdOpen composition for Reader-A audition.
>
> Plan source-of-truth:
> `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.3
> (lines 1650-1937). Lines copied verbatim — do NOT edit without
> re-opening the gate.

## Requirements

- **R14 (compressed-Archer cold-open + repeatability declaration).** The
  cold-open line must (a) carry Archer's compressed-exposition cadence —
  one sentence, deadpan, no setup, AND (b) telegraph that this is a
  repeatable / autonomous process, not a one-off accomplishment. The
  brainstorm rule: lines that read ONLY as "wow this kid is productive"
  fail. Lines that read SIMULTANEOUSLY as benign admiration AND literal
  "the machine did it" pass.
- **R15 (on-screen text signal layer).** Cold-open R15 chrome stamp
  carries the autonomy declaration alongside the audio line:
  `"OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS"` at frame
  ~75 of the held landing card. The decode test validates AUDIO + R15
  together (the composite hook), not audio alone.

## Speaker pool

Per plan §Step 1, speaker assignment happens AFTER Unit 0.2 lock + Unit
0.6 outcome land. Both have landed:

- Unit 0.2 (briefer voice): ✅ ElevenLabs Roger locked for Dash. Other
  voices unblocked for secondary characters.
- Unit 0.6 (R5 Sterling-Screams-Lana): ✅ CLEARED (v3 `[shouts]
  VEEEEEEEERAAAA!!!` ships). Vera RETAINED in trailer cast +
  Unit 0.3 candidate speaker pool.

**Candidate pool:** {Sable, Janet, Vera}.

**Selection: Janet (Malory-coded executive dryness).**

| Operative | Archer archetype | Cold-open fit |
|---|---|---|
| Janet Broadside | Malory | ✅ **SELECTED.** Senior-exec resignation wrapped in subtle pride. "He's a machine" / "Briggsy didn't write this one either" both read as executive narration from a distance — the right register for an opening-frame voiceover. |
| Sable Ashworth | Cheryl | ❌ Chaos-enthusiasm register. "He's a machine" + chaos energy = "I love that he's a machine, chaos!" — wrong tone (the lines want resignation, not enthusiasm). |
| Vera Khan | Lana | ❌ Exasperated-impressed FIELD partner register. Works if the speaker is reacting in-scene to a specific operation; cold-open is exposition from outside the scene, so field-partner reaction is off-shape. |

**Voice (locked after Janet iteration audit 2026-05-18):**

- **Sloane - Bold and Polished** (voice ID `m8AHWg36LJTQWKmfeGVv`,
  ElevenLabs **Shared Library** — escalated from local library after
  Sarah audit flagged "too reassuring" for Janet's tough-matriarch
  character)
- Model: `eleven_v3`
- Voice settings **matriarch-tuned override** (NOT Unit 0.2 Roger
  defaults): `{stability: 0.85, similarity_boost: 0.75, style: 0.05,
  use_speaker_boost: true, speed: 0.92}` — high stability kills F0
  wander for flat declarative read; ultra-low style strips
  engine-default expressive swelling that creates the upbeat baseline
  Sarah + Matilda surfaced; slow speed pushes deliberate-weighty
  matriarch register.

**Janet voice iteration history** (`decode-eval.md` §Janet iteration):

| # | Voice + tuning | Audition signal | Disposition |
|---|---|---|---|
| v1 | Sarah (`EXAVITQu4vr4xnSDxMaL`) + Roger defaults | "both are good. But 5, at the end, 'writing them' it seemed to have a bit of a robotic feel to it." | Cleared line, flagged voice as too "reassuring" for Janet's character |
| v2 | Matilda (`XrExE9yKIg1WjnnlVkGX`) + matriarch-tuned | "Matilda could work." | Direction-right but Sloane wins A/B |
| v3 | Sloane (`m8AHWg36LJTQWKmfeGVv`, Shared Library) + matriarch-tuned | "ooooohhhhh I likey." | **WINNING TIMBRE** |
| v4 | Kristen (`OIadkU6YLviNhuekXGly`, Shared Library) + matriarch-tuned | "Kirsten is good, really good. But Sloane is our gal." | A/B confirms Sloane |

**Speaker held CONSTANT across both candidate renders so the A/B
audition isolates LINE, not VOICE.** Speaker attribution is a
separable Phase 1+ decision; if a future revision attributes the
winning line to a different operative, the Sloane-as-Janet
placeholder may swap to Sable/Vera in production without re-running
Unit 0.3.

---

## Section A — REJECTED candidates

Documented for audit trail. **NOT rendered. NOT tested.** Brainstorm
originals that miss the R14 machine-wordplay requirement (each line
reads ONLY as colloquial admiration; no autonomy double-meaning).

| # | Line | Speaker | Why rejected |
|---|------|---------|--------------|
| 1 | *"...the kid did it. Again. Show-off."* | Vera (Lana-coded exasperated-impressed) | Brainstorm original. Lacks "machine"/"autonomous"/"wrote itself" double-meaning. Fails R14's stated requirement. |
| 2 | *"He did it again! Twice! TWICE!"* | Sable (Cheryl-coded chaos enthusiasm) | Brainstorm original. Same gap as #1 — repeatability landed but autonomy-wordplay missing. |
| 3 | *"Well. Apparently the second one shipped."* | Janet (Malory-coded dismissive-exec dryness) | Brainstorm original. Same gap as #1 — "shipped" reads as project-management vocabulary, not autonomy. |

---

## Section B — TESTED candidates

Rendered into 8-second MP4 spike clips for Reader-A audition. Both
candidates ship through the same SpikeColdOpen composition (Janet
flash → Dash flash → BURNED landing card + R15 chrome stamp);
audio swaps via the wrapper composition's `candidate` prop.

| # | Line | Speaker | Machine wordplay |
|---|------|---------|-------------------|
| 4 | *"He's a machine, this kid. Honestly at this point I'm just impressed."* | Janet (Sarah voice) | **"He's a machine"** reads SIMULTANEOUSLY as (a) colloquial admiration ("this person is so productive they're a machine") AND (b) literal "the machine — i.e. Claude — did it" claim. Double-meaning IS the decode mechanic. Kicker "Honestly at this point I'm just impressed" cues Malory-archetype dryness: resignation wrapped in subtle pride. |
| 5 | *"Briggsy didn't write this one either. He's getting good at not writing them."* | Janet (Sarah voice) | Direct callback to UMB v3 cold-open (*"Briggsy didn't write a single line of code... Not one."* — `projects/undercover-mob-boss/scripts/narrator-prompts.ts:650`, verified verbatim). The **"either"** carries the repeatability load (implies series). The kicker **"He's getting good at not writing them"** is conspiratorial-knowing — the speaker is in on the trick. |

### Render disposition

| Candidate | TTS payload (chars) | MP3 sha256 | MP4 size | MP4 duration | Voice |
|---|---|---|---|---|---|
| #4 (canonical, Sloane-locked) | 90 | `4a9db27108689e2eeb241174843ea020a7c1cfe953e23655fee83b2216119f7d` | 651,765 bytes | 8.00s (video) / 5.50s (audio, from frame 30 / 1.00s) | Sloane (matriarch-tuned) |
| #4 (v1 audit-trail, gitignored) | 90 | `c3c070cb3d64a5074dbf0af3749445578dfa3047c99fa9c965be96881a64ecae` | 670,805 bytes | 8.00s (video) / 5.97s (audio) | Sarah (Roger defaults) — superseded |
| #5 (audit-trail only, NOT shipping) | 98 | `c87338efe1eb25b17f4c62e1a3351fbbfe26b313dc7ab5cabb37f09ac38993f5` | 638,899 bytes | 8.00s (video) / 5.18s (audio) | Sarah (Roger defaults) |

**Bracket-tag treatment** (both candidates):
- `[deadpan]` leading — establishes the dry briefing register, mirrors
  Unit 0.4 tone paragraph's leading-tag pattern.
- `[sarcastic]` inline before the kicker phrase ("Honestly..." for #4,
  "He's getting good..." for #5) — sardonic-micro-lift on the punchline
  tail, same shape as Unit 0.4's `…Phrasing` tag handling.

**Char-budget impact:** +188 chars (cumulative 3,842 / 100,000 = 3.84%).

---

## SpikeColdOpen composition shape (visual reference)

8-second composition / 240 frames @ 30fps. Same shape for both
candidates; only the embedded audio differs.

| Frames | Time | Beat |
|---|---|---|
| 0–30 | 0.0–1.0s | Cold-open speaker portrait (Janet, `janet-broadside.webp`) — hard cut, 2-frame brightness pop |
| 30–60 | 1.0–2.0s | Dash portrait (`dash-barlowe.webp`) — hard cut, 2-frame brightness pop |
| 30 | 1.0s | **VO drops** (audio-visual sync — voice arrives on the cut to Dash) |
| 60–240 | 2.0–8.0s | Held BURNED landing card (180 frames) |
| 60–80 | 2.0–2.67s | BURNED logo plate enters (scale 0.92→1.0, opacity 0→1, emil EASE_OUT, 20-frame entry) |
| 75–87 | 2.5–2.9s | **R15 chrome stamp slap** (STAMP_SLAP envelope: 6f scale-in 0.95→1.04, 4f settle 1.04→1.0, 2f hold; rotate −8°→−3°; transform-origin center) |
| 230–240 | 7.67–8.0s | Fade-to-black (last 10 frames of held landing) |

**Music: ABSENT (deliberate spike-scope decision).** The decode test
is purer with VO + visual only. The only available music placeholder
(sine-tone bed from Unit 0.5 spike) would confound the decode signal.
Phase 3 sources brass-jazz hook for the production trailer.

**Rhythm rationale.** Two fast cuts → one held card is the Archer
title-sequence convention per plan §Step 2. Even pacing reads as
slideshow (fail mode). The R15 stamp lands AT THE SAME MOMENT the
audio line is delivering "He's a machine" / "Briggsy didn't write
this one either" — the autonomy signal is reinforced across audio +
chrome stamp + viewer's settled attention on the BURNED title plate.

---

## Authoritative pointers

- Plan: `docs/plans/origin-trailer/phase-0-gate-resolution.md` §Unit 0.3
- Line constants: `videos/trailer/scripts/cold-open-prototype.ts`
- Contract test: `videos/trailer/scripts/cold-open-prototype.test.ts`
- Renderer: `videos/trailer/scripts/generate-cold-open-clip.ts`
- Composition: `videos/trailer/src/SpikeColdOpenComposition.tsx` →
  scenes/SpikeColdOpen.tsx
- Components: `videos/trailer/src/components/{OperativePortraitFlash,
  CutBrightnessPop, BurnedLogoPlate, R15ChromeStamp}.tsx`
- Char-budget tracker: `videos/trailer/sample-eval/r4-dash/char-budget.json`
- Audit-trail MP3s: `videos/trailer/sample-eval/r14-cold-open/clips/candidate-{4,5}.mp3`
- Render-input MP3s (Remotion staticFile): `public/trailer/cold-open/candidate-{4,5}.mp3`
- Audition MP4s: `videos/trailer/sample-eval/r14-cold-open/clips/cold-open-candidate-{4,5}.mp4`
- Sample frames for visual inspection: `videos/trailer/sample-eval/r14-cold-open/frames/{c4,c5}-frame-{001..004}.png`
