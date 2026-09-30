---
name: brief
description: "Invoke to surface documented gotchas, root causes, and lessons
  from docs/insights/ before starting any work — including when the user is
  targeting a specific component, phase, or subsystem. Triggers when the user
  pauses to gather institutional knowledge BEFORE acting: 'brief me on X',
  'what should I know before I start/debug/work on X', 'any gotchas with X',
  'any known issues with X before I dig in', 'what do we know about X'. The
  defining signal: context-gathering BEFORE work, not performing work. Does
  NOT trigger when the user is asking you to actually perform the task (write
  code, build a feature, fix a bug, create docs) rather than first gathering
  context."
argument-hint: "[topic: the component, file, phase, or failure you're about to work on]"
---

# Brief: Insight Recall

Find the few documented lessons that bear on ONE topic, read them in full, check them against today's code, and return a short brief. Never dump the corpus. The old version of this skill injected every insight body (~370 KB for 139 insights), and Claude Code cut that to a 2 KB preview holding insight 001 alone, so every brief silently recalled nothing.

## Topic

$ARGUMENTS

If the Topic line above is empty, the topic is what the user said they are about to work on in this conversation: the component, file, phase, subsystem, or failure they named. If the conversation names nothing, ask one short question ("Brief on what?") rather than briefing on everything.

## Corpus card

Counts, frontmatter coverage, the entries a frontmatter grep cannot see, and the tag vocabulary by use count. The card is capped under 4 KB and never contains an insight body.

!`node "$HOME/.claude/skills/brief/corpus.mjs"`

## Procedure

Search with the Grep tool: case-insensitive, `files_with_matches`, path `docs/insights/` (or the corpus the card names), glob `[0-9]*.md`. Run independent searches in parallel. Each frontmatter field sits on one line (`title:`, `date:`, `phase:`, `modules: [...]`, `tags: [...]`), so a `^field:` anchor searches the frontmatter and nothing else.

1. **Keywords.** From the topic, pull out file and module names or paths, technical terms, symptoms (crash, NaN, flake, timeout, silent, wrong number), concepts and approaches, and the phase or unit. Add synonyms. Then map each one onto the card's vocabulary: prefer a tag the corpus actually uses over a word you guess.
2. **Pre-filter on frontmatter.** One alternation per field:
   - `^tags:.*(tag-a|tag-b)`: the strongest signal.
   - `^title:.*(term-a|term-b)`
   - `^modules:.*(path-or-file-fragment)`
   - `^phase:.*(unit-or-phase)`, when the topic is a phase or unit.
   - Filename slugs (Glob `docs/insights/*term*.md`), which are the only way to reach an entry the card lists as having empty tags or no frontmatter.

   Merge the hits. With fewer than 3 candidates, broaden to a body search on the same terms. With more than 25, tighten the alternations.
3. **Score from frontmatter only.** Print the candidates' frontmatter lines in one Grep: content mode, pattern `^(title|date|phase|modules|tags):`, glob `{NNN,NNN,NNN}-*.md` (the candidates' numbers). Do not read whole files yet. Points: a tag hit is +3 per distinct topic concept, a `modules` hit on a path the work touches is +3, a title hit is +2 per distinct topic concept, a filename hit is +2 per distinct topic concept but only on an entry with empty tags or no frontmatter (it stands in for the tags that entry lacks), a phase hit is +1, and a body-only hit is +1. Break ties toward a `calm-but-wrong` tag, then toward the newer insight.
4. **Read at most the top 5 in full.** Name the rest; don't read them.
5. **Check each one against today's code.** Pick its most load-bearing checkable claim (a file, symbol, flag, or constant from its `modules:` or its Fix) and verify it with Grep or Read. Also grep `docs/insights/` for its number (for example `\b084\b`) to catch a later insight that amends or supersedes it. Give it one label:
   - `CURRENT`: the code still matches the claim.
   - `MOVED`: the code was renamed or relocated, and the lesson still stands. Give the new location.
   - `CONFLICTS`: today's code or a later insight contradicts it. Say which is right. Present evidence outranks a past lesson.
   - `NO CODE CLAIM`: a process lesson with nothing to check.
6. **Write the brief** in the format below. Distill each lesson; never paste insight text.

## Output

```
## Brief: <topic>
Searched: <tags, terms, paths used> · <N> insights · <M> candidates · read in full: NNN, NNN
### Landmines
- **NNN: <short title>** (<date>). <The gotcha, one line.> Root cause: <one line>. Watch for: <one line>. Code check: CURRENT | MOVED to <where> | CONFLICTS: <what> | NO CODE CLAIM
### Also relevant (not read in full)
- NNN: <title>. <Why it may matter.>
### Before you start
- <1 to 3 concrete actions the landmines imply>
```

Show at most 5 landmines and 5 also-relevant lines. When nothing matches, say so, list what was searched, and note that the work may be worth a /distill once it lands.
