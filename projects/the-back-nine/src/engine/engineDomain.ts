/**
 * The engine's computable domain: the dollar, moment and horizon caps `validateParams` enforces (R19) and every
 * backstop compares against (build 2 KTD13). A leaf, so any engine module can read a cap without importing
 * `simulate.ts`; `simulate.ts` re-exports all three.
 */
// =========================================================================
// The engine's computable-domain bounds (M6 boundary review — the float-overflow
// class). Finiteness of the INPUTS does not bound the COMPUTATION: a gate-valid
// 1e300 portfolio (or a 900%/yr mean over a 300-year horizon) compounds past
// Number.MAX_VALUE mid-path, and the first Infinity either poisons the gross-up
// into its 128-pass throw (Infinity − Infinity = NaN) or — worse — RESOLVES with
// Infinity reported as a SURVIVING terminal (the calm-but-wrong-OPTIMISTIC sin,
// violating the DND/009 finite contract every wire-crossing surface carries). So
// the R19 gate bounds the domain itself. The caps are far beyond any real
// household input (a personal tool: a $1T portfolio, a 100%/yr return assumption,
// and a 120-year horizon are each absurd) so they can never falsely reject a real
// user — while making the mean-path compounding provably finite (ln(1e12) +
// 120·ln(2) ≈ 111 ≪ 709 = ln(MAX_VALUE)) AND closing the gross-up's convergence
// story over the whole gated domain (max tax ≈ 0.31 × 0.85 × 1e12 ⇒ ~113 worst-case
// passes < the 128 cap — the eps-bound now covers everything; no saturation
// argument needed). The stochastic TAIL (a ~3.5σ draw every year for 120 years,
// P ≈ 1e-437) and any future cap drift are caught by the per-path finiteness seam
// in simulate.ts's path loop — the two-layer rule applied to the engine's own float
// domain (gate = the cause; seam = the consequence).
// =========================================================================
/** Max dollar magnitude for any entered dollar/ratio figure (real $). */
export const ENGINE_MAX_DOLLAR = 1e12
/** Max market moment (mean and stdDev each ≤ 100%/yr). */
export const ENGINE_MAX_MOMENT = 1
/** Max cohort horizon (the mortality table's own terminal age bounds any real run). */
export const ENGINE_MAX_HORIZON_YEARS = 120
