import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Rete di sicurezza: se un componente lancia, mostra una schermata di errore
 * leggibile invece della pagina bianca. Nessun dato d'esame va perso perché è
 * salvato server-side alla consegna.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('App crashed:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="shell">
        <div className="card" style={{ borderTop: '5px solid var(--error)', maxWidth: 560, margin: '2rem auto' }}>
          <h2 style={{ color: 'var(--error)', marginTop: 0 }}>Errore tecnico</h2>
          <p>L’applicazione ha riscontrato un errore inatteso. Ricarica la pagina per continuare.</p>
          {this.state.error && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer' }}>Dettagli tecnici</summary>
              <pre
                className="mono"
                style={{
                  fontSize: '0.72rem',
                  overflow: 'auto',
                  background: 'var(--readonly-bg)',
                  padding: '0.6rem',
                  borderRadius: 6,
                  maxHeight: 220,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {this.state.error.stack || this.state.error.message}
              </pre>
            </details>
          )}
          <div className="actions">
            <button className="btn" type="button" onClick={() => window.location.reload()}>
              Ricarica l’app
            </button>
          </div>
        </div>
      </div>
    );
  }
}
