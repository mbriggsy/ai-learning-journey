/**
 * The vault session (P1·U4) — key lifecycle + lock/unlock + THE WRITE-GATE SEAM.
 *
 * CONTRACT #4, STATED ONCE (the one predicate): a write is permitted iff
 *   (a derived session DK exists) AND (the on-disk passphraseWrap is current or was
 *   just minted this session) AND (this session is the single active writer).
 * The SAME `writable()` seam refuses an unkeyed write, a recovery-unlocked write
 * before the mandatory new-passphrase re-mint, and a second-tab write — there is no
 * second hand-enforced rule to drift. This is the structural guarantee that makes
 * the survivor-stranded catastrophe (saving while the on-disk passphraseWrap still
 * encodes a forgotten passphrase) impossible by construction.
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
 * remain serialized and untorn via Web Locks.) A recovery unlock CLAIMS writer-hood
 * immediately (its only exit is the re-mint write) and is refused outright if
 * another tab is active.
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
  deriveRecoveryKey,
  type FloorCheckedPassphrase,
} from '../crypto/kdf'
import { generateRecoveryPhrase, phraseToEntropy, type PhraseDecode } from '../crypto/recoveryPhrase'
import {
  loadVault,
  replacePassphraseWrap,
  rewriteModel,
  writeVault,
  type VaultDb,
  type VaultWrite,
} from './db'

export type SessionStatus = 'locked' | 'unlocking' | 'securing' | 'unlocked' | 'recovery-unlocked'

export type FirstSaveResult =
  | { readonly ok: true; readonly recoveryPhrase: readonly string[] }
  | { readonly ok: false; readonly reason: 'not-locked' | 'vault-exists' | 'open-in-another-tab' | 'quota' }
  | { readonly ok: false; readonly reason: 'write-failed'; readonly detail: string }

export type UnlockResult =
  | { readonly ok: true; readonly readOnly: boolean }
  | { readonly ok: false; readonly reason: 'not-locked' | 'no-vault' | 'wrong-passphrase' | 'newer-version' }
  | { readonly ok: false; readonly reason: 'data-damaged'; readonly detail: string }

export type RecoveryUnlockResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly reason: 'not-locked' | 'no-vault' | 'wrong-recovery-phrase' | 'newer-version' | 'open-in-another-tab'
    }
  | { readonly ok: false; readonly reason: 'phrase-invalid'; readonly phrase: Exclude<PhraseDecode, { ok: true }> }
  | { readonly ok: false; readonly reason: 'data-damaged'; readonly detail: string }

export type SaveResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'not-writable' | 'quota' }
  | { readonly ok: false; readonly reason: 'write-failed'; readonly detail: string }

export type SetPassphraseResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'no-session-key' | 'open-in-another-tab' | 'quota' }
  | { readonly ok: false; readonly reason: 'write-failed'; readonly detail: string }

export interface VaultSession {
  status(): SessionStatus
  currentModel(): AnyScenario | null
  /** Monotone lock counter — the engine-result discard predicate: a run's result is
   *  rendered only if `lockEpoch()` still equals its value when the run started. */
  lockEpoch(): number
  /** The U0 PWA-update signal (true while a vault transaction is in flight). */
  isWriteInFlight(): boolean
  /** Resolves once the current write tail commits — the deferred-skipWaiting hook. */
  whenNoWriteInFlight(): Promise<void>
  firstSave(scenario: AnyScenario, passphrase: FloorCheckedPassphrase): Promise<FirstSaveResult>
  unlock(passphrase: string): Promise<UnlockResult>
  recoveryUnlock(phrase: string): Promise<RecoveryUnlockResult>
  setNewPassphrase(passphrase: FloorCheckedPassphrase): Promise<SetPassphraseResult>
  save(scenario: AnyScenario): Promise<SaveResult>
  lock(): Promise<void>
}

const VAULT_SESSION_CHANNEL = 'the-back-nine-vault-session'
/** How long a probing tab waits to hear an active writer before claiming. */
const CLAIM_WAIT_MS = 150
const WEB_LOCK_NAME = 'the-back-nine-vault-write'

const freshSalt = (): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(SALT_BYTES))

type WriteFailure =
  | { readonly ok: false; readonly reason: 'quota' }
  | { readonly ok: false; readonly reason: 'write-failed'; readonly detail: string }

const mapWriteFailure = (w: Extract<VaultWrite, { ok: false }>): WriteFailure =>
  w.reason === 'quota'
    ? { ok: false, reason: 'quota' }
    : { ok: false, reason: 'write-failed', detail: w.reason === 'no-vault' ? 'vault missing' : w.detail }

export function createSession(db: VaultDb): VaultSession {
  // --- the in-memory secrets (the ONLY references; lock() nulls them) ---
  let dataKey: CryptoKey | null = null
  let credentialKey: CryptoKey | null = null
  let credentialWrap: GcmBox | null = null
  let model: AnyScenario | null = null
  let passphraseWrapCurrent = false
  let secondTab = false

  let status: SessionStatus = 'locked'
  let epoch = 0

  // --- the write mutex (in-process FIFO; each step ALSO under a Web Lock cross-tab) ---
  let chain: Promise<void> = Promise.resolve()
  let writesInFlight = 0
  const underWebLock = <T>(fn: () => Promise<T>): Promise<T> => {
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      return navigator.locks.request(WEB_LOCK_NAME, fn) as Promise<T>
    }
    return fn()
  }
  function enqueueWrite<T>(fn: () => Promise<T>): Promise<T> {
    writesInFlight++
    const run = chain.then(() => underWebLock(fn))
    chain = run.then(
      () => undefined,
      () => undefined,
    )
    void run.finally(() => {
      writesInFlight--
    })
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

  /** THE seam — contract #4 as one predicate. Every write path consults exactly this. */
  const writable = (): boolean => dataKey !== null && passphraseWrapCurrent && !secondTab

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
    whenNoWriteInFlight: () => chain.then(() => undefined),

    async firstSave(scenario, passphrase) {
      if (status !== 'locked') return { ok: false, reason: 'not-locked' }
      status = 'securing'
      try {
        const existing = await loadVault(db)
        if (existing.kind !== 'no-vault') return { ok: false, reason: 'vault-exists' }
        if (await probeActiveWriter()) return { ok: false, reason: 'open-in-another-tab' }

        const words = await generateRecoveryPhrase()
        const decoded = await phraseToEntropy(words.join(' '))
        if (!decoded.ok) throw new Error('freshly minted phrase failed decode — unreachable')

        const passphraseSalt = freshSalt()
        const recoverySalt = freshSalt()
        const passKey = await deriveNewPassphraseKey(passphrase, passphraseSalt)
        const recKey = await deriveRecoveryKey(decoded.entropy, recoverySalt)
        const minted = await mintWrappedDataKey(passKey, recKey)
        const modelBox = await encrypt(minted.dataKey, encodeScenario(scenario))

        const written = await enqueueWrite(() =>
          writeVault(db, {
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
          }),
        )
        if (!written.ok) {
          const failure = mapWriteFailure(written)
          return failure.reason === 'quota' ? { ok: false, reason: 'quota' } : failure
        }

        dataKey = minted.dataKey
        credentialKey = passKey
        credentialWrap = minted.passphraseWrap
        model = scenario
        passphraseWrapCurrent = true
        secondTab = false
        claimWriter()
        status = 'unlocked'
        return { ok: true, recoveryPhrase: words }
      } finally {
        if (status === 'securing') status = 'locked'
      }
    },

    async unlock(passphrase) {
      if (status !== 'locked') return { ok: false, reason: 'not-locked' }
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
          if (decoded.reason === 'newer-version') return { ok: false, reason: 'newer-version' }
          return { ok: false, reason: 'data-damaged', detail: decoded.detail }
        }

        const otherTabActive = await probeActiveWriter()
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
        if (status === 'unlocking') status = 'locked'
      }
    },

    async recoveryUnlock(phrase) {
      if (status !== 'locked') return { ok: false, reason: 'not-locked' }
      status = 'unlocking'
      try {
        const vault = await loadVault(db)
        if (vault.kind === 'no-vault') return { ok: false, reason: 'no-vault' }
        if (vault.kind === 'damaged') return { ok: false, reason: 'data-damaged', detail: vault.detail }

        const decodedPhrase = await phraseToEntropy(phrase)
        if (!decodedPhrase.ok) return { ok: false, reason: 'phrase-invalid', phrase: decodedPhrase }

        // A recovery-unlocked session's ONLY exit is the re-mint WRITE — if another
        // tab is the active writer, refuse up front rather than open a dead end.
        if (await probeActiveWriter()) return { ok: false, reason: 'open-in-another-tab' }

        const recKey = await deriveRecoveryKey(decodedPhrase.entropy, vault.recoveryWrap.salt)
        let dk: CryptoKey
        try {
          dk = await unwrapDataKey(recKey, {
            iv: vault.recoveryWrap.iv as Uint8Array<ArrayBuffer>,
            ciphertext: vault.recoveryWrap.wrappedDataKey as Uint8Array<ArrayBuffer>,
          })
        } catch (e) {
          if (e instanceof CipherAuthError) return { ok: false, reason: 'wrong-recovery-phrase' }
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
          if (decoded.reason === 'newer-version') return { ok: false, reason: 'newer-version' }
          return { ok: false, reason: 'data-damaged', detail: decoded.detail }
        }

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
        if (status === 'unlocking') status = 'locked'
      }
    },

    async setNewPassphrase(passphrase) {
      if (dataKey === null || credentialKey === null || credentialWrap === null) {
        return { ok: false, reason: 'no-session-key' }
      }
      if (secondTab) return { ok: false, reason: 'open-in-another-tab' }
      const priorStatus = status
      status = 'securing'
      try {
        const salt = freshSalt()
        const newKey = await deriveNewPassphraseKey(passphrase, salt)
        const newWrap = await rewrapDataKey(credentialKey, credentialWrap, newKey)
        const written = await enqueueWrite(() =>
          replacePassphraseWrap(db, { salt, iv: newWrap.iv, wrappedDataKey: newWrap.ciphertext }),
        )
        if (!written.ok) {
          status = priorStatus
          const failure = mapWriteFailure(written)
          return failure.reason === 'quota' ? { ok: false, reason: 'quota' } : failure
        }
        credentialKey = newKey
        credentialWrap = newWrap
        passphraseWrapCurrent = true
        status = 'unlocked'
        return { ok: true }
      } catch (e) {
        status = priorStatus
        throw e
      }
    },

    async save(scenario) {
      if (!writable()) return { ok: false, reason: 'not-writable' }
      const dk = dataKey!
      const result = await enqueueWrite(async () => {
        const box = await encrypt(dk, encodeScenario(scenario))
        return rewriteModel(db, { iv: box.iv, ciphertext: box.ciphertext })
      })
      if (!result.ok) return mapWriteFailure(result)
      model = scenario
      return { ok: true }
    },

    async lock() {
      if (status === 'locked') return
      // Queue behind any in-flight write: the commit lands, THEN the keys drop.
      await enqueueWrite(async () => undefined)
      dropSecrets()
      releaseChannel()
      epoch++
      status = 'locked'
    },
  }
}
