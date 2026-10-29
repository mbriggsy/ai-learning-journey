---
title: A record written ahead of its evidence reads as evidence; write "asked", "expected" or "owed" until the evidence lands
date: 2026-10-23
phase: our-setup U3 step 8c (the Q14 live measurement)
modules: [playbook/TODO.md]
tags: [measurement, ground-truth, evidence, records, review-rounds, fix-wording, overclaim, confirmation, docs]
---

## Problem
In one session, Claude wrote three outcomes it was still waiting for as if they had happened:
- **The ground-truth log** said three laptop prompts came from the laptop "by his own words". Briggsy had only been asked to send them from the laptop, and he never said which device he used.
- **Round 1's fix to the private plan** said "the CORRECTION line holds his confirmation". The confirmation had only been asked for, and nothing was under that line.
- **The TODO** said the verdict arm "will read" every field in its findings table. Half the table came from Claude reading the transcript by hand, and the recorder never captures those fields.

Separately, review rounds 2 and 3 each found a P2 that the previous round's fix had introduced. One came from a reviewer's own suggested wording, adopted minus a qualifier: "in everything the recorder keeps" lost "at hook time", and the sentence became false.

## Root Cause
- **The writer knows the plan, so the expected outcome feels settled.** "I asked him to use the laptop" slides into "he used the laptop". "I asked him to confirm" slides into "his confirmation is recorded". The sentence describes the pilot's intent, not the world.
- **Nothing in the record marks the difference.** "Asked", "confirmed" and "measured" all read the same to a later session, and in this repo the plan wins any disagreement, so a hopeful sentence in the plan becomes the rule.
- **A fix is checked against the finding, not the source.** The fixer asks "does this answer the finding?" instead of "is this sentence true?" A reviewer's proposed fix is just a draft: it was written to close the finding and was never itself checked against the evidence.

## Fix
- **Correct in place, out loud.** The log got a CORRECTION line naming each overclaimed entry. The plan now says the three prompts are "NOT yet confirmed in his own words". The TODO carries the question as Next #2, and the measurement's caveat says which prompts were sent as asked.
- **Say where each fact came from.** The TODO separates what the captures hold from what Claude read by hand, and says that using the hand-read fields would take a recorder change and a new measurement.
- **Re-verify every rewritten sentence against the source.** The round-3 fix went back to the snapshot, the transcripts and the code, not to the finding's text. Round 4 found no harm-class issue.

## Key Insight
A record is evidence only for what has happened. Until the evidence lands, write the state you are actually in: "asked", "expected", "owed", "sent as asked", or "read by hand, not captured". That costs one word, and it keeps a later reader, or the plan that wins disagreements, from building on a hope.

Two checks catch it:
- **For each claim of confirmation, point at the line that holds it.** If you can't, the claim says "asked".
- **For each fix, ask whether the sentence is true, not whether it answers the finding.** Check it against the snapshot, the transcript or the code. This is the per-sentence form of insight 002's warning that a round's fixes open the next round's seams.

## Also Applies To
- Status lines written before a job ends ("deployed", "migrated", "backed up").
- Handoff notes and TODO "done" marks written as the last step starts.
- Anything a human is asked to confirm: log the ask, then the answer, as two separate lines.
- Adopting a reviewer's suggested wording: treat it as unreviewed text.
- Docs that describe what an instrument "reads": name what it captures, not what its author looked at.
