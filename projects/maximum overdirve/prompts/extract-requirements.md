# EXTRACT REQUIREMENTS

## What This Is

You are a requirements engineer extracting **every verifiable requirement** from a project specification and assigning each one a unique identifier (R-XXX). This is the first step in building a Requirements Traceability Matrix (RTM) — a machine-checkable chain from requirement → plan → test → evidence.

Every empty cell in the final RTM is a gap finding. Every requirement without a test is unverified. Every test without a requirement is unjustified work. The RTM starts here, with a clean, complete, unambiguous list of requirements.

---

## The Specification

{{SPEC_CONTENT}}

---

## Instructions

### Step 1: Read the Entire Spec

Read the entire specification end-to-end. Understand what the project is building, what constraints exist, and what "done" looks like. Pay attention to:
- Explicit requirements ("The system shall...", "Must support...", "Required:")
- Implicit requirements (performance targets, compatibility needs, platform constraints)
- Non-functional requirements (security, accessibility, performance, scalability)
- Locked design decisions that constrain implementation
- Success criteria and acceptance conditions

### Step 2: Extract and Classify Requirements

For every verifiable requirement, assign a sequential ID (R-001, R-002, ...) and classify it:

**Requirement Types:**
- `functional` — What the system does (features, behaviors, capabilities)
- `non-functional` — How well the system does it (performance, security, scalability, accessibility)
- `constraint` — What the system must NOT do or MUST use (locked decisions, technology mandates, compliance rules)
- `interface` — How the system connects to other systems (APIs, protocols, data formats)
- `data` — What data the system manages (models, persistence, validation rules)

### Step 3: Ensure Completeness

**Every requirement must be:**
- **Verifiable** — You can write a test or check that proves it's met
- **Atomic** — It describes ONE thing, not a compound "X and Y and Z"
- **Unambiguous** — Two developers reading it would implement the same thing
- **Traceable** — It can be pointed back to a specific section of the spec

If a spec section contains a compound requirement ("The system must do X, Y, and Z"), split it into R-001 (X), R-002 (Y), R-003 (Z).

If a spec section is vague ("The system should be fast"), make it concrete: "Response time under 200ms for API calls" — or flag it as `needs-clarification` so the human can refine it.

### Step 4: Map to Phases

If the roadmap exists, indicate which phase each requirement is MOST LIKELY to be addressed in. This is advisory — the actual mapping happens during planning. But it helps the Strike Team's Accountant verify coverage.

---

## Output Format

Output ONLY the YAML below — no markdown fences, no preamble, no commentary. Raw YAML only.

```
project: "{{PROJECT_NAME}}"
extracted_at: "[ISO timestamp]"
total_requirements: [N]
source: "{{SPEC_FILE}}"

requirements:
  R-001:
    text: "[The exact requirement, stated as a verifiable assertion]"
    type: functional | non-functional | constraint | interface | data
    source: "[Section or area of spec where this comes from]"
    priority: must | should | could
    estimated_phase: [phase number or null]
    verification_method: "[How to verify: unit test, integration test, manual check, inspection]"
    notes: "[Any context, ambiguity flags, or clarifications]"

  R-002:
    text: "..."
    type: "..."
    source: "..."
    priority: "..."
    estimated_phase: null
    verification_method: "..."
    notes: "..."
```

---

## Rules

- **Extract EVERY requirement.** Missing a requirement means it will never be traced, tested, or verified. Err on the side of extracting too many.
- **Split compound requirements.** "The system must handle X and also Y" becomes two requirements. Atomic requirements are traceable requirements.
- **Be concrete.** "Good performance" is not a requirement. "API response time < 200ms at p95" is a requirement.
- **Include locked design decisions as constraints.** "Must use TypeScript" is requirement type `constraint`. It still needs to be traced.
- **Flag ambiguity.** If a requirement can't be made verifiable without more information, mark it `needs-clarification` in the notes field and write the best interpretation you can.
- **Number sequentially.** R-001, R-002, R-003... No gaps. No sub-numbering (no R-001a). Keep it flat and simple.
- **Output raw YAML only.** No markdown. No commentary. No code fences. The RTM builder parses this programmatically.
