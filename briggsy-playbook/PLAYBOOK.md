# Briggsy's Playbook — How to work with Claude

Started 2026-04-10 after the BURNED product specification session made clear that collaboration patterns should persist across sessions. This playbook captures what I've learned about working effectively with Claude Code so I don't have to rediscover it every time.

Claude has its own memory at `C:/Users/brigg/.claude/projects/C--Users-brigg-ai-learning-journey/memory/` — that's what *Claude* remembers about me. This playbook is the mirror: what *I've* learned about Claude, kept human-readable for scanning when I need to remember something fast.

## Files

- **[quick-reference.md](quick-reference.md)** — 1-page cheat sheet for common scenarios. Start here when you need a fast answer.
- **[workflows.md](workflows.md)** — patterns proven to produce great results: quality bar first, debate-pushback, spec → plan → code transitive enforcement, sub-agent delegation, etc.
- **[claude-strengths.md](claude-strengths.md)** — what to reliably lean on Claude for.
- **[claude-watch-outs.md](claude-watch-outs.md)** — Claude's known failure modes. Catch them before they propagate.
- **[session-hygiene.md](session-hygiene.md)** — session-management protocols: screenshots → `temp/`, TODO updates, squeaky-clean, distill, brief, memory location, context window management.
- **[commands-and-skills.md](commands-and-skills.md)** — inventory of slash commands and skills available in Claude Code.
- **[tools-and-integrations.md](tools-and-integrations.md)** — MCP servers, hooks, external tools (Context7, gemini-grounding, sequential-thinking, Playwright).
- **[lessons-learned.md](lessons-learned.md)** — dated incidents with specific lessons. Don't repeat these.

## How to use this playbook

- **When you need a fast answer to "how do I X?"** → start in `quick-reference.md`
- **When you're starting a new project** → read `workflows.md` on Quality Bar First + Spec → Plan → Code
- **When Claude is acting weird** → check `claude-watch-outs.md` for the failure mode
- **When you want to know what commands exist** → `commands-and-skills.md`
- **When a session is wrapping up** → `session-hygiene.md` for the protocols
- **When you want to remember why we do something a certain way** → `lessons-learned.md` has the dated incidents

## Meta

- **You own this.** Claude can draft entries and propose additions, but this is your playbook. Edit freely.
- **Updates happen during sessions.** When Claude notices something worth adding, Claude should say *"hey, should we add this to the playbook?"* — if you agree, Claude edits the right file.
- **Mirrors Claude's memory structure.** Claude's memory has types (user, feedback, project, reference). This playbook is similar but simpler: categories by purpose, no frontmatter, no strict conventions. It's for you, not for Claude.
- **Seed content was drafted during the BURNED spec session (2026-04-10).** Additions accumulate as more collaboration happens.
