/**
 * `acaRegime.ts` — can the ACA REGIME (`overlay.enhancedSubsidies`) reach ANY simulated quantity of a
 * run? ONE rule, two consumers (the solve-time build, 2026-10-03):
 *
 *  - the named-driver probe's INERTNESS gate (`validation/gradeCalibration.ts` `ACA_ENHANCED_PROBE`):
 *    when false, the probe's enhanced-regime world is byte-identical to the base world, so its full
 *    two-seed re-search (a third of a Medicare-only solve) could only re-crown the base winner;
 *  - the intake's "did THIS run price the ACA discount?" (`intakeMap.ts` `acaPricedOverlayArm`), which
 *    decides the ACA disclosures — the same question, so the same rule, never two copies to drift.
 *
 * A LEAF on purpose: a type-only import, no runtime dependency, so the intake layer reaches it without
 * pulling the overlay machinery into the main bundle (`verify:bundle`).
 *
 * EXACT, NOT APPROXIMATE. The regime flag picks WHICH applicable-% table `taxOverlay.ts`'s `acaTable`
 * holds, and the table's CONTENTS are read in exactly two places there, both behind a finite POSITIVE
 * `enrolledPremium[t]`: the ACA-cliff rail (`acaTable.cliffFplFraction` → `cliffMagiFor`, the
 * bracket-fill ceiling) and the priced ACA year (`solveAcaFundedGross(…, acaTable, …)`). Every other
 * `acaTable !== undefined` read is a bare healthcare-on gate, identical under both regimes. So with no
 * finite positive premium in any year, the flag reaches nothing. The pre-65 clause both sites ALSO carry
 * is deliberately NOT mirrored here: dropping it only over-approximates "reachable" (the probe still
 * runs), which keeps the rule sound if either site's age gate ever changes.
 *
 * ⚠️ EDIT TOGETHER: a new read of the table's contents, or of `enhancedSubsidies`, that is not behind a
 * positive enrolled premium makes this rule UNSOUND — the probe would skip a world that can flip the
 * crown and name the sampling-noise sentinel instead of the ACA driver. `acaProbeInertness.test.ts`
 * holds a census of both read sets and reds on a new one.
 *
 * PURE (engine-purity lint) — a function of the overlay alone.
 */
import type { OverlayParams } from '@shared/model'

export function acaRegimeReachable(overlay: OverlayParams | undefined): boolean {
  return overlay?.healthcareEnabled === true && (overlay.enrolledPremium ?? []).some((e) => Number.isFinite(e) && e > 0)
}
