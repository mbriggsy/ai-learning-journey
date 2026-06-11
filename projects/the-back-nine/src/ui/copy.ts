/**
 * The typed copy catalog (phase-2 cross-cutting #4) — every user-facing string
 * in src/ui + src/intake lives HERE, created at D1 (the first copy-authoring
 * unit) and extended by U7 (which adds the copyGuard test that ENUMERATES this
 * catalog and asserts every entry passes the ban-list + certainty-hygiene +
 * catastrophe-lexicon gates — R12 honesty true BY CONSTRUCTION).
 *
 * The companion ESLint `no-restricted-syntax` rule (eslint.config.js) bans
 * inline JSXText AND user-facing attribute literals (aria-label / placeholder /
 * alt / title) in src/ui + src/intake, so a string cannot route around this
 * file. burned/063 single-source-the-gate, applied to copy.
 *
 * SLOT DISCIPLINE (decidable certainty-hygiene): quantitative content enters
 * copy ONLY through typed template slots (`~$X`, `~N years`, the "X of 10"
 * natural-frequency frame) — the slot helpers land with their first consumer
 * (the answer surface). Free numerals in catalog strings are what the copyGuard
 * scans against.
 */

/** The product voice catalog — copyGuard's enumeration surface (U7). */
export const copy = {
  appTitle: 'The Back Nine',
  // --- U0 scaffold strings (replaced by the real first-answer surface at U7) ---
  scaffoldSubtitle: 'Foundation scaffold — Phase 1.',
  scaffoldEngineLabel: 'Engine (worker round-trip):',
  // --- PWA update toast (prompt mode — the user chooses when) ---
  updateReady: 'A new version is ready — refresh whenever you’re done.',
  updateReload: 'Refresh now',
  updateLater: 'Later',
} as const satisfies Record<string, string>

export type CopyKey = keyof typeof copy

/**
 * Static disclosures — OUTSIDE the copyGuard's input by design (phase-2
 * cross-cutting #4 "surface-scoped"): the R13 honest-limits note is a mandatory
 * directive-shaped line ("validate … with a professional") that must stay legal
 * while imperative mood stays banned in verdict/recommendation copy. The U7
 * copyGuard enumerates `copy`, never this object.
 */
export const staticDisclosures = {
  honestLimits:
    'Informational and educational — not legal, tax, or investment advice. Validate big, irreversible moves with a professional.',
} as const satisfies Record<string, string>
