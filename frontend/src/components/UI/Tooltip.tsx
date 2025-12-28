import React from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  showIcon?: boolean;
  iconClassName?: string;
}

/**
 * Reusable Tooltip component
 * Uses native HTML title attribute for accessibility and simplicity
 * Optional help icon can be displayed
 */
export function Tooltip({ content, children, showIcon = false, iconClassName = '' }: TooltipProps) {
  if (showIcon) {
    return (
      <span className="inline-flex items-center gap-1" title={content}>
        {children}
        <HelpCircle className={`w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help ${iconClassName}`} />
      </span>
    );
  }

  return (
    <span title={content} className="cursor-help">
      {children}
    </span>
  );
}

interface InfoTooltipProps {
  content: string;
  className?: string;
}

/**
 * Standalone info icon with tooltip
 * Useful for adding help text next to labels
 */
export function InfoTooltip({ content, className = '' }: InfoTooltipProps) {
  return (
    <HelpCircle
      className={`w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help inline-block ${className}`}
      title={content}
    />
  );
}
