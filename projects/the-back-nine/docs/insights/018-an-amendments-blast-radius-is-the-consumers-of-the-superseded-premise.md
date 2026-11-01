---
title: An amendment's blast radius is the CONSUMERS of the superseded premise, not the producers of the new content — grep for premise phrases, not requirement numbers
date: 2026-06-10
phase: P1 (Track A — the accumulation fold, doc reconciliation)
modules: [docs/plans, docs/brainstorms]
tags: [doc-reconciliation, amendment, supersession, deepening-drift, blast-radius, verbatim-transplant, additive-invariant, verification, claim-sweep, closed-entry, consequence-claim, loose-grep, spelling-variants, prescription-tense, reachability-list, schema-v4]
---

## Problem

Track A folded R26–R39 (the full-projection expansion) into the master requirements, roadmap, and the three phase docs named by the plan's A3 file list. All three units verified green against their own specs — yet the cross-doc coherence reviewer found **four docs still asserting the superseded on-ramp as current**: phase-4's U16 called the tax-blind single-figure on-ramp "a deliberate bet, not an oversight" (and named, as a hypothetical fallback, exactly the design the fold had adopted); phase-1's U2/U3 said the schemaVersion-2 fields are "first written to disk by Phase 3 … since the spine first answer runs with these overlays OFF"; phase-2's own U7 body said the overlays are "OFF for the Phase-2 spine answer" two sections below a banner claiming the unit "stands unchanged"; phase-3's contract #5/U10 still routed bucket collection through the lever-open mini-intake.

## Root Cause

The plan's A3 file list was derived from **"where does the new content land"** (producers: the units' new homes). But the 2026-06-08 fold *inverted a prior decision* (the deferred-bucket-split / tax-blind first beat), and a decision that was deliberately load-bearing had been **cited as a rationale by docs that received no new content**. Phase-4 wasn't in the file list because no C/D unit lands there — yet it had built a whole reframe story ON the superseded premise. The same session's master-doc work hit the identical shape at smaller scale: R5 carried the single-spend claim, and the amendment banner I wrote before striking R5 undercounted its own edits. This is the deepening-drift anti-pattern (header amended, body stale) generalized **across a document set**: amend-the-producers leaves every consumer asserting the dead premise.

## Fix

Swept for the **premise phrases** — "tax-blind", "single total-spend", "lever-open", "written to disk by Phase 3", "OFF for the … spine answer" — instead of R-numbers (the consumers never cite the new requirement; they cite the old *rationale*). Each hit got the dated strikethrough + supersession-pointer treatment; phase-4 got a banner + frontmatter `amended:` as a recorded scope addition (mirroring the approved north-star precedent), and the plan's `amends:`/Sources/A3 lists were re-aligned.

## Key Insight

When a fold **supersedes a decision** (not just adds content), the edit list must be derived twice: once from the new content's landing sites, and once from a **premise-phrase grep** for the old decision's signature wording across the *entire* doc set — including docs the plan never names. A decision good enough to be load-bearing was good enough to be cited as a rationale elsewhere; those citations are the blast radius. Two supporting disciplines proved out: (1) verbatim transplants of large doc bodies must be **programmatic line-range extraction** (cmp-verifiable — 89KB landed byte-identical; retyping would have drifted), and (2) an "additive" amendment commit has a falsifiable invariant — **zero removal hunks** outside named supersessions; counting removals is what caught two Goal lines my amendment notes had silently replaced instead of annotated.

## Also Applies To

- Any future re-plan that flips a Key Decision (e.g. promoting WASM, adopting Argon2id, un-deferring SS-claim-age): grep for the OLD decision's rationale phrases ("fast-follow", "PBKDF2 is acceptable", "held fixed") across docs/ + CLAUDE.md before declaring the cascade done.
- Code-side siblings: a renamed/superseded engine contract cited in comments ("never a contribution back" already needed the §7 update); constants whose *rationale* comments outlive a regime change.
- The copyGuard catalog: superseding a copy decision means sweeping for strings built on the old framing, not just editing the named entry.

## Extended (2026-10-31, the schema-v4 doc sweep, b9-4) — closing a problem supersedes every sentence that says where it still happens, and an exact-phrase grep finds only some of the hits

The schema-v4 bump (`c2864eb9`) cited this insight in its plan's Lessons line
(`docs/plans/features/schema-v4-old-copy-refusal-build-spec.md`), and its doc sweep keyed on the VERSION words. The
inventory (§1f of `repo-research.md` in the `b9-schema-v4-proof` folder) set out to list every line that stated the
current version or called v3 the current shape, and the plan's check for R7 (U5's verification) was a grep for
"schemaVersion 3" stated as current and "no version bump" stated as a rule. Two reviews then found two kinds of
line the sweep missed.

1. **The problem the bump closed.** The bump exists so that a copy of the app built before the pay check refuses a
   current save instead of running it without W. Before it, ten live lines in five docs still described that copy's
   old reach: nine named it as a place where a run without W happens, and architecture §8 said its re-save of a
   current plan drops the working-years stamp. None of the ten says "schemaVersion" or "bump", so the version words
   could not reach them. The bump fixed two (register `:916` and `:2926`), the two that shared a line with the
   "every saved date-route plan carries W" claims its plan had named for another reason. The whole-file review
   (wf_edc27bef-48a, confirmed findings 1 and 5) found the other eight: architecture §7.7 and §8, product D6 and
   R34, the roadmap, the glossary, and register `:2917` and `:2993`. `bb26cbca` re-scoped them. Five of the eight
   cited, by its title, the very register entry the bump CLOSED, and a grep for that title's words "built before the
   pay check" finds all ten.
2. **The rule's own phrase, spelled several ways.** Ten register lines called a field additive-optional within
   version 3. The inventory listed the four spelled exactly "additive-optional within v3" (`:665`, `:3385`,
   `:4241`, `:4265`); the other six said "within schema v3", "in schema v3" or "an additive-optional v3 field". The
   bump changed none of the ten, though its plan's U5 step 5 said to judge each one and point any rule for a future
   field at §7.3. Nine are open prescriptions for fields not built yet (per-year pay, who stops later, a birth month,
   dependents, itemized deductions…). Each changes the answer, so §7.3 rule (a) now bumps the version for it. A peer
   session's re-run of the review named only the three open lines spelled the exact way; its verifiers widened the
   list, one of them to all nine (wf_ec57d2ea-165, verified by wf_60998741-860), and `1fb8b25e` fixed the nine. The
   tenth (`:665`) sits in a CLOSED entry and records a field that did land within version 3, so it stays. A grep
   for "additive" and "v3" on the same line finds all ten, plus one more line to judge.

**Rules:**
- A fix that closes a filed problem supersedes every sentence that says where the problem still happens. Grep the
  closed entry's title and its key words across every live doc, as well as the words for the mechanism you changed
  ([[042]]'s extension: a "where it happens" sentence is a claim about every caller).
- Grep the key words separately, never only the one exact phrase. The inventory and the re-run's finder both stopped
  at the exact phrase here.
- Judge every hit by its tense, including hits the inventory already listed. A dated record of what happened stays.
  An open prescription is a claim about the future, so the new rule governs it.
