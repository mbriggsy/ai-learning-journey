/**
 * Phase 0 Unit 0.3 Step 1 — R14 Cold-Open candidate lines.
 *
 * The trailer's 5-second binary autonomy hook (R14): does a no-context
 * viewer decode "AI / agent / autonomous / built itself" from the cold
 * open ALONE? Two TESTED candidates render with operative card flashes,
 * BURNED landing card, and R15 chrome stamp ("METHOD: AUTONOMOUS")
 * underneath. Reader-A audition picks the winning line, OR triggers a
 * failure-mode ladder (rewrite / add visual density / non-voice fallback).
 *
 * Plan source-of-truth: docs/plans/origin-trailer/phase-0-gate-resolution.md
 * §Unit 0.3 (lines 1650-1937). Both lines are the plan's locked Section B
 * stimuli copied verbatim — do NOT edit without re-opening the gate.
 *
 * Section A REJECTED candidates (brainstorm originals missing the R14
 * "machine wordplay" requirement) live in candidates.md for audit trail
 * only — not constants, not rendered, not tested.
 *
 * Speaker attribution: **Janet** (Malory-coded executive dryness).
 * Selection rationale per plan §Step 1 candidate-pool constraints +
 * Unit 0.6 cleared (Vera retained in pool but Malory's executive distance
 * is the more diagnostic attribution for "He's a machine" / "Briggsy didn't
 * write this one either" — both lines read as senior-exec narration
 * rather than field-partner reaction or chaos-enthusiast riff).
 *
 * Voice: **Sloane - Bold and Polished** (ElevenLabs Shared Library,
 * voice ID `m8AHWg36LJTQWKmfeGVv`). Locked 2026-05-18 after Janet voice
 * iteration: initial Sarah voice (EXAVITQu4vr4xnSDxMaL) cleared the
 * line but Briggsy flagged it as too "reassuring" for Janet's
 * tough-matriarch character ("Janet is mature but not old. Tough as
 * nails, doesn't take shit from anyone, especially Dash. She loves
 * him, just doesn't take shit from him"). Local library exhausted
 * (only 7 female voices, all young/warm/British) — escalated to
 * ElevenLabs Shared Library which surfaced Sloane: "commanding yet
 * approachable tone with a sleek, professional delivery that exudes
 * authority without feeling distant." A/B'd against Matilda (local
 * library, alto-professional baseline) + Kristen (Shared Library,
 * true-crime/TED authoritative baseline) — Sloane won both auditions.
 * Full iteration history in `sample-eval/r14-cold-open/decode-eval.md`
 * §Janet iteration.
 *
 * voice_settings override (matriarch-tuned, NOT inherited from Unit 0.2
 * Roger defaults): stability 0.85 (high — kills F0 wander, flat
 * declarative read), similarity_boost 0.75 (default — let Sloane be
 * herself), style 0.05 (ultra-low — strips engine-default expressive
 * swelling that creates upbeat/perky feel), use_speaker_boost true,
 * speed 0.92 (slightly slower than Roger's 0.95 — pushes
 * deliberate-weighty matriarch register).
 *
 * Validity caveat — recorded in decode-eval.md, not silently demoted:
 * the formal n=4 minimum non-primed decode gate cannot be executed by a
 * single-reader audition (Briggsy is the wrong test — he wrote the
 * lines, knows the answer to "what is this trailer about"). Single-reader
 * Unit 0.3 collapses to a render-quality + audio-visual-composite sanity
 * check; the full decode gate defers to Phase 6's N=6 listener panel
 * (cross-phase ADR #21). Precedent: Unit 0.2 + Unit 0.4 + Unit 0.6
 * single-reader fallback shape.
 *
 * Bracket-tag treatment lives in generate-cold-open-clip.ts, not in this
 * constant — payload assembly is the renderer's job, the constant is raw
 * text. This keeps the constant auditable by the VOICE_DIRECTION guard
 * (no [deadpan] / [sarcastic] tokens in the payload string).
 *
 * Renderer: scripts/generate-cold-open-clip.ts → sample-eval/r14-cold-open/clips/candidate-{4,5}.mp3
 */

/**
 * Section B Candidate #4 — "He's a machine, this kid."
 *
 * **Machine wordplay decode (R14 requirement):** "He's a machine" reads
 * SIMULTANEOUSLY as (a) colloquial admiration to a naive viewer ("this
 * person is so productive they're a machine") AND (b) literal claim to
 * an engineering audience or a viewer holding the R15 "METHOD:
 * AUTONOMOUS" chrome stamp in the same frame ("the machine — i.e.
 * Claude — did it"). The double-meaning IS the decode mechanic.
 *
 * The kicker ("Honestly at this point I'm just impressed") cues the
 * Malory-archetype senior-exec dryness — resignation wrapped in subtle
 * pride. The "Honestly" beat is the sardonic-micro-lift anchor for the
 * `[sarcastic]` inline tag in the renderer payload.
 */
export const CANDIDATE_4 = "He's a machine, this kid. Honestly at this point I'm just impressed.";

/**
 * Section B Candidate #5 — "Briggsy didn't write this one either."
 *
 * **Machine wordplay decode (R14 requirement):** Echoes UMB v3 cold-open
 * hook ("Briggsy didn't write a single line of code... Not one." —
 * `projects/undercover-mob-boss/scripts/narrator-prompts.ts:650`,
 * verified verbatim). Direct callback for viewers who HAVE seen UMB v3
 * (immediate decode: "Briggsy autonomously builds software, here's his
 * sequel"). Standalone-coherent for viewers who haven't (decode shifts
 * to "wait — who wrote this then?" → the R15 stamp "METHOD: AUTONOMOUS"
 * is the answer).
 *
 * The "either" carries the load: implies a series. The kicker ("He's
 * getting good at not writing them") cues the conspiratorial-knowing
 * register — the speaker is in on the trick. Same `[sarcastic]` inline
 * tag pattern as #4 for the kicker landing.
 */
export const CANDIDATE_5 = "Briggsy didn't write this one either. He's getting good at not writing them.";

/**
 * Speaker attribution (locked at Phase 0 Unit 0.3, carried forward to
 * Phase 1 beat-sheet-lock). Both candidates ship through the same
 * speaker — A/B test isolates LINE, not VOICE. Speaker choice is a
 * separate Phase 1+ decision; if a future revision attributes the
 * winning line to a different operative, the Sarah-as-Janet
 * placeholder may swap to Sable/Vera in production.
 */
export const COLD_OPEN_SPEAKER = {
  /** In-fiction operative name */
  operative: 'Janet',
  /** Visible card art used in the speaker-flash frame */
  cardAsset: 'janet-broadside.webp',
  /** ElevenLabs Shared Library entry (re-locked 2026-05-19 — Phase 2
   *  Unit 2.3 cunty canary rejected Sloane as too polished; Eleanor's
   *  "refined, seasoned older British female with commanding presence"
   *  landed the Jessica-Walter-Mallory-Archer DNA. Q-from-Bond cadence
   *  rides the British accent naturally. */
  voiceLibraryName: 'Eleanor – Gracious and Authoritative (Shared Library)',
  voiceId: '2qQJWjw5XdG80GreshqG',
  /** Archer archetype mapped onto BURNED operative */
  archerArchetype: 'Malory (executive dryness — tough-as-nails matriarch)',
  /**
   * Voice settings override — NOT Unit 0.2 Roger defaults. Janet is
   * Mallory-coded matriarch (cigarette-and-scotch contempt, dismissive
   * cunty venom — MichaelAnne canary signal 2026-05-19).
   *
   * 2026-05-19 retune (Phase 2 Unit 2.3 cunty pass):
   *   v1: stab 0.85 / style 0.05 / speed 0.92 — too commanding-polished
   *       (stripped the venom).
   *   v2: stab 0.55 / style 0.30 / speed 0.88 — cuntier but MichaelAnne
   *       (Archer-fan listener) says "not enough of a cunt" still.
   *   v3 (current): stab 0.40 / style 0.45 / speed 0.85 — push closer
   *       to the expression ceiling, drag the disdain harder. Mallory
   *       drawls cigarette-and-scotch contempt; this is the dial-up.
   */
  voiceSettings: {
    stability: 0.40,
    similarity_boost: 0.75,
    style: 0.45,
    use_speaker_boost: true,
    speed: 0.85,
  },
} as const;

/**
 * Candidate registry — the two TESTED lines, addressable by ID. Renderer
 * + composition reference by `id` so a future re-ordering (e.g. winning
 * line takes ID 1 for Phase 4) doesn't require constant renames.
 */
export const COLD_OPEN_CANDIDATES = [
  {
    id: 4 as const,
    text: CANDIDATE_4,
    machineWordplayMechanic:
      '"He\'s a machine" reads as colloquial admiration AND literal "the machine did it"; double-meaning carries the decode',
  },
  {
    id: 5 as const,
    text: CANDIDATE_5,
    machineWordplayMechanic:
      'UMB v3 callback ("Briggsy didn\'t write a single line of code... Not one."); "either" implies series, "not writing them" frames autonomy directly',
  },
] as const;

export type CandidateId = (typeof COLD_OPEN_CANDIDATES)[number]['id'];

export function candidateById(id: CandidateId): (typeof COLD_OPEN_CANDIDATES)[number] {
  const found = COLD_OPEN_CANDIDATES.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown candidate id: ${id}`);
  return found;
}
