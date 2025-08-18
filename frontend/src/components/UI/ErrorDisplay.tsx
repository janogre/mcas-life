import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
  showRetry?: boolean;
  type?: 'error' | 'warning' | 'network';
  className?: string;
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  showRetry = true, 
  type = 'error',
  className = '' 
}: ErrorDisplayProps) {
  const getIcon = () => {
    switch (type) {
      case 'network':
        return <WifiOff className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'network':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          button: 'btn-outline-blue'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200', 
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          button: 'btn-outline-yellow'
        };
      default:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          button: 'btn-outline-red'
        };
    }
  };

  const colors = getColors();

  return (
    <div className={`rounded-lg p-4 ${colors.bg} ${colors.border} border ${className}`}>
      <div className="flex items-start space-x-3">
        <div className={colors.icon}>
          {getIcon()}
        </div>
        <div className="flex-1">
          <h3 className={`text-sm font-medium ${colors.text}`}>
            {type === 'network' ? 'Connection Error' : 'Error'}
          </h3>
          <p className={`text-sm mt-1 ${colors.text.replace('800', '700')}`}>
            {error}
          </p>
          {showRetry && onRetry && (
            <button
              onClick={onRetry}
              className={`mt-3 inline-flex items-center space-x-2 text-sm font-medium ${colors.button} px-3 py-1 rounded-md border transition-colors`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline error for forms
export function InlineError({ error, className = '' }: { error: string; className?: string }) {
  return (
    <div className={`flex items-center space-x-1 text-red-600 text-sm ${className}`}>
      <AlertCircle className="w-4 h-4" />
      <span>{error}</span>
    </div>
  );
}

// Network connectivity error
export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      type="network"
      error="Unable to connect to server. Please check your internet connection and try again."
      onRetry={onRetry}
      showRetry={true}
    />
  );
}

// Page level error
export function PageError({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <ErrorDisplay
          error={error}
          onRetry={onRetry}
          showRetry={true}
          className="text-center"
        />
      </div>
    </div>
  );
}