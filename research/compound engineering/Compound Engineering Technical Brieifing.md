# Compound Engineering: A Technical Briefing

## 1. Executive summary

**Compound Engineering is a development methodology built on one premise: every unit of engineering work should make the next unit easier, not harder.** Published by Kieran Klaassen (GM of Cora at Every.to) and formalized in a comprehensive guide and open-source Claude Code plugin (~9,500 GitHub stars as of March 2026), it proposes a four-step loop — Plan → Work → Review → Compound — where the fourth step captures reusable knowledge back into your tooling, creating a self-improving development system rather than a codebase that calcifies over time.

**TL;DR — the core ideas:**

- The **Plan → Work → Review → Compound** loop replaces the traditional code-review-merge cycle. The "Compound" step — capturing learnings into persistent system configuration — is the differentiator that most teams skip.
- **Planning and review consume 80% of developer time**; actual code generation and compounding take 20%. The developer's job shifts from writing code to directing agents and encoding taste into systems.
- A **5-stage adoption ladder** (Stage 0: manual → Stage 5: parallel cloud agents) gives teams a concrete progression path, with Stage 3 ("trust the plan") identified as the critical inflection point.
- **8 beliefs to unlearn** — including "every line must be manually reviewed" and "code is self-expression" — paired with new mental models around system-building and safety nets.
- An **open-source plugin** provides 29 specialized agents, 23 commands, and 19 skills that implement the methodology inside Claude Code (with converters for Cursor, Codex, Copilot, and 10+ other tools).
- The **50/50 rule**: spend half your time on features, half on improving the system that builds features. Traditional teams run 90/10.
- **Agent-native architecture** means giving AI the same environmental access developers have — tests, logs, git, PRs, error tracking — progressively expanding trust.

**Why it matters now:** The gap between developers who use AI as autocomplete and those who orchestrate multi-agent workflows is widening fast. Compound engineering is the most complete, publicly available methodology for crossing that gap systematically. Will Larson (CTO of Imprint, author of *Staff Engineer*) called it "not shocking but extremely effective" — excellent packaging of mostly-known practices with one genuinely novel innovation. Whether you adopt the plugin or just the philosophy, the compound step addresses a real blind spot in how most teams use AI today.

---

## 2. The core philosophy

### Compounding as structural advantage

The metaphor is borrowed from finance. In a typical codebase, complexity compounds *against* you — each feature adds friction, each workaround adds debt, and after a decade teams spend more time fighting the system than building on it. Klaassen inverts this: **"Instead of features adding complexity and fragility, they teach the system new capabilities. Bug fixes eliminate entire categories of future bugs. Patterns become tools for future work."**

This is more than documentation. The system literally changes — `CLAUDE.md` files get updated with new conventions, custom review agents get created for recurring issues, and `docs/solutions/` accumulates searchable knowledge with YAML frontmatter that agents reference in future planning cycles. The codebase doesn't just have knowledge; it *applies* knowledge automatically.

### How it diverges from both traditional dev and typical AI-assisted dev

Traditional development: human writes code → human reviews → ship. Knowledge lives in developers' heads. AI-assisted development (as most practice it): human prompts AI → AI generates code → human reviews every line → ship. Faster typing, same bottlenecks.

Compound engineering breaks both patterns. **The developer stops being the typist and becomes the architect of a system that types for them.** Planning becomes the primary artifact. Review happens via specialized agents, not manual line-scanning. And crucially, the "compound" step — absent from both traditional and typical AI workflows — ensures each cycle improves the system itself. As Klaassen puts it: **"A system that produces code is more valuable than any individual piece of code."**

### The mindset shift in practice

The uncomfortable truth compound engineering forces you to confront: your value as a developer is no longer in the code you type. It's in the taste you encode, the plans you write, the review standards you set, and the learnings you capture. The guide is blunt about this — "Effective compound engineers write less code than before and ship more." For developers whose identity is tied to craft-level coding, this is a genuine psychological hurdle, not just a process change.

---

## 3. The main loop: Plan → Work → Review → Compound

### Plan (where 80% of thinking happens)

Planning transforms an idea into a detailed blueprint before any code is generated. The plugin's `/ce:plan` command spawns **three parallel research agents** — one analyzes repo patterns, one fetches framework documentation, one researches best practices — then a spec-flow-analyzer identifies edge cases. The output: a structured plan document with affected files, implementation steps, and success criteria.

**This is where compound engineering overlaps with spec-driven development**, and it's not accidental. Klaassen argues plans are now the primary artifact: **"Fixing ideas on paper is cheaper than fixing code later."** The "ultrathink" mode (`/deepen-plan`) goes further, spawning **40+ parallel research agents** to stress-test every section.

### Work (the agent executes, the developer monitors)

With a trusted plan, execution is delegation. The agent sets up a git worktree, implements step by step, runs validations continuously. The developer's role: monitor progress, intervene when something breaks, but **not** watch every line. **"If you trust the plan, there's no need to watch every line of code."** The `/ce:work` command handles branch setup, progress tracking, optional quality checks, and PR creation.

### Review (multi-agent, not human line-scanning)

The `/ce:review` command spawns **14+ specialized agents in parallel**: `security-sentinel` (OWASP top 10), `performance-oracle` (N+1 queries, missing indexes), `architecture-strategist` (component boundaries), `data-integrity-guardian` (migration safety), language-specific reviewers for Rails/Python/TypeScript, and even a `dhh-rails-reviewer` enforcing 37signals conventions. Findings are prioritized P1/P2/P3. The human reviews the *review*, not the code.

Even without the plugin, the guide offers a lightweight version — three questions to ask any AI before approving output: *"What was the hardest decision you made here?"* / *"What alternatives did you reject, and why?"* / *"What are you least confident about?"* These force the model to surface its own uncertainty.

### Compound (the step everyone skips — and the only genuinely novel one)

**This is the real contribution.** Traditional development stops at review. Compound engineering asks: what did we learn, and how do we bake it into the system so we never re-learn it? The `/ce:compound` command spawns six parallel subagents that extract reusable solutions, classify them by category, add YAML frontmatter for retrieval, and update `CLAUDE.md` with new patterns.

Will Larson's assessment is instructive here: he called Plan, Work, and Review "extremely well-known patterns" but identified Compound as **"one pattern that I think many practitioners have intuited but have not found a consistent mechanism to implement."** The plugin provides that mechanism. Each solution document feeds back into future `/ce:plan` and `/ce:review` cycles via the `learnings-researcher` agent, creating the actual compounding loop.

### Time allocation

At the feature level: **80% planning and review, 20% working and compounding.** At the broader responsibility level: **50% building features, 50% improving the system** (the 50/50 rule). This is a radical departure from traditional teams that run 90/10 on features vs. everything else.

---

## 4. The 5-stage adoption ladder

The ladder provides a concrete progression from manual coding to parallel multi-agent orchestration. Each stage builds mental models required for the next — skipping stages reliably produces distrust and regression.

**Stage 0 — Manual development.** No AI. The baseline. "Manual development built great software for decades, but sadly it's not fast enough in 2025."

**Stage 1 — Chat-based assistance.** AI as reference tool. Copy-paste useful snippets. You review every line and remain fully in control. *Compounding move:* Keep a running note of prompts that worked.

**Stage 2 — Agentic tools with line-by-line review.** Claude Code, Cursor Composer, or Copilot Chat making direct file changes. You approve or reject everything. **This is where most developers plateau.** The guide is explicit: "Most developers plateau here and don't get to enjoy the upside of handing more over to AI." The bottleneck is psychological — developers can't let go of line-level control.

**Stage 3 — Plan-first, PR-only review.** *"This is the stage where everything changes."* You co-create a detailed plan, then step away and let the agent implement without supervision. You review the PR, not the process. Compound engineering begins here. *Compounding move:* After each implementation, document what the plan missed.

**Stage 4 — Idea to PR.** You provide an outcome ("Add email notifications for new comments"), the agent handles everything from research through PR creation. Your involvement: ideation, plan approval, PR review, merge.

**Stage 5 — Parallel cloud execution.** Multiple agents working simultaneously on different features. **"You kick off three features, three agents work independently, and you review PRs as they finish."** The `/lfg` command implements this, chaining the full pipeline and spawning 50+ agents across all stages.

### Where teams get stuck

The **Stage 2 → Stage 3 transition** is the critical gap. It requires trusting a plan enough to walk away from the implementation. The guide's advice: invest heavily in planning quality, make plans explicit and reviewable, and start with low-risk features to build trust incrementally. The compounding move at each stage is designed to build exactly the system confidence needed for the next level.

---

## 5. The plugin and tooling

### What ships in the box

The compound-engineering plugin (v2.35+) includes **29 specialized agents** organized across review, research, design, workflow, and docs categories; **23 slash commands** covering the core loop plus utilities; **19 skills** providing domain expertise; and integration with the Context7 MCP server for framework documentation lookup.

### Installation

For Claude Code (primary, zero configuration):
```
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering
```

Cross-platform via CLI converter (supports OpenCode, Codex, Factory Droid, Gemini CLI, Copilot, Kiro, Windsurf, Cursor, and others):
```
bunx @every-env/compound-plugin install compound-engineering --to [target]
```

### Key commands

**`/ce:plan`** — Parallel research agents analyze codebase, framework docs, and best practices, then produce a structured plan. `/deepen-plan` enhances with 40+ sub-agents.

**`/ce:work`** — Git worktree setup, systematic implementation with progress tracking, optional quality checks, PR creation.

**`/ce:review`** — 14+ parallel review agents produce prioritized findings (P1/P2/P3). Auto-triggers conditional agents (e.g., `schema-drift-detector` on migration files). Always runs `learnings-researcher` to check past solutions.

**`/ce:compound`** — Six parallel subagents extract, classify, and document learnings with YAML frontmatter into `docs/solutions/`.

**`/lfg`** — Full autonomous pipeline: plan → deepen-plan → work → review → resolve findings → browser tests → feature video → compound. Pauses for plan approval, then runs autonomously. Spawns **50+ agents**.

**`/triage`** — Interactive finding review: approve, skip, or customize priority for each issue.

### The 14 review agents

Security (`security-sentinel`), performance (`performance-oracle`), architecture (`architecture-strategist`, `pattern-recognition-specialist`), data (`data-integrity-guardian`, `data-migration-expert`, `schema-drift-detector`), code quality (`code-simplicity-reviewer`), language-specific (`kieran-rails-reviewer`, `kieran-python-reviewer`, `kieran-typescript-reviewer`, `dhh-rails-reviewer`), frontend (`julik-frontend-races-reviewer`), deployment (`deployment-verification-agent`), and agent-native compliance (`agent-native-reviewer`). The `learnings-researcher` searches past solutions for relevant precedents.

### Where things live

```
your-project/
├── CLAUDE.md              # Agent instructions + evolving preferences
├── docs/
│   ├── brainstorms/       # /ce:brainstorm output
│   ├── solutions/         # /ce:compound output (the knowledge base)
│   └── plans/             # /ce:plan output
└── todos/                 # Triaged findings with priority and status
```

---

## 6. Agent-native architecture

Being "agent-native" means giving AI agents the same environmental access that human developers have — progressively, with appropriate guardrails. The guide provides a concrete checklist and four progressive levels:

**Level 1 (Basic):** File access, test execution, git commits. Unlocks basic compound engineering.

**Level 2 (Full local):** Browser access, local logs, PR creation. Enables Stages 3–4.

**Level 3 (Production visibility):** Read-only production logs, error tracking (Sentry), monitoring dashboards. Enables proactive debugging.

**Level 4 (Full integration):** Ticket systems, deployment capabilities, external services. Enables Stage 5 parallel operation.

The design principle: **"If a developer can see or do something, the agent should be allowed to see or do it too."** The agent-native mindset asks three questions for every decision — How will the agent interact with this? What would the agent need to see? Will the agent understand this?

Klaassen's personal setup uses `alias cc='claude --dangerously-skip-permissions'` — working on branches with tests and easy revert capability. His argument for skip-permissions: without it, you're interrupted every 30 seconds, destroying flow. With it: **"five to 10 times faster iteration."** But the guide is clear — don't use it when learning, in production, or without good rollback.

---

## 7. Beliefs to drop, beliefs to adopt

### Eight beliefs to unlearn

The guide systematically dismantles eight assumptions. Three are particularly consequential for team adoption:

**"Every line must be manually reviewed"** → Instead, fix the system. If you can't trust the output, add a review agent or test that catches the problem automatically. Compensating with manual review doesn't scale.

**"Code is the primary artifact"** → Plans and the system that produces code are more valuable. **"A system that produces code is more valuable than any individual piece of code."**

**"First attempts should be good"** → **"First attempts have a 95 percent garbage rate. Second attempts are still 50 percent. This isn't failure—it's the process."** The goal shifts from getting it right the first time to iterating fast enough that your third attempt lands in less time than a careful first attempt would.

The remaining five address code-as-self-expression ("The code was never really yours"), the typing-equals-learning fallacy ("The developer who reviews 10 AI implementations understands more patterns than the one who hand-typed two"), solution origination ("The engineer's job becomes to add taste"), hand-writing as requirement, and typing as core function.

### The replacement beliefs

The new mental model rests on eight principles: every work unit compounds; taste belongs in systems, not review; teach the system instead of doing the work yourself; build safety nets, not review processes; make environments agent-native; apply compound thinking everywhere; embrace the discomfort of letting go; ship more value, type less code.

### Real implications for team culture

The guide reshapes team dynamics. **Plan approval requires explicit sign-off** — "Silence is not approval—it's the absence of a decision." Human reviewers focus on intent, not implementation. Async communication becomes default. And critically, institutional knowledge gets externalized: **"Instead of saying, 'Ask Sarah, she knows how auth works,' Sarah runs /compound after implementing the feature."**

---

## 8. Practical best practices

**CLAUDE.md strategy:** This is "the most important file that the agent reads every session." Start sparse — add preferences as the agent makes mistakes. Include coding conventions, architecture decisions, patterns to follow and avoid. The compound step continuously enriches this file.

**The 50/50 rule:** Half your time on features, half on improving the system. An hour creating a review agent saves ten hours of review over the next year. This is the hardest sell to product-focused managers, but it's the mechanism that makes compounding real.

**Design workflow:** Use "baby apps" (throwaway prototype repos) for UX exploration. Vibe code the design, iterate until it looks right, then **delete everything and start over with a proper plan.** "The prototype is for learning only, not shipping." For designer collaboration, the `figma-design-sync` agent compares implementation against Figma mockups automatically.

**Vibe coding guidance:** The guide doesn't reject vibe coding — it positions it as a discovery tool. **"Vibe code to discover what you want, then spec to build it properly."** Use it for personal projects, prototypes, and UX exploration. Don't use it for production systems or security-sensitive applications.

**Team collaboration:** PR ownership goes to whoever initiated the work, regardless of who wrote the code. Handoffs include explicit status, remaining work, and instructions for continuation. Feature flags and small PRs keep merge conflicts manageable across parallel agent streams.

---

## 9. Critical assessment

### What's genuinely novel

The **compound step** — formalizing the practice of capturing learnings into persistent, machine-readable system configuration — is the real innovation. Many experienced developers do this informally; nobody had previously packaged it into a systematic, tooling-supported loop. The plugin's `learnings-researcher` agent, which checks past solutions during every review, closes the loop in a way that documentation alone cannot.

### What's well-packaged existing wisdom

Plan-first development is spec-driven development. Multi-agent review is automated code review with more agents. The adoption ladder is a maturity model. The "beliefs to drop" echo arguments the DevOps movement made about manual processes a decade ago. **Will Larson was right: three of the four steps are well-known patterns.** The packaging and tooling are excellent, but this isn't a paradigm invented from whole cloth.

### Gaps and risks

**Scaling is unproven.** Every runs five products with single-person engineering teams. The methodology's effectiveness with 20-person teams, legacy monoliths, and organizational politics is undocumented. The compound docs themselves could become a maintenance burden — stale or contradictory rules degrading agent performance rather than improving it.

**Claude Code coupling.** Despite multi-tool converter support, the plugin is built for Claude Code first. Teams on other toolchains get a degraded experience. Larson predicted these practices would be "absorbed into the Claude Code and Cursor harnesses" within months, potentially commoditizing the methodology.

**Commercial context.** Every.to sells subscriptions, workshops ("Compound Engineering Camps"), and consulting around this methodology. This doesn't invalidate the ideas, but the promotional incentive is real and should calibrate how you weight the claims.

**The 95% garbage rate.** Klaassen acknowledges first attempts mostly fail. For teams evaluating productivity claims, the honest math matters: you're trading manual-but-predictable output for fast-but-iterative output. The ROI depends entirely on how fast your iteration loop is.

### Who it's for (and who it's not)

**Best suited for:** Small teams (1–5 developers) building greenfield or moderately complex applications, comfortable with Claude Code, working in well-supported frameworks (Rails, Next.js, Python), and willing to invest 50% of their time in system improvement. Developers at Stage 2+ who feel stuck.

**Less suited for:** Large enterprise teams with complex approval workflows, developers deeply invested in manual craft, teams on frameworks with poor AI support, organizations that can't tolerate the 50/50 time split, and anyone who needs proven-at-scale evidence before adopting.

---

## 10. Implementation roadmap

### Week 1: Foundation

**Day 1–2:** Install the plugin. Run `/ce:review` on an existing PR to see the review agents in action — this is the lowest-risk way to experience the system. Read the full guide.

**Day 3–4:** Create your project's `CLAUDE.md`. Start minimal — project description, tech stack, key conventions. Add the `docs/solutions/` directory structure. Set up `alias cc='claude --dangerously-skip-permissions'` if you're comfortable with your test coverage and git discipline.

**Day 5–7:** Pick a small, low-risk feature. Run the full loop manually: `/ce:plan` → read and approve the plan → `/ce:work` → `/ce:review` → `/ce:compound`. The goal isn't speed; it's experiencing each step and understanding what the agents produce.

### Month 1: Build the habit

**Weeks 2–3:** Run the full loop on every feature, no matter how small. Focus on the compound step — after every PR, ask yourself: *What did I learn that the system should know?* Update `CLAUDE.md` with every new convention or mistake pattern. You should have **10–15 solution documents** in `docs/solutions/` by the end of week 3.

**Week 4:** Attempt your first `/lfg` run on a well-defined feature. Let the full pipeline execute. Review the output critically. Identify where the system's accumulated knowledge improved the result versus where gaps remain. Start using `/ce:brainstorm` for fuzzy requirements before planning. Target: consistently operating at **Stage 3** (plan-first, PR-only review).

### Month 3: Compound effects become visible

**Goal:** Operating at Stage 4 (idea to PR) for routine work. Your `CLAUDE.md` should be rich with project-specific conventions. The `docs/solutions/` directory should contain **50+ categorized learnings** that agents reference automatically. You should notice plans improving — fewer misses, better edge case coverage — because the system is drawing on accumulated knowledge.

**Key milestones:** Create at least one custom review agent for a recurring issue specific to your project. Experiment with parallel execution (multiple worktrees, multiple features in flight). Evaluate the 50/50 split honestly — track how much time you spend on system improvement versus features, and whether the investment is paying off in cycle time.

**Ongoing habit:** After every meaningful PR, run `/ce:compound`. This is the one non-negotiable. Skip it, and you're just doing AI-assisted development with extra steps. Do it consistently, and you're building something that gets measurably better each week.

### Files to create

- `CLAUDE.md` — Agent instructions and evolving project conventions
- `docs/solutions/` — Compound knowledge base (auto-populated by `/ce:compound`)
- `docs/plans/` — Plan documents (auto-populated by `/ce:plan`)
- `docs/brainstorms/` — Discovery documents (auto-populated by `/ce:brainstorm`)
- `todos/` — Triaged findings with priority and status
- `compound-engineering.local.md` — Review configuration (auto-generated on first `/ce:review`)

---

## Conclusion

Compound engineering's lasting contribution isn't the loop or the plugin — it's the question it forces you to ask after every piece of work: **did I just solve a problem, or did I teach the system to solve this category of problem?** That question, applied consistently, produces genuine compounding regardless of which tools you use.

The methodology is neither revolutionary nor hype. It's a well-structured, practically tooled codification of what the best AI-native developers were already doing intuitively, with one genuinely novel mechanism (the compound step) that most teams lack. The plugin makes it frictionless to start. The philosophy makes it valuable even without the plugin. And the adoption ladder gives you a realistic map of where you are and where to go next.

The honest risk: this requires discipline that most teams won't sustain. The 50/50 split is hard to defend in sprint planning. The compound step is easy to skip when you're shipping under pressure. And the accumulated knowledge base needs curation or it becomes its own form of debt. But for teams willing to make the investment, the math is straightforward — each hour spent on the system saves multiples downstream, and unlike most productivity claims in AI tooling, this one has a concrete mechanism to explain why.