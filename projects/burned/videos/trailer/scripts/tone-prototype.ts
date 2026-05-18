/**
 * Phase 0 Unit 0.4 Step 1 — Tone Prototype paragraph.
 *
 * 20-second deadpan exposition stimulus for the played-straight tone
 * gate (R2 deadpan + R6 Pendleton vocabulary discipline). Tests whether
 * gap-comedy — briefing-room vocabulary over SDLC subject matter —
 * lands when delivered in the Unit 0.2 locked Dash voice (ElevenLabs
 * Roger / eleven_v3 / Path A).
 *
 * Plan source-of-truth: docs/plans/origin-trailer/phase-0-gate-resolution.md
 * §Unit 0.4 (lines 1939-2092). Paragraph text is the plan's locked
 * Step 1 stimulus copied verbatim — do NOT edit without re-opening the
 * tone gate.
 *
 * Pendleton-vocab translation table applied (per plan §Step 1):
 *   agents      → field asset
 *   specs       → forensic dossier
 *   tests       → contingencies war-gamed
 *   deploy      → activated
 *   roster      → operative profiled
 *
 * Subject matter (autonomous SDLC) survives translation. The gag is the
 * gap between briefing-room vocabulary and software-engineering reality.
 *
 * Validity caveat — recorded in eval.md, not silently demoted: the
 * formal gap-comedy decode gate (n=4 mixed Archer-aware/unaware
 * listeners articulating the register collision unprompted) cannot be
 * executed by a single reader who authored the paragraph. Single-reader
 * Unit 0.4 collapses to a tone render-quality + spec sanity check; the
 * full decode gate defers to Phase 6's N=6 listener panel (cross-phase
 * ADR #21). Precedent: Unit 0.2 + Unit 0.6 single-reader fallback shape.
 *
 * Bracket-tag treatment lives in generate-tone-clip.ts, not in this
 * constant — payload assembly is the renderer's job, the constant is
 * raw text. This keeps the constant auditable by the script-leak guard
 * test (no [deadpan] / [sarcastic] tokens in the payload string).
 *
 * Renderer: scripts/generate-tone-clip.ts → sample-eval/tone/sample.mp3
 */

/** ~20s deadpan exposition with Pendleton-vocab translation, ending in the Phrasing! beat. */
export const TONE_SAMPLE_PARAGRAPH = `The operation began with a forensic dossier. Fourteen thousand pages, drafted in a single weekend by a field asset who — for compliance reasons — we will not be naming. Every contingency war-gamed. Every cover story rehearsed. Every operative profiled before they were activated. The dossier's signature appears on every page. Try and find a human one. …Phrasing.`;

/**
 * Translated terms that MUST appear in TONE_SAMPLE_PARAGRAPH for the
 * Pendleton-vocab gap-comedy mechanic to land. Each entry maps an
 * engineering-side term to the briefing-room substitution. The contract
 * test asserts the briefing-room values appear in the paragraph; if a
 * future edit drops one, the test fails loudly.
 */
export const PENDLETON_TRANSLATIONS = [
  { engineering: 'agents', briefing: 'field asset' },
  { engineering: 'specs', briefing: 'forensic dossier' },
  { engineering: 'tests', briefing: 'contingency war-gamed' },
  { engineering: 'deploy', briefing: 'activated' },
  { engineering: 'roster', briefing: 'operative profiled' },
] as const;
