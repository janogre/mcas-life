import React from 'react';
import { Header } from './Header';
import { BottomNavigation } from './BottomNavigation';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 pb-16 md:pb-0">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {children}
        </div>
      </main>
      
      {/* Bottom navigation for mobile */}
      <BottomNavigation />
    </div>
  );
}