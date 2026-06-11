import { copy, type CopyKey } from '@ui/copy'

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
 */
export const fieldErrorId = (field: string): string =>
  `err-${field.replace(/[^a-zA-Z0-9-]/g, '-')}`

export function FieldError({ field, messageKey }: { field: string; messageKey: CopyKey }) {
  return (
    <p className="field-error" id={fieldErrorId(field)} role="alert">
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
      <span>{copy[messageKey]}</span>
    </p>
  )
}
