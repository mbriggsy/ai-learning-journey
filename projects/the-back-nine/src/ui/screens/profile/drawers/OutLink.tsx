/**
 * src/ui/screens/profile/drawers/OutLink.tsx: a link a drawer prints to a source the household reads a figure off (Act 6 ·
 * RC13b's, shared by RC14): opens in a new tab, never fetched (R36), blue-ink and underlined (never colour alone). The
 * kit's own link rule arrives with RC19.
 */
export function OutLink({ href, children }: { readonly href: string; readonly children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-ink underline underline-offset-2">
      {children}
    </a>
  )
}
