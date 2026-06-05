---
title: "`require-trusted-types-for 'script'` breaks `new Worker(new URL(...))` — the app renders nothing"
date: 2026-06-05
phase: P1·U0
modules: [vercel.json, src/store/engineClient.ts]
tags: [csp, trusted-types, web-worker, comlink, security]
---

## Problem
Adding `require-trusted-types-for 'script'` to the CSP (the natural XSS-sink capstone for the "an injected script must not read the model" threat model) made the app render NOTHING — blank page, React never mounted, worker never constructed.

## Root Cause
The `Worker` constructor's URL argument is a Trusted Types **injection sink**. Under `require-trusted-types-for 'script'`, `new Worker(new URL('./x.worker.ts', import.meta.url), {type:'module'})` throws `This document requires 'TrustedScriptURL' assignment` — the engine worker fails to construct and the error aborts the render. Verified in-browser: 2 console errors, blank page.

## Fix
Backed Trusted Types OUT (kept the rest of the strict CSP). To adopt later: mint the worker URL through a policy —
`const p = trustedTypes.createPolicy('worker', { createScriptURL: u => u }); new Worker(p.createScriptURL(url), {type:'module'})` — allowlist the policy via a `trusted-types` directive, and roll out behind `Content-Security-Policy-Report-Only` first.

## Key Insight
Trusted Types is NOT a free CSP add-on. It turns DOM/script-URL sinks into hard errors — including ones your OWN code uses legitimately (Worker construction). "Looks like just another directive" is exactly how it silently breaks rendering. Always verify it in a real browser and roll it out report-only.

## Also Applies To
Any app constructing Workers/ServiceWorkers from URLs, setting `<script src>` via JS, or using innerHTML sinks (directly or via a library) under Trusted Types.
