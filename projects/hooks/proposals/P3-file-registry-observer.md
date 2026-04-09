# Proposal 3: File-Based Registration (Observer Pattern)

## Philosophy

True dependency inversion. Skills declare what gates they participate in by registering in a directory structure. Hook scripts scan registrations generically. The hook never knows about specific skills -- it just checks "does a registration exist for this skill in this gate?"

**Current (hook knows subscribers):**
```
hook script --> case "ce:work" --> block
```

**Proposed (subscribers register, hook is generic):**
```
registry/brief-gate/requires: "ce:work"    <- registration (data)
hook script --> grep SKILL in requires --> block   <- generic (logic)
```

The hook script has zero knowledge of skill names. All subscriber knowledge lives in registration files.

---

## Architecture

```
~/.claude/hooks/
├── registry/                      <- skills register here
│   ├── brief-gate/
│   │   ├── .marker                <- contains: /tmp/.brief-gate
│   │   ├── .block-message         <- contains the block text
│   │   ├── creates                <- text file: one skill name per line
│   │   └── requires               <- text file: one skill name per line
│   └── distill-gate/
│       ├── .marker                <- contains: /tmp/.distill-needed
│       ├── .stop-message          <- contains the stop-block text
│       ├── triggers               <- text file: one skill name per line
│       └── clears                 <- text file: one skill name per line
├── generic-gate-pretool.sh        <- scans registry/, never changes
├── generic-gate-posttool.sh       <- scans registry/, never changes
├── generic-gate-stop.sh           <- scans registry/, never changes
├── session-start-cleanup.sh       <- scans registry/, cleans all markers
└── block-webfetch.sh              <- unchanged
```

**Design note:** Original design used skill names as filenames (`requires/ce:work`). Killed by NTFS -- colons are illegal in Windows filenames. Text files with one skill name per line solve this cleanly.

---

## Registration Files

### brief-gate/creates
```
brief
distill-and-brief:brief
```

### brief-gate/requires
```
ce:work
ce-work
compound-engineering:ce-work
```

### brief-gate/.marker
```
/tmp/.brief-gate
```

### brief-gate/.block-message
```
HOLD -- Run /brief first to surface documented gotchas from docs/insights/.\n\nThen re-run /ce:work.
```

### distill-gate/triggers
```
ce:work
ce-work
compound-engineering:ce-work
ce:review
ce-review
compound-engineering:ce-review
```

### distill-gate/clears
```
distill
distill-and-brief:distill
```

### distill-gate/.marker
```
/tmp/.distill-needed
```

### distill-gate/.stop-message
```
Run /distill to capture any non-obvious findings from this work session. If nothing worth documenting surfaced, say so and move on.
```

---

## Generic Hook Scripts

### PreToolUse: generic-gate-pretool.sh

```bash
#!/bin/bash
# Generic gate enforcer. Scans registry/. Never needs editing.
INPUT=$(cat)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // empty')
REGISTRY="$HOME/.claude/hooks/registry"
[ -d "$REGISTRY" ] || exit 0

for gate_dir in "$REGISTRY"/*/; do
  [ -d "$gate_dir" ] || continue
  marker=$(cat "$gate_dir/.marker" 2>/dev/null | tr -d '\r')
  [ -z "$marker" ] && continue

  # Does this skill CREATE this gate?
  if grep -qxF "$SKILL" "$gate_dir/creates" 2>/dev/null; then
    touch "$marker"
    exit 0
  fi

  # Does this skill REQUIRE this gate?
  if grep -qxF "$SKILL" "$gate_dir/requires" 2>/dev/null; then
    if [ -f "$marker" ]; then
      rm -f "$marker"
      exit 0
    fi
    msg=$(cat "$gate_dir/.block-message" 2>/dev/null | tr -d '\r')
    printf '{"decision":"block","reason":"%s"}' "$msg"
    exit 0
  fi

  # Does this skill CLEAR this gate?
  if grep -qxF "$SKILL" "$gate_dir/clears" 2>/dev/null; then
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
REGISTRY="$HOME/.claude/hooks/registry"
[ -d "$REGISTRY" ] || exit 0

for gate_dir in "$REGISTRY"/*/; do
  [ -d "$gate_dir" ] || continue
  marker=$(cat "$gate_dir/.marker" 2>/dev/null | tr -d '\r')
  [ -z "$marker" ] && continue

  if grep -qxF "$SKILL" "$gate_dir/triggers" 2>/dev/null; then
    touch "$marker"
  fi
done
exit 0
```

### Stop: generic-gate-stop.sh

```bash
#!/bin/bash
# Block stop if any gate's stop-message exists and marker is set.
REGISTRY="$HOME/.claude/hooks/registry"
[ -d "$REGISTRY" ] || exit 0

for gate_dir in "$REGISTRY"/*/; do
  [ -d "$gate_dir" ] || continue
  [ -f "$gate_dir/.stop-message" ] || continue
  marker=$(cat "$gate_dir/.marker" 2>/dev/null | tr -d '\r')
  [ -z "$marker" ] && continue

  if [ -f "$marker" ]; then
    rm -f "$marker"
    msg=$(cat "$gate_dir/.stop-message" 2>/dev/null | tr -d '\r')
    printf '{"decision":"block","reason":"%s"}' "$msg"
    exit 0
  fi
done
```

### SessionStart: session-start-cleanup.sh

```bash
#!/bin/bash
# Clean all gate markers on session start (prevents phantom gates from crashes).
REGISTRY="$HOME/.claude/hooks/registry"
[ -d "$REGISTRY" ] || exit 0

for gate_dir in "$REGISTRY"/*/; do
  [ -d "$gate_dir" ] || continue
  marker=$(cat "$gate_dir/.marker" 2>/dev/null | tr -d '\r')
  [ -n "$marker" ] && rm -f "$marker"
done
exit 0
```

---

## Setup Script

Run once to create the registry:

```bash
#!/bin/bash
# projects/hooks/setup-registry.sh
# Run once after cloning or when gate configuration changes.
REGISTRY="$HOME/.claude/hooks/registry"

# Brief gate
mkdir -p "$REGISTRY/brief-gate"
printf '/tmp/.brief-gate' > "$REGISTRY/brief-gate/.marker"
printf 'brief\ndistill-and-brief:brief' > "$REGISTRY/brief-gate/creates"
printf 'ce:work\nce-work\ncompound-engineering:ce-work' > "$REGISTRY/brief-gate/requires"
printf 'HOLD -- Run /brief first to surface documented gotchas from docs/insights/.\\n\\nThen re-run /ce:work.' > "$REGISTRY/brief-gate/.block-message"

# Distill gate
mkdir -p "$REGISTRY/distill-gate"
printf '/tmp/.distill-needed' > "$REGISTRY/distill-gate/.marker"
printf 'ce:work\nce-work\ncompound-engineering:ce-work\nce:review\nce-review\ncompound-engineering:ce-review' > "$REGISTRY/distill-gate/triggers"
printf 'distill\ndistill-and-brief:distill' > "$REGISTRY/distill-gate/clears"
printf 'Run /distill to capture any non-obvious findings from this work session. If nothing worth documenting surfaced, say so and move on.' > "$REGISTRY/distill-gate/.stop-message"

echo "Registry created at $REGISTRY"
ls -R "$REGISTRY"
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

```bash
# One command. No code changes. No config files.
echo "my-new-skill" >> ~/.claude/hooks/registry/brief-gate/requires
```

### Adding an entirely new gate type

```bash
mkdir -p ~/.claude/hooks/registry/test-gate
echo "/tmp/.test-needed" > ~/.claude/hooks/registry/test-gate/.marker
echo "Run tests before stopping." > ~/.claude/hooks/registry/test-gate/.stop-message
echo "deploy" > ~/.claude/hooks/registry/test-gate/requires
echo "test-runner" > ~/.claude/hooks/registry/test-gate/creates
```

No hook script changes. The generic scripts discover the new gate automatically.

---

## Flow

```
User or Claude invokes a skill
       |
generic-gate-pretool.sh
       |
Scan ~/.claude/hooks/registry/*/
       |
For each gate directory:
  grep skill name in "creates"  --> touch marker, allow
  grep skill name in "requires" --> check marker --> block or allow
  grep skill name in "clears"   --> rm marker, allow
       |
No match in any gate --> exit 0 (allow)
```

---

## Performance

- `grep -qxF` is ~1ms per file (exact fixed-string match, no regex)
- 2 gates x 4 role checks = ~8ms worst case per invocation
- Compare: jq JSON parsing ~30-50ms (Proposal 1), case statement ~5ms (current)
- `cat` for .marker file read: ~1ms
- Total overhead: ~10ms per hook invocation

---

## Strengths

- **True Observer pattern.** The hook is a generic dispatcher. Zero knowledge of specific skills. All subscriber knowledge lives in the registration files.
- **Adding a skill = appending one line to a text file.** Lowest possible friction. No code, no JSON, no restarts.
- **Fast.** `grep -qxF` is ~1ms vs jq's ~30-50ms.
- **Each gate is self-contained.** Its directory has everything: marker path, message, subscribers. Delete the directory to remove a gate entirely.
- **New gate types = new directory.** Want a "test-gate"? `mkdir` and populate. The hook scripts discover it automatically.
- **Hook scripts NEVER change.** Write once, deploy once, done forever.
- **Filesystem IS the API.** `cat`, `echo >>`, `grep` are the only tools needed. No config format to learn.
- **Composable.** Gates are independent. Add/remove gates without affecting others.

## Weaknesses

- **More files to manage.** 8+ files across 2 gate directories for 2 gates, vs 1 JSON file or 1 bash script.
- **Setup script required.** Initial registry creation isn't automatic. Run once + after gate structure changes.
- **Third-party skills can't self-register.** /ce:work needs manual registration. The Observer aspiration is only partially realized -- we observe for skills we own, but manually register for skills we don't.
- **Directory archaeology for debugging.** To understand the system: `ls registry/`, `cat` each file. More files to read than a single JSON or bash script.
- **Newline/encoding sensitivity.** Windows line endings (`\r`) could cause silent grep misses. Mitigated with `tr -d '\r'` in hook scripts.
- **Alias proliferation persists.** Still must list `ce:work`, `ce-work`, `compound-engineering:ce-work`. Same problem as all approaches when you don't own the skill.
