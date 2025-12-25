import React, { useState, ReactNode } from 'react';
import { ChevronLeft, Check } from 'lucide-react';

export interface FormStepProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext?: () => void | Promise<void>;
  onBack?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  showBack?: boolean;
  showSkip?: boolean;
  isLastStep?: boolean;
  isValid?: boolean;
}

export function FormStep({
  title,
  subtitle,
  children,
  onNext,
  onBack,
  onSkip,
  nextLabel = 'Fortsett',
  backLabel = 'Tilbake',
  skipLabel = 'Hopp over',
  showBack = true,
  showSkip = false,
  isLastStep = false,
  isValid = true,
}: FormStepProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = async () => {
    if (!isValid || !onNext) return;

    setIsLoading(true);
    try {
      await onNext();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        animation: 'slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Step header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-h2)',
            fontWeight: 600,
            color: 'var(--color-sage-900)',
            marginBottom: 'var(--space-2)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            style={{
              fontSize: 'var(--text-body)',
              color: 'var(--color-sage-600)',
              fontWeight: 400,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Step content */}
      <div style={{ marginBottom: 'var(--space-6)' }}>{children}</div>

      {/* Navigation buttons */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          paddingTop: 'var(--space-5)',
          borderTop: '1px solid var(--color-sage-100)',
        }}
      >
        {showBack && onBack && (
          <button
            onClick={onBack}
            disabled={isLoading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-soft)',
              border: '2px solid var(--color-sage-200)',
              background: 'white',
              fontSize: 'var(--text-body)',
              fontWeight: 600,
              color: 'var(--color-sage-700)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            className="form-back-btn"
          >
            <ChevronLeft style={{ width: '18px', height: '18px' }} />
            {backLabel}
          </button>
        )}

        {showSkip && onSkip && (
          <button
            onClick={onSkip}
            disabled={isLoading}
            style={{
              padding: 'var(--space-4) var(--space-5)',
              borderRadius: 'var(--radius-soft)',
              border: 'none',
              background: 'transparent',
              fontSize: 'var(--text-body)',
              fontWeight: 600,
              color: 'var(--color-sage-500)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            className="form-skip-btn"
          >
            {skipLabel}
          </button>
        )}

        {onNext && (
          <button
            onClick={handleNext}
            disabled={!isValid || isLoading}
            style={{
              flex: showBack ? 1 : 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-4)',
              borderRadius: 'var(--radius-soft)',
              border: 'none',
              background: isValid
                ? 'linear-gradient(135deg, var(--color-medical-500) 0%, var(--color-medical-600) 100%)'
                : 'var(--color-sage-200)',
              fontSize: 'var(--text-body)',
              fontWeight: 600,
              color: 'white',
              cursor: isValid ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: isLoading ? 0.7 : 1,
            }}
            className="form-next-btn"
          >
            {isLoading ? (
              <div className="spinner" />
            ) : (
              <>
                {isLastStep ? (
                  <>
                    <Check style={{ width: '18px', height: '18px' }} />
                    {nextLabel}
                  </>
                ) : (
                  nextLabel
                )}
              </>
            )}
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .form-back-btn:hover:not(:disabled) {
          background: var(--color-sage-50);
          border-color: var(--color-sage-300);
        }

        .form-skip-btn:hover:not(:disabled) {
          color: var(--color-sage-700);
        }

        .form-next-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .form-next-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

interface ProgressiveFormContainerProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  onClose?: () => void;
  title?: string;
}

export function ProgressiveFormContainer({
  children,
  currentStep,
  totalSteps,
  onClose,
  title,
}: ProgressiveFormContainerProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="progressive-form-container">
      {/* Header with progress */}
      {title && (
        <div
          style={{
            background: 'white',
            borderBottom: '1px solid var(--color-sage-100)',
            padding: 'var(--space-5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-3)',
            }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-h3)',
                fontWeight: 600,
                color: 'var(--color-sage-900)',
              }}
            >
              {title}
            </h1>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  padding: 'var(--space-2)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-sage-500)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-body)',
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div
            style={{
              height: '4px',
              background: 'var(--color-sage-100)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--color-medical-500) 0%, var(--color-medical-600) 100%)',
                transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>

          {/* Step indicator */}
          <p
            style={{
              marginTop: 'var(--space-2)',
              fontSize: 'var(--text-small)',
              color: 'var(--color-sage-600)',
              fontWeight: 500,
            }}
          >
            Steg {currentStep + 1} av {totalSteps}
          </p>
        </div>
      )}

      {/* Form content */}
      <div
        style={{
          padding: 'var(--space-6)',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
