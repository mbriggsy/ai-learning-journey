---
title: A rework that changes a guarded invariant's PRECONDITION must re-audit every path that ESTABLISHES it — the mirror mint path silently regressed from impossible to unchecked
date: 2026-06-30
phase: P2 (U8 — decrypt-on-return; the first ultramode review of the 2026-06-30 recovery-rework arc)
modules: [src/store/backup.ts, src/store/session.ts, src/crypto/kdf.ts, src/shared/scenarioCodec.ts, src/ui/unlockCopy.ts, src/ui/ExportConfirm.tsx, src/ui/IntakeApp.tsx]
tags: [negative-pairing, recovery-rework, invariant-precondition, mirror-path, restore, exhaustiveness, codec-range, ultramode-review, calm-but-wrong, latent-until-slice-2]
---

## Problem

The negative-pairing invariant — *the export file carries ONLY the recoveryWrap, so the everyday
passphrase must never also open the cloud-resident backup* — is enforced by `firstSave` rejecting
`recovery == daily` (`session.ts:321`, reason `recovery-equals-passphrase`, with a UI mirror + a test).
`restoreVault` (`backup.ts`) is the **mirror mint path**: it re-establishes the daily credential
(mints a fresh passphraseWrap from `newPassphrase`) while keeping the file's recoveryWrap verbatim — and
it holds **both plaintexts in scope** — yet performed **no equality check**. A wiped-device survivor who
reused their one memorable recovery word as the new daily passphrase silently collapsed the exact
guarantee `firstSave` hard-blocks, on the survivor's-door path where reuse is most tempting. Three
independent lenses (security, invariant-adversary, temporal-adversary) converged on it.

## Root Cause

Not "forgot to add the guard to path 2." Under the **old** recovery design the violation was
**structurally impossible**: the recovery credential was a system-minted 128-bit BIP-39 phrase, so
`recovery == daily` could never occur and `restoreVault` correctly needed no guard. The 2026-06-30
council rework changed the invariant's **precondition** — both credentials became user-chosen memorable
passphrases, making equality not just possible but a *natural* human choice — and retrofitted the new
guard onto `firstSave` **only**. The mirror path regressed from *impossible* to *unchecked* without a
single line of it being edited. A diff-scoped review sees `firstSave` gain a guard and reads it as
complete; the gap lives in the **cross-product** of the new precondition and the *other, untouched* path
that establishes the same invariant.

## Fix

- **Primary (①):** mirror `firstSave`'s guard in `restoreVault` — a `recovery-equals-passphrase` arm on
  `RestoreResult` + a cheap synchronous `newPassphrase.value === recoveryPassphrase` reject before the
  derives; planted-fail test (restore with equal credentials → refused, nothing lands). *Note:* the
  in-place `recoveryUnlock → setNewPassphrase` path shares the gap but **cannot** cheaply close it —
  it holds only the recovery *key*, not the plaintext — a documented residual, not the same fix.
- **Secondary, same review:** ③ the v3 codec's exact ticker-blend arm was finiteness-only, so a negative
  or zero-sum blend decodes ok and later **throws uncaught** in `stockWeightForBlend` — mirror that
  hazard-creator's exact `≥0 ∧ sum>0` domain in the codec ([[027]]), calm-`corrupt` not a crash. ⑤
  `describeUnlockFailure`'s trailing `return unlockGeneric` made the switch non-exhaustive, so a future
  backend reason silently maps to the no-alarm generic while the comment + test *claimed* compile-time
  exhaustiveness — replaced with the house `never`-default (sequencing.ts pattern: fail-loud, not
  calm-wrong). ④ `ExportConfirm` dropped the `{ok:false}` arm and had no `.catch`, stranding the user on
  the mandatory backup gate with no error — surfaced a calm retry.

## Key Insight

When a rework changes the **precondition** of a guarded invariant (here: *who mints the credential* —
system → user), the danger is not the path the rework edits but every **other** path that *establishes
the same invariant* and used to rely on the old precondition to hold it for free. Those paths carry no
diff, no new code, and no failing test — they silently transition from "can't happen" to "unchecked."
The audit trigger is mechanical: when a changelog says *"added guard X to `foo`,"* **grep for every other
site that mints/writes/asserts the same invariant** and prove each still holds under the new precondition.
An invariant enforced on one of N equivalent paths is enforced on none of the other N−1 ([[020]]) — and a
*precondition change* is the sneakiest way to create that asymmetry, because the unguarded path was
*correct* before the change.

## Also Applies To

- Any "mirror" pair that must hold the same invariant: `firstSave` ⇄ `restoreVault` (mint), the two
  re-mint paths (`setNewPassphrase` in-place vs restore), encode ⇄ decode, producer ⇄ consumer.
- **Latent-until-a-later-slice** findings are still spine bugs: ① and ③ are not user-reachable *today*
  (the restore UI + scenario→draft hydration are SLICE 2), but the guard belongs at the mint/codec spine
  **now**, before the UI activates it — never deferred to unwritten UI ([[048]]).
- Direct family of [[020]] (a guard on consumer #1 doesn't protect consumer #2 of the same fragile
  invariant) and [[027]] (a guard's predicate must match the hazard-creator's domain); the codec-range
  arm is the [[046]] "finiteness is not a range gate" lesson recurring on a *rate*, where — unlike a
  `[0,1]` fraction — the ceiling is a domain judgment that must be grounded, not guessed (burned/062).
