# Mallory Voice Design — 2026-05-19

ElevenLabs Voice Design generated 3 candidates from a prose
description targeting Jessica Walter's vocal signature (Mallory Archer /
Lucille Bluth). These are NEWLY MINTED voices, not Shared Library
presets.

**Listening order (random — no a-priori ranking; all 3 came from the same
prompt):**

- `design-1.wav` → voice_id `pgjoEYi9NyLkA0S0Cgcd`
- `design-2.wav` → voice_id `1wyF0wjWWdFdaEb19XsU`
- `design-3.wav` → voice_id `ltPMg6EScfNKERFqUhTm`

**Preview text** (each candidate reads the same line):

> He's a machine, this kid. Honestly at this point I'm just impressed. Sterling, do NOT touch that. I swear to God, if you break one more piece of agency property I will have you returned to Sears.

(The "returned to Sears" line is from Arrested Development. Lucille
Bluth dialect indicator — it's a Mallory-coded cadence + Mallory-coded
character setup that pushes the voice toward the right register.)

**Description sent to the API** (876 chars, under the 1000 limit):

> A mature American female voice in her late seventies, native New York
> with mid-century Manhattan affectation. Mid-to-low alto, chest-resonant.
> A fine dry rasp underneath every line — decades of social drinking and
> chain-smoking — but never affecting articulation. Every consonant
> precise, theater-trained. Default register is sardonic deadpan with
> downward inflection at line ends, suggesting the exhaustion of explaining
> obvious things to people who should already know better. Emphasis lands
> as a quiet knife-edge, never raised volume. Drawn-out vowels on
> dismissive moments. Authority is the authority of someone who is correct
> and tired of being correct. Tonal reference: Jessica Walter as Mallory
> Archer and as Lucille Bluth. NOT: warm, breathy, sweet, theatrical,
> podcast-host, audiobook-narrator, soothing, motherly, British, slurred,
> shouty, youthful, perky, cheerful.

## Next step

Briggsy picks a winner. I then call `/v1/text-to-voice/create-voice-from-preview`
to permanently save it to the library (Voice Design previews can be
ephemeral; the formal save makes the voice_id production-stable),
update PHASE-0-EXIT.md Section 2 + `COLD_OPEN_SPEAKER.voiceId` to
the new ID, and unlock Unit 2.4.

If none of the 3 fit, options:
1. Re-prompt with adjusted description (cheap — $0 to re-mint)
2. Different `auto_generate_text` seed (rolls the dice on the same prompt)
3. Combine with Shared Library best (Empress / Eleanor) as the locked pick
