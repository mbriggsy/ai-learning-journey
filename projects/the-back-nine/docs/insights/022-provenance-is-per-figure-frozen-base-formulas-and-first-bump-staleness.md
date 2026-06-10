---
title: Provenance is per-FIGURE, not per-document-family — frozen-base formula figures, first-bump staleness, and a catch-up cited to a document it isn't in
date: 2026-06-10
phase: P1 · Track C1 (accumulation constants)
modules: [engine/constants]
tags: [constants-discipline, provenance, citations, COLA, contribution-limits, transcription]
---

## Problem

Three independent traps surfaced while transcribing the 2026 contribution limits —
each one a value a careful maintainer would confidently get wrong:

1. The §109 super catch-up is "the greater of $10,000 or 150% of the regular
   catch-up" — so 150% × the 2026 regular ($8,000) = $12,000. The actual 2026 figure
   is **$11,250** (Notice 2025-67: "remains $11,250").
2. The IRA catch-up is "$1,000, fixed" in every pre-2026 source. The actual 2026
   figure is **$1,100** — SECURE 2.0 §108's indexing produced its FIRST-EVER move.
3. The repo's existing `hsa2026` cited ALL its figures to "IRS Rev. Proc. 2025-19" —
   but the $1,000 age-55 catch-up appears NOWHERE in that document (it is statutorily
   fixed by IRC §223(b)(3)(B); the §223(g) COLA provision never indexes it).

## Root Cause

All three share one mechanism: **the plausible derivation/citation is keyed to the
wrong anchor.** (1) The statutory formula's base is FROZEN (150% × the **2024**
catch-up = $11,250, COLA'd independently thereafter) — the formula's inputs and the
current-year sibling figure have diverged, so re-deriving from "the formula as
remembered" silently uses the wrong vintage. (2) A figure described as "fixed" for
20 years trains every secondary source — and every reader — to hard-code it; the
first index bump turns all of that training data stale at once. (3) Bundling figures
into one entry with one citation asserts the citation covers EVERY field; one field
came from a different legal instrument entirely, and the pin pass would have gone
looking for a COLA figure that does not exist.

## Fix

Store formula-defined figures as their OWN sourced values with the trap named in the
`note` ("NEVER derive as 150% × the current-year catch-up"), plus a test pinning
`superAmount !== 1.5 × regularAmount` — the exact wrong derivation, made red. Mark
first-bump figures with the staleness warning ("any source still showing $1,000 is
pre-2026 stale"). Split bundled provenance: the COLA figures cite Rev. Proc. 2025-19
§2.01; the catch-up cites IRC §223(b)(3)(B), with a test asserting the citation
string names the statute.

## Key Insight

**A citation is a per-FIGURE contract, not a label on a family of figures — and the
most dangerous transcription errors are the ones a domain-fluent maintainer derives
confidently from the wrong anchor.** When a figure is defined by a formula, record
whether its base is frozen or live before trusting any re-derivation; when a figure
has been constant for years, treat the first index bump as a mass-staleness event;
when an entry bundles figures, verify each field actually appears in the cited
document. The strongest guard is a test that pins the *specific wrong value* the
plausible derivation produces.

## Also Applies To

The P1-exit pin pass (it must NOT "correct" $11,250 → $12,000 or $1,100 → $1,000
from stale sources); the IRMAA top tier (frozen through 2027, re-indexes 2028 — the
same frozen-vs-live split); any OBBBA/SECURE figure whose statutory formula references
a named base year; the `partB2026`-derived cost-share identities (derived figures
must name which input vintage they derive from).
