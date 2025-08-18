import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { ErrorDisplay } from '../../components/UI/ErrorDisplay';
import { ButtonSpinner } from '../../components/UI/LoadingSpinner';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  
  const from = location.state?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (error) {
      // Error is handled by AuthContext
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gradient">MCAS-Life</span>
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to continue tracking your MCAS journey
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Error Alert */}
          {error && (
            <div className="mb-6">
              <ErrorDisplay 
                error={error} 
                onRetry={() => clearError()} 
                showRetry={false} 
              />
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                className={cn(
                  'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
                  errors.email && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                )}
                placeholder="your@email.com"
                disabled={isSubmitting || isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className={cn(
                    'w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
                    errors.password && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  )}
                  placeholder="Enter your password"
                  disabled={isSubmitting || isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting || isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                onClick={() => {
                  // TODO: Implement forgot password
                  alert('Forgot password functionality coming soon');
                }}
              >
                Forgot your password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className={cn(
                'w-full py-3 px-4 rounded-lg font-medium transition-all duration-200',
                'bg-primary-500 hover:bg-primary-600 text-white',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                (isSubmitting || isLoading) && 'bg-primary-400'
              )}
            >
              {isSubmitting || isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <ButtonSpinner className="text-white" />
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign up for free
              </Link>
            </p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <Heart className="w-4 h-4 mr-1 text-primary-500" />
              MCAS Specialist Approved
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              HIPAA Compliant
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}