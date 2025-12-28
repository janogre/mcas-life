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
  ArrowUpRight,
  Utensils,
  Pill,
  ArrowRight,
  Target,
  Lightbulb
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDate } from '../../lib/utils';
import { ProgressEncouragement } from '../../components/UI/ProgressEncouragement';
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

      {/* Progress and Encouragement */}
      <ProgressEncouragement compact={false} />

      {/* How It Works - Workflow Diagram */}
      <div style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        borderRadius: 'var(--radius-gentle)',
        padding: '2.5rem',
        border: '2px solid #86efac',
      }}>
        <div className="text-center mb-6">
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.75rem',
            fontWeight: 600,
            color: '#166534',
            marginBottom: '0.5rem',
            letterSpacing: '-0.01em',
          }}>
            Hvordan MCAS-Life fungerer
          </h2>
          <p style={{
            fontSize: '1rem',
            color: '#15803d',
            fontWeight: 400,
          }}>
            Fra daglig registrering til personlige innsikter
          </p>
        </div>

        {/* Workflow Steps */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Step 1: Data Collection */}
          <div className="flex flex-col items-center">
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            }}>
              <Calendar style={{ width: '36px', height: '36px', color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#166534',
              marginBottom: '0.5rem',
              textAlign: 'center',
            }}>
              1. Samle inn data
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#15803d',
              textAlign: 'center',
              marginBottom: '1rem',
            }}>
              Registrer daglig hva du spiser, symptomer, medisiner og aktiviteter
            </p>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2">
                <Utensils className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">Måltider og aktiviteter</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-green-800">Symptomer</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2">
                <Pill className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-green-800">Medisiner og kosttilskudd</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
              <ArrowRight className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Step 2: Track Over Time */}
          <div className="flex flex-col items-center relative">
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
            }}>
              <BarChart3 style={{ width: '36px', height: '36px', color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#166534',
              marginBottom: '0.5rem',
              textAlign: 'center',
            }}>
              2. Spor over tid
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#15803d',
              textAlign: 'center',
              marginBottom: '1rem',
            }}>
              Se mønstre og sammenhenger i dagboken din
            </p>
            <div className="flex flex-col gap-2 w-full">
              <div className="bg-white/60 rounded-lg px-3 py-2 text-center">
                <span className="text-sm font-medium text-green-800">Dag-visning</span>
              </div>
              <div className="bg-white/60 rounded-lg px-3 py-2 text-center">
                <span className="text-sm font-medium text-green-800">Uke-visning</span>
              </div>
              <div className="bg-white/60 rounded-lg px-3 py-2 text-center">
                <span className="text-sm font-medium text-green-800">Måned-visning</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
              <ArrowRight className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Step 3: AI Analysis */}
          <div className="flex flex-col items-center relative">
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
            }}>
              <Brain style={{ width: '36px', height: '36px', color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#166534',
              marginBottom: '0.5rem',
              textAlign: 'center',
            }}>
              3. AI-analyse
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#15803d',
              textAlign: 'center',
              marginBottom: '1rem',
            }}>
              AI finner sammenhenger mellom mat og symptomer
            </p>
            <div className="flex flex-col gap-2 w-full">
              <div className="bg-white/60 rounded-lg px-3 py-2 text-center">
                <span className="text-sm font-medium text-green-800">72-timers vindu</span>
              </div>
              <div className="bg-white/60 rounded-lg px-3 py-2 text-center">
                <span className="text-sm font-medium text-green-800">8-faktor korrelasjon</span>
              </div>
              <div className="bg-white/60 rounded-lg px-3 py-2 text-center">
                <span className="text-sm font-medium text-green-800">Trigger-score</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
              <ArrowRight className="w-8 h-8 text-green-600" />
            </div>
          </div>

          {/* Step 4: Get Insights */}
          <div className="flex flex-col items-center">
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            }}>
              <Lightbulb style={{ width: '36px', height: '36px', color: 'white' }} />
            </div>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#166534',
              marginBottom: '0.5rem',
              textAlign: 'center',
            }}>
              4. Få innsikt
            </h3>
            <p style={{
              fontSize: '0.9rem',
              color: '#15803d',
              textAlign: 'center',
              marginBottom: '1rem',
            }}>
              Personlige anbefalinger for bedre helse
            </p>
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">Identifiserte triggere</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">Trender over tid</span>
              </div>
              <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-800">Personlige tips</span>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-8 text-center">
          <p style={{
            fontSize: '1rem',
            color: '#166534',
            fontWeight: 500,
            marginBottom: '1rem',
          }}>
            Jo mer du registrerer, jo bedre blir analysene!
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.href = '/log'}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Start registrering
            </button>
            <button
              onClick={() => window.location.href = '/symptoms'}
              style={{
                background: 'white',
                color: '#059669',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                border: '2px solid #10b981',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0fdf4';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Se mine analyser
            </button>
          </div>
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
    </div>
  );
}
