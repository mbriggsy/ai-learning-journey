# Phase 3 — Hero (the first "wow")

**Prereq:** Read [README.md](README.md) first — the bar, locked decisions, and visual system live there. This file is just the phase steps.

Landing page hero. Structurally simple: ONE massive total-volume number. No competing visual weights. No falling droplets. No iridescent accents. The magnitude IS the wow.

**Primary number: combined Claude API tokens consumed.** Lines authored drop to the supporting line.

1. **Counter** starts at 0, tweens to `combined.totalTokens` over ~2.4s with a custom ease that feels weighty (build it; don't reuse `power3.out` rote — name it `weighted` in `easings.ts`). Number formats with a "B" suffix when ≥ 1 billion (e.g., `1.24B`), "M" when ≥ 1 million (e.g., `847M`). Pure number, never with "tokens" inline — the unit label sits below in small caps.
2. **Unit label** under the counter, tight kerning, small caps: "TOKENS CONSUMED · CLAUDE OPUS 4.7, SONNET 4.6, HAIKU 4.5"
3. **Window footnote** (smaller still, muted text): "across N days of session retention" using `combined.tokenWindowDays`. Required by the honesty constraint in [Phase 0 §0.5b](phase-0-data-gaps.md#05b--tokens-block-claude-code-session-jsonl-parser) — this is the receipt that we're not claiming lifetime totals.
4. **Background**: deep midnight teal (`#0a1a26`) in dark / warm cream (`#f7f1e3`) in light, with ONE slow gradient breath (CSS conic-gradient + GSAP-driven CSS variable, ~12s loop, barely perceptible). No drift, no parallax, no droplets.
5. **Type**: `clamp(4rem, 18vw, 22rem)` so the number fills mobile viewport horizontally (~360–430px) without overflow, scaling up to ~22rem on desktop. Variable-width display font (Satoshi Variable), `tabular-nums` for stable digit width during tick-up. Kerning a print designer would obsess over.
6. **Specular sheen**: a faint highlight on the digits that drifts with cursor position. Implemented via CSS `background-image: linear-gradient(...)` + `background-position` driven by cursor. Subtle — should be almost invisible until you notice it.
7. **Supporting line** (renders after counter settles, ~200ms each, staggered):
   - "421,633 lines authored across 11 projects"
   - "N files · X MB · Y commits"
   - "Z sessions · M web searches" (optional bonus from `server_tool_use` aggregation)
8. **Taxonomy hint** below the supporting line: one quiet line of small caps — "Authored / Pipeline-Generated / Tool-Generated · what each tier means →" linking to /about. Peers don't need to leave the landing page to understand what they're looking at.

**No scroll-jacking, no auto-play sound, no popup, no droplets.**

---

← [Phase 2 — Data wiring](phase-2-data-wiring.md) | [Index](README.md) | Next → [Phase 4 — Project grid](phase-4-grid.md)
