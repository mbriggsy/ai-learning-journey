import { ArrowUpRight } from 'lucide-react'

/**
 * src/ui/kit/OutLink.tsx: a link to a source the household reads a figure off (the ACA quote, the Social Security
 * statement): opens in a new tab, so a same-tab navigation never drops a plan not yet saved, and is never fetched (R36);
 * `rel="noopener noreferrer"` closes the reverse-tabnabbing channel and withholds the referrer. Blue-ink and underlined
 * (never colour alone), with a small ↗ after the words that says "opens elsewhere" (`aria-hidden`, so the accessible
 * name stays exactly the label; the old `ExternalLink`'s `::after` mark). The kit's link since Act 6 · RC19 (it was the
 * Profile drawers' own from RC13b, and the cold start's `ExternalLink` before that); the words are the caller's.
 */
export function OutLink({ href, children }: { readonly href: string; readonly children: string }) {
  // The mark rides the label's last word, so a line never breaks between them; the link is an inline block, so a short
  // label moves to the next line whole instead of splitting across two (a long one still wraps inside its box).
  const cut = children.lastIndexOf(' ')
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-block text-blue-ink underline underline-offset-2">
      {children.slice(0, cut + 1)}
      <span className="whitespace-nowrap">
        {children.slice(cut + 1)}
        <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" className="ml-0.5 inline-block align-[-2px]" />
      </span>
    </a>
  )
}
