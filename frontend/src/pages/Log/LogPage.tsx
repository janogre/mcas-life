import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Pill,
  Apple,
  Activity,
  Thermometer,
  Droplet,
  FileText,
  Clock,
  TrendingUp
} from 'lucide-react';

interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  color: string;
  bgColor: string;
  onClick: () => void;
}

function ActionCard({ icon, label, description, color, bgColor, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="action-card group"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-5)',
        borderRadius: 'var(--radius-soft)',
        border: `2px solid ${bgColor}`,
        background: 'white',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        minHeight: '140px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Hover gradient overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${bgColor} 0%, white 100%)`,
          opacity: 0,
          transition: 'opacity 0.3s ease',
        }}
        className="group-hover:opacity-100"
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <div
          style={{
            width: '56px',
            height: '56px',
            background: bgColor,
            borderRadius: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--space-3)',
            transition: 'transform 0.3s ease',
            margin: '0 auto',
          }}
          className="group-hover:scale-110"
        >
          <div style={{ color }}>{icon}</div>
        </div>
        <h3
          style={{
            fontSize: 'var(--text-body)',
            fontWeight: 700,
            color: 'var(--color-sage-900)',
            marginBottom: 'var(--space-1)',
          }}
        >
          {label}
        </h3>
        {description && (
          <p
            style={{
              fontSize: 'var(--text-small)',
              color: 'var(--color-sage-600)',
              fontWeight: 400,
            }}
          >
            {description}
          </p>
        )}
      </div>
    </button>
  );
}

interface RecentEntry {
  id: string;
  type: 'symptom' | 'medication' | 'meal' | 'activity' | 'illness' | 'period';
  title: string;
  time: string;
  severity?: string;
  icon: React.ReactNode;
  color: string;
}

function RecentEntryCard({ entry }: { entry: RecentEntry }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-4)',
        borderRadius: 'var(--radius-soft)',
        background: 'white',
        border: '1px solid var(--color-sage-100)',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
      className="hover:shadow-md"
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          background: `${entry.color}15`,
          borderRadius: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ color: entry.color }}>{entry.icon}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 'var(--text-body)',
            fontWeight: 600,
            color: 'var(--color-sage-900)',
            marginBottom: '0.25rem',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {entry.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Clock style={{ width: '14px', height: '14px', color: 'var(--color-sage-500)' }} />
          <p
            style={{
              fontSize: 'var(--text-small)',
              color: 'var(--color-sage-500)',
              fontWeight: 500,
            }}
          >
            {entry.time}
          </p>
          {entry.severity && (
            <>
              <span style={{ color: 'var(--color-sage-300)' }}>•</span>
              <p
                style={{
                  fontSize: 'var(--text-small)',
                  color: 'var(--color-sage-600)',
                  fontWeight: 600,
                }}
              >
                {entry.severity}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function LogPage() {
  const navigate = useNavigate();

  const actionCards = [
    {
      icon: <AlertCircle style={{ width: '28px', height: '28px' }} />,
      label: 'Symptom',
      description: 'Logg symptomer',
      color: '#ef4444',
      bgColor: '#fee2e2',
      onClick: () => navigate('/symptoms/register'),
    },
    {
      icon: <Pill style={{ width: '28px', height: '28px' }} />,
      label: 'Medisin',
      description: 'Registrer medisin',
      color: '#8b5cf6',
      bgColor: '#f3e8ff',
      onClick: () => navigate('/medications/add'),
    },
    {
      icon: <Apple style={{ width: '28px', height: '28px' }} />,
      label: 'Måltid',
      description: 'Logg mat/drikke',
      color: 'var(--color-medical-600)',
      bgColor: 'var(--color-medical-50)',
      onClick: () => navigate('/meals/add'),
    },
    {
      icon: <Activity style={{ width: '28px', height: '28px' }} />,
      label: 'Aktivitet',
      description: 'Registrer aktivitet',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      onClick: () => navigate('/activities/add'),
    },
    {
      icon: <Thermometer style={{ width: '28px', height: '28px' }} />,
      label: 'Syk?',
      description: 'Logg sykdom',
      color: '#ef4444',
      bgColor: '#fef2f2',
      onClick: () => navigate('/illness/add'),
    },
    {
      icon: <Droplet style={{ width: '28px', height: '28px' }} />,
      label: 'Periode',
      description: 'Registrer periode',
      color: '#ec4899',
      bgColor: '#fdf2f8',
      onClick: () => navigate('/menstrual/add'),
    },
    {
      icon: <FileText style={{ width: '28px', height: '28px' }} />,
      label: 'Notat',
      description: 'Skriv notat',
      color: 'var(--color-sage-600)',
      bgColor: 'var(--color-sage-50)',
      onClick: () => navigate('/notes/add'),
    },
  ];

  // Mock data for recent entries
  const recentEntries: RecentEntry[] = [
    {
      id: '1',
      type: 'symptom',
      title: 'Hodepine',
      time: '2 timer siden',
      severity: '6/10',
      icon: <AlertCircle style={{ width: '20px', height: '20px' }} />,
      color: '#ef4444',
    },
    {
      id: '2',
      type: 'meal',
      title: 'Lunsj: Laks med grønnsaker',
      time: '4 timer siden',
      icon: <Apple style={{ width: '20px', height: '20px' }} />,
      color: 'var(--color-medical-600)',
    },
    {
      id: '3',
      type: 'activity',
      title: 'Dusjet (varm)',
      time: 'I dag kl 08:00',
      icon: <Activity style={{ width: '20px', height: '20px' }} />,
      color: '#f59e0b',
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, var(--color-medical-500) 0%, var(--color-sage-700) 100%)',
          borderRadius: 'var(--radius-gentle)',
          padding: 'var(--space-6)',
          boxShadow: 'var(--shadow-elevated)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative shapes */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-5%',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(40px)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-h1)',
              fontWeight: 600,
              color: 'white',
              marginBottom: 'var(--space-2)',
              letterSpacing: '-0.02em',
            }}
          >
            Hva vil du registrere?
          </h1>
          <p
            style={{
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: 'var(--text-body)',
              fontWeight: 400,
            }}
          >
            Velg hva du vil logge i dag
          </p>
        </div>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {actionCards.map((card, index) => (
          <div
            key={index}
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ActionCard {...card} />
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div
        style={{
          background: 'white',
          borderRadius: 'var(--radius-gentle)',
          padding: 'var(--space-5)',
          boxShadow: 'var(--shadow-gentle)',
          border: '1px solid var(--color-sage-100)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <TrendingUp style={{ width: '20px', height: '20px', color: 'var(--color-medical-600)' }} />
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-h3)',
              fontWeight: 600,
              color: 'var(--color-sage-900)',
            }}
          >
            I dag
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: 'var(--text-h2)',
                fontWeight: 700,
                color: 'var(--color-medical-600)',
                marginBottom: 'var(--space-1)',
              }}
            >
              3
            </p>
            <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)' }}>
              Registreringer
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: 'var(--text-h2)',
                fontWeight: 700,
                color: '#ef4444',
                marginBottom: 'var(--space-1)',
              }}
            >
              1
            </p>
            <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)' }}>
              Symptomer
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontSize: 'var(--text-h2)',
                fontWeight: 700,
                color: '#8b5cf6',
                marginBottom: 'var(--space-1)',
              }}
            >
              2
            </p>
            <p style={{ fontSize: 'var(--text-small)', color: 'var(--color-sage-600)' }}>
              Måltider
            </p>
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      <div
        style={{
          background: 'white',
          borderRadius: 'var(--radius-gentle)',
          padding: 'var(--space-5)',
          boxShadow: 'var(--shadow-gentle)',
          border: '1px solid var(--color-sage-100)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-h3)',
            fontWeight: 600,
            color: 'var(--color-sage-900)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Siste registreringer
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {recentEntries.map((entry) => (
            <RecentEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}
