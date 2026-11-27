---
title: "Measure a change BEFORE making it, on a frozen `git archive` HEAD copy that mints the change at run time through the shipped producer — then require the edited tree to reproduce that run byte for byte; the same frozen copy lets parallel fix lanes edit without coupling through the live tree"
date: 2026-10-31
phase: the pay check's Phase C — U10's seed measurement (b9-6), the whole-file review's fix lanes (b9-9); the A6 byte-identity proof (b9-14)
modules: [src/ui/devSeeds.ts, src/intake/workingYearQuote.ts]
tags: [measurement, method, frozen-copy, git-archive, byte-identity, before-after, fix-lanes, parallel-agents, merge-file, junction, pure-refactor, verbatim-copy-in-test, seeded-sweep, engine-identity, live-side, tree-side, mtime, self-check]
---

## Problem

U10 gave every date seed its own W. The plan predicted where crowns would move, and the measurement had to show what
the change does to every seed's full engine output at both tiers. Measured the usual way — edit the seeds, run,
compare to an earlier run — "what the change does" and "did I make the change I meant" collapse into one diff: an
edit slip reads as an effect. And the whole-file review's fix needed three lanes editing at once, which insight 083
showed couple through a shared working tree (a teammate's probe collected, a file's EOL flipped, a sibling test
pinning an edit not yet landed).

## Root Cause

The live tree is shared mutable state. A measurement or a lane that reads it measures whatever is in it at that
instant — including half-made edits and other agents' scratch — and an AFTER taken from the edited tree cannot tell
the change from the edit.

## Fix

b9-6 (`b9-u10-tools\probe.mts --w`): `head\` is a `git archive` of HEAD's `src` + tsconfig + package.json with a
`node_modules` junction. BEFORE = HEAD as-is; AFTER = HEAD with W minted at run time by the shipped function
(`confirmedWorkingYearCost`), never typed; TREE = the edited tree. TREE ≡ AFTER byte for byte on all 13 keys proved
the edit; BEFORE vs AFTER is the change. The edit landed while the measurement ran. b9-14's A6 tools ran the same
probe from the archive and from the project and `cmp`'d the outputs: a byte-identity proof that never touches the
live tree. b9-9's three fix lanes each worked in a copied tree pointed at one frozen HEAD; the coordinator alone
edited the live tree, and the one file two lanes shared merged with `git merge-file -p <lane A> <frozen HEAD> <lane B>`.
083's coupling never reached them.

## Key Insight

**Split "what the change does" from "did I make the change I measured": take the AFTER on a frozen HEAD copy with the
change minted at run time by the SHIPPED producer, then demand the edited tree reproduce it byte for byte.** A frozen
copy turns BEFORE into a file you can diff forever, the runtime mint keeps the prediction honest (no hand-typed
figure), and the byte demand turns AFTER into a test of the edit itself. For parallel work: freeze HEAD first, point
every lane and verifier at the frozen copy, and let only one hand touch the live tree.

Landmines: remove a `node_modules` junction ALONE before deleting its folder; make junctions from PowerShell
(`New-Item -ItemType Junction`), since Git Bash's `cmd //c mklink /J` fails with "Invalid switch"; a runner that
writes beside its spec but runs with the copy as `cwd` needs the spec path ABSOLUTE.

## Also Applies To

- (moved from TODO's distill list, b9-2, 11-23) A HEAD-vs-tree differential through `git stash push -- src` leaves
  UNTRACKED files in place, so it is sound only while HEAD's code imports none of them; the roster-measurement recipe
  and the solve-time identity anchor both relied on it. The `git archive` frozen HEAD copy above has no such gap.

- (moved from TODO's distill list, b9-3, 11-23) **A pure refactor proves itself with a frozen copy INSIDE the test.** The
  pay check's A2 extracted engine code with no change in behavior meant. Its arm keeps a verbatim copy of the replaced
  code in the test file and sweeps it against the new code over a seeded population of households. Order matters:
  green on the untouched engine first (the copy really is the old code), then green after the extraction (the new code
  matches it), then planted mutants on the new code must fail (the sweep can see a difference). It is this insight's
  frozen copy at function size, kept in the repo, so later edits keep being checked against it.

- Every seed re-measure (the next build's crowns), every "byte-identical when OFF" claim, every mutant run.
- [[083]] — the coupling this avoids; [[095]] — a probe must run the shipped decision path, which the runtime mint is.
- [[135]] — write the prediction down before measuring; the frozen BEFORE is where it gets checked.

## Extended (2026-11-27, b9-1's first full `pnpm engine:identity` run): the frozen copy has a live twin, since the tree side reads the working tree when it starts

`pnpm engine:identity` freezes its base by `git archive` and records the tree side from the working tree. Each side's
recorder reads its files when its own process starts, and the sides run one after the other, about 16 minutes each. On
the tool's first full run, meant to prove that two records of one tree agree, U11's engine edits landed between the
base's start (00:04) and the tree's (00:20). The run came back IDENTICAL 82 of 82, which was in fact U11's identity
proof against pre-U11, not the tool's self-check. Nothing in the output said so. It was caught by comparing the edited
files' mtimes against the tree record's start, and the tool's own claim needed a second tree record, made with the
tree held still, that compared byte-equal (`cmp`) to the first.

Lesson: a frozen-copy method is only as frozen as its least frozen side. Freeze the tree side too, or finish every edit
before it starts, and check the edited files' mtimes against the record's start before saying what a run proved.
