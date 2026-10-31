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

Find the lessons that bear on ONE topic, read the strongest in full, check them against today's code, correct any lesson the code has outgrown, and return a short brief. Never dump the corpus. The old version of this skill injected every insight body (~370 KB for 139 insights), and Claude Code cut that to a 2 KB preview holding insight 001 alone, so every brief silently recalled nothing.

## Topic

$ARGUMENTS

If the Topic line above is empty, the topic is what the user said they are about to work on in this conversation: the component, file, phase, subsystem, or failure they named. If the conversation names nothing, ask one short question ("Brief on what?") rather than briefing on everything.

## Corpus card

Counts, frontmatter coverage, the entries a frontmatter grep cannot see, and the tag vocabulary by use count. The card is capped under 4 KB and never contains an insight body.

!`node "$HOME/.claude/skills/brief/corpus.mjs"`

## Procedure

The corpus is `docs/insights/`, or the folder the card names; `<dir>` below means that folder. Search with the Grep tool, `files_with_matches`, path `<dir>`, glob `[0-9]*.md`, `head_limit: 0` on every call, and without `-i` (each pattern's `(?i:...)` group covers its keywords' case). Run independent searches in parallel. Each header field sits on one line (`title:`, `date:`, `phase:`, `modules: [...]`, `tags: [...]`), so a `^field:` anchor searches that field and nothing else.

Nothing may be lost to a tool's output limit. When a tool result is saved to a file instead of shown in full, read that file in full before going on. When a listing or header print has more than one page, read every page. If `--list` or `--headers` prints anything but its Listing or Headers line first, stop and say so in the Searched line rather than score without it. If anything stayed unread, say what in the Searched line.

1. **Concepts, keywords and size.** Write down the topic's distinct concepts (the feature, the files or areas, the mechanism, the kind of change); every "+N per concept" below counts against that list. For each, pull out file and module names, technical terms, symptoms (crash, NaN, flake, timeout, silent, wrong number) and synonyms, then map them onto the card's vocabulary: prefer a tag the corpus actually uses over a word you guess. For a file, use its stem (`taxOverlay`, not `src/engine/taxOverlay.ts`): `modules:` lines spell one file with and without its folder, its extension and its test twin. Then label the job: **big** when the topic names two or more modules, files or areas, or a job that spans sessions; **small** otherwise; big when unsure.
2. **Header greps.** One alternation per field, from the keywords that fit it (tag spellings for `tags:`, the topic's terms for `title:` and `phase:`, the stems for `modules:`), each keyword matching only at the start of a word: after a non-letter or the line's start, or at a camelCase hump. For keywords `seed` and `overlay` the pattern is `(?:(?:^|[^A-Za-z])(?i:seed|overlay)|[a-z](?:Seed|Overlay))`, so "seed" finds `dev-seeds` and `src/ui/devSeeds.ts`, "overlay" finds `src/engine/taxOverlay.ts`, and "fica" never finds "verification". Join a keyword of several words with `[-_ ]?` and give its hump form with every word capitalized: "date search" is `(?i:date[-_ ]?search)` and `[a-z]Date[-_]?Search`. Escape regex characters in a keyword (`\.` `\$` `\+` `\(` `\?` `\*` `\[` `\|`); a keyword that starts with a non-letter (`.tsx`, `__tests__`) gets its own branch, escaped, with no guard and no hump form. Run:
   - `^tags:.*<pattern>`: the strongest signal.
   - `^title:.*<pattern>`
   - `^modules:.*<pattern>` on the stems of the files the work touches.
   - `^phase:.*<pattern>`, when the topic is a phase or unit.
   - Filename slugs: Glob `<dir>/*-<term>*.md`, the term in lowercase with hyphens between its words (file names are lowercase kebab-case, so the leading `-` makes it start-of-word). This is how a filename reaches an entry the card lists as having empty tags or no frontmatter.
3. **Meaning pass.** Run `node "$HOME/.claude/skills/brief/corpus.mjs" --list <dir>`. When it names more than one page, run it again with `--page 2` and on to the last. Each line is a lesson's number, then its `applies_when` situations in brackets, or its title where it has none. Judge every line by meaning against the job: does it name work this job will do, or a trap this job could walk into, even with no word in common? A general process lesson that would fit any job matches only when this job is that process. Note each lesson that matches and which of your concepts it matches.
4. **Score every candidate.** The candidates are every lesson a header grep or the meaning pass found, none dropped. With fewer than 3, also search the bodies on the same terms. Print their headers with `node "$HOME/.claude/skills/brief/corpus.mjs" --headers <dir> <NNN,NNN,...>` (all the candidates' numbers, comma-separated) and read every page. Do not read whole files yet. Points: a tag hit is +3 per distinct concept; a meaning match on the listing line is +3 per distinct concept, the same whether the line showed its `applies_when` or its title; a `modules` hit on a file the work touches is +3, once per lesson; a title hit is +2 per distinct concept; a filename hit is +2 per distinct concept, but only on an entry with empty tags or no frontmatter (it stands in for the tags that entry lacks); a phase hit is +1; a body-only hit is +1. A word hit counts only where the word carries the topic's meaning ("magi" inside "magic-moment" does not). Break ties toward a `calm-but-wrong` tag, then toward the newer insight (the later date, then the higher number).
5. **Read the top 10 in full for a big job, the top 5 for a small one.** Name the next ones, up to 10, by title; don't read them. A candidate that scored no points is not named.
6. **Check each one against today's code.** Pick its most load-bearing checkable claim (a file, symbol, flag, or constant from its `modules:` or its Fix) and verify it with Grep or Read. Also grep `<dir>` for its number (for example `\b084\b`) to catch a later insight that amends or supersedes it. Give it one label:
   - `CURRENT`: the code still matches the claim.
   - `MOVED`: the code was renamed or relocated, and the lesson still stands. Give the new location.
   - `CONFLICTS`: today's code or a later insight contradicts it. Say which is right. Present evidence outranks a past lesson.
   - `NO CODE CLAIM`: a process lesson with nothing to check.

   When a `MOVED` or `CONFLICTS` lesson is the stale side, correct it before you write the brief, so the next brief doesn't trip on it again. Under the paragraph that holds the stale claim, add one note: `> **Out of date (corrected YYYY-MM-DD):** <what changed, and when, if you know>. The current <thing> lives in <file and symbol, or insight NNN>.` Point there, and never copy today's value into the lesson: a copied value goes stale the same way. Leave the stale sentence itself as it is; a lesson whose note points at a home that still holds is `CURRENT`. Leave the lesson alone, and say why under Before you start, when the code is the wrong side (it broke what the lesson guards), when you can't tell which side is right, or when `git diff HEAD -- <path>` shows any change to it (another session is working in that lesson). Otherwise commit that file alone: `git commit -m "<message>" -- <path>`. A helper agent (one another session started) edits nothing here: it names each correction in its report to the session that started it.
7. **Write the brief** in the format below. Distill each lesson; never paste insight text.

## Output

```
## Brief: <topic>
Searched: <tags, terms, paths used> · <N> insights · <M> candidates · <big | small> job · read in full: NNN, NNN · <anything left unread, or "every page read">
### Landmines
- **NNN: <short title>** (<date>). <The gotcha, one line.> Root cause: <one line>. Watch for: <one line>. Code check: CURRENT | MOVED to <where> | CONFLICTS: <what> | NO CODE CLAIM. Lesson (MOVED and CONFLICTS only): corrected | reported to caller | not corrected: <why>
### Also relevant (not read in full)
- NNN: <title>. <Why it may matter.>
### Before you start
- <1 to 3 concrete actions the landmines imply>
```

Show at most 10 landmines for a big job and 5 for a small one, and at most 10 also-relevant lines. When nothing matches, say so, list what was searched, and note that the work may be worth a /distill once it lands.
