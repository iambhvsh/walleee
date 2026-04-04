import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

/**
 * Top-level error boundary.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100dvh', gap: '1rem',
          padding: '2rem', textAlign: 'center', color: 'var(--label)',
          background: 'var(--bg)',
        }}>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none"
            stroke="var(--muted)" strokeWidth="1.4" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '1.4rem' }}>
            Something went wrong
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: 320 }}>
            {this.state.error.message}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
            style={{
              marginTop: '0.5rem', padding: '0.6rem 1.4rem', borderRadius: '2rem',
              background: 'var(--label)', color: 'var(--bg)', border: 'none',
              fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
