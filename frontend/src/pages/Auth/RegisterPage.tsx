import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Heart, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  mcas_severity: z.enum(['mild', 'moderate', 'severe']),
  confirmed_diagnosis: z.boolean(),
  agree_terms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      mcas_severity: 'moderate',
      confirmed_diagnosis: false,
      agree_terms: false,
    },
  });

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      clearError();
      await registerUser({
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        mcas_severity: data.mcas_severity,
        confirmed_diagnosis: data.confirmed_diagnosis,
      });
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by AuthContext
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: '' };
    
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*(),.?\":{}|<>]/.test(pwd)) strength++;

    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
    const colors = ['', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 'text-green-600'];
    
    return { 
      strength: (strength / 5) * 100, 
      label: labels[strength], 
      color: colors[strength] 
    };
  };

  const passwordStrength = getPasswordStrength(password || '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-gradient">MCAS-Life</span>
          </Link>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Start Your MCAS Journey
          </h1>
          <p className="text-gray-600">
            Join thousands of patients already using AI-powered trigger analysis
          </p>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Registration failed</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  {...register('first_name')}
                  type="text"
                  id="first_name"
                  className={cn(
                    'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
                    errors.first_name && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  )}
                  placeholder="Your first name"
                  disabled={isSubmitting || isLoading}
                />
                {errors.first_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  {...register('last_name')}
                  type="text"
                  id="last_name"
                  className={cn(
                    'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
                    errors.last_name && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  )}
                  placeholder="Your last name"
                  disabled={isSubmitting || isLoading}
                />
                {errors.last_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
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

            {/* Password */}
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
                  placeholder="Create a strong password"
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
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={cn(
                          'h-2 rounded-full transition-all',
                          passwordStrength.strength < 25 ? 'bg-red-500' :
                          passwordStrength.strength < 50 ? 'bg-orange-500' :
                          passwordStrength.strength < 75 ? 'bg-yellow-500' :
                          'bg-green-500'
                        )}
                        style={{ width: `${passwordStrength.strength}%` }}
                      />
                    </div>
                    <span className={cn('text-xs font-medium', passwordStrength.color)}>
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}
              
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  className={cn(
                    'w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
                    errors.confirmPassword && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                  )}
                  placeholder="Confirm your password"
                  disabled={isSubmitting || isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isSubmitting || isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            {/* MCAS Information */}
            <div className="bg-primary-50 rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">MCAS Information</h3>
              
              {/* MCAS Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MCAS Severity Level
                </label>
                <select
                  {...register('mcas_severity')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  disabled={isSubmitting || isLoading}
                >
                  <option value="mild">Mild - Occasional symptoms, manageable</option>
                  <option value="moderate">Moderate - Regular symptoms, some lifestyle impact</option>
                  <option value="severe">Severe - Frequent symptoms, significant lifestyle impact</option>
                </select>
              </div>

              {/* Diagnosis Confirmation */}
              <div className="flex items-start space-x-3">
                <input
                  {...register('confirmed_diagnosis')}
                  type="checkbox"
                  id="confirmed_diagnosis"
                  className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  disabled={isSubmitting || isLoading}
                />
                <label htmlFor="confirmed_diagnosis" className="text-sm text-gray-700">
                  I have a confirmed MCAS diagnosis from a medical professional
                  <span className="block text-xs text-gray-500 mt-1">
                    This helps us provide more accurate recommendations
                  </span>
                </label>
              </div>
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start space-x-3">
              <input
                {...register('agree_terms')}
                type="checkbox"
                id="agree_terms"
                className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                disabled={isSubmitting || isLoading}
              />
              <label htmlFor="agree_terms" className="text-sm text-gray-700">
                I agree to the{' '}
                <Link to="/terms" className="text-primary-600 hover:text-primary-700">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary-600 hover:text-primary-700">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {errors.agree_terms && (
              <p className="text-sm text-red-600">{errors.agree_terms.message}</p>
            )}

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
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}