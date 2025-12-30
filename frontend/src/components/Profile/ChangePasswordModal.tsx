import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPassword = watch('new_password');

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { strength: 0, label: '' };

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[!@#$%^&*(),.?\":{}|<>]/.test(pwd)) strength++;

    const labels = ['', 'Svakt', 'Greit', 'Bra', 'Sterkt', 'Veldig sterkt'];
    const colors = ['', 'text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500', 'text-green-600'];

    return {
      strength: (strength / 5) * 100,
      label: labels[strength],
      color: colors[strength]
    };
  };

  const passwordStrength = getPasswordStrength(newPassword || '');

  const onSubmit = async (data: ChangePasswordFormData) => {
    setError(null);
    setIsSuccess(false);

    try {
      await api.post('/auth/change-password', {
        current_password: data.current_password,
        new_password: data.new_password,
      });

      setIsSuccess(true);
      reset();

      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kunne ikke endre passord. Sjekk at nåværende passord er korrekt.');
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Endre passord</h2>
        <p className="text-gray-600 mb-6">
          Oppgi nåværende passord og velg et nytt sikkert passord
        </p>

        {/* Success message */}
        {isSuccess && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
            <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Passordet er endret!</h3>
              <p className="text-sm text-green-700 mt-1">Du vil bli logget ut fra alle enheter.</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Kunne ikke endre passord</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Current Password */}
          <div>
            <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-2">
              Nåværende passord
            </label>
            <div className="relative">
              <input
                {...register('current_password')}
                type={showCurrentPassword ? 'text' : 'password'}
                id="current_password"
                className={cn(
                  'w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
                  errors.current_password && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                )}
                placeholder="Skriv inn nåværende passord"
                disabled={isSubmitting || isSuccess}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isSubmitting || isSuccess}
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.current_password && (
              <p className="mt-1 text-sm text-red-600">{errors.current_password.message}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
              Nytt passord
            </label>
            <div className="relative">
              <input
                {...register('new_password')}
                type={showNewPassword ? 'text' : 'password'}
                id="new_password"
                className={cn(
                  'w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
                  errors.new_password && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                )}
                placeholder="Velg et sterkt passord"
                disabled={isSubmitting || isSuccess}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isSubmitting || isSuccess}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {newPassword && (
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

            {errors.new_password && (
              <p className="mt-1 text-sm text-red-600">{errors.new_password.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
              Bekreft nytt passord
            </label>
            <div className="relative">
              <input
                {...register('confirm_password')}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirm_password"
                className={cn(
                  'w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors',
                  errors.confirm_password && 'border-red-300 focus:ring-red-500 focus:border-red-500'
                )}
                placeholder="Skriv inn passordet på nytt"
                disabled={isSubmitting || isSuccess}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isSubmitting || isSuccess}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="mt-1 text-sm text-red-600">{errors.confirm_password.message}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              disabled={isSubmitting || isSuccess}
            >
              Avbryt
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSuccess}
              className={cn(
                'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
                'bg-primary-500 hover:bg-primary-600 text-white',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Endrer...</span>
                </div>
              ) : (
                'Endre passord'
              )}
            </button>
          </div>
        </form>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Du vil bli logget ut fra alle enheter etter passordendring
        </p>
      </div>
    </div>
  );
}
