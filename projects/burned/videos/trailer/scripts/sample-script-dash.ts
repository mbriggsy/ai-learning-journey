/**
 * Phase 0 Unit 0.2 Step 1 — Dash sample script for the engine matrix.
 *
 * Three paragraphs covering the three distinct cadence demands:
 *
 *   1. Long-form deadpan exposition (~20s read)
 *   2. Monologue ending in exasperation, including a Phrasing! beat (~10s)
 *   3. Isolated scream, volume-discontinuous-not-pitch-discontinuous (~1.5s)
 *
 * All three are voiced by Dash. The scream addressee is Vera (Sterling-
 * lore-aligned — the screamer is the spy, the named target is the partner).
 *
 * Lineage: paragraphs 1 + 2 are recast from existing BURNED howtoplay copy
 * to test character voice on shipped material, NOT freshly authored for
 * the trailer (per Phase 0 plan §Step 1). Test `sample-script-dash.test.ts`
 * asserts the lineage anchors still land in the source files.
 *
 * Open Step 4 MUSHRA review note: paragraph 1 leans on M's clearance-flex
 * cadence ("somebody with my clearance level — fine, me — decided you
 * could be trusted with a card game"); this is M's narrator-register
 * joke, recast as first-person Dash per the deepened Phase 0 plan. If
 * the MUSHRA panel reads the line as register-mismatched-for-Dash, the
 * fix is to re-cast against a Dash-native lede in this file before
 * re-running engine generation.
 */

/** ~20s deadpan exposition. Lineage: ActMission.tsx lede (lines 30–34) + Beat II (lines 52–57). */
export const PARAGRAPH_1_DEADPAN = `Good morning. You are reading this because somebody with my clearance level — fine, me — decided you could be trusted with a card game. The deck is a series of operations. One of them ends your career instantly. The rest exist to help you survive it, or to make sure your colleagues don't. Try not to make me look foolish.`;

/**
 * Step 0.5 preflight trim — ~15s read.
 *
 * 32-word subset of PARAGRAPH_1_DEADPAN sufficient to exercise the
 * cadence-spec characteristics that ride a single declarative read:
 *
 *   - §3.1 pitch (mid-baritone declaratives)
 *   - §3.2 pace (Sterling-coded slow + pause architecture)
 *   - §3.3 articulation (General American rhotic, no Mid-Atlantic affectation)
 *   - §3.4 intonation (flat declaratives + downspeak punchline on "foolish")
 *   - §3.5 mannerisms (the "— fine, me —" tangent tests parenthetical waver)
 *
 * Out-of-scope for this trim: §3.5 Phrasing! beat (paragraph 2) and
 * §3.6 volume-discontinuous scream (paragraph 3). Step 0.5 validates
 * the SPEC; full-coverage matrix runs at Step 2.
 *
 * Trim contract: every sentence in PARAGRAPH_1_PREFLIGHT must also
 * appear verbatim in PARAGRAPH_1_DEADPAN — asserted by
 * `sample-script-dash.test.ts` so a future edit to PARAGRAPH_1_DEADPAN
 * cannot silently invalidate the preflight read.
 */
export const PARAGRAPH_1_PREFLIGHT = `Good morning. You are reading this because somebody with my clearance level — fine, me — decided you could be trusted with a card game. Try not to make me look foolish.`;

/** ~10s monologue ending in exasperation. Lineage: ActRoster.tsx Dash entry blurb (line 25–26) + flourish (line 27), first-person recast. */
export const PARAGRAPH_2_MONOLOGUE = `Pendleton's top-rated field operative. By which we mean I have the highest expense report and survive most of it. Fluent in seven languages, three of which are martini orders. Tell anyone you read my file. I've been waiting. …Phrasing.`;

/** ~1.5s isolated scream. Volume-discontinuous, NOT pitch-discontinuous (per cadence-spec §3.1, §3.6). Doubles as R5 Unit 0.6 candidate. */
export const PARAGRAPH_3_SCREAM = `VERAAA!!!`;

/** Ordered array for engine-matrix iteration. Index = paragraph number minus 1. */
export const DASH_SAMPLE_SCRIPT = [
  { id: 'deadpan-exposition', target_seconds: 20, text: PARAGRAPH_1_DEADPAN },
  { id: 'monologue-exasperation', target_seconds: 10, text: PARAGRAPH_2_MONOLOGUE },
  { id: 'scream', target_seconds: 1.5, text: PARAGRAPH_3_SCREAM },
] as const;

export type DashSampleEntry = (typeof DASH_SAMPLE_SCRIPT)[number];
