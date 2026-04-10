export default function App() {
  return (
    <main className="app-shell">
      <section className="hero-card">
        <span className="badge">Quiet Scribe starter</span>
        <h1>Offline-first transcription, ready for GitHub Pages.</h1>
        <p>
          This starter is set up for an installable PWA, local transcript storage, file export,
          and a clean path to WebNN, WebGPU, or WASM-powered speech-to-text.
        </p>

        <div className="grid">
          <article className="panel">
            <h2>Planned inference order</h2>
            <ol>
              <li>WebNN on supported Canary/Edge environments</li>
              <li>WebGPU where model/runtime support is stronger</li>
              <li>WASM fallback for broad offline reliability</li>
            </ol>
          </article>

          <article className="panel">
            <h2>Next implementation steps</h2>
            <ul>
              <li>Add the model loader and inference worker.</li>
              <li>Persist transcripts in IndexedDB.</li>
              <li>Export TXT, Markdown, and JSON files.</li>
              <li>Add recording controls and waveform UI.</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  )
}
