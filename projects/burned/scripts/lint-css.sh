#!/bin/bash
# scripts/lint-css.sh — Phase 1 token-boundary enforcement
# Six rules that enforce the token contract. Runs as part of `pnpm lint`.
set -e

ERRORS=0

# Rule 1 — Ban custom property DEFINITIONS in component .module.css files.
# Tokens live in src/client/shared/tokens/ only.
# Exception: lines with `/* cascade-override */` are intentional context-scoped
# token overrides (legitimate CSS-cascade pattern, e.g., a layout container
# narrowing a sizing token for its descendants).
BAD=$(grep -rEn '^\s*--(color|space|motion|text|size|radius|shadow|z|inset)-[a-z0-9-]+\s*:' \
  src/client/player src/client/board src/client/shared \
  --include='*.module.css' 2>/dev/null \
  | grep -v 'cascade-override' || true)

if [ -n "$BAD" ]; then
  echo "ERROR [Rule 1]: Custom property definitions found in component CSS."
  echo "Tokens must live in src/client/shared/tokens/, not component modules."
  echo "$BAD"
  ERRORS=$((ERRORS + 1))
fi

# Rule 2 — Ban @keyframes with hardcoded durations.
# Every animation: declaration must reference a --motion-duration-* token.
BAD=$(grep -rEn 'animation:\s*[a-zA-Z0-9_-]+\s+[0-9.]+m?s' \
  src/client --include='*.module.css' 2>/dev/null \
  | grep -v 'var(--motion-duration' || true)

if [ -n "$BAD" ]; then
  echo ""
  echo "WARNING [Rule 2]: Hardcoded animation duration. Use var(--motion-duration-*)."
  echo "(Warning-level on pre-migration files; will become error after Phase 4.)"
  echo "$BAD"
  # Warning only for now — existing pre-migration files may have hardcoded values.
  # Phase 4 motion consolidation converts them all.
fi

# Rule 3 — Ban position: fixed in phone-view components.
# Use position: sticky inside a flex column (WebKit bug 297779).
BAD=$(grep -rEn 'position:\s*fixed' src/client/player \
  --include='*.module.css' 2>/dev/null || true)

if [ -n "$BAD" ]; then
  echo ""
  echo "WARNING [Rule 3]: position: fixed in phone view. Use position: sticky inside a flex column."
  echo "See Phase 1 §5 landmine 7 (WebKit bug 297779)."
  echo "$BAD"
  # Warning only — Phase 2 migrates these.
fi

# Rule 4 — Ban dvh/vh in semantic.phone.css.
# dvh shimmers on iOS scroll. Phone is svh-only.
BAD=$(grep -En '\b(dvh|vh)\b' src/client/shared/tokens/semantic.phone.css 2>/dev/null || true)
if [ -n "$BAD" ]; then
  echo ""
  echo "ERROR [Rule 4]: dvh/vh in semantic.phone.css. Phone is svh-only."
  echo "$BAD"
  ERRORS=$((ERRORS + 1))
fi

# Rule 5 — Ban color-mix(in oklch, ...) everywhere.
# Safari bug renders some blues as pink. Use in oklab.
BAD=$(grep -rEn 'color-mix\(\s*in\s+oklch' src/client --include='*.css' 2>/dev/null || true)
if [ -n "$BAD" ]; then
  echo ""
  echo "ERROR [Rule 5]: color-mix(in oklch) — Safari renders some blues as pink. Use in oklab."
  echo "$BAD"
  ERRORS=$((ERRORS + 1))
fi

# Rule 6 — Ban --color-accent-neon + pseudo-class combinations.
# Neon is a 2-spot accent; growing it needs a proper scale.
BAD=$(grep -rEn 'color-accent-neon.*:(hover|focus|active|disabled)' \
  src/client --include='*.module.css' 2>/dev/null || true)

if [ -n "$BAD" ]; then
  echo ""
  echo "ERROR [Rule 6]: --color-accent-neon with pseudo-class state. Neon is a spot color, not a scale."
  echo "$BAD"
  ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo "lint-css: $ERRORS rule(s) failed."
  exit 1
fi

echo "lint-css: all rules passed."
