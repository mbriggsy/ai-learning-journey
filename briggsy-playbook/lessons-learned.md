---
aliases: [lessons, lessons-learned, mistakes, incidents]
tags: [playbook]
---

# Lessons learned — dated incidents with specific lessons

Things we figured out the hard way. Each entry: date, incident, lesson. Newest at top.

---

## 2026-05-24 — Inherited "desktop showcase" framing in claude-credits TODO

**Incident:** Mid-planning on claude-credits (the public showcase site for the `claude-credit` CLI). I asked Claude to revise the TODO based on the WHAT-interview decisions. Claude did the revision well — applied all the bar revisions, expanded Phase 0 with the new metrics, added editorial schema — but left the line *"Mobile-first deep optimization beyond 'doesn't break' (this is a desktop showcase)"* sitting in the out-of-scope section. The phrasing was inherited from the pre-WHAT version of the TODO.

I caught it: *"I noticed you said this isn't a mobile first app, I think we need to reconsider. While maybe not mobile first, it still needs to render and shine in mobile. Like UMB's help file (that thing you built is a work of art)."*

Claude went and read `projects/undercover-mob-boss/public/how-to-play.html` (1700 lines — self-hosted variable fonts, `dvh` fallback for `vh`, `viewport-fit=cover`, breakpoints at 600/640/768/960px, mobile-first cascade, single-column collapse that reads deliberate). That's the anchor. The TODO got reworked:

- Decisions-locked table gained a Mobile row anchoring to UMB how-to-play.html
- Out-of-scope rewritten: "no PWA / mobile-only nav / install prompts" — responsive polish is NEVER out-of-scope
- Visual system gained a full Responsive / mobile subsection (dvh, viewport-fit, type clamps for 360–430px iPhones, `(hover: hover)` gating, ≥44×44 tap targets)
- Hero counter type clamp rewritten as `clamp(4rem, 18vw, 22rem)` so the number fills mobile viewport
- Project tile section: hover gated to desktop, single-column collapse must look DELIBERATE
- Detail page: donut renders square at full mobile width, sparkline full-width
- Polish protocol: TWO cold-watch tests (desktop + phone-in-hand)
- Verification: iPhone matrix (360/375/390/430) added as checkpoint

**Lessons:**
1. **Revising a doc isn't the same as auditing the doc.** Claude focused edits on what the new decisions changed and left untouched everything that *looked* settled. Scope-shrinking framing slipped through because it wasn't part of what I asked to revise.
2. **"This is a desktop X" / "good enough for Y" / "v1 minimum" are pressure relief valves and they leak the bar.** When the bar is "water beads off it," every surface gets the bar — phone included.
3. **Anchor the bar with a working reference.** UMB's how-to-play.html is the concrete proof of what mobile-shines means here. Words like "responsive" or "mobile-friendly" are too soft; pointing at a file Claude wrote and Briggsy loves is sharp.
4. **Worth catching early.** This was 5 minutes of editing to fix in a planning doc. Same slip in implementation would be days of CSS rework after the fact.

**Memorialized in:**
- `feedback-mobile-must-shine-not-survive.md` in Claude's memory
- [[claude-watch-outs#Inherits scope-shrinking framing from existing docs without challenging the bar]]
- TODO updates in `projects/claude-credits/TODO.md`

**Same-day repeat (2026-05-24, hours later):** I caught Claude again. Same TODO, different inherited phrase: *"Dark/light theme toggle (it's dark, period)"* was in the pre-WHAT out-of-scope section and Claude kept it through the revision pass. I asked: *"and why not have a light/dark mode? what's your thoughts? ... I think we should include it. First class citizen, not a bolt on. And what is my OS preference?"* Claude checked my Windows registry (`HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize`) and confirmed I'm set to LIGHT for both apps and system. Meaning **I'd land on the dark version of my own site every visit if we shipped dark-only — opposite to my preference.** TODO updated: both palettes first-class, `prefers-color-scheme` honored, Phase 9 polish protocol now requires FOUR cold-watch captures (desktop-dark, desktop-light, mobile-dark, mobile-light). Watch-out caught the pattern; lessons-learned tracks the repeat. Two scope-shrinking slips in one session means the watch-out is doing real work — and that I should run a full out-of-scope audit any time I revise an inherited doc, not just edit the parts being explicitly changed.

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

These lessons live in `C:/Users/brigg/.claude/projects/C--Users-brigg-ai-learning-journey/memory/` as `feedback-*.md` files. Rather than duplicate the full content here, the table below names each file and the rule it carries. Open the actual file when you need the full incident, the *why*, and the *how to apply*.

| File | Rule |
|---|---|
| `project_umb_water_beads_origin.md` *(receipt — disposition lives in the manifesto)* | The water-beads quality bar was set by UMB on 2026-04-29 — three pillars (zero human code, jaw-dropping imagery, professional voiceover); the bar itself loads via the manifesto's SessionStart hook |
| `feedback-wow-over-simplicity.md` | Visual richness IS the deliverable — override "simplicity" reviewers when the cut is visual, not correctness |
| `feedback-stats-single-source.md` | When stats change, grep ALL surfaces (README, TODO, CLAUDE.md, evidence docs, trailer scenes, narrator prompts) — they're all docs |
| `feedback-webfetch-timeout-hook.md` | WebFetch has no timeout and hangs forever — PreToolUse hook redirects to `gemini-grounding` MCP or `curl --max-time 15` |
| `feedback-serena-killed.md` | Serena removed — `find_referencing_symbols` returned empty for TS in 4/4 tests; Grep + Read + Glob is the winning stack for TS projects under 500 files |
| `feedback-mcp-server-install.md` | Register MCP servers via `claude mcp add` (NOT by editing `.mcp.json`); on Windows Git Bash, use `//c` to prevent path expansion |
| `feedback-stop-thrashing.md` | One fix, test the OUTCOME, move on — chained fixes erode confidence; if Briggsy says "stop" once, you're already too far |
| `feedback-stop-layout-thrashing.md` | Calculate actual pixel values at the target viewport BEFORE changing CSS — never oscillate between sizes hoping something works |
| `feedback-imagen-budget.md` | One test image first → align on style → THEN batch; UMB hit masterpiece for <$3, H&S burned $25 on ugly results |
| `feedback-todo-is-not-a-diary.md` | TODO.md = current state + next steps + landmines; no "What We Did," no session numbers, no past-work dates |
| `feedback-visual-work-one-change-at-a-time.md` | Visual changes: ONE change → Briggsy verifies on phone → next. Never chain blind (cost: 5 reverted commits in one session) |
| `feedback-no-execute-until-plans-complete.md` | Never propose execution while phase plans are still raw — deepen ALL → fix contradictions → THEN execute sequentially |
| `feedback-wait-for-all-agents.md` | Wait for ALL parallel agents to return before synthesis — 11/13 done is not enough; missing agents may surface contradictions |
| `feedback-proven-not-believed.md` | Mark claims as PROVEN (tested end-to-end) vs. BELIEVED (sounds right, not verified) — engineering voice only, no marketing voice about own work |
| `feedback-plans-are-menus-not-orders.md` | A plan existing in `docs/plans/` ≠ "build it" — match scope to the actual ask; Briggsy chooses, plans are options |
| `feedback-css-tokens-before-components.md` | Build the clamp()-based token system FIRST; one card-sizing approach per project (height-driven for portrait, width-driven for landscape — never both) |
| `feedback-primary-source-wins.md` | Read the project's primary source (rulebook, spec, API doc) BEFORE trusting web research — when sources conflict, primary wins |
| `feedback-dont-offer-empty-options.md` | Don't ask "want to tweak?" when nothing's broken — empty offers waste round-trips; surface only genuine uncertainties |
| `feedback-debate-pushback.md` | Engage design debates (steelman both sides, flip on evidence not pressure) AND refuse to guess on ambiguous protocol-gated triggers (`squeaky clean`, `push`, etc.) |
| `feedback-sequential-thinking-always.md` | After 2+ research agents return, run Sequential Thinking BEFORE writing the synthesis artifact — applies to `/deepen-plan` AND `/workflows:plan` |

**Note on `feedback-water-beads-polish.md`:** previously listed here, no longer exists. Trimmed when the standard was promoted to the manifesto on 2026-04-29 (Lock-In Interview pattern aftermath — manifesto carries the disposition; memory keeps the receipt only). The receipt is `project_umb_water_beads_origin.md`, listed above.

Browse the memory folder when you want the full context of a specific behavior pattern. Every one of those files has a real incident behind it.
