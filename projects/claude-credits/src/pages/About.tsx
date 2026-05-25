import { Link } from 'react-router'

export default function About() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'var(--text-display-md)', lineHeight: 'var(--leading-tile)' }}>about</h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-body)', lineHeight: 'var(--leading-body)', color: 'var(--text-secondary)' }}>
        Taxonomy explainer lands in Phase 6.
      </p>
      <Link to="/" style={{ color: 'var(--text-link)' }}>← home</Link>
    </main>
  )
}
