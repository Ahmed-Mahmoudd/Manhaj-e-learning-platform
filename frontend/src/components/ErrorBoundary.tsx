import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  title?: string;
  message?: string;
  retryLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors in child trees so a crash shows a recovery UI
 * instead of a blank page.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { title, message, retryLabel } = this.props;
      return (
        <div
          className="border border-brick/30 bg-brick/5 px-6 py-8"
          role="alert"
        >
          <h2 className="text-lg font-semibold text-brick">
            {title ?? 'Something went wrong'}
          </h2>
          <p className="mt-2 text-sm text-ink/70">
            {message ?? 'An unexpected error occurred while loading this page.'}
          </p>
          {this.state.error && (
            <pre className="mt-4 max-h-40 overflow-auto rounded bg-ink/5 p-3 font-mono text-xs text-ink/60">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-4 bg-brass px-4 py-2 text-sm text-white transition hover:bg-brass-hover"
          >
            {retryLabel ?? 'Try again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
