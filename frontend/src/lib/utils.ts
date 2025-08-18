import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

/**
 * Utility function for merging Tailwind classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string, formatStr: string = 'PP') {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string) {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Get SIGHI compatibility color and label
 */
export function getSighiCompatibility(level: 0 | 1 | 2 | 3) {
  const compatibilityMap = {
    0: {
      label: 'Safe',
      color: 'sighi-safe',
      bgColor: 'bg-sighi-safe',
      textColor: 'text-sighi-safe',
      description: 'Well tolerated, no symptoms expected'
    },
    1: {
      label: 'Medium',
      color: 'sighi-medium',
      bgColor: 'bg-sighi-medium',
      textColor: 'text-sighi-medium',
      description: 'Moderately compatible, occasional consumption of small quantities often tolerated'
    },
    2: {
      label: 'Incompatible',
      color: 'sighi-incompatible',
      bgColor: 'bg-sighi-incompatible',
      textColor: 'text-sighi-incompatible',
      description: 'Incompatible, significant symptoms at usual intake'
    },
    3: {
      label: 'Severe',
      color: 'sighi-severe',
      bgColor: 'bg-sighi-severe',
      textColor: 'text-sighi-severe',
      description: 'Very poorly tolerated, severe symptoms'
    }
  };

  return compatibilityMap[level];
}

/**
 * Get symptom severity color and label
 */
export function getSymptomSeverity(severity: number) {
  if (severity <= 3) {
    return {
      label: 'Mild',
      color: 'severity-low',
      bgColor: 'bg-severity-low',
      textColor: 'text-severity-low'
    };
  } else if (severity <= 6) {
    return {
      label: 'Moderate',
      color: 'severity-medium',
      bgColor: 'bg-severity-medium',
      textColor: 'text-severity-medium'
    };
  } else {
    return {
      label: 'Severe',
      color: 'severity-high',
      bgColor: 'bg-severity-high',
      textColor: 'text-severity-high'
    };
  }
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Calculate correlation score color
 */
export function getCorrelationColor(score: number) {
  if (score >= 0.8) return 'text-red-600 bg-red-50';
  if (score >= 0.6) return 'text-orange-600 bg-orange-50';
  if (score >= 0.4) return 'text-yellow-600 bg-yellow-50';
  return 'text-green-600 bg-green-50';
}

/**
 * Format percentage with proper display
 */
export function formatPercentage(value: number, decimals: number = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate random ID for client-side operations
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Calculate time difference in hours
 */
export function getHoursDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
}