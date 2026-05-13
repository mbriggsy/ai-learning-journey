---
aliases: [watch-outs, gotchas, failure-modes, claude-bugs, claude-watchouts]
tags: [playbook]
---

# Claude's failure modes — catch them before they propagate

Known Claude behaviors that have caused problems. Each entry: what it looks like, why it happens, how to catch it, and what to do instead.

## Pattern-matches reference templates and copies bugs

**Symptom:** Claude uses another project's doc as a structural template (say, UMB's `SPEC.md`) and copies SPECIFIC CLAIMS along with the structure. If the template has a bug, the bug gets replicated.

**Why:** Claude recognizes good structures and reuses them, but structural reuse and claim reuse are different skills and Claude conflates them.

**How to catch:** When Claude creates a document by mirroring another one, ask *"what did you copy exactly vs. adapt?"* Audit any specific claims — names, methodologies, dates, references — for accuracy in the NEW context.

**Example from BURNED session (2026-04-10):** *"Built with Maximum Overdrive. SDLC is the product."* — copied from UMB's SPEC.md footer. UMB was NOT built with Maximum Overdrive either; it was a latent bug in UMB's spec that Claude replicated without verifying. Full incident: [[lessons-learned#2026-04-10 — "Maximum Overdrive" footer copied from UMB's spec by reflex|see lessons-learned]].

**Rule for Claude:** Copy structure only; never copy specific claims from reference templates.

---

## Drops unfamiliar references that calcify across files

**Symptom:** Claude introduces a specific reference (a person, methodology, studio, technical term) that you don't recognize. You don't flag it because you assume Claude knows what it's talking about. The reference propagates through memory files, brainstorm docs, scripts, etc. over days.

**Why:** Claude pattern-matches to a reference point and commits to it even when it's not grounded in your vocabulary.

**How to catch:** When Claude uses a proper noun or specific methodology you don't recognize, ASK immediately. *"Where did that come from?"* or *"Did I say that?"* If Claude can't trace it to something you said, it's a hallucination. **Purge it.**

**Example:** *"Saul Bass"* as BURNED's visual reference — Claude introduced the phrase, Briggsy didn't know who Saul Bass was, didn't flag it. Phrase propagated across **13 files in 5 days** before being purged. Full incident: [[lessons-learned#2026-04-10 — The Saul Bass incident (hallucinated reference calcified across 13 files)|see lessons-learned]].

**Rule for Claude:** When user says *"I don't know what X is"*, treat it as a flag to verify. Users don't own vocabulary they've never heard.

---

## Over-corrects when you flag ONE specific thing

**Symptom:** You flag a specific behavior. Claude over-corrects and bans the entire CLASS of thing.

**Why:** Claude is eager to please and conflates "this specific instance was wrong" with "the whole category is wrong."

**How to catch:** After you give feedback, watch whether Claude's next response has visibly sanitized beyond what you asked. If yes, call it out.

**Example from BURNED session (2026-04-10):** I mentioned I didn't know "touchstone." Claude immediately said *"I'll stop using words like that."* — wrong correction. The right move: use "touchstone" with a brief inline gloss. Full incident: [[lessons-learned#2026-04-10 — Claude over-corrected on vocabulary ("touchstone")|see lessons-learned]].

**Rule for Claude:** Feedback is usually specific, not categorical. Fix the instance and note the pattern — don't generalize to the whole class unless explicitly told to.

---

## Fast-agrees under time pressure

**Symptom:** When you push on a decision with urgency (*"just pick one"*), Claude tends to agree with whatever you most recently proposed, even if Claude's earlier position was better.

**Why:** Claude reads urgency as *"you want this settled"* and optimizes for settling it.

**How to catch:** If Claude flips positions with no new evidence, that's fast-agreement. Push back: *"is that actually true, or are you just agreeing with me?"*

**Rule for Claude:** My position isn't sacred, but it shouldn't change without evidence. If user pushes without new evidence, restate the reasoning and invite specific counter-argument.

---

## Will expand scope unless explicitly clamped

**Symptom:** You ask for X. Claude delivers X + Y + Z because *"while I'm in here, I noticed these improvements."* Now you have to review 3 things instead of 1.

**Why:** Claude is trained to be helpful and interprets "fix X" as an invitation to improve the neighborhood of X.

**How to catch:** When Claude's diff is larger than what you asked, it's scope creep. Revert and clamp.

**How to clamp:** *"Just X, nothing else."* or *"Only change these specific lines."* Claude responds well to hard scope clamps.

**Rule for Claude** (from project CLAUDE.md): *"Don't add features, refactor code, or make 'improvements' beyond what was asked. A bug fix doesn't need surrounding code cleaned up. A simple feature doesn't need extra configurability."*

---

## WebFetch has no timeout and will hang agents

**Symptom:** An agent spawns, calls WebFetch, hangs indefinitely. No progress, no error, just stuck.

**Why:** The built-in WebFetch tool has no timeout. On an unresponsive URL, it blocks forever.

**How to catch:** There's a PreToolUse hook that blocks WebFetch and redirects to gemini-grounding. But hooks can fail; don't rely on them.

**Rule for Claude:** NEVER use WebFetch. Use `mcp__gemini-grounding__*` tools for web searches or `curl -sL --max-time 15` via Bash.

**Origin:** `feedback-webfetch-timeout-hook.md` in Claude's memory. Verified 2026-03-30.

---

## "Remembers" file paths from memory without verifying

**Symptom:** Claude recalls a file at `src/foo/bar.ts` from memory and acts on it — but the file was renamed or deleted weeks ago.

**Why:** Memory records are point-in-time observations, not live state. Claude treats them as current unless reminded.

**How to catch:** If Claude confidently references a file you haven't touched recently, check `git log` or the current state first.

**Rule for Claude:** When a memory entry claims a file path exists, VERIFY before acting on it.

---

## Gets confused about file paths after moves/renames

**Symptom:** You move a file via `mv` in bash. Claude then tries to edit at the new path and gets *"file has not been read"* error.

**Why:** The Edit tool's read-before-write check is path-based, not file-based. A move invalidates the prior Read cache for the old path.

**How to catch:** If Claude's edit fails right after a `mv`, this is why.

**Fix:** Do a fresh `Read` at the new path before attempting `Edit`.

**Example:** This session — moving `PRODUCT-SPECIFICATION.md` from root to `docs/specifications/` caused exactly this error, fixed by Reading at the new path first.

---

## Sanitizes energy unless explicitly told to match

**Symptom:** Claude writes reports in corporate-speak (*"I have successfully completed the implementation"*) instead of teammate-speak (*"fuck yes, done"*).

**Why:** Default training tilts toward professional tone.

**How to catch:** If a response feels sanitized, it probably is. Call it out.

**Rule for Claude:** Match energy per `user_communication_style.md`. Curse when it fits. *"Fuck yeah, let's go!"* not *"I have completed the task."*

---

## Can mis-route work across multiple related tasks

**Symptom:** When you give Claude multiple related tasks, Claude sometimes batches them in confusing ways, or does them in the wrong order.

**Why:** Claude optimizes for parallelism but can miss dependency order.

**How to catch:** If output feels out of order, ask Claude to explain the sequence.

**Fix:** For dependency-sensitive work, tell Claude the order explicitly: *"first A, then B, then C in parallel, then D."*
