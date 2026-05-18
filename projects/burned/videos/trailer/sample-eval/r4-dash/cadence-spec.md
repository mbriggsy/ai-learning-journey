# Cadence Spec — Dash, Sterling-CODED Narration

> **Source-of-truth document** for Phase 0 Unit 0.2 — R4 Dash TTS
> Cadence-Match Gate. Produced by Step 0 research (2026-05-17) per the
> Sterling-CODED, not Sterling-cloned design principle (Roadmap ADR
> #13).

## 1. Purpose & scope

This spec converts H. Jon Benjamin's distinctive Sterling Archer
delivery into **teachable cadence specifications** that any modern TTS
engine (or human voice actor) can execute on a **non-identifying
voice**.

The downstream consumers of this spec are the three Step 1.5 adapter
files:

- `cadence-spec-elevenlabs.json` — numeric `voice_settings` +
  bracket-tag annotations + optional Voice Design prompt
- `cadence-spec-gemini.md` — Director's Chair structured prompt
- `cadence-spec-openai.md` — ~500-word `instructions` parameter string

**Out of scope (load-bearing exclusions):**

1. **No Benjamin audio is uploaded to any cloning engine.** Path B's
   10-second sample is Briggsy's own voice, with full ownership and
   license. All other engine paths use pre-existing preset voices or
   steered synthesis on default speakers.
2. **No mimicry of identity-suggesting markers** — e.g. Benjamin's
   recognizable laugh signature, his exact vowel placement on
   "Lana," any breath-pattern habits unique to him as a performer.
   The spec is *style abstraction*, never *impression*.
3. **No exact-script reproduction from the show.** Sample paragraphs
   live in `scripts/sample-script-dash.ts` and are derived from
   BURNED's own howtoplay copy, not from Archer episode scripts.

## 2. Sterling-CODED, not Sterling-cloned (design + legal floor)

Per Roadmap ADR #13, BURNED's voice obeys the same rule as its visual
identity: **mimicry of style, never replication of identity** (the
audio analog of "Archer-CODED visuals that scream Archer without being
Archer").

The legal floor that aligns with this design choice:

| Instrument | Effective date | Bar |
|---|---|---|
| ElevenLabs Prohibited Use Policy | updated 2025-09-03 | Forbids unauthorized impersonation, including voice replication of any identifiable person without consent. |
| Tennessee ELVIS Act | 2024 | Classifies unconsented voice clones of public figures as actionable. |
| Federal NO FAKES Act (proposed) | pending US Congress | Same direction at federal level. |
| EU AI Act (phased) | 2025-08 onward | Classifies unconsented voice clones as high-risk / actionable. |

Right-of-publicity claims survive "satire" framing for commercial
content; a non-monetized trailer is still commercial-promotional.

**Operative rule for the engine matrix:** every Path (A / B / C-Gemini
/ C-OpenAI / D) targets archetype recognition (deadpan spy / noir
narrator / sardonic detective register cluster), **never actor
recognition**. The Step 4 MUSHRA panel's bonus-signal question
("Whose voice does this sound like?") is the diagnostic — any
listener volunteering "Benjamin" or "Sterling Archer" by name in a
free-form text response triggers Ceiling rejection per §5 below.

## 3. Vocal characteristics — engine-steerable specs

Each row is the *what to encode*. Every claim is footnoted to a
primary source consulted during Step 0 research (see §7).

### 3.1 Pitch / register

- **Mid-baritone.** Mean F0 ~110–120 Hz, narrow standard deviation
  (~10–15 Hz) on declarative sentences. [^1]
- **Doesn't break under emotional pressure.** Sterling almost never
  raises *pitch* even when screaming — the scream is
  **volume-discontinuous, not pitch-discontinuous**. F0 ceiling on
  high-stress excursions stays ≤ ~200 Hz; peaks above that read as
  panicked / falsetto and are *out of register*. [^1] [^4]
- **TTS specification:**
  - Default F0 in the 110–120 Hz mean band.
  - Limit F0 spread to ±15 Hz on declarative reads.
  - On screams / shouts, do NOT raise F0 above ~200 Hz; raise
    amplitude instead (see §3.6).
  - Engine adapters that expose explicit `stability` controls
    (ElevenLabs `stability` parameter) should bias *toward stability*
    on the deadpan reads to suppress F0 wandering.

### 3.2 Pace

- **"Never rushes a joke."** Benjamin lingers; makes the audience wait
  for the punchline. [^1] [^4] This is the load-bearing comedic
  mechanism — pace is the rhythm of the deadpan.
- **Slightly slower than American conversational baseline.** Phoneme
  durations approximately 5–10% longer than standard conversational
  rate for setup lines and sardonic observations. [^1]
- **Strategic pause architecture:**
  - Inter-word pauses: ~200–500 ms at phrase boundaries when comedic
    timing matters. [^1]
  - Pause **before** a punchline payoff to build anticipation —
    duration scales with setup complexity (typical 0.75–1.0 s on a
    deadpan landing). [^4]
  - Pause **before** the "Phrasing!" callback specifically: ~0.5–1.5
    s, scaling with how obvious the double-entendre is. [^4]
- **What NOT to encode:** even spacing. Sterling-CODED pace is
  *deliberate*, not *metronomic*. Engine outputs that flatten the
  inter-phrase pause distribution into a uniform value read as
  audiobook narration, not deadpan delivery — a Floor-band failure
  mode (§5).

### 3.3 Articulation

> **⚠ CORRECTIVE TO PLAN STARTING HYPOTHESIS.** The Step 0 research
> hypothesis described Sterling's articulation as *"Mid-Atlantic —
> clipped consonants, lengthened vowels on emphasis, slight nasal
> resonance."* Primary research contradicts that characterization:
> *"Sterling Archer's voice work is generally described as his
> natural speaking voice, characterized as **General American with a
> light New England or 'East Coast prep' influence**, rather than a
> strict adherence to the classic Mid-Atlantic accent."* [^2]
>
> Specifically: Sterling does **NOT** consistently display the key
> phonetic markers of true Mid-Atlantic (non-rhoticity, the
> dropped-'r' that turns "car" into "cah" and "mother" into
> "mothah"; the lengthened broad-A pronunciation; or the
> Edith-Skinner pedagogical "crisp T" treatment).
>
> The corrected target is **General American with East-Coast prep
> affectation** — closer to a Choate / Andover / Yale-club register
> than to Cary Grant or FDR.

- **Crisp, clear enunciation, but rhotic.** Pronounce 'r' sounds at
  word endings and before consonants — "car" stays "car," not "cah."
- **Conversational clarity, not stage-elocution.** Avoid overly
  precise robotic articulation; aim for clear consonant attacks with
  natural vowel placement — the upper-class register reads through
  *vocabulary choice and rhythm*, not through accent affectation.
- **Light East-Coast prep flavor** — subtle, never theatrical. If the
  engine surfaces an accent slider, set to "General American" with
  any "Northeastern" / "boarding-school" weight added only as a
  gentle bias, never as a full accent shift.
- **TTS specification:**
  - Default to General American accent setting on every engine.
  - Do NOT request "British," "Mid-Atlantic," "Transatlantic," or
    "RP" presets — these will overshoot into Cary Grant / Frasier
    Crane territory, which is a different register entirely.
  - For ElevenLabs Voice Library selection: filter for "American" or
    "American (Neutral)," exclude British/Mid-Atlantic. Mid-baritone
    + "deadpan" / "noir" / "narrator" tag is the right starting
    cluster.

### 3.4 Intonation contours

- **Predominantly flat on declaratives.** Pitch "rarely peaks or
  drops. It's flat like the midwest plains," contributing the
  deadpan effect. [^1] Limit rising or falling intonation at phrase
  endings to subtle, almost imperceptible shifts, unless indicating a
  question or strong emotion.
- **Declarative falling intonation on punchlines** ("downspeak"). The
  pitch at the end of a punch-line sentence falls into a lower
  register — sometimes into vocal fry — delivering the line with
  finality and grim irony. [^3] This is the noir-narrator
  contribution to the Target Band cluster.
- **Sardonic micro-lift on terminal syllables** of dry observations.
  ~5–10 Hz upward inflection on the final syllable of a sarcastic
  phrase, often paired with slight syllable lengthening. [^1] [^3]
  This is the *only* intonation excursion that's tonally Sterling-
  coded outside of explicit emotional spikes (rage, panic).
- **Confidence baseline.** Even rhetorical questions stay close to
  flat — Sterling subverts the typical rising question contour.
  Benjamin explicitly contrasts Archer's *"never not confident"* tone
  with Bob Belcher's *apprehensive* delivery. [^1]
- **TTS specification:**
  - Engine adapters should request flat-contour intonation as the
    default and reserve excursions for explicitly tagged moments
    (e.g. ElevenLabs `[sarcastic]` bracket tag; Gemini Director's
    Notes call-out; OpenAI instructions referencing
    "sardonic-detective falling intonation on punch-lines").
  - "Audiobook" preset = wrong. "Conversational" preset with
    *narrow* expressive range is closer.

### 3.5 Mannerisms

- **"Wavers and gets distracted by a tangent."** A signature Benjamin
  delivery "begins at a place of complete confidence, wavers, gets
  distracted by a tangent, and ends on a note of obsessive stoner
  speculation." [^1] Encode as: temporary decreases in volume + slight
  speaking-rate increase during parenthetical thoughts; trailing
  volume + subtle rhetorical upward inflection at the end of tangents.
- **The exhausted exhale.** Audible, controlled exhale before or
  after lines that read as "I am exhausted by you specifically." [^4]
  Engines that accept inline breath tags (ElevenLabs `[exhale]`,
  Gemini SSML-equivalent) should place these BEFORE exasperated lines.
- **The comic-pause-then-deadpan-payoff timing.** Setup → measured
  pause (0.75–1.0s) → payoff delivered flat. The pause is the
  punchline preparation; the deadpan delivery is the punchline. [^4]
- **What NOT to encode:**
  - Benjamin's recognizable laugh signature.
  - His specific delivery of "Lana" — the cadence, the vowel
    placement, the rising-tone repetition pattern. Path B Voice
    Library selection MUST avoid voices tagged with proximity to
    that pattern.
  - Any catchphrase-impression bias. The word "Phrasing" appears in
    sample paragraph #2; the engine should pronounce it
    *deadpan-flat* (the BURNED howtoplay copy already renders it
    with a leading ellipsis: `…Phrasing.`), not with Benjamin's
    distinctive comedic-shout delivery.

### 3.6 Volume dynamics + sustained-call shape

The Sterling-coded scream has a **four-axis acoustic shape**
(characterization refined 2026-05-18 in Unit 0.6 audition; v3 lock
post-Briggsy A/B vs v1/v2). All four axes must land for the read to
clear Target Band:

1. **Pitch flat — volume-discontinuous, NOT pitch-discontinuous.**
   ~6-12 dB amplitude jump above conversational baseline *without*
   corresponding F0 rise (per §3.1). Engines that scream by raising
   pitch into falsetto fail this row. [^1] [^4]
2. **Amplitude jump.** The volume-discontinuity is large enough to
   read as a hard cut from the deadpan register, not a ramp. ~6-12 dB.
3. **First-vowel drag (sustained-call shape).** The stressed first
   vowel is stretched into a multi-second sustained drone — the
   comedic core of "Laaaaaaaaaaaana!" / "Veeeeeeeeraaaa!". Duration
   is the load-bearing variable, not just loudness. Engines that
   render a fast burst (short vowel, no drag) deliver an acoustic
   "shout" but miss the Sterling shape entirely. Encoded in the
   sample script via repeated first-vowel chars (e.g., `VEEEEEEEE`
   in `PARAGRAPH_3_SCREAM`).
4. **Accent anchored on first syllable.** Even with the vowel
   stretched, primary stress stays on the first syllable. If the
   engine shifts the accent to whichever vowel is dragged, the read
   breaks Sterling-LANA shape. Unit 0.6 v2 failure mode: trailing-A
   drag (`VERAAAAAAAAAAA`) triggered an R+A blend elongation AND
   accent migration to the second syllable — both wrong. v3 fix:
   primary drag on the FIRST vowel with secondary (shorter) drag
   on the trailing vowel anchors the accent in place.

The compressed dynamic range from §3.6 axis 1 applies to
**conversational reads** — Sterling-coded reads sit at a narrow
amplitude band (small dB excursions, no swelling, no swallowed
phrases [^1]). Axis 2 (amplitude jump on the scream) is the
discontinuity *against* that compressed baseline — without the
compressed baseline, the jump reads as conventional dramatic
delivery, not Sterling-coded comedic shock.

**TTS specification:**

- Default `style` parameter (ElevenLabs) to a low/moderate value
  on the deadpan paragraphs to suppress engine-default expressive
  swelling.
- For the scream clip:
  - Engine must support amplitude scaling via inline tag
    (ElevenLabs `[shouts]`) or per-segment direction (Gemini section
    marker; OpenAI per-segment instruction split). Engines that
    scream by raising pitch instead of raising amplitude fail axis 1
    — flag in `results.md`.
  - Engine must respect repeated-vowel character sequences as
    duration cues for axis 3 (vowel-drag). ElevenLabs v3 does — v3
    audition validated `VEEEEEEEERAAAA` produces a longer EE sustain
    than `VERA`.
  - Engine must NOT shift primary stress to whichever vowel cluster
    is longest. Encode accent anchor structurally by making the
    first-vowel drag DOMINANT over any trailing-vowel drag
    (`E+ > A+` count). Axis 4 enforcement.
- Avoid engines that auto-compress dynamic range across the full
  clip (some `gpt-4o-mini-tts` voices do this by default) — that
  cancels axis 2's volume-discontinuity contrast.

### 3.7 What NOT to encode (consolidated)

| Anti-pattern | Why it's wrong | Detection cue |
|---|---|---|
| Recognizable laugh signature | Identity-suggesting, Ceiling-band | Listener says "Benjamin" by name |
| "LANA" exact vowel placement / cadence | Identity-suggesting, Ceiling-band | Listener says "Sterling Archer" by name |
| Mid-Atlantic / Transatlantic accent | Wrong register — overshoots into Cary Grant | Listener says "old Hollywood" / "Cary Grant" / "Frasier" |
| Rising-pitch screams | Wrong dynamics — Sterling's screams are volume-discontinuous, not pitch | Scream sounds panicked / falsetto instead of guttural |
| Even / metronomic pause spacing | Reads as audiobook narration, not deadpan delivery | Listener says "audiobook" / "narrator" / "documentary" |
| Auto-compressed dynamic range | Cancels the volume-discontinuity contrast | Scream not noticeably louder than deadpan reads |
| Catchphrase-impression bias on "Phrasing" | Identity-suggesting | Listener references the show's catchphrase mechanic |
| Theatrical articulation / stage elocution | Wrong rhythm — Sterling is conversational, not declamatory | Listener says "Shakespearean" / "theatrical" / "narrating a documentary" |

## 4. Comparison anchors (Target Band exemplars)

These are the established register exemplars the Target Band targets.
Engine adapters should reference these by name when steering allows
free-form genre tags (Gemini Director's Notes, OpenAI instructions).

### 4.1 Rod Serling — The Twilight Zone

Serling's narration is the closest established comparison point in
American voice-acting for what Dash should sound like.

- **Clipped manner of speaking** with **authoritative delivery**. [^3]
- **Short bursts of words** (a few at a time) followed by deliberate
  pauses — creates a distinctive rhythm. [^3]
- **Consistent downspeak** at sentence ends, often leading into vocal
  fry — contributes the foreboding / philosophical tone. [^3]
- **Consonant emphasis** (pops T's and D's) with mouth tight and
  restricted — a small, tight, non-resonant voice (NOT booming). [^3]
- Sometimes shortens vowels and lengthens nasal consonants. [^3]

**What to take from Serling:** the clipped-then-paused rhythm, the
downspeak punchline endings, the consonant attack, the
non-booming-and-tight quality.

**What NOT to take from Serling:** the explicitly philosophical /
foreboding gravity. Dash is sardonic and exasperated, not
contemplative.

### 4.2 Raymond Chandler audiobook narrators — Elliott Gould, Ray Porter

Both are widely praised as standard-of-genre for the sardonic-detective
register. [^3]

- **Elliott Gould** — "low-key reading," embodies Marlowe's
  cynicism through understatement.
- **Ray Porter** — "grim, tell-it-straight, no nonsense tough guy"
  with appropriate weight on every word.
- Common features (per [^3]):
  - Measured pace, conveying observant / thoughtful nature.
  - Understated tone, refusing overt emotion.
  - Subtle inflection shifts for irony and internal monologue.

**What to take:** the measured pace, the understatement, the
inflection-for-irony technique.

### 4.3 Film noir voiceover tradition

- **Deadpan, noir-esque delivery** capturing moral ambiguity and
  bleakness. [^3]
- **Cynical, sarcastic, metaphor-filled** monologue. [^3]
- **First-person internal-monologue framing.**
- Classic examples: Joe Gillis (*Sunset Boulevard*), Walter Neff
  (*Double Indemnity*).

**What to take:** the cynical-internal-monologue framing, the
deadpan attitude toward absurd events, the metaphor density.

## 5. Three-band spectrum

The MUSHRA acceptance gate at Step 4 rates engine outputs against this
three-band shape. The Target Band is **intentionally broad** — any
listener-volunteered descriptor in the adjacent-register cluster is a
Pass. The Ceiling is the hard bound; listener-volunteered actor
recognition is the Pass/Fail diagnostic.

| Band | Listener descriptions | Disposition |
|---|---|---|
| **Floor** (insufficient) | "generic narrator," "doesn't sound like anything in particular," "could be any audiobook," "documentary voiceover," "neutral male voice," "AI assistant," "podcast intro voice" | Re-steer — tighten genre-anchor mannerisms, add pause architecture, increase consonant attack |
| **Target Band** (success) | "deadpan briefing voice," "spy register," "film noir," "sardonic detective," "Archer-coded register," "briefing room," "Rod Serling-adjacent," "Chandler narrator," "noir narrator," "wry / dry / arched," "Twilight Zone narrator," "world-weary," "1940s detective" | **Pass** |
| **Ceiling** (too close) | "this is impersonating Jon Benjamin," "this IS Sterling Archer," "trying to BE Archer," "Benjamin doing Archer," "literal Archer clone" | Re-spec — strip identity-suggesting characteristics from adapter file (typically: F0 placement too close to Benjamin's modal; "Lana"-pattern in screaming; recognizable laugh; mid-Atlantic affectation accidentally tipped into impression) |

### 5.1 Refinements vs the plan's starting hypothesis

The plan's starting-hypothesis table seeded Target-Band descriptors:
"deadpan briefing voice," "spy register," "film-noir," "sardonic
detective," "Archer-coded register," "briefing-room." Step 0 research
**ADDS** these cluster-adjacent descriptors based on the explicit
exemplar set (Serling, Chandler, noir voiceover) — they're Target-
Band wins because they're in the same register cluster, even though
the plan didn't enumerate them:

- "Rod Serling-adjacent"
- "Chandler narrator" / "Marlowe-adjacent"
- "Twilight Zone narrator"
- "wry / dry / arched"
- "world-weary"
- "1940s detective"

Step 0 research **REMOVES** "mid-Atlantic-coded" / "Transatlantic-
coded" from the Target Band per §3.3 corrective — those descriptors
indicate the engine has overshot into Cary Grant register, which is
adjacent to but distinct from Sterling-CODED.

### 5.2 Ceiling diagnostics

Free-form listener response is the diagnostic. **Any** of the
following triggers Ceiling disposition for that engine path:

1. Listener volunteers "Benjamin" or "H. Jon Benjamin" by name.
2. Listener volunteers "Sterling Archer" or "Archer" by character
   name (not by "Archer-coded" register descriptor).
3. Listener references show-specific catchphrase mechanics
   ("Phrasing," "Danger Zone," "LANA").

The Step 4 listener instrument explicitly asks: *"Whose voice does
this sound like, if anyone's?"* with a free-form text field. Any of
the above three responses appearing in any of the N listener
responses for a given path → path is treated as Ceiling for that
listener (1 Ceiling hit on a 6-listener panel = Ceiling threshold
breached; spec adjustment required, full re-eval).

## 6. Open questions deferred to Step 0.5 audio pre-flight

These cannot be resolved from textual research alone; the cheap
Gemini pre-flight clip is the gate that produces evidence:

1. **Does the spec produce a Target-Band landing on a default voice?**
   Step 0.5 generates ONE Gemini clip on a non-identifying mid-
   baritone male preset, plays to one Archer-fan + one cold reader,
   asks the §5 question. **Both Yes → spec is good, proceed to Step
   1.5.** Split or both No → revise this document, re-run pre-flight
   (revision cap: 3 rounds).
2. **Does the §3.3 corrective land in practice?** The "General
   American + East-Coast prep" framing may need further tuning if
   the engine over-Americanizes the read (loses the upper-class
   register entirely → listener says "regional Midwestern" / "any
   American guy").
3. **Does the §3.5 "exhausted exhale" tag work cross-engine?**
   ElevenLabs has explicit `[exhale]` tags; Gemini relies on script
   parenthetical "(quiet exhale)" landing in the prosody; OpenAI may
   need a per-segment instruction split. Pre-flight clip should
   include at least one exhale-positioned line.

Step 0.5 outcome file: `preflight/preflight-decision.md` —
existence + Yes verdict is the sentinel Step 1.5 gates on.

## 7. Sources

Primary research sources consulted 2026-05-17 via gemini-grounding.
Citations below trace specific claims back to source material; all
claims in §3, §4, and §5 are derived from these sources (or from
direct reading of BURNED's own product specification and Roadmap ADR
#13). **No claim in this document is sourced from working memory.**

[^1]: H. Jon Benjamin voice-acting analysis — character vocal
  characteristics (mid-baritone, monotone-with-emotional-spikes, "never
  rushes a joke," waver-and-tangent signature, comparison to Bob
  Belcher's apprehensive register). Synthesizes interview material:
  Daily Actor ("Q&A: H. Jon Benjamin Talks 'Archer'"); Looper
  ("H. Jon Benjamin, Voice Of Sterling Archer — Exclusive
  Interview"); KSDK ("H. Jon Benjamin Interview"); The Verge
  ("On The Verge: interview with voice actor H Jon Benjamin"); CBR
  ("H. Jon Benjamin Answers All of Your Burning Questions About
  'Archer'"); VICE ("H. Jon Benjamin Voices His Thoughts on Funny
  Voices in 2015"); California Sunday Magazine ("A Lot of People Would
  Call it a Sexy Voice"). Reddit r/ArcherFX threads consulted for
  fan-observed cadence shifts across seasons; *use earlier-and-mid-
  run season material* as the reference (post-pandemic remote-recording
  artifacts are not representative).

[^2]: Mid-Atlantic accent characterization + corrective on Sterling's
  actual register. Primary sources: Wikipedia ("Mid-Atlantic accent"
  + "Transatlantic accent" articles); Edith Skinner's *Speak with
  Distinction* (1942) — historical pedagogical reference;
  University of Pennsylvania linguistic department materials;
  BoldVoice / Backstage / Mandy.com voice-acting training resources
  on the accent. **Sterling-specific corrective** (Archer's voice is
  General American + East-Coast prep, NOT Mid-Atlantic) drawn from
  the same body of sources cross-referenced with fan-community
  perception (Reddit, Quora). Notable phonetic markers of true
  Mid-Atlantic (non-rhoticity, broad-A, lengthened vowels, "crisp T,"
  yod-retention) do NOT appear consistently in Benjamin's Sterling
  delivery.

[^3]: Sardonic-detective / noir-narrator vocal register tradition.
  Rod Serling characterization: Voquent ("Voice Over in Film
  Noir"), Mental Floss ("How To Do A Rod Serling Voice
  Impression"), Talking Draft (Serling dictabelt recordings
  digitization). Chandler audiobook narrators: SFFaudio.com,
  Reddit r/audiobooks threads on Elliott Gould + Ray Porter
  Marlowe narrations. Film noir voiceover tradition: The Voice
  Realm ("Film Noir's Role in Voiceover"), Weebly noir-narrative-
  conventions reference, Anthony Cardno + Malcolm's Roundtable
  blog analyses. Cleveland State University + University of
  Tennessee public-speaking pedagogical references on vocal
  delivery dimensions (pace, intonation, pause, breath).

[^4]: Sterling Archer specific comic-timing structure. Phrasing
  callback pause architecture (0.5–1.5s); deadpan-statement
  pause (0.75–1.0s); pause-before-payoff scaling with setup
  complexity. Sources: ScreenRant Archer character-voice
  breakdowns, Pajiba Archer cultural-impact analyses, Fandom
  Archer wiki cadence notes, FX Networks press materials on
  Adam Reed's writing style + voice-actor recording isolation,
  Grokipedia comic-timing-principles entry, Backstage articles
  on comedic timing for actors, Voices.com + VOTrainer
  resources on breathing techniques for voice actors. AwN.com
  ("Archer: The Comedy of Sound") on the show's specific
  comedic-dialogue mechanics.

**BURNED-internal sources:**

- `docs/PRODUCT-SPECIFICATION.md` §3.5 — Phrasing! catalog +
  abundance-not-restraint principle.
- `docs/plans/origin-trailer/roadmap.md` ADR #13 — Sterling-CODED,
  not Sterling-cloned (2026-05-16 lock).
- `docs/plans/origin-trailer/phase-0-gate-resolution.md` §
  "Sterling-CODED, not Sterling-cloned" — design + legal floor.
- `~/.claude/memory/feedback-narrator-voice-direction.md` — CRITICAL
  anti-pattern: never prepend VOICE_DIRECTION text to the TTS
  payload. The engine reads it aloud. This mistake has been made
  TWICE in prior UMB v3 narrator work; codified in Phase 0 as the
  per-engine guard variants (Roadmap ADR — Unit 0.2 Test Scenarios).

## 8. Document conventions

- All footnoted claims trace to a primary source consulted via
  gemini-grounding on 2026-05-17.
- Numeric ranges (F0 in Hz, pause durations in ms) are starting
  hypotheses; Step 0.5 pre-flight + Step 4 MUSHRA results refine.
- Updates to this document during Step 0.5 (revision rounds) must
  include a §9 amendment log entry citing the listener-feedback
  signal that drove the revision.

## 9. Amendments

| Date | Change | Trigger |
|---|---|---|
| 2026-05-17 | Initial draft. | Step 0 research complete. |
