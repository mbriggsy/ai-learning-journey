/**
 * Janet — the v2 trailer's single narrator. Malory-CODED dry matriarch,
 * outside-observer stance (recounts Briggsy's bet; never briefs-at-you).
 *
 * LOCKED voice (2026-05-28, Briggsy's ear): ElevenLabs "Kristen – Cold Evil
 * Queen Villain" (Shared Library, professional). American, cold/controlled
 * regal command — the cuntiness lands as icy authority rather than British
 * grace. Used directly by voiceId (no library-add needed — the shared
 * voiceId resolves for TTS as-is; proven on the casting audition).
 *
 * SETTINGS = the voice's own stored defaults, captured verbatim from
 * GET /v1/voices/{id}/settings. The casting audition that cleared Briggsy
 * sent NO voice_settings, so it ran on these defaults — locking them here
 * reproduces exactly the read he approved. Deviate only by ear, never by
 * carrying another voice's tuning (Eleanor's stab 0.22 / style 0.60 push
 * was timbre-specific and would distort this voice).
 *
 * Casting history: Sarah (too reassuring) -> Sloane (too polished) ->
 * Eleanor (British, rejected — too lovely/wrong identity) -> rasp-forward
 * Voice-Design designs (close but lost to the real thing) -> Kristen Cold
 * Evil Queen. Briggsy's note on the rasp re-spins: cold queen won; the
 * designed rasp didn't beat the original's read. See memory
 * [[project-burned-origin-trailer-v2]].
 */
export const JANET_VOICE = {
  voiceLibraryName: 'Kristen – Cold Evil Queen Villain (Shared Library)',
  voiceId: 'Qbw4VpyUrHEG7NigKzty',
  modelId: 'eleven_v3',
  settings: {
    stability: 0.32,
    similarity_boost: 0.58,
    style: 0.58,
    use_speaker_boost: true,
    speed: 0.9,
  },
} as const
