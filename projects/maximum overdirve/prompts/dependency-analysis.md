# Dependency Analysis

A phase is blocked by a human gate. Your job: determine which other phases can proceed independently.

## Current State

{{STATE_CONTENT}}

## Roadmap

{{ROADMAP_CONTENT}}

## Spec

{{SPEC_CONTENT}}

## Instructions

Analyze the dependencies between phases and determine what work can proceed despite the blocked phase.

### For Each Non-Blocked, Non-Complete Phase:

1. **Does it use any OUTPUT from the blocked phase?** (files, modules, APIs, data)
2. **Does it MODIFY anything the blocked phase also modifies?** (merge conflicts, shared state)
3. **Could it be planned/strengthened even if it can't code yet?** (useful for maximizing progress)

### Dependency Types

- **none**: Phase is fully independent. Can proceed through plan → strengthen → code → verify.
- **soft**: Phase can be planned and strengthened, but coding should wait for the blocked phase. No code overlap, but logical dependency.
- **hard**: Phase directly depends on blocked phase's output. Cannot proceed at all.

### Output Format

```
## Skip-Ahead Analysis

### Blocked Phase(s): [list]

| Phase | Dependency | Action | Rationale |
|-------|------------|--------|-----------|
| N | none/soft/hard | proceed/plan-only/blocked | [why] |

### Recommended Execution Order
1. [Phase N] — [what to do]
2. [Phase M] — [what to do]

### Risks
- [Any risks of proceeding with partial context]
```

### Rules
- **Maximize autonomous progress.** The human is away. Do everything possible without them.
- **Be conservative on hard dependencies.** If you're not sure, call it soft — plan and strengthen, but don't code.
- **Planning and strengthening are always safe.** Even hard-dependent phases can be planned (the plans just can't code yet).
