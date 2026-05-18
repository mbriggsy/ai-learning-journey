# Cadence Adapter — Gemini Flash TTS (Director's Chair)

> **Phase 0 Unit 0.2 Step 1.5 deliverable** — translates
> `cadence-spec.md` into the Gemini Flash TTS Preview "Director's Chair"
> structured-prompt shape. Consumed by `scripts/generate-preflight-clip.ts`
> (Step 0.5) and `scripts/generate-tts-eval.ts` (Step 2 engine matrix
> — pending Briggsy ElevenLabs Creator + OpenAI keys).

## 1. How Gemini Flash TTS Preview reads this file

The text the script POSTs to Gemini is the **single string** between the
`---PROMPT START---` and `---PROMPT END---` markers in §4 below, with
`{TRANSCRIPT_SLOT}` substituted for the actual script content at the
call site.

The four section markers — `## AUDIO PROFILE`, `## SCENE`,
`## DIRECTOR'S NOTES`, `### TRANSCRIPT` — are **load-bearing**.
Per the Gemini Flash TTS docs and the `feedback-narrator-voice-direction`
memory (twice-bitten failure mode in prior UMB v3 narrator work),
Gemini reads ALL prose as the read-aloud transcript unless the
`### TRANSCRIPT` marker explicitly demarcates where the read content
begins. Strip a marker and the cadence-spec prose gets spoken aloud.

The VOICE_DIRECTION anti-pattern guard at every call site
(`generate-preflight-clip.ts`, `generate-tts-eval.ts`) asserts the
substitution slot ends up under `### TRANSCRIPT` and nothing else
leaks into the steering sections.

## 2. Model + voice selection

| Field | Value | Rationale |
|---|---|---|
| Model | `gemini-3.1-flash-tts-preview` | Latest Gemini Flash TTS model as of 2026-05-18. Free tier covers single-clip experiments. |
| Voice | `Charon` (primary) | "Informative" descriptor — closest Gemini prebuilt to the Target Band cluster (Rod Serling-adjacent / deadpan briefer / sardonic narrator) per cadence-spec §4.1. |
| Sample rate | 24 000 Hz | Gemini Flash TTS native output (16-bit signed little-endian, mono). |
| Response shape | base64 PCM in `candidates[0].content.parts[0].inlineData.data` | Wrap with inline WAV header (44-byte RIFF) at the call site — no `wav` npm dep. |

**Voice alternates if Charon over-narrates / under-deadpans:**

| Voice | Descriptor | When to try |
|---|---|---|
| `Orus` | "Firm" | If Charon reads too "documentary," Orus is colder/tighter. |
| `Rasalgethi` | "Informative" | Sibling to Charon; try if Charon's mid-baritone center is too high. |
| `Sadaltager` | "Knowledgeable" | If the Target-Band miss is "doesn't sound like he's done this before," Sadaltager carries authority. |
| `Algenib` | "Gravelly" | Floor-band recovery — if reads feel "too young / too clean," Algenib adds noir gravel without tipping into impression. |

**Voice anti-picks:** `Puck` (Upbeat), `Fenrir` (Excitable), `Leda`
(Youthful), `Aoede` (Breezy) — all collide with §3.4 (flat declarative
contours) and the deadpan-on-punchline §3.4.

## 3. Substitution slot conventions

`{TRANSCRIPT_SLOT}` is replaced at call time with one of:

| Call site | Slot content | Approx duration |
|---|---|---|
| `generate-preflight-clip.ts` (Step 0.5) | `PARAGRAPH_1_PREFLIGHT` from `sample-script-dash.ts` — 32-word trim of paragraph 1 | ~14–16 s |
| `generate-tts-eval.ts` Step 2 (pending keys) | Full three-paragraph `DASH_SAMPLE_SCRIPT` concatenated with separator newlines | ~32 s |

No script-modification prose (e.g. "now read this slower," "pause here")
gets prepended to the slot — those directions live in §4's `## DIRECTOR'S
NOTES` block above the `### TRANSCRIPT` marker. The slot contains only
the literal words to be voiced, exactly as a human reader would see them
on a teleprompter.

## 4. Director's Chair prompt — verbatim template

Everything between `---PROMPT START---` and `---PROMPT END---` (inclusive
of section markers, exclusive of the fence lines themselves) is the
literal string POSTed to Gemini. Whitespace inside the block is
preserved exactly.

---PROMPT START---

## AUDIO PROFILE

Mid-baritone American male voice, late 30s to mid 40s. Mean fundamental
frequency around 110–120 Hz with a narrow standard deviation. The
register is that of a senior intelligence briefer who has explained the
same procedures dozens of times: confident, conversational, never
theatrical. Dynamic range compressed on declaratives — small amplitude
excursions, no swelling, no swallowed phrases.

## SCENE

The speaker — codename Dash — is recording a confidential briefing for
a new field operative who is reading the transcript on paper while
listening. The setting is a Pendleton Agency briefing room: muted,
professional, low ambient noise (no need to simulate room tone — the
post-production layer adds that). The tone is wry and mildly
inconvenienced; Dash is doing this because protocol requires it, not
because he is excited about the operative.

## DIRECTOR'S NOTES

Articulation: General American accent with a light East-Coast prep
flavor. Rhotic — pronounce 'r' sounds at word endings ("car" stays
"car," not "cah"). Crisp consonant attacks but conversational, not
stage-elocution. Do NOT use Mid-Atlantic, Transatlantic, RP, or
boarding-school-British shading — those overshoot into Cary Grant /
Frasier Crane territory, which is the wrong register.

Pace: slightly slower than American conversational baseline — roughly
5–10 percent longer phoneme durations than standard conversational
rate on setup lines and sardonic observations. Never rush a payoff.
Use a deliberate pause of approximately 0.75 to 1 second before the
final sentence's punchline — the pause is the punchline preparation;
the deadpan delivery is the punchline. Inter-word pauses of 200 to
500 ms are appropriate at phrase boundaries where comedic timing
matters. Avoid even, metronomic spacing — flat uniform pause
distribution reads as audiobook narration, which is a failure.

Intonation: declarative sentences stay predominantly flat. Pitch
rarely peaks or drops, contributing the deadpan effect. The terminal
sentence — "Try not to make me look foolish." — falls into a lower
register on the word "foolish" with a slight downspeak into vocal-fry
adjacency. This is the noir-narrator signature. The parenthetical
"— fine, me —" should ride a slight tangent: temporary decrease in
volume, slight speaking-rate increase during the parenthetical,
trailing volume on its closing dash, then return to baseline. This is
the "wavers and gets distracted by a tangent" Sterling-coded
signature.

Mannerisms: do not raise pitch on stressed words — increase
articulation precision or micro-pause before them instead. No audible
laughter, no breath-sigh affectations on this read (those belong to
other paragraphs in the matrix). Avoid any catchphrase-impression
bias — the read should land in the deadpan-briefer / noir-narrator /
sardonic-detective register cluster, NOT as an impression of any
specific actor or animated-spy character.

Volume dynamics: stay in a narrow amplitude band throughout. No
swelling, no exclamation excursions, no rising emphasis on "card
game" — the joke lands flat or it does not land.

### TRANSCRIPT

{TRANSCRIPT_SLOT}

---PROMPT END---

## 5. Acceptance signal (Step 0.5 cold-reader question)

The two Step 0.5 readers (one Archer-fan, one cold) are each asked:

> *Listen to this clip. Does it land in the deadpan-spy / noir-narrator
> / sardonic-detective cluster? Does it sound like a Benjamin
> impression? Answer in your own words (~30 seconds).*

Both must independently say **Yes — Target-Band cluster** AND **No —
not a Benjamin impression** for Step 1.5 (full engine-matrix adapter
translation) to proceed. See `cadence-spec.md` §5 for the full
three-band rubric and `preflight/preflight-decision.md` for the
vote-capture template.

## 6. Revision policy

If Step 0.5 fails (one or both readers say Floor / Ceiling / impression
hit), revise this file based on the no-vote reader's specific
descriptors. Typical revision shapes:

- **Floor-band miss** ("audiobook," "generic narrator," "documentary"):
  tighten the `## DIRECTOR'S NOTES` Pace + Intonation directions —
  bump pause architecture specificity, anchor the downspeak punchline
  more aggressively, name the genre exemplars explicitly (Rod Serling,
  Raymond Chandler narrator) in the prose.
- **Ceiling-band miss** ("this IS Sterling Archer," "Benjamin
  impression"): the cadence-spec.md upstream needs revision, not just
  this adapter. Surface to Briggsy as a brainstorm-level question
  (see plan §Step 0.5 step 5 — revision cap 3 rounds before escalation).
- **Wrong-register miss** ("Cary Grant," "Frasier," "Mid-Atlantic"):
  strengthen the §3.3 Articulation guard in the Director's Notes —
  the General American + East-Coast prep framing may need a tighter
  "avoid the following" list.

Every revision lands an entry in §7 below.

## 7. Amendments

| Date | Change | Trigger |
|---|---|---|
| 2026-05-18 | Initial draft. Charon as primary voice; full Director's Chair template; substitution slot for transcript. | Step 1.5 deliverable produced ahead-of-schedule for Step 0.5 consumption. |
