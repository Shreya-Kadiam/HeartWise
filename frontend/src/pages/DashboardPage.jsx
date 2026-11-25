import React, { useState } from 'react';
import {
  ClipboardPlus,
  TrendingDown,
  TrendingUp,
  Minus,
  Calendar,
  Activity,
  HeartPulse,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react';
import ProgressChart from '../components/ProgressChart';
import SuggestionsPanel from '../components/SuggestionsPanel';
import { useAuth } from '../context/AuthContext';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const dt = new Date(dateStr.replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return dateStr.slice(0, 10);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function DeltaTag({ delta }) {
  if (delta === null || delta === undefined) {
    return <span className="badge badge-neutral">Baseline</span>;
  }
  if (delta < 0) {
    return (
      <span className="badge badge-low">
        <TrendingDown size={13} />
        {Math.abs(delta).toFixed(1)}% improved
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="badge badge-high">
        <TrendingUp size={13} />
        +{delta.toFixed(1)}% higher
      </span>
    );
  }
  return (
    <span className="badge badge-neutral">
      <Minus size={13} />
      No change
    </span>
  );
}

export default function DashboardPage({
  dashboard,
  loading,
  onStartCheckup,
  onOpenAssessment,
  onOpenHistory,
}) {
  const { user } = useAuth();
  const [showSuggestions, setShowSuggestions] = useState(false);

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading your health dashboard...
        </div>
      </div>
    );
  }

  const latest = dashboard?.latest;
  const total = dashboard?.total_assessments || 0;
  const changeFirst = dashboard?.change_since_first;
  const changeLast = dashboard?.change_since_last;
  const recentList = (dashboard?.assessments || []).slice(0, 5);
  const firstName = (user?.full_name || user?.username || 'there').split(' ')[0];

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {firstName}</h1>
          <p className="page-desc">
            Overview of your heart health assessments, improvement trend, and recent checkups.
          </p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {latest && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              <span>Print Summary</span>
            </button>
          )}
          <button className="btn btn-primary" onClick={onStartCheckup}>
            <ClipboardPlus size={17} />
            <span>New Health Checkup</span>
          </button>
        </div>
      </div>

      {!latest ? (
        <div className="card" style={{ textAlign: 'center', padding: '52px 24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'var(--primary-soft)',
              color: 'var(--primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}
          >
            <HeartPulse size={24} />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text)' }}>
            No health checkups yet
          </h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '460px', margin: '8px auto 22px', fontSize: '0.92rem' }}>
            Enter your medical details, lifestyle habits, medical history, and daily activity to get your first risk prediction and personalized lifestyle suggestions.
          </p>
          <button className="btn btn-primary btn-lg" onClick={onStartCheckup}>
            Start Your First Checkup
          </button>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="stats-grid">
            <div className="card stat-card stat-primary print-item" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Latest Risk Score</span>
                <span className="stat-icon stat-icon-primary"><HeartPulse size={16} /></span>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.2, color: 'var(--text)' }}>
                {latest.probability_percent.toFixed(1)}%
              </div>
              <div style={{ marginTop: '8px' }}>
                <span className={`badge badge-${latest.risk_level}`}>{latest.risk_tier}</span>
              </div>
            </div>

            <div className="card stat-card stat-low print-item" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Overall Improvement</span>
                <span className="stat-icon stat-icon-low"><TrendingDown size={16} /></span>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.2, color: 'var(--text)' }}>
                {changeFirst === null || changeFirst === undefined
                  ? '—'
                  : `${changeFirst > 0 ? '+' : ''}${changeFirst.toFixed(1)}%`}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {changeLast !== null && changeLast !== undefined
                  ? `${changeLast <= 0 ? 'Down' : 'Up'} ${Math.abs(changeLast).toFixed(1)}% since prior date`
                  : 'Complete a 2nd checkup to track change'}
              </div>
            </div>

            <div className="card stat-card stat-purple print-item" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Checkups Logged</span>
                <span className="stat-icon stat-icon-purple"><Calendar size={16} /></span>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1.2, color: 'var(--text)' }}>
                {total}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Last checkup: {formatDate(latest.created_at)}
              </div>
            </div>

            <div className="card stat-card stat-amber print-item" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Latest Vitals</span>
                <span className="stat-icon stat-icon-amber"><Activity size={16} /></span>
              </div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.35, color: 'var(--text)' }}>
                {latest.input_data.resting_bp_systolic}/{latest.input_data.resting_bp_diastolic}{' '}
                <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>mmHg</span>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                BMI {latest.input_data.bmi} · {Number(latest.input_data.daily_steps || 0).toLocaleString()} steps/day
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="card print-item" style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h2 className="card-title">Progress Across Previous Dates</h2>
              <p className="card-subtitle">
                See how your risk score and key health metrics have changed over time.
              </p>
            </div>
            <ProgressChart timeline={dashboard.timeline || []} />
          </div>

          {/* Latest Personalized Lifestyle Suggestions — toggleable on screen, ALWAYS printed */}
          {latest.recommendations && (
            <div className="card suggestions-print-section" style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} color="var(--primary)" />
                    <span>Latest Lifestyle Suggestions</span>
                  </h2>
                  <p className="card-subtitle">
                    Actionable recommendations from your latest checkup ({formatDate(latest.created_at)}).
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm no-print"
                  onClick={() => setShowSuggestions((prev) => !prev)}
                >
                  <span>{showSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}</span>
                  {showSuggestions ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>

              <div
                className={showSuggestions ? '' : 'suggestions-collapsed'}
                style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}
              >
                <SuggestionsPanel recommendations={latest.recommendations} />
              </div>
            </div>
          )}

          {/* Recent Checkups Table */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 className="card-title">Recent Checkup History</h2>
                <p className="card-subtitle">
                  Click any previous date to view its risk breakdown and lifestyle suggestions.
                </p>
              </div>
              {total > 1 && (
                <button className="btn btn-secondary btn-sm no-print" onClick={onOpenHistory}>
                  <span>Compare Previous Dates</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Risk Score</th>
                    <th>Risk Level</th>
                    <th>Change vs. Prior Date</th>
                    <th>Blood Pressure</th>
                    <th>Daily Steps</th>
                    <th className="no-print"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentList.map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{formatDate(item.created_at)}</td>
                      <td style={{ fontWeight: 700 }}>{item.probability_percent.toFixed(1)}%</td>
                      <td>
                        <span className={`badge badge-${item.risk_level}`}>{item.risk_tier}</span>
                      </td>
                      <td>
                        <DeltaTag delta={item.delta_vs_previous} />
                      </td>
                      <td>
                        {item.input_data.resting_bp_systolic}/{item.input_data.resting_bp_diastolic} mmHg
                      </td>
                      <td>{Number(item.input_data.daily_steps || 0).toLocaleString()}</td>
                      <td className="no-print" style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--primary)' }}
                          onClick={() => onOpenAssessment(item)}
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
