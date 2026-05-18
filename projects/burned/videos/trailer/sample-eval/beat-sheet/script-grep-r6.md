# R6 Pendleton-vocab grep — Unit 1.2 evidence

**Date:** 2026-05-18
**Author:** Phase 1 Unit 1.2 (Narration Script Draft)
**Scope:** `videos/trailer/src/lib/script.ts` `BURNED_TRAILER_LINES[*].text`
**Result:** ✅ **0 raw-SDLC-vocab matches across 16 VO cues.**

## Mechanism

The R6 vocabulary discipline gate is implemented **as a Vitest test
suite assertion** (not a one-shot manual grep) in
`videos/trailer/src/lib/script.test.ts` §"R6 Pendleton-vocab
discipline". Every `pnpm test` run re-executes the grep against
`BURNED_TRAILER_LINES`, so drift is caught structurally — Phase 2
cannot consume a script that has fallen out of R6 compliance.

This is **stronger than the plan's prescribed one-shot PowerShell
2-pass** because:

- The test suite re-runs on every change, not just at Unit 1.2 lock.
- The check binds to the machine contract (`script.ts`), not just the
  human contract (`BEAT-SHEET.md`).
- Carve-outs ('Agent X' proper noun, 'Code-name' spy compound) are
  expressed declaratively in the test, not as ad-hoc post-filter
  shell awk.
- Match iteration uses `String.prototype.matchAll()` (iterator-based,
  reentrancy-safe across multiple patterns).

## Patterns asserted

Two complementary regexes (the test runs both and merges hits):

### Case-insensitive (common SDLC words)

```
/\b(code|source|implementation|tests?|testing|deploy(s|ment)?|
   ship(s|ping)?|commits?|merge|github|repo|specs?|specification|
   agents?|Claude|model|prompt|chat|build|pipeline|sprint(s)?|
   backlog|tickets?|issues?|microservice(s)?|frontend|backend|
   schema)\b/gi
```

### Case-sensitive (uppercase acronyms)

```
/\b(PR|LLM|AI|API|REST|GraphQL)\b/g
```

Uppercase-only matching for these acronyms prevents false-positives on
natural prose words ("the rest", "model citizen", "AI" → "ai" inside
"aid" etc.).

## Carve-outs (in-character vocabulary)

1. **'Agent X'** — operative codename. The lowercase `agents?` regex
   match is filtered when the underlying substring at the match index
   is the exact two-token sequence `Agent X`. Anywhere else, `agent`
   is raw SDLC vocab.
2. **'Code-name' / 'code-name'** — in-character spy compound for
   operative pseudonym. The case-insensitive `code` regex match is
   filtered when the immediate 9-character substring at the match
   index is `code-name` (any case). The hyphen-attached compound is
   the diagnostic — bare `code` remains SDLC vocab.

No other carve-outs were needed across the 16 cues.

## Per-cue results (live, recomputed each `pnpm test` run)

All 16 cues pass with zero unfiltered matches:

| Cue ID            | Result | Notes                                                                                                    |
| ----------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| S01-cold-open     | ✅     | No SDLC vocab; deadpan briefing-room register                                                            |
| S02-briefing      | ✅     | "Code-name" carve-out fires (spy compound, not SDLC code)                                                |
| S03-roster        | ✅     | "Agent X" carve-out fires (operative codename)                                                            |
| S03-deck          | ✅     | No SDLC vocab; "rest" is natural English (not the REST acronym which is case-sensitive)                  |
| S04-cue-01        | ✅     | No SDLC vocab                                                                                            |
| S04-cue-02        | ✅     | No SDLC vocab; "forensic dossiers" is the Pendleton-coded surrogate for "documentation"                  |
| S04-cue-03        | ✅     | No SDLC vocab; "field asset" is the Pendleton-coded surrogate for "agents/operatives"                    |
| S04-stat-01       | ✅     | No SDLC vocab; "Mission rehearsal" + "contingencies war-gamed" are the Pendleton surrogates for "tests"  |
| S04-stat-02       | ✅     | No SDLC vocab                                                                                            |
| S04-stat-03       | ✅     | No SDLC vocab; "asset illustrations" surrogate for "card art"                                            |
| S04-stat-04       | ✅     | No SDLC vocab; "roster", "deck", "research budget" all in-character                                      |
| S04-payoff        | ✅     | No SDLC vocab; 4-word truth-collision is pure dramatic-payoff register                                   |
| S05-gameplay-vo   | ✅     | No SDLC vocab                                                                                            |
| S05-scream        | ✅     | No SDLC vocab; pure phonetic "VEEEEEEEERAAAA!!!"                                                          |
| S06-close         | ✅     | No SDLC vocab; "briefing" is Pendleton-canonical                                                          |
| S06-phrasing      | ✅     | Single word, no SDLC vocab                                                                               |

## Cascade-composition.md scope (deferred to Unit 1.5)

Per plan §Step 9 scope-extension, the R6 gate ALSO runs against
`videos/trailer/sample-eval/beat-sheet/cascade-composition.md` (visual
stat-caption text) once Unit 1.5 produces that file. The mechanism is
identical: Vitest reads the file at test time and runs the same
regex+carve-out logic. Unit 1.5 will land that scope extension.

## Failure-mode audit

If a future edit introduces a raw SDLC term:

1. `pnpm test` fails with a structured AssertionError citing the
   offending line, the matched term, and the full line context.
2. Phase 2 (which asserts `BEAT-SHEET.signoff` sentinel existence
   before consuming `script.ts`) is automatically blocked because
   Unit 1.2 verification cannot mark complete.
3. The line is rewritten with Pendleton-coded equivalents from the
   R6 vocab translation key in BEAT-SHEET.md preamble.

## Provenance

- Plan source: `docs/plans/origin-trailer/phase-1-beat-sheet-lock.md`
  §Unit 1.2 Step 9 (R6 grep verification)
- Test source: `videos/trailer/src/lib/script.test.ts` §"R6
  Pendleton-vocab discipline"
- Vocab translation key: `videos/trailer/BEAT-SHEET.md` preamble
