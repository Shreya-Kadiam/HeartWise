import React, { useState } from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  ArrowLeft,
  ClipboardPlus,
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react';
import RiskGauge from '../components/RiskGauge';
import SuggestionsPanel from '../components/SuggestionsPanel';

function formatDate(dateStr) {
  if (!dateStr) return 'Today';
  const dt = new Date(dateStr.replace(' ', 'T'));
  if (Number.isNaN(dt.getTime())) return dateStr.slice(0, 10);
  return dt.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ResultPage({ assessment, onBackToDashboard, onNewCheckup }) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  if (!assessment) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <h2 className="card-title">No assessment selected</h2>
          <p className="card-subtitle" style={{ marginBottom: '18px' }}>
            Complete a health checkup or choose a previous date from your dashboard.
          </p>
          <button className="btn btn-primary" onClick={onNewCheckup}>
            Start Health Checkup
          </button>
        </div>
      </div>
    );
  }

  const riskFactors = (assessment.explanation?.risk_factors || []).slice(0, 6);
  const protectiveFactors = (assessment.explanation?.protective_factors || []).slice(0, 6);
  const delta = assessment.delta_vs_previous;
  const inp = assessment.input_data || {};

  return (
    <div className="container" style={{ maxWidth: '940px' }}>
      <div className="page-header">
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm no-print"
            style={{ paddingLeft: 0, marginBottom: '6px' }}
            onClick={onBackToDashboard}
          >
            <ArrowLeft size={15} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="page-title">Your Heart Risk Result</h1>
          <p className="page-desc">Recorded on {formatDate(assessment.created_at)}</p>
        </div>

        <div className="no-print" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
          >
            <Printer size={16} />
            <span>Print Report</span>
          </button>
          <button className="btn btn-secondary" onClick={onNewCheckup}>
            <ClipboardPlus size={16} />
            <span>New Checkup</span>
          </button>
        </div>
      </div>

      {/* Main Risk Summary Card */}
      <div
        className="card print-item"
        style={{
          marginBottom: '22px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '28px',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <RiskGauge
            probability={assessment.probability_percent}
            riskLevel={assessment.risk_level}
            riskTier={assessment.risk_tier}
          />
        </div>

        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>
            {assessment.risk_tier} Profile
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.94rem', marginBottom: '16px' }}>
            {assessment.risk_summary}
          </p>

          {delta !== null && delta !== undefined && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '0.86rem',
                fontWeight: 600,
                background: delta <= 0 ? 'var(--low-bg)' : 'var(--high-bg)',
                color: delta <= 0 ? 'var(--low)' : 'var(--high)',
                border: `1px solid ${delta <= 0 ? 'var(--low-border)' : 'var(--high-border)'}`,
                marginBottom: '16px',
              }}
            >
              {delta <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
              <span>
                {delta < 0
                  ? `Improved by ${Math.abs(delta).toFixed(1)}% compared to your previous checkup`
                  : delta > 0
                  ? `Increased by ${delta.toFixed(1)}% compared to your previous checkup`
                  : 'Unchanged from your previous checkup'}
              </span>
            </div>
          )}

          {/* Compact Snapshot of Key Entered Vitals */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Blood Pressure</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text)' }}>
                {inp.resting_bp_systolic}/{inp.resting_bp_diastolic} mmHg
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cholesterol</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text)' }}>
                {inp.cholesterol_total} mg/dL
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BMI / Steps</div>
              <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text)' }}>
                {inp.bmi} · {Number(inp.daily_steps || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personalized Lifestyle Suggestions — toggleable on screen, ALWAYS printed */}
      <div
        className="card suggestions-print-section"
        style={{
          marginBottom: '22px',
          background: showSuggestions ? 'var(--surface)' : 'var(--primary-soft)',
          borderColor: showSuggestions ? 'var(--border)' : 'var(--primary-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--primary)" />
              <span>Personalized Lifestyle Suggestions</span>
            </h2>
            <p className="card-subtitle">
              Tailored diet, exercise, sleep, and medical next-step suggestions based on your{' '}
              <strong>{assessment.risk_tier.toLowerCase()}</strong> result.
            </p>
          </div>

          <button
            type="button"
            className={`btn no-print ${showSuggestions ? 'btn-secondary' : 'btn-primary'}`}
            onClick={() => setShowSuggestions((prev) => !prev)}
          >
            <span>{showSuggestions ? 'Hide Suggestions' : 'View Lifestyle Suggestions'}</span>
            {showSuggestions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <div
          className={showSuggestions ? '' : 'suggestions-collapsed'}
          style={{ marginTop: '20px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}
        >
          <SuggestionsPanel recommendations={assessment.recommendations} />
        </div>
      </div>

      {/* Key Factors Breakdown */}
      <div className="grid-2">
        <div className="card print-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <AlertCircle size={18} color="var(--high)" />
            <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text)' }}>
              Key Areas to Watch
            </h3>
          </div>

          {riskFactors.length === 0 ? (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              No major elevated risk markers detected in this checkup.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {riskFactors.map((item, idx) => (
                <div
                  key={idx}
                  className="print-item"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: item.severity === 'high' ? 'var(--high-bg)' : 'var(--moderate-bg)',
                    border: `1px solid ${item.severity === 'high' ? 'var(--high-border)' : 'var(--moderate-border)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.87rem', fontWeight: 600, color: 'var(--text)' }}>
                    <span>{item.param}</span>
                    <span style={{ color: item.severity === 'high' ? 'var(--high)' : 'var(--moderate)' }}>
                      {item.impact}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card print-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <CheckCircle2 size={18} color="var(--low)" />
            <h3 style={{ fontSize: '0.98rem', fontWeight: 600, color: 'var(--text)' }}>
              What Is Working Well
            </h3>
          </div>

          {protectiveFactors.length === 0 ? (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Explore the lifestyle suggestions above to start building protective daily habits.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {protectiveFactors.map((item, idx) => (
                <div
                  key={idx}
                  className="print-item"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--surface-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '0.87rem', fontWeight: 600, color: 'var(--text)' }}>
                    <span>{item.param}</span>
                    <span style={{ color: 'var(--low)' }}>{item.impact}</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
