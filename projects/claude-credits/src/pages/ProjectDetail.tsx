import { useParams, Link } from 'react-router'

export default function ProjectDetail() {
  const { name } = useParams<{ name: string }>()
  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 'var(--text-display-md)', lineHeight: 'var(--leading-tile)' }}>
        {name}
      </h1>
      {/* Longhand props (NOT `font:` shorthand) so .tabular's font-variant-numeric survives */}
      <p className="tabular" style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-stat-callout)', lineHeight: 1, color: 'var(--accent-stat-highlight)' }}>
        1234567890
      </p>
      <Link to="/" style={{ color: 'var(--text-link)' }}>← home</Link>
    </main>
  )
}
