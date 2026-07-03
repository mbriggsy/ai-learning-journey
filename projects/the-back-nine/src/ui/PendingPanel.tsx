/*
 * src/ui/PendingPanel.tsx — the calm "working…" screen, extracted once.
 *
 * The `save-step--pending` markup was verbatim at six sites (SaveFlow's securing beat, the
 * UnlockScreen / RecoveryFlow busy states, RecoveryFlow's + RestoreFlow's securing/restoring
 * steps, and IntakeApp's decrypt-on-return `restoring` phase). One component so they can never
 * drift: the `aria-busy` section wrapping the `role="status"` line that speaks the transient
 * status (mounted only while pending — its insertion is the announcement). The status text is
 * the ONLY thing that varied across the six, so it is the one prop.
 */
import './styles/save.css'

export function PendingPanel({ status }: { readonly status: string }) {
  return (
    <section className="save-step save-step--pending" aria-busy>
      <p className="save-pending" role="status">
        {status}
      </p>
    </section>
  )
}
