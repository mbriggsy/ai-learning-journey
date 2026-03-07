# Gate Check: Phase {{PHASE_NUMBER}}

You are evaluating whether Phase {{PHASE_NUMBER}} can proceed to coding, or if human intervention is required.

## strengthened Plans

{{PLAN_CONTENT}}

## Spec

{{SPEC_CONTENT}}

## Instructions

Review the strengthened plans and determine if any require human intervention before coding. Gate types:

- **external-action**: Human needs to create/provide something (assets, API keys, config)
- **approval**: Human should review before proceeding (high-risk change, public-facing, irreversible)
- **quality-check**: Subjective quality assessment needed (design review, UX review)
- **decision**: Ambiguous situation that needs a human decision

### Evaluate Each Plan

For each plan, answer:
1. Does it reference files or assets that don't exist yet and can't be code-generated?
2. Does it make changes that are irreversible or high-risk?
3. Does it require subjective judgment that code can't verify?
4. Is there an unresolved ambiguity in the spec that affects this plan?

### Output Format

```
## Gate Check Results

### Plan [ID]: [CLEAR / GATE REQUIRED]
- Gate Type: [type, if gate required]
- Reason: [why the gate is needed]
- What the human must do: [specific action]
- Plans that CAN proceed without this gate: [list]

### Summary
- Total plans: [N]
- Clear to code: [N]
- Gated: [N]
- Gate details: [list of gate IDs and actions]
```

### Rules
- **Err on the side of proceeding.** Don't gate things that can be fixed automatically.
- **Missing code files are NOT gates.** The coder will create them. Missing ASSET files (images, fonts, audio) ARE gates.
- **Be specific about what the human needs to do.** "Check the design" is useless. "Review the login page mockup at `designs/login.png` and confirm the layout before we implement it" is useful.
