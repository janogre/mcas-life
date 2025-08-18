import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service in production
    if (import.meta.env.PROD) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: FallbackComponent } = this.props;
      
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return <DefaultErrorFallback error={this.state.error} retry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, retry }: { error: Error | null; retry: () => void }) {
  const isNetworkError = error?.message.includes('fetch') || error?.message.includes('network');
  const isChunkError = error?.message.includes('ChunkLoadError') || error?.message.includes('Loading chunk');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h1>
        
        <p className="text-gray-600 mb-6">
          {isNetworkError 
            ? 'Unable to connect to the server. Please check your internet connection.'
            : isChunkError
            ? 'The application failed to load. This might be due to a recent update.'
            : 'An unexpected error occurred while running the application.'
          }
        </p>

        {import.meta.env.DEV && error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Error Details
            </summary>
            <pre className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 overflow-auto max-h-32">
              {error.toString()}
            </pre>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={retry}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If this problem persists, please contact support at{' '}
            <a 
              href="mailto:support@mcas-life.com" 
              className="text-primary-600 hover:text-primary-700"
            >
              support@mcas-life.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook for manually triggering error boundary
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    throw error;
  };
}