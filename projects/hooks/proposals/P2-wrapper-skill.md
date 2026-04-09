# Proposal 2: Wrapper Skill (/work)

## Philosophy

Don't enforce the chain with hooks -- make the chain the skill. `/work` orchestrates brief -> ce:work -> distill as a single workflow. No hooks needed for the happy path. Keep the Stop hook as a mechanical safety net for the escape hatch.

**Current (hooks enforce the chain):**
```
PreToolUse  --> blocks /ce:work until /brief runs
PostToolUse --> drops distill marker after /ce:work
Stop        --> blocks stop until /distill runs
```

**Proposed (skill IS the chain):**
```
/work SKILL.md:
  Step 1: invoke /brief
  Step 2: invoke /ce:work $ARGUMENTS
  Step 3: invoke /distill
```

Hooks drop from 4 (3 with case statements) to 3 (2 trivial, 1 safety net).

---

## Architecture

```
~/.claude/skills/
├── work/
│   └── SKILL.md              <- THE orchestrator (NEW)
├── brief/   -> (symlink, unchanged)
├── distill/ -> (symlink, unchanged)
├── doc-audit/                 (unchanged)
└── squeaky-clean/             (unchanged)

~/.claude/hooks/
├── stop-distill-gate.sh       <- KEPT as safety net (simplified)
├── remind-distill-after-work.sh  <- KEPT, simplified (no brief logic)
├── block-webfetch.sh          <- unchanged
└── session-start-cleanup.sh   <- NEW: cleans stale markers
```

**Removed:** `enforce-brief-before-work.sh` -- /work handles this now.

---

## /work SKILL.md

```yaml
---
name: work
description: "Execute the full knowledge-loop workflow: brief -> execute -> distill.
  Use instead of /ce:work to ensure institutional knowledge is loaded before work
  begins and captured after it ends. Triggers: /work [plan or task], 'start work
  on X', 'execute the plan for X'. Do NOT use for quick questions, reviews, or
  non-work tasks."
disable-model-invocation: true
argument-hint: "[plan file, spec, or task description]"
---

# Knowledge-Loop Work Execution

Execute work with the full brief -> execute -> distill cycle. Every step is mandatory.

## Step 1: Brief

Invoke /brief to surface documented insights from docs/insights/.

Read the output carefully. If any insight is directly relevant to the upcoming
work (same module, same pattern, same failure mode), call it out before proceeding.

If /brief surfaces a CRITICAL warning about the exact work you're about to do,
STOP and discuss with Briggsy before Step 2. Otherwise, proceed.

## Step 2: Execute

Invoke /ce:work with the original arguments: $ARGUMENTS

Follow ce:work's full execution workflow. This is the main work phase.
Do not rush. Do not cut corners. NASA standard.

## Step 3: Distill

After work is complete, invoke /distill.

If nothing non-obvious was learned during this session, say "Nothing to distill"
and skip writing a doc. Not every session produces an insight.

If a genuine insight surfaced -- a root cause that wasn't obvious, a pattern that
would bite the next session, a gotcha that isn't documented -- capture it.

## Rules

- Steps 1-2-3 execute in strict order. No skipping. No reordering.
- If $ARGUMENTS is empty, ask what work to execute before starting.
- If Step 1 surfaces relevant insights, reference them during Step 2.
```

---

## How /ce:review Fits

### Option A: Separate /review wrapper

```yaml
---
name: review
description: "Knowledge-loop code review: brief -> ce:review -> distill."
disable-model-invocation: true
argument-hint: "[PR number, URL, or branch]"
---

# Knowledge-Loop Code Review

## Step 1: Brief
Invoke /brief to surface documented insights.

## Step 2: Review
Invoke /ce:review with: $ARGUMENTS

## Step 3: Distill
Invoke /distill if non-obvious findings surfaced.
```

### Option B: /work routes based on arguments

```markdown
## Routing
If $0 is "review" or references a PR/branch:
  Step 2 uses /ce:review instead of /ce:work
Otherwise:
  Step 2 uses /ce:work
```

---

## What Hooks Remain

| Hook | Status | Why |
|---|---|---|
| **stop-distill-gate.sh** | KEPT | Safety net. If someone runs /ce:work directly (bypassing /work), the Stop hook still catches missing distill. |
| **remind-distill-after-work.sh** | SIMPLIFIED | Only drops distill marker. No brief-gate logic. |
| **block-webfetch.sh** | UNCHANGED | Unrelated to the gate system. |
| **session-start-cleanup.sh** | NEW | Cleans stale markers from crashed sessions. |
| **enforce-brief-before-work.sh** | REMOVED | /work handles the brief gate via skill orchestration. |

### Simplified remind-distill-after-work.sh

```bash
#!/bin/bash
# PostToolUse: Mark distill needed after ce:work or ce:review.
# NOTE: Still lists skill names -- this is the safety net, not the primary flow.
INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')

case "$SKILL" in
  ce:work|ce-work|compound-engineering:ce-work|\
  ce:review|ce-review|compound-engineering:ce-review)
    touch /tmp/.distill-needed
    ;;
esac
exit 0
```

(Same as current -- the case statement here is acceptable because it's a safety net, not the primary orchestration path.)

### Simplified stop-distill-gate.sh

```bash
#!/bin/bash
# Stop: Block if distill hasn't run. Safety net only.
MARKER="/tmp/.distill-needed"
if [ -f "$MARKER" ]; then
  rm -f "$MARKER"
  cat <<'EOF'
{"decision": "block", "reason": "Run /distill to capture any non-obvious findings from this work session. If nothing worth documenting surfaced, say so and move on."}
EOF
fi
```

(Unchanged from current.)

### New session-start-cleanup.sh

```bash
#!/bin/bash
# SessionStart: Clean stale markers from crashed sessions.
rm -f /tmp/.brief-gate /tmp/.distill-needed
exit 0
```

---

## Settings Changes

```json
{
  "hooks": {
    "SessionStart": [
      {"matcher": "", "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/session-start-cleanup.sh"}]}
    ],
    "PreToolUse": [
      {"matcher": "WebFetch", "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/block-webfetch.sh"}]}
    ],
    "PostToolUse": [
      {"matcher": "Skill", "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/remind-distill-after-work.sh"}]}
    ],
    "Stop": [
      {"matcher": "", "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/stop-distill-gate.sh"}]}
    ]
  }
}
```

**Removed from PreToolUse:** The Skill matcher for `enforce-brief-before-work.sh`.

---

## Adding a New Gated Skill

Write a new wrapper skill (or add routing to /work). The workflow lives in the skill, not in hooks.

```bash
# Example: /deploy with pre-flight checks
~/.claude/skills/deploy/SKILL.md:
  Step 1: invoke /preflight-check
  Step 2: invoke /ce:deploy $ARGUMENTS
  Step 3: invoke /distill
```

Natural, readable, no bash editing.

---

## Flow

```
--- Happy path (user uses /work) ---
User: /work Phase 5 plan
  --> /work SKILL.md loads
  --> Claude invokes /brief --> insights loaded
  --> Claude invokes /ce:work Phase 5 plan --> work happens
  --> PostToolUse: drops .distill-needed (safety net marker)
  --> Claude invokes /distill --> insight captured (or "nothing to distill")
  --> /distill SKILL.md loads, includes: !`rm -f /tmp/.distill-needed`
      (dynamic injection clears the marker at skill load time)
  --> Claude stops --> Stop hook: no marker --> ALLOWED

--- Escape hatch (user runs /ce:work directly) ---
User: /ce:work Phase 5 plan
  --> Brief is NOT enforced (no hook, no wrapper)
  --> PostToolUse: drops .distill-needed
  --> Work happens
  --> Claude tries to stop
  --> Stop hook: marker exists --> BLOCKS: "run /distill"
  --> /distill loads, !`rm -f /tmp/.distill-needed` clears marker
  --> Distill IS enforced

--- Session crash ---
  --> SessionStart: cleans stale markers
```

**Important detail:** Removing enforce-brief-before-work.sh means /distill no longer clears its marker via hook. Fix: add `!`rm -f /tmp/.distill-needed`` to /distill's SKILL.md as dynamic injection. This runs at skill load time, clearing the marker before distill executes.

---

## Strengths

- **The workflow IS the documentation.** SKILL.md reads like a recipe. No hook indirection.
- **No case statements, no configs, no routing logic in hooks** (for the primary path).
- **Natural composition.** Adding a new workflow = writing a new skill file. That's the POINT of skills.
- **Intelligence at the orchestration layer.** The skill can reason: "If /brief surfaces a critical warning, stop and discuss." Hooks are binary (block/allow); skills can think.
- **Drastically simpler hook system.** From 4 hooks (3 with case statements) to 3 hooks (all simple).
- **Skills own their behavior.** /brief does briefing, /distill does distilling, /work does orchestrating.

## Weaknesses

- **Soft enforcement for /brief.** Skills are instructions, not mechanisms. Claude might skip Step 1. Distill still has hard enforcement (Stop hook), but brief becomes "strongly instructed" instead of "mechanically blocked."
  - Mitigation: Claude follows numbered "mandatory" instructions 95%+ of the time.
- **Behavior change.** Users type `/work` instead of `/ce:work`. Muscle memory breaks.
- **Can't block direct /ce:work.** If someone runs /ce:work directly, they skip brief. Stop hook catches distill only.
- **Safety net hooks still have case statements.** The PostToolUse marker-drop still lists skill names. Acceptable for a safety net but the case-statement problem isn't fully eliminated -- just pushed to the edge.
- **Marker cleanup subtlety.** Removing enforce-brief-before-work.sh means /distill needs `!`rm -f /tmp/.distill-needed`` in its SKILL.md to clear the marker.
