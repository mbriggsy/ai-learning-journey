#!/usr/bin/env bash
# Assemble .recovery/migration-ledger.md from the header + ordered parts (with per-home section headers)
# + any appendix-*.md files. Re-runnable: edit parts/appendices, re-run.
set -euo pipefail
cd "$(dirname "$0")"
OUT="migration-ledger.md"
PARTS="m1-ledger-parts"

# Ordered: "partfile|home label"  (parts are already in new-tree order by their NNN- prefix)
MAP=(
  "000-docs-product-md.md|docs/product.md"
  "001-docs-product-md-1.md|docs/product.md"
  "002-docs-product-md-2.md|docs/product.md"
  "003-docs-roadmap-md.md|docs/roadmap.md"
  "004-docs-roadmap-md-1.md|docs/roadmap.md"
  "005-docs-roadmap-md-2.md|docs/roadmap.md"
  "006-docs-architecture-md.md|docs/architecture.md"
  "007-docs-architecture-md-1.md|docs/architecture.md"
  "008-docs-architecture-md-2.md|docs/architecture.md"
  "009-docs-architecture-md-3.md|docs/architecture.md"
  "010-docs-glossary-md.md|docs/glossary.md"
  "011-docs-glossary-md-1.md|docs/glossary.md"
  "012-docs-plans-1-engine-md.md|docs/plans/1-engine.md"
  "013-docs-plans-2-first-answer-md.md|docs/plans/2-first-answer.md"
  "014-docs-plans-2-first-answer-md-1.md|docs/plans/2-first-answer.md"
  "015-docs-plans-3-controls-md.md|docs/plans/3-controls.md"
  "016-docs-plans-3-controls-md-1.md|docs/plans/3-controls.md"
  "017-docs-plans-4-recommendation-md.md|docs/plans/4-recommendation.md"
  "018-docs-decisions-accumulation-fuck-off-date-md.md|docs/decisions/accumulation-fuck-off-date.md"
  "019-docs-decisions-ss-computation-md.md|docs/decisions/ss-computation.md (NEW)"
  "020-docs-decisions-other-income-r40-md.md|docs/decisions/other-income-r40.md (NEW)"
  "021-docs-decisions-portfolio-holdings-md.md|docs/decisions/portfolio-holdings.md (NEW)"
  "022-docs-research-engine-validation-and-tax-md.md|docs/research/engine-validation-and-tax.md"
  "023-docs-research-engine-validation-and-tax-md-1.md|docs/research/engine-validation-and-tax.md"
  "024-docs-research-pre65-healthcare-md.md|docs/research/pre65-healthcare.md"
  "025-docs-insights.md|docs/insights/ — already homed (no-move)"
  "026-drop.md|DROP — no surviving fact"
)

cat ledger-header.md > "$OUT"
prev=""
for entry in "${MAP[@]}"; do
  file="${entry%%|*}"; home="${entry##*|}"
  if [ "$home" != "$prev" ]; then
    printf '\n## %s\n\n' "$home" >> "$OUT"
    prev="$home"
  fi
  cat "$PARTS/$file" >> "$OUT"
  printf '\n' >> "$OUT"
done

# Appendices (optional), in lexical order
for a in appendix-*.md; do
  [ -e "$a" ] || continue
  printf '\n' >> "$OUT"
  cat "$a" >> "$OUT"
done

blocks=$(grep -Fc -- '- **`' "$OUT" || true)
echo "built $OUT — $blocks fact blocks"
