# Phase 3 — Imagen Spend Tracker

Cumulative tracker per plan §"Imagen Spend Tracker." Hard cap: **$6**
(matches the legitimate $5+$1 worst-case ceiling math, per plan
deepening). No env-var override (per `feedback-imagen-budget.md` —
env-var override is an autonomy-rule footgun: Claude self-sets it and
the cap becomes decorative).

## Cumulative

**Total Phase 3 Imagen spend: $0.00** (well under $6 cap).

## Per-unit ledger

| Unit | Date | Path taken | Imagen runs | $ this unit | Cumulative $ |
|---|---|---|---|---|---|
| 3.0 | 2026-05-22 | Vendoring (no Imagen) | 0 | $0.00 | $0.00 |
| 3.1 | 2026-05-22 | Playwright HTP capture (no Imagen) | 0 | $0.00 | $0.00 |
| 3.2 | 2026-05-22 | Card-art curation (all pre-existing webps) | 0 | $0.00 | $0.00 |
| 3.3 | 2026-05-22 | Hand-authored SVG + existing PNG assets | 0 | $0.00 | $0.00 |
| 3.4 | 2026-05-22 | Hand-authored SVG (no Imagen) | 0 | $0.00 | $0.00 |
| 3.5 | _pending_ | Music procurement (no Imagen) | 0 | $0.00 | _pending_ |
| 3.6 | 2026-05-22 | Hand-authored SVG fallback path (Step 1b — skipped Imagen escalation for operative-card-frame per insight #018 + `feedback-imagen-budget.md` "one-test-first" preference) | 0 | $0.00 | $0.00 |

## Notes

- **Phase 3 hit $0 cumulative spend** by leaning into Path B (hand-
  authored vector chrome + pre-existing Imagen assets via Path A
  `staticFile`). The architecture explicitly enabled this — Imagen
  was held as escalation budget, not default workflow.
- **If Phase 4 visual review surfaces an asset that DOES need an
  Imagen run** (e.g., the operative-card-frame's hand-authored
  vector reads underweight in MP4 export), Phase 3 can re-open under
  the $6 cap with the §"Imagen Prompt Template" structure + insight
  #018 stop-gate (4 iterations max per concept-pair). Re-opening is
  legitimate; the cumulative spend ledger updates here.
- **Phase 0 spike spend** (any Imagen runs during Phase 0 spikes for
  layout validation) is NOT tracked here — that's Phase 0's ledger.
  Phase 3 tracker starts from Unit 3.0 entry.
