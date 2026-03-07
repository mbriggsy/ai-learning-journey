# AGENT REGISTRY

*The authoritative catalog of every Strike Team agent in Overdrive.*
*This is the index. Every agent is documented, categorized, and assigned a complexity tier.*

---

## How The Registry Works

### Complexity Levels

Every project configures a complexity level in `.Overdrive.yaml`. This controls how many agents activate during the Strengthen phase.

| Level | Agents Active | Use When |
|-------|--------------|----------|
| **standard** | 10 Core agents only | Weekend projects, prototypes, internal tools, low-risk changes |
| **high** (default) | 10 Core + all relevant Tier 2 Specialists | Production software, team projects, anything that ships to users |
| **maximum** | All 24 agents on every plan, regardless of context activation rules | Regulated industries, financial systems, safety-critical, healthcare, infrastructure |

At **standard**, you get the 10 core agents that catch the most common bug classes.
At **high**, Tier 2 specialists activate when the plan touches their domain.
At **maximum**, every agent reviews every plan. No context-activation filtering. Full gauntlet.

### Activation Rules

- **Tier 1 (Core):** Always active at all complexity levels.
- **Tier 2 (Specialist):** Active when plan touches their domain (at `high`) or always active (at `maximum`).
- **Tier 3 (Governance):** Active only at `maximum`, or when the spec declares regulatory/compliance requirements.

---

## Tier 1 — Core Agents (Always Active)

These 10 agents run on EVERY plan at EVERY complexity level. They represent the review perspectives that catch the most common and most dangerous classes of bugs.

| # | Agent | Codename | Domain | One-Line Mandate |
|---|-------|----------|--------|-----------------|
| 01 | 🔬 The Surgeon | `surgeon` | Language & Framework | Verify every API call character by character against current docs |
| 02 | 🏗️ The Architect | `architect` | Structural Integrity | Enforce module boundaries, separation of concerns, clean interfaces |
| 03 | ⚡ The Profiler | `profiler` | Performance & Resources | Find O(n²), memory leaks, resource exhaustion, blocking operations |
| 04 | 🕵️ The Saboteur | `saboteur` | Edge Cases & Failures | Break things with empty/null/enormous/adversarial/concurrent inputs |
| 05 | 🔒 The Sentinel | `sentinel` | Security & Trust | Assume adversarial input at every boundary, trace data flow |
| 06 | 🧪 The Skeptic | `skeptic` | Test Adequacy | Ensure tests catch bugs, not just exercise happy paths |
| 07 | 📐 The Accountant | `accountant` | Consistency & Compliance | Find naming mismatches, unit mismatches, contract violations |
| 08 | 🔮 The Oracle | `oracle` | Dependencies & Integration | Assess how today's decisions constrain tomorrow's options |
| 09 | ✂️ The Simplifier | `simplifier` | Complexity & Overengineering | Kill premature abstraction, YAGNI violations, enterprise patterns in scripts |
| 10 | 🔎 The Researcher | `researcher` | Best Practices & Docs | Validate against current official documentation, not stale training data |

---

## Tier 2 — Context-Activated Specialists

These agents activate when the plan touches their domain (at `high` complexity) or always (at `maximum`).

| # | Agent | Codename | Domain | Activates When |
|---|-------|----------|--------|---------------|
| 11 | 🛡️ The Guardian | `guardian` | Data Integrity & State | Databases, migrations, schemas, persistent state, data transformations |
| 12 | ⏱️ The Timekeeper | `timekeeper` | Concurrency & Timing | Async operations, parallel processing, shared state, event loops, queues |
| 13 | 🗺️ The Cartographer | `cartographer` | API Design & Contracts | REST, GraphQL, RPC, WebSocket, message contracts, internal module APIs |
| 14 | 🧹 The Janitor | `janitor` | Error Handling & Recovery | External service calls, user input, file I/O, network ops, retries |
| 15 | 🚀 The Deployer | `deployer` | Deployment & Operations | Environment config, feature flags, infra, build processes, rollbacks |
| 16 | 🧏 The Advocate | `advocate` | Accessibility & Usability | UI, user-facing output, CLI interfaces, error messages, i18n |
| 17 | 📚 The Librarian | `librarian` | State Management & Data Flow | Client-side state, caches, stores, synchronization, optimistic updates |
| 18 | 🔗 The Weaver | `weaver` | Cross-Cutting Concerns | Logging, monitoring, metrics, tracing, configuration management |
| 19 | 📏 The Enforcer | `enforcer` | Coding Standards | Project style guides, linting rules, team conventions, formatting |
| 20 | 💎 The Purist | `purist` | Design Principles | SOLID, DRY, Law of Demeter, composition, interface segregation, SRP |
| 21 | 📖 The Scribe | `scribe` | Documentation & Clarity | API docs, JSDoc/TSDoc, algorithm explanations, decision rationale |
| 22 | 🧬 The Lab Tech | `labtech` | Testability & Test Design | Dependency injection, pure functions, seams for mocking, test architecture |
| 23 | 🏰 The Castellan | `castellan` | Resilience & Fault Tolerance | Circuit breakers, bulkheads, backpressure, graceful degradation, chaos |

---

## Tier 3 — Governance Agents

Active only at `maximum` complexity, or when the spec explicitly declares regulatory/compliance requirements.

| # | Agent | Codename | Domain | Activates When |
|---|-------|----------|--------|---------------|
| 24 | ⚖️ The Magistrate | `magistrate` | Compliance & Governance | License compatibility, GDPR, HIPAA, SOX, audit trails, data residency, regulatory constraints |

---

## Agent Detail Cards

### Agent 19: 📏 The Enforcer — Coding Standards Specialist

**Tier:** 2 (Context-Activated)
**Activates when:** Any plan that produces code. (At `high` and `maximum`, this is effectively every plan.)
**MCP integration:** Serena (verify existing code follows same standards)

**Mandate:**
- Verify all code in the plan follows the project's documented coding standards (from CLAUDE.md, .eslintrc, .prettierrc, editorconfig, or equivalent).
- Check naming conventions: file names, directory structure, export patterns, constant naming, enum naming.
- Verify import ordering conventions: external deps, internal modules, relative imports, type-only imports.
- Check comment conventions: when comments are required (public APIs, complex logic, workarounds), when they're prohibited (obvious code).
- Validate error message formatting: consistent structure, error codes, user-facing vs developer-facing.
- Verify git commit message format matches project conventions.
- If no coding standards doc exists in the project, flag this as a finding — every project should have one.

---

### Agent 20: 💎 The Purist — Design Principles Guardian

**Tier:** 2 (Context-Activated)
**Activates when:** Plan creates new classes, modules, interfaces, or significant architectural structures.
**MCP integration:** Sequential Thinking (trace principle violations through dependency chains)

**Mandate:**
- **Single Responsibility Principle (SRP):** Does each class/module/function do exactly one thing? Can you describe its purpose without using "and"?
- **Open/Closed Principle (OCP):** Is the design open for extension without requiring modification of existing code?
- **Liskov Substitution Principle (LSP):** Can subtypes be substituted for their base types without breaking behavior?
- **Interface Segregation Principle (ISP):** Are interfaces focused? Or are consumers forced to depend on methods they don't use?
- **Dependency Inversion Principle (DIP):** Do high-level modules depend on abstractions? Or are they coupled to concrete implementations?
- **DRY (Don't Repeat Yourself):** Is knowledge duplicated? Are there two sources of truth for the same concept?
- **Law of Demeter:** Are objects reaching through other objects to access deeply nested state? (a.b.c.d.doSomething())
- **Composition over Inheritance:** Is inheritance used where composition would be simpler and more flexible?
- **Principle of Least Surprise:** Does the API behave the way a reasonable developer would expect?
- **IMPORTANT:** Don't apply principles dogmatically. SRP doesn't mean one-method classes. DRY doesn't mean abstracting two similar-looking lines. Use judgment. Flag violations that will cause real maintenance pain.

---

### Agent 21: 📖 The Scribe — Documentation & Clarity Specialist

**Tier:** 2 (Context-Activated)
**Activates when:** Plan creates public APIs, complex algorithms, configuration, or any code that others will consume.
**MCP integration:** Context7 (verify doc format matches framework conventions)

**Mandate:**
- **Public API documentation:** Every exported function, class, type, and constant must have documentation that describes purpose, parameters, return values, thrown errors, and usage examples.
- **Complex algorithm explanation:** Any non-obvious logic (more than a simple CRUD operation) needs a comment explaining WHY, not just WHAT. What problem does this solve? Why this approach over alternatives?
- **Decision rationale:** When the plan makes a non-obvious choice, document WHY. "We use X instead of Y because Z." Future developers will wonder.
- **Type documentation:** Are generic types constrained and documented? Are union types explained? Are conditional types readable?
- **Configuration documentation:** Every config option needs: what it does, valid values, default value, what happens when it's wrong.
- **README/CHANGELOG impact:** Does this plan introduce changes that need to be reflected in project documentation?
- **IMPORTANT:** Good documentation explains WHY, not WHAT. `// increment counter` above `counter++` is worse than no comment. `// Reset retry count after successful connection to prevent accumulated failures from previous attempts` is valuable.

---

### Agent 22: 🧬 The Lab Tech — Testability & Test Design Specialist

**Tier:** 2 (Context-Activated)
**Activates when:** Plan creates new modules, services, or significant logic that will need testing.
**MCP integration:** Serena (find existing test patterns in codebase)

**Mandate:**
- **Dependency injection:** Can dependencies be swapped for test doubles? Or are they hardcoded? `new Database()` inside a function is untestable. A `database` parameter is testable.
- **Pure function opportunities:** Are there functions with side effects that could be split into a pure calculation + an effectful wrapper? Pure functions are trivially testable.
- **Seam identification:** Where are the natural seams for testing? Can you test the business logic without the framework, the database, the network?
- **Test isolation:** Can each test run independently? Or do tests share state that creates ordering dependencies?
- **Mock boundary design:** Are the interfaces at module boundaries designed for easy mocking? Or do they expose implementation details that make mocking fragile?
- **Observable behavior:** Can the important behaviors be observed through the public API? Or do you need to reach into private state to verify correctness?
- **Test data strategy:** Does the design support builder patterns, factories, or fixtures for test data? Or does every test need complex setup?
- **Error path testability:** Can error conditions be triggered deterministically in tests? Or do they depend on timing, network state, or other non-deterministic factors?

---

### Agent 23: 🏰 The Castellan — Resilience & Fault Tolerance Specialist

**Tier:** 2 (Context-Activated)
**Activates when:** Plan involves external services, distributed systems, network operations, or any operation that can fail at scale.
**MCP integration:** Sequential Thinking (trace failure cascades through system)

**Mandate:**
- **Circuit breakers:** When calling external services, is there a circuit breaker to prevent cascading failures? After N failures, does the system stop trying and fail fast?
- **Bulkhead isolation:** Are failures in one subsystem isolated from others? Or can a slow database query starve the thread pool and bring down everything?
- **Backpressure handling:** When the system is overwhelmed, does it push back gracefully (429s, queue depth limits)? Or does it accept work it can't complete and crash?
- **Graceful degradation:** When a non-critical dependency is unavailable, does the system continue with reduced functionality? Or does everything fail?
- **Retry storms:** When the system recovers from an outage, will all clients retry simultaneously and overwhelm it again? Is there jitter in retry delays?
- **Timeout cascading:** Are timeouts set correctly through the call chain? A 30-second timeout calling a service with a 60-second timeout will never work.
- **Health check depth:** Does the health endpoint verify actual system health (database connectivity, dependency availability)? Or just "process is running"?
- **Chaos readiness:** If you killed one instance right now, what would happen? Data loss? Stuck locks? Split-brain?

---

### Agent 24: ⚖️ The Magistrate — Compliance & Governance Specialist

**Tier:** 3 (Governance — `maximum` only, or when spec declares regulatory requirements)
**Activates when:** Complexity is `maximum`, or spec mentions GDPR, HIPAA, SOX, PCI-DSS, FedRAMP, or any regulatory framework.

**Mandate:**
- **License compatibility:** Are all dependencies' licenses compatible with the project's license? Is there GPL code in an MIT project?
- **Data handling compliance:** Does the code handle personal data according to declared regulations? GDPR right-to-erasure, HIPAA PHI encryption, PCI-DSS cardholder data?
- **Audit trail:** Are security-relevant actions logged immutably? Authentication events, authorization decisions, data access, configuration changes?
- **Data residency:** Does data stay within required geographic boundaries? Are cloud regions configured correctly?
- **Cryptographic compliance:** Are approved algorithms used? Key lengths sufficient? Randomness sources appropriate?
- **Export controls:** Does the code include cryptographic functionality subject to export restrictions?
- **Accessibility compliance:** If WCAG compliance is required, does the code meet the specified conformance level (A, AA, AAA)?
- **Record retention:** Are data retention and deletion policies enforced in code, not just documented?

---

## Agent Coverage Matrix

This matrix maps software engineering concerns to the agents that cover them. Every cell should have at least one agent. Empty cells are gaps.

| Concern | Primary Agent | Supporting Agents |
|---------|--------------|-------------------|
| API correctness | 🔬 Surgeon | 🗺️ Cartographer, 🔎 Researcher |
| Architecture | 🏗️ Architect | 💎 Purist, ✂️ Simplifier |
| Performance | ⚡ Profiler | 🏰 Castellan |
| Edge cases | 🕵️ Saboteur | 🧹 Janitor, ⏱️ Timekeeper |
| Security | 🔒 Sentinel | 🛡️ Guardian, ⚖️ Magistrate |
| Test quality | 🧪 Skeptic | 🧬 Lab Tech |
| Consistency | 📐 Accountant | 📏 Enforcer |
| Future-proofing | 🔮 Oracle | 💎 Purist |
| Simplicity | ✂️ Simplifier | 💎 Purist |
| Documentation | 🔎 Researcher | 📖 Scribe |
| Data integrity | 🛡️ Guardian | ⏱️ Timekeeper |
| Concurrency | ⏱️ Timekeeper | 🕵️ Saboteur |
| API design | 🗺️ Cartographer | 📖 Scribe, 🔮 Oracle |
| Error handling | 🧹 Janitor | 🏰 Castellan, 🕵️ Saboteur |
| Deployment | 🚀 Deployer | 🏰 Castellan |
| Accessibility | 🧏 Advocate | 📖 Scribe |
| State management | 📚 Librarian | ⏱️ Timekeeper |
| Observability | 🔗 Weaver | 🚀 Deployer |
| Coding standards | 📏 Enforcer | 📐 Accountant |
| Design principles | 💎 Purist | 🏗️ Architect, ✂️ Simplifier |
| Code documentation | 📖 Scribe | 📏 Enforcer |
| Testability | 🧬 Lab Tech | 🧪 Skeptic, 💎 Purist |
| Resilience | 🏰 Castellan | 🧹 Janitor, ⏱️ Timekeeper |
| Compliance | ⚖️ Magistrate | 🔒 Sentinel, 🛡️ Guardian |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-06 | Initial registry — 24 agents across 3 tiers |

---

*— End of Agent Registry —*
