---
title: Imagen asset workflow
type: conventions
date: 2026-05-09
---

# Imagen asset workflow

Rules for generating, reviewing, and archiving Imagen 4 assets. Read before running any regen script or proposing a new asset prompt.

See also `docs/insights/018-imagen-priors-engineer-around-dont-fight.md` for the meta-lesson on unbreakable priors.

## Review discipline

- **Critical-eyeball-before-presenting is non-negotiable.** Tell Briggsy what you ACTUALLY see — flaws included — before he has to point them out.

## Prompting

- **Full-bleed is the deck standard.** Prompt pattern: `'the scene fills the entire square frame edge to edge with NO white borders NO vignette NO padding'`.

## Archival

- **Asset archive convention.** `public/assets/roster/_archive/<name>-<date>-<tag>.png`. Rejected variants suffix `-<reason>-rejected.png`.

## Imagen quirks

- **Imagen anomaly retry pattern.** ~3/50 rolls return total anomalies (golden retriever, cliff landscape, CAD drawing). Retry once — always fixes by second roll.
- **Imagen safety filter inconsistent.** Retry a failed generation before assuming the prompt is unsafe.

## Regen scripts

- **Regen scripts are per-character.** `set -a && source .env && set +a && npx tsx scripts/regen-<name>.ts`. Output to `temp/roster/<name>.png`; eyeball before swapping into `public/assets/roster/`.
