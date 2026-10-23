import { traces } from './data/traces'

// Hour 0 smoke screen: proves traces load. M2 replaces this with AppShell.
function App() {
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Proof Player</h1>
      <p>{traces.length} traces loaded</p>
      <ul>
        {traces.map((t) => (
          <li key={t.id}>
            <strong>{t.title}</strong> ({t.viz}, {t.steps.length} steps) — Lean {t.provenance.lean}
          </li>
        ))}
      </ul>
    </main>
  )
}

export default App
