import { Link } from 'react-router'

export default function Landing() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 'var(--text-display-lg)', lineHeight: 'var(--leading-heading)',
        letterSpacing: 'var(--tracking-display)',
      }}>
        claude-credits
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body)', lineHeight: 'var(--leading-body)', color: 'var(--text-secondary)' }}>
        Scaffold placeholder. Hero lands in Phase 3.
      </p>
      <nav style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Link to="/project/burned" style={{ color: 'var(--text-link)' }}>sample detail →</Link>
        <Link to="/about" style={{ color: 'var(--text-link)' }}>about →</Link>
      </nav>
    </main>
  )
}
