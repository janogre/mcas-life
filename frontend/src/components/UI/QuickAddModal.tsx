import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Pill,
  Apple,
  Activity,
  Thermometer,
  Droplet,
  ArrowRight,
} from 'lucide-react';

interface QuickAddOption {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  route: string;
}

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  contextType?: 'dashboard' | 'food' | 'symptoms' | 'analytics';
}

export function QuickAddModal({ isOpen, onClose, contextType = 'dashboard' }: QuickAddModalProps) {
  const navigate = useNavigate();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const allOptions: QuickAddOption[] = [
    {
      type: 'symptom',
      label: 'Symptom',
      icon: <AlertCircle style={{ width: '24px', height: '24px' }} />,
      color: '#ef4444',
      bgColor: '#fee2e2',
      route: '/symptoms/add',
    },
    {
      type: 'medication',
      label: 'Medisin & Kosttilskudd',
      icon: <Pill style={{ width: '24px', height: '24px' }} />,
      color: '#8b5cf6',
      bgColor: '#f3e8ff',
      route: '/medications/add',
    },
    {
      type: 'meal',
      label: 'Måltid',
      icon: <Apple style={{ width: '24px', height: '24px' }} />,
      color: 'var(--color-medical-600)',
      bgColor: 'var(--color-medical-50)',
      route: '/meals/add',
    },
    {
      type: 'activity',
      label: 'Aktivitet',
      icon: <Activity style={{ width: '24px', height: '24px' }} />,
      color: '#f59e0b',
      bgColor: '#fef3c7',
      route: '/activities/add',
    },
    {
      type: 'illness',
      label: 'Syk?',
      icon: <Thermometer style={{ width: '24px', height: '24px' }} />,
      color: '#ef4444',
      bgColor: '#fef2f2',
      route: '/illness/add',
    },
    {
      type: 'period',
      label: 'Periode',
      icon: <Droplet style={{ width: '24px', height: '24px' }} />,
      color: '#ec4899',
      bgColor: '#fdf2f8',
      route: '/menstrual/add',
    },
  ];

  // Context-aware sorting: prioritize relevant options
  const getOrderedOptions = () => {
    const priority: { [key: string]: string[] } = {
      dashboard: ['symptom', 'meal', 'medication', 'activity', 'illness', 'period'],
      food: ['meal', 'symptom', 'medication', 'activity', 'illness', 'period'],
      symptoms: ['symptom', 'medication', 'meal', 'activity', 'illness', 'period'],
      analytics: ['symptom', 'meal', 'medication', 'activity', 'illness', 'period'],
    };

    const order = priority[contextType] || priority.dashboard;
    return allOptions.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  };

  const handleOptionClick = (route: string) => {
    onClose();
    navigate(route);
  };

  const handleViewAll = () => {
    onClose();
    navigate('/log');
  };

  if (!isOpen) return null;

  const orderedOptions = getOrderedOptions();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal content */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '600px',
          background: 'white',
          borderTopLeftRadius: 'var(--radius-gentle)',
          borderTopRightRadius: 'var(--radius-gentle)',
          padding: 'var(--space-6)',
          paddingBottom: 'calc(var(--space-6) + env(safe-area-inset-bottom))',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
          animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Handle bar */}
        <div
          style={{
            width: '40px',
            height: '4px',
            background: 'var(--color-sage-200)',
            borderRadius: '2px',
            margin: '0 auto var(--space-5)',
          }}
        />

        {/* Title */}
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-h2)',
            fontWeight: 600,
            color: 'var(--color-sage-900)',
            marginBottom: 'var(--space-5)',
            textAlign: 'center',
          }}
        >
          Hurtigregistrering
        </h2>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {orderedOptions.map((option, index) => (
            <button
              key={option.type}
              onClick={() => handleOptionClick(option.route)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-soft)',
                border: `2px solid ${option.bgColor}`,
                background: 'white',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                animation: `fadeInUp 0.3s ease ${index * 50}ms both`,
              }}
              className="quick-add-option"
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  background: option.bgColor,
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <div style={{ color: option.color }}>{option.icon}</div>
              </div>
              <span
                style={{
                  fontSize: 'var(--text-body)',
                  fontWeight: 600,
                  color: 'var(--color-sage-800)',
                  flex: 1,
                  textAlign: 'left',
                }}
              >
                {option.label}
              </span>
            </button>
          ))}
        </div>

        {/* View all button */}
        <button
          onClick={handleViewAll}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-soft)',
            border: '2px solid var(--color-sage-200)',
            background: 'white',
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            marginTop: 'var(--space-3)',
          }}
          className="view-all-btn"
        >
          <span
            style={{
              fontSize: 'var(--text-body)',
              fontWeight: 600,
              color: 'var(--color-sage-700)',
            }}
          >
            Se alle alternativer
          </span>
          <ArrowRight style={{ width: '18px', height: '18px', color: 'var(--color-sage-700)' }} />
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .quick-add-option:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .quick-add-option:active {
          transform: translateY(0);
        }

        .view-all-btn:hover {
          background: var(--color-sage-50);
          border-color: var(--color-sage-300);
        }

        @media (min-width: 640px) {
          .quick-add-option {
            padding: var(--space-5);
          }
        }
      `}</style>
    </div>
  );
}
