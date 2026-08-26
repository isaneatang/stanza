import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[stanza] render crash:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-background text-textPrimary flex items-center justify-center p-4">
          <div className="card p-8 max-w-md w-full text-center">
            <h1 className="text-lg font-semibold mb-2">Something broke while rendering</h1>
            <p className="text-sm text-textSecondary mb-4 font-mono break-all text-left">
              {this.state.error.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full justify-center"
            >
              Reload Stanza
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
