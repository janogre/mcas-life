import React from 'react';
import { LucideIcon } from 'lucide-react';
import { useApiCall } from '../../hooks/useAsync';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { ErrorDisplay } from '../UI/ErrorDisplay';

interface StatData {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface StatsWidgetProps {
  title: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  apiCall?: () => Promise<StatData>;
  staticData?: StatData;
  className?: string;
}

export function StatsWidget({
  title,
  icon: Icon,
  color,
  bgColor,
  apiCall,
  staticData,
  className = ''
}: StatsWidgetProps) {
  const {
    data: apiData,
    loading,
    error,
    retry
  } = useApiCall(apiCall || (() => Promise.resolve(staticData!)), {
    immediate: !!apiCall
  });

  const data = apiData || staticData;

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '—';
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
          <div className="w-6 h-6">
            <LoadingSpinner size="sm" />
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center opacity-50`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
        
        <ErrorDisplay
          error="Failed to load statistics"
          onRetry={retry}
          showRetry={true}
          type="warning"
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-center h-24 text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {data.trend && (
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getTrendColor(data.trend)}`}>
            {getTrendIcon(data.trend)}
          </div>
        )}
      </div>
      
      <h3 className="text-2xl font-bold text-gray-900 mb-1">
        {data.value}
      </h3>
      <p className="text-sm text-gray-600">{data.label}</p>
      
      {data.change && (
        <p className="text-xs text-gray-500 mt-2">{data.change}</p>
      )}
    </div>
  );
}