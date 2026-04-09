# Proposal 1: Config-Driven Generic Hook

## Philosophy

Move subscriber knowledge from code to data. Hook scripts become generic gate-checkers that read a JSON registry. The config is the single source of truth for "who participates in which gate."

**Current (backwards):**
```
enforce-brief-before-work.sh:
  case "$SKILL" in
    brief)     -> create marker   <- hook knows about /brief
    distill)   -> clear marker    <- hook knows about /distill
    ce:work)   -> check marker    <- hook knows about /ce:work
  esac
```

**Proposed:**
```
generic-gate-pretool.sh:
  for gate in registry:
    is SKILL in gate.creates?  -> touch marker
    is SKILL in gate.requires? -> check marker
    is SKILL in gate.clears?   -> rm marker
```

The script never mentions a skill name. All names live in `hook-registry.json`.

---

## Architecture

```
~/.claude/hooks/
├── hook-registry.json          <- THE source of truth (data, not code)
├── generic-gate-pretool.sh     <- reads registry, never changes
├── generic-gate-posttool.sh    <- reads registry, never changes
├── generic-gate-stop.sh        <- reads registry, never changes
├── session-start-cleanup.sh    <- reads registry, cleans all markers
└── block-webfetch.sh           <- unchanged (not a gate pattern)
```

---

## hook-registry.json

```json
{
  "gates": {
    "brief": {
      "marker": "/tmp/.brief-gate",
      "creates": ["brief", "distill-and-brief:brief"],
      "requires": ["ce:work", "ce-work", "compound-engineering:ce-work"],
      "block-message": "HOLD — Run /brief first to surface documented gotchas from docs/insights/.\n\nThen re-run /ce:work."
    },
    "distill": {
      "marker": "/tmp/.distill-needed",
      "triggers": ["ce:work", "ce-work", "compound-engineering:ce-work",
                    "ce:review", "ce-review", "compound-engineering:ce-review"],
      "clears": ["distill", "distill-and-brief:distill"],
      "stop-message": "Run /distill to capture any non-obvious findings from this work session. If nothing worth documenting surfaced, say so and move on."
    }
  }
}
```

---

## Generic Hook Scripts

### PreToolUse: generic-gate-pretool.sh

```bash
#!/bin/bash
# Generic gate-checker. Reads hook-registry.json. Never needs editing.
INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')
CONFIG="$HOME/.claude/hooks/hook-registry.json"
[ -f "$CONFIG" ] || exit 0

for gate in $(jq -r '.gates | keys[]' "$CONFIG"); do
  # Does this skill CREATE this gate?
  if jq -e ".gates[\"$gate\"].creates // [] | index(\"$SKILL\")" "$CONFIG" >/dev/null 2>&1; then
    marker=$(jq -r ".gates[\"$gate\"].marker" "$CONFIG")
    touch "$marker"
    exit 0
  fi
  # Does this skill REQUIRE this gate?
  if jq -e ".gates[\"$gate\"].requires // [] | index(\"$SKILL\")" "$CONFIG" >/dev/null 2>&1; then
    marker=$(jq -r ".gates[\"$gate\"].marker" "$CONFIG")
    if [ -f "$marker" ]; then
      rm -f "$marker"
      exit 0
    fi
    msg=$(jq -r ".gates[\"$gate\"][\"block-message\"]" "$CONFIG")
    printf '{"decision":"block","reason":"%s"}' "$msg"
    exit 0
  fi
  # Does this skill CLEAR this gate?
  if jq -e ".gates[\"$gate\"].clears // [] | index(\"$SKILL\")" "$CONFIG" >/dev/null 2>&1; then
    marker=$(jq -r ".gates[\"$gate\"].marker" "$CONFIG")
    rm -f "$marker"
    exit 0
  fi
done
exit 0
```

### PostToolUse: generic-gate-posttool.sh

```bash
#!/bin/bash
# Silent marker-drop for gates with "triggers" role.
INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')
CONFIG="$HOME/.claude/hooks/hook-registry.json"
[ -f "$CONFIG" ] || exit 0

for gate in $(jq -r '.gates | keys[]' "$CONFIG"); do
  if jq -e ".gates[\"$gate\"].triggers // [] | index(\"$SKILL\")" "$CONFIG" >/dev/null 2>&1; then
    marker=$(jq -r ".gates[\"$gate\"].marker" "$CONFIG")
    touch "$marker"
  fi
done
exit 0
```

### Stop: generic-gate-stop.sh

```bash
#!/bin/bash
# Block stop if any gate marker exists.
CONFIG="$HOME/.claude/hooks/hook-registry.json"
[ -f "$CONFIG" ] || exit 0

for gate in $(jq -r '.gates | keys[]' "$CONFIG"); do
  marker=$(jq -r ".gates[\"$gate\"].marker" "$CONFIG")
  if [ -f "$marker" ]; then
    rm -f "$marker"
    msg=$(jq -r ".gates[\"$gate\"][\"stop-message\"]" "$CONFIG")
    printf '{"decision":"block","reason":"%s"}' "$msg"
    exit 0
  fi
done
```

### SessionStart: session-start-cleanup.sh

```bash
#!/bin/bash
# Clean all gate markers on session start (prevents phantom gates from crashes).
CONFIG="$HOME/.claude/hooks/hook-registry.json"
[ -f "$CONFIG" ] || exit 0

for gate in $(jq -r '.gates | keys[]' "$CONFIG"); do
  marker=$(jq -r ".gates[\"$gate\"].marker" "$CONFIG")
  rm -f "$marker"
done
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
      {"matcher": "WebFetch", "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/block-webfetch.sh"}]},
      {"matcher": "Skill", "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/generic-gate-pretool.sh"}]}
    ],
    "PostToolUse": [
      {"matcher": "Skill", "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/generic-gate-posttool.sh"}]}
    ],
    "Stop": [
      {"matcher": "", "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/generic-gate-stop.sh"}]}
    ]
  }
}
```

---

## Adding a New Gated Skill

Edit `hook-registry.json`, add the skill name to the appropriate array:

```diff
  "requires": ["ce:work", "ce-work", "compound-engineering:ce-work",
+              "my-new-skill"],
```

No bash changes. No hook restarts (JSON is read at invocation time).

---

## Flow

```
User or Claude invokes a skill
       |
generic-gate-pretool.sh
       |
Read hook-registry.json
       |
For each gate:
  Is this skill in "creates"?  --> touch marker, allow
  Is this skill in "requires"? --> check marker --> block or allow
  Is this skill in "clears"?   --> rm marker, allow
  Not found?                   --> next gate
       |
No match --> exit 0 (allow)
```

---

## Strengths

- **Data/logic separation.** The config is readable by humans and machines. The hook script is generic and stable.
- **Single file to edit** when adding skills. No bash knowledge needed.
- **Config IS documentation.** Reading hook-registry.json tells you the full system.
- **Version-controllable.** The JSON lives in the hooks project repo.
- **Extensible.** Add new gate types (e.g., "test-gate") by adding a new JSON object.

## Weaknesses

- **Still a central registry.** There's still a central place that lists subscribers. It's data instead of code, but the event system still "knows about" all participants. Half-measure on the architectural critique.
- **jq on every invocation.** Each hook fires jq 3-6 times to parse JSON. ~30-50ms overhead vs ~5ms for a case statement. Fires on every Skill tool call.
- **Alias proliferation.** Must list every variant: `ce:work`, `ce-work`, `compound-engineering:ce-work`. Miss one and the gate has a hole.
- **Single point of failure.** Malformed JSON = all gates broken. (Mitigated by `[ -f "$CONFIG" ] || exit 0`.)
- **Indirection.** Debugging requires reading the JSON AND the bash script. Currently you read ONE bash script.
