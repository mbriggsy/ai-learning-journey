# Cadence Adapter — OpenAI gpt-4o-mini-tts (`instructions` parameter)

> **Phase 0 Unit 0.2 Step 1.5 deliverable** — translates
> `cadence-spec.md` into the ~500-word string the OpenAI Audio Speech
> API consumes via its `instructions` top-level field. Consumed by
> `scripts/generate-tts-eval.ts` (Step 2 engine matrix).

## 1. How OpenAI gpt-4o-mini-tts reads this file

The OpenAI Audio Speech API (`POST /v1/audio/speech`) takes two
separate top-level fields:

| Field | Purpose | Source |
|---|---|---|
| `input` | The literal text to voice. **Max 4096 chars.** | The trailer script — `PARAGRAPH_1_DEADPAN` / `PARAGRAPH_2_MONOLOGUE` / `PARAGRAPH_3_SCREAM` from `scripts/sample-script-dash.ts`. |
| `instructions` | Style steering. **Max 4096 chars; only honored by `gpt-4o-mini-tts` and `gpt-4o-mini-tts-2025-12-15` (NOT by `tts-1` / `tts-1-hd`).** | The string under §4 below, copied verbatim. |

The two fields stay separate by API design. The
**VOICE_DIRECTION anti-pattern guard** in
`generate-tts-eval.ts` asserts at call time that nothing from §4 ever
leaks into `input`, and the script content never leaks into
`instructions`. Concatenating them is the documented twice-bitten
failure mode from UMB v3 narrator work — Gemini's mistake shape on a
different engine, same root cause.

## 2. Model + voice selection

| Field | Value | Rationale |
|---|---|---|
| `model` | `gpt-4o-mini-tts` | Steerable preset model; honors `instructions`. The `tts-1` / `tts-1-hd` models DO NOT honor `instructions` — using them silently drops the entire cadence-spec on the floor. |
| `voice` | `onyx` (primary) | Deepest male voice in the OpenAI catalog (2026 May surface: alloy / ash / ballad / coral / echo / fable / onyx / nova / sage / shimmer / verse / marin / cedar). Closest mid-baritone match per cadence-spec §3.1. |
| `response_format` | `wav` | Direct-playable, matches WebMUSHRA listener-panel standard (Step 3 MUSHRA-protocol.md). `pcm` available as alternate if downstream wants raw 24kHz PCM. |
| `speed` | `0.95` | Five percent slower than conversational baseline per cadence-spec §3.2. Range supported: 0.25 to 4.0; `1.0` is default. |

**Voice alternates if `onyx` over-narrates / under-deadpans:**

| Voice | When to try |
|---|---|
| `ash` | If onyx reads "too movie-trailer / too booming." Ash is warmer, slightly less commercially recognizable. |
| `echo` | If onyx reads "too monotone." Echo carries more subtle inflection while staying baritone. |
| `verse` | If the Step 4 MUSHRA panel reports Floor-band on "generic male narrator." Verse is more expressive — careful, can over-steer into theatrical. |
| `sage` | If pace feels rushed even at `speed=0.95` — sage has a slower native cadence. |
| `marin` / `cedar` | NEW 2026 voices (added to the catalog after the older alloy/echo/onyx set). Under-tested for this register; try only if all of the above fail. |

**Voice anti-picks:** `nova` (light female), `shimmer` (warm female),
`coral` (cheerful), `ballad` (theatrical), `fable` (children's book
narrator) — all collide with §3.4 (flat declarative contours) and
§3.6 (compressed dynamic range).

**Warburton-avoidance carry-forward note:** Step 0.5 cold-reader signal
flagged the Gemini Charon read as Patrick-Warburton-adjacent. `onyx`
is OpenAI's most-recognizable commercial male voice — if Step 2 round
1 reads similarly Warburton-adjacent, drop to `ash` or `echo` for
round 2.

## 3. Per-paragraph fallback split (use only if §4 unified instructions degrade)

If Step 2 round 1 outputs are inconsistent across paragraphs — e.g.,
paragraph 1 lands Target Band but paragraph 3 scream collapses to
falsetto — fall back to per-paragraph 250-word focused-aspect
instructions. The unified §4 string targets ~500 words because OpenAI
demonstrated steering prompts run 150-500 words; longer prompts can
dilute focus.

If split is needed, generate three per-paragraph variants by
extracting the relevant subset of §4 (e.g., paragraph 3 needs only the
volume-dynamics + scream-specific direction; can drop the parenthetical-
tangent and downspeak-punchline detail).

## 4. INSTRUCTIONS STRING (verbatim — copied into `instructions` field)

The text between `---INSTRUCTIONS START---` and `---INSTRUCTIONS END---`
is the literal string sent. Newlines preserved exactly. The script
extractor in `generate-tts-eval.ts` reads this fence the same way the
Gemini adapter reads its `---PROMPT START---` / `---PROMPT END---`
fence — newline-anchored to avoid false-matching against prose
backtick references elsewhere in this file.

---INSTRUCTIONS START---
You are voicing a senior intelligence briefer codenamed "Dash" who is recording a confidential briefing for a new field operative. You have done this dozens of times. The tone is dry confidence with a layer of mild inconvenience — the operative is below your clearance level and you are obligated to explain things you find self-evident.

Vocal register: mid-baritone American male, late thirties to mid-forties. Mean fundamental frequency around 110 to 120 hertz with very little variation across declarative sentences. Even rhetorical questions stay close to flat — subvert the typical rising-question contour. You are never not confident.

Articulation: General American accent, rhotic. Pronounce R sounds at word endings — "car" stays "car," not "cah." Crisp consonant attacks but conversational clarity, never stage elocution. Avoid British, Mid-Atlantic, Transatlantic, or RP shading entirely — these overshoot into Cary Grant or Frasier Crane territory, which is the wrong register.

Pace: slightly slower than American conversational baseline, about five to ten percent longer phoneme durations than standard conversational rate. Never rush a punchline. Use a deliberate pause of approximately 0.75 to 1.0 seconds before the final sentence of each paragraph — the pause is the punchline preparation; the deadpan delivery is the punchline. Inter-word pauses of 200 to 500 milliseconds at phrase boundaries where comedic timing matters. Avoid even, metronomic spacing — uniform pause distribution reads as audiobook narration, which is wrong.

Intonation: declarative sentences stay predominantly flat. Pitch rarely peaks or drops. Terminal punchline sentences fall into a slightly lower register with a downspeak inflection into vocal-fry adjacency — this is the noir-narrator signature. Parenthetical phrases between em-dashes — for example "— fine, me —" — should ride a brief tangent: temporary decrease in volume, slight speaking-rate increase during the parenthetical, trailing volume on the closing dash, then return to baseline.

Volume dynamics: stay in a narrow amplitude band on conversational reads. Compressed dynamic range — small excursions, no swelling, no swallowed phrases. No exclamation-mark amplitude rises on declarative emphasis words.

If the script contains an all-caps shouted line, deliver it volume-discontinuous, NOT pitch-discontinuous. Raise amplitude six to twelve decibels but do NOT raise fundamental frequency above 200 hertz. The scream should sound guttural and forceful, never panicked or falsetto.

Before exasperated lines, an audible controlled exhale is appropriate — a quiet breath that reads as "I am exhausted by you specifically."

When a paragraph ends with a deliberately self-aware sign-off phrase such as the word "Phrasing" preceded by an ellipsis, deliver that word deadpan and flat. Do not add comedic emphasis, do not raise pitch, do not lean into a catchphrase-impression bias. The ellipsis already carries the timing; your delivery is the punchline because it is unmoved.

Target register cluster, by exemplar: Rod Serling Twilight Zone narration (clipped-then-paused rhythm, downspeak punchline endings, consonant attack, non-resonant tight delivery — but without Serling's explicitly philosophical gravity). Raymond Chandler audiobook narrators Elliott Gould and Ray Porter (measured pace, understatement, subtle inflection for irony). Film noir voiceover tradition — cynical, sarcastic, metaphor-dense internal monologue framing.

NOT: audiobook narrator, documentary voiceover, podcast intro voice, AI assistant, energetic salesperson, theatrical stage performer, impression of any specific recognizable voice actor.
---INSTRUCTIONS END---

## 5. Substitution slots

There are NO substitution slots in this file. The `input` field receives the script text directly from `sample-script-dash.ts`. The `instructions` field receives the §4 string verbatim. The script content never appears in §4; the instructions content never appears in `input`.

## 6. Char-budget planning

OpenAI bills per token, not per character. The instructions string is approximately 700 words ≈ ~1000 tokens. The script per-paragraph is at most ~80 words ≈ ~110 tokens. Per matrix run per paragraph cost is well under $0.01; the Step 2 budget envelope (~$0.45 across the full matrix) absorbs three iterations comfortably.

## 7. Revision policy

If Step 0.5-style cold-reader feedback or Step 4 MUSHRA listener panel
flags an OpenAI engine output as Floor / Wrong-register / Ceiling, the
revision lands in §4 only — the §1-§3 prose stays stable across
revisions. Each amendment lands a §8 entry.

If §4 grows past 4096 characters, fall back to the per-paragraph split
in §3 — each variant must independently stay under 4096.

## 8. Amendments

| Date | Round | Change | Trigger |
|---|---|---|---|
| 2026-05-18 | 1 | Initial draft. `onyx` as primary voice; Warburton-avoidance alternate ladder; instructions string distilled from cadence-spec.md §3. | Step 1.5 deliverable — all three engines green, Step 2 generation can begin once Briggsy approves Path B opt-in / opt-out. |
