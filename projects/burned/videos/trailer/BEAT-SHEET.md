# BURNED Origin Trailer — Beat Sheet (DRAFT — UNIT 1.1 SCAFFOLD)

> **Status:** scaffolded by Unit 1.1 (Phase 1). Structural placeholders
> below get filled in by Units 1.2–1.10. Sentinel
> `videos/trailer/sample-eval/beat-sheet/BEAT-SHEET.signoff` is NOT
> written until Phase 1 closes (ADR #22 sentinel discipline).

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

- **VO (Janet):** *"He's a machine, this kid. Honestly at this point
  I'm just impressed."* — drops at frame 60 (2.0s in). Bracket-tag
  treatment: `[deadpan]` leading + `[sarcastic]` before "Honestly".
  Voice ID `m8AHWg36LJTQWKmfeGVv` (ElevenLabs Sloane, Shared Library,
  `eleven_v3`) with matriarch-tuned voice_settings per Phase 0 Unit 0.3.
- **Music (S01 frames 0–210):** brass hook entry — `<Unit 1.7 timing>`.
- **R15 #1:** *"OPERATION PENDLETON / CASE FILE 02 / METHOD:
  AUTONOMOUS"* (classification stamp slap, lower-left, JetBrains Mono
  700 28px, `--color-ochre-9` ink on `--color-cream-12` stamp paper,
  landing frame 150).

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

- **VO (Dash):** `<Unit 1.2 — S02 lines, ~2.4 wps briefing-room
  formality, target ~29 words for 12s budget>`.
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
chrome (clearance level token, visible field names per Unit 1.10).

**Audio:**

- **VO (Dash):** `<Unit 1.2 — S03 lines, ~2.0–2.2 wps sustained
  narration, target ~33 words for 16s>`. Includes the
  "seven-personnel-six-in-deck-one-on-the-research-budget" beat per
  Step 2 hat-count audit (Unit 1.6 Step 1).
- **Music:** brass-bossa underscore at 30%.
- **No R15 in S03.**

**Voice:** Dash (Roger) sole.

**Transition out:** dossier-page wipe overlay component on S03 tail —
16 frames (frames 1034–1050), left-to-right reveal of destination
(S04 cascade entry). `EASE_IN_OUT = cubic-bezier(0.77, 0, 0.175, 1)`
per timing.ts. See Unit 1.4.

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

**Audio:**

- **VO (Dash) — continuous narration paced per receipt:** `<Unit 1.2 —
  S04 cue table; wps bands sustained 1.9–2.3 / list 2.4–2.6 / payoff
  1.6–2.0>`.
- **Goofy-stats list (frames 1050–1880):** `<Unit 1.6 — 4 stats locked
  at cold-read gate; Otto on "research budget" not "basement">`.
- **Stacked-payoff line (frame 1950, 4 words, 60-frame window at 2.0
  wps deadpan):** *"They WERE the operation."*
- **Music:** brass-bossa builds toward frame 1950 stamp slap. Music
  ducks from frame 1980 → 2010 (30-frame ramp), completing as VO ends.
  Silent visual hold frames 2010–2040 (1.0s).
- **R15 #2:** *"OPERATIVE [REDACTED] — METHOD REPEATABLE"* — comms-
  ticker pulse, frame 1680. JetBrains Mono 500 22px, scrolling
  left-to-right at bottom edge.
- **R15 #3:** *"AUTONOMOUS FIELD UNIT — ASSET DELIVERED"* — dossier
  stamp slap (heavy 16-frame slap, scale 0.85 → 1.06 overshoot at
  12/16 → 1.0 settle), frame 1950. JetBrains Mono 700 38px,
  `--color-burned-fire` ink. **Overprints HTP hero**; visual carrier
  of the R3 stacked payoff.

**Voice:** Dash (Roger) sole.

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

- **VO (Dash) — scream cue:** *"VEEEEEEEERAAAA!!!"* — Sterling-CODED
  volume-discontinuous register, Sterling-LANA four-axis shape (flat
  pitch + 6–12 dB amplitude jump + first-vowel drag + accent anchored
  on first syllable) per Phase 0 Unit 0.6. Lands at **frame 2400**
  (200-frame-delayed reaction beat after the clip-relative-frame-160
  BURNED-card-draw visual). Bracket-tag prefix `[shouts]` (self-
  closing, ElevenLabs v3). Voice ID `CwhRBWXzGAHq8TQ4Fs17` (Roger)
  with Unit 0.2 defaults.
- **Music:** brass-bossa underscore at 30% baseline; ducks under
  scream cue (frame 2400) for 15 frames either side. **Edit policy:**
  `<Unit 1.5 — S05 audio treatment spec>`.
- **No R15 in S05** (clean visual focus for live-gameplay frame).

**Voice:** Dash (Roger) sole. Scream is the only VO cue in S05.

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

- **VO (Dash) — closing line:** `<Unit 1.2 — S06 lines, ~1.6–2.0 wps
  payoff register, target ~16 words for 9s budget>`. Closing tag:
  *"...Phrasing."* — earned-Phrasing! mechanic per Phase 0 Unit 0.4
  (preceding line must read as benign briefing context AND sexual
  double entendre cold-listen). Recommended Phrasing-bearing line:
  *"That's the briefing. Operation Pendleton is in your hands. Hold
  it tight." → "Phrasing."* ("hold it tight" carries physical-double-
  meaning shape Phrasing! responds to).
- **Music:** brass-bossa underscore climbs toward final beat, lands
  with the BURNED logo, fades during R15 #4 stamp.
- **R15 #4:** *"OPERATION STATUS: FIELD-READY"* — subhead under BURNED
  logo, JetBrains Mono 700 32px, `--color-ochre-9` ink, frame 2820.
- **R15 #5 (NEW closing-card cold-decode):** *"DRAFTED, RENDERED, AND
  SHIPPED BY AUTONOMOUS AGENTS."* + 30%-opacity subhead **TBD per
  AMENDMENT 2026-05-18** (S01-bookend mechanism BROKEN — re-derive in
  Unit 1.9; recommended candidate: *"Honestly at this point we're
  just impressed."* echoing S01 kicker via `"I'm"` → `"we're"` plural
  to fold autonomous-build collective speaker). Frame 2835. JetBrains
  Mono 700 32px main + JetBrains Mono 500 italic 22px subhead at 30%
  opacity. Both lines centered below R15 #4.

**Voice:** Dash (Roger) sole.

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

## Open follow-ups (per AMENDMENT 2026-05-18)

- **R15 #5 subhead re-derivation** — Unit 1.9 execution; three
  candidates carried forward (see Unit 1.9 Step 1 R15 instance table).
  Recommended: *"Honestly at this point we're just impressed."*
- **Janet voice_settings handoff** — Unit 1.3 picks mechanism (new
  `Line.voiceSettingsOverride` field OR Phase 2 reads from
  `cold-open-prototype.ts` `COLD_OPEN_SPEAKER` constant). Single
  source of truth either way.

---

## Sign-off sentinel

`videos/trailer/sample-eval/beat-sheet/BEAT-SHEET.signoff` is written
ONLY when Briggsy reviews and freezes BEAT-SHEET.md per ADR #22.
Phase 2 voice pipeline asserts sentinel existence before consuming
`script.ts`.

