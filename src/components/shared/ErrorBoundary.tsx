import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: Sentry.captureException(error);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="glass-morphism rounded-3xl p-8 max-w-2xl w-full">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-6">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>

              <h1 className="text-3xl font-bold text-white mb-3">
                Qualcosa è andato storto
              </h1>

              <p className="text-slate-300 mb-6">
                Si è verificato un errore inaspettato. Non preoccuparti, i tuoi dati sono al sicuro.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="glass-morphism rounded-xl p-4 mb-6 text-left">
                  <h3 className="text-sm font-bold text-red-400 mb-2">Error Details:</h3>
                  <pre className="text-xs text-slate-300 overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <button
                  onClick={this.handleReset}
                  className="liquid-button text-white flex items-center gap-2 hover:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4" />
                  Riprova
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="liquid-button text-white flex items-center gap-2 hover:bg-white/10"
                >
                  <Home className="w-4 h-4" />
                  Torna alla Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
