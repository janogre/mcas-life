import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChefHat,
  ChevronDown,
  Search,
  Shield,
  BookOpen,
  UtensilsCrossed
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);
  const [showFoodMenu, setShowFoodMenu] = React.useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and brand */}
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">MCAS-Life</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link
              to="/dashboard"
              className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
            >
              Dashboard
            </Link>

            {/* Mat dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setShowFoodMenu(true)}
              onMouseLeave={() => setShowFoodMenu(false)}
            >
              <button
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors flex items-center space-x-1 py-2"
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Mat</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showFoodMenu && (
                <div className="absolute left-0 top-full pt-1 w-56 z-50">
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <Link
                      to="/food"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    >
                      <Search className="w-4 h-4" />
                      <span>Matvarer SIGHI</span>
                    </Link>
                    <Link
                      to="/safe-foods"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Trygge matvarer</span>
                    </Link>
                    <Link
                      to="/recipes/search"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    >
                      <ChefHat className="w-4 h-4" />
                      <span>Oppskrifter</span>
                    </Link>
                    <Link
                      to="/mine-oppskrifter"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Mine Oppskrifter</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/symptoms"
              className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
            >
              Symptomer
            </Link>
            <Link
              to="/diary"
              className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
            >
              Dagbok
            </Link>
            <Link
              to="/analytics"
              className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
            >
              Innsikt & analyser
            </Link>
          </nav>

          {/* Right side - User menu */}
          <div className="flex items-center space-x-4">
            {/* Notifications (placeholder) */}
            <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>

            {/* User menu */}
            <div className="relative">
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-600" />
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {user?.first_name || 'User'}
                </span>
              </button>

              {/* Desktop dropdown menu */}
              {showMobileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>

                  {/* Admin link - only show for admin users */}
                  {user?.role === 'admin' && (
                    <>
                      <hr className="my-1" />
                      <Link
                        to="/admin"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <Shield className="w-4 h-4" />
                        <span>Brukeradmin</span>
                      </Link>
                    </>
                  )}

                  <hr className="my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600"
            >
              {showMobileMenu ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <nav className="flex flex-col space-y-2">
              <Link
                to="/dashboard"
                className="px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Dashboard
              </Link>

              {/* Mat section */}
              <div className="px-4 py-2">
                <div className="flex items-center space-x-2 text-gray-500 text-sm font-medium mb-2">
                  <UtensilsCrossed className="w-4 h-4" />
                  <span>Mat</span>
                </div>
                <div className="ml-6 space-y-1">
                  <Link
                    to="/food"
                    className="block px-3 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Matvarer SIGHI
                  </Link>
                  <Link
                    to="/safe-foods"
                    className="block px-3 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Trygge matvarer
                  </Link>
                  <Link
                    to="/recipes/search"
                    className="block px-3 py-2 text-sm text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded transition-colors"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Oppskrifter
                  </Link>
                </div>
              </div>

              <Link
                to="/symptoms"
                className="px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Symptomer
              </Link>
              <Link
                to="/diary"
                className="px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Dagbok
              </Link>
              <Link
                to="/analytics"
                className="px-4 py-2 text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
                onClick={() => setShowMobileMenu(false)}
              >
                Innsikt & analyser
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}