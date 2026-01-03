import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  PlusCircle,
  Search,
  BarChart3,
  User,
  Shield,
  ChefHat,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { BottomNavigationSubmenu, SubmenuItem } from './BottomNavigationSubmenu';

const navigationItems = [
  {
    name: 'Hjem',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Logg',
    href: '/log',
    icon: PlusCircle,
  },
  {
    name: 'Mat',
    href: '/food',
    icon: Search,
  },
  {
    name: 'Schedules',
    href: '/schedules',
    icon: Calendar,
  },
  {
    name: 'Analyse',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Profil',
    href: '/profile',
    icon: User,
  },
];

// Food submenu items
const foodSubmenuItems: SubmenuItem[] = [
  { label: 'Matvarer SIGHI', href: '/food', icon: Search },
  { label: 'Trygge matvarer', href: '/safe-foods', icon: Shield },
  { label: 'Oppskrifter', href: '/recipes/search', icon: ChefHat },
  { label: 'Mine Oppskrifter', href: '/mine-oppskrifter', icon: BookOpen },
];

export function BottomNavigation() {
  const location = useLocation();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  // Check if current route is a food-related page
  const isFoodActive =
    location.pathname === '/food' ||
    location.pathname === '/safe-foods' ||
    location.pathname.startsWith('/recipes') ||
    location.pathname.startsWith('/mine-oppskrifter');

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 z-40 w-full max-w-full">
        <div className="flex justify-around items-center gap-1 max-w-full">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            // Special handling for Mat item
            if (item.name === 'Mat') {
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveSubmenu('food')}
                  className={cn(
                    'flex flex-col items-center py-2 px-1 sm:px-3 rounded-lg transition-colors min-w-0 flex-1 max-w-[20%]',
                    isFoodActive
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                  aria-label="Åpne mat-meny"
                >
                  <Icon className="w-5 h-5 mb-1 flex-shrink-0" />
                  <span className="text-xs font-medium truncate w-full text-center">{item.name}</span>
                </button>
              );
            }

            // Normal navigation items
            const isActive = location.pathname === item.href;

            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center py-2 px-1 sm:px-3 rounded-lg transition-colors min-w-0 flex-1 max-w-[20%]',
                  isActive
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Icon className="w-5 h-5 mb-1 flex-shrink-0" />
                <span className="text-xs font-medium truncate w-full text-center">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Food Submenu */}
      <BottomNavigationSubmenu
        isOpen={activeSubmenu === 'food'}
        onClose={() => setActiveSubmenu(null)}
        items={foodSubmenuItems}
        title="Mat-meny"
      />
    </>
  );
}