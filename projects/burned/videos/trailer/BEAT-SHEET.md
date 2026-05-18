# BURNED Origin Trailer — Beat Sheet (DRAFT — UNIT 1.2 NARRATION SCRIPT)

> **Status:** Unit 1.1 scaffold + Unit 1.2 narration draft. Units
> 1.3–1.10 fill remaining structural placeholders. Sentinel
> `videos/trailer/sample-eval/beat-sheet/BEAT-SHEET.signoff` is NOT
> written until Phase 1 closes (ADR #22 sentinel discipline).
>
> Every VO line below carries an HTML comment marker (insight #029) of
> shape `<!-- @line: <id> -->` keyed to
> `videos/trailer/src/lib/script.ts` `BURNED_TRAILER_LINES`.
> `script.test.ts` asserts every marker appears exactly once and
> matches its Line entry verbatim.

## Runtime: 95.0s / 2850 frames @ 30fps / 16:9 (1920×1080)

## Voice cast: 2

- **Dash** (Sterling-CODED narrator, ~90% runtime; ElevenLabs Roger,
  voice ID `CwhRBWXzGAHq8TQ4Fs17`, model `eleven_v3`). Roger defaults
  voice_settings (stability 0.70, similarity_boost 0.75, style 0.15,
  use_speaker_boost true, speed 0.95) per Phase 0 Unit 0.2 lock.
- **Janet** (Malory-coded executive-dryness matriarch, S01 cold open
  only; ElevenLabs Sloane Shared Library, voice ID
  `m8AHWg36LJTQWKmfeGVv`, model `eleven_v3`) with matriarch-tuned
  voice_settings (stability 0.85, similarity_boost 0.75, style 0.05,
  use_speaker_boost true, speed 0.92) per Phase 0 Unit 0.3 lock.

Other operatives (Sable, Vera, Neal, Otto, Agent X) appear in visual
card-flash montages only — no VO lines in this trailer.

## Music bed: `<Unit 1.7 — Music Source Lock>`

## Typography: `<Unit 1.8 — Typography System Lock>` (inherits BURNED's Clash Display + General Sans + JetBrains Mono stack)

## R15 chrome instances: `<Unit 1.9 — R15 Chrome Copy Lock>` (5 total: 4 in-world diegetic + 1 closing-card cold-decode)

## R6 vocabulary translation key

| Raw SDLC term                | Pendleton vocabulary                                   |
| ---------------------------- | ------------------------------------------------------ |
| agents / AI / autonomous LLMs | autonomous field assets                                |
| spec / requirements doc      | forensic dossier / mission briefing                    |
| tests / test suite           | mission rehearsal artifacts / contingencies war-gamed  |
| code / source / implementation | operational tradecraft                               |
| deploy / production          | field deployment / activation                          |
| commits / git log            | log entries / case file revisions                      |
| Claude / LLM / model         | (omitted — the "operative" is the asset, never the model) |
| prompt / chat                | briefing / case-file directive                         |

---

## Scene table

| #     | Name                                | Duration (s) | Frame range | Notes                                                                                                                |
| ----- | ----------------------------------- | ------------ | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| S01   | Cold Open                           | 7.0          | 0–210       | R14 compressed-Archer title sequence; Janet voice-only delivery (off-camera) over Dash card-flash + dimmed-desk plate |
| S02   | Briefing Setup                      | 12.0         | 210–570     | R1 spine begins; venetian-blind establishing; Dash narration                                                          |
| S03   | Mission Background                  | 16.0         | 570–1050    | Operative roster + deck-of-120 setup; 6 operatives + 1 on "research budget" (Otto)                                   |
| S04   | Receipts Cascade w/ Stacked Payoff  | 33.0         | 1050–2040   | R3 climax; HTP scroll + card art + goofy stats; payoff line at frame 1950 ("They WERE the operation."); hard cut to S05 at 2040 |
| S05   | Gameplay Dissolve                   | 18.0         | 2040–2580   | R13 live gameplay closer (pre-trimmed `gameplay.mp4` per Phase 5); Dash scream "VEEEEEEEERAAAA!!!" at frame 2400      |
| S06   | Closing Directive                   | 9.0          | 2580–2850   | Final Dash line + Phrasing! beat + BURNED logo + R15 #4 status stamp + R15 #5 closing-card cold-decode               |
| TOTAL | —                                   | 95.0         | 0–2850      | 2850 frames @ 30fps                                                                                                  |

### Scene-count-lock rationale

The brainstorm names 6 structural beats; locking at 6 within the
R7 range (5–7). Considered alternatives:

- **5 scenes:** would force merging cold-open into briefing-setup OR
  collapsing closing-directive into the gameplay dissolve. Both moves
  damage the R14 cold-open shape (which needs its own pacing) and the
  R3-payoff-then-closer cadence (which needs the silent beat after
  reveal). **5 fails.**
- **7 scenes:** would split either cascade or briefing into two sub-
  beats. The cascade is structurally one rising-action event;
  splitting kills the R3 stacked-payoff mechanic. The
  briefing-setup + mission-background could split into 3 short
  scenes, but per-scene density would drop below UMB's 16.4s/scene
  benchmark (148s / 9 scenes). **7 fails density.**
- **6 scenes** is the cleanest mapping. **Locked.**

Per-scene average: 95 / 6 = 15.83s — comparable to UMB v3's 16.4s/scene.

---

### S01 — Cold Open (frames 0–210 / 7.0s)

**Visual:** `<Unit 1.10 — S01 visual environment lock>`. Dimmed-desk
plate (mahogany surface, venetian-blind shadow bands at 1.5–2 px/frame)
foreground card flash, BURNED title landing.

**Audio:**

- **VO (Janet, frame 60):**

  > *"He's a machine, this kid. Honestly at this point I'm just impressed."* <!-- @line: S01-cold-open -->

  Bracket-tag treatment: `[deadpan]` leading + `[sarcastic]` before
  "Honestly". Voice ID `m8AHWg36LJTQWKmfeGVv` (ElevenLabs Sloane,
  Shared Library, `eleven_v3`) with matriarch-tuned voice_settings
  per Phase 0 Unit 0.3. 12 words / ~5.0s expected.

- **Music (S01 frames 0–210):** brass hook entry — `<Unit 1.7 timing>`.
- **R15 #1 (frame 150):** *"OPERATION PENDLETON / CASE FILE 02 /
  METHOD: AUTONOMOUS"* — classification stamp slap, lower-left,
  JetBrains Mono 700 28px, `--color-ochre-9` ink on `--color-cream-12`
  stamp paper.

**Voice:** Janet (Sloane) only. Off-camera narration over Dash visual.

**Transition out:** stamp-slap finishing into S02 head (hard cut as
`<Series.Sequence>` boundary at frame 210). See Unit 1.4 transition
vocabulary table.

**Mobile safe square copy:** `<Unit 1.5 placement>` — Janet's spoken
line is audio-only; visual chrome (R15 #1 stamp) inside 1080×1080
central safe square.

---

### S02 — Briefing Setup (frames 210–570 / 12.0s)

**Visual:** `<Unit 1.10 — S02 visual environment lock>`. Briefing-room
plate (mahogany desk, Pendleton crest watermark 25%, venetian-blind
bands, CASE BANNER chrome). Dash character treatment per Unit 1.10.

**Audio:**

- **VO (Dash, frame 219):**

  > *"Good morning. The agency has decided you can be trusted with Operation Pendleton. Code-name in the field: BURNED. Pull up a chair. Try not to embarrass me."* <!-- @line: S02-briefing -->

  Bracket-tag treatment: `[deadpan]` leading. Sterling-CODED briefing-
  room formality; ellipsis pauses at clause boundaries. 27 words at
  ~2.4 wps ≈ 11.7s.

- **Music:** brass-bossa underscore at 30% — `<Unit 1.7>`.
- **CASE BANNER copy:** `<Unit 1.10 Step — S02 banner table>` (label,
  operation, sub, divider, footer).

**Voice:** Dash (Roger) sole.

**Transition out:** hard cut to S03 at frame 570 (no transition
component — `<Series.Sequence>` boundary).

**Mobile safe square copy:** Dash VO is audio; CASE BANNER chrome
positioned inside 1080×1080 central safe square per Unit 1.10.

---

### S03 — Mission Background (frames 570–1050 / 16.0s)

**Visual:** `<Unit 1.10 — S03 visual environment lock>`. Operative
roster reveal (six personnel + Otto-on-research-budget for "seven
personnel, six in deck and one [on the research budget]"). Dossier
chrome (clearance level token, visible field names per Unit 1.10). A
mid-scene **1.0s dossier-page wipe to deck reveal** sits between
S03-roster (segment 1) and S03-deck (segment 2).

**Audio:**

- **VO (Dash, segment 1, frame 570):**

  > *"Our autonomous field assets infiltrated the contract last quarter. [BEAT 0.3s] Seven operatives in the active roster. [BEAT 0.3s] Six expense reports, all classified. [BEAT 0.3s] One who insists on being called 'Agent X' and refuses to file any paperwork whatsoever."* <!-- @line: S03-roster -->

  Bracket-tag treatment: `[deadpan]` leading. ~35 words in 9.0s
  budget + 0.9s internal beats. Plan-original "One **field agent**
  who insists..." trimmed to "One who insists..." — 'field agent'
  compound flagged by R6 grep (`agent` SDLC pattern matches even
  with 'field' modifier; Agent X proper-noun carve-out only fires
  on "Agent X" exact match). The "Agent X" reveal still carries.

- **[Mid-scene wipe — 1.0s dossier-page wipe to deck reveal.]**

- **VO (Dash, segment 2, frame 870):**

  > *"Mission: a deck of one hundred and twenty operations. [BEAT 0.4s] One ends your career instantly. [BEAT 0.3s] The rest help you survive. Or ensure your colleagues don't."* <!-- @line: S03-deck -->

  Bracket-tag treatment: `[deadpan]` leading. ~24 words in 6.0s
  budget + 0.7s internal beats. Trimmed from plan-original (~31w)
  by compressing the deck-fate clauses: "One of them ends" →
  "One ends" (implied antecedent), "exist to help you survive it"
  → "help you survive" (no hedge verb), "Or to ensure your
  colleagues don't" → "Or ensure your colleagues don't" running
  with no preceding [BEAT]. Dark-closing gag preserved.

- **Music:** brass-bossa underscore at 30%.
- **No R15 in S03.**

**Voice:** Dash (Roger) sole.

**Transition out:** dossier-page wipe overlay component on S03 tail —
16 frames (frames 1034–1050), left-to-right reveal of destination
(S04 cascade entry). `EASE_IN_OUT = cubic-bezier(0.77, 0, 0.175, 1)`
per timing.ts. See Unit 1.4. **NOTE:** this is the S03→S04 transition
wipe (16 frames at scene tail), distinct from the internal 1.0s
mid-scene wipe between segments 1 and 2.

**Mobile safe square copy:** operative portraits + dossier text inside
1080×1080 central safe square per Unit 1.10.

---

### S04 — Receipts Cascade with Stacked Payoff (frames 1050–2040 / 33.0s)

**Visual:** `<Unit 1.5 — Cascade Composition Lock>`. Sequential-
revelation focal hierarchy (NOT layered-simultaneous). Each cascade
element enters at full visual weight INSIDE the central 1080×1080
safe square, reads, decays to 30–40% opacity chrome at side-band
position as the next element enters. Card-art halo right-edge-only
at 40% opacity throughout. Comms-ticker dim background until frame
1860 (cascade peak intensification). **Frame 1950 stamp slap is the
trailer's ONLY "everything at once" moment.**

**Audio — cascade cue table** (per Unit 1.2 Step 5 per-cue wps validation):

| Cue frame | Window (s) | Visual | VO line |
|-----------|-----------|--------|---------|
| 1050 | 2.0s | HTP dossier slides into hero position (Playwright capture) | > *"Operational planning."* <!-- @line: S04-cue-01 --> |
| 1110 | 3.0s | HTP scroll begins (top portion) | > *"Fourteen thousand pages of forensic dossiers."* <!-- @line: S04-cue-02 --> |
| 1200 | 3.0s | HTP scroll continues (middle portion) | > *"Drafted on weekends, by a field asset — name redacted for compliance."* <!-- @line: S04-cue-03 --> |
| 1290 | 4.0s | Stat 1 caption enters safe-square center-bottom at full weight | > *"Mission rehearsal: fourteen hundred and seven contingencies war-gamed."* <!-- @line: S04-stat-01 --> |
| 1410 | 5.0s | Stat 1 decays to chrome side-band; Stat 2 enters safe-square center-bottom | > *"Six of them, deliberately unrehearsed — the 'memorable ones.'"* <!-- @line: S04-stat-02 --> |
| 1560 | 4.0s | Stat 2 decays to chrome; Stat 3 enters safe-square center-bottom | > *"Seventeen asset illustrations. Two of them with hats."* <!-- @line: S04-stat-03 --> |
| 1680 | 6.0s | Stat 3 decays to chrome; Stat 4 enters safe-square center-bottom | > *"Seven on the roster. Six in the deck. One on the research budget. Don't ask."* <!-- @line: S04-stat-04 --> |
| 1860 | 3.0s | Cascade peak — comms-ticker brightens to held-bright state; HTP hero + accumulated halo (40%) + bright ticker; **no VO** | — |
| **1950** | 2.0s | **Stacked payoff stamp slaps onto HTP hero overprint (heavy 16-frame slap). HTP hero drops to 50% opacity. Cascade chrome (4 stats at 30% side-band, halo at 40%, bright ticker) IS the visual antecedent of "they." Dash VO delivers the 4-word truth-collision.** | > *"They WERE the operation."* <!-- @line: S04-payoff --> |
| 1980 | (within prior cue) | Music duck pre-anticipated ramp begins (90% → 30% over 30 frames, completes at 2010 as VO ends) | (VO continues) |
| 2010–2040 | 1.0s | **Silent visual hold: HTP hero + stamp + halo + 4 stats in chrome all static. Music at bed-only level (30%). No VO. The meaning-collision lands in the silence after the line, not in a second cue.** | — |
| 2040 | — | **Hard cut to S05 gameplay.** | — |

- **R15 #2 (frame 1680):** *"OPERATIVE [REDACTED] — METHOD REPEATABLE"*
  — comms-ticker pulse, JetBrains Mono 500 22px, scrolling left-to-
  right at bottom edge.
- **R15 #3 (frame 1950):** *"AUTONOMOUS FIELD UNIT — ASSET DELIVERED"*
  — dossier stamp slap (heavy 16-frame slap, scale 0.85 → 1.06
  overshoot at 12/16 → 1.0 settle), JetBrains Mono 700 38px,
  `--color-burned-fire` ink. **Overprints HTP hero**; visual carrier
  of the R3 stacked payoff.

**Voice:** Dash (Roger) sole; all cues `[deadpan]` leading except
S04-payoff which carries the controlled-deadpan payoff cadence at
the 2.0 wps ceiling.

**Transition out:** **hard cut to S05 at frame 2040** (NO cross-
dissolve — `<Series.Sequence>` boundary). Music duck completes BEFORE
the cut (frame 2010); 1.0s silent visual hold (frames 2010–2040)
lands the payoff; then hard cut. Per Unit 1.4 transition vocabulary
lock.

**Mobile safe square copy:** every cascade element inside the
1080×1080 central safe square. Side-band decay positions also inside
the safe square (mobile-X autoplay would otherwise crop the
accumulating chrome off-screen).

---

### S05 — Gameplay Dissolve (frames 2040–2580 / 18.0s)

**Visual:** `<Unit 1.5 — S05 cascade composition tail; gameplay clip
shape declared for Phase 5>`. Pre-trimmed `public/trailer/gameplay.mp4`
(540 frames / 1920×1080 / audio-stripped / BURNED-draw at clip-relative
frame 160 ± 3) consumed verbatim via `<OffthreadVideo src={staticFile(
'trailer/gameplay.mp4')} muted />` with NO `startFrom`/`endAt` props.
Trim ownership = Phase 5.

**Audio:**

- **VO (Dash, frame 2280, sparse interjection):**

  > *"And — between you and me — they appear to be enjoying it."* <!-- @line: S05-gameplay-vo -->

  Bracket-tag treatment: `[deadpan]` leading. 12 words / ~5.0s. Em-
  dash pauses for sotto-voce conspiratorial register.

- **VO (Dash, frame 2400, scream cue):**

  > *"VEEEEEEEERAAAA!!!"* <!-- @line: S05-scream -->

  Bracket-tag treatment: `[shouts]` self-closing (ElevenLabs v3 ONLY).
  Sterling-LANA four-axis acoustic shape per Phase 0 Unit 0.6
  cadence-spec.md §3.6: (1) flat pitch, (2) 6–12 dB amplitude jump
  vs gameplay bed, (3) FIRST-vowel drag, (4) accent anchored on first
  syllable. 200-frame-delayed reaction beat after clip-relative-160
  BURNED-card-draw at absolute frame 2200. `skipSilenceremove: true`
  in script.ts to preserve attack envelope.

- **Music:** brass-bossa underscore at 30% baseline; ducks under
  scream cue (frame 2400) for 15 frames either side, then returns to
  30%. Music ducks to 15% for 15 frames around the BURNED-card-draw
  moment (frame 2200) per Unit 1.2 Step 6 audio treatment.
- **Gameplay audio:** raw board ambient + phone-tap SFX + occasional
  player laugh, level-normalized to -12 dBFS RMS. UNEDITED beyond
  normalization (intentional "rough live authentic" reading).
- **No R15 in S05** (clean visual focus for live-gameplay frame).

**Voice:** Dash (Roger) sole. Two cues (gameplay-vo + scream).

**Transition out:** iris-wipe overlay component on S05 tail (45
frames, 1.5s, frames 2535–2580). `clip-path: circle(70.7% at 50% 50%)`
→ `clip-path: circle(0% at 50% 50%)` with
`EASE_IN_OUT = cubic-bezier(0.77, 0, 0.175, 1)`. Per Unit 1.4.

**Mobile safe square copy:** gameplay clip is full-frame; iris wipe
collapses to center which sits inside the central safe square by
construction.

---

### S06 — Closing Directive (frames 2580–2850 / 9.0s)

**Visual:** `<Unit 1.10 — S06 visual environment lock>`. Briefing-
room plate (consistent with S02), CASE BANNER for closing brief, then
BURNED logo land at frame 2780 (40-frame settle) + R15 #4 stamp slap
at frame 2820 + R15 #5 closing card at frame 2835.

**Audio:**

- **VO (Dash, frame 2580, close):**

  > *"That's the briefing. Operation Pendleton is in your hands. Hold it tight."* <!-- @line: S06-close -->

  Bracket-tag treatment: `[deadpan]` leading. 14 words at ~1.9 wps
  deliberate-close pace ≈ 7.4s. **"Hold it tight"** is the
  entendre setup line for Phrasing! — physical-action ambiguity per
  spec §3.5 earned-Phrasing! mechanic.

- **[BEAT 0.4s — 12 frames silence between close and Phrasing.]**

- **VO (Dash, frame 2814, Phrasing! punchline):**

  > *"Phrasing."* <!-- @line: S06-phrasing -->

  Bracket-tag treatment: `[deadpan]` leading. FFmpeg fade curve: qsin
  (per plan Step 7 phrasing-specific fade shape). R15 #4 stamp
  *"OPERATION STATUS: FIELD-READY"* lands at frame 2820 (concurrent
  with Phrasing audio tail). R15 #5 closing-card lands at frame 2835
  (post-audio).

- **Music:** brass-bossa underscore climbs toward final beat, lands
  with the BURNED logo, fades during R15 #4 stamp; final sting tail
  frames 2826–2850 (0.8s).
- **R15 #4 (frame 2820):** *"OPERATION STATUS: FIELD-READY"* —
  subhead under BURNED logo, JetBrains Mono 700 32px,
  `--color-ochre-9` ink.
- **R15 #5 (frame 2835, NEW closing-card cold-decode):** *"DRAFTED,
  RENDERED, AND SHIPPED BY AUTONOMOUS AGENTS."* + 30%-opacity subhead
  **TBD per AMENDMENT 2026-05-18** (S01-bookend mechanism BROKEN —
  re-derive in Unit 1.9; recommended candidate: *"Honestly at this
  point we're just impressed."* echoing S01 kicker via `"I'm"` →
  `"we're"` plural to fold autonomous-build collective speaker).
  JetBrains Mono 700 32px main + JetBrains Mono 500 italic 22px
  subhead at 30% opacity. Both lines centered below R15 #4.

**Voice:** Dash (Roger) sole. Two cues (close + Phrasing!).

**Transition out:** hard cut to black at frame 2850. Both R15 #4 and
R15 #5 hold through the final 15 frames until cut.

**Mobile safe square copy:** BURNED logo + R15 #4 + R15 #5 all centered
inside 1080×1080 central safe square.

---

## Phase 0 carry-forwards (locked inputs)

| Input                       | Lock                                                                                                                                      | Source                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Dash voice                  | ElevenLabs Roger `CwhRBWXzGAHq8TQ4Fs17`, model `eleven_v3`, Roger defaults                                                                | Phase 0 Unit 0.2 (`videos/trailer/PHASE-0-EXIT.md` §Section 1)                    |
| Janet voice                 | ElevenLabs Sloane (Shared Library) `m8AHWg36LJTQWKmfeGVv`, model `eleven_v3`, matriarch-tuned voice_settings                              | Phase 0 Unit 0.3 (`videos/trailer/PHASE-0-EXIT.md` §Section 2)                    |
| S01 cold-open line          | *"He's a machine, this kid. Honestly at this point I'm just impressed."*                                                                  | Phase 0 Unit 0.3 (Section B Candidate #4)                                          |
| Cold-open composition shape | `SpikeColdOpen` — 8s / 240 frames; two fast cuts (Janet portrait → Dash portrait, 1s each) → held BURNED landing card; logo at frame 60   | Phase 0 Unit 0.5 spike (`videos/trailer/sample-eval/spike/spike-results.md`)      |
| R15 #1 stamp content        | `OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS`                                                                                  | Phase 0 Unit 0.3 disposition                                                       |
| S04 payoff line             | *"They WERE the operation."* (4 words, 60-frame window, 2.0 wps deadpan)                                                                  | Phase 1 plan deepening (DOC-REVIEW rewrite)                                       |
| S05 scream line             | *"VEEEEEEEERAAAA!!!"* — Sterling-LANA four-axis shape, `[shouts]` tag prefix, lands at frame 2400                                         | Phase 0 Unit 0.6 (`videos/trailer/sample-eval/r5-scream/scream-eval.md`)          |
| Tone register               | Played-straight Sterling-CODED + earned-Phrasing! mechanic (entendre setup required)                                                       | Phase 0 Unit 0.4 (`videos/trailer/sample-eval/tone/eval.md`)                      |
| Composite viability         | All 5 integration points cleared (bare `<Series>`, `@remotion/media` audio, variable woff2, HTP scroll capture, Archer-grammar transitions) | Phase 0 Unit 0.5                                                                  |

---

## Voice cast lock + runtime accounting (Unit 1.3)

Voice cast is **2 voices** in this trailer: Dash (Roger / `eleven_v3`)
and Janet (Sloane / `eleven_v3`). Per-line voice + engine + prefixTag
table lives in `sample-eval/beat-sheet/voice-cast-lock.md`; the
machine contract is `src/lib/script.ts BURNED_TRAILER_LINES`.

**Total runtime accounting (R4 share):**

| Voice  | Voiced seconds                                                       | Share        |
| ------ | -------------------------------------------------------------------- | ------------ |
| Janet  | 5.00 s (S01-cold-open)                                               | 6.6 %        |
| Dash   | 70.17 s (15 cues across S02–S06)                                     | **93.4 %**   |
| **Total voiced** | **75.17 s**                                                    | **100 %**    |

R4 target is **~90 % of voiced runtime**. **93.4 % clears the
target.** Unvoiced surface (19.83 s of the 95.0 s total clock):
gameplay audio carries S05 between cues, brass hook + R15 #1 stamp
at S01 head, music duck + 1.0 s silent payoff hold at S04 tail,
closing music sting tail at S06.

R5 (scream cue) retained per Phase 0 Unit 0.6 close — Dash screams
`VEEEEEEEERAAAA!!!` at frame 2400 in Sterling-CODED volume-discontinuous
register. If a future revision elects R5-cut, drop the S05-scream
Line; the test suite's "exactly one scream cue" assertion is on
cueType not line-id.

---

## Open follow-ups (per AMENDMENT 2026-05-18)

- **R15 #5 subhead re-derivation** — Unit 1.9 execution; three
  candidates carried forward (see Unit 1.9 Step 1 R15 instance table).
  Recommended: *"Honestly at this point we're just impressed."*
- ~~**Janet voice_settings handoff**~~ — **RESOLVED at Unit 1.3:
  Option (B) locked.** Phase 2 reads from
  `videos/trailer/scripts/cold-open-prototype.ts COLD_OPEN_SPEAKER`
  constant when `Line.voice === 'janet'`. Single source of truth +
  no schema bloat for a single use case. Rationale in
  `sample-eval/beat-sheet/voice-cast-lock.md` §Janet voice_settings
  handoff mechanism.

---

## Transition vocabulary appendix (Unit 1.4)

Five named transitions (4 require overlay-component implementation +
1 is a `<Series.Sequence>` boundary). Architecture: **bare `<Series>`
+ scene-internal overlays** (NOT `<TransitionSeries>` presentations).
Scene durations sum exactly to TOTAL_FRAMES (asserted by
`timing.test.ts`); overlays do NOT shorten parent scene
`durationInFrames`.

| # | Name              | Where it lives                                                                                  | Frame constant (`transitions.ts`)             |
| - | ----------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1 | **Hard cut**      | `<Series.Sequence>` boundary; no overlay component.                                            | (boundary — no constant)                      |
| 2 | **Stamp slap**    | Overlay on source scene's tail frames. Standard (S01→S02 + cascade): 8f. Heavy (R3 payoff): 16f. | `STAMP_SLAP_FRAMES` / `STAMP_SLAP_HEAVY_FRAMES` |
| 3 | **Dossier-page wipe** | Overlay on S03 tail; left-to-right reveal of destination via `clip-path: inset()`.          | `DOSSIER_WIPE_FRAMES = 16`                    |
| 4 | **Iris wipe**     | Overlay on S05 tail; `clip-path: circle()` shrink from 70.7% to 0% at center.                  | `IRIS_WIPE_FRAMES = 45`                       |

### Per-boundary picks

| Boundary | Transition | Frame range | Rationale |
|----------|-----------|-------------|-----------|
| S01 → S02 | Stamp slap | 200–210 (8 frames inside S01 tail, settling 2 frames into S02 head) | Cold-open closes with R15 #1 classification stamp; the stamp IS the transition. Slap settles into S02's briefing-room frame as the stamp peels back. |
| S02 → S03 | Hard cut | 570 | Briefing → mission background is a "next slide" beat. Pendleton briefings cut. Archer briefing scenes typically cut. |
| S03 → S04 | Dossier-page wipe | 1034–1050 (16 frames in S03 tail) | Mission Background ends on the deck-of-120 reveal; the dossier page turns and reveals the cascade. Honors the diegetic frame. Left-to-right reveal per page-peel metaphor (`clip-path: inset(0 0 0 0)` → `inset(0 0 0 100%)`). |
| S04 → S05 | **Hard cut after 1.0s payoff hold** | 2040 | Replaces former cross-dissolve. Payoff stamp + VO land 1950–2010; visual freezes 2010–2040 (music at bed-only); hard cut to gameplay. Music ducks pre-anticipated ramp (1980–2010) so duck completes as VO ends. |
| S05 → S06 | Iris wipe | 2535–2580 (45 frames in S05 tail) | Closing transition. Iris wipes the gameplay frame closed; briefing-room frame reestablishes underneath for the closing directive. Title-sequence-shape echo at trailer close. `clip-path: circle(70.7% at 50% 50%)` → `circle(0% at 50% 50%)` with `EASE_IN_OUT`. |
| S06 → end | Hard cut to black | 2850 | The trailer ends. No "fade to black" — Archer hard-cuts to credits. |

### Cross-dissolve REMOVED (DOC-REVIEW lock)

The former R3 cross-dissolve at S04→S05 was replaced with a hard cut
during deepening. Multi-agent consensus:

- **Design-lens:** Cross-dissolve isn't Archer-native; Archer hard-
  cuts or wipes, doesn't dissolve between briefing-room and field
  footage. Hard cut after the 1.0s payoff visual hold is more
  shocking and more earned.
- **Framework-docs:** `<TransitionSeries>` overlap math (`total =
  sum - transitions`) would contradict timing.ts's declared 2850
  total. Dropping the cross-dissolve lets us use bare `<Series>`
  (UMB precedent).
- **Adversarial:** The former cross-dissolve framing had 3 mutually-
  inconsistent claims about silence + VO + dissolve overlap.
  Hard cut at 2040 after a clean 1.0s hold resolves all three.
- **Best-practices:** Audio doesn't cross a dissolve for free; music
  needed explicit volume interpolation regardless. Hard cut + pre-
  anticipated music duck completing at 2010 is cleaner.

### Banned-transition list (style-only — architectural bans live above)

The 5-transition scoped library is the ONLY vocabulary in use. The
following are explicitly forbidden:

- **Push transitions** (the slide-in-from-right thing). Reads as
  generic motion-graphics templates.
- **3D cube flips.** Not in the Archer vocabulary.
- **Glitch effects.** Not in the Archer vocabulary.
- **Cross-dissolve.** Locked OUT at S04→S05 per Step 2 deepening
  (would also re-introduce `<TransitionSeries>` overlap math).

Architectural bans (enforced structurally by `timing.test.ts` +
Phase 4 lint rule):

- **`<TransitionSeries>` presentations** — the composition is bare
  `<Series>`. Any future `import {...} from '@remotion/transitions'`
  in trailer source is a lint violation (Phase 4 will wire the
  `import/no-restricted-paths` rule).

---

## Sign-off sentinel

`videos/trailer/sample-eval/beat-sheet/BEAT-SHEET.signoff` is written
ONLY when Briggsy reviews and freezes BEAT-SHEET.md per ADR #22.
Phase 2 voice pipeline asserts sentinel existence before consuming
`script.ts`.
