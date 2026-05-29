/**
 * Janet — the v2 trailer's single narrator. Malory-CODED dry matriarch,
 * outside-observer stance (recounts Briggsy's bet; never briefs-at-you).
 *
 * LOCKED voice (2026-05-29, Briggsy's ear, full-content A/B): ElevenLabs
 * "Eleanor – Gracious and Authoritative" (Shared Library), cunty-matriarch-
 * tuned. British drawl that lands the Jessica-Walter / Malory DNA. Used
 * directly by voiceId (shared voiceId resolves for TTS as-is).
 *
 * SETTINGS = the v2 cunty push (stab 0.22 / style 0.60, drawled 0.85) — lower
 * stability lets the disdain swing, higher style exaggerates the contempt.
 * This is the exact config Briggsy heard + chose in the A/B. The gentler
 * v1-cleared profile (stab 0.40 / style 0.45) is the fallback if she ever
 * reads too unstable. Deviate only by ear.
 *
 * Casting history: Sarah (too reassuring) -> Sloane (too polished) -> Eleanor
 * (v1 lock) -> Kristen Cold Evil Queen (2026-05-28, locked off a single
 * audition LINE) -> back to Eleanor (2026-05-29). The reversal: on the full
 * trimmed VO, the one-line snap judgment ("Eleanor too lovely/British/wrong")
 * didn't hold — Eleanor's drawl beat Kristen's icy control over four minutes.
 * The A/B (out/vo/{kristen,eleanor}/) is why we caught it. Lesson: cast on
 * the real content, not a teaser line. See [[project-burned-origin-trailer-v2]].
 */
export const JANET_VOICE = {
  voiceLibraryName: 'Eleanor – Gracious and Authoritative (Shared Library)',
  voiceId: '2qQJWjw5XdG80GreshqG',
  modelId: 'eleven_v3',
  settings: {
    stability: 0.22,
    similarity_boost: 0.75,
    style: 0.6,
    use_speaker_boost: true,
    speed: 0.85,
  },
} as const
