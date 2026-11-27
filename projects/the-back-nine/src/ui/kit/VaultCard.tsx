/**
 * src/ui/kit/VaultCard.tsx: the vault and session screens' parts (Act 6 · RC19; plan docs/plans/6-rightcapital-ui-plan.md,
 * RC19). No RightCapital screenshot covers these screens, so they take the look of a RightCapital login page: a centred
 * white card on `--stone-100`, the wordmark at its top, the field, the blue primary button and the quiet links under it.
 *
 * - `Wordmark`: the plum mark and the app's name (the shell's and the stepper's top-left mark, as one part).
 * - `VaultPage`: the page a card sits on (`data-vault-page`, which `theme.css` reads to paint the whole window stone, so
 *   the trailing R13 caveat sits on the same ground under the card).
 * - `VaultCard`: the card itself; `VaultPending`: the card's calm "working…" body (an `aria-busy` section around the
 *   `role="status"` line its insertion announces, the old `PendingPanel`'s contract).
 * - `PassphraseField`: a password box with its own Show / Hide toggle (`aria-pressed`), the label above, the notes under.
 *   The caller owns the value, the reveal state and the notes (`FieldNote`), so no secret is held anywhere new: the value
 *   lives where it lived before this unit, in the screen's own state.
 * - `FieldNote`: a field's refusal, a mark and its words (`role="alert"`), so colour is never the only signal.
 * - `TextLink`: a quiet action drawn as a link (blue-ink, underlined: never colour alone).
 *
 * Every word is a prop (plan 2.1 decision 10): the unlock and cold-start screens ride the entry chunk and pass words from
 * `entryCopy.ts`; the lazy screens pass `copy.ts`'s.
 */
import { forwardRef, useId, type ReactNode, type Ref } from 'react'
import { CircleAlert } from 'lucide-react'
import { cn } from './cn'

export interface WordmarkProps {
  /** The two-letter mark ("B9"). */
  readonly mark: string
  /** The app's name beside it. */
  readonly title: string
  readonly className?: string
}

export function Wordmark({ mark, title, className }: WordmarkProps) {
  return (
    <span className={cn('flex shrink-0 items-center gap-2 text-chart-title font-semibold whitespace-nowrap text-plum', className)}>
      <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-control bg-plum text-label font-semibold text-bg">
        {mark}
      </span>
      {title}
    </span>
  )
}

export interface VaultPageProps {
  readonly children: ReactNode
  /** `main` by default; a screen that renders its own `<main>` inside passes `div`. */
  readonly as?: 'main' | 'div'
  readonly className?: string
}

/** The stone page a card is centred on. It grows to fill the window above the trailing caveat. */
export function VaultPage({ children, as = 'main', className }: VaultPageProps) {
  const Root = as
  return (
    <Root data-vault-page="" className={cn('rc-root flex w-full flex-1 flex-col items-center px-4 pt-10 pb-6 wide:justify-center wide:pt-16', className)}>
      {children}
    </Root>
  )
}

export interface VaultCardProps {
  readonly children: ReactNode
  /** The wordmark at the card's top (left out where the page already shows one). */
  readonly wordmark?: WordmarkProps
  readonly className?: string
  readonly busy?: boolean
}

export function VaultCard({ children, wordmark, className, busy }: VaultCardProps) {
  return (
    <div
      data-vault-card=""
      aria-busy={busy || undefined}
      className={cn('flex w-full max-w-[30rem] flex-col gap-6 rounded-card border border-stone-300 bg-bg p-6 text-body text-stone-900 wide:p-10', className)}
    >
      {wordmark !== undefined ? <Wordmark {...wordmark} /> : null}
      {children}
    </div>
  )
}

/** The card's heading: focus lands here on every step change (it names the step and pops no phone keyboard). */
export const VaultHeading = forwardRef(function VaultHeading(
  { children, level = 2 }: { readonly children: ReactNode; readonly level?: 1 | 2 },
  ref: Ref<HTMLHeadingElement>,
) {
  const H = level === 1 ? 'h1' : 'h2'
  return (
    <H ref={ref} tabIndex={-1} data-vault-heading="" className="text-chart-title font-semibold text-stone-900 outline-none">
      {children}
    </H>
  )
})

/** The calm working state: no spinner, the one status line (announced by its insertion). */
export function VaultPending({ status }: { readonly status: string }) {
  return (
    <section aria-busy data-vault-pending="" className="flex min-h-40 items-center justify-center">
      <p role="status" className="text-intro text-stone-600">
        {status}
      </p>
    </section>
  )
}

/** A field's refusal or a step's standing error: a mark beside the words, `role="alert"` unless the caller says it stands. */
export function FieldNote({ id, children, alert = true, className }: { readonly id?: string; readonly children: ReactNode; readonly alert?: boolean; readonly className?: string }) {
  return (
    <p id={id} role={alert ? 'alert' : undefined} className={cn('flex items-start gap-1.5 text-label text-stone-900', className)}>
      <CircleAlert size={16} strokeWidth={1.5} aria-hidden="true" className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export interface PassphraseFieldProps {
  readonly id?: string
  readonly label: string
  readonly value: string
  readonly onChange: (value: string) => void
  /** `current-password` to open a vault, `new-password` to set one, `off` for the recovery word (never offered to autofill). */
  readonly autoComplete: 'current-password' | 'new-password' | 'off'
  readonly reveal: boolean
  readonly onRevealChange: (reveal: boolean) => void
  readonly showLabel: string
  readonly hideLabel: string
  readonly invalid?: boolean
  readonly describedBy?: string
  readonly enterKeyHint?: 'go' | 'next' | 'done'
  readonly onEnter?: () => void
  readonly onBlur?: () => void
  readonly disabled?: boolean
  /** The field's notes (its `FieldNote`s), drawn under the box. */
  readonly children?: ReactNode
}

export function PassphraseField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  reveal,
  onRevealChange,
  showLabel,
  hideLabel,
  invalid = false,
  describedBy,
  enterKeyHint,
  onEnter,
  onBlur,
  disabled = false,
  children,
}: PassphraseFieldProps) {
  const ownId = useId()
  const inputId = id ?? ownId
  return (
    <div className="flex flex-col gap-1.5" data-passphrase-field="">
      <label htmlFor={inputId} className="text-body text-stone-900">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id={inputId}
          type={reveal ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={enterKeyHint}
          value={value}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onEnter !== undefined ? (e) => { if (e.key === 'Enter') onEnter() } : undefined}
          className={cn(
            // No `outline-none` beside the focus ring: it sets `--tw-outline-style: none`, which `focus:outline-2` reads, so
            // the ring would resolve to none (milestone 4's review, C1).
            'h-11 min-w-0 flex-1 rounded-control border border-stone-300 bg-bg px-3 text-body text-stone-900',
            'focus:outline-2 focus:outline-offset-2 focus:outline-blue-ink disabled:bg-stone-200',
            invalid && 'border-stone-900',
          )}
        />
        <button
          type="button"
          aria-pressed={reveal}
          disabled={disabled}
          onClick={() => onRevealChange(!reveal)}
          className={cn(
            'min-w-16 cursor-pointer rounded-control border border-stone-300 bg-bg px-3 text-label text-stone-900 hover:bg-stone-100',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-ink disabled:cursor-not-allowed disabled:opacity-50',
            'aria-pressed:font-semibold',
          )}
        >
          {reveal ? hideLabel : showLabel}
        </button>
      </div>
      {children}
    </div>
  )
}

/**
 * A step's action row, its PRIMARY FIRST in the DOM and the escape after it: on the phone the buttons stack full width
 * in that order (the eye, Tab and a screen reader all meet the primary first); past the phone tier the row reverses at
 * the right, so the escape sits left of the primary. A label wider than its box wraps and the box grows (the kit never
 * cuts a label), so no button pushes the page sideways.
 */
export const VAULT_ACTIONS = cn(
  'flex flex-col gap-3 wide:flex-row-reverse wide:flex-wrap wide:items-center wide:justify-start',
  '[&>*]:h-auto [&>*]:min-h-10 [&>*]:w-full [&>*]:shrink [&>*]:py-2 [&>*]:text-center [&>*]:whitespace-normal wide:[&>*]:w-auto',
)

/** A quiet action drawn as a link: blue-ink words with an underline (the underline carries it, never the hue alone). */
export function TextLink({ children, onClick, disabled = false, className }: { readonly children: ReactNode; readonly onClick: () => void; readonly disabled?: boolean; readonly className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'min-h-11 cursor-pointer self-start text-left text-body text-blue-ink underline underline-offset-4 hover:decoration-2',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-ink disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}
