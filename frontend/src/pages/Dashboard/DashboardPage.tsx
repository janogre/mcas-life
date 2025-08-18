import React from 'react';
import { 
  Activity,
  Brain,
  Heart,
  TrendingUp,
  AlertCircle,
  Search,
  Plus,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import { ApiTest } from '../../components/Debug/ApiTest';
import { UserFlowDemo } from '../../components/Demo/UserFlowDemo';

export function DashboardPage() {
  const { user } = useAuth();

  const quickStats = [
    {
      label: 'Symptoms This Week',
      value: '3',
      change: '-2 from last week',
      trend: 'down',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      label: 'Foods Tracked',
      value: '28',
      change: '+12 this week',
      trend: 'up',
      icon: Search,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'AI Analyses',
      value: '2',
      change: 'Last: 2 days ago',
      trend: 'neutral',
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Trigger Score',
      value: '7.2/10',
      change: '+0.5 this week',
      trend: 'up',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  const recentActivities = [
    {
      type: 'symptom',
      title: 'Skin rash logged',
      time: '2 hours ago',
      severity: 'medium',
      icon: AlertCircle,
    },
    {
      type: 'food',
      title: 'Spinach added to diary',
      time: '4 hours ago',
      severity: 'safe',
      icon: Search,
    },
    {
      type: 'analysis',
      title: 'AI trigger analysis completed',
      time: 'Yesterday',
      severity: 'high',
      icon: Brain,
    },
    {
      type: 'food',
      title: 'Blue cheese marked incompatible',
      time: '2 days ago',
      severity: 'severe',
      icon: Heart,
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'safe':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'severe':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {user?.first_name || 'there'}! 👋
            </h1>
            <p className="text-primary-100">
              Today is {formatDate(new Date(), 'EEEE, MMMM do, yyyy')}
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Heart className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  stat.trend === 'up' ? 'text-green-600 bg-green-50' :
                  stat.trend === 'down' ? 'text-red-600 bg-red-50' :
                  'text-gray-600 bg-gray-50'
                }`}>
                  {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '—'}
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-xs text-gray-500 mt-2">{stat.change}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all group">
            <Plus className="w-8 h-8 text-gray-400 group-hover:text-primary-600 mb-2" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700">
              Log Symptom
            </span>
          </button>
          
          <button className="flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all group">
            <Search className="w-8 h-8 text-gray-400 group-hover:text-green-600 mb-2" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">
              Search Foods
            </span>
          </button>
          
          <button className="flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all group">
            <Brain className="w-8 h-8 text-gray-400 group-hover:text-purple-600 mb-2" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
              AI Analysis
            </span>
          </button>
          
          <button className="flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group">
            <BarChart3 className="w-8 h-8 text-gray-400 group-hover:text-blue-600 mb-2" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
              View Reports
            </span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View all
            </button>
          </div>
          
          <div className="space-y-4">
            {recentActivities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getSeverityColor(activity.severity)}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights & Tips */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Insights & Tips</h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-900">AI Insight</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Your symptoms tend to occur 2-4 hours after consuming histamine-rich foods. Consider spacing out such foods.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-green-900">Progress</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Great job! You've reduced trigger foods by 30% this month. Keep it up!
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-900">Reminder</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Don't forget to log your daily wellness score. Consistent tracking improves AI accuracy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Development Testing Components */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ApiTest />
        <UserFlowDemo />
      </div>
    </div>
  );
}