# The applies_when line

A lesson's frontmatter carries one `applies_when` line, after the last line of its `tags:` entry (as the last frontmatter line if it has no `tags:`). Before a job starts, /brief reads each lesson's line and judges it by meaning against the job's description. A job is described by what it builds or changes ("add the reconnect banner", "move the export to a worker"), while a lesson is written about how something broke. The line connects the two: it names the work during which this lesson's trap is ahead, in the words a job would use.

Write it from the lesson's text alone. Its `modules:` line, its Also Applies To section, and the part of its Problem that says what was being built or changed name the work; a `modules:` entry that is the fix itself (the file the fix added) is not a way in. The rest of the Problem is the failure, and the Key Insight is the conclusion: the line states neither, apart from the one symptom the bar allows.

## The shape

```yaml
applies_when: [adding a server-side timer or delayed action, debouncing or rate-limiting a server action]
```

- One line: `applies_when: [`, then 2 to 4 situations, each followed by a comma and one space except the last, then `]`, with no space after `[` or before `]`. The whole line, from `applies_when:` to `]`, is at most 160 characters. Count it with a tool when you have one; without one, keep it near 140. It is checked by machine.
- The line is a YAML list, so each situation starts with a lowercase letter, its words are separated by single spaces, and it never contains a comma, square bracket, curly brace, colon, question mark, `#`, double quote or tab. An apostrophe is fine inside a situation ("a rule's input"), never as its first or last character.

## The bar

- **Name the work, not the failure.** Start each situation with the -ing form of the verb for what the work does: adding, changing, moving, spawning, reading, generating, testing, and so on. A situation may name a kind of work the fix belongs to ("adding a validation check") only when a job would name that work before it knew this lesson existed, and never the mechanism the Key Insight recommends.
- **Say what part of the product it is.** When a lesson has this line, /brief's meaning pass sees the line in place of the title, so don't count on the title or `modules:` being seen: take the area from them and say it in the line. At least one situation names the feature, folder or area in the words the lesson itself uses ("the Nope window", "the playtest agents"); never add a name the lesson doesn't contain.
- **Cover the different jobs that would walk into it.** Two to four situations, each a different way in; never one situation reworded. If the lesson shows only one way in, the second is the symptom when one qualifies; otherwise it names the feature or file that work touches ("changing the Nope window countdown" beside "adding a server-side timer"), which counts as a way in of its own, because a job that names the feature arrives there.
- **Keep, in this order, and drop from the bottom when over the cap:** (1) the work the lesson's own story was doing; (2) other ways into its main trap, or for a one-way-in lesson its feature-or-file situation; (3) its Also Applies To items, the widest that is still specific enough to rank first; (4) the symptom. Before dropping any, cut qualifiers, but never the words that name the area. The line lists them in the same order, so a symptom comes last.
- **A symptom is allowed in one situation, only when a debugging job would arrive through it.** Write it as the debugging work: "chasing" or "debugging", then the symptom as that job would see it ("chasing a server that hangs after a few requests"), never the cause.
- **Never the lesson's conclusion, its fix, a lesson number, the label of a piece of past work (the name or number of a phase, unit or session in the plan that produced the lesson), or a date.** A later job never uses those words. A version or standard a job would name ("UTF-8", "Node 24") is fine, and so is "phase" as a plain word or a stage the product itself has; when you can't tell which it is, leave it out.
- **Specific enough to rank.** A situation true of almost every job ("writing code", "working on the server") ranks nothing.

## Extending a lesson

When a lesson is extended with a new case, rewrite its line from the whole extended text by these rules: keep each old situation that still holds, and add the new case's way in when it brings one. Over 4 situations or 160 characters, apply the keep order above. A lesson with no line gets one.

## Examples

Good:

```yaml
applies_when: [adding a server-side timer or delayed action, letting a second Nope restart the countdown, debouncing or rate-limiting a server action]
applies_when: [spawning a child process from a Node script, starting a dev server from a test harness, chasing a server that hangs after a few requests]
applies_when: [adding a fallback value for missing data, generating code or a manifest from an audit file, joining two data sets by a shared id]
```

Bad:

```yaml
applies_when: [timers firing on superseded state, needs a generation counter]
applies_when: [working on the server, writing code]
applies_when: [the harness calibration phase, the generation-counter fix]
```

The first states the failure and the fix, so a job that names its feature shares nothing with it. The second fits every job and ranks none. The third names a phase and a fix by the labels they had while the work ran, words no later job uses; a lesson number or a date fails the same way.

## Check before you save

1. One line, starting `applies_when: [` and ending `]`, 160 characters or fewer, situations separated by a comma and one space, no space after `[` or before `]`.
2. 2 to 4 situations. Each starts with a lowercase letter and has no comma, square bracket, curly brace, colon, question mark, `#`, double quote or tab in it, and none starts or ends with an apostrophe.
3. Each situation starts with the -ing verb for the work and names something specific, not one true of almost every job; each is a different way in (a one-way-in lesson's feature-or-file situation counts as one); at least one names the area in the lesson's own words; at most one is a symptom, and it comes last.
4. No situation holds the lesson's conclusion or specific fix, a lesson number, the label of a phase, unit or session, or a date.
