# burned-vocabulary/

**VENDORED** from `src/client/howtoplay/components/` at Phase 3 entry
(Phase 3 Unit 3.0 — Path B architecture, ADR-locked). The Remotion
trailer consumes these LOCAL COPIES — not the BURNED source — to keep
the `videos/trailer/` package isolated while still rendering the
exact visual primitives BURNED's HTP ships in-game.

## What's vendored

The 5 BURNED HTP **vocabulary** components (10 files total):

- **`Stamp`** — `[CLASSIFIED]` / `[REDACTED]` / `[FILE COPY]` ink
  treatments. `animate="slam"` plays the impact entrance.
- **`Crest`** — Pendleton Agency seal. `variant="svg"` (vector) or
  `variant="image"` (Imagen-rendered hero crest).
- **`RedactBar`** — black-bar redactions over inline text, with the
  hover-reveal + tilt micro-interaction.
- **`ClassificationBanner`** — top-of-page chrome strip; `tone="red"`
  / `"amber"` / `"navy"` (red for high-classification, amber for
  cautionary, navy for ops-room calm).
- **`DossierPage`** — the manila-folder page chrome (paperclip /
  staple corner affordance + `[data-reveal]` scroll-trigger hook).

The OTHER 5 HTP components (`Card`, `EyebrowLabel`, `Marginalia`,
`PlayCTA`, `ReadingProgress`) are HTP-app-specific and **not vendored**
— the trailer doesn't need them.

## Sync hygiene

```bash
# Phase 3 entry / whenever BURNED's HTP vocabulary changes:
cd videos/trailer
pnpm vendor:vocab        # copies the 10 files (overwrites local)

# Verify (CI runs this on every PR):
pnpm verify:vocab-sync   # sha256 compare; exit 1 on any drift
```

**Drift gate is non-theatrical** — verified at Unit 3.0 closeout by
mutating a vendored file and confirming exit 1 (insight #059
corrective applied).

## Maintenance ritual

The vendored-file list is a **hand-written allowlist** at a single
source of truth: `scripts/lib/vocab-files.ts` (`VENDORED_FILES` const,
consumed by both `vendor-burned-vocab.ts` and `verify-vocab-sync.ts`).
Per the Path B architecture decision, the allowlist is intentional:
cross-platform-portable, fail-loud on missing sources, no symlink
traversal surprises.

**Consequence (insight #061):** if BURNED adds a NEW vocabulary
component — say, `Insignia.tsx` for a new chrome surface — the vendor
script WILL NOT auto-pick it up. You must:

1. Extend `VENDORED_FILES` in `scripts/lib/vocab-files.ts` (one place;
   both scripts pick up automatically per insight #063 corrective).
2. Re-run `pnpm vendor:vocab`.
3. Re-run `pnpm verify:vocab-sync` to confirm.

Same ritual if BURNED **renames** a vocabulary component — the verify
script will report `MISSING source` and the const needs the new name.

## Token dependencies — Phase 4 wiring decision PENDING

These components consume CSS custom properties defined in BURNED's
HTP token stylesheets. **Phase 4 MUST pick a wiring strategy before
mounting any vocabulary component** — otherwise the components render
with empty-string fallbacks and look broken.

Tokens the vocabulary references:

- **Ink colors** (Stamp): `--stamp-red`, `--stamp-black`,
  `--stamp-blue`, `--stamp-amber`
- **Radix-style color scales** (all components, Phase 1 Unit 1.8):
  `--color-cream-N`, `--color-ochre-N`, `--color-mahogany-N`,
  `--color-burned-fire`, `--color-charcoal-N`
- **Fonts** (loaded via `@remotion/fonts` in trailer Root):
  ClashDisplay-Variable, GeneralSans-Variable, JetBrainsMono-Variable

**Three wiring options for Phase 4 to pick** (per plan §Unit 3.0
Step 3):

- **Option A — vendor the token CSS files** alongside the
  components. Fully self-contained; small drift risk if BURNED retunes
  tokens.
- **Option B — import via Phase 0 ADR #8 path-relative**
  (`import '../../../src/client/shared/tokens/primitives.css'`).
  Canonical source of truth; bundler compatibility uncertain.
- **Option C — Phase-4-specific token shim** that mirrors the
  required tokens at fixed values. Bundler-safe; drift risk if BURNED
  retunes tokens.

**This decision is deferred to Phase 4 deepening — it must NOT be
left to "first time we try to render and see what breaks."** Insight
#060 (forward-deferred gates ratchet structural debt) flags exactly
this pattern: a phase boundary defer that nobody picks up because
nothing forces the choice. Phase 4 plan deepening picks A/B/C
explicitly before any vocabulary component mounts in a Remotion
scene.

## Why vendor instead of import

The trailer package (`videos/trailer/`) is isolated from BURNED's
main src tree by design (UMB precedent — zero cross-package imports).
Vendoring + drift-gate honors that isolation while keeping the
visual primitives in sync. The alternative (path-relative imports
from BURNED) was rejected: bundler compatibility unclear for Remotion
+ creates a transitive token-CSS import chain the trailer would have
to manage anyway.

## Files

| File | Purpose |
|------|---------|
| `Stamp.tsx` + `.module.css` | Classification stamp ink |
| `Crest.tsx` + `.module.css` | Pendleton seal |
| `RedactBar.tsx` + `.module.css` | Inline redaction |
| `ClassificationBanner.tsx` + `.module.css` | Top-of-page chrome |
| `DossierPage.tsx` + `.module.css` | Manila-folder page chrome |
