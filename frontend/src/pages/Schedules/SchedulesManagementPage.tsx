/**
 * SchedulesManagementPage - Main schedules hub with tabs for each type
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { schedulesApi } from '../../lib/api';
import ScheduleCard from '../../components/Schedules/ScheduleCard';
import type { RecurringSchedule, ScheduleType, ScheduleInstance } from '../../types/shared';
import { SCHEDULE_TYPE_NAMES_NO } from '../../types/shared';

const SchedulesManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ScheduleType>('medication');
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Fetch schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules', activeTab, showActiveOnly],
    queryFn: () => schedulesApi.getSchedules({
      type: activeTab,
      active: showActiveOnly ? true : undefined
    })
  });

  // Fetch upcoming instances for next instance display
  const { data: upcomingInstances } = useQuery({
    queryKey: ['upcoming-instances'],
    queryFn: () => schedulesApi.getUpcomingInstances(7)
  });

  // Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => schedulesApi.deleteSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-instances'] });
    }
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      schedulesApi.toggleScheduleActive(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-instances'] });
    }
  });

  const handleDelete = async (schedule: RecurringSchedule) => {
    const confirmMessage = `Er du sikker på at du vil slette denne faste registreringen?\n\n${
      schedule.schedule_type === 'medication'
        ? schedule.medication_custom_name
        : schedule.schedule_type === 'meal'
        ? 'Måltid'
        : 'Aktivitet'
    }\n\nDette vil også slette alle relaterte påminnelser.`;

    if (window.confirm(confirmMessage)) {
      await deleteMutation.mutateAsync(schedule.id);
    }
  };

  const handleToggleActive = async (schedule: RecurringSchedule) => {
    await toggleActiveMutation.mutateAsync({
      id: schedule.id,
      isActive: !schedule.is_active
    });
  };

  // Get next instance for a schedule
  const getNextInstance = (scheduleId: number): ScheduleInstance | undefined => {
    if (!upcomingInstances) return undefined;
    return upcomingInstances.find(inst => inst.schedule_id === scheduleId);
  };

  const tabs: ScheduleType[] = ['medication', 'meal', 'activity'];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Faste registreringer</h1>
            </div>
            <button
              onClick={() => navigate('/schedules/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Ny
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  activeTab === tab
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                {tab === 'medication' && '💊 '}
                {tab === 'meal' && '🍽️ '}
                {tab === 'activity' && '🏃 '}
                {SCHEDULE_TYPE_NAMES_NO[tab]}
              </button>
            ))}
          </div>

          {/* Filter Toggle */}
          <div className="mt-3 flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Vis kun aktive</span>
            </label>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Laster inn...</p>
          </div>
        ) : schedules && schedules.length > 0 ? (
          <div className="space-y-4">
            {schedules.map((schedule) => (
              <ScheduleCard
                key={schedule.id}
                schedule={schedule}
                nextInstance={getNextInstance(schedule.id)}
                onEdit={() => navigate(`/schedules/${schedule.id}/edit`)}
                onPause={() => navigate(`/schedules/${schedule.id}/pause`)}
                onDelete={() => handleDelete(schedule)}
                onViewCalendar={() => navigate(`/schedules/${schedule.id}/calendar`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="text-6xl mb-4">
              {activeTab === 'medication' && '💊'}
              {activeTab === 'meal' && '🍽️'}
              {activeTab === 'activity' && '🏃'}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ingen {SCHEDULE_TYPE_NAMES_NO[activeTab].toLowerCase()}-schedules
            </h3>
            <p className="text-gray-600 mb-6">
              {showActiveOnly
                ? 'Du har ingen aktive faste registreringer for denne kategorien.'
                : 'Du har ingen faste registreringer for denne kategorien.'}
            </p>
            <button
              onClick={() => navigate('/schedules/new', { state: { initialType: activeTab } })}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Opprett første {SCHEDULE_TYPE_NAMES_NO[activeTab].toLowerCase()}
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Om faste registreringer</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Faste registreringer gjentas automatisk etter et mønster du velger</li>
            <li>• Du får påminnelser når det er tid for medisin, måltid eller aktivitet</li>
            <li>• Du kan hoppe over enkelte forekomster uten å påvirke fremtidige</li>
            <li>• Pause schedules midlertidig hvis du er på ferie eller syk</li>
            <li>• Faste registreringer vises IKKE i hurtigregistrering-flyten</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SchedulesManagementPage;
