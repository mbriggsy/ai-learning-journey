---
title: A nesting-breaking CSS edit passes dev serving AND live visual verification because browsers error-recover — only the build minifier refuses, and the loud failure masks a quiet re-scoping bug
date: 2026-07-02
phase: Act 3 (U9b tail — the cold-read fixes)
modules: [ui]
tags: [css, media-query, edit-blast-radius, dev-vs-build, error-recovery, lightningcss, verification]
---

## Problem

A text-anchored edit added rules inside `result.css`'s laptop `@media` block. The dev
server served it fine; the full live Chromium verification (three seeds, three
viewports, measured overflow) passed. `pnpm build` then failed:
`[lightningcss minify] SyntaxError: Unexpected end of input`.

## Root Cause

The edit's `old_string` anchored on the `@media (min-width: 68rem) {` opening line plus
the first rule, and the replacement re-emitted its own structure — closing the media
block right after the inserted rules. Everything that had lived BELOW the insertion
point inside that block (four rule groups) was stranded at GLOBAL scope, with the
block's original `}` left orphaned at end-of-file.

Two failure layers, and only the shallow one was loud:

- **Loud, harmless:** the orphan `}` breaks strict parsing — but only the production
  minifier (lightningcss) is a strict parser. Vite dev serves CSS un-minified, and
  browsers ERROR-RECOVER a stray `}` per the CSS spec (drop the invalid token, keep
  going), so dev + the live eye saw nothing.
- **Quiet, dangerous:** the stranded rules silently applied at ALL widths (laptop-only
  `max-width` promotions now global). The live verification still passed because those
  rules were coincidentally near-inert at the tested widths — the bug's visible surface
  was a few `max-width` caps that phone's single column already respected.

Without the orphan brace (e.g. if the edit had balanced its braces while still
stranding the rules), NOTHING would have failed — not dev, not the eye, not the
minifier — and laptop-scoped layout would have quietly leaked to every viewport.

## Fix

Moved the stranded rule groups back inside the `@media` block (one edit, orphan brace
consumed). Re-ran the full battery; `pnpm build` green, live re-verified at laptop and
phone (phone padding back to its own rhythm — proof the leak had been real).

## Key Insight

An edit inside a NESTED CSS block has a blast radius of "every rule after the insertion
point until the block's close" — re-read from the edit to the closing brace, don't trust
the diff hunk. And know your verifiers' parsing strictness: dev serving and real
browsers error-recover malformed CSS, so a green dev walk + a passing live eye prove
nothing about structure; the production minifier is the only strict CSS parser in this
toolchain. Corollary: a build FAILURE on a CSS edit deserves a scoping audit, not just a
brace patch — the syntax error is often the loud symptom of rules that silently moved
scope, and the balanced-brace variant of the same mistake fails nowhere.

## Also Applies To

- Any brace-nested language edited by text anchor where some consumers error-recover
  (HTML parsers, YAML block scalars, nginx configs reloaded with `-t` vs not).
- The dev-vs-build asymmetry family: 001 (strict CSP is a build-output contract),
  057 (a gate reading a prebuilt artifact) — "green in dev" spans less than it implies.
