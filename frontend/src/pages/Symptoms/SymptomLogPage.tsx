import React from 'react';
import { Plus, Calendar, AlertCircle, Clock } from 'lucide-react';

export function SymptomLogPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Symptom Tracking</h1>
          <p className="text-gray-600 mt-1">Log and monitor your MCAS symptoms</p>
        </div>
        <button className="btn-primary flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>Log Symptom</span>
        </button>
      </div>

      {/* Quick Add Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Symptom Log</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'Skin Rash', color: 'bg-red-100 text-red-700' },
            { name: 'Digestive', color: 'bg-orange-100 text-orange-700' },
            { name: 'Headache', color: 'bg-yellow-100 text-yellow-700' },
            { name: 'Fatigue', color: 'bg-purple-100 text-purple-700' },
            { name: 'Anxiety', color: 'bg-blue-100 text-blue-700' },
            { name: 'Joint Pain', color: 'bg-green-100 text-green-700' },
            { name: 'Breathing', color: 'bg-pink-100 text-pink-700' },
            { name: 'Other', color: 'bg-gray-100 text-gray-700' },
          ].map((symptom) => (
            <button
              key={symptom.name}
              className={`p-3 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity ${symptom.color}`}
            >
              {symptom.name}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Symptoms */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Symptoms</h2>
          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all
          </button>
        </div>

        <div className="space-y-3">
          {[
            {
              type: 'Skin Rash',
              severity: 6,
              time: '2 hours ago',
              duration: '30 min',
              triggers: ['Tomatoes', 'Stress'],
            },
            {
              type: 'Digestive Issues',
              severity: 4,
              time: 'Yesterday',
              duration: '2 hours',
              triggers: ['Blue cheese'],
            },
            {
              type: 'Headache',
              severity: 7,
              time: '2 days ago',
              duration: '4 hours',
              triggers: ['Red wine', 'Weather change'],
            },
          ].map((symptom, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-gray-900">{symptom.type}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    symptom.severity >= 7 ? 'bg-red-100 text-red-700' :
                    symptom.severity >= 4 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    Severity {symptom.severity}/10
                  </span>
                </div>
                <span className="text-sm text-gray-500">{symptom.time}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Duration: {symptom.duration}</span>
                </div>
                <div>
                  Possible triggers: {symptom.triggers.join(', ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-6 border border-primary-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
            <span>Visual body map for symptom location</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Photo documentation for skin symptoms</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Voice-to-text symptom logging</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Smart notifications and reminders</span>
          </div>
        </div>
      </div>
    </div>
  );
}