import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';
import { FloatingActionButton } from '../UI/FloatingActionButton';
import { QuickAddModal } from '../UI/QuickAddModal';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const location = useLocation();

  // Determine context type based on current route
  const getContextType = () => {
    if (location.pathname.includes('/food')) return 'food';
    if (location.pathname.includes('/symptoms')) return 'symptoms';
    if (location.pathname.includes('/analytics')) return 'analytics';
    return 'dashboard';
  };

  // Hide FAB on the /log page itself
  const shouldShowFAB = !location.pathname.includes('/log');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col overflow-x-hidden w-full">
      <Header />

      <main className="flex-1 pb-16 md:pb-0 w-full overflow-x-hidden">
        <div className="container mx-auto px-4 py-6 max-w-7xl w-full">
          {children}
        </div>
      </main>

      {/* Bottom navigation for mobile */}
      <BottomNavigation />

      {/* Floating Action Button - show on all pages except /log */}
      {shouldShowFAB && (
        <FloatingActionButton onClick={() => setShowQuickAdd(true)} />
      )}

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        contextType={getContextType()}
      />
    </div>
  );
}