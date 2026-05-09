---
created: 2026-05-08
type: audit
audited:
  - "[[PLAYBOOK]]"
  - "[[claude-strengths]]"
  - "[[claude-watch-outs]]"
  - "[[commands-and-skills]]"
  - "[[lessons-learned]]"
  - "[[quick-reference]]"
  - "[[session-hygiene]]"
  - "[[status-line]]"
  - "[[tools-and-integrations]]"
  - "[[workflows]]"
status: complete — 16 of 16 findings applied (closed 2026-05-09)
tags: [audit, playbook, meta]
---

# Briggsy Playbook — Audit

> Critical pass over all 10 files. Findings ranked by severity. **Nothing has been edited yet** — this is a proposal. Pick what to apply.

## TL;DR

The playbook is **good**. Substance is sharp, lessons are dated and concrete, the philosophy holds together. The issues are mostly:

1. **A few stale facts** (model version, pending skill statuses) that need a sweep
2. **Two real gaps** (no "principles" condensation, no "how to write a CLAUDE.md")
3. **Duplication** of common-procedure content (squeaky-clean, distill, brief, write-the-TODO each show up in 3 files with overlapping prose)
4. **One tonal tension** (70% context rule vs. "use the 1M, it's enormous")

Total findings: **16**, broken down 4 high / 8 medium / 4 low.

---

## High-severity findings (4)

### H1. Stale model version: "Opus 4.6" referenced throughout, current model has moved on

**Where:**
- [[claude-strengths]] line 65: *"Claude Opus 4.6 has a 1M token context window."*
- [[session-hygiene]] line 22: *"Claude Opus 4.6 has a 1 million token context window."*
- [[status-line]] line 7 (example): *"[Opus 4.6 (1M context)]"*
- [[status-line]] line 170 (display example): same

**Issue:** Today is **2026-05-08**. Opus has moved on (Opus 4.7 is current per env). All four references will keep aging.

**Proposed fix:** Replace specific model references with the model-agnostic phrasing *"the current Opus model (1M context window)"*. The status-line example screenshot can stay or update with each version — it's a worked example, so version-locked is OK there as long as you note "as of <date>."

**Effort:** 5 min global find-replace.

---

### H2. Missing principles section — the philosophy isn't condensed anywhere

**Issue:** The playbook has the substance — Pushback is the safety net, Quality Bar First, Spec → Plan → Code, Debate before deciding, One change at a time, Honest uncertainty, Vibes get translated to discipline — but it's spread across 10 files. There's no single page that says *"Here are the 10 commandments of how Briggsy works with Claude."*

If a future-you (or future-Claude) opens the playbook to onboard fast, the first stop is `PLAYBOOK.md` which is a directory of files, not a manifesto. The principles end up extracted from the prose, not declared.

**Proposed fix:** Add `principles.md` (or fold into `PLAYBOOK.md`'s top section). One page, ~10 numbered principles, each one sentence + one sentence why. Treat it as the ELI5 of the playbook.

**Sample principles I'd nominate** (drawn from your existing prose):

1. **You own WHAT and WHY. Claude owns HOW.** — From [[workflows#Expert-Pilot Partnership|Expert-Pilot Partnership]]
2. **Pushback is the safety net.** Fast agreement is the failure mode. — Same source
3. **Quality bar first, before any work.** Vague bars drift; binary tests don't. — From [[workflows#Quality Bar First|Quality Bar First]]
4. **Spec → Plan → Strengthen → Code is the contract.** Without a spec, plans have nothing to inherit from; without strengthening, plans ship their bugs intact. — From [[workflows#Spec → Plan → Strengthen → Code (Transitive Enforcement)|Transitive Enforcement]]
5. **Debate before deciding. Evidence flips positions; pressure shouldn't.** — [[workflows#Debate-Pushback|Debate-Pushback]]
6. **One visual change at a time.** Layout thrashing eats sessions. — [[workflows#One Change At A Time (Visual Work)|One Change At A Time]]
7. **Vibes get translated into discipline, out loud.** *"Water beads"* → 60fps + clamp formulas + bundle budget. — [[workflows#Expert-Pilot Partnership|Expert-Pilot Partnership]]
8. **TODO is forward-looking, not a diary.** Git log has the history. — [[session-hygiene]]
9. **Specific feedback ≠ categorical feedback.** "Don't use this word without explaining" ≠ "dumb your vocab." — [[claude-watch-outs]]
10. **Reference templates: copy structure, never copy claims.** — [[lessons-learned#The Saul Bass incident|Saul Bass]] + [[lessons-learned#Maximum Overdrive footer|MO footer]]

**Effort:** 30–60 min to draft and refine.

---

### H3. Missing "How to write a good CLAUDE.md"

**Where it should be:** A new file or section. Currently nowhere.

**Issue:** Most of your projects have a `CLAUDE.md` (BURNED, top-down-racer-02, top-down-racer-04, undercover-mob-boss, both archived MO's, pac-man — 6+ files I can see). The playbook references project CLAUDE.md files several times — *"per project CLAUDE.md"*, *"projects/<name>/CLAUDE.md for project-specific conventions"* — but never explains what makes one good.

You've clearly developed strong instincts here (the BURNED CLAUDE.md is sophisticated). Those instincts deserve a doc.

**Proposed fix:** Add `claude-md-template.md` covering:
- What belongs (project conventions, locked decisions, naming patterns, quality bar pointer, "stay in your lane" rules, file paths Claude should know)
- What does NOT belong (history, opinions about other projects, things that change every session)
- Length target (concise — Claude loads it every session)
- Relationship to the spec (CLAUDE.md is operational; spec is contractual)
- Example/template skeleton

**Effort:** 60 min to draft if you want it; could probably be cribbed largely from your existing best CLAUDE.md.

---

### H4. `/product-specification` pending status — has it been built since 2026-04-10?

**Where:**
- [[commands-and-skills]] line 75: *"PENDING — NOT BUILT YET"*
- [[quick-reference]] line 7: *"Run `/product-specification` (when built — currently pending)"*
- [[workflows]] line 114: *"use `/product-specification` once built, or manual authoring"*

**Issue:** Three files all carry the *pending* status. That was the state on 2026-04-10. It's now 2026-05-08 — about a month later. Either:
- It was built → update all three references
- It was deprioritized → say so, optionally remove the references

**Proposed fix:** Quick status check, then update all three OR remove with a note ("not built; use manual authoring per workflows.md").

**Effort:** 5 min once status is known.

---

## Medium-severity findings (8)

### M1. Tonal tension: "70% context, wrap up" vs. "use the 1M, it's enormous"

**Where:**
- [[session-hygiene]] line 17: *"When Claude Code's context window is ~70% full, start a new terminal."*
- [[session-hygiene]] line 22: *"70% of that is a LOT — long sessions are fine."*
- [[claude-strengths]] line 65: *"Don't worry about 'am I asking Claude to hold too much in mind?' — Claude Opus 4.6 has a 1M token context window. That's enormous. Use it."*

**Issue:** Not technically contradictory (one says "you can run long" and the other says "wrap when you hit 70% of long"), but a fast reader gets mixed signals. The 70% rule is sound; the "use the enormous context" is also sound; they need to be reconciled in one place.

**Proposed fix:** Add a sentence to claude-strengths.md after the 1M reference: *"That said — quality starts to degrade past ~70% utilization. See [[session-hygiene#Start a new terminal at ~70% context|session-hygiene]] for the wrap protocol."* That keeps both true and bridges them.

**Effort:** 2 min.

---

### M2. Squeaky-clean documented in 3 places with overlapping content

**Where:**
- [[commands-and-skills]] (slash-command entry, ~6 lines)
- [[session-hygiene]] (verbose 7-step nuclear cleanup section, ~20 lines)
- [[workflows]] (Squeaky Clean workflow, also 7-step list, ~17 lines)

**Issue:** The 7 numbered steps are nearly verbatim in [[session-hygiene]] and [[workflows]]. If the steps ever change (typecheck adds linting, push behavior changes), three files need updates.

**Proposed fix:** Pick **one canonical home** (I recommend [[commands-and-skills]] since it's the slash-command index). The other two link there with a one-line summary: *"Full protocol: [[commands-and-skills#`/squeaky-clean`|see commands-and-skills]]."*

**Effort:** 10 min.

---

### M3. "Write The TODO", "Distill", "Brief" — same triple-documentation pattern

Same issue as M2 for three more procedures. Each shows up in:
- [[commands-and-skills]] (definition)
- [[session-hygiene]] (full guide)
- [[workflows]] (workflow entry)
- [[quick-reference]] also lists each as a signal

**Proposed fix:** Same pattern — canonical home in [[commands-and-skills]], cross-references elsewhere. [[quick-reference]] keeps its one-liner mentions (that's its job) but loses the prose.

**Effort:** 15 min for all three.

---

### M4. Status line documented in 2 places

**Where:**
- [[status-line]] — the full 273-line guide
- [[tools-and-integrations]] lines 159–173 — duplicates the "what each piece shows" content

**Proposed fix:** [[tools-and-integrations]] keeps the section but reduces it to: 1 sentence what it is + link to [[status-line]]. The detailed table moves to [[status-line]] only.

**Effort:** 5 min.

---

### M5. Saul Bass / Maximum Overdrive footer / Touchstone — described in 2 files each

**Where:**
- [[claude-watch-outs]]: each is a "pattern" entry with example
- [[lessons-learned]]: each is a dated incident with full context

**Issue:** The verbatim file lists, the descriptions, and the lessons are largely duplicated. Both files serve a real purpose (patterns vs. dated incidents) but the duplication is heavy.

**Proposed fix:** [[claude-watch-outs]] keeps the **pattern** (one paragraph: symptom, why, how to catch, rule) and adds a wikilink to [[lessons-learned#The Saul Bass incident]] for the dated incident details. Avoids 80% of the prose duplication.

**Effort:** 10 min.

---

### M6. lessons-learned "Earlier lessons" section is a bare file-name list

**Where:** [[lessons-learned]] lines 110–130 — 20+ `feedback-*.md` filenames listed without context.

**Issue:** Useful as a directory but not as a learning resource. Reader has to open each file to know what it covers.

**Proposed fix:** Convert to a table:

| File | One-line lesson |
|---|---|
| `feedback-water-beads-polish.md` | The quality bar standard — "so slick water beads off it" |
| `feedback-wow-over-simplicity.md` | Visual richness is the deliverable |
| ... | ... |

**Effort:** 30 min if you write the one-liners yourself; 15 min if I do them by reading each (offer below).

---

### M7. status-line.md is 273 lines — could split

**Where:** [[status-line]]

**Issue:** Setup guide + full Python script + customization examples + troubleshooting + bash example + reference table. That's 4–5 docs in one. Functional but heavy.

**Proposed fix:** Either:
- Split: `status-line-setup.md` (steps 1–3 + minimal verification) and `status-line-customization.md` (examples, troubleshooting, alternative languages)
- Or: keep as-is but add a top-of-file table-of-contents and collapsible sections per Obsidian convention

**Effort:** 20 min to split; 5 min to add ToC.

**Recommendation:** Add ToC, don't split. The current structure is logical.

---

### M8. workflows.md is 261 lines — some entries don't fit the "workflow" frame

**Where:** [[workflows]]

**Issue:** Most entries are workflows (multi-step patterns). But:
- *"One Change At A Time"* is more of a rule than a workflow
- *"Sequential Thinking After Multi-Agent Research"* is a 1-line directive
- *"Sub-Agent Delegation"* is a heuristic, not a workflow

**Proposed fix:** Either:
- Promote real rules to a `principles.md` (see H2) and keep workflows.md as multi-step patterns only
- Or rename the file to `patterns-and-workflows.md` and accept the mixed bag

**Effort:** Depends on H2.

---

## Low-severity findings (4)

### L1. No section on Cowork mode

**Issue:** The playbook is named "How to work with Claude" but is implicitly about Claude Code. Cowork mode (which we're using right now) gets no mention. Probably a deliberate scope choice — but if this becomes a regular tool, worth a section.

**Proposed fix:** Decide: keep playbook scoped to Claude Code only (rename `PLAYBOOK.md` opening to clarify), OR add `cowork.md`.

**Effort:** Decision; effort depends on the decision.

---

### L2. No mention of Plan Mode in Claude Code

**Issue:** Claude Code's plan mode (where Claude proposes a plan before executing) isn't mentioned. Worth a workflow entry.

**Proposed fix:** Add a section to [[workflows]] on when to invoke plan mode and when to skip it.

**Effort:** 15 min.

---

### L3. Pronoun/audience inconsistency

**Issue:** Some sections address Briggsy ("when you're starting a new project"), some address Claude ("Rule for Claude: never use WebFetch"). Most files mix both. It's not confusing in practice, but a reader has to context-switch.

**Proposed fix:** No mechanical fix needed. If you do a future polish pass, consider adding small icons or labels to mark Claude-directed rules vs. Briggsy-directed how-tos.

**Effort:** Skip unless polishing.

---

### L4. quick-reference.md has gap scenarios

**Issue:** Good coverage of common scenarios. Missing:
- "Claude is about to do something destructive — how to interrupt"
- "I need Claude to forget what we just decided" (rare but happens)
- "Starting a chat session in Cowork or another non-Code tool"

**Proposed fix:** Add 2–3 entries.

**Effort:** 10 min.

---

## Cross-cutting observations

### What's working really well

- **Dated lessons.** Every incident in [[lessons-learned]] has a date. That's gold. Don't lose this discipline.
- **Origin pointers.** Most workflows note where they came from (BURNED session, UMB phase 4, etc.). Makes them feel real, not theoretical.
- **Memory pointers.** *"Memorialized in: feedback-X.md in Claude's memory"* — these are the connective tissue between this playbook and Claude's memory. Important pattern, keep it up.
- **The watch-outs are concrete.** [[claude-watch-outs]] has actual examples with file counts and timelines, not vague warnings.

### What's at risk

- **Duplication is the biggest threat to durability.** The same procedure appearing in 3 files means each update has 3× the work and 3× the chance of drift. You'll start to see one file diverge from the others over the next 3–6 months. The M2/M3 fixes are preventive.
- **Stale dates.** Most lessons-learned entries are 2026-04-10. That was a productive day. But a month later, no new entries — either the playbook isn't being updated as new sessions teach you things, or you've stopped having new lessons (unlikely). Worth a 5-minute "what have I learned in May?" pass.
- **The "pending" skills (`/product-specification`)** — anything tagged "pending" needs an expiration date or it becomes permanent debt.

---

## Recommended order of operations

If you want to apply all of this, here's the order I'd do it:

1. **5-minute sweep** — H1 (model version), H4 (`/product-specification` status check)
2. **30-minute consolidation** — M2, M3, M4, M5 (de-duplication; canonical homes)
3. **30–60 minutes** — H2 (write `principles.md`)
4. **60 minutes** — H3 (write `claude-md-template.md`)
5. **15 minutes** — M6 (table of earlier lessons)
6. **Polish, optional** — M1 reconciliation sentence, M7 ToC, L2 plan mode entry, L4 quick-ref additions

---

## What I want from you

Three options for next move:

**Option A — Apply the high-severity stuff yourself.** I've described the changes; you make them. Fastest, most you-flavored output.

**Option B — I apply specific items you green-light.** Tell me which numbered findings to act on, I make the edits, you review the diffs in Obsidian. Keeps you in control of every change.

**Option C — I do a full pass and present a single PR-style proposal.** I create a worktree-style "proposed-edits" branch worth of changes, you review the whole batch as a unit, accept/reject any pieces.

I lean toward **Option B**. It's the safest version of "let Claude maintain my vault" — every change is intentional, reviewed, and traceable.

---

*— End of audit —*

---

## Session checkpoint — how to resume

**Last worked on:** 2026-05-09 (Briggsy + Cowork session)

### Status of the 16 findings

| ID | Item | Status |
|---|---|---|
| H1 | Stale "Opus 4.6" sweep | ✅ Applied |
| H2 | `principles.md` | 🟡 Draft v0.1 written; Briggsy iterating (last edit: principle #6 expanded to "Spec → Plan → Strengthen → Code") |
| H3 | `claude-md-template.md` | ✅ Applied (v0.1) — drafted from corpus of 9 existing CLAUDE.md files (BURNED, UMB, TDR-04, DND, etc.); covers doc hierarchy, belongs/doesn't, length target, sections, skeleton, worked-example pointers, maintenance. Refine next time Briggsy writes/refactors a project CLAUDE.md. |
| H4 | `/product-specification` status | ✅ Applied — superseded by `/ce:ce-brainstorm`, three references swept |
| M1 | 70% context vs. "use the 1M" reconciliation | ✅ Applied (folded into H1) |
| M2 | Squeaky-clean / Distill / Brief consolidation | ✅ Applied — canonical home in `commands-and-skills.md` |
| M3 | Write The TODO consolidation | ✅ Applied (combined with M2) |
| M4 | Status-line duplicate in `tools-and-integrations.md` | ✅ Applied |
| M5 | Saul Bass / MO footer / touchstone trim | ✅ Applied |
| M6 | Earlier-lessons table from memory folder | ✅ Applied — bullet list converted to 20-row table with sharper one-liners drawn from actual file content. Caught and fixed stale `feedback-water-beads-polish.md` reference (file was trimmed when promoted to manifesto 2026-04-29; replaced with `project_umb_water_beads_origin.md` receipt) |
| M7 | Status-line ToC | ✅ Applied |
| M8 | Promote rules from `workflows.md` to `principles.md` | ✅ Applied — but with a re-scope. Audit named 3 candidates; on review only One Change At A Time was a real duplication (already principle #8). Trimmed its 14-line workflows.md entry to a pointer. Sequential Thinking and Sub-Agent Delegation stay put: principles.md already excluded Sequential Thinking as "tactical, not a principle"; Sub-Agent Delegation is a multi-paragraph workflow with When/How/Why, not a one-line rule. |
| L1 | Cowork mode section | ✅ Applied — added `cowork.md` (when to use, cold-start problem, session-checkpoint pattern); linked from PLAYBOOK.md and _HOME.md |
| L2 | Plan mode entry | ✅ Applied — added to `workflows.md` between Codified-vs-Native planning and Sequential Thinking |
| L3 | Pronoun/audience consistency | ✅ Applied — added Voice Convention note to PLAYBOOK.md Meta section (declares the dual audience instead of relabeling 10 files) |
| L4 | Quick-reference gap scenarios | ✅ Applied — added 3 entries to `quick-reference.md` (destructive interrupt, forget-a-decision, Cowork start) |

**Tally:** **16 of 16 applied. Audit complete.**

### To resume in a new Cowork session

**Important:** Folder access does NOT persist between Cowork sessions. Each new session starts cold and must be granted folder access fresh.

1. **Open Cowork** in a new session.
2. **Send this prompt** (it grants folder access AND tells Cowork what to do):

> *"Mount `C:\Users\brigg\ai-learning-journey` and `C:\Users\brigg\ai-learning-journey-private`. Then I'm resuming a playbook audit — read OBSIDIAN.md for the vault setup, _HOME.md for the map, then PLAYBOOK-AUDIT.md and scroll to the 'Session checkpoint' section at the bottom for the punch list. Don't re-read the whole audit unless you need to. Then ask me what I want to tackle next."*

3. **Cowork will pop a folder-access prompt** — approve both folders. Then it'll read the checkpoint and resume.

That's it. Cowork starts fresh, including folder access, but the vault carries the state. The same pattern works for any other long-running task — write a checkpoint section to whatever doc was the work product, plus a "mount these folders" instruction for resuming, and the next session can pick up cleanly.

### Open questions for next session

None — the audit is closed. The playbook is in working order; future sharpening happens through normal directed-edit cadence (Briggsy directs, Claude writes).

#audit #playbook #meta #checkpoint
