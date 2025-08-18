import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  overlay?: boolean;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  message, 
  overlay = false,
  className = '' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
      <RefreshCw className={`${sizeClasses[size]} animate-spin text-primary-600`} />
      {message && (
        <p className={`${textSizeClasses[size]} text-gray-600 animate-pulse`}>
          {message}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

// Inline loading for buttons
export function ButtonSpinner({ className = '' }: { className?: string }) {
  return (
    <RefreshCw className={`w-4 h-4 animate-spin ${className}`} />
  );
}

// Page level loading
export function PageLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
}

// Card/Section loading
export function SectionLoading({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <LoadingSpinner size="md" message={message} />
    </div>
  );
}