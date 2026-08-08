---
title: The PDF renderer did not crash on the glyph it cannot print — it silently printed a different one
date: 2026-08-08
phase: Phase 1 — the generator (U6)
modules: [scripts/render_pdf.py, draft-kit/family-feud-cheat-sheet.pdf, draft-kit/players_data.json]
tags: [reportlab, pdf, encoding, latin-1, cp1252, winansi, zapfdingbats, silent-failure, detector]
---

## Problem

U6's plan forecast its own crash, in detail: *"a badge glyph Helvetica cannot encode kills the PDF
renderer **after** the HTML has been written. Outcome: new HTML, old PDF, gate green, a non-zero
exit nobody reads."* The whole write-all-or-write-none invariant was designed around containing
that crash, and the guard against it was **"assert every glyph is Latin-1 encodable."**

Both halves were wrong, and each was wrong in the direction that hides the problem.

## Root Cause

**The crash does not happen.** Measured on reportlab 5.0.0 — `canvas.drawString` with `⚠` (U+26A0)
or `🎯` (U+1F3AF) in Helvetica raises nothing. `showPage()` and `save()` complete and emit a valid
PDF. Inspecting `/BaseFont` in the output shows what it did instead:

```
ascii-only     fonts=['Helvetica']
em-dash        fonts=['Helvetica']
warn U+26A0    fonts=['Helvetica', 'ZapfDingbats']    <-- silent font substitution
```

It falls back to **ZapfDingbats** and prints a completely different symbol. Valid PDF, no warning,
wrong glyph on the draft-morning cheat sheet.

**And the prescribed detector is the wrong test.** Latin-1 (ISO-8859-1) stops at U+00FF; reportlab's
Type-1 base fonts use **WinAnsiEncoding (cp1252)**, which is a different set:

| char | latin-1 | cp1252 | renders |
|---|---|---|---|
| `—` U+2014 em-dash | **FAIL** | OK | fine |
| `†` U+2020 dagger | **FAIL** | OK | fine |
| `» ° §` | OK | OK | fine |
| `⚠` U+26A0, `🎯` U+1F3AF | FAIL | FAIL | **substituted** |

The plan names `» † ° §` as the safe set *and* prescribes a test that rejects `†`. The source prose
carries **34 em-dashes**, which the same test rejects wholesale. Implemented literally, the guard
fires on correct data and still misses nothing it was built to catch.

A third instrument failed the same way: `pdfmetrics.getFont('Helvetica').stringWidth()` returns
`w=7.61` for both emoji rather than raising — [`008`](008-a-broken-instrument-returns-zero-and-zero-reads-like-a-finding.md)'s
shape exactly, a plausible number from a tool that answered a different question.

## Fix

- The glyph guard is a **pre-emit assertion over cp1252**, not Latin-1, and not a `try/except`
  around the renderer — there is no exception to catch.
- Keep write-all-or-write-none regardless. It defends every *other* crash route, and its acceptance
  test (inject a `raise` into the renderer, assert zero on-disk bytes changed) is synthetic, so it
  proves the invariant whether or not reportlab itself ever throws.

## Key Insight

**"Does it throw?" is a detector for crashes, not for wrongness — and a library that degrades
gracefully has disabled it.** Graceful degradation is a feature for rendering and a hazard for
verification: the more helpfully a dependency handles bad input, the less its silence means.

Before writing a guard, ask what the failure *actually looks like* — run the bad input through and
watch. A guard designed against an imagined failure mode inherits none of the real one's shape, and
being derived from the plan rather than from the library is what let this one be wrong twice
(wrong encoding, wrong trigger) while reading as rigorous.

## Also Applies To

- Any font/encoding boundary: HTML → PDF, Unicode → terminal ([`003`](003-the-locale-default-broke-a-script-nobody-had-run-on-this-os.md)
  is this same seam, in the direction that *does* raise).
- Image libraries that resample rather than reject, CSV readers that coerce rather than fail, and
  JSON parsers in lenient mode — all of them convert a loud failure into a quiet difference.
- Any assertion naming a *standard* (Latin-1, ASCII, UTF-8) rather than the *implementation's actual
  encoding*. Verify which one the library uses; the names are close enough to swap unnoticed.
