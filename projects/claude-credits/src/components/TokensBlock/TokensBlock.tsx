import clsx from 'clsx'
import type { TokenStats } from '@/types'
import { formatInt, formatTokens, formatShortDate } from '@/lib/format'
import styles from './TokensBlock.module.css'

/**
 * Movement 2 — the magnitude ledger (Phase 5 Decision 7). The total is the page's ONE gold
 * moment (`--accent-stat-highlight`); nothing else on the page gets gold. Per-model rows are
 * a mono tabular ledger; two honest footnotes (window retention + subagent share).
 *
 * Mounted ONLY when `tokens !== null` (the page gates this) — a clean clone / CI box with no
 * session JSONLs shows no tokens movement at all, never "0 tokens" and never an orphan gold.
 */
export function TokensBlock({ tokens }: { tokens: TokenStats }) {
  const { tokensProcessed, tokensFresh, windowDays, windowStartISO, windowEndISO, byModel, sidechainTokens } = tokens

  // Drop 0-token models (the <synthetic> parser sentinel) — same principle as formatModelList.
  const models = byModel.filter((m) => m.tokensProcessed > 0)

  const windowClause =
    windowDays === null
      ? null
      : windowDays === 0
        ? 'across under a day of session retention'
        : `across ${formatInt(windowDays)} ${windowDays === 1 ? 'day' : 'days'} of session retention`
  const start = formatShortDate(windowStartISO)
  const end = formatShortDate(windowEndISO)
  const range = start && end ? `${start} → ${end}` : null

  const sidechainPct =
    sidechainTokens > 0 && tokensProcessed > 0 ? Math.round((sidechainTokens / tokensProcessed) * 100) : 0

  return (
    <section className={styles.block} aria-label="Tokens consumed">
      <p className={styles.label}>Tokens consumed</p>
      <p className={clsx(styles.total, 'tabular')}>{formatTokens(tokensProcessed)}</p>

      {models.length > 0 && (
        <dl className={styles.models}>
          {models.map((m) => (
            <div key={m.model} className={styles.modelRow}>
              <dt className={styles.modelName}>{m.model}</dt>
              <dd className={clsx(styles.modelTokens, 'tabular')}>{formatTokens(m.tokensProcessed)}</dd>
              <dd className={clsx(styles.modelSessions, 'tabular')}>
                {formatInt(m.sessions)} {m.sessions === 1 ? 'session' : 'sessions'}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {(windowClause || range) && (
        <p className={styles.windowNote}>
          <span className="tabular">{formatTokens(tokensFresh)}</span> fresh
          {windowClause && <> · {windowClause}</>}
          {range && <> · {range}</>}
        </p>
      )}

      {sidechainPct > 0 && <p className={styles.sidechainNote}>{sidechainPct}% from subagent runs</p>}
    </section>
  )
}
