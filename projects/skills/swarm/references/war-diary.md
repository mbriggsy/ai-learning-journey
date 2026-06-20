# The war diary — an after-action report for every build-swarm run

Every build-swarm leaves a durable battle log, so a run's wins, fights, and verdict survive past the session — a standing record of how each unit was built, not just *that* it was.

## Where it goes
`<sub-project>/.swarm-runs/<YYYY-MM-DD>-<unit>.md` — under the **sub-project being swarmed** (e.g. `projects/the-back-nine/.swarm-runs/`), so each project keeps its own campaign history co-located with the work, never a global bucket. Written to the **main checkout's** project dir, never inside the disposable worktree (the worktree gets removed; the diary must outlive it). The root `.gitignore` entry `.swarm-runs/` is non-anchored, so it already ignores the dir at *every* project level — durable-on-disk + browseable, out of git history (a process log, not a project doc). *(Want them committed as a permanent in-repo record instead? Un-ignore and they ride with the project.)*

## Who writes it
The **coordinator** writes it after synthesizing the run — it already holds the full picture for the user briefing, and the diary *is* that synthesis, saved to disk. (In a single fire-and-forget workflow, add a final **scribe** agent instead — `agent('write the war diary per references/war-diary.md to <path>', …)` — because the workflow script itself has no filesystem access.) Timestamps come from whoever writes (coordinator/agent via `date`), never from the script (`Date.now()` is unavailable there).

## The format

```markdown
# Swarm campaign — <unit>  ·  <date>

**Base:** <commit>  ·  **Worktree:** <path>  ·  **Verdict:** <LANDED / PENDING REVIEW / DROPPED>

## The mission
<what the unit is, in 1–2 lines>

## Forces deployed
<stages + worker count: recon (N) → implement (1) → review (N lenses) → fix (1)>

## The build
- Files touched: <footprint, e.g. simulate.ts +143 …>
- Self-gate: <typecheck / lint / test result the implementer saw>

## Where the review drew blood
<the fights — every P0/P1/P2 the panel caught, by severity, one line each>

## What the fixer closed
<each punch-list item resolved + the mutation-proofs ("swapped the arms, watched it fail, reverted")>

## Final verdict
- Gate: <typecheck / lint / test + count, independently re-run>
- Standing: <correct / equivalent / where it falls short of the bar>
- Still open: <anything deferred or unfixed>

## Casualties & wins (the one-line story)
<the headline: what the swarm nailed, what ONLY the panel caught, the convergence>
```

Keep it honest, not triumphalist — the false alarms the review threw out and the gaps the implementer missed are part of the record, not something to hide. A diary that only logs wins is propaganda, not intelligence.
