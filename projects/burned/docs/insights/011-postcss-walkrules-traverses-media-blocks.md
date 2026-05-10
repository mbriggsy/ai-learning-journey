---
title: PostCSS walkRules traverses into @media blocks — reduced-motion values clobber baseline
date: 2026-04-12
modules: [src/client/shared/tokens/__tests__/motion-token-sync.test.ts]
tags: [postcss, testing, css, reduced-motion, parsing]
---

## Problem

`motion-token-sync.test.ts` parsed `primitives.css` and iterated all `:root` rules to build a map of CSS custom properties. Every motion duration test failed — the expected `150ms` was reading as `0ms`.

## Root Cause

`root.walkRules(':root', callback)` traverses the entire AST, including `:root` rules nested inside `@media (prefers-reduced-motion: reduce)`. The reduced-motion block zeroes decorative durations (`--motion-duration-fast: 0ms`). Since the test uses `Map.set()`, the _last_ `:root` block wins — which is the zeroed one.

## Fix

Added parent-chain check in the walk callback: climb `rule.parent` until root, skip if any ancestor is an `@media` at-rule.

```typescript
root.walkRules(':root', (rule) => {
  let parent = rule.parent
  while (parent) {
    if (parent.type === 'atrule' && (parent as postcss.AtRule).name === 'media') return
    parent = parent.parent
  }
  rule.walkDecls(...)
})
```

## Key Insight

**PostCSS `walk*` methods traverse the full AST by default — `@media`, `@layer`, `@supports` nesting is invisible to them.** Any test that builds a property map from CSS must explicitly filter out conditional blocks, or the last-declaration-wins behavior silently picks up override values.

## Also Applies To

- Any PostCSS-based linter or codegen that reads `:root` custom properties
- CSS files with `@media (prefers-color-scheme)` light/dark forks
- CSS files with `@layer` where the same property appears in multiple layers
