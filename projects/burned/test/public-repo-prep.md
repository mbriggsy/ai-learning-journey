---
title: "Public-repo flip prep checklist"
type: protocol
phase: 5
parent: docs/plans/css-foundation-rebuild/phase-5-verification-acceptance.md
date: 2026-05-06
status: ready
---

# Public-repo flip prep checklist

Run this before flipping the BURNED repo to public visibility. Phase 5
§2.8.5 reserves the actual flip for `TODO.md` deploy phase — this doc
is just the pre-flip review.

## 1. Dreamland S8 reference frames

**Status:** ✅ ALREADY HANDLED. No action required.

Phase 5 plan §2.8.5 anticipated that
`docs/plans/css-foundation-rebuild/dreamland-reference/images/` would be
in git history (fair-use fan-uploaded Archer Wiki captures, allowed for
internal palette research, NOT allowed for public distribution) and
would need `git filter-repo` to purge before public flip.

**Verified at this audit:** the images directory was added to
`.gitignore` (line 35) BEFORE any image was committed. `git ls-files`
on the directory returns zero. `git log --all -- <dir>` returns zero
commits. Images exist on local working trees only; git history is
clean.

The README.md at the directory root IS tracked (URLs + attribution +
fair-use posture documentation). It does not contain the images
themselves and stays in git.

```bash
# Verification commands (re-run before flip to confirm):
git ls-files docs/plans/css-foundation-rebuild/dreamland-reference/images/
# expected: empty output

git log --all --oneline -- docs/plans/css-foundation-rebuild/dreamland-reference/images/
# expected: empty output
```

## 2. Other private content audit

Run before flip to catch anything else that should be private:

```bash
# Secrets / tokens / keys (.env files are gitignored; double-check none committed)
git ls-files | grep -E '^\.env' || echo "OK: no .env files tracked"
git log --all --oneline --all -- '.env*' || echo "OK: no .env in history"

# Temp / debug / session artifacts
git ls-files | grep -E '^temp/|^test-results/|^playwright-report/' || echo "OK"

# Playtest harness session dirs
git ls-files docs/testing/playtest/runs/ | grep -v '\.gitkeep$' || echo "OK"

# Local-only config
git ls-files | grep -E '\.local$' || echo "OK"
```

All grep patterns above should print "OK" (or empty) before flipping
public.

## 3. Memory / personal context

Memory files live at `~/.claude/projects/<repo>/memory/` (per-machine,
per-user). They are NOT in this repo and are NOT a public-flip concern.
This is a sanity reminder, not a check.

## 4. Code comments / commit messages

A grep across `src/` and recent commit messages for anything that
shouldn't be public. The retheme grep sweep
(`test/retheme/grep-sweep.md`) already covers Tier 1 product-language
references. Additional one-time review points:

- Author/contributor name handling in commits (`git log --pretty=format:'%an %ae'`)
- Internal-only system names, hostnames, IPs in code or comments
- Anything attribution-sensitive in the Dreamland reference README

This is a HUMAN review step, not automatable.

## 5. License + attribution

If the repo flips public, a top-level `LICENSE` file is needed. BURNED
is currently private and has no license file. Briggsy chooses the
license at flip time (MIT / Apache-2.0 / proprietary-with-source).

Not a Phase 5 concern — flagged here so it's not forgotten.

## 6. Pre-flip command sequence

```bash
# 1. Confirm clean working tree.
git status

# 2. Run all the verification greps from §1 + §2.
# (Copy-paste from above.)

# 3. Choose + add LICENSE file. Commit.

# 4. Flip visibility:
gh repo edit <repo> --visibility public
```

If any §1 or §2 check fails, STOP. Investigate. Do not flip until the
check passes.
