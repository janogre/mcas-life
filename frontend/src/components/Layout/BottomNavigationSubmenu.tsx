import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

export interface SubmenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface BottomNavigationSubmenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: SubmenuItem[];
  title: string;
}

export function BottomNavigationSubmenu({
  isOpen,
  onClose,
  items,
  title,
}: BottomNavigationSubmenuProps) {
  // Prevent body scroll when submenu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-50 md:hidden"
        style={{
          animation: 'fadeIn 200ms ease-out',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Submenu Panel */}
      <div
        className="fixed left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl z-50 md:hidden"
        style={{
          animation: 'slideUp 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Handle bar for visual affordance */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Title */}
        <div className="px-6 pb-3">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>

        {/* Menu items */}
        <nav className="pb-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className="flex items-center gap-4 px-6 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors active:bg-primary-100"
                style={{ minHeight: '48px' }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-base font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}
