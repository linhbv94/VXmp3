import { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in VXmp3:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, background: '#0f1117', color: '#f87171', height: '100vh', fontFamily: 'monospace', overflow: 'auto' }}>
          <h2 style={{ color: '#38bdf8', fontSize: 18, marginBottom: 16 }}>Đã xảy ra lỗi giao diện trong VXmp3:</h2>
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ color: '#ef4444', fontWeight: 'bold' }}>{this.state.error?.toString()}</p>
            <pre style={{ color: '#94a3b8', fontSize: 12, marginTop: 12, whiteSpace: 'pre-wrap' }}>{this.state.error?.stack}</pre>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 20, padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Tải lại ứng dụng
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
