# 05 — Evidence

The code shipped past review. Plans match contract, panel passed, lessons captured. Now the build proves it shipped *wow-grade* — or it doesn't ship.

This is the **eyeball-lands-here** phase. ATC has been clearing gates from the tower for four phases. Now the plane is on the ground, taxiing in, and you walk out to inspect it. The agent assembles the evidence package; you read it like a check pilot. The bar is *wow*, not "fine."

## What's in the package

The agent assembles the package; you review it. Contents:

- **RTM closed.** Every row has `rebuild_anchor` (where the behavior lives in the new code), `test_case` (the test that proves it), and `status: passing`. No empty cells, no `TBD`, no `see ticket`.
- **Test runs at runtime.** Green test suite captured from an actual run, not a CI summary. Coverage matches the test scenarios each plan called out.
- **Parity proof (Chapter 1).** Golden in/out comparison against the legacy job. Reconciliation shows zero divergence — or every divergence carries a `correctness_flag` resolution recorded in the PRD.
- **Acceptance criteria proof (Chapter 2).** Each AC listed in the PRD, evidence attached, signed off.
- **Framework runtime evidence.** The pipeline ran end to end on The ETL Framework 2.0 — job ID, runtime, success state. Not "passes locally."
- **Documentation.** A README, runbook, or wiki page that lets a new engineer own the pipeline in a session. Inputs, outputs, schedule, ownership, troubleshooting, where to look when it breaks.

If a piece is missing, the package isn't ready — the agent goes back and produces it. Evidence isn't ceremony.

## The wow check

The bar is "the best ETL engineers on the team look at this and say wow." That's not a vibe; it's a check you run on the package before signing off.

Read it the way a senior reviewer would:

- Does the documentation read like a craftsman wrote it, or like an LLM filled a template?
- Does the RTM let you walk a requirement → code → test in three seconds?
- Does parity prove behavior, or does it paper over a divergence with a soft footnote?
- Would a new engineer running the pipeline tomorrow know what to do when it fails?

Every earlier gate had a panel doing the heavy lifting. This one doesn't. You are the panel.

If the answer to any of those is "not really," the build isn't done. You don't ship a six-out-of-ten and call it iteration. Re-run the failing phase — review, execute, plans, even contract — until the package clears the bar.

## The ship gate

The build ships when:

- The package contents above are complete.
- The wow check passes.

That's it. Ship.

If the gate doesn't clear, the build does not ship. No half-ship, no ship-with-asterisks, no ship-and-patch-next-sprint. Half the value of ATC is the *refusal* to short-circuit phases — the last gate is where that refusal counts most.

## What to expect when this phase ends

After evidence:

- The package is signed off. The pipeline is in production, or queued for the next deploy.
- The RTM is fully closed and lives with the build artifact, not as a working doc.
- `/distill` from review has already updated the brief, so the next build starts smarter than this one did.

The flight pattern closes here. The next build opens with `/brief`, loading what this one taught. Forever loop.
