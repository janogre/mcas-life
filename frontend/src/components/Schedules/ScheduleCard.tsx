/**
 * ScheduleCard - Display schedule summary with actions
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { RecurringSchedule } from '../../types/shared';
import {
  SCHEDULE_TYPE_NAMES_NO,
  MEAL_TYPE_NAMES_NO,
  ACTIVITY_TYPE_NAMES_NO,
  MEDICATION_TYPE_NAMES_NO,
  FREQUENCY_TYPE_NAMES_NO,
  WEEKDAY_NAMES_SHORT_NO
} from '../../types/shared';

interface ScheduleCardProps {
  schedule: RecurringSchedule;
  onEdit: () => void;
  onPause: () => void;
  onDelete: () => void;
  onViewCalendar: () => void;
  nextInstance?: { date: string; time: string };
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onEdit,
  onPause,
  onDelete,
  onViewCalendar,
  nextInstance
}) => {
  const navigate = useNavigate();

  // Get schedule title based on type
  const getScheduleTitle = () => {
    switch (schedule.schedule_type) {
      case 'medication':
        return schedule.medication_custom_name || `Medisin #${schedule.medication_catalog_id}`;
      case 'meal':
        return schedule.meal_type ? MEAL_TYPE_NAMES_NO[schedule.meal_type] : 'Måltid';
      case 'activity':
        return schedule.activity_type ? ACTIVITY_TYPE_NAMES_NO[schedule.activity_type] : 'Aktivitet';
      default:
        return 'Ukjent';
    }
  };

  // Get schedule subtitle/details
  const getScheduleDetails = () => {
    switch (schedule.schedule_type) {
      case 'medication':
        if (schedule.dosage && schedule.dosage_unit) {
          return `${schedule.dosage} ${schedule.dosage_unit}`;
        }
        if (schedule.medication_type) {
          return MEDICATION_TYPE_NAMES_NO[schedule.medication_type];
        }
        return '';
      case 'meal':
        return schedule.notes || '';
      case 'activity':
        if (schedule.activity_duration_minutes) {
          return `${schedule.activity_duration_minutes} minutter`;
        }
        return '';
      default:
        return '';
    }
  };

  // Get frequency pattern description
  const getFrequencyDescription = () => {
    let description = '';

    switch (schedule.frequency_type) {
      case 'daily':
        description = 'Daglig';
        break;
      case 'weekly':
        if (schedule.weekly_days && schedule.weekly_days.length > 0) {
          const days = schedule.weekly_days
            .map(day => WEEKDAY_NAMES_SHORT_NO[day])
            .join(', ');
          description = `Hver ${days}`;
        }
        break;
      case 'interval':
        if (schedule.interval_count && schedule.interval_unit) {
          const unit = schedule.interval_unit === 'days' ? 'dag' : 'uke';
          const plural = schedule.interval_count > 1 ? (schedule.interval_unit === 'days' ? 'dager' : 'uker') : unit;
          description = `Hver ${schedule.interval_count} ${plural}`;
        }
        break;
    }

    // Add times
    if (schedule.scheduled_times && schedule.scheduled_times.length > 0) {
      description += ` kl ${schedule.scheduled_times.join(', ')}`;
    }

    return description;
  };

  // Format next instance
  const formatNextInstance = () => {
    if (!nextInstance) return 'Ingen kommende';

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (nextInstance.date === today) {
      return `I dag kl ${nextInstance.time}`;
    } else if (nextInstance.date === tomorrow) {
      return `I morgen kl ${nextInstance.time}`;
    } else {
      const date = new Date(nextInstance.date);
      return `${date.toLocaleDateString('nb-NO')} kl ${nextInstance.time}`;
    }
  };

  // Get icon based on schedule type
  const getTypeIcon = () => {
    switch (schedule.schedule_type) {
      case 'medication':
        return '💊';
      case 'meal':
        return '🍽️';
      case 'activity':
        return '🏃';
      default:
        return '📅';
    }
  };

  // Get color based on schedule type
  const getTypeColor = () => {
    switch (schedule.schedule_type) {
      case 'medication':
        return 'bg-blue-100 text-blue-800';
      case 'meal':
        return 'bg-green-100 text-green-800';
      case 'activity':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getTypeIcon()}</span>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{getScheduleTitle()}</h3>
            {getScheduleDetails() && (
              <p className="text-sm text-gray-600">{getScheduleDetails()}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor()}`}>
            {SCHEDULE_TYPE_NAMES_NO[schedule.schedule_type]}
          </span>
          {!schedule.is_active && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
              Pauset
            </span>
          )}
        </div>
      </div>

      {/* Pattern and Next Instance */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{getFrequencyDescription()}</span>
        </div>

        {schedule.is_active && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="font-medium">Neste:</span>
            <span>{formatNextInstance()}</span>
          </div>
        )}

        {schedule.notes && (
          <div className="text-sm text-gray-500 italic">
            {schedule.notes}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={onViewCalendar}
          className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
        >
          📅 Kalender
        </button>
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          ✏️ Rediger
        </button>
        <button
          onClick={onPause}
          className="flex-1 px-3 py-2 text-sm font-medium text-orange-700 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors"
        >
          ⏸️ Pause
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default ScheduleCard;
