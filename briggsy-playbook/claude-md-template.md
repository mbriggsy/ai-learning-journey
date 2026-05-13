---
created: 2026-05-09
last-updated: 2026-05-09
type: template-and-guidance
status: live — updated through directed edits
covers: per-project CLAUDE.md
audience: Claude (when authoring or refactoring a project CLAUDE.md)
aliases: [claude-md, CLAUDE.md template, claude-md-template, project-claude-md]
sources:
  - "[[projects/burned/CLAUDE|BURNED CLAUDE.md]]"
  - "[[projects/top-down-racer-04/CLAUDE|TDR-04 CLAUDE.md]]"
  - "[[projects/undercover-mob-boss/CLAUDE|UMB CLAUDE.md]]"
  - "[[projects/archive/do-not-disturb/CLAUDE|DND CLAUDE.md]]"
tags: [claude-md, template, playbook]
---

# How to write a good CLAUDE.md

A per-project `CLAUDE.md` lives at the project root. Claude Code auto-loads it at the start of every session in that project. It's the always-on briefing — the thing Claude reads before doing any work, every time.

This page is the playbook Claude uses when authoring or refactoring a project's `CLAUDE.md`. Briggsy directs (what to add, cut, sharpen); Claude writes the file. The patterns below were extracted from the corpus of CLAUDE.md files already in this vault — BURNED, UMB, top-down-racer (v02/v04), do-not-disturb, hide-and-seek, conway, and the racer archives — all of which Claude authored under Briggsy's direction.

---

## The doc hierarchy

CLAUDE.md is one of four authoritative artifacts. They have distinct jobs:

| Artifact | Role | Loaded |
|---|---|---|
| **`docs/PRODUCT-SPECIFICATION.md`** (or equivalent) | The contract. WHAT the project is, quality bar, locked ADRs. Generated through `/ce:ce-brainstorm` or similar. | Read explicitly when Claude needs it; CLAUDE.md points at it |
| **`CLAUDE.md`** | The operating manual. Conventions, file paths, "stay in your lane" rules, landmines, commands. | **Auto-loaded every session** |
| **`TODO.md`** | The handoff. What's left to do, in priority order, as prescriptions. | Read explicitly at session start / by `/brief` |
| **Claude memory** (`~/.claude/projects/.../memory/`) | Cross-session feedback Claude carries about Briggsy's preferences. | Indexed by `MEMORY.md`; substance loaded on demand |

**The CLAUDE.md ↔ spec relationship is the most important one.** The spec is *contractual* (what we agreed). CLAUDE.md is *operational* (how to act on the agreement). When the spec contradicts CLAUDE.md, the spec wins — and CLAUDE.md should explicitly say so. (BURNED's *"When any memory file, brainstorm doc, or other historical source contradicts `docs/PRODUCT-SPECIFICATION.md`, the product specification wins"* is the model.)

---

## What belongs in CLAUDE.md

- **Project type and stack.** One-liner identifying the project + the runtime, build, test stack. Claude needs to know the tooling before it can run anything.
- **Pointer to the spec.** *"See `docs/PRODUCT-SPECIFICATION.md` — that document is the non-negotiable contract."* Plus call out the sections worth knowing by heart (quality bar, ADRs, acceptance criteria).
- **Commands.** A table of the project's actual scripts (`pnpm dev`, `pnpm test`, `pnpm typecheck`, etc.). Claude shouldn't have to grep `package.json` to know how to run typecheck.
- **Architecture rules / non-negotiables.** What's FROZEN (e.g. *"Engine is FROZEN — 366+ tests, zero modifications"*), what boundaries are sacred (e.g. *"engine/renderer boundary is SACRED — zero cross-layer imports"*), what's lint-enforced. These are the lines Claude must not cross.
- **Key directories / entry points.** Where the major modules live. So Claude knows where to look first.
- **Conventions.** Naming, type/const patterns, import style, lint rules — the project-specific style guide. *"No enums — use `as const satisfies`,"* *"No barrel files,"* *"Named exports only,"* etc.
- **Landmines / Gotchas.** "This looks like X but it's actually Y" — the things that bit you in past sessions and must not regress. The single highest-leverage section in BURNED's CLAUDE.md.
- **Stay-in-your-lane rules.** Anything about *"don't touch X without doing Y first"* or *"this command exists, don't reinvent it."*

---

## What does NOT belong

- **Session history.** *"On 2026-04-10 we did X."* That's [[lessons-learned]] or git log territory. CLAUDE.md is timeless — if a fact is true *now*, it stays; if it changes session-to-session, keep it out.
- **Opinions about other projects.** *"In BURNED we tried X but it didn't work."* That's a [[lessons-learned]] cross-reference, not project context.
- **Long-form reasoning.** *"We chose React 19 because..."* belongs in an ADR. CLAUDE.md just says *"React 19 is locked, see ADR-2."*
- **Things that change every session.** Phase status, current TODO state, in-flight work. That belongs in `TODO.md`. CLAUDE.md should read identically on day 1 and day 100 of the project (with corrections).
- **Defaults Claude already knows.** *"Use TypeScript strict mode."* Claude defaults to that. Only state non-defaults or project-specific overrides.
- **Anything you'd be embarrassed by in 6 months.** If the answer is "yes," it's probably ephemeral and belongs elsewhere.

---

## Length target

CLAUDE.md loads every session. Tokens are real. **Aim for 50-150 lines for most projects.** BURNED's 226 is the upper end and only justified by the project's complexity (drama-beat runtime gates, 11 Playwright seats, a 200+ piece deck of locked motion conventions). For a fresh project, start at 30-60 lines and let it grow as landmines appear.

If your CLAUDE.md is over 200 lines, ask: *"is this all current, or am I keeping receipts?"* Receipts go to [[lessons-learned]].

---

## Sections worth having (in suggested order)

These are the headings that recur across well-functioning CLAUDE.md files. Pick the ones that pay rent for your project; skip the rest.

1. **Title + project type / one-liner**
2. **The Contract** — pointer to spec + the sections to know by heart + spec-wins rule
3. **Tech Stack** — runtime, build, test, deploy
4. **Commands** — table of the project's actual scripts
5. **Entry Points / Key Directories** — where the major modules live
6. **Architecture Rules / Non-Negotiables** — frozen layers, sacred boundaries, lint-enforced rules
7. **Conventions** — naming, type/const patterns, import style
8. **Landmines** — gotchas, "looks like X but actually Y," past-bug regressions
9. **Engine Invariants / Patterns** — non-obvious behaviors worth knowing by heart (project-specific)
10. **Dev Tooling** — special scripts, dev hooks, debugging tricks
11. **Reference Paths** — links to spec, ADRs, insights, sibling projects

---

## Skeleton template

When authoring a CLAUDE.md for a new project, start from this skeleton. Cut the sections that don't apply; fill the rest with project-specific content.

```markdown
# <Project Name>

<One-line description: what is it, what's it built with at a high level.>

## The Contract

See **`docs/PRODUCT-SPECIFICATION.md`**. That document is the non-negotiable contract.

**Sections to know by heart:**
- §X — <quality bar / acceptance test>
- §Y — <ADRs locked decisions>

When any memory file, brainstorm doc, or historical source contradicts `docs/PRODUCT-SPECIFICATION.md`, the product specification wins.

## Tech Stack
- <Runtime, build, test, deploy>

## Commands

| Command | What it does |
|---|---|
| `<cmd>` | <description> |

## Entry Points / Key Directories
- `<path/>` — <what lives there>

## Architecture Rules (Non-Negotiable)
- <Frozen layers, sacred boundaries, lint-enforced rules>

## Conventions
- <Naming, type patterns, import style>

## Landmines
- **<short label>** — <what looks normal but isn't, what to do instead, and ideally why>

## Reference Paths
- Spec: `docs/PRODUCT-SPECIFICATION.md`
- ADRs: `docs/adrs/`
- Insights: `docs/insights/`
```

---

## Worked example pointers

Look at these for "what good looks like at different sizes":

- **`projects/burned/CLAUDE.md`** — the upper-bound example. Lots of project complexity = lots of content. Notice the per-section discipline: every Landmine is *"this looks like X but actually Y"* with a concrete remedy.
- **`projects/undercover-mob-boss/CLAUDE.md`** — mid-weight (~70 lines). Good balance of stack, commands, deployment notes, conventions, landmines.
- **`projects/top-down-racer-04/CLAUDE.md`** — lean (~50 lines). Architecture rules + asset pipeline note + reference paths. Enough to act on, not bloated.
- **`projects/archive/do-not-disturb/CLAUDE.md`** — focused (~60 lines). Heavy on Architecture Rules + Conventions + Landmines, light on everything else. Pattern-forward.

The variance is intentional. **Match the doc to the project, not the project to the doc.**

---

## Maintenance

- **Update CLAUDE.md whenever a new landmine costs a session.** If a debug took an hour and one line of CLAUDE.md would have prevented it, add the line. (Briggsy directs the addition; Claude writes it.)
- **Prune when something stops being true.** Stale CLAUDE.md is worse than missing CLAUDE.md — it makes Claude confidently wrong.
- **Re-read periodically.** When a project's CLAUDE.md feels off, do a pass: *"is each line still load-bearing?"* Cut the ones that have aged out.
- **Per-project — not shared.** Don't factor common conventions across projects into a shared CLAUDE.md. Each project's CLAUDE.md is self-contained; cross-project lessons belong in this playbook.

---

## Origin

Authored 2026-05-09 during the playbook audit (H3 finding). Patterns extracted from the corpus of nine CLAUDE.md files already in the vault. Sharpened over time as new project CLAUDE.md files reveal what was missing or wrong.

#claude-md #template #playbook
