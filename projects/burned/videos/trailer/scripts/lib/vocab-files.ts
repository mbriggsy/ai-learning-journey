/**
 * Single-source-of-truth allowlist for BURNED HTP vocabulary vendoring.
 *
 * Consumed by `vendor-burned-vocab.ts` (the producer) AND
 * `verify-vocab-sync.ts` (the verifier). Sharing the const ensures the
 * gate cannot go vacuous via add-to-one-forget-the-other drift
 * (insight #063 sync-pair declarations).
 *
 * Maintenance: when BURNED adds / renames / removes a vocabulary
 * component, edit this file ONLY. Both scripts auto-pick-up the
 * change.
 */
export const VENDORED_FILES = [
  'Stamp.tsx',
  'Stamp.module.css',
  'Crest.tsx',
  'Crest.module.css',
  'RedactBar.tsx',
  'RedactBar.module.css',
  'ClassificationBanner.tsx',
  'ClassificationBanner.module.css',
  'DossierPage.tsx',
  'DossierPage.module.css',
] as const;
