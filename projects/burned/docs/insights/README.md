---
title: BURNED insights — categorized index
type: reference
date: 2026-05-09
---

# BURNED insights — categorized index

53 numbered insights captured during the BURNED build. Engineering insights
document HOW THE CODE/STACK WORKS (bug → root cause → fix). Process insights
document HOW WE WORK (doc shape, agent behavior, review patterns,
instrumentation methodology).

When adding a new insight, file it here with a one-line description in the
appropriate bucket. Number monotonically; don't reuse numbers.

## Engineering

| # | Title | One-line takeaway |
|---|---|---|
| 001 | useOptimistic is incompatible with WebSocket + useSyncExternalStore | Fire-and-forget WS doesn't fit React's transition contract — build overlay into store |
| 002 | Framer Motion VisualElement chunk is initial (modulepreloaded), not lazy | "Lazy" in LazyMotion is the feature bundle only; check `dist/*.html` modulepreload tags |
| 003 | Burned card bypassed by paw-tier deck composition despite explicit warning | Items outside a classification system must bypass it entirely, not be special-cased |
| 004 | Nope chain breaks effect resolution — reading identity from a mutated discard pile | Never derive identity from collections other operations mutate between write and read |
| 005 | Stale server timers silently fire on superseded state | Async timers acting on mutable state need monotonic generation tags |
| 006 | CSS fallback declarations must precede the modern property, not follow it | Cascade order: fallback first, modern second — otherwise fallback kills the feature |
| 007 | Redundant timeout layers mask each other when an inner mechanism resets the outer | Two timers sharing a reset signal collapse to one — drop the slower layer |
| 010 | Art-directed palettes fail Radix APCA guarantees without significant lightness adjustments | Aesthetic palettes need 3-5× the tuning budget for accessibility compliance |
| 011 | PostCSS walkRules traverses into @media blocks — reduced-motion values clobber baseline | `walk*` traverses full AST; filter ancestor at-rules when building property maps |
| 012 | Unlayered CSS modules silently override layered ones | Unlayered CSS is maximally specific against `@layer` — every new file needs the wrap |
| 013 | `contain: layout` (and siblings) creates a containing block that traps `position: fixed` descendants | `contain`/transform/filter ancestors break fixed-to-viewport — portal or hoist out |
| 014 | `backface-visibility: hidden` breaks when Chrome collapses `rotateY(0deg)` to a 2D identity matrix | Use opacity crossfade at edge-on midpoint; backface-culling needs 3D context Chrome drops |
| 015 | Framer-managed transforms lose the CSS cascade war — can't layer CSS `:active` on the same element | One source of truth per CSS property per element — apply press feedback to a child |
| 016 | Continuous CSS animations override `:active { transform }` every frame — must `animation: none` in `:active` | Animation frames beat static pseudo-class values — suspend animation in `:active` |
| 017 | React re-renders read whatever's in the store AT notify time — write ALL slices before triggering notify | Update every slice components read together before calling `notify()` |
| 021 | Strip-before-validate is an atomicity-gap bug class, not a single bug | Validate ALL preconditions before any side effect; A-01 was one of five same-class bugs |
| 022 | partyserver's `cloudflare:` module scheme makes `room.ts` unimportable in Vitest-Node tests | Extract pure logic into a module that doesn't transitively import partyserver |
| 023 | partyserver `connection.close()` inside `onConnect` under hibernation does not promptly deliver a close frame | Auth-reject at the HTTP layer (fetch handler), not inside `onConnect` |
| 024 | `wrangler dev` does not propagate Node process env to workerd — must use `--var` CLI flags | Subprocess env-readback tests prove nothing — verify via `/health` or binding probe |
| 025 | `ws` package's `new WebSocket(url)` sends no Origin header by default — server origin checks reject silently | Set `Origin` explicitly on Node WS clients; `ws` defaults differ from browser WebSocket |
| 026 | Undrained Node subprocess stdio pipes stall the child at ~64 KB of output | `stdio: 'pipe'` without a drain is a timebomb — drain or use `'ignore'` |
| 028 | god-events broadcast cumulative event arrays, not deltas — flatten via `.slice(priorLen)` or double-count | Wire format carries full history each broadcast; consumers must dedupe by tail-slice |
| 030 | Pub/sub feature-detection breaks when emission is gated by a transient internal flag | Capability probes need contract-shaped emissions, not state-gated ones |
| 032 | Phase 6 Option A harness has no mechanism to start the game from the lobby | "Cleared Hot" lives only on board view — orchestrator must own the start click |
| 033 | Board-view-launcher's 60s default timeout is too tight for real Claude-agent dispatch | Real agent dispatch is 30-90s+; smoke-test timing estimates underspec live runs |
| 034 | God-subscriber didn't respond to server heartbeat pings → killed at 40s → silent telemetry loss | Long-lived WS clients must reply to server pings or the heartbeat closes them |
| 035 | SmartActionBox breathe animation defeats Playwright element-stability check | Move continuous keyframes onto `::after` so DOM stability checks see steady-state |
| 036 | PartySocket's default maxRetries:Infinity + browser-native WS error logs = unbounded reconnect | Cap reconnect retries; browser WS error logs storm the console at >100Hz |
| 037 | AnimatePresence mode='wait' replaces the click target on state swap — Playwright ref goes stale | State-swapping wrappers invalidate refs mid-click — server still sees the action |
| 038 | Server inactivity-kick alarm closed god observer along with players | Observer connections need exemption from gameplay-inactivity timers |
| 039 | Tap-discrimination timer strands on cross-input rapid second event | Cross-card double-tap timer must cancel on ANY second pointer event, not just same-card |
| 040 | Multi-violation files need multi-error surfaces — and LLM authors need concrete examples | Aggregate all schema errors per file; prompt LLM authors with examples not field lists |
| 041 | Orchestrator gate on product minimum, not configured roster | Launcher polled UI minimum (2 players) instead of configured seat count — N-th seat misses |
| 043 | GSAP `'<'` position parameter anchors to START of previous tween, not end | `'<'` = start-of-previous, `'>'` = end-of-previous — opposite of intuition; clipped beats 30% |
| 045 | Aria-live region staleness mistaken for visible toast persistence | Live regions need deferred clear; agent aria snapshots can't tell stale from current |
| 047 | Framer `layout="position"` + `popLayout` is a structural fast-snap, not an animate.transform conflict | popLayout reflow is one-frame by design — don't chase a transform-conflict ghost |
| 048 | AnimatePresence has a one-rAF window where content reads as `transform: none` before `initial` applies | Skip frame 0 in per-rAF samplers — Framer's `initial` lands one tick after mount |
| 051 | Prose CVD recommendations in followup docs are wrong-direction more often than not | Hue intuition fails under deuter/protan/tritan transforms — probe oklab before editing primitives |
| 054 | `pnpm install` silently no-ops nested packages outside the workspace `packages:` glob | Sub-second `Done in X ms` with no `Progress:` line = silent skip; ship `.npmrc ignore-workspace=true` |
| 055 | Node `process.env` is case-insensitive on Windows but case-sensitive on POSIX — silently masks mixed-case `.env` drift | A green Windows render proves nothing about Linux/CI; normalize `.env` to UPPER_SNAKE_CASE or fall back across cases |
| 067 | Scene cue startFrames spaced against expectedFrames overlap when actualFrames overrun | Phase 1 budgets ≠ Phase 2 truths — read frames from audio-manifest.ts (actualFrames + buffer), never expectedFrames slots |

## Process

| # | Title | One-line takeaway |
|---|---|---|
| 008 | Adversarial swarm review — "maximum overdrive" due diligence | Seven hostile-persona agents over the full codebase catch what diff-scoped review can't |
| 009 | Authoring BURNED's product specification — lessons from a 1M-token session | Spec → plan → code transitive enforcement; specs are loaded every session, plans aren't |
| 018 | Generative-image model priors are unbreakable by prompt engineering — remove or recontextualize | Don't argue with Imagen — remove the problem element or recontextualize around it |
| 019 | Surface-coherence plan review misses signature drift — rigor passes need at least one code-grounded reviewer | Confidence scorers don't open cited files; code-grounded personas catch signature mismatches |
| 020 | TypeScript wrappers can't restrict Claude subagents — enforcement lives at the frontmatter tools whitelist | Subagent capabilities cross a process boundary; only the frontmatter `tools:` list enforces |
| 027 | Absence-of-X assertions need presence-of-Y companions — otherwise 'no leak' passes when 'no traffic at all' | Vacuous truth: `∀ x ∈ ∅` is always true — pair every absence assertion with a presence one |
| 029 | Downstream plans reference structured data that upstream only captured as authorial prose | Producer/consumer plan handoffs need explicit schema for every consumer field |
| 031 | Deferring a plan's PREFERRED option for an easier one ships an architectural mismatch | "Option B for now, A later" defers integration-time discovery — preferred for a reason |
| 042 | Calibration catalog drifts from engine event shapes; `coverage: fired 0` is field-name mismatch | Catalog scenario IDs/fields drift from engine card types — verify against source, not prompt-tune |
| 044 | Triage agent fix paths anchor subsequent investigation toward presented hypotheses | Run eye-in-loop / instrumentation FIRST before picking from a triage menu |
| 046 | Debug overlays can mask the very fix they were added to verify | Remove your own diagnostics before re-checking; place overlays away from inspected area |
| 049 | Runtime-gate sensitivity is proven by in-spec fault injection, not by temp production regressions | Paint a synthetic fault inside the test — never edit-prod / revert as your sensitivity check |
| 050 | Agent-eye verification systematically misses perceptual continuities | Light/shadow/motion continuities need eye-in-loop — agent property-checks miss them |
| 052 | When asked to build instrumentation, first check whether existing instrumentation already produced unread data | Promotion bottleneck, not production — read existing harness output before drafting new infra |
| 053 | Seat-agent bug suspicions are hypotheses — verify against the engine event log before treating as a defect | Agent reports are suspicions; ground-truth is `events.jsonl` — verify before patching |
| 066 | Prior-phase exit dispositions can supersede later-plan units — deepening agents miss the "already done" signal | Grep `PHASE-N-EXIT.md` + spike-results.md before executing any unit; exit-doc DROP wins over later-plan re-add |
| 068 | A foreign motion dialect inside a coherent visual album reads "weird" regardless of easing-curve perfection | When one scene reads "off," suspect motion-vocabulary mismatch BEFORE easing — patch path softens the misfit, rip-out path treats the cause |

---

## Frontmatter conventions

Locked 2026-05-09 after a normalization sweep. New insights conform to this shape; sweep agents enforce it.

### Required fields

| Field | Shape | Example |
|---|---|---|
| `title` | One-line summary of the insight (sentence-style). Bare scalar by default; only quote when YAML requires it (leading `-`/`:`/backtick, or contains `: ` mapping separator, or starts with `>`/`|`/`&`/`*`/`!`/`%`/`@`/`?`). | `title: Framer popLayout is a structural fast-snap` |
| `date` | ISO date when the insight was captured. | `date: 2026-05-09` |
| `modules` | Array of file/folder anchors the insight applies to. | `modules: [src/client/shared/DramaOverlay.tsx]` |
| `tags` | Array of lowercase-hyphenated topic tags. | `tags: [framer-motion, layout, runtime-gate]` |

### Optional fields (preserve when present, populate when known)

| Field | When to use | Example |
|---|---|---|
| `severity` | Bug-shaped insights with a clear triage tier. | `severity: P0` |
| `updated` | The insight was revised after initial capture. (Not `revised:` — that name is retired.) | `updated: 2026-05-05` |
| `surface` | The single component / file / area where the insight bites. | `surface: src/client/shared/DramaOverlay.tsx` |
| `discovered_while` | The work-context that surfaced the insight. | `discovered_while: Investigating TODO #17 coverage 0/1 mismatch` |
| `status` | Lifecycle state (CLOSED, OPEN, etc.) when worth tracking. | `status: CLOSED 2026-04-30` |

### Removed fields

- **`phase:`** — was used for "phase context" but values drifted across bare numbers, names, kebab strings, and free-text. No tooling consumed it; phase context lives in the body of each insight. Removed from all 53 files 2026-05-09.
- **`revised:`** — renamed to `updated:` 2026-05-09.

### Body shape (informational, not enforced)

- No H1 — the frontmatter `title` carries it.
- First H2 typically `## Problem` (or domain-equivalent like `## Symptom`, `## What broke`, `## Context`).
- Summary heading is `## Key Insight` (the canonical name; `## Lesson`/`## Outcome`/`## Next` were normalized away 2026-05-09 except where preserving body-section order required a non-banned alternate like `## Follow-up` or `## Resolution`).
