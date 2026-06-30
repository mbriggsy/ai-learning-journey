/**
 * The vault session (P1·U4) — key lifecycle + lock/unlock + THE WRITE-GATE SEAM.
 *
 * CONTRACT #4, STATED ONCE (the one predicate): a write is permitted iff
 *   (a derived session DK exists) AND (the on-disk passphraseWrap is current or was
 *   just minted this session) AND (this session is the single active writer) AND
 *   (no lock is in progress).
 * The SAME `writable()` seam refuses an unkeyed write, a recovery-unlocked write
 * before the mandatory new-passphrase re-mint, a second-tab write, AND a write
 * issued during a lock's drain window — there is no second hand-enforced rule to
 * drift. This is the structural guarantee that makes the survivor-stranded
 * catastrophe (saving while the on-disk passphraseWrap still encodes a forgotten
 * passphrase) impossible by construction.
 *
 * LOCK AUTHORITY (the U4 boundary-review fold): `lock()` is SYNCHRONOUSLY
 * authoritative. At entry it bumps the session epoch and raises `locking` before
 * any await, so (a) `writable()` refuses new writes immediately, (b) no new
 * unlock/recovery/firstSave can start mid-drain, and (c) every long-running op
 * (unlock / recoveryUnlock / firstSave / setNewPassphrase / save) captures the
 * epoch at entry and re-checks it after each await BEFORE installing any state or
 * restoring any status — a lock that lands during a ~1s PBKDF2 derive cancels the
 * op (typed 'cancelled') instead of being resurrected over. The secret-drop in
 * lock() sits in a `finally`, so even a rejecting Web Locks request (document
 * not fully active during unload — exactly when lock-on-close fires) cannot leave
 * keys resident or the state machine wedged.
 *
 * HONEST LOCK: JS/WebCrypto cannot byte-scrub a CryptoKey or a string. `lock()`
 * drops this session's ONLY references to the keys and the decrypted model (GC-
 * eligible, fresh derivation required for any later decrypt) — we claim reference-
 * drop + mandatory re-derive, never cryptographic zeroization.
 *
 * NO LOCKOUT, BY DESIGN: the meaningful attacker is OFFLINE (they extracted the
 * IndexedDB blob and brute-force PBKDF2 on their own hardware — they never click
 * Unlock). A client-side retry limit adds zero security against them and can only
 * lock the legitimate household out. KDF hardness + the passphrase floor are the
 * defense; do not "harden" this with a rate-limiter.
 *
 * PENDING STATES: every derivation window ('unlocking' / 'securing') is a rendered
 * state owned HERE, set synchronously at entry — the UI contract never relies on
 * the platform off-threading `deriveKey`.
 *
 * SINGLE ACTIVE WRITER: Web Locks serializes individual write transactions, but two
 * tabs could each unlock and race saves (a silent lost save). A BroadcastChannel
 * claim protocol closes the sequential case: a second tab unlocking an already-
 * unlocked vault is told so and stays read-only. (Two tabs unlocking in the SAME
 * ~150 ms probe window can still both claim — a disclosed residual; their writes
 * remain serialized and untorn via Web Locks, and the check-inside-critical-section
 * pattern below keeps firstSave/restore from ever splicing a mixed vault.) A
 * recovery unlock CLAIMS writer-hood immediately (its only exit is the re-mint
 * write) and is refused outright if another tab is active.
 *
 * WRITE FAILURE CONTRACT: the three write ops (firstSave / setNewPassphrase / save)
 * return typed results for EVERY failure — an unexpected crypto/locks throw maps to
 * 'write-failed', never a raw rejection (the calm "couldn't save, use your export"
 * states are the UI contract). unlock/recoveryUnlock keep loud rethrow for
 * non-CipherAuthError programming errors on purpose: their typed arms all describe
 * the VAULT's condition, and mislabeling an internal bug as "data damaged" would be
 * the calm-but-wrong sin in the scariest direction.
 */
import { type AnyScenario } from '@shared/model'
import { decodeScenario, encodeScenario } from '@shared/scenarioCodec'

import {
  CipherAuthError,
  decrypt,
  encrypt,
  mintWrappedDataKey,
  rewrapDataKey,
  unwrapDataKey,
  type GcmBox,
} from '../crypto/cipher'
import {
  SALT_BYTES,
  deriveNewPassphraseKey,
  derivePassphraseKey,
  type FloorCheckedPassphrase,
} from '../crypto/kdf'
import {
  loadVault,
  replacePassphraseWrap,
  rewriteModel,
  serializeVaultWrite,
  writeVault,
  type VaultDb,
  type VaultWrite,
} from './db'

export type SessionStatus = 'locked' | 'unlocking' | 'securing' | 'unlocked' | 'recovery-unlocked'

export type FirstSaveResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reason:
        | 'not-locked'
        | 'vault-exists'
        | 'open-in-another-tab'
        | 'cancelled'
        | 'quota'
        /** The recovery credential equalled the daily passphrase — minting would let a
         *  guessed daily passphrase also open the cloud-resident export, collapsing the
         *  negative-pairing the two wraps exist to provide. Necessary, not sufficient
         *  (it catches exact collision, never correlation — see kdf.ts). */
        | 'recovery-equals-passphrase'
    }
  | { readonly ok: false; readonly reason: 'write-failed'; readonly detail: string }

export type UnlockResult =
  | { readonly ok: true; readonly readOnly: boolean }
  | { readonly ok: false; readonly reason: 'not-locked' | 'no-vault' | 'wrong-passphrase' | 'cancelled' }
  | { readonly ok: false; readonly reason: 'newer-version'; readonly got: number }
  | { readonly ok: false; readonly reason: 'data-damaged'; readonly detail: string }

export type RecoveryUnlockResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reason: 'not-locked' | 'no-vault' | 'wrong-recovery-passphrase' | 'open-in-another-tab' | 'cancelled'
    }
  | { readonly ok: false; readonly reason: 'newer-version'; readonly got: number }
  | { readonly ok: false; readonly reason: 'data-damaged'; readonly detail: string }

export type SaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'not-writable' | 'quota' }
  | { readonly ok: false; readonly reason: 'write-failed'; readonly detail: string }

export type SetPassphraseResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reason: 'no-session-key' | 'open-in-another-tab' | 'op-in-flight' | 'cancelled' | 'quota'
    }
  | { readonly ok: false; readonly reason: 'write-failed'; readonly detail: string }

export interface VaultSession {
  status(): SessionStatus
  /** The live in-memory model. Typed deeply readonly — treat it as immutable; a
   *  caller mutating through a cast desyncs memory from disk (the readonly types
   *  are this project's enforcement style, same as the engine's). */
  currentModel(): AnyScenario | null
  /** Monotone lock counter, bumped SYNCHRONOUSLY at every lock() entry — the
   *  engine-result discard predicate: a run's result is rendered only if
   *  `lockEpoch()` still equals its value when the run started. The session's own
   *  long ops consult the same counter to cancel across a lock. */
  lockEpoch(): number
  /** The U0 PWA-update signal (true while a vault transaction is in flight). */
  isWriteInFlight(): boolean
  /** Resolves once the write tail AT CALL TIME commits — the deferred-skipWaiting
   *  hook. A write enqueued AFTER this call is not covered: the U0 handler must
   *  re-check `isWriteInFlight()` immediately before applying the update. */
  whenNoWriteInFlight(): Promise<void>
  firstSave(
    scenario: AnyScenario,
    passphrase: FloorCheckedPassphrase,
    recoveryPassphrase: FloorCheckedPassphrase,
  ): Promise<FirstSaveResult>
  unlock(passphrase: string): Promise<UnlockResult>
  recoveryUnlock(recoveryPassphrase: string): Promise<RecoveryUnlockResult>
  setNewPassphrase(passphrase: FloorCheckedPassphrase): Promise<SetPassphraseResult>
  save(scenario: AnyScenario): Promise<SaveResult>
  lock(): Promise<void>
}

const VAULT_SESSION_CHANNEL = 'the-back-nine-vault-session'
/** How long a probing tab waits to hear an active writer before claiming. */
const CLAIM_WAIT_MS = 150

const freshSalt = (): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(SALT_BYTES))

type WriteFailure =
  | { readonly ok: false; readonly reason: 'quota' }
  | { readonly ok: false; readonly reason: 'write-failed'; readonly detail: string }

const mapWriteFailure = (w: Extract<VaultWrite, { ok: false }>): WriteFailure =>
  w.reason === 'quota'
    ? { ok: false, reason: 'quota' }
    : { ok: false, reason: 'write-failed', detail: w.reason === 'no-vault' ? 'vault missing' : w.detail }

const asWriteFailed = (e: unknown): WriteFailure => ({
  ok: false,
  reason: 'write-failed',
  detail: e instanceof Error ? e.message : String(e),
})

export function createSession(db: VaultDb): VaultSession {
  // --- the in-memory secrets (the ONLY references; lock() nulls them) ---
  let dataKey: CryptoKey | null = null
  let credentialKey: CryptoKey | null = null
  let credentialWrap: GcmBox | null = null
  let model: AnyScenario | null = null
  let passphraseWrapCurrent = false
  let secondTab = false

  let status: SessionStatus = 'locked'
  /** The generation token: bumped synchronously at lock() ENTRY. Long ops capture it
   *  and re-check after every await before mutating session state. */
  let epoch = 0
  /** True from lock() entry until its finally — the synchronous-authority flag. */
  let locking = false

  // --- write accounting (serialization itself lives in db.serializeVaultWrite:
  //     one module-level FIFO per realm + a cross-tab Web Lock per step) ---
  let writesInFlight = 0
  let writeTail: Promise<void> = Promise.resolve()
  function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
    writesInFlight++
    const run = serializeVaultWrite(fn)
    writeTail = run.then(
      () => undefined,
      () => undefined,
    )
    // .then(onOk, onErr) — NOT .finally(), whose return re-propagates a rejection
    // into a void-ed (hence unhandled) promise. The caller of enqueueWrite owns
    // run's outcome; this side-channel only does the accounting.
    void run.then(
      () => {
        writesInFlight--
      },
      () => {
        writesInFlight--
      },
    )
    return run
  }

  // --- the single-active-writer channel ---
  let channel: BroadcastChannel | null = null
  let respondHandler: ((e: Event) => void) | null = null
  function ensureChannel(): BroadcastChannel {
    if (!channel) {
      channel = new BroadcastChannel(VAULT_SESSION_CHANNEL)
      ;(channel as unknown as { unref?: () => void }).unref?.()
    }
    return channel
  }
  /** Ask the channel whether an active writer exists (bounded wait). */
  function probeActiveWriter(): Promise<boolean> {
    const ch = ensureChannel()
    return new Promise((resolve) => {
      const onMessage = (e: Event): void => {
        if ((e as MessageEvent).data?.t === 'active') {
          clearTimeout(timer)
          ch.removeEventListener('message', onMessage)
          resolve(true)
        }
      }
      const timer = setTimeout(() => {
        ch.removeEventListener('message', onMessage)
        resolve(false)
      }, CLAIM_WAIT_MS)
      ch.addEventListener('message', onMessage)
      ch.postMessage({ t: 'query' })
    })
  }
  /** Become the responder other tabs' probes will hear. */
  function claimWriter(): void {
    const ch = ensureChannel()
    respondHandler = (e: Event): void => {
      if ((e as MessageEvent).data?.t === 'query') ch.postMessage({ t: 'active' })
    }
    ch.addEventListener('message', respondHandler)
  }
  function releaseChannel(): void {
    channel?.close()
    channel = null
    respondHandler = null
  }
  /** A failed/cancelled claim attempt must not strand an open channel: close it
   *  unless this session actually became a responder (lock() owns that close). */
  function releaseChannelIfUnclaimed(): void {
    if (respondHandler === null) releaseChannel()
  }

  /** THE seam — contract #4 as one predicate. Every model save consults exactly this. */
  const writable = (): boolean => dataKey !== null && passphraseWrapCurrent && !secondTab && !locking

  function dropSecrets(): void {
    dataKey = null
    credentialKey = null
    credentialWrap = null
    model = null
    passphraseWrapCurrent = false
    secondTab = false
  }

  return {
    status: () => status,
    currentModel: () => model,
    lockEpoch: () => epoch,
    isWriteInFlight: () => writesInFlight > 0,
    whenNoWriteInFlight: () => writeTail.then(() => undefined),

    async firstSave(scenario, passphrase, recoveryPassphrase) {
      if (status !== 'locked' || locking) return { ok: false, reason: 'not-locked' }
      // The recovery credential must DIFFER from the daily passphrase: the export carries
      // only the recoveryWrap, so if the two were equal a guessed daily passphrase would
      // also open the cloud-resident backup, collapsing negative pairing. Cheap synchronous
      // reject BEFORE the pending state and the ~1s derives. (Equality only — two correlated
      // human secrets are honestly weaker than the old independent 128-bit phrase; the
      // ceremony discloses that, this gate just forecloses the exact-collision case.)
      if (recoveryPassphrase.value === passphrase.value) {
        return { ok: false, reason: 'recovery-equals-passphrase' }
      }
      const gen = epoch
      status = 'securing'
      try {
        // Fast-path refusal BEFORE the ~1s derive (UX); the authoritative check
        // re-runs INSIDE the serialized critical section below (correctness — two
        // tabs racing firstSave cannot both pass that one).
        const existing = await loadVault(db)
        if (existing.kind !== 'no-vault') return { ok: false, reason: 'vault-exists' }
        if (await probeActiveWriter()) return { ok: false, reason: 'open-in-another-tab' }

        const passphraseSalt = freshSalt()
        const recoverySalt = freshSalt()
        const passKey = await deriveNewPassphraseKey(passphrase, passphraseSalt)
        const recKey = await deriveNewPassphraseKey(recoveryPassphrase, recoverySalt)
        const minted = await mintWrappedDataKey(passKey, recKey)
        const modelBox = await encrypt(minted.dataKey, encodeScenario(scenario))

        // A lock that landed during the derive cancels BEFORE anything reaches disk.
        if (epoch !== gen) return { ok: false, reason: 'cancelled' }

        let written: VaultWrite | 'vault-exists'
        try {
          written = await enqueueWrite(async () => {
            const check = await loadVault(db)
            if (check.kind !== 'no-vault') return 'vault-exists' as const
            return writeVault(db, {
              model: { iv: modelBox.iv, ciphertext: modelBox.ciphertext },
              passphraseWrap: {
                salt: passphraseSalt,
                iv: minted.passphraseWrap.iv,
                wrappedDataKey: minted.passphraseWrap.ciphertext,
              },
              recoveryWrap: {
                salt: recoverySalt,
                iv: minted.recoveryWrap.iv,
                wrappedDataKey: minted.recoveryWrap.ciphertext,
              },
            })
          })
        } catch (e) {
          return asWriteFailed(e)
        }
        if (written === 'vault-exists') return { ok: false, reason: 'vault-exists' }
        if (!written.ok) return mapWriteFailure(written)

        // The vault EXISTS on disk now. Both credentials are USER-CHOSEN (nothing
        // system-minted to strand — the insight-031 hazard the old generated phrase
        // carried is gone), so the only post-commit concern is the in-memory install,
        // which stays gen-gated: a lock that landed mid-derive leaves the committed
        // vault openable by either credential and simply does not install this session.
        if (epoch === gen) {
          dataKey = minted.dataKey
          credentialKey = passKey
          credentialWrap = minted.passphraseWrap
          model = scenario
          passphraseWrapCurrent = true
          secondTab = false
          claimWriter()
          status = 'unlocked'
        }
        return { ok: true }
      } finally {
        if (status === 'securing' && epoch === gen) status = 'locked'
        if (status !== 'unlocked') releaseChannelIfUnclaimed()
      }
    },

    async unlock(passphrase) {
      if (status !== 'locked' || locking) return { ok: false, reason: 'not-locked' }
      const gen = epoch
      status = 'unlocking'
      try {
        const vault = await loadVault(db)
        if (vault.kind === 'no-vault') return { ok: false, reason: 'no-vault' }
        if (vault.kind === 'damaged') return { ok: false, reason: 'data-damaged', detail: vault.detail }

        // The unlock path derives whatever was typed (NEVER floor-gated — see kdf.ts).
        const passKey = await derivePassphraseKey(passphrase, vault.passphraseWrap.salt)
        let dk: CryptoKey
        try {
          dk = await unwrapDataKey(passKey, {
            iv: vault.passphraseWrap.iv as Uint8Array<ArrayBuffer>,
            ciphertext: vault.passphraseWrap.wrappedDataKey as Uint8Array<ArrayBuffer>,
          })
        } catch (e) {
          if (e instanceof CipherAuthError) return { ok: false, reason: 'wrong-passphrase' }
          throw e
        }

        // The credential OPENED the wrap, so a GCM failure on the model is damage,
        // not a wrong passphrase — the context distinction cipher.ts defers to us.
        let plaintext: Uint8Array
        try {
          plaintext = await decrypt(dk, {
            iv: vault.model.iv as Uint8Array<ArrayBuffer>,
            ciphertext: vault.model.ciphertext as Uint8Array<ArrayBuffer>,
          })
        } catch (e) {
          if (e instanceof CipherAuthError) {
            return { ok: false, reason: 'data-damaged', detail: 'model ciphertext failed authentication' }
          }
          throw e
        }
        const decoded = decodeScenario(plaintext)
        if (!decoded.ok) {
          if (decoded.reason === 'newer-version') return { ok: false, reason: 'newer-version', got: decoded.got }
          return { ok: false, reason: 'data-damaged', detail: decoded.detail }
        }

        const otherTabActive = await probeActiveWriter()

        // A lock that landed during the derive wins: discard the freshly derived
        // keys (they fall out of scope, GC-eligible) instead of resurrecting.
        if (epoch !== gen) return { ok: false, reason: 'cancelled' }

        dataKey = dk
        credentialKey = passKey
        credentialWrap = {
          iv: vault.passphraseWrap.iv as Uint8Array<ArrayBuffer>,
          ciphertext: vault.passphraseWrap.wrappedDataKey as Uint8Array<ArrayBuffer>,
        }
        model = decoded.scenario
        passphraseWrapCurrent = true
        secondTab = otherTabActive
        if (!otherTabActive) claimWriter()
        status = 'unlocked'
        return { ok: true, readOnly: otherTabActive }
      } finally {
        if (status === 'unlocking' && epoch === gen) status = 'locked'
        if (status !== 'unlocked') releaseChannelIfUnclaimed()
      }
    },

    async recoveryUnlock(recoveryPassphrase) {
      if (status !== 'locked' || locking) return { ok: false, reason: 'not-locked' }
      const gen = epoch
      status = 'unlocking'
      try {
        const vault = await loadVault(db)
        if (vault.kind === 'no-vault') return { ok: false, reason: 'no-vault' }
        if (vault.kind === 'damaged') return { ok: false, reason: 'data-damaged', detail: vault.detail }

        // A recovery-unlocked session's ONLY exit is the re-mint WRITE — if another
        // tab is the active writer, refuse up front rather than open a dead end.
        if (await probeActiveWriter()) return { ok: false, reason: 'open-in-another-tab' }

        // The recovery credential is a user-chosen passphrase: derive it via the UNLOCK
        // path (raw string, NOT floor-gated — a future zxcvbn re-score must never brick a
        // real vault), over the recoveryWrap's own salt.
        const recKey = await derivePassphraseKey(recoveryPassphrase, vault.recoveryWrap.salt)
        let dk: CryptoKey
        try {
          dk = await unwrapDataKey(recKey, {
            iv: vault.recoveryWrap.iv as Uint8Array<ArrayBuffer>,
            ciphertext: vault.recoveryWrap.wrappedDataKey as Uint8Array<ArrayBuffer>,
          })
        } catch (e) {
          if (e instanceof CipherAuthError) return { ok: false, reason: 'wrong-recovery-passphrase' }
          throw e
        }

        let plaintext: Uint8Array
        try {
          plaintext = await decrypt(dk, {
            iv: vault.model.iv as Uint8Array<ArrayBuffer>,
            ciphertext: vault.model.ciphertext as Uint8Array<ArrayBuffer>,
          })
        } catch (e) {
          if (e instanceof CipherAuthError) {
            return { ok: false, reason: 'data-damaged', detail: 'model ciphertext failed authentication' }
          }
          throw e
        }
        const decoded = decodeScenario(plaintext)
        if (!decoded.ok) {
          if (decoded.reason === 'newer-version') return { ok: false, reason: 'newer-version', got: decoded.got }
          return { ok: false, reason: 'data-damaged', detail: decoded.detail }
        }

        if (epoch !== gen) return { ok: false, reason: 'cancelled' }

        dataKey = dk
        credentialKey = recKey
        credentialWrap = {
          iv: vault.recoveryWrap.iv as Uint8Array<ArrayBuffer>,
          ciphertext: vault.recoveryWrap.wrappedDataKey as Uint8Array<ArrayBuffer>,
        }
        model = decoded.scenario
        // THE MANDATORY BLOCKING GATE: the on-disk passphraseWrap encodes a forgotten
        // passphrase — no write until setNewPassphrase re-mints it. Writer-hood is
        // still claimed NOW so no other tab unlocks underneath the recovery flow.
        passphraseWrapCurrent = false
        secondTab = false
        claimWriter()
        status = 'recovery-unlocked'
        return { ok: true }
      } finally {
        if (status === 'unlocking' && epoch === gen) status = 'locked'
        if (status !== 'recovery-unlocked') releaseChannelIfUnclaimed()
      }
    },

    async setNewPassphrase(passphrase) {
      if (dataKey === null || credentialKey === null || credentialWrap === null) {
        return { ok: false, reason: 'no-session-key' }
      }
      if (secondTab) return { ok: false, reason: 'open-in-another-tab' }
      // Reentrancy guard: a double-submit must not race two re-mints (the second
      // failing call would otherwise wedge 'securing' over the first's result).
      if (status === 'securing' || status === 'unlocking' || locking) return { ok: false, reason: 'op-in-flight' }
      const gen = epoch
      const priorStatus = status
      // Local captures: a lock() landing mid-derive nulls the session fields, and this
      // op must fail by the GEN CHECK (a clean 'cancelled'), never by a null-deref
      // surfacing as a bogus crypto error.
      const credKey = credentialKey
      const credWrap = credentialWrap
      status = 'securing'
      try {
        const salt = freshSalt()
        const newKey = await deriveNewPassphraseKey(passphrase, salt)
        // A lock that landed during the ~1s derive cancels before any further work.
        if (epoch !== gen) return { ok: false, reason: 'cancelled' }
        const newWrap = await rewrapDataKey(credKey, credWrap, newKey)

        // …and one more checkpoint before the wrap reaches disk.
        if (epoch !== gen) return { ok: false, reason: 'cancelled' }

        const written = await enqueueWrite(() =>
          replacePassphraseWrap(db, { salt, iv: newWrap.iv, wrappedDataKey: newWrap.ciphertext }),
        )
        if (!written.ok) {
          if (epoch === gen) status = priorStatus
          return mapWriteFailure(written)
        }
        // The wrap re-mint COMMITTED — report ok even if a lock landed during the
        // write (the passphrase DID change); only the in-memory installs are gated.
        if (epoch === gen) {
          credentialKey = newKey
          credentialWrap = newWrap
          passphraseWrapCurrent = true
          status = 'unlocked'
        }
        return { ok: true }
      } catch (e) {
        if (epoch === gen) status = priorStatus
        return asWriteFailed(e)
      }
    },

    async save(scenario) {
      if (!writable()) return { ok: false, reason: 'not-writable' }
      const gen = epoch
      const dk = dataKey!
      let result: VaultWrite
      try {
        result = await enqueueWrite(async () => {
          const box = await encrypt(dk, encodeScenario(scenario))
          return rewriteModel(db, { iv: box.iv, ciphertext: box.ciphertext })
        })
      } catch (e) {
        return asWriteFailed(e)
      }
      if (!result.ok) return mapWriteFailure(result)
      // A lock queued behind this write owns the model field once it drains —
      // never repopulate after the drop (the write itself committed pre-lock,
      // which is the documented queue-then-drop semantics).
      if (epoch === gen) model = scenario
      return { ok: true }
    },

    async lock() {
      if (status === 'locked' || locking) return
      // SYNCHRONOUS AUTHORITY: bump the generation + raise the flag before any
      // await, so new writes are refused and in-flight ops cancel at their next
      // checkpoint. Then drain the write tail (a committed in-flight save lands,
      // then the keys drop) — and the drop is in a FINALLY: even a rejecting
      // Web Locks request cannot leave secrets resident or the machine wedged.
      epoch++
      locking = true
      try {
        await enqueueWrite(async () => undefined)
      } catch {
        // the drain's own failure must never block the drop
      } finally {
        dropSecrets()
        releaseChannel()
        status = 'locked'
        locking = false
      }
    },
  }
}
