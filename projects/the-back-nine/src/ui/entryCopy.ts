/**
 * THE ENTRY SLICE of the copy catalog — the words the first-load (entry) chunk renders, and nothing else:
 * `appTitle`, the PWA update toast, the cold-start frame and its three quote links, the passphrase reveal toggle,
 * the whole unlock screen (its honesty-critical errors, keyed by `unlockCopy.ts`'s `UnlockCopyKey`, the read-only
 * notice and the reload affordance `AppErrorBoundary` shows), and the R13 `staticDisclosures` the `Disclaimer` mounts.
 *
 * WHY IT IS ITS OWN FILE. `copy.ts` is ~100 KB of minified strings, and every module the entry graph imports ships in
 * the first-load JS. While the entry imported `copy.ts`, every feature's words were first-load bytes, though all but
 * these were read only behind the lazy `IntakeApp` / `RecoveryFlow` / `RestoreFlow` boundary — and the initial JS
 * crossed `verify:bundle`'s 300 KiB budget (CI run 42666885195; the register's *The whole copy catalog ships in the
 * entry JS…*). Now the entry graph imports THIS file only, and `copy.ts` rides the lazy chunks.
 *
 * ONE CATALOG STILL. `copy.ts` composes this slice into `copy` (spread last, so a key typed in both fails to compile),
 * so `copy`, `CopyKey`, every copyGuard sweep and every lazy surface see the whole catalog exactly as before. Lazy
 * code keeps reading these keys through `copy`; only entry-graph modules read `entryCopy` directly.
 *
 * THE OFFLINE NET. `AppErrorBoundary` catches a lazy chunk that fails to load (offline + an evicted cache, or version
 * skew after an update — insight 053). Its words must load WITH the entry, never behind the boundary it guards, and
 * living here is what guarantees that.
 *
 * ADDING A STRING. A string an entry-graph module renders goes HERE (the module imports `entryCopy`); every other
 * string goes in `copy.ts`. An entry-graph module must never import `copy.ts`: the build refuses it
 * (`scripts/entryChunkGuard.ts`, wired in `vite.config.ts`), because it would drag the whole catalog back into the
 * first-load JS. Content outranks bytes: never shorten a string to fit a budget (Briggsy, 2026-10-30).
 */

/** The entry graph's catalog keys — composed into `copy` (and so swept by copyGuard) by `copy.ts`. */
export const entryCopy = {
  appTitle: 'The Back Nine',
  // --- PWA update toast (prompt mode — the user chooses when) ---
  updateReady: 'A new version is ready — refresh whenever you’re done.',
  updateReload: 'Refresh now',
  updateLater: 'Later',
  // The refused tap's reason (2026-09-03): the apply gate holds while a save is landing, the
  // ceremony is between commit and backup, or typed work is unsaved (the leave-page guard). One
  // line true on all three arms — "save first" is the remedy for each.
  updateHeld: 'Not just yet — save what you’re working on first. The update can wait.',
  // --- the cold-start frame (R1 as the product's face; one calm entry) ---
  coldStartQuestion: 'Can we retire — and how do we do it best?',
  coldStartOrientation:
    'A quiet co-pilot for a married couple’s next chapter. About five minutes of questions, answered as honestly as the math.',
  coldStartPreflight:
    'Handy to have nearby: recent account statements, and a health-insurance quote for everyone under 65 in the household, at your ages and ZIP — the benchmark Silver figure and the premium of a plan you’d pick.',
  coldStartBegin: 'Begin',
  // The quiet returning-user door on the brand-new user's first screen: a WIPED/evicted device
  // probes no-vault → ColdStart, so a saved backup is the only way back. Subordinate to Begin
  // (R11 — invited, never a nag); the button label matches the restore surface's own heading.
  coldStartRestorePrompt: 'Set this up before?',
  coldStartRestoreAction: 'Restore from your backup',
  // --- external resource links (R36: we never fetch these — the user reads the number off the
  //     site and types it in; each opens in a NEW TAB so the unsaved in-progress intake survives) ---
  linkGetQuote: 'Get a quote:',
  linkHealthcareGov: 'healthcare.gov',
  linkKffCalculator: 'KFF calculator',
  // The passphrase field's reveal toggle — the unlock screen reads it, and so does the save step's PassphraseStep.
  passphraseShow: 'Show',
  passphraseHide: 'Hide',

  // --- decrypt-on-return: the unlock screen ---
  unlockHeading: 'Welcome back',
  unlockIntro: 'Your saved plan is encrypted on this device. Enter your passphrase to open it.',
  unlockLabel: 'Passphrase',
  unlockButton: 'Open my plan',
  unlockForgot: 'I forgot my passphrase',
  restoringStatus: 'Opening your plan…',
  // The honesty-critical error copy (keys match unlockCopy.ts UnlockCopyKey).
  unlockWrongCredential:
    'That didn’t open it. Check for typos and look-alike letters — a one and an l, a zero and an O. If you’re sure it’s right, the saved data may be damaged, and your backup is the way in.',
  unlockDataDamaged:
    'The saved plan on this device couldn’t be read — it looks damaged. Your backup file and recovery word are the way to restore it.',
  unlockNewerVersion: 'This plan was saved by a newer version of the app. Update to the latest version, then open it.',
  unlockNoVault: 'There’s no saved plan on this device yet.',
  unlockOpenElsewhere: 'Your plan is already open in another tab. Close it there, then try again.',
  // Read-only OPEN (the plan DID open; a second tab holds the writer). A calm standing
  // status, never an alarm — and it steers to RELOAD, not "close the other tab" (this tab
  // won't re-check until reloaded, so "close it there" would promise an edit it can't grant).
  // Renders as the ViewOnlyBanner's icon+WORD+text (color-blind law): the lead carries the
  // state word, so the body no longer repeats "view-only" mid-sentence.
  unlockReadOnlyLead: 'View-only',
  unlockReadOnly:
    'Your plan is open in another tab, so changes here won’t be saved. Reload this page to make changes here.',
  unlockGeneric: 'That didn’t work. Try again.',
  // The reload affordance. It is in the entry slice because `AppErrorBoundary` renders it when a lazy
  // chunk fails to load (insight 053), so it must load with the entry. Lazy surfaces read it through
  // `copy`: RestoreFlow's vault-exists arm, Result's read-only save refusal and IntakeApp's
  // 'restore-failed' phase (an unlocked plan that can't be re-opened onto the result). The vault on
  // disk is untouched; a reload re-runs the probe → unlock.
  restoreRetry: 'Reload the page',
} as const satisfies Record<string, string>

/**
 * Static disclosures — OUTSIDE the copyGuard's input by design (phase-2
 * cross-cutting #4 "surface-scoped"): the R13 honest-limits note is a mandatory
 * directive-shaped line ("validate … with a professional") that must stay legal
 * while imperative mood stays banned in verdict/recommendation copy. The U7
 * copyGuard enumerates `copy`, never this object.
 */
export const staticDisclosures = {
  honestLimitsScope:
    'Informational and educational — not legal, tax, or investment advice.',
  honestLimitsValidate:
    'Validate big, irreversible moves with a professional.',
} as const satisfies Record<string, string>
