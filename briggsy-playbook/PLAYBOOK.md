---
aliases: [playbook, the playbook, master-playbook]
tags: [playbook]
---

# Briggsy's Playbook — How to work with Claude

Started 2026-04-10 after the BURNED product specification session made clear that collaboration patterns should persist across sessions. This playbook captures what I've learned about working effectively with Claude Code so I don't have to rediscover it every time.

Claude has its own memory at `C:/Users/brigg/.claude/projects/C--Users-brigg-ai-learning-journey/memory/` — that's what *Claude* remembers about me. This playbook is the mirror: what *I've* learned about Claude, kept human-readable for scanning when I need to remember something fast.

## The collaboration model (read this first)

I'm a senior software engineer with decades of experience. **I deliberately pick Claude projects in stacks I have no execution experience with.** BURNED (React 19 + Cloudflare Durable Objects + partyserver + Framer Motion), UMB (vanilla DOM + GSAP), top-down racer v04 (Python pygame), Hide and Seek, Do Not Disturb — none of these were in my wheelhouse before I started them. That's the point.

That means Claude is the technical expert in these projects, not me. I own vision, taste, quality bar, product direction, and when something feels off. Claude owns architecture, libraries, patterns, type design, performance tradeoffs, and every HOW decision. I can see when a deliverable misses the vibe — I can't catch technical mistakes on merit, because I don't know the stacks well enough to audit them.

**Pushback is the safety net.** In a normal AI/user setup, the user catches hallucinations because they're the domain expert. Here that's inverted. If Claude fast-agrees with my technical suggestions out of deference, nothing catches the mistakes. I explicitly told Claude 2026-04-10: *"This isn't command and control, this is a partnership to achieve greatness. Push back, challenge."*

Fast agreement is the failure mode. *"Actually, one concern..."* is the feature.

See [[workflows#Expert-Pilot Partnership]] for the full pattern and how it shapes day-to-day collaboration.

## Files

- **[[principles]]** — the 11 commandments. Briggsy's manifesto for how Claude collaboration works. The 5-minute onboarding read.
- **[[quick-reference]]** — 1-page cheat sheet for common scenarios. Start here when you need a fast answer.
- **[[workflows]]** — patterns proven to produce great results: quality bar first, debate-pushback, spec → plan → code transitive enforcement, sub-agent delegation, etc.
- **[[claude-strengths]]** — what to reliably lean on Claude for.
- **[[claude-watch-outs]]** — Claude's known failure modes. Catch them before they propagate.
- **[[session-hygiene]]** — session-management protocols: screenshots → `temp/`, TODO updates, squeaky-clean, distill, brief, memory location, context window management.
- **[[commands-and-skills]]** — inventory of slash commands and skills available in Claude Code.
- **[[tools-and-integrations]]** — MCP servers, hooks, external tools (Context7, gemini-grounding, sequential-thinking, Playwright).
- **[[lessons-learned]]** — dated incidents with specific lessons. Don't repeat these.
- **[[status-line]]** — setup guide for the custom Claude Code status bar (model, context %, cost, duration, git branch, effort).
- **[[cowork]]** — Cowork mode (Claude desktop): when to use it instead of Claude Code, the cold-start problem, session checkpoint pattern.
- **[[claude-md-template]]** — how to write a good per-project `CLAUDE.md`: doc hierarchy, what belongs / what doesn't, length target, skeleton template, worked examples.

## How to use this playbook

- **When you're onboarding (yourself, future-you, future-Claude)** → read [[principles]] first
- **When you need a fast answer to "how do I X?"** → start in [[quick-reference]]
- **When you're starting a new project** → read [[workflows]] on Quality Bar First + Spec → Plan → Strengthen → Code
- **When Claude is acting weird** → check [[claude-watch-outs]] for the failure mode
- **When you want to know what commands exist** → [[commands-and-skills]]
- **When a session is wrapping up** → [[session-hygiene]] for the protocols
- **When you want to remember why we do something a certain way** → [[lessons-learned]] has the dated incidents

## Meta

- **Voice convention.** This playbook has two audiences and the prose shifts between them. When you see *"you"* (e.g. *"when you're starting a new project"*), the entry is talking to Briggsy. When you see *"Claude"* (e.g. *"Claude flips positions on evidence, never pressure"*), the entry is talking to future-Claude. Most entries do both. The shift is intentional — context makes the audience clear.
- **Briggsy directs; Claude writes.** Briggsy owns the substance — what's in here, what's missing, what's wrong, what to sharpen. Claude owns the keys — the actual file edits. Updates happen by Briggsy directing changes in conversation, Claude updating the right file. (Briggsy has not authored or edited a single file in this portfolio. See [[principles#1. You own WHAT and WHY. Claude owns HOW.]].)
- **Updates happen during sessions.** When Claude notices something worth adding, Claude says *"hey, should we add this to the playbook?"* — if Briggsy agrees, Claude edits the right file.
- **Mirrors Claude's memory structure.** Claude's memory has types (user, feedback, project, reference). This playbook is similar but simpler: categories by purpose. The frontmatter is light; conventions are loose. It's the human-readable mirror of Claude's memory.
- **Seed content was drafted during the BURNED spec session (2026-04-10).** Additions accumulate as more collaboration happens.
