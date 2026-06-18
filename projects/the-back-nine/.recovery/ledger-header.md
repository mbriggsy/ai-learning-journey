# M1 — Migration Ledger (doc restructure)

> **What this is.** Every load-bearing fact mined from the OLD doc tree (the "quarry"), routed to its home in the
> NEW tree. This is the rewrite SPEC for M2–M5 (author each new doc *from* its section here) **and** the zero-loss
> CHECKLIST for M6 (grep the new tree for every `sig:` phrase; nothing ships until all are accounted for).
> Scaffolding — deleted with `RESTRUCTURE-PLAN.md` + `.recovery/` when the restructure lands.

> **Forward-only.** Facts are present-tense truth ("we do X because Y"), never a story of what changed. The journey
> lives in `git log`. Where a `reframe` row carries a `[reframe]` note, that note is the present-tense instruction:
> the framing dies, the fact survives.

## How to read a row

```
- **`<sourceDoc>#<idx>`** · `<kind>` · → <target section in the home> · _<disposition>_ [· [NOT-must-survive]]
  - sig: <distinctive greppable phrase — M6 proves survival by finding this in the new tree>
  - <one-line present-tense digest of the fact>
  - [dedup] <when duplicated: which home is canonical, which copies become pointers>
  - [reframe] <when a fossil: the surviving fact + how to state it present-tense>
  - [!<severity>] <problem> — fix: <fix>   ← review-queue flag from the Verify phase (if any)
```

**Disposition legend** — `canonical` = the one true home for this fact · `pointer` = canonical home is elsewhere,
here it becomes a reference · `reframe` = fossil framing dies, fact survives present-tense · `no-move` = a lesson
already homed in `docs/insights/` · `drop` = pure dead framing with no surviving fact (justified in its note).

---
