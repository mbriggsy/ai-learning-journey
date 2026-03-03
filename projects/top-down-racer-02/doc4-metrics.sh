#!/bin/bash
# Doc 4 Metrics Collector
# cd C:\Users\brigg\ai-learning-journey\projects\top-down-racer-02
# Then in Git Bash:  bash doc4-metrics.sh > doc4-metrics-output.txt

echo "============================================"
echo "DOC 4 METRICS COLLECTOR — $(date)"
echo "============================================"
echo ""

echo "=== 1. LINES OF CODE (source, no tests) ==="
for dir in src/engine src/renderer src/ai src/types src/utils src/tracks; do
  echo ""
  echo "--- $dir/ ---"
  find "$dir" -name "*.ts" 2>/dev/null | while read f; do echo "$(wc -l < "$f") $f"; done | sort -rn
  echo "TOTAL: $(find "$dir" -name '*.ts' -exec cat {} + 2>/dev/null | wc -l)"
done
echo ""
echo "--- python/ (source only) ---"
find python -name "*.py" -not -path "*/tests/*" -not -path "*/.venv/*" 2>/dev/null | while read f; do echo "$(wc -l < "$f") $f"; done | sort -rn
echo "TOTAL: $(find python -name '*.py' -not -path '*/tests/*' -not -path '*/.venv/*' -exec cat {} + 2>/dev/null | wc -l)"
echo ""
TOTAL_TS=$(find src -name "*.ts" -exec cat {} + 2>/dev/null | wc -l)
TOTAL_PY=$(find python -name "*.py" -not -path "*/tests/*" -not -path "*/.venv/*" -exec cat {} + 2>/dev/null | wc -l)
echo "GRAND TOTAL — TS: $TOTAL_TS | Python: $TOTAL_PY | Combined: $((TOTAL_TS + TOTAL_PY))"
echo ""

echo "=== 2. TEST CODE LINES ==="
echo ""
find tests -name "*.ts" 2>/dev/null | while read f; do echo "$(wc -l < "$f") $f"; done | sort -rn
echo "TOTAL TS tests: $(find tests -name '*.ts' -exec cat {} + 2>/dev/null | wc -l)"
echo ""
find python/tests -name "*.py" 2>/dev/null | while read f; do echo "$(wc -l < "$f") $f"; done | sort -rn
echo "TOTAL Python tests: $(find python/tests -name '*.py' -exec cat {} + 2>/dev/null | wc -l)"
echo ""

echo "=== 3. FILE COUNTS ==="
echo "Source .ts:    $(find src -name '*.ts' | wc -l)"
echo "Test .ts:      $(find tests -name '*.ts' | wc -l)"
echo "Python src:    $(find python -name '*.py' -not -path '*/tests/*' -not -path '*/.venv/*' | wc -l)"
echo "Python tests:  $(find python/tests -name '*.py' 2>/dev/null | wc -l)"
echo ""

echo "=== 4. DEPENDENCY CONFINEMENT (all should be 0) ==="
echo "pixi in engine:       $(grep -rl 'pixi' src/engine/ 2>/dev/null | wc -l)"
echo "pixi in ai:           $(grep -rl 'pixi' src/ai/ 2>/dev/null | wc -l)"
echo "ws in renderer:       $(grep -rl \"from.*'ws'\" src/renderer/ 2>/dev/null | wc -l)"
echo "Math.random in engine: $(grep -r 'Math.random' src/engine/ 2>/dev/null | wc -l)"
echo "renderer in engine:   $(grep -rl 'renderer' src/engine/ 2>/dev/null | wc -l)"
echo ""
echo "--- External imports in src/engine/ (should be empty) ---"
grep -rn "from ['\"]" src/engine/ 2>/dev/null | grep -v "from ['\"]\.\." | grep -v "from ['\"]\." || echo "(none — engine is self-contained)"
echo ""

echo "=== 5. CIRCULAR DEPENDENCY CHECK ==="
npx madge --circular --extensions ts src/ 2>&1 || echo "(install with: pnpm add -D madge)"
echo ""

echo "=== 6. TYPESCRIPT STRICT MODE ==="
grep -A2 '"strict"' tsconfig.json 2>/dev/null
echo ""
echo "--- tsc --noEmit ---"
npx tsc --noEmit 2>&1 | tail -5
echo "tsc exit code: $?"
echo ""

echo "=== 7. TEST RESULTS ==="
echo "--- vitest ---"
npx vitest run --reporter=verbose 2>&1 | tail -30
echo ""
echo "--- pytest (KILL BRIDGE FIRST if running separately) ---"
if [ -f "python/.venv/Scripts/activate" ]; then
  source python/.venv/Scripts/activate 2>/dev/null
  pytest python/tests/ -v 2>&1 | tail -25
  deactivate 2>/dev/null
elif [ -f "python/.venv/bin/activate" ]; then
  source python/.venv/bin/activate 2>/dev/null
  pytest python/tests/ -v 2>&1 | tail -25
  deactivate 2>/dev/null
else
  echo "(venv not found)"
fi
echo ""

echo "=== 8. GIT STATS ==="
echo "Total commits: $(git log --oneline | wc -l)"
echo "Authors: $(git log --format='%an' | sort -u | tr '\n' ', ')"
echo ""
echo "Commits per day:"
git log --format='%ad' --date=short | sort | uniq -c | sort -rn
echo ""
echo "First: $(git log --reverse --format='%ad %s' --date=short | head -1)"
echo "Last:  $(git log --format='%ad %s' --date=short | head -1)"
echo ""

echo "=== 9. LARGEST SOURCE FILES (top 15) ==="
find src python -name "*.ts" -o -name "*.py" 2>/dev/null | grep -v node_modules | grep -v .venv | while read f; do echo "$(wc -l < "$f") $f"; done | sort -rn | head -15
echo ""

echo "============================================"
echo "DONE — Paste this entire output back to Claude"
echo "============================================"
