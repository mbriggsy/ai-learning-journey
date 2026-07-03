---
title: A mount-effect binding a ref to a node inside an open-gated portal binds null in the app's real closed-at-mount shape — green in an always-open test
date: 2026-07-02
phase: P3·U9b (the budget UI component tests)
modules: [src/intake/BudgetBuilder.tsx]
tags: [callback-ref, useEffect-mount, live-region, aria-announce, portal, conditional-render, test-harness-shape, insight-047-family]
---

## Problem

The budget sheet's blocked-Apply screen-reader announce ("a line needs attention…") was DEAD in the
app: pressing Apply while blocked spoke nothing. Typecheck passed, and a naive component test that
rendered the sheet already-open would have passed too. Caught test-first by driving the app's REAL
mount shape (mounted closed, then opened).

## Root Cause

The announcer bound in a `useEffect(…, [])` mount effect: `if (liveRef.current) announcer = create(liveRef.current)`.
But the live-region node lives INSIDE the `open && (…)` portal subtree, and both real mounts (Result,
the governed spend step) mount the sheet CLOSED. At mount, `open` is false → the node doesn't exist →
`liveRef.current` is null → the effect no-ops. `[]` deps means it never re-runs, so when the sheet
later opens the announcer stays null forever. The mount effect ran exactly once, against a tree that
didn't contain its target yet.

## Fix

A callback ref instead of a mount effect: `const bind = useCallback((node) => { announcer = node ? create(node) : null }, [])`,
passed as `ref={bind}` on the live-region div. React calls it with the node when it mounts (each open)
and with null when it unmounts (each close) — the announcer is bound exactly when its node exists.

## Key Insight

A `useEffect(…, [])` that reads a ref binds only what exists at the component's FIRST render. If the
ref's target is inside a conditionally-rendered subtree (a portal gated on `open`, a lazy branch, a
`{cond && …}`), and the component mounts with that branch closed, the effect binds null and never
retries. Use a callback ref for any node whose mount is decoupled from the component's mount. The tell
is a testing one: an always-open harness renders the node at first render, so the mount effect binds
and the test is green — the bug lives only in the app's mount-closed-then-open shape. When a
ref-binding effect drives a user-visible behavior, drive the real closed→open sequence in the test,
not the convenient always-open one. Same family as insight
[[047-a-tiered-consumer-re-fires-identity-keyed-contracts-a-static-one-never-stressed]] (a contract
that's silently correct only because the first/default consumer never stressed it) and
[[048-an-honesty-gate-inline-in-an-undrivable-render-path-is-untested-despite-a-green-suite]] (a
behavior the default test harness structurally can't reach).

## Also Applies To

- Any `liveRef`/`createAnnouncer` idiom mounted inside a modal/portal/drawer that opens after mount —
  the five other announce sites in this repo mount their region UNconditionally, which is why only the
  sheet hit this; the filed `useLiveAnnouncer()` extraction should use a callback ref so it's correct
  by construction at all six sites.
- `IntersectionObserver`/`ResizeObserver`/focus-trap wiring bound in a mount effect against a node that
  appears later.
