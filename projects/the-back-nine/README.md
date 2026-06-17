# The Back Nine

> **The fuck-off date — computed.**

A **personal** retirement and tax-strategy co-pilot for a married couple. It answers one question — *"Can we walk away, and how do we do it best?"* — as a calm, plain-language confidence statement, then recommends a confidence-graded strategy to get there.

The name is the metaphor: the **back nine** is the second half of the round. Every shot counts more, the scorecard is mostly written, and you're playing for the finish. This is the tool for those holes.

**It is never sold.** Briggsy's laptop plus a handful of financially-literate friends, betting real retirement money. Not a commercial product — and that *raises* the bar rather than lowering it. There is no regulatory net, no terms-of-service disclaimer to hide behind, no "consult a professional" escape hatch. Friends act on this answer with *less* protection than a commercial tool would give them, and they trust it *more*. So the entire load transfers onto two things: **honesty** and **engine validation**. Both get stricter.

**The cardinal rule: calm-but-wrong is the sin.** A confidently-stated wrong recommendation is worse than no tool at all. *"It's just for friends" never excuses it.*

---

## The thesis, in three beats

1. **Tell me where I stand.** *"Your essentials are safe in 10 of 10 futures; your full lifestyle holds in 7."* A distribution of futures, rendered as a number a human can feel — not a single false-precision dollar amount.
2. **Then: here's what we'd do about it.** A recommended, confidence-graded strategy over two coupled tax controls — withdrawal **sequencing** and Roth **conversion** — that funds your budget the tax-smartest way. The full reasoning is always one tap down, never forced on you.
3. **You stay the pilot.** Safety is the default floor. Above it, *you* pick the goal — leave more, pay less tax, or live bigger now — and every recommendation wears its own hedge on the headline.

### The first answer adapts to where you are

- **Not yet retired?** The first magic moment is **the fuck-off date**: two confidence-graded, work-optional dates (one that protects essentials, one that funds your full lifestyle), found by sweeping your household's work-stop date across the same engine. It is a bounded near-retirement on-ramp — *not* a FIRE calculator. v1 projects your stated savings plan honestly; it doesn't pretend to optimize it.
- **Already retired?** The first magic moment is the calm **confidence statement** — the plain-language reading of where the math says you stand.

One product, one engine, two voices.

---

## How it works

The Back Nine is a **local-first PWA**. No backend, no account, no cloud. Your financial picture is entered by hand, encrypted at rest in your browser (AES-GCM under a PBKDF2-hardened key), and never leaves the device. A two-person recovery-phrase + mandatory encrypted export is the survivor's backstop.

The engine is the heart, and it is held to a deliberately severe standard.

```mermaid
flowchart TD
    subgraph Engine["src/engine — PURE · deterministic · no clock, no entropy"]
      DRAW["ONE shared market draw per year<br/>(pure fn of path × horizon)"]
      SPINE["Monte Carlo spine + drawdown policy<br/>(validated vs Trinity / Bengen)"]
      TAX["Tax overlay — zero-draw transform<br/>brackets · RMD · SS provisional income"]
      HEALTH["Healthcare overlay — zero-draw<br/>ACA fixed-point · IRMAA lag · HSA"]
      DRAW --> SPINE --> TAX --> HEALTH --> DIST["distribution → confidence"]
    end
    DIST --> ANS["The first answer<br/>(date, or confidence statement)"]
    DIST --> SOLVER["Solver — ranks strategies<br/>on IDENTICAL draws (CRN)"]
    SOLVER --> REC["The recommendation<br/>confidence-graded · hedge on the headline"]
```

A few of the contracts that make the answer trustworthy:

- **One shared market draw per year, common across every account bucket** (pre-tax / Roth / taxable / HSA) — buckets differ only in *tax treatment*, never in luck. This Common Random Numbers rule is what lets the solver rank candidate strategies on *identical* futures: the winner won because it was better, not because it drew a kinder market.
- **Every overlay reduces byte-identically to the validated spine when it's off.** Turn off tax, healthcare, and the earned-income bridge, and the engine reproduces the Trinity/Bengen golden cases bit-for-bit on the same seed. The trustworthy core is never silently perturbed.
- **Golden numbers are derived independently, never by the engine's own formula.** A fixture the engine computes against itself proves the code *runs*, not that it's *right*. Trinity, Bengen, the tax math, and the ACA/IRMAA expected values are each derived by a separate path (hand / spreadsheet / published calculation).
- **No in-range default fallbacks.** A missing input is a loud sentinel that throws — never a plausible-looking `?? 0.04` that makes "we don't know" indistinguishable from "we measured." Inside a tax or ACA fixed-point, that ambiguity inverts answers.
- **Every dated tax/health figure lives in one canonical, year-keyed table** that the engine, the plan, the tests, and the copy-guard all read. A number is never re-typed. The ACA legislative entry re-verifies on every build — it can flip the entire pre-65 model, and a stale figure there is a quiet catastrophe.
- **A strict CSP ships via HTTP response headers** (`script-src 'self'`, no inline, no eval, `connect-src 'self'`), enforcement-tested in real Chromium — the in-session decrypted model is guarded against injected page scripts.

When the recommendation layer lands, it will be gated *structurally*: the solver cannot speak until a validation harness — an optimality oracle, ranking-stability checks, and held-out-seed grade calibration — mints a token it requires to run. Recommending on unverified fixtures is a compile error, not a matter of discipline.

---

## Where the build is

The MVP is four acts. Each is a real milestone with its own plan, gates, and verification.

| Act | What it is | State |
|---|---|---|
| **1 — Engine** | The deterministic engine + tax & healthcare overlays + accumulation projection + the date-search + the encrypted store | ✅ **Complete, reviewed, pinned** |
| **2 — First Answer** | The guided account-level intake → the state-adaptive first answer → confidence viz → first Save | 🔨 **In progress** — the intake is built & reviewed; the confidence-band viz is next |
| **3 — Controls** | The budget builder + manual sequencing & Roth controls + healthcare surfaces + re-entry | ⬜ Planned |
| **4 — Recommendation** | The validation harness → the solver → the recommendation surface | ⬜ Planned |

Act 1's engine is pinned against primary sources: 25 tax/health constants verified against IRS / CMS / HHS / eCFR / SEC filings, and cohort mortality re-derived from the SSA Trustees-Report survival tables for the household's actual birth cohorts. The guided intake delivers a **live, provisional Monte Carlo reading that sharpens as you type**, proven end-to-end in real Chromium under the enforced CSP.

The engine and intake carry **942 tests across 44 files**, all green (at the Act 2 / U5 milestone), alongside lint, bundle-budget, ACA-freshness, and browser-CSP gates.

---

## Stack

React 19 · TypeScript 5.9 (strict-plus) · Vite 8 · Vitest 4 · `fast-check` property tests · `motion@12` · `idb` + `comlink` for the encrypted IndexedDB worker boundary · `zxcvbn-ts` for the passphrase-strength floor. Self-hosted fonts (Fraunces + Source Sans 3). pnpm. No Prettier; ESLint enforces the layer boundaries and engine purity.

The codebase is layered with hard, lint-enforced import boundaries:

```
engine · crypto · store · intake · budget · viz · ui · shared
```

`src/engine/` is **pure** — a deterministic function of `(params, seed)`. It reads no clock, no entropy, no environment; `Math.random`, `Date`, `crypto.getRandomValues`, and `performance` are all lint-banned inside it. The seed is injected by the caller.

---

## Running it

```bash
pnpm install
pnpm dev            # Vite dev server — the app IS the intake flow
```

Quality gates (all run in CI):

```bash
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest run
pnpm lint           # ESLint — layer boundaries + engine purity
pnpm build          # typecheck + production build
pnpm verify:bundle  # initial-JS byte-budget sentinel (≤ 300 KiB entry)
pnpm verify:aca     # fails if the ACA enhanced-subsidy status is stale/unconfirmed
pnpm verify:csp     # real-Chromium CSP enforcement walk (Playwright)
```

---

## Privacy & license

Your data is entered manually, encrypted locally, and never transmitted — there is no server to transmit it to. This is a personal tool, **not for sale and not licensed for use**. It is published here as part of an AI-assisted engineering portfolio, not as a product or as financial advice.

---

## Map of the documentation

Start at [`docs/README.md`](docs/README.md) — the narrator. The set is story-first:

1. **Product — the *why* + *what*** (thesis, cardinal rule, locked decisions, the R1–R40 requirements ledger): [`docs/product.md`](docs/product.md)
2. **Roadmap — *where we are* + *what's next*** (the four acts + the maintained You-Are-Here per-unit status table + the requirement→unit trace): [`docs/roadmap.md`](docs/roadmap.md)
3. **Architecture — *what you must never break*** (the load-bearing engine invariants, one canonical home): [`docs/architecture.md`](docs/architecture.md)
4. **Act plans** [`docs/plans/`](docs/plans/) · **decision records** [`docs/decisions/`](docs/decisions/) · **research** [`docs/research/`](docs/research/) · **glossary** [`docs/glossary.md`](docs/glossary.md)
5. **Project conventions & landmines:** [`CLAUDE.md`](CLAUDE.md) · **work queue:** [`TODO.md`](TODO.md) · **hard-won lessons:** [`docs/insights/`](docs/insights/)
</content>
</invoke>
