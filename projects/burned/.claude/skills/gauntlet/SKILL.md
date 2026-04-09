---
name: gauntlet
description: "GAN-inspired design improvement loop for BURNED. Evaluates the live UI via Playwright, scores against a 4-criteria rubric, then generates one coherent improvement. Use when the user says 'run the gauntlet', 'design loop', or 'gauntlet'. Do NOT auto-trigger — this has significant side effects (edits code, generates images)."
context: fork
---

# The Gauntlet — Design Improvement Loop

You are an autonomous design improvement agent for BURNED (spy-comedy card game). You run a GAN-inspired evaluate → generate cycle: a separate evaluator scores the UI, then a generator fixes the highest-priority issue.

**Architecture inspired by:** Anthropic's "Harness design for long-running application development" — separate generator from evaluator because self-evaluation is unreliable.

## Pre-flight

Current git state:
!`git diff --stat HEAD 2>/dev/null || echo "clean"`

Dev server status:
!`curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/board.html 2>/dev/null || echo "DOWN"`

Iteration count:
!`grep -c "^## Iteration" temp/gauntlet/changelog.md 2>/dev/null || echo "0"`

Previous composite scores:
!`grep "Composite" temp/gauntlet/scorecard.md 2>/dev/null || echo "no previous scores"`

## Stop Conditions

Before doing ANY work, check the stop conditions:

1. **Iteration cap:** If the iteration count above is **10 or more**, STOP. Report: "Gauntlet complete — 10 iterations reached. Review temp/gauntlet/changelog.md for full history." Do not evaluate or generate.

2. **Score target:** If BOTH composite scores above are **8.5 or higher**, STOP. Report: "Gauntlet complete — target score reached. Board: X.X, Player: X.X." Do not evaluate or generate.

3. **Dev servers down:** If the dev server status above is "DOWN", STOP. Report: "Dev servers not running. Start with: pnpm dev & pnpm dev:server" Do not evaluate or generate.

If none of the stop conditions are met, proceed to Phase 1.

## Phase 1: EVALUATE

You are now the **Evaluator**. Your job is to experience the UI as a player would, score it honestly, and produce a prioritized critique. You have NO loyalty to the current implementation. Be skeptical. Be specific.

### Step 1: Play the Game

Read the play guide: [play-guide.md](references/play-guide.md)

Using Playwright MCP:
1. Resize to 1920x1080. Navigate to `http://localhost:5173/board.html?room=GAUNTLET`. Note the room code from the URL hash.
2. Open new tab, resize to 390x844. Navigate to `http://localhost:5173/player.html?room={CODE}&name=Alice`
3. Open new tab, resize to 390x844. Navigate to `http://localhost:5173/player.html?room={CODE}&name=Bob`
4. On board tab: click "Start Game"
5. Play 3-5 turns — use Skip and See the Future to test different UI flows
6. Screenshot at EVERY key state: lobby, your turn, not your turn, card selected, card played, board reaction

Save screenshots to `temp/gauntlet/` with descriptive names.

### Step 2: Score

Read the rubric: [rubric.md](references/rubric.md)
Read the calibration baseline: [calibration.md](references/calibration.md)

Score BOTH views (board + player) on all 4 criteria. Be anchored to the calibration scores — don't grade inflate. If an issue from the calibration is still present, the score cannot improve for that criterion.

### Step 3: Write Scorecard

Write `temp/gauntlet/scorecard.md` with this exact format:

```markdown
# Gauntlet Scorecard — Iteration {N}

## Board View
| Criterion | Score | Delta | Key Issue |
|-----------|-------|-------|-----------|
| Game Feel | X/10 | +/-N | ... |
| Distinctiveness | X/10 | +/-N | ... |
| Craft | X/10 | +/-N | ... |
| Clarity | X/10 | +/-N | ... |
| **Composite** | **X.X/10** | **+/-N.N** | |

## Player View
| Criterion | Score | Delta | Key Issue |
|-----------|-------|-------|-----------|
| Game Feel | X/10 | +/-N | ... |
| Distinctiveness | X/10 | +/-N | ... |
| Craft | X/10 | +/-N | ... |
| Clarity | X/10 | +/-N | ... |
| **Composite** | **X.X/10** | **+/-N.N** | |

## Top Issue
**What:** {one sentence}
**Why it matters:** {which criterion it drags down most}
**Where:** {specific file:line or component}
**Suggested approach:** {how to fix — but the generator decides}
```

## Phase 2: GENERATE

You are now the **Generator**. You read the scorecard and fix the top issue. You have creative freedom — the evaluator told you WHAT is wrong, you decide HOW to fix it.

### Step 1: Read the Scorecard

Read `temp/gauntlet/scorecard.md`. Focus on the Top Issue.

### Step 2: Strategic Decision

Based on the scores and trend (delta from previous iteration):
- If scores are trending up: **refine** the current direction
- If scores are flat or declining: consider a **pivot** — try a fundamentally different approach
- If a specific criterion is dragging everything down: focus there exclusively

### Step 3: Make ONE Coherent Improvement

Fix the top issue. You may touch multiple files if they're all part of the same fix. But don't fix 5 unrelated things.

**Your toolkit — use any of these skills if they help:**
- `/critique`, `/audit` — for deeper analysis before acting
- `/polish`, `/animate`, `/delight` — for refinement
- `/colorize`, `/typeset`, `/arrange` — for visual improvements
- `/bolder`, `/quieter` — for adjusting intensity
- `/adapt`, `/harden`, `/optimize` — for robustness
- `/normalize`, `/extract` — for design system alignment
- `/frontend-design` — for distinctive interface work
- `/overdrive` — for technically ambitious implementations
- Imagen 4 via Gemini (`compound-engineering:gemini-imagegen`) — for generating card art, illustrations, textures

**Constraints:**
- Phone initial JS must stay under 100KB gzipped
- All changes must pass `pnpm typecheck && pnpm lint && pnpm test`
- CSS modules convention — no inline styles
- `m` from `motion/react`, never `motion` (LazyMotion strict mode)
- Security: allowlist pattern for state projection, no `Math.random()` in server

### Step 4: Verify

Run: `pnpm typecheck && pnpm lint && pnpm test`

If any check fails, fix it before proceeding. Do NOT leave broken code.

### Step 5: Log the Change

Append to `temp/gauntlet/changelog.md`:

```markdown
## Iteration {N} — {timestamp}
**Issue:** {what was wrong}
**Fix:** {what you changed}
**Files:** {list of modified files}
**Approach:** {refine or pivot}
**Build:** {pass/fail}
```

## Phase 3: REPORT

Summarize what happened in 3-4 sentences:
- What the evaluator found (top issue + scores)
- What the generator did (approach + files changed)
- Whether the build passed
- What the next iteration should focus on
