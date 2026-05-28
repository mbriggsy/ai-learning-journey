/**
 * Janet — the v2 trailer's single narrator. Malory-CODED dry matriarch,
 * outside-observer stance (recounts Briggsy's bet; never briefs-at-you).
 *
 * LOCKED voice — the one v2 decision carried verbatim from v1 (Phase 2
 * Unit 2.3 re-lock, Briggsy's ear cleared it): ElevenLabs "Eleanor –
 * Gracious and Authoritative" (Shared Library), cunty-matriarch-tuned.
 * The British accent rides the Q-from-Bond cadence; brief was "always
 * drinking but you'd never know it" + experienced-not-frail.
 *
 * Do NOT retune without re-auditioning — the v1 history is Sarah (too
 * reassuring) -> Sloane (too polished) -> Eleanor, and settings v1
 * (stab 0.85/style 0.05) -> v2 (0.55/0.30) -> v3 (current). See memory
 * [[project-burned-origin-trailer-v2]] + the v1 cold-open-prototype audit.
 */
export const JANET_VOICE = {
  voiceLibraryName: 'Eleanor – Gracious and Authoritative (Shared Library)',
  voiceId: '2qQJWjw5XdG80GreshqG',
  modelId: 'eleven_v3',
  // v2 cunty push (2026-05-28): dragged meaner than v1's final baseline
  // (stab 0.40 / style 0.45) per Briggsy — lower stability lets the disdain
  // swing, higher style exaggerates the contempt. Iterating by ear.
  settings: {
    stability: 0.22,
    similarity_boost: 0.75,
    style: 0.60,
    use_speaker_boost: true,
    speed: 0.85,
  },
} as const
