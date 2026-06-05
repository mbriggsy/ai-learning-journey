# Insights — The Back Nine

Hard-won, non-obvious engineering lessons for this project. One file per insight,
numbered `NNN-kebab-slug.md`. Added via `/distill` after debugging something whose
root cause wasn't obvious; surfaced via `/brief` before related work.

**Citation format:** reference an insight by its **full relative path + title slug**
(e.g. `docs/insights/001-some-lesson.md`), not a bare number — and cross-repo
citations carry the full path too (e.g. `projects/burned/docs/insights/072-...`),
never just `burned/072`.

## Transferable discipline carried in from sibling projects

No domain prior art exists, but the engineering discipline transfers. The
load-bearing ones (see `CLAUDE.md` for how each applies here):

- **One canonical constants table** — `projects/burned/docs/insights/` 057/061/063.
- **No in-range default fallbacks** — `projects/burned/docs/insights/062`.
- **Absence-tests need presence companions** — `projects/burned/docs/insights/027`.
- **Determinism gates self-test against a planted positive** — `projects/burned/docs/insights/070`.
- **Engine↔reader contract drift at a serialization boundary** — `projects/burned/docs/insights/042`.
- **Stale Vite HMR dev-500** — `projects/burned/docs/insights/072`.
- **Externally-derived golden fixtures** — `projects/archive/do-not-disturb/docs/insights/012`.
- **JSON-persisted Infinity/NaN → null sentinels** — `projects/archive/do-not-disturb/docs/insights/009`.
- **Clean-clone discipline** — `projects/ai-journey-stats/docs/insights/008`.
- **Eager module-level singletons (never minted in render)** — `projects/ai-journey-stats/docs/insights/003`.

## This project's insights

_None yet — added via `/distill` as we learn._
