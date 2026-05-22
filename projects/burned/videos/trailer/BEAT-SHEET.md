# BURNED Origin Trailer — Beat Sheet (DRAFT — UNIT 1.2 NARRATION SCRIPT)

> **Status:** Unit 1.1 scaffold + Unit 1.2 narration draft +
> Unit 1.3 voice cast lock + Unit 1.4 transition vocabulary lock +
> Unit 1.5 cascade composition lock. Units 1.6–1.10 fill remaining
> structural placeholders. Sentinel
> `videos/trailer/sample-eval/beat-sheet/BEAT-SHEET.signoff` is NOT
> written until Phase 1 closes (ADR #22 sentinel discipline).
>
> Every VO line below carries an HTML comment marker (insight #029) of
> shape `<!-- @line: <id> -->` keyed to
> `videos/trailer/src/lib/script.ts` `BURNED_TRAILER_LINES`.
> `script.test.ts` asserts every marker appears exactly once and
> matches its Line entry verbatim.

## Runtime: 106.0s / 3180 frames @ 30fps / 16:9 (1920×1080)

## Voice cast: 2

- **Dash** (Sterling-CODED narrator, ~90% runtime; ElevenLabs Roger,
  voice ID `CwhRBWXzGAHq8TQ4Fs17`, model `eleven_v3`). Roger defaults
  voice_settings (stability 0.70, similarity_boost 0.75, style 0.15,
  use_speaker_boost true, speed 0.95) per Phase 0 Unit 0.2 lock.
- **Janet** (Malory-coded executive-dryness matriarch, S01 cold open
  only; ElevenLabs Eleanor – Gracious and Authoritative Shared Library,
  voice ID `2qQJWjw5XdG80GreshqG`, model `eleven_v3`) with cunty-
  matriarch-tuned voice_settings (stability 0.40, similarity_boost 0.75,
  style 0.45, use_speaker_boost true, speed 0.85) per Phase 2 Unit 2.3
  re-lock (Phase 0 originally locked Sloane `m8AHWg36LJTQWKmfeGVv`;
  cunty canary 2026-05-19 rejected Sloane as too polished and escalated
  to Eleanor for the Jessica-Walter-Mallory-Archer DNA).

Other operatives (Sable, Vera, Neal, Otto, Agent X) appear in visual
card-flash montages only — no VO lines in this trailer.

## Music bed (Unit 1.7 lock — source-type ladder + audition framework; track procurement is Phase 3)

- **Source-type ladder:** Tier 1 Artlist Pro ($199/yr) / Epidemic Sound
  Pro ($204/yr) → Tier 2 Marmoset / Songtradr per-track marketplace
  ($30–$200/track) → Tier 3 Suno Pro ($10/mo) last-resort.
- **Track-shape path:** **A (default)** — full-length composition
  (2:30–3:30) clipped to 106s. Path B (60s short + loop) fallback if no
  Path A candidate survives Tier 1+2. Path C (stems) reserved for
  licensed-track edge case only.
- **`music_disclosure_required`:** `false` (Phase 1 default — flips to
  `true` only if Tier 3 Suno fallback fires, triggering Phase 7
  AI-music disclosure obligation).
- **§R9 brief:** mid-century brass / bossa nova / spy jazz / lounge,
  BPM 100–130, confident-deadpan-slightly-playful (NOT goofy/wacky),
  brass + upright bass + syncopated drums + optional vibraphone/organ.
  Cascade-friendly dynamic shape: intro → build → peak (2190–2280) →
  duck (2310–2340) → bed-only hold → close-swell. Full audition
  protocol + criteria + Suno prompt template + risk register in
  `sample-eval/beat-sheet/music-sourcing.md`.
- **Music-cue map** (Phase 4 implements via
  `<Audio volume={(f) => interpolate(...)}>`):

| Frame range | Music state | Volume target | Transition shape |
|-------------|-------------|---------------|------------------|
| 0–60 | Brass hook intro | 100% | step (intro is the start) |
| 60–210 | Bed under cold-open speaker | 40% | ramp(30) from 100→40 starting at frame 30 (pre-anticipates cold-open line at 60) |
| 210–570 | Underscore build (briefing setup) | 50% | ramp(60) from 40→50 starting at S02_START |
| 570–1380 | Continue build (mission background) | 55% | ramp(60) from 50→55 starting at S03_START |
| 1380–2010 | Cascade open, music swells | 60→75% | ramp(630) linear swell across the cascade "stat" portion |
| 2010–2190 | Peak intensification | 90% | ramp(180) from 75→90 |
| 2190–2280 | Cascade peak hold (no VO) | 90% | hold |
| 2280–2310 | Stamp slap + payoff VO begins; music holds | 90% | hold |
| **2310–2340** | **Pre-anticipated payoff duck** (completes as VO ends) | **30%** | **ramp(30) from 90→30** — `PAYOFF_DUCK_RAMP_FRAMES` per `transitions.ts` |
| 2340–2370 | Bed-only silent visual hold | 30% | hold |
| 2370–2865 | Sparse bed under gameplay capture | 30% | hold (hard cut at 2370; music continues across the cut) |
| 2865–2910 | Iris-wipe — music rises | 50% | ramp(45) from 30→50 |
| 2910–3120 | Closing underscore | 60% | ramp(60) from 50→60 |
| 3120–3180 | Final brass sting on logo land | 100% | ramp(30) from 60→100 |

**Anti-pattern guard:** no 60-percentage-point cliffs. All transitions
are ramped envelopes or held holds — the first-draft 90→30 sharp drop
at 2280 would have clicked audibly. The pre-anticipated 30-frame duck
at 2310–2340 lands the payoff cleanly.

## Typography (Unit 1.8 lock — BURNED's stack, variable woff2 via `useFonts.ts` Promise.all)

- **Stack:** Clash Display + General Sans + JetBrains Mono — all variable
  woff2 files at BURNED's `public/fonts/` (NO copy to
  `videos/trailer/public/fonts/` per ADR #15). Loaded through
  `src/hooks/useFonts.ts` (Promise.all pattern, shared cached promise —
  fixes the prior sync-flag race).
- **Variable axis ranges:** Clash Display `200–700` · General Sans
  `200–700` · JetBrains Mono `100–900` (matches
  `src/client/howtoplay/fonts-mono-htp.css:9`). Phase 0 Unit 0.5 spike
  cleared variable-axis weight resolution in MP4 export — Phase 4 Unit
  4.0 font spike DROPPED from scope.
- **Per-element table + emil-design-eng polish lens** (tracking,
  line-height, feature-settings) lives in
  `sample-eval/beat-sheet/typography.md`. Highlights: BURNED logo Clash
  Display 700 ~180px (-2% tracking); R15 chrome JetBrains Mono 700
  22-38px with +30-+80 tracking by inverse-to-size principle; stat
  captions General Sans 600 dry + 500 italic companion; tabular
  numerals (`"tnum"`) enforced on every stat numeral so the cascade
  doesn't jitter horizontally as numerals enter.
- **Color tokens:** Radix-style scale+step (`--color-cream-12`,
  `--color-ochre-9`, `--color-burned-fire`, etc.) via
  `src/lib/colors.ts PALETTE` snapshot. Phase 4 imports from PALETTE,
  NOT raw hex. Color-blind discipline: typography + position + shape
  carry signal, never color alone.

## R15 chrome instances (Unit 1.9 lock — 5 total: 4 in-world diegetic + 1 closing-card cold-decode)

| # | Frame | Scene | Copy | Treatment | Decode axis |
|---|-------|-------|------|-----------|-------------|
| 1 | 150 | S01 cold open | **"OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS"** | Classification stamp slap, lower-left, JetBrains Mono 700 28px (+80 tracking), `--color-ochre-9` ink on `--color-cream-12` stamp paper; 8-frame standard slap | In-world diegetic (origin: method is autonomous) |
| 2 | 2010 | S04 cascade | **"OPERATIVE [REDACTED] — METHOD REPEATABLE"** | Comms-ticker pulse, bottom edge, JetBrains Mono 500 22px (+40 tracking), scrolling left-to-right | In-world diegetic (reproducibility claim) |
| 3 | 2280 | S04 stacked payoff | **"AUTONOMOUS FIELD UNIT — ASSET DELIVERED"** | Dossier stamp slap, heavy 16-frame slap, overprints HTP hero, JetBrains Mono 700 38px (+30 tracking), `--color-burned-fire` ink | In-world diegetic (R3 payoff carrier — visual + audio land simultaneously) |
| 4 | 3150 | S06 closing | **"OPERATION STATUS: FIELD-READY"** | Subhead under BURNED logo, JetBrains Mono 700 32px (+50 tracking), `--color-ochre-9` ink; 16-frame heavy slap (matches R3 payoff envelope — closing is the second "weight" moment) | In-world diegetic (status: asset is ready) |
| **5** | **3165** | **S06 closing card** | **Main line:** *"DRAFTED, RENDERED, AND SHIPPED BY AUTONOMOUS AGENTS."* — JetBrains Mono 700 32px (+50 tracking), `--color-ochre-9` ink. **Subhead (LOCKED 2026-05-18):** *"Honestly at this point we're just impressed."* — JetBrains Mono 500 italic 22px (+20 tracking), 30% opacity. Both centered below R15 #4. | 8-frame standard slap (lighter envelope than R15 #4 to maintain hierarchy) | **Cold-decode literal:** main line states the autonomous-build claim unambiguously to trailer-in-isolation viewers (no Phase 7 wrapper required). **Subhead bookend:** echoes Janet's S01 kicker *"Honestly at this point I'm just impressed."* via `"I'm"` → `"we're"` plural, folding the autonomous-build collective speaker (Briggsy + Claude + agents) into the closing voice. |

### R15 #5 subhead — three-candidate decision (LOCKED option a)

Per plan AMENDMENT 2026-05-18 (S01 line swap from Candidate #5 to
Candidate #4 broke the original "Briggsy didn't write this part either"
bookend), Unit 1.9 selects from three re-derivation candidates:

| Candidate | Subhead text | Echo mechanism | Voice register | Verdict |
|-----------|--------------|---------------|----------------|---------|
| **(a) LOCKED** | *"Honestly at this point we're just impressed."* | S01 kicker END echo: *"I'm just impressed"* → *"we're just impressed"* | Continuous-Sterling-CODED deadpan (Janet's matriarch-tuned register lands the S01 line, then closes back to Dash's deadpan in the subhead — the register holds) | Locked. Bookend closes the loop on the END of S01, not the opening — cleaner shape. Plural fold ("we're") admits the autonomous-build collective speaker without breaking diegetic frame in the subhead itself. |
| (b) | *"He's a machine, alright."* | S01 opening echo: *"He's a machine, this kid"* → *"He's a machine, alright"* | Sterling-CODED resignation/acceptance ("alright" = "yeah, sure, technically...") | Held in reserve. Slightly more dismissive than (a); echoes the wrong half of S01 (opening, not closing — bookend math weaker). |
| (c) | (drop subhead entirely; main line stands solo) | none | n/a | Held in reserve. Loses the S01 bookend mechanism; main line still carries the cold-decode load alone if a future re-derivation prefers the simpler closing card. |

**Why (a) over (b):** the bookend mechanic is strongest when it echoes
the END of the opening scene (closing-the-loop shape) rather than its
opening clause. (a)'s plural-fold ("we're") is also a richer
self-referential gesture than (b)'s "alright" resignation — and it
keeps the closing register *genuine* rather than *begrudging*, which
matches the cold-decode tone (autonomous-build is impressive, not
shrugged at).

**Why (a) over (c):** the subhead is the bookend; (c) drops the
bookend mechanism entirely. The R15 #5 main line carries the
cold-decode claim either way, but the subhead's job is *closure* (the
trailer was an autonomous-build artifact AND it closes the loop on
Janet's S01 deadpan observation). (c) loses that closure.

### R15 brainstorm-mandate trace

Brainstorm R15 acceptance: "at least one signal lands in the cold-open
frame, at least one in the cascade or closer."

- ≥1 in cold-open: **#1** (frame 150 in S01). ✓
- ≥1 in cascade or closer: **#2** (cascade comms-ticker, 2010), **#3**
  (cascade stacked payoff, 2280), **#4** (closing status, 3150),
  **#5** (closing-card cold-decode, 3165). ✓ — four signals across
  cascade + closer.

**Total: 5 R15 signals.** Brainstorm minimum is "at least two."
BURNED ships 5 for redundancy on the no-context-viewer decode
mechanism: #1–#4 carry in-world diegetic + engineering-peer-confirmation
load; #5 carries the literal cold-decode load explicitly so the
trailer-as-artifact-in-isolation stands on its own without the Phase 7
distribution wrapper.

### Layered decode model

R15 chrome operates on **three layers**:

- **(a) In-world diegetic:** the cold Twitter/X viewer with no context
  reads the chrome as Pendleton-agency flavor (classification stamps,
  comms-ticker pulses, operation-status briefing terminals). R15 #1–#4
  carry this load.
- **(b) Engineering-peer confirmation:** the engineering peer who
  already knows the trailer is about agentic SDLC reads R15 #1–#4 as
  confirmation alongside the in-world reading. The decode lands via
  wordplay ("METHOD: AUTONOMOUS" reads both as briefing-room
  classification AND as autonomous-build claim).
- **(c) Literal cold-decode (R15 #5):** a cold viewer in trailer-
  isolation (no Phase 7 wrapper, no engineering context) reads R15 #5's
  closing card unambiguously: *"DRAFTED, RENDERED, AND SHIPPED BY
  AUTONOMOUS AGENTS."* + locked subhead. Safety net that ensures the
  trailer-as-artifact carries the central engineering claim regardless
  of distribution context.

### Color-blind safety

All five signals use typography + position + treatment (stamp / ticker
/ subhead) for hierarchy, **not** color. Ochre and burn-fire inks are
visually distinct from cream/parchment background regardless of color
perception. Briggsy is color blind — typography + position + shape
carry signal, never color alone.

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
| S03   | Mission Background                  | 27.0         | 570–1380    | Operative roster + deck-of-120 setup; 6 operatives + 1 on "research budget" (Otto). Tier-4 expansion 2026-05-22 (+330f) absorbs Sterling-CODED read-pace overrun. |
| S04   | Receipts Cascade w/ Stacked Payoff  | 33.0         | 1380–2370   | R3 climax; HTP scroll + card art + goofy stats; payoff line at frame 2280 ("They WERE the operation."); hard cut to S05 at 2370 |
| S05   | Gameplay Dissolve                   | 18.0         | 2370–2910   | R13 live gameplay closer (pre-trimmed `gameplay.mp4` per Phase 5); Dash scream "VEEEEEEEERAAAA!!!" at frame 2730     |
| S06   | Closing Directive                   | 9.0          | 2910–3180   | Final Dash line + Phrasing! beat + BURNED logo + R15 #4 status stamp + R15 #5 closing-card cold-decode               |
| TOTAL | —                                   | 106.0        | 0–3180      | 3180 frames @ 30fps                                                                                                  |

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

**Visual (Unit 1.10 lock):** dimmed-desk plate — mahogany surface
(`PALETTE.ochre7`/`--color-ochre-7`), pre-establishing in shadow as if
the lights haven't come up yet. Venetian-blind shadow bands at
1.5–2 px/frame motion (same shadow grammar as S02/S03 — visual
continuity primer). Pendleton crest watermark at 15% opacity (dimmer
than S02's 25%) top-left. **Foreground card flash:** six BURNED card
backs flash hard-cut at 6-frame cadence across frames 0–50 in locked
sequence (`intercepted → burn-the-files → extraction → back-channel →
falsify-intel → intercepted re-flash → burn-the-files re-flash`, then
8-frame ease to `burned.webp` landing at frame 50 + 10-frame hold).
Each card occupies 60% of safe-square center; hard-edged drop shadow.
**Critical:** S01 shows the BURNED *card art* (the game asset), NOT
the wordmark logo — the wordmark only appears in S06 as the trailer's
capstone. Full storyboard + ASCII sketch in
[`sample-eval/beat-sheet/briefing-room-comp.md`](sample-eval/beat-sheet/briefing-room-comp.md).

**Audio:**

- **VO (Janet, frame 60):**

  > *"He's a machine, this kid. Honestly at this point I'm just impressed."* <!-- @line: S01-cold-open -->

  Bracket-tag treatment: `[sarcastic]` leading + inline `[sarcastic]`
  before "Honestly". Voice ID `2qQJWjw5XdG80GreshqG` (ElevenLabs
  Eleanor – Gracious and Authoritative, Shared Library, `eleven_v3`)
  with cunty-matriarch-tuned voice_settings per Phase 2 Unit 2.3
  re-lock (Phase 0 Sloane lock rejected by cunty canary). 12 words /
  ~5.0s expected.

- **Music (S01 frames 0–210):** brass hook intro at 100% (frame 0), ducks to 40% bed via ramp(30) starting frame 30 (pre-anticipates Janet's cold-open line at frame 60). Full cue-map in preamble Music bed §.
- **R15 #1 (frame 150):** *"OPERATION PENDLETON / CASE FILE 02 /
  METHOD: AUTONOMOUS"* — classification stamp slap, lower-left,
  JetBrains Mono 700 28px, `--color-ochre-9` ink on `--color-cream-12`
  stamp paper.

**Voice:** Janet (Eleanor, per Phase 2 Unit 2.3 re-lock) only. Off-camera narration over Dash visual.

**Transition out:** stamp-slap finishing into S02 head (hard cut as
`<Series.Sequence>` boundary at frame 210). See Unit 1.4 transition
vocabulary table.

**Mobile safe square copy:** Janet's spoken line is audio-only;
visual chrome (R15 #1 stamp) inside the 1080×1080 central safe
square (x = 420–1500, y = 0–1080) per Unit 1.5 safe-square placement
policy.

---

### S02 — Briefing Setup (frames 210–570 / 12.0s)

**Visual (Unit 1.10 lock):** briefing-room plate — mahogany desk
(`PALETTE.ochre7`/`PALETTE.ochre9` blend), Pendleton crest watermark
25% top-left, venetian-blind shadow bands 1.5–2 px/frame, CASE BANNER
chrome (top-center strap; ports `GameTable.tsx:67-88` `.caseBanner`
aside verbatim — NOT a separate component). **Foreground depth-plane**
element (Phase 4 picks Option A brass nameplate "M. PENDLETON, BUREAU
CHIEF" / Option B manila folder stack / Option C doorframe vignette).
**Midground center:** open dossier — opens via 60-frame `EASE_DRAWER`
ease over frames 240–300; case-sheet interior carries header
("OPERATION PENDLETON / CASE FILE 02") + operative line ("ASSIGNED
ASSET: D. BARLOWE") + clearance ("CLEARANCE: ALPHA-SEVEN") + date
(REDACTED) + classification chevron + redaction bars. **Top-right
chrome:** comms-ticker idle text rotating `IDLE_LINES` 4-item set
(per `DossierFeed.tsx:20-25`). **Sequencing rule:** ≤2 elements at
full visual weight per frame (anti-AI-slop guard from Unit 1.5,
extended to briefing-room scenes); accumulated elements past their
read window hold at 30–40% chrome opacity. **Dash character art NOT
visible** — Dash is the briefer *delivering* the briefing; his
presence is the VO. Full storyboard in
[`sample-eval/beat-sheet/briefing-room-comp.md`](sample-eval/beat-sheet/briefing-room-comp.md).

**Audio:**

- **VO (Dash, frame 219):**

  > *"Good morning. The agency has decided you can be trusted with Operation Pendleton. Code-name in the field: BURNED. Pull up a chair. Try not to embarrass me."* <!-- @line: S02-briefing -->

  Bracket-tag treatment: `[sarcastic]` leading (Phase 2 Unit 2.3
  retune from original `[deadpan]` per arrogant-Sterling canary).
  Sterling-CODED briefing-room formality; ellipsis pauses at clause
  boundaries. 27 words at ~2.4 wps ≈ 11.7s.

- **Music:** brass-bossa underscore ramping 40→50% across S02 per cue-map (ramp(60) from frame 210). Full cue-map in preamble Music bed §.
- **CASE BANNER copy (S02):** label *"CASE FILE"* · operation
  *"OPERATION PENDLETON"* · sub *"BRIEFING ROOM · BUREAU CHIEF M.
  PENDLETON"* · divider *"—"* · footer *"02 / EYES-ONLY"*. Full
  S02/S03/S06 banner table in
  [`sample-eval/beat-sheet/briefing-room-comp.md`](sample-eval/beat-sheet/briefing-room-comp.md).

**Voice:** Dash (Roger) sole.

**Transition out:** hard cut to S03 at frame 570 (no transition
component — `<Series.Sequence>` boundary).

**Mobile safe square copy:** Dash VO is audio; CASE BANNER chrome
positioned inside 1080×1080 central safe square per Unit 1.10.

---

### S03 — Mission Background (frames 570–1380 / 27.0s)

**Visual (Unit 1.10 lock):** briefing-room frame STAYS — the dossier
IS the desk's content; mahogany surface + venetian-blind shadow +
depth-plane foreground element from S02 persist. **Midground center
— open dossier deepens.** Around frame 700 the **dossier-page wipe**
(16 frames per Unit 1.4; `clip-path: inset(0 0 0 0)` → `inset(0 0 0
100%)` left-to-right) reveals a readable 4×6 grid of the top 24 card
backs inside the dossier viewport. Small "120 OPERATIONS" chrome
counter sits upper-right of the dossier viewport. **Operative roster
overlay (frame 750):** 6 operative portrait cards slide in along the
right edge — the 6 deck operatives (`dash-barlowe`, `vera-khan`,
`sable-ashworth`, `janet-broadside`, `neal-proctor`, `agent-x` with
REDACTED bar over face). Otto is NOT in the cluster (research budget,
not in deck — primes Stat 4 verbal payoff). **S03→S04 transition:**
the 6 portraits EXIT at the dossier-page wipe; S04's right-edge halo
is 6 ACTION cards (`burned`, `intercepted`, `burn-the-files`,
`extraction`, `intel-briefing`, `direct-order`), NOT the operatives.
**CASE BANNER (S03):** label *"CASE FILE"* · operation *"OPERATION
PENDLETON"* · sub *"MISSION DOSSIER · ASSET ROSTER"* · divider *"—"*
· footer *"02 / EYES-ONLY"*. **Comms-ticker** continues with
`IDLE_LINES` rotation, switches to "ACTIVE BRIEFING" at ~frame 1007 to
match segment 2's deck VO. A mid-scene **1.0 s dossier-page wipe to
deck reveal** sits between S03-roster (segment 1) and S03-deck
(segment 2). Full S03 composition in
[`sample-eval/beat-sheet/briefing-room-comp.md`](sample-eval/beat-sheet/briefing-room-comp.md).

**Audio:**

- **VO (Dash, segment 1, frame 570):**

  > *"Our autonomous field assets infiltrated the contract last quarter. [BEAT 0.3s] Seven operatives in the active roster. [BEAT 0.3s] One who insists on being called 'Agent X' and refuses to file any paperwork whatsoever."* <!-- @line: S03-roster -->

  Bracket-tag treatment: `[sarcastic]` leading (Phase 2 Unit 2.3
  retune from original `[deadpan]`). ~30 words in 9.0s budget + 0.6s
  internal beats. **Unit 2.7 Tier-2 trim 2026-05-22:**
  dropped *"Six expense reports, all classified."* sentence to claw
  back ~4s on the original +95.9% drift; post-trim actual ~13.2s,
  residual +4.2s overrun deferred to Tier-3/4 reconciliation. Plan-original "One **field agent**
  who insists..." trimmed to "One who insists..." — 'field agent'
  compound flagged by R6 grep (`agent` SDLC pattern matches even
  with 'field' modifier; Agent X proper-noun carve-out only fires
  on "Agent X" exact match). The "Agent X" reveal still carries.

- **[Mid-scene wipe — 1.0s dossier-page wipe to deck reveal.]**

- **VO (Dash, segment 2, frame 1007):**

  > *"Mission: a deck of one hundred and twenty operations. [BEAT 0.4s] One ends your career instantly. [BEAT 0.3s] The rest help you survive. Or ensure your colleagues don't."* <!-- @line: S03-deck -->

  Bracket-tag treatment: `[sarcastic]` leading (Phase 2 Unit 2.3
  retune from original `[deadpan]`). ~24 words in 6.0s budget + 0.7s
  internal beats. Trimmed from plan-original (~31w)
  by compressing the deck-fate clauses: "One of them ends" →
  "One ends" (implied antecedent), "exist to help you survive it"
  → "help you survive" (no hedge verb), "Or to ensure your
  colleagues don't" → "Or ensure your colleagues don't" running
  with no preceding [BEAT]. Dark-closing gag preserved.

- **Music:** brass-bossa underscore continues to build, ramp(60) from 50→55% starting S03_START per cue-map. Full cue-map in preamble Music bed §.
- **No R15 in S03.**

**Voice:** Dash (Roger) sole.

**Transition out:** dossier-page wipe overlay component on S03 tail —
16 frames (frames 1364–1380), left-to-right reveal of destination
(S04 cascade entry). `EASE_IN_OUT = cubic-bezier(0.77, 0, 0.175, 1)`
per timing.ts. See Unit 1.4. **NOTE:** this is the S03→S04 transition
wipe (16 frames at scene tail), distinct from the internal 1.0s
mid-scene wipe between segments 1 and 2.

**Mobile safe square copy:** operative portraits + dossier text inside
1080×1080 central safe square per Unit 1.10.

---

### S04 — Receipts Cascade with Stacked Payoff (frames 1380–2370 / 33.0s)

**Visual — Cascade composition LOCKED (Unit 1.5).** Sequential
revelation with focal hierarchy. Each cascade element enters at full
visual weight INSIDE the central 1080×1080 safe square, reads at full
weight for 30 frames (1.0 s), then decays to 30% opacity chrome at
the right-edge slot column as the next element enters. Card-art halo
right-edge-only at 40% opacity throughout — texture, not focal.
Comms-ticker dim background until frame 2130, then a 60-frame ease
to "bright" by frame 2190 and HELD bright through stamp + VO + silent
hold. **Frame 2280 stamp slap is the trailer's ONLY "everything at
once" moment** — every other cascade frame has exactly one element
at full visual weight.

Three alternative compositions rejected (full rationale in
[`sample-eval/beat-sheet/cascade-composition.md`](sample-eval/beat-sheet/cascade-composition.md)):
full-bleed sequential (sequential ≠ stacked — loses payoff impact);
layered-simultaneous (six focal points at peak — AI-slop-shaped,
fails §2.2); sequential revelation with focal hierarchy (LOCKED —
supports R3 by reserving the stacked moment for frame 2280).

**Frame-by-frame storyboard.** This is the Phase 4 composition
contract — the audio cue table below carries the same frame ranges
from the Phase 2 voice-pipeline angle.

| Frame range | Focal element (100% weight) | Texture / chrome (30–40%) | Comms-ticker |
|-------------|-----------------------------|---------------------------|---------------|
| 1380–1440 | HTP hero slides up from bottom (60 f `EASE_OUT`, position 0→100% + opacity 50→100%) | parchment background only | dim |
| 1440–1620 | HTP dossier scroll (top portion) | — | dim |
| 1620–1740 | Stat 1 caption enters safe-square center-bottom (6 f `EASE_OUT`, scale 0.95→1.0, hold 30 f) | HTP hero 70% (texture under active caption) | dim |
| 1740–1890 | Stat 2 caption enters. Stat 1 decays (12 f `EASE_IN_OUT`, position morphs to right-edge slot, opacity 1→0.3, scale 1→0.65) | Stat 1 30% right-edge; HTP hero 70% | dim |
| 1890–2010 | Stat 3 caption enters. Stat 2 decays to right-edge. Card-art halo begins building (per-card slap, 2-f stagger, top 6 of the 17-art set) | Stats 1+2 30% right-edge; HTP hero 70%; halo right-edge 40% | dim |
| 2010–2190 | Stat 4 caption enters. Stat 3 decays. Halo completes (6-card right-edge column at 40%) | Stats 1–3 30% right-edge; HTP hero 70%; halo 40% | dim → brightening (60-f ease 2130–2190) |
| 2190–2280 | Cascade peak HELD — bright ticker is active signal; HTP/halo/stats are texture | HTP 70%; stats 30%; halo 40% | **BRIGHT (held)** — R15 #2 pulse |
| **2280** | **Heavy stamp slap onto HTP hero** (16 f, scale 0.85 → 1.06 overshoot at 12/16 → 1.0 settle, `EASE_OUT`). HTP drops to 50%. **Stamp is the SOLE focal point — only "everything at once" moment.** | — | bright |
| 2280–2340 | Stamp held; Dash VO delivers payoff line. | — | bright |
| 2310–2340 | Music duck ramp (`PAYOFF_DUCK_RAMP_FRAMES` = 30, 90% → 30%) completing as VO ends | — | bright |
| 2340–2370 | **Silent visual hold (30 f).** Stamp + HTP + halo + stats all static. Music at 30% bed-only. No VO. | — | held bright |
| **2370** | **Hard cut to S05 gameplay.** | — | — |

**Stat-slot decayed coordinates** (right-edge column INSIDE the
1080×1080 safe-square — accumulation survives mobile-X autoplay crop;
doesn't overlap with the active-caption center-bottom slot at x=960):

| Stat slot | Decayed x | Decayed y | Decayed scale | Decayed opacity |
|-----------|-----------|-----------|---------------|-----------------|
| Stat 1 (decay at 1740) | 1380 | 740 | 0.65 | 0.30 |
| Stat 2 (decay at 1890) | 1380 | 790 | 0.65 | 0.30 |
| Stat 3 (decay at 2010) | 1380 | 840 | 0.65 | 0.30 |
| Stat 4 (decay at 2190) | 1380 | 890 | 0.65 | 0.30 |

Active stat caption (during 30-f read window): x = 960, y = 900,
36 px dry / 22 px italic companion.

**Anti-pattern guard (LOAD-BEARING):** no frame in the cascade except
the 2280 payoff stamp has more than two elements at full visual
weight. Accumulated elements past their read window must hold at
≤ 40% opacity. Phase 4 in-studio walkthrough flags any violating
frame for retuning before MP4 export; Phase 6 final QA re-checks.

**Caption two-line collapse:** minimum legible size 28 px dry / 22 px
companion. If composition compression forces below this floor,
collapse to dry-stat-only (drop companion). Phase 4 enforces;
Phase 1 declares.

**HTP rendering method (LOCKED).** Primary path: clone UMB's
selector-agnostic `capture-htp-scroll.ts` (200 px scroll increments,
80 ms waits, full-page screenshot). Output:
`videos/trailer/public/htp-fullpage.png`. Phase 4 imports as `<Img>`
inside `<AbsoluteFill>` and drives via `translateY` interpolation.
Conditional Phase 3-entry perceptual gate: if static-PNG reveal-
state-frozen prototype fails §2.2 at the cascade 6-second read,
escalate to Playwright `page.video()` trace-video fallback
(`<OffthreadVideo>` consumer). Phase 3 plan budgets both paths.

**Constants consumed by Phase 4** (already shipped in
`src/lib/transitions.ts` at Unit 1.4):
`STAT_CAPTION_ENTER_FRAMES = 6`, `STAT_CAPTION_READ_HOLD_FRAMES = 30`,
`STAT_CAPTION_DECAY_FRAMES = 12`, `HALO_CARD_STAGGER_FRAMES = 2`,
`STAMP_SLAP_HEAVY_FRAMES = 16`, `STAMP_SLAP_HEAVY_START_SCALE = 0.85`,
`STAMP_SLAP_HEAVY_OVERSHOOT_SCALE = 1.06`,
`PAYOFF_DUCK_RAMP_FRAMES = 30`. No new constants introduced by
Unit 1.5.

Full lock + entry-choreography spec + ASCII storyboard sketches for
peak frames live at
[`sample-eval/beat-sheet/cascade-composition.md`](sample-eval/beat-sheet/cascade-composition.md).

**Audio — cascade cue table** (per Unit 1.2 Step 5 per-cue wps validation):

| Cue frame | Window (s) | Visual | VO line |
|-----------|-----------|--------|---------|
| 1380 | 2.0s | HTP dossier slides into hero position (Playwright capture) | > *"Operational planning."* <!-- @line: S04-cue-01 --> |
| 1440 | 3.0s | HTP scroll begins (top portion) | > *"Fourteen thousand pages of forensic dossiers."* <!-- @line: S04-cue-02 --> |
| 1530 | 3.0s | HTP scroll continues (middle portion) | > *"Drafted at three AM, name redacted for compliance."* <!-- @line: S04-cue-03 --> |
| 1620 | 4.0s | Stat 1 caption enters safe-square center-bottom at full weight | > *"Mission rehearsal: fourteen hundred and seven contingencies war-gamed."* <!-- @line: S04-stat-01 --> |
| 1740 | 5.0s | Stat 1 decays to chrome side-band; Stat 2 enters safe-square center-bottom | > *"Six of them, deliberately unrehearsed — the 'memorable ones.'"* <!-- @line: S04-stat-02 --> |
| 1890 | 4.0s | Stat 2 decays to chrome; Stat 3 enters safe-square center-bottom | > *"Seventeen asset illustrations. Five of them with hats."* <!-- @line: S04-stat-03 --> |
| 2010 | 6.0s | Stat 3 decays to chrome; Stat 4 enters safe-square center-bottom | > *"Seven on the roster. Six in the deck. One on the research budget. Don't ask."* <!-- @line: S04-stat-04 --> |
| 2190 | 3.0s | Cascade peak — comms-ticker brightens to held-bright state; HTP hero + accumulated halo (40%) + bright ticker; **no VO** | — |
| **2280** | 2.0s | **Stacked payoff stamp slaps onto HTP hero overprint (heavy 16-frame slap). HTP hero drops to 50% opacity. Cascade chrome (4 stats at 30% side-band, halo at 40%, bright ticker) IS the visual antecedent of "they." Dash VO delivers the 4-word truth-collision.** | > *"They WERE the operation."* <!-- @line: S04-payoff --> |
| 2310 | (within prior cue) | Music duck pre-anticipated ramp begins (90% → 30% over 30 frames, completes at 2340 as VO ends) | (VO continues) |
| 2340–2370 | 1.0s | **Silent visual hold: HTP hero + stamp + halo + 4 stats in chrome all static. Music at bed-only level (30%). No VO. The meaning-collision lands in the silence after the line, not in a second cue.** | — |
| 2370 | — | **Hard cut to S05 gameplay.** | — |

- **R15 #2 (frame 2010):** *"OPERATIVE [REDACTED] — METHOD REPEATABLE"*
  — comms-ticker pulse, JetBrains Mono 500 22px, scrolling left-to-
  right at bottom edge.
- **R15 #3 (frame 2280):** *"AUTONOMOUS FIELD UNIT — ASSET DELIVERED"*
  — dossier stamp slap (heavy 16-frame slap, scale 0.85 → 1.06
  overshoot at 12/16 → 1.0 settle), JetBrains Mono 700 38px,
  `--color-burned-fire` ink. **Overprints HTP hero**; visual carrier
  of the R3 stacked payoff.

**Voice:** Dash (Roger) sole; all cues `[deadpan]` leading except
S04-payoff which carries the controlled-deadpan payoff cadence at
the 2.0 wps ceiling.

**Transition out:** **hard cut to S05 at frame 2370** (NO cross-
dissolve — `<Series.Sequence>` boundary). Music duck completes BEFORE
the cut (frame 2340); 1.0s silent visual hold (frames 2340–2370)
lands the payoff; then hard cut. Per Unit 1.4 transition vocabulary
lock.

**Mobile safe square copy:** every cascade element inside the
1080×1080 central safe square. Side-band decay positions also inside
the safe square (mobile-X autoplay would otherwise crop the
accumulating chrome off-screen).

---

### S05 — Gameplay Dissolve (frames 2370–2910 / 18.0s)

**Visual:** Gameplay clip shape declared for Phase 5. Pre-trimmed
`public/trailer/gameplay.mp4` (540 frames / 1920×1080 / audio-stripped /
BURNED-draw at clip-relative frame 160 ± 3) consumed verbatim via
`<OffthreadVideo src={staticFile('trailer/gameplay.mp4')} muted />`
with NO `startFrom`/`endAt` props. **Hard-cut handoff at frame 2370
per Unit 1.4** — no cascade tail bleeds into S05; the cascade resolves
fully inside S04 with the 1.0 s silent visual hold landing the payoff
before the cut. Trim ownership = Phase 5.

**Audio:**

- **VO (Dash, frame 2610, sparse interjection):**

  > *"And — between you and me — they appear to be enjoying it."* <!-- @line: S05-gameplay-vo -->

  Bracket-tag treatment: `[sarcastic]` leading (Phase 2 Unit 2.3
  retune from original `[deadpan]`). 12 words / ~5.0s. Em-dash pauses
  for sotto-voce conspiratorial register.

- **VO (Dash, frame 2730, scream cue):**

  > *"VEEEEEEEERAAAA!!!"* <!-- @line: S05-scream -->

  Bracket-tag treatment: `[shouts]` self-closing (ElevenLabs v3 ONLY).
  Sterling-LANA four-axis acoustic shape per Phase 0 Unit 0.6
  cadence-spec.md §3.6: (1) flat pitch, (2) 6–12 dB amplitude jump
  vs gameplay bed, (3) FIRST-vowel drag, (4) accent anchored on first
  syllable. 200-frame-delayed reaction beat after clip-relative-160
  BURNED-card-draw at absolute frame 2530. `skipSilenceremove: true`
  in script.ts to preserve attack envelope.

- **Music:** brass-bossa underscore at 30% baseline; ducks under
  scream cue (frame 2730) for 15 frames either side, then returns to
  30%. Music ducks to 15% for 15 frames around the BURNED-card-draw
  moment (frame 2530) per Unit 1.2 Step 6 audio treatment.
- **Gameplay audio:** raw board ambient + phone-tap SFX + occasional
  player laugh, level-normalized to -12 dBFS RMS. UNEDITED beyond
  normalization (intentional "rough live authentic" reading).
- **No R15 in S05** (clean visual focus for live-gameplay frame).

**Voice:** Dash (Roger) sole. Two cues (gameplay-vo + scream).

**Transition out:** iris-wipe overlay component on S05 tail (45
frames, 1.5s, frames 2865–2910). `clip-path: circle(70.7% at 50% 50%)`
→ `clip-path: circle(0% at 50% 50%)` with
`EASE_IN_OUT = cubic-bezier(0.77, 0, 0.175, 1)`. Per Unit 1.4.

**Mobile safe square copy:** gameplay clip is full-frame; iris wipe
collapses to center which sits inside the central safe square by
construction.

---

### S06 — Closing Directive (frames 2910–3180 / 9.0s)

**Visual (Unit 1.10 lock):** briefing-room reestablishes via iris-wipe
from S05. Venetian-blind shadow returns; mahogany desk; depth-plane
foreground element from S02 returns (visual bookend). **Midground:**
dossier closes (reverse of S02 opening — 30-frame `EASE_DRAWER`);
dossier cover shows full Pendleton crest + classification stamp.
**Frame 3110:** BURNED LOGO (wordmark, NOT card art — differential
from S01) lands center, ~720 px wide, Clash Display 700 with chrome
treatment; 8-frame stamp-slap entry. **Frames 3110–3150:** logo holds
static for a 40-frame breathing-room hold (1.3 s) — emil "match motion
to mood — closing should breathe." **Frame 3150:** R15 #4 stamp
*"OPERATION STATUS: FIELD-READY"* slaps onto the closing card
(16-frame heavy slap; same envelope as R3 payoff stamp). **Frame
3165:** R15 #5 slaps below R15 #4 — main line *"DRAFTED, RENDERED,
AND SHIPPED BY AUTONOMOUS AGENTS."* + 30%-opacity subhead *"Honestly
at this point we're just impressed."* (LOCKED at Unit 1.9; 8-frame
standard slap — lighter envelope than R15 #4 to maintain hierarchy).
**CASE BANNER (S06):** label *"CASE FILE"* · operation *"OPERATION
PENDLETON"* · sub *"DEBRIEF · STATUS UPDATE"* · divider *"—"* · footer
*"02 / FIELD-READY"* (footer mutates EYES-ONLY → FIELD-READY mirroring
the R15 #4 status arc). **Frame 3173:** final brass sting on music bed
(60→100% ramp completes here); logo + R15 #4 + R15 #5 hold static.
**Frame 3180:** hard cut to black. Full S06 composition in
[`sample-eval/beat-sheet/briefing-room-comp.md`](sample-eval/beat-sheet/briefing-room-comp.md).

**Audio:**

- **VO (Dash, frame 2910, close):**

  > *"That's the briefing. Operation Pendleton is in your hands. Hold it tight."* <!-- @line: S06-close -->

  Bracket-tag treatment: `[sarcastic]` leading (Phase 2 Unit 2.3
  retune from original `[deadpan]`). 14 words at ~1.9 wps deliberate-
  close pace ≈ 7.4s. **"Hold it tight"** is the entendre setup line
  for Phrasing! — physical-action ambiguity per spec §3.5 earned-
  Phrasing! mechanic.

- **[BEAT 0.4s — 12 frames silence between close and Phrasing.]**

- **VO (Dash, frame 3144, Phrasing! punchline):**

  > *"Phrasing."* <!-- @line: S06-phrasing -->

  Bracket-tag treatment: `[excited]` leading (Phase 2 Unit 2.4 re-tune
  to `PHRASING_INTERJECTIVE_SETTINGS` in `elevenlabs.ts` — stab 0.30 /
  style 0.65 / speed 1.05; was `[deadpan]` in Phase 1). Resolver
  branches on `cadencePrefixTag === '[excited]' && voice === 'dash'`.
  Snappy rise on "Phra-" / fall on "-sing." callback Sterling-CODED
  cadence — NOT the arrogant-briefer drawl. FFmpeg fade curve: qsin
  (per plan Step 7 phrasing-specific fade shape). R15 #4 stamp
  *"OPERATION STATUS: FIELD-READY"* lands at frame 3150 (concurrent
  with Phrasing audio tail). R15 #5 closing-card lands at frame 3165
  (post-audio).

- **Music:** brass-bossa underscore climbs toward final beat, lands
  with the BURNED logo, fades during R15 #4 stamp; final sting tail
  frames 3156–3180 (0.8s).
- **R15 #4 (frame 3150):** *"OPERATION STATUS: FIELD-READY"* —
  subhead under BURNED logo, JetBrains Mono 700 32px,
  `--color-ochre-9` ink.
- **R15 #5 (frame 3165, closing-card cold-decode — LOCKED 2026-05-18):**
  Main line *"DRAFTED, RENDERED, AND SHIPPED BY AUTONOMOUS AGENTS."* —
  JetBrains Mono 700 32px (+50 tracking), `--color-ochre-9` ink. 30%-opacity
  subhead *"Honestly at this point we're just impressed."* — JetBrains
  Mono 500 italic 22px (+20 tracking). Both lines centered below R15
  #4. Subhead bookends Janet's S01 kicker (*"…I'm just impressed."* →
  *"…we're just impressed."*) — `"I'm"` → `"we're"` plural fold admits
  the autonomous-build collective speaker into the closing voice. 8-frame
  standard slap lands 15 frames after R15 #4's heavy slap; both hold
  through the final 15 frames until hard cut to black at 3180.

**Voice:** Dash (Roger) sole. Two cues (close + Phrasing!).

**Transition out:** hard cut to black at frame 3180. Both R15 #4 and
R15 #5 hold through the final 15 frames until cut.

**Mobile safe square copy:** BURNED logo + R15 #4 + R15 #5 all centered
inside 1080×1080 central safe square.

---

## Phase 0 carry-forwards (locked inputs)

| Input                       | Lock                                                                                                                                      | Source                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Dash voice                  | ElevenLabs Roger `CwhRBWXzGAHq8TQ4Fs17`, model `eleven_v3`, Roger defaults                                                                | Phase 0 Unit 0.2 (`videos/trailer/PHASE-0-EXIT.md` §Section 1)                    |
| Janet voice                 | ElevenLabs Eleanor – Gracious and Authoritative (Shared Library) `2qQJWjw5XdG80GreshqG`, model `eleven_v3`, cunty-matriarch-tuned voice_settings (Phase 0 locked Sloane `m8AHWg36LJTQWKmfeGVv`; Phase 2 Unit 2.3 re-locked Eleanor after cunty canary) | Phase 0 Unit 0.3 (`videos/trailer/PHASE-0-EXIT.md` §Section 2) + Phase 2 Unit 2.3 |
| S01 cold-open line          | *"He's a machine, this kid. Honestly at this point I'm just impressed."*                                                                  | Phase 0 Unit 0.3 (Section B Candidate #4)                                          |
| Cold-open composition shape | `SpikeColdOpen` — 8s / 240 frames; two fast cuts (Janet portrait → Dash portrait, 1s each) → held BURNED landing card; logo at frame 60   | Phase 0 Unit 0.5 spike (`videos/trailer/sample-eval/spike/spike-results.md`)      |
| R15 #1 stamp content        | `OPERATION PENDLETON / CASE FILE 02 / METHOD: AUTONOMOUS`                                                                                  | Phase 0 Unit 0.3 disposition                                                       |
| S04 payoff line             | *"They WERE the operation."* (4 words, 60-frame window, 2.0 wps deadpan)                                                                  | Phase 1 plan deepening (DOC-REVIEW rewrite)                                       |
| S05 scream line             | *"VEEEEEEEERAAAA!!!"* — Sterling-LANA four-axis shape, `[shouts]` tag prefix, lands at frame 2730                                         | Phase 0 Unit 0.6 (`videos/trailer/sample-eval/r5-scream/scream-eval.md`)          |
| Tone register               | Played-straight Sterling-CODED + earned-Phrasing! mechanic (entendre setup required)                                                       | Phase 0 Unit 0.4 (`videos/trailer/sample-eval/tone/eval.md`)                      |
| Composite viability         | All 5 integration points cleared (bare `<Series>`, `@remotion/media` audio, variable woff2, HTP scroll capture, Archer-grammar transitions) | Phase 0 Unit 0.5                                                                  |

---

## Voice cast lock + runtime accounting (Unit 1.3)

Voice cast is **2 voices** in this trailer: Dash (Roger / `eleven_v3`)
and Janet (Eleanor / `eleven_v3` — Phase 2 Unit 2.3 re-lock; Phase 0 was Sloane). Per-line voice + engine + prefixTag
table lives in `sample-eval/beat-sheet/voice-cast-lock.md`; the
machine contract is `src/lib/script.ts BURNED_TRAILER_LINES`.

**Total runtime accounting (R4 share):**

| Voice  | Voiced seconds                                                       | Share        |
| ------ | -------------------------------------------------------------------- | ------------ |
| Janet  | 5.00 s (S01-cold-open)                                               | 6.6 %        |
| Dash   | 70.17 s (15 cues across S02–S06)                                     | **93.4 %**   |
| **Total voiced** | **75.17 s**                                                    | **100 %**    |

R4 target is **~90 % of voiced runtime**. **93.4 % clears the
target.** Unvoiced surface (30.83 s of the 106.0 s total clock — Tier-4 expansion 2026-05-22 absorbed S03 Sterling-read overrun primarily into longer voiced+pause time):
gameplay audio carries S05 between cues, brass hook + R15 #1 stamp
at S01 head, music duck + 1.0 s silent payoff hold at S04 tail,
closing music sting tail at S06.

R5 (scream cue) retained per Phase 0 Unit 0.6 close — Dash screams
`VEEEEEEEERAAAA!!!` at frame 2730 in Sterling-CODED volume-discontinuous
register. If a future revision elects R5-cut, drop the S05-scream
Line; the test suite's "exactly one scream cue" assertion is on
cueType not line-id.

---

## Open follow-ups (per AMENDMENT 2026-05-18)

- ~~**R15 #5 subhead re-derivation**~~ — **RESOLVED at Unit 1.9 (2026-05-18):
  option (a) *"Honestly at this point we're just impressed."* LOCKED.**
  Three-candidate decision documented in the R15 instance table above
  (preamble §R15 chrome instances). Subhead bookends Janet's S01 kicker
  via the `"I'm"` → `"we're"` plural fold.
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
| S03 → S04 | Dossier-page wipe | 1364–1380 (16 frames in S03 tail) | Mission Background ends on the deck-of-120 reveal; the dossier page turns and reveals the cascade. Honors the diegetic frame. Left-to-right reveal per page-peel metaphor (`clip-path: inset(0 0 0 0)` → `inset(0 0 0 100%)`). |
| S04 → S05 | **Hard cut after 1.0s payoff hold** | 2370 | Replaces former cross-dissolve. Payoff stamp + VO land 2280–2340; visual freezes 2340–2370 (music at bed-only); hard cut to gameplay. Music ducks pre-anticipated ramp (2310–2340) so duck completes as VO ends. |
| S05 → S06 | Iris wipe | 2865–2910 (45 frames in S05 tail) | Closing transition. Iris wipes the gameplay frame closed; briefing-room frame reestablishes underneath for the closing directive. Title-sequence-shape echo at trailer close. `clip-path: circle(70.7% at 50% 50%)` → `circle(0% at 50% 50%)` with `EASE_IN_OUT`. |
| S06 → end | Hard cut to black | 3180 | The trailer ends. No "fade to black" — Archer hard-cuts to credits. |

### Cross-dissolve REMOVED (DOC-REVIEW lock)

The former R3 cross-dissolve at S04→S05 was replaced with a hard cut
during deepening. Multi-agent consensus:

- **Design-lens:** Cross-dissolve isn't Archer-native; Archer hard-
  cuts or wipes, doesn't dissolve between briefing-room and field
  footage. Hard cut after the 1.0s payoff visual hold is more
  shocking and more earned.
- **Framework-docs:** `<TransitionSeries>` overlap math (`total =
  sum - transitions`) would contradict timing.ts's declared 3180
  total. Dropping the cross-dissolve lets us use bare `<Series>`
  (UMB precedent).
- **Adversarial:** The former cross-dissolve framing had 3 mutually-
  inconsistent claims about silence + VO + dissolve overlap.
  Hard cut at 2370 after a clean 1.0s hold resolves all three.
- **Best-practices:** Audio doesn't cross a dissolve for free; music
  needed explicit volume interpolation regardless. Hard cut + pre-
  anticipated music duck completing at 2340 is cleaner.

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
