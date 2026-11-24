/** The budget builder's pure checks. Moved out of `BudgetBuilder.tsx` by Act 6's RC0, unchanged. */

/** The reconciliation readout's M>S honesty fork (F10; insight 048 — the decision is a pure
 *  exported helper): when the OOP-medical floor M ALONE exceeds the total S the answer uses,
 *  the lines-target line would read "about $0 a year goes into the lines below" beside
 *  "about $M carried automatically" — internally contradictory — so the readout swaps in the
 *  honest exceeds line instead. STRICTLY M > S: at M === S a $0 lines-target is the TRUTH
 *  (every non-medical dollar is zero), not a contradiction. The engine-side anchor stays
 *  anchorTarget = max(0, S − M) — this fork is presentation-only. */
export const medicalExceedsTotal = (spendTotal: number, oopMedical: number): boolean =>
  oopMedical > spendTotal
