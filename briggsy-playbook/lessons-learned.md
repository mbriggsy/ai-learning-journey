# Lessons learned — dated incidents with specific lessons

Things we figured out the hard way. Each entry: date, incident, lesson. Newest at top.

---

## 2026-04-10 — The Saul Bass incident (hallucinated reference calcified across 13 files)

**Incident:** During a prior BURNED session on 2026-04-05, Claude dropped the phrase *"Mid-century modern. Saul Bass meets spy title sequences."* into `docs/ideation/2026-04-05-burned-brainstorm.md` as BURNED's visual reference. I didn't know who Saul Bass was, didn't flag it, and assumed Claude knew what it was talking about. Over 5 days, the phrase propagated across **13 files**:

- `MEMORY.md` (persistent memory)
- `project-burned-creative-direction.md` (memory)
- `feedback-vibes-are-not-specs.md` (memory)
- `projects/burned/README.md`
- `projects/burned/docs/VISUAL-LAYER-AUTOPSY.md`
- `projects/burned/docs/brainstorms/2026-04-08-art-direction-brainstorm.md`
- `projects/burned/.claude/skills/gauntlet/references/calibration.md`
- 5 image generation scripts in `projects/burned/scripts/`

**Saving grace:** Saul Bass's aesthetic happens to overlap with Archer's visual language (Archer borrows heavily from Bass). The generated card art was accidentally on-target because of this overlap. The UI chrome, which didn't benefit from the accidental overlap, was the broken part.

**Fix (in BURNED spec session 2026-04-10):** Purged all 13 files. Replaced with *"Archer the TV show, literally"* — my actual vocabulary.

**Lessons:**
1. **When Claude uses a specific reference (person, methodology, studio) that you don't recognize, STOP and verify.** "I don't know what that means" is a flag, not a throwaway comment.
2. **Hallucinations calcify fast.** 5 days from brainstorm to 13 files. The longer you wait, the harder the purge.
3. **Accidental overlap can hide errors.** The art being "good" wasn't evidence that the reference was right.
4. **Narrative proximity to a reference template makes this worse.** Claude's brainstorm docs use reference templates and can pull in specific claims from them.

**Memorialized in:** `feedback-hallucinated-references.md` in Claude's memory.

---

## 2026-04-10 — The Visual Architecture debate flip (position-flip after evidence)

**Incident:** During the BURNED spec authoring session, I asked Claude to author a `§Visual Architecture` section. Claude's instinct was *"Visual Architecture belongs in the spec because it needs to be loaded every session as contract."*

I pushed back: *"If we instruct agents to use the spec to write/harden each phase, doesn't that work? Keeps a good separation of what vs. how with some insurance the spec is continuously reinforced?"*

Claude initially held the position. I pushed on the UMB precedent — UMB's Phase 4 plan had the full token system, not the spec. Claude investigated, read `projects/undercover-mob-boss/docs/v1/plans/2026-03-16-005-feat-phase-4-host-table-view-plan.md`, and found that line 17 of that plan said *"The SPEC goal is 'indistinguishable from a polished commercial party game' — this phase carries that burden."* The plan generator had picked up the quality bar directly from UMB's spec and derived the entire token system from it. Phase 5 (audio polish) did the same.

**Claude flipped.** The final design: Visual Architecture belongs in phase plans, not the spec. The spec has the quality bar + form factors; the plan generator derives architecture from those; implementation produces self-documenting code; future sessions grep the code and follow patterns.

**Lessons:**
1. **Debate, don't agree fast.** The final design was cleaner because of the friction.
2. **Evidence flips positions. Authority doesn't.** My devil's advocate was effective because I pointed at UMB's actual Phase 4 plan, not because I "outranked" Claude.
3. **Transitive enforcement is real.** Spec → plan → code produces contract-grade constraints without bloating the spec.
4. **Specless projects fail.** BURNED, H&S, DND all lacked specs. Three visual failures in a row. The pattern is clear.

**Memorialized in:** `feedback-transitive-contract-pattern.md`, `feedback-vibes-are-not-specs.md`, `docs/insights/009-product-specification-authoring.md` in BURNED.

---

## 2026-04-10 — Cloudflare confusion: UMB's "Vercel" stack was actually Cloudflare underneath

**Incident:** Reviewing BURNED's spec, I asked: *"When did we decide on Cloudflare? Why not Vercel like we use for racer02 and 04 and UMB?"* I thought UMB was on Vercel. It wasn't — or rather, only the CLIENT was on Vercel. UMB's SERVER was **PartyKit**, and PartyKit is a developer-experience wrapper around **Cloudflare Workers + Durable Objects**. UMB had been running on the same Cloudflare infrastructure all along — just hidden behind the PartyKit brand.

**Claude's investigation:**
- Confirmed BURNED uses `partyserver` (the library PartyKit became after rebrand) + `wrangler` + `@cloudflare/workers-types`
- Confirmed the `wrangler.jsonc` at BURNED's root
- Verified UMB's `package.json` and CLAUDE.md referenced PartyKit + Vercel for client
- Explained that Vercel Functions are STATELESS and can't host BURNED's per-room game state
- Showed that Durable Objects are the native primitive for stateful per-room WebSocket servers

**Decision:** Stay with Cloudflare for both client (Pages) and server (Workers + Durable Objects). Matches UMB's underlying infrastructure, just without the PartyKit middleman layer.

**Lessons:**
1. **"We use Vercel for everything"** hid a deeper truth: UMB's server was never on Vercel. It was on PartyKit, which runs on Cloudflare. The Vercel deployment was for the static client only.
2. **When picking platforms, look at what the platform actually runs.** PartyKit's branding obscured the Cloudflare substrate.
3. **Capture reasoning in ADRs.** BURNED's spec now has a full ADR with alternatives-rejected so this question doesn't get re-opened in a future session.

**Memorialized in:** ADR-01 in BURNED's `PRODUCT-SPECIFICATION.md`.

---

## 2026-04-10 — "Maximum Overdrive" footer copied from UMB's spec by reflex

**Incident:** While using UMB's `SPEC.md` as a structural template for BURNED's product specification, Claude copied the footer line *"Built with Maximum Overdrive. SDLC is the product."* into BURNED's spec. I noticed and asked *"What is Maximum Overdrive? Why is this here?"* Claude traced the origin: it was in UMB's spec as a footer. **UMB was NOT built with Maximum Overdrive either** — the footer was a latent bug in UMB's spec that Claude replicated without verification.

**Fix:** Removed the footer from BURNED. No action taken on UMB per my call (it's not actively harming anything).

**Lessons:**
1. **Reference templates aren't gold.** Even UMB's spec, which I've treated as the gold standard, has at least one factual error.
2. **Copy structure only; never copy specific claims.** This is the same lesson as the Saul Bass incident, in a different register.
3. **When copying from a template, audit the specific facts.** Claims, names, methodologies, dates — verify each one in the new context.

**Memorialized in:** `feedback-hallucinated-references.md` in Claude's memory.

---

## 2026-04-10 — Claude over-corrected on vocabulary ("touchstone")

**Incident:** I mentioned I didn't recognize the word "touchstone" when Claude used it. Claude immediately said *"I'll stop using words like that."* That's the wrong correction — I don't want dumbed-down vocabulary; I want the right word with a quick explanation when I don't know it.

**My correction:** *"Just because I don't know a word, doesn't mean we shouldn't use it. If that's the right word, then just give me a quick explanation of what it is and I can always google it if I need more, but please don't dumb your vocab for me."*

**Lessons:**
1. **Feedback is usually specific, not categorical.** "Don't use this specific word without explaining it" is not "don't use any advanced vocabulary ever."
2. **Claude's default is to please.** This can lead to over-correction that makes the collaboration worse.
3. **Catch over-corrections early.** If Claude's next response is visibly sanitized beyond what you asked, call it out.

**Memorialized in:** `user_communication_style.md` in Claude's memory, under "Vocabulary — DO NOT dumb it down (locked 2026-04-10)".

---

## (Earlier lessons from Claude's memory — incorporated by reference)

These lessons live in `C:/Users/brigg/.claude/projects/C--Users-brigg-ai-learning-journey/memory/` as feedback-* files. Rather than duplicate here, just know the pattern: when Claude has a failure mode that repeats, it gets written down as a feedback entry with date, reason, and how-to-apply.

Topics covered by existing memory:
- `feedback-water-beads-polish.md` — the quality bar standard
- `feedback-wow-over-simplicity.md` — visual richness is the deliverable
- `feedback-stats-single-source.md` — stats live in 9+ places; updating means ALL surfaces
- `feedback-webfetch-timeout-hook.md` — WebFetch has no timeout
- `feedback-serena-killed.md` — Serena removed after 10 sessions of non-use
- `feedback-mcp-server-install.md` — MCP install gotchas on Windows
- `feedback-stop-thrashing.md` — one fix, test it, move on
- `feedback-stop-layout-thrashing.md` — THINK before CSS changes
- `feedback-imagen-budget.md` — one test image first, align on style, THEN batch
- `feedback-todo-is-not-a-diary.md` — TODO is forward-looking, git log has history
- `feedback-visual-work-one-change-at-a-time.md` — iterate one change at a time
- `feedback-no-execute-until-plans-complete.md` — deepen all plans before coding
- `feedback-wait-for-all-agents.md` — never synthesize before all agents report
- `feedback-proven-not-believed.md` — never present beliefs as facts
- `feedback-plans-are-menus-not-orders.md` — plan existing ≠ build order
- `feedback-css-tokens-before-components.md` — build token system FIRST
- `feedback-primary-source-wins.md` — read the actual doc before trusting web research
- `feedback-dont-offer-empty-options.md` — don't ask "want to tweak?" when nothing's broken
- `feedback-debate-pushback.md` — engage in design debates
- `feedback-sequential-thinking-always.md` — always sequential-think after multi-agent research

Browse the memory folder when you want to understand a specific behavior pattern. Every one of those files has a real incident behind it.
