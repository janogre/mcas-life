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
  BarChart3,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import { ApiTest } from '../../components/Debug/ApiTest';
import { UserFlowDemo } from '../../components/Demo/UserFlowDemo';
import './dashboard-animations.css';

export function DashboardPage() {
  const { user } = useAuth();

  const quickStats = [
    {
      label: 'Symptoms This Week',
      value: '3',
      change: '-2 from last week',
      trend: 'down',
      icon: AlertCircle,
      color: 'var(--color-alert-red)',
      bgGradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
    },
    {
      label: 'Foods Tracked',
      value: '28',
      change: '+12 this week',
      trend: 'up',
      icon: Search,
      color: 'var(--color-medical-600)',
      bgGradient: 'linear-gradient(135deg, var(--color-medical-50) 0%, var(--color-medical-100) 100%)',
    },
    {
      label: 'AI Analyses',
      value: '2',
      change: 'Last: 2 days ago',
      trend: 'neutral',
      icon: Brain,
      color: '#7c3aed',
      bgGradient: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
    },
    {
      label: 'Trigger Score',
      value: '7.2/10',
      change: '+0.5 this week',
      trend: 'up',
      icon: TrendingUp,
      color: 'var(--color-alert-amber)',
      bgGradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
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

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'safe':
        return {
          bg: 'var(--color-medical-50)',
          text: 'var(--color-medical-700)',
          border: 'var(--color-medical-200)'
        };
      case 'medium':
        return {
          bg: '#fef3c7',
          text: '#92400e',
          border: '#fde68a'
        };
      case 'high':
        return {
          bg: '#fed7aa',
          text: '#9a3412',
          border: '#fdba74'
        };
      case 'severe':
        return {
          bg: '#fee2e2',
          text: '#991b1b',
          border: '#fecaca'
        };
      default:
        return {
          bg: 'var(--color-sage-100)',
          text: 'var(--color-sage-700)',
          border: 'var(--color-sage-200)'
        };
    }
  };

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Header - Organic flowing design */}
      <div
        className="dashboard-hero"
        style={{
          background: 'linear-gradient(135deg, var(--color-medical-500) 0%, var(--color-medical-600) 50%, var(--color-sage-700) 100%)',
          borderRadius: 'var(--radius-gentle)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-elevated)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative organic shapes */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '-5%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '-10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }} className="flex items-center justify-between">
          <div className="animate-fade-in-up">
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.5rem',
              fontWeight: 500,
              color: 'white',
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}>
              Welcome back, {user?.first_name || 'there'}
            </div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '1.05rem',
              fontWeight: 400,
              letterSpacing: '0.01em'
            }}>
              {formatDate(new Date(), 'EEEE, MMMM do, yyyy')}
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div style={{
              width: '80px',
              height: '80px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              borderRadius: 'var(--radius-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }} className="animate-float">
              <Heart style={{ width: '36px', height: '36px', color: 'white' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats - Refined cards with subtle animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="stat-card animate-fade-in-up"
              style={{
                background: 'white',
                borderRadius: 'var(--radius-soft)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-whisper)',
                border: '1px solid var(--color-sage-100)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  background: stat.bgGradient,
                  borderRadius: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'transform 0.3s ease',
                }}>
                  <Icon style={{ width: '24px', height: '24px', color: stat.color }} />
                </div>
                <div style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  background: stat.trend === 'up' ? 'var(--color-medical-50)' :
                              stat.trend === 'down' ? '#fee2e2' :
                              'var(--color-sage-100)',
                  color: stat.trend === 'up' ? 'var(--color-medical-700)' :
                         stat.trend === 'down' ? '#991b1b' :
                         'var(--color-sage-700)',
                }}>
                  {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '—'}
                </div>
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.25rem',
                fontWeight: 600,
                color: 'var(--color-sage-900)',
                marginBottom: '0.5rem',
                letterSpacing: '-0.03em',
              }}>
                {stat.value}
              </h3>
              <p style={{
                fontSize: '0.95rem',
                color: 'var(--color-sage-600)',
                fontWeight: 500,
                marginBottom: '0.5rem'
              }}>
                {stat.label}
              </p>
              <p style={{
                fontSize: '0.8rem',
                color: 'var(--color-sage-500)',
                fontWeight: 400
              }}>
                {stat.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions - Elevated interactive buttons */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-gentle)',
        padding: '2rem',
        boxShadow: 'var(--shadow-gentle)',
        border: '1px solid var(--color-sage-100)',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: 'var(--color-sage-900)',
          marginBottom: '1.5rem',
          letterSpacing: '-0.01em',
        }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Plus, label: 'Log Symptom', color: 'var(--color-alert-red)', bg: '#fef2f2' },
            { icon: Search, label: 'Search Foods', color: 'var(--color-medical-600)', bg: 'var(--color-medical-50)' },
            { icon: Brain, label: 'AI Analysis', color: '#7c3aed', bg: '#f5f3ff' },
            { icon: BarChart3, label: 'View Reports', color: 'var(--color-alert-blue)', bg: '#eff6ff' },
          ].map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                className="quick-action-btn"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '1.5rem 1rem',
                  borderRadius: 'var(--radius-soft)',
                  border: `2px solid ${action.bg}`,
                  background: 'white',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: action.bg,
                  borderRadius: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem',
                  transition: 'transform 0.3s ease',
                }}>
                  <Icon style={{ width: '24px', height: '24px', color: action.color }} />
                </div>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--color-sage-800)',
                }}>
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity - Timeline style */}
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-gentle)',
          padding: '2rem',
          boxShadow: 'var(--shadow-gentle)',
          border: '1px solid var(--color-sage-100)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--color-sage-900)',
              letterSpacing: '-0.01em',
            }}>
              Recent Activity
            </h2>
            <button style={{
              color: 'var(--color-medical-600)',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              transition: 'color 0.2s ease',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}>
              View all
              <ArrowUpRight style={{ width: '16px', height: '16px' }} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentActivities.map((activity, index) => {
              const Icon = activity.icon;
              const styles = getSeverityStyles(activity.severity);
              return (
                <div
                  key={index}
                  className="activity-item"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    borderRadius: '0.875rem',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: styles.bg,
                    borderRadius: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1.5px solid ${styles.border}`,
                    flexShrink: 0,
                  }}>
                    <Icon style={{ width: '20px', height: '20px', color: styles.text }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--color-sage-900)',
                      marginBottom: '0.25rem',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {activity.title}
                    </p>
                    <p style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-sage-500)',
                      fontWeight: 500
                    }}>
                      {activity.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights & Tips - Elevated cards with icons */}
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-gentle)',
          padding: '2rem',
          boxShadow: 'var(--shadow-gentle)',
          border: '1px solid var(--color-sage-100)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Sparkles style={{ width: '24px', height: '24px', color: 'var(--color-medical-500)' }} />
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--color-sage-900)',
              letterSpacing: '-0.01em',
            }}>
              Insights & Tips
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              {
                icon: Brain,
                type: 'AI Insight',
                message: 'Your symptoms tend to occur 2-4 hours after consuming histamine-rich foods. Consider spacing out such foods.',
                color: '#3b82f6',
                bg: '#eff6ff',
                border: '#bfdbfe'
              },
              {
                icon: TrendingUp,
                type: 'Progress',
                message: 'Great job! You\'ve reduced trigger foods by 30% this month. Keep it up!',
                color: 'var(--color-medical-600)',
                bg: 'var(--color-medical-50)',
                border: 'var(--color-medical-200)'
              },
              {
                icon: Calendar,
                type: 'Reminder',
                message: 'Don\'t forget to log your daily wellness score. Consistent tracking improves AI accuracy.',
                color: '#f59e0b',
                bg: '#fef3c7',
                border: '#fde68a'
              }
            ].map((insight, index) => {
              const Icon = insight.icon;
              return (
                <div
                  key={index}
                  className="insight-card"
                  style={{
                    padding: '1.25rem',
                    background: insight.bg,
                    borderRadius: 'var(--radius-soft)',
                    border: `1.5px solid ${insight.border}`,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: 'white',
                      borderRadius: '0.625rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}>
                      <Icon style={{ width: '20px', height: '20px', color: insight.color }} />
                    </div>
                    <div>
                      <h3 style={{
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        color: insight.color,
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}>
                        {insight.type}
                      </h3>
                      <p style={{
                        fontSize: '0.9rem',
                        lineHeight: 1.6,
                        color: 'var(--color-sage-800)',
                        fontWeight: 400,
                      }}>
                        {insight.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
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
