import React, { useEffect, useMemo, useState } from 'react';
import { TrendingDown, TrendingUp, Minus, Trash2, ClipboardPlus } from 'lucide-react';
import { api } from '../api/api';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const dt = new Date(dateStr.replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return dateStr.slice(0, 10);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDiff(val, unit = '', lowerIsBetter = true) {
  if (val === 0) return { text: `0${unit}`, color: 'var(--text-muted)' };
  const improved = lowerIsBetter ? val < 0 : val > 0;
  const sign = val > 0 ? '+' : '';
  return {
    text: `${sign}${Number.isInteger(val) ? val : val.toFixed(1)}${unit}`,
    color: improved ? 'var(--low)' : 'var(--high)',
  };
}

export default function HistoryPage({
  assessments = [],
  onOpenAssessment,
  onStartCheckup,
  onRefresh,
}) {
  const [olderId, setOlderId] = useState(
    assessments.length >= 2 ? String(assessments[assessments.length - 1].id) : ''
  );
  const [newerId, setNewerId] = useState(
    assessments.length >= 1 ? String(assessments[0].id) : ''
  );
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (assessments.length >= 2) {
      const ids = new Set(assessments.map((a) => String(a.id)));
      if (!olderId || !ids.has(String(olderId))) {
        setOlderId(String(assessments[assessments.length - 1].id));
      }
      if (!newerId || !ids.has(String(newerId))) {
        setNewerId(String(assessments[0].id));
      }
    }
  }, [assessments, olderId, newerId]);

  const older = useMemo(
    () => assessments.find((a) => String(a.id) === String(olderId)) || assessments[assessments.length - 1],
    [assessments, olderId]
  );
  const newer = useMemo(
    () => assessments.find((a) => String(a.id) === String(newerId)) || assessments[0],
    [assessments, newerId]
  );

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.deleteAssessment(id);
      await onRefresh();
    } finally {
      setDeletingId(null);
    }
  };

  const comparisonRows = useMemo(() => {
    if (!older || !newer || older.id === newer.id) return [];
    const o = older.input_data || {};
    const n = newer.input_data || {};
    return [
      {
        label: 'Heart Risk Score',
        oldVal: `${older.probability_percent.toFixed(1)}%`,
        newVal: `${newer.probability_percent.toFixed(1)}%`,
        diff: formatDiff(newer.probability_percent - older.probability_percent, '%', true),
      },
      {
        label: 'Systolic BP',
        oldVal: `${o.resting_bp_systolic} mmHg`,
        newVal: `${n.resting_bp_systolic} mmHg`,
        diff: formatDiff((n.resting_bp_systolic || 0) - (o.resting_bp_systolic || 0), ' mmHg', true),
      },
      {
        label: 'Total Cholesterol',
        oldVal: `${o.cholesterol_total} mg/dL`,
        newVal: `${n.cholesterol_total} mg/dL`,
        diff: formatDiff((n.cholesterol_total || 0) - (o.cholesterol_total || 0), ' mg/dL', true),
      },
      {
        label: 'BMI',
        oldVal: `${o.bmi}`,
        newVal: `${n.bmi}`,
        diff: formatDiff((n.bmi || 0) - (o.bmi || 0), '', true),
      },
      {
        label: 'Weekly Exercise',
        oldVal: `${o.exercise_minutes_per_week} min`,
        newVal: `${n.exercise_minutes_per_week} min`,
        diff: formatDiff((n.exercise_minutes_per_week || 0) - (o.exercise_minutes_per_week || 0), ' min', false),
      },
      {
        label: 'Daily Steps',
        oldVal: Number(o.daily_steps || 0).toLocaleString(),
        newVal: Number(n.daily_steps || 0).toLocaleString(),
        diff: formatDiff((n.daily_steps || 0) - (o.daily_steps || 0), '', false),
      },
      {
        label: 'Nightly Sleep',
        oldVal: `${o.sleep_hours} hrs`,
        newVal: `${n.sleep_hours} hrs`,
        diff: formatDiff((n.sleep_hours || 0) - (o.sleep_hours || 0), ' hrs', false),
      },
    ];
  }, [older, newer]);

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Past Checkups &amp; Improvement</h1>
          <p className="page-desc">
            Review your previous assessment dates and compare how your heart health has improved.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onStartCheckup}>
          <ClipboardPlus size={16} />
          <span>New Checkup</span>
        </button>
      </div>

      {/* Compare Two Previous Dates */}
      {assessments.length >= 2 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 className="card-title">Compare Two Dates</h2>
            <p className="card-subtitle">
              Select an earlier checkup and a later checkup to measure your exact improvement.
            </p>
          </div>

          <div className="form-grid" style={{ marginBottom: '18px' }}>
            <div className="field">
              <label htmlFor="older-select">Earlier Date</label>
              <select
                id="older-select"
                className="select"
                value={older?.id || ''}
                onChange={(e) => setOlderId(e.target.value)}
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatDate(a.created_at)} — {a.probability_percent.toFixed(1)}% ({a.risk_tier})
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="newer-select">Later Date</label>
              <select
                id="newer-select"
                className="select"
                value={newer?.id || ''}
                onChange={(e) => setNewerId(e.target.value)}
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {formatDate(a.created_at)} — {a.probability_percent.toFixed(1)}% ({a.risk_tier})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {comparisonRows.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Health Metric</th>
                    <th>{formatDate(older.created_at)}</th>
                    <th>{formatDate(newer.created_at)}</th>
                    <th>Improvement / Change</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <td style={{ fontWeight: 500 }}>{row.label}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{row.oldVal}</td>
                      <td style={{ fontWeight: 600 }}>{row.newVal}</td>
                      <td style={{ fontWeight: 700, color: row.diff.color }}>{row.diff.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
              Select two different dates above to view side-by-side changes.
            </p>
          )}
        </div>
      )}

      {/* Full History List */}
      <div className="card">
        <div style={{ marginBottom: '16px' }}>
          <h2 className="card-title">All Recorded Dates ({assessments.length})</h2>
          <p className="card-subtitle">
            Every checkup is saved with its date, risk prediction, and lifestyle plan.
          </p>
        </div>

        {assessments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#64748b' }}>
            No saved checkups yet. Start your first checkup to begin tracking dates.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Risk Score</th>
                  <th>Level</th>
                  <th>vs. Prior Date</th>
                  <th>BP</th>
                  <th>Cholesterol</th>
                  <th>Exercise</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((item) => {
                  const d = item.delta_vs_previous;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{formatDate(item.created_at)}</td>
                      <td style={{ fontWeight: 700 }}>{item.probability_percent.toFixed(1)}%</td>
                      <td>
                        <span className={`badge badge-${item.risk_level}`}>{item.risk_tier}</span>
                      </td>
                      <td>
                        {d === null || d === undefined ? (
                          <span className="badge badge-neutral">First Checkup</span>
                        ) : d < 0 ? (
                          <span className="badge badge-low">
                            <TrendingDown size={13} /> {Math.abs(d).toFixed(1)}% improved
                          </span>
                        ) : d > 0 ? (
                          <span className="badge badge-high">
                            <TrendingUp size={13} /> +{d.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="badge badge-neutral">
                            <Minus size={13} /> Same
                          </span>
                        )}
                      </td>
                      <td>
                        {item.input_data.resting_bp_systolic}/{item.input_data.resting_bp_diastolic}
                      </td>
                      <td>{item.input_data.cholesterol_total} mg/dL</td>
                      <td>{item.input_data.exercise_minutes_per_week} min/wk</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--primary)' }}
                          onClick={() => onOpenAssessment(item)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--text-muted)' }}
                          title="Delete checkup"
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
