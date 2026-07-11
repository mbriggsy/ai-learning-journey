---
title: A disclosure predicate that complements ONE producer's gate becomes a lie when a SECOND producer of the same flag ships — and its compliance-citing docstring deflects every reviewer
date: 2026-07-10
phase: Act 3 follow-up (the post-65 Medicare pricing unit — pre-build council, wf_4c8cd836-b22)
modules: [ui, engine]
tags: [predicate, proxy, disclosure, honesty, producer, complement, docstring, review-blindness, medicare, dateSearch]
---

## Problem

`medicareUnpriced` (healthSheetChrome.ts:302-308) keys the "Medicare's own costs aren't
priced into these numbers yet… would pull the picture down some, never up" disclosure off
AGES (every member a known 65+). On the date route that statement is FALSE today: a
still-working all-65+ household sees the note over numbers Medicare already moved. It
survived 13 U11 ultramode lenses, 6 recon readers, and 9 council opening positions; only
an adversarial red-team refuter checking the claim against the OTHER route's params
builder caught it.

## Root Cause

The predicate was written as the exact complement of the INTAKE gate (`healthcarePriced`
needs a pre-65 member), and at write time that was the truth: the intake was the only
producer of `healthcareEnabled`, so age-complement ≡ pricing-complement — on the spine.
But `dateSearch.ts:222` is a SECOND producer: `buildCandidateParams` forces
`healthcareEnabled: true` on every date candidate ("a silently healthcare-blind date is
never an open path", :144-145). The moment a second producer sets the underlying flag by
its own rule, "complement of producer #1's gate" stops being "complement of the decision."
Compounding it: the docstring (:294-301) explicitly CLAIMS insight-027 compliance
("mirrors the CREATOR's domain, not a proxy") — reviewers read the citation as the
compliance and passed over it.

## Fix

Council-ratified (hawk-armed conditional veto): key the disclosure off the run's ACTUAL
route-aware pricing decision — "was Medicare priced this run" from the same seam that
decides pricing — never off ages or any age proxy. Mutant-proven by an age-mutation
witness: mutate ages while holding the pricing decision constant → the note must not
reappear. Docstring rewritten with the code.

## Key Insight

A predicate defined as the complement of one producer's gate carries a hidden premise:
"this gate is the ONLY producer of the flag." Every NEW producer of that flag silently
re-opens the equivalence — so complement-discipline must be re-audited whenever a producer
ships, exactly as insight 020 demands for a guard's second CONSUMER. And a docstring that
cites the compliance law is not compliance — it is anti-evidence in practice, because the
citation satisfies reviewers who would otherwise check. Trust the predicate's INPUTS
against the decision's inputs, never its comments.

## Also Applies To

- Any `xUnpriced`/`xEnabled` UI mirror of an engine flag with multiple writers (the
  intake's buildOverlay vs dateSearch's buildCandidateParams vs dev seeds/vault hydrates).
- Insight 027's proxy-domain law (this is its temporal sibling: exact-at-write-time, wrong
  after a producer shipped); insight 020 (first-consumer gating) mirrored to producers;
  insight 018 (the amendment's blast radius = consumers of the superseded premise —
  here the premise "intake is the only producer" was superseded by D2's date route).
- Any comment of the form "compliant with rule N" — sweep them as claims (insight 044's
  "can-never-happen" class), not facts.
