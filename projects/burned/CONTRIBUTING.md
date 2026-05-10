# Contributing to BURNED

BURNED is solo right now (Briggsy + Claude). This file exists for the public-flip transition: future humans, future agents, future contributors who need to understand the project's bar before sending a PR.

## The bar

**Quality is the deliverable, not features.** BURNED has no commercial target, no users, no deadline. It is an engineering proving ground. The deliverable is the standard of the craft — not "shipped feature count," not "tests passing," not "lines of code."

The acceptance test for every visible surface is binary: **"Could this look like a frame from an Archer episode?"** If the answer is no, it is the wrong implementation. Read `docs/PRODUCT-SPECIFICATION.md` §2 (Quality Bar) before proposing any UI change — that section is load-bearing.

## Before you start

1. **Read `CLAUDE.md`** — orientation, guardrails, and pointers to the right reference doc for what you're touching.
2. **Read the relevant `docs/conventions/*.md`** — domain-specific rules. Most BURNED footguns are documented there.
3. **Read `docs/PRODUCT-SPECIFICATION.md`** — the product contract. Locked v1.0; reopening any section needs a product-level reason.
4. **Skim `docs/insights/README.md`** — 53 indexed gotchas, categorized Engineering vs Process. If your work is in a known-fragile area, the insight is probably already filed.

## Workflow

```bash
pnpm install              # one-time setup
pnpm dev:server           # wrangler dev (port 8787)
pnpm dev                  # vite dev (port 5173) — open /board.html and /player.html
```

Before opening a PR:

```bash
pnpm typecheck            # must pass
pnpm test                 # must pass
pnpm lint                 # must pass — import boundaries are ESLint-enforced
pnpm build                # must succeed; check phone bundle stays under 100 KB gzipped
```

## Quality discipline

Three rules that catch the failures everything else misses:

1. **Eye-in-loop for visuals.** Type checking and test suites verify *code correctness*, not *feature correctness*. If a PR touches a visible surface, run the dev server and look at it. If you can't run it, say so explicitly — don't claim success.
2. **Trace root cause, never patch symptoms.** When something breaks, ask "why" until you hit bedrock before editing code. A half-baked first guess wastes more time than ten minutes of real tracing. If you're about to bump a cap, add a timeout, or wrap something in try/catch — stop and ask whether you understand the root cause.
3. **Verify before claiming done.** "Done," "fixed," "shipped," "hardened" require a *seen* outcome in the real environment. Green local tests are not a substitute for an eye on the actual feature.

## Tests

- **Unit / integration:** Vitest 4. Add a test next to the change. Property-based tests via `@fast-check/vitest` for action-sequence properties.
- **Runtime motion gates:** if you touch a component covered by a Playwright shape spec (see `docs/conventions/motion.md`), the gate must still pass.
- **Bundle verification:** `pnpm verify:bundle` greps prod chunks for forbidden strings. New dev hooks (`__gameStore`-style) must be `import.meta.env.DEV` guarded and wired into the sentinel list.

## What's in scope vs not

- **In scope:** quality-of-life improvements anywhere, bug fixes with traced root cause, new test coverage, doc updates that reflect reality, performance work that respects the bundle budget.
- **Out of scope without product-level discussion:** new features, ADR reopens (`docs/PRODUCT-SPECIFICATION.md` §7), changes to the locked rules in `docs/RULES-REFERENCE.md`, deviations from the Archer visual reference (§3 of the spec).

## Reporting issues

Issues that report a bug should include:
- What you expected
- What happened
- Repro steps if possible
- Browser / device if it's a UI bug
- Whether you've checked `docs/insights/` for a known-issue match

## License

See `LICENSE` at the repo root.
