/**
 * src/ui/kit/OutLink.tsx: a link to a source the household reads a figure off (the ACA quote, the Social Security
 * statement): opens in a new tab, so a same-tab navigation never drops a plan not yet saved, and is never fetched (R36);
 * `rel="noopener noreferrer"` closes the reverse-tabnabbing channel and withholds the referrer. Blue-ink and underlined
 * (never colour alone). The kit's link since Act 6 · RC19 (it was the Profile drawers' own from RC13b, and the cold start's
 * `ExternalLink` before that); the words are the caller's.
 */
export function OutLink({ href, children }: { readonly href: string; readonly children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-ink underline underline-offset-2">
      {children}
    </a>
  )
}
