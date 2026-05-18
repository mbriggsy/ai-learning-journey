---
title: Single case-insensitive regex over mixed uppercase-acronym + common-word vocab list false-positives on natural prose
date: 2026-05-18
phase: trailer-phase-1
modules: [videos/trailer/src/lib/script.test.ts]
tags: [regex, text-scanning, case-sensitivity, vocab-grep, false-positives, r6, prose-validation]
---

## Problem

The R6 Pendleton-vocab gate scans trailer VO line bodies for raw
SDLC vocabulary. First-pass implementation: one regex with the `gi`
flag (case-insensitive, global) over the full term list.

Two false-positives surfaced on first run:

- *"The **rest** help you survive."* — matched `REST` (the
  architecture acronym).
- *"Code-name in the field: BURNED."* — matched `code` (the SDLC
  vocab term) before the `Code-name` carve-out fired.

Each false-positive blocked the test. Trimming the line content to
duck the match loses comedic value; raising the gate to ignore the
match masks future real violations.

## Root Cause

Two categorically different "vocab" types were merged into one regex:

- **Common SDLC words** (code, deploy, test, agent, commit, build,
  pipeline) — MUST catch case-insensitively because authors casing-
  randomize ("Code" / "code" / "CODE" all want to be flagged).
- **Uppercase acronyms** (REST, API, GraphQL, PR, LLM, AI) — MUST
  match case-SENSITIVELY because their lowercase forms collide with
  natural English words: *rest*, *api/apis*, *pr/prs*, *llm/llms*,
  *ai* (inside *aid*, *fail*, *trail*).

A single regex with the `gi` flag flattens both categories — every
term matches case-insensitively, so REST matches "rest" and the gate
false-positives every time natural English prose contains the
acronym's lowercase form.

## Fix

Split the vocab list into two regexes with category-appropriate
flags, run both, merge hits:

```ts
// Case-insensitive: common SDLC words (writers case-randomize these)
const R6_VOCAB_PATTERN_CI =
  /\b(code|source|implementation|tests?|testing|deploy(s|ment)?|
     ship(s|ping)?|commits?|merge|github|repo|specs?|specification|
     agents?|Claude|model|prompt|chat|build|pipeline|sprint(s)?|
     backlog|tickets?|issues?|microservice(s)?|frontend|backend|
     schema)\b/gi;

// Case-sensitive: uppercase acronyms (lowercase forms are English words)
const R6_VOCAB_PATTERN_CS = /\b(PR|LLM|AI|API|REST|GraphQL)\b/g;

for (const line of LINES) {
  for (const pattern of [R6_VOCAB_PATTERN_CI, R6_VOCAB_PATTERN_CS]) {
    for (const m of line.text.matchAll(pattern)) {
      // ... apply carve-outs, push to matches ...
    }
  }
}
```

Carve-out filtering (in-character compounds like `Agent X` proper
noun, `Code-name` spy compound) applies post-match to either pattern.

## Key Insight

**When a vocab-grep scans for both "user-typed mixed-case words" AND
"all-caps technical acronyms," the case-sensitivity policy MUST
differ between categories.** The reflex move is "one regex with the
`gi` flag" — that reflex produces false-positives whenever a lowercase
form of an acronym is also a common English word.

Trigger criterion: any acronym whose lowercase form is also a common
English word (REST → rest, API → api, PR → pr, AI → ai, LLM → llm
inside "lemma" etc.) MUST be case-sensitive. Common-word vocab stays
case-insensitive.

Diagnostic signal: if a vocab-grep is flagging natural English prose,
check whether case-insensitivity is folding an acronym onto an
English word. The fix is always the split-pattern shape — don't try
to engineer a single regex that handles both.

## Also Applies To

- Any "industry term" scanner: corporate-tone gates, jargon detectors,
  content-moderation tools, style-guide enforcers
- Brand-name protection: HEY → hey, IBM → ibm, GAP → gap — uppercase
  brand vs lowercase verb collisions
- License-key / hash detectors where capital letters carry semantic
  meaning
- Code-review automation grepping for `TODO` / `HACK` / `FIXME` /
  `XXX` — case-sensitivity matters (the lowercase forms aren't usually
  marker comments)
- Compiler-error / lint-rule scanners — error codes are case-sensitive,
  surrounding prose is not
- The broader class: any pattern where lexical case carries semantic
  information that case-insensitivity would erase
