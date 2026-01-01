import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface FABProps {
  onClick?: () => void;
  className?: string;
}

export function FloatingActionButton({ onClick, className = '' }: FABProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <>
      {/* Backdrop when expanded */}
      {isExpanded && (
        <div
          onClick={() => setIsExpanded(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(2px)',
            zIndex: 998,
            animation: 'fadeIn 0.2s ease',
          }}
        />
      )}

      {/* Main FAB */}
      <button
        onClick={handleClick}
        className={`fab-button ${className}`}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--space-4) + 60px)', // Above bottom nav on mobile
          right: 'max(var(--space-4), env(safe-area-inset-right))',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-medical-500) 0%, var(--color-medical-600) 100%)',
          boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 999,
        }}
        aria-label="Quick add"
      >
        <div
          style={{
            transform: isExpanded ? 'rotate(45deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {isExpanded ? (
            <X style={{ width: '24px', height: '24px', color: 'white' }} />
          ) : (
            <Plus style={{ width: '24px', height: '24px', color: 'white' }} />
          )}
        </div>
      </button>

      <style>{`
        .fab-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 24px rgba(16, 185, 129, 0.5);
        }

        .fab-button:active {
          transform: scale(0.95);
        }

        @media (min-width: 768px) {
          .fab-button {
            bottom: var(--space-4) !important;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
