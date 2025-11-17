import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  AlertCircle,
  Search,
  Shield,
  BookOpen,
  User,
  Wind,
  ChefHat
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navigationItems = [
  {
    name: 'Hjem',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Mat',
    href: '/food',
    icon: Search,
  },
  {
    name: 'Oppskrifter',
    href: '/recipes/search',
    icon: ChefHat,
  },
  {
    name: 'Dagbok',
    href: '/diary',
    icon: BookOpen,
  },
  {
    name: 'Profil',
    href: '/profile',
    icon: User,
  },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-40">
      <div className="flex justify-around">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex flex-col items-center py-2 px-3 rounded-lg transition-colors min-w-0 flex-1',
                isActive
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium truncate">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}