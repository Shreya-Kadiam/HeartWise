import React from 'react';
import { Utensils, Footprints, Moon, Stethoscope } from 'lucide-react';

const SECTIONS = [
  { key: 'diet', title: 'Diet & Nutrition', icon: Utensils, accent: 'var(--low)', bg: 'var(--low-bg)' },
  { key: 'activity', title: 'Exercise & Daily Activity', icon: Footprints, accent: 'var(--primary)', bg: 'var(--primary-soft)' },
  { key: 'lifestyle', title: 'Lifestyle, Sleep & Stress', icon: Moon, accent: 'var(--purple)', bg: 'var(--purple-bg)' },
  { key: 'medical', title: 'Medical Follow-Up', icon: Stethoscope, accent: 'var(--moderate)', bg: 'var(--moderate-bg)' },
];

function priorityStyle(priority = '') {
  const lower = priority.toLowerCase();
  if (lower.includes('high') || lower.includes('safety')) {
    return { bg: 'var(--high-bg)', color: 'var(--high)', border: 'var(--high-border)' };
  }
  if (lower.includes('on track')) {
    return { bg: 'var(--low-bg)', color: 'var(--low)', border: 'var(--low-border)' };
  }
  return { bg: 'var(--primary-soft)', color: 'var(--primary)', border: 'var(--primary-border)' };
}

export default function SuggestionsPanel({ recommendations }) {
  if (!recommendations) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="grid-2">
        {SECTIONS.map((sec) => {
          const items = recommendations[sec.key] || [];
          if (!items.length) return null;
          const Icon = sec.icon;

          return (
            <div key={sec.key} className="card print-item" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '9px',
                    background: sec.bg,
                    color: sec.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={17} />
                </span>
                <h3 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--text)' }}>
                  {sec.title}
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map((rec, idx) => {
                  const pStyle = priorityStyle(rec.priority);
                  return (
                    <div
                      key={idx}
                      className="print-item"
                      style={{
                        padding: '11px 13px',
                        borderRadius: '10px',
                        background: 'var(--surface-subtle)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginBottom: '5px',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>
                          {rec.title}
                        </span>
                        {rec.priority && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: pStyle.bg,
                              color: pStyle.color,
                              border: `1px solid ${pStyle.border}`,
                            }}
                          >
                            {rec.priority}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        {rec.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Note: These suggestions are informational wellness guidance based on your checkup entries and are not a substitute for professional medical diagnosis or treatment.
      </p>
    </div>
  );
}
