# Quick Reference — 1-page Claude Code cheat sheet

Common scenarios, fast answers. When something's not here, check the other files.

## Starting a new project
- Run `/product-specification` (when built — currently pending) before any CE workflow
- OR manually: ask Claude to author a product spec, starting with the quality bar
- Use the 4-question quality bar elicitation (see `workflows.md`)

## Session is getting long (~70% context)
- Say *"write the TODO"* to update `TODO.md`
- Optionally *"squeaky clean"* to commit everything
- Start a new terminal in the same directory

## Claude is being wrong about something
- Push back explicitly. Don't just say "no" — say "here's why you're wrong" with evidence
- Claude will usually flip if the evidence is good
- If Claude fast-agrees without new evidence, push again

## Claude got too ambitious / scope-creeped
- "Stop, just do X" — Claude responds well to hard scope clamps
- "Only change these lines" is better than "don't change too much"
- See `claude-watch-outs.md` → "Will expand scope unless explicitly clamped"

## Need to share a screenshot
- Drop the screenshot in the project's `temp/` folder
- Say *"look at this"* or *"check the screenshot"*
- Claude reads the most recent image from `temp/` automatically
- Never paste a path

## Want to preserve a technical insight
- Say *"capture this"* or *"distill this"* — triggers the `/distill` skill
- Claude writes `docs/insights/NNN-<slug>.md` with the full context
- Future sessions will load it via `/brief`

## Starting work on a subsystem I haven't touched in a while
- Run `/brief` to load past insights from `docs/insights/`
- Or ask *"brief me on X"* — Claude surfaces relevant memory

## Claude used a word I don't recognize
- Ask for a quick gloss. Don't avoid the word; understand it.
- Claude should add an inline explanation when using a word you might not know
- If Claude doesn't, ask: *"what does X mean in this context?"*

## Ending the session
- *"write the TODO"* — updates `TODO.md`
- *"squeaky clean"* — commits, typechecks, cleans `temp/`, pushes
- OR just stop — no auto-commit, you can come back later

## Claude pattern-matches a reference you don't recognize
- Ask: *"where did that come from?"* or *"did I say that?"*
- If Claude invented it, PURGE before it calcifies across files
- See `lessons-learned.md` → "Saul Bass incident"

## Debugging something multi-step
- Say *"use sequential thinking"* — invokes the sequential-thinking MCP tool
- Claude walks through causation layer by layer
- Critical for bugs with more than 2 layers of causation

## Running research across many files
- Ask Claude to "use a subagent" or "delegate this to Explore"
- Subagents have their own context windows — don't bloat the main thread
- Can run in background — ask for `run_in_background`

## Asking Claude to build something
- Be specific about scope: files, constraints, what NOT to change
- Say "minimal scope" explicitly if you want surgical changes
- Trust Claude's suggestions for structure, question Claude's suggestions for extra features

## Common signals Claude should understand
- *"squeaky clean"* → `/squeaky-clean` skill
- *"write the TODO"* → update `TODO.md`
- *"capture this"* / *"distill this"* → `/distill` skill
- *"brief me"* → `/brief` skill
- *"in parallel"* → use parallel tool calls, not serial
- *"make a note"* → save to Claude memory immediately
- *"look at this"* → read most recent image from `temp/`
- *"fuck yeah"* → celebrate, match energy
