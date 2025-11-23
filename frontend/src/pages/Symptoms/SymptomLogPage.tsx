import React, { useState, useEffect } from 'react';
import { Plus, Calendar, AlertCircle, Clock, TrendingUp, Shield, Activity, Cloud, Heart, Zap, ThermometerSun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getWeatherAutomatically, formatWeatherData, getWeatherEmoji, type WeatherResponse } from '../../lib/weatherApi';
import { useAuth } from '../../contexts/AuthContext';
import './symptom-log-animations.css';

interface Symptom {
  id: number;
  category: string;
  type: string;
  severity: number;
  started_at: string;
  duration_minutes: number;
  suspected_triggers?: string[];
  current_stress_factors?: string[];
  treatment_taken?: string;
  treatment_effective?: boolean;
}

interface RiskAnalysis {
  riskLevel: number;
  factors: string[];
  recommendations: string[];
}

interface DailyContext {
  dao_supplement_taken: boolean;
  compression_worn: boolean;
  sensory_environment_controlled: boolean;
  stress_level?: number;
  sleep_quality?: number;
  had_reactions_yesterday: boolean;
}

export function SymptomLogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [todayContext, setTodayContext] = useState<DailyContext | null>(null);
  const [currentWeather, setCurrentWeather] = useState<WeatherResponse | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    loadWeatherData();
  }, []);

  const loadWeatherData = async () => {
    setIsLoadingWeather(true);
    try {
      const weather = await getWeatherAutomatically(user?.city);
      if (weather) {
        setCurrentWeather(weather);
      }
    } catch (error) {
      console.error('Error loading weather:', error);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('[SymptomLogPage] Loading symptom data...');

      const symptomsResponse = await api.get('/symptoms?limit=10');
      console.log('[SymptomLogPage] Symptoms API response:', symptomsResponse.data);
      const symptoms = symptomsResponse.data.data || [];

      const riskResponse = await api.get('/symptoms/risk-factors');
      const riskData = riskResponse.data.data;

      const riskAnalysis = riskData ? {
        riskLevel: riskData.reactionRiskLevel || 5,
        factors: [
          ...(riskData.cumulativeStressScore >= 7 ? [`Høyt stressnivå (${riskData.cumulativeStressScore}/10)`] : []),
          ...(riskData.hadReactionsYesterday ? ['Reaksjoner i går'] : []),
          ...(riskData.daoTaken ? [] : ['DAO ikke tatt før måltider']),
          ...(riskData.compressionWorn ? [] : ['Kompresjon ikke brukt']),
          ...(riskData.sensoryEnvironmentCalm ? [] : ['Urolig sensormiljø'])
        ],
        recommendations: riskData.recommendations || []
      } : null;

      const transformedSymptoms = symptoms.map((symptom: any) => ({
        id: symptom.id,
        category: symptom.category,
        type: symptom.type || symptom.symptom_type,
        severity: symptom.severity,
        started_at: symptom.started_at,
        duration_minutes: symptom.duration_minutes,
        suspected_triggers: symptom.suspected_triggers || [],
        current_stress_factors: symptom.current_stress_factors || [],
        treatment_taken: symptom.treatment_taken,
        treatment_effective: symptom.treatment_effective
      }));

      setSymptoms(transformedSymptoms);
      setRiskAnalysis(riskAnalysis);
      setTodayContext(riskData ? {
        dao_supplement_taken: riskData.daoTaken || false,
        compression_worn: riskData.compressionWorn || false,
        sensory_environment_controlled: riskData.sensoryEnvironmentCalm || false,
        stress_level: riskData.cumulativeStressScore,
        sleep_quality: riskData.sleepQuality,
        had_reactions_yesterday: riskData.hadReactionsYesterday || false
      } : null);

      console.log('[SymptomLogPage] Data loaded successfully. Symptoms count:', transformedSymptoms.length);
    } catch (error) {
      console.error('[SymptomLogPage] Error loading symptom data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Mindre enn 1 time siden';
    if (diffInHours < 24) return `${diffInHours} timer siden`;
    return `${Math.floor(diffInHours / 24)} dager siden`;
  };

  const getSeverityInfo = (severity: number) => {
    if (severity >= 8) {
      return {
        color: '#991b1b',
        bgColor: '#fee2e2',
        borderColor: '#fecaca',
        label: 'Alvorlig',
        Icon: AlertCircle
      };
    }
    if (severity >= 5) {
      return {
        color: '#92400e',
        bgColor: '#fef3c7',
        borderColor: '#fde68a',
        label: 'Moderat',
        Icon: AlertCircle
      };
    }
    return {
      color: 'var(--color-medical-700)',
      bgColor: 'var(--color-medical-50)',
      borderColor: 'var(--color-medical-200)',
      label: 'Mild',
      Icon: Activity
    };
  };

  const getRiskLevelInfo = (level: number) => {
    if (level >= 8) {
      return {
        color: '#991b1b',
        bgColor: '#fee2e2',
        label: 'Høy risiko',
        gradient: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
      };
    }
    if (level >= 5) {
      return {
        color: '#92400e',
        bgColor: '#fef3c7',
        label: 'Moderat risiko',
        gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
      };
    }
    return {
      color: 'var(--color-medical-700)',
      bgColor: 'var(--color-medical-50)',
      label: 'Lav risiko',
      gradient: 'linear-gradient(135deg, var(--color-medical-50) 0%, var(--color-medical-100) 100%)'
    };
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '3rem 0',
      }}>
        <div className="loading-shimmer" style={{
          width: '100%',
          maxWidth: '400px',
          height: '200px',
          borderRadius: 'var(--radius-gentle)',
        }} />
      </div>
    );
  }

  return (
    <div className="page-transition" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '2rem' }}>
      {/* Header */}
      <div
        className="page-header"
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
          borderRadius: 'var(--radius-gentle)',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-elevated)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative shapes */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '250px',
          height: '250px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-10%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '0.75rem',
            }}>
              <Heart style={{ width: '32px', height: '32px', color: 'white' }} />
              <h1 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.25rem',
                fontWeight: 600,
                color: 'white',
                letterSpacing: '-0.02em',
              }}>
                Symptomsporing
              </h1>
            </div>
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '1.05rem',
              fontWeight: 400,
            }}>
              Følg med på dine MCAS-symptomer og triggere
            </p>
          </div>
          <button
            onClick={() => navigate('/symptoms/register')}
            className="register-btn-hero"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.875rem 1.5rem',
              background: 'white',
              color: '#6366f1',
              fontSize: '0.95rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-soft)',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
            }}
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            <span>Registrer symptom</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        {[
          { label: 'Totalt loggført', value: symptoms.length, color: '#6366f1', bg: '#eef2ff', Icon: Activity },
          { label: 'Siste uke', value: symptoms.filter(s => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(s.started_at) >= weekAgo;
          }).length, color: '#a855f7', bg: '#faf5ff', Icon: Calendar },
          { label: 'Høy alvorlighet', value: symptoms.filter(s => s.severity >= 7).length, color: '#ef4444', bg: '#fee2e2', Icon: AlertCircle },
          { label: 'Gjennomsnitt', value: symptoms.length > 0 ? Math.round(symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length * 10) / 10 : 0, color: '#f59e0b', bg: '#fef3c7', Icon: TrendingUp },
        ].map((stat, index) => (
          <div
            key={index}
            className="stat-card-mini animate-fade-in-up"
            style={{
              background: 'white',
              borderRadius: 'var(--radius-soft)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-whisper)',
              border: '1px solid var(--color-sage-100)',
              animationDelay: `${index * 80}ms`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: stat.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <stat.Icon style={{ width: '20px', height: '20px', color: stat.color }} />
              </div>
              <div>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  color: stat.color,
                  lineHeight: 1,
                }}>
                  {stat.value}
                </div>
              </div>
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--color-sage-600)',
              fontWeight: 500,
            }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Two column layout for cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', '@media (min-width: 768px)': { gridTemplateColumns: '1fr 1fr' } }}>
        {/* Current Weather */}
        {currentWeather && (
          <div
            className="weather-card animate-fade-in-up"
            style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: 'var(--radius-gentle)',
              padding: '1.5rem',
              border: '1px solid #bae6fd',
              boxShadow: 'var(--shadow-whisper)',
              animationDelay: '160ms',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                <span style={{ fontSize: '2.5rem' }}>
                  {getWeatherEmoji(currentWeather.weather.weather_code)}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    <Cloud style={{ width: '18px', height: '18px', color: '#0369a1' }} />
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.05rem',
                      fontWeight: 600,
                      color: 'var(--color-sage-900)',
                    }}>
                      Nåværende vær
                    </h3>
                  </div>
                  <p style={{
                    fontSize: '0.85rem',
                    color: 'var(--color-sage-700)',
                    fontWeight: 500
                  }}>
                    {formatWeatherData(currentWeather.weather)}
                  </p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-sage-600)',
                    marginTop: '0.25rem'
                  }}>
                    {currentWeather.weather.weather_description}
                  </p>
                </div>
              </div>
              {currentWeather.impact && currentWeather.impact.severity !== 'low' && (
                <span style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  ...(currentWeather.impact.severity === 'high'
                    ? { background: '#fee2e2', color: '#991b1b' }
                    : { background: '#fef3c7', color: '#92400e' })
                }}>
                  {currentWeather.impact.severity === 'high' ? 'Høy risiko' : 'Moderat'}
                </span>
              )}
            </div>

            {currentWeather.impact && currentWeather.impact.risk_factors.length > 0 && (
              <div style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #bae6fd'
              }}>
                <p style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-sage-700)',
                  marginBottom: '0.5rem',
                }}>
                  ⚠️ MCAS påvirkningsfaktorer:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {currentWeather.impact.risk_factors.map((factor, index) => (
                    <p key={index} style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-sage-600)',
                    }}>
                      • {factor}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <p style={{
              fontSize: '0.7rem',
              color: 'var(--color-sage-500)',
              marginTop: '0.75rem',
              fontStyle: 'italic'
            }}>
              Værdata lagres automatisk ved symptomregistrering
            </p>
          </div>
        )}

        {/* Risk Analysis */}
        {riskAnalysis && (
          <div
            className="risk-card animate-fade-in-up"
            style={{
              background: getRiskLevelInfo(riskAnalysis.riskLevel).gradient,
              borderRadius: 'var(--radius-gentle)',
              padding: '1.5rem',
              border: `1px solid ${getRiskLevelInfo(riskAnalysis.riskLevel).bgColor}`,
              boxShadow: 'var(--shadow-whisper)',
              animationDelay: '240ms',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield style={{ width: '20px', height: '20px', color: getRiskLevelInfo(riskAnalysis.riskLevel).color }} />
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.05rem',
                  fontWeight: 600,
                  color: 'var(--color-sage-900)',
                }}>
                  Dagens risiko
                </h3>
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: getRiskLevelInfo(riskAnalysis.riskLevel).color,
              }}>
                {riskAnalysis.riskLevel}/10
              </div>
            </div>

            {riskAnalysis.factors.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-sage-700)',
                  marginBottom: '0.5rem',
                }}>
                  Risikofaktorer:
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {riskAnalysis.factors.map((factor, index) => (
                    <span
                      key={index}
                      className="factor-badge"
                      style={{
                        padding: '0.35rem 0.75rem',
                        background: 'rgba(0, 0, 0, 0.05)',
                        color: 'var(--color-sage-800)',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {riskAnalysis.recommendations.length > 0 && (
              <div>
                <h4 style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-sage-700)',
                  marginBottom: '0.5rem',
                }}>
                  Anbefalinger:
                </h4>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {riskAnalysis.recommendations.map((rec, index) => (
                    <li key={index} style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-sage-700)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <span style={{
                        width: '4px',
                        height: '4px',
                        background: getRiskLevelInfo(riskAnalysis.riskLevel).color,
                        borderRadius: '50%',
                        flexShrink: 0,
                      }}></span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Symptoms */}
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-gentle)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-gentle)',
        border: '1px solid var(--color-sage-100)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.3rem',
            fontWeight: 600,
            color: 'var(--color-sage-900)',
          }}>
            Nylige symptomer
          </h2>
          <span style={{
            fontSize: '0.85rem',
            color: 'var(--color-sage-600)',
            fontWeight: 500,
          }}>
            {symptoms.length} registrert
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {symptoms.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1.5rem',
              background: 'var(--color-sage-50)',
              borderRadius: 'var(--radius-gentle)',
            }}>
              <AlertCircle style={{
                width: '48px',
                height: '48px',
                color: 'var(--color-sage-300)',
                margin: '0 auto 1rem',
              }} />
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.1rem',
                fontWeight: 600,
                color: 'var(--color-sage-900)',
                marginBottom: '0.5rem',
              }}>
                Ingen symptomer registrert ennå
              </h3>
              <p style={{
                color: 'var(--color-sage-600)',
                fontSize: '0.9rem',
              }}>
                Klikk "Registrer symptom" for å starte sporing
              </p>
            </div>
          ) : (
            symptoms.map((symptom, index) => {
              const severityInfo = getSeverityInfo(symptom.severity);
              const SeverityIcon = severityInfo.Icon;

              return (
                <div
                  key={symptom.id}
                  className={`symptom-card animate-fade-in-up ${symptom.severity >= 8 ? 'severity-high' : ''}`}
                  style={{
                    padding: '1.25rem',
                    border: `2px solid ${severityInfo.borderColor}`,
                    borderRadius: 'var(--radius-soft)',
                    background: 'white',
                    boxShadow: 'var(--shadow-whisper)',
                    animationDelay: `${index * 60}ms`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: severityInfo.bgColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <SeverityIcon style={{ width: '20px', height: '20px', color: severityInfo.color }} />
                      </div>
                      <div>
                        <span style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1rem',
                          fontWeight: 600,
                          color: 'var(--color-sage-900)',
                        }}>
                          {symptom.type}
                        </span>
                        {symptom.category && (
                          <p style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-sage-600)',
                            marginTop: '0.15rem',
                          }}>
                            {symptom.category}
                          </p>
                        )}
                      </div>
                      <span style={{
                        padding: '0.35rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: severityInfo.bgColor,
                        color: severityInfo.color,
                        border: `1.5px solid ${severityInfo.borderColor}`,
                      }}>
                        {severityInfo.label} {symptom.severity}/10
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-sage-500)',
                      fontWeight: 500,
                    }}>
                      {formatDate(symptom.started_at)}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '1rem',
                    fontSize: '0.85rem',
                    color: 'var(--color-sage-600)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Clock style={{ width: '14px', height: '14px' }} />
                      <span>{Math.floor(symptom.duration_minutes / 60)}t {symptom.duration_minutes % 60}m</span>
                    </div>
                    {symptom.suspected_triggers && symptom.suspected_triggers.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Zap style={{ width: '14px', height: '14px' }} />
                        <span>Triggere: {symptom.suspected_triggers.join(', ')}</span>
                      </div>
                    )}
                    {symptom.treatment_taken && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Activity style={{ width: '14px', height: '14px' }} />
                        <span>
                          {symptom.treatment_taken}
                          {symptom.treatment_effective !== undefined && (
                            <span style={{
                              marginLeft: '0.35rem',
                              color: symptom.treatment_effective ? 'var(--color-medical-700)' : '#991b1b',
                              fontWeight: 600,
                            }}>
                              ({symptom.treatment_effective ? '✓ Effektiv' : '✗ Ikke effektiv'})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Today's Context */}
      {todayContext && (
        <div
          className="animate-fade-in-up"
          style={{
            background: 'linear-gradient(135deg, var(--color-medical-50) 0%, #d1fae5 100%)',
            borderRadius: 'var(--radius-gentle)',
            padding: '1.5rem',
            border: '1px solid var(--color-medical-200)',
            boxShadow: 'var(--shadow-whisper)',
            animationDelay: '320ms',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <TrendingUp style={{ width: '20px', height: '20px', color: 'var(--color-medical-700)' }} />
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.05rem',
              fontWeight: 600,
              color: 'var(--color-sage-900)',
            }}>
              Dagens kontekst
            </h3>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            fontSize: '0.85rem',
          }}>
            <div className="context-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: todayContext.dao_supplement_taken ? 'var(--color-medical-600)' : 'var(--color-sage-300)',
              }}></span>
              <span style={{ color: 'var(--color-sage-800)', fontWeight: 500 }}>DAO tatt</span>
            </div>
            <div className="context-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: todayContext.compression_worn ? 'var(--color-medical-600)' : 'var(--color-sage-300)',
              }}></span>
              <span style={{ color: 'var(--color-sage-800)', fontWeight: 500 }}>Kompresjon</span>
            </div>
            <div className="context-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: todayContext.sensory_environment_controlled ? 'var(--color-medical-600)' : 'var(--color-sage-300)',
              }}></span>
              <span style={{ color: 'var(--color-sage-800)', fontWeight: 500 }}>Rolig miljø</span>
            </div>
            <div className="context-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: todayContext.had_reactions_yesterday ? '#ef4444' : 'var(--color-medical-600)',
              }}></span>
              <span style={{ color: 'var(--color-sage-800)', fontWeight: 500 }}>
                {todayContext.had_reactions_yesterday ? 'Reaksjoner i går' : 'Ingen reaksjoner i går'}
              </span>
            </div>
          </div>
          {(todayContext.stress_level || todayContext.sleep_quality) && (
            <div style={{
              marginTop: '1rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--color-medical-200)',
              display: 'flex',
              gap: '1.5rem',
              fontSize: '0.85rem',
              flexWrap: 'wrap',
            }}>
              {todayContext.stress_level !== undefined && (
                <span style={{ color: 'var(--color-sage-700)', fontWeight: 500 }}>
                  Stress: <strong style={{ color: 'var(--color-sage-900)' }}>{todayContext.stress_level}/10</strong>
                </span>
              )}
              {todayContext.sleep_quality !== undefined && (
                <span style={{ color: 'var(--color-sage-700)', fontWeight: 500 }}>
                  Søvnkvalitet: <strong style={{ color: 'var(--color-sage-900)' }}>{todayContext.sleep_quality}/10</strong>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
