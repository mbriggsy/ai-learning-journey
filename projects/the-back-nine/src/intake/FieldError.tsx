import { copy, slots, type CatalogMessage } from '@ui/copy'

/**
 * The R19 calm error grammar — one shared presentation for every inline
 * violation (phase-2 U5 contract):
 *  - `role="alert"` so the message announces on appearance;
 *  - the owning field points here via `aria-describedby={fieldErrorId(field)}`
 *    and sets `aria-invalid` while present;
 *  - THREE redundant channels (the reader is color blind): a distinct SHAPE
 *    (the outlined triangle — aria-hidden, decorative beside the text), the
 *    plain-language TEXT adjacent to the field, and color only as
 *    reinforcement. No flash, no shake, no all-caps — advisor voice.
 *
 * MESSAGE ADDRESSING (F10): a violation whose `params` ride renders the SLOTTED
 * template (the limit-quoting ceiling errors); every param-less messageKey renders
 * the static catalog string byte-identically to before. The fork is
 * {@link fieldErrorText} — a pure exported helper (insight 048), the ONE
 * message-text decision for every consumer (component and test harness alike).
 */
export const fieldErrorId = (field: string): string =>
  `err-${field.replace(/[^a-zA-Z0-9-]/g, '-')}`

/** The one message-text decision: params ⇒ the slot template, else the catalog string. */
export const fieldErrorText = (m: CatalogMessage): string =>
  m.params !== undefined ? slots[m.messageKey](m.params.limitFormatted) : copy[m.messageKey]

export type FieldErrorProps = { readonly field: string } & CatalogMessage

export function FieldError(props: FieldErrorProps) {
  return (
    <p className="field-error" id={fieldErrorId(props.field)} role="alert">
      <svg
        className="field-error-icon"
        aria-hidden="true"
        viewBox="0 0 16 16"
        width="16"
        height="16"
      >
        <path
          d="M8 1.5 15 14H1L8 1.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M8 6v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="12" r="0.9" fill="currentColor" />
      </svg>
      <span>{fieldErrorText(props)}</span>
    </p>
  )
}
