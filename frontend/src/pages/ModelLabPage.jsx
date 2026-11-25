import React, { useCallback, useEffect, useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  RefreshCw,
  FileText,
  Award,
  BarChart3,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../api/api';

const MODEL_COLORS = {
  'Logistic Regression': '#2563eb',
  'Random Forest': '#059669',
  KNN: '#d97706',
};

function pct(val) {
  return `${(Number(val || 0) * 100).toFixed(1)}%`;
}

export default function ModelLabPage({ activeModel, onModelChanged, onStartCheckup }) {
  const [data, setData] = useState(null);
  const [rawReportText, setRawReportText] = useState('');
  const [reportFilePath, setReportFilePath] = useState('');
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState('');
  const [retraining, setRetraining] = useState(false);
  const [selectedReportTab, setSelectedReportTab] = useState('Logistic Regression');
  const [showRawReport, setShowRawReport] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [modelsRes, reportsRes] = await Promise.all([
        api.getAdminModels(),
        api.getAdminReports(),
      ]);
      setData({
        active_model: modelsRes.active_model,
        metrics: modelsRes.metrics,
      });
      setRawReportText(reportsRes.raw_text || '');
      setReportFilePath(reportsRes.report_file || 'backend/reports/classification_reports.txt');
      setSelectedReportTab(modelsRes.active_model || modelsRes.metrics?.selected_model || 'Logistic Regression');
      if (onModelChanged && modelsRes.active_model) {
        onModelChanged(modelsRes.active_model);
      }
    } catch (err) {
      setError(err.message || 'Could not load ML model comparison data.');
    } finally {
      setLoading(false);
    }
  }, [onModelChanged]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSelectModel = async (modelName) => {
    setSwitching(modelName);
    setError('');
    setToast('');
    try {
      const res = await api.selectActiveModel(modelName);
      setData((prev) => ({ ...prev, active_model: res.active_model }));
      setSelectedReportTab(res.active_model);
      if (onModelChanged) {
        onModelChanged(res.active_model);
      }
      setToast(`Active prediction model switched to ${res.active_model}. New checkups will now use ${res.active_model}.`);
    } catch (err) {
      setError(err.message || 'Failed to switch model.');
    } finally {
      setSwitching('');
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    setError('');
    setToast('');
    try {
      const res = await api.retrainModels();
      setData({ active_model: res.active_model, metrics: res.metrics });
      setSelectedReportTab(res.active_model);
      if (onModelChanged) {
        onModelChanged(res.active_model);
      }
      const reportsRes = await api.getAdminReports();
      setRawReportText(reportsRes.raw_text || '');
      setToast(`All 3 models retrained & classification reports regenerated. Active model: ${res.active_model}.`);
    } catch (err) {
      setError(err.message || 'Retraining failed.');
    } finally {
      setRetraining(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading trained ML models and classification reports...
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const active = data?.active_model || activeModel || metrics.selected_model;
  const autoBest = metrics.selected_model;
  const comparison = metrics.comparison || [];
  const modelsMap = metrics.models || {};
  const summary = metrics.summary || {};
  const winner = metrics.winner_analysis || {};
  const activeStats = modelsMap[active]?.test || {};
  const activeReport = modelsMap[selectedReportTab]?.test?.classification_report || {};

  // ROC SVG coordinates
  const w = 440;
  const h = 250;
  const pad = 34;
  const sx = (x) => pad + x * (w - pad * 1.4);
  const sy = (y) => h - pad - y * (h - pad * 1.5);

  // Dynamic feature importance
  const isRfActive = active === 'Random Forest';
  const feats = isRfActive
    ? (metrics.feature_importance?.random_forest || []).slice(0, 8)
    : (metrics.feature_importance?.logistic_regression || []).slice(0, 8);
  const maxFeatVal = isRfActive
    ? Math.max(...feats.map((f) => f.importance || 0), 0.01)
    : Math.max(...feats.map((f) => f.abs_weight || 0), 0.01);

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <span className="badge badge-neutral" style={{ marginBottom: '8px' }}>
            <Cpu size={13} />
            ML Evaluation &amp; Model Selector
          </span>
          <h1 className="page-title">Model Comparison &amp; Classification Reports</h1>
          <p className="page-desc">
            Compare all 3 trained models (Logistic Regression, Random Forest, KNN), inspect their classification reports, and choose which model powers live predictions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-secondary" onClick={handleRetrain} disabled={retraining}>
            <RefreshCw size={15} className={retraining ? 'spin' : ''} />
            <span>{retraining ? 'Retraining...' : 'Retrain All 3 Models'}</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={onStartCheckup}>
            <span>Test in New Checkup</span>
          </button>
        </div>
      </div>

      {error && <div className="alert-error">{error}</div>}
      {toast && (
        <div
          style={{
            background: 'var(--low-bg)',
            color: 'var(--low)',
            border: '1px solid var(--low-border)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '18px',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={17} />
          <span>{toast}</span>
        </div>
      )}

      {/* Active Main Model Banner */}
      <div
        className="card"
        style={{
          marginBottom: '22px',
          borderLeft: '4px solid var(--primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>
            Currently Active Prediction Model
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 700, marginTop: '2px', color: 'var(--text)' }}>
            {active}
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Test ROC-AUC: <strong>{pct(activeStats.roc_auc)}</strong> · Accuracy:{' '}
            <strong>{pct(activeStats.accuracy)}</strong> · Recall:{' '}
            <strong>{pct(activeStats.recall)}</strong> · F1-Score:{' '}
            <strong>{pct(activeStats.f1_score)}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          <span>Dataset: <strong style={{ color: 'var(--text)' }}>{summary.total_records || 4000} rows</strong></span>
          <span>Train / Val / Test: <strong style={{ color: 'var(--text)' }}>{summary.train_records} / {summary.val_records} / {summary.test_records}</strong></span>
          <span>Auto-Best: <strong style={{ color: 'var(--low)' }}>{autoBest}</strong></span>
        </div>
      </div>

      {/* 3 Model Selector Cards */}
      <div className="model-cards-grid" style={{ marginBottom: '22px' }}>
        {comparison.map((row) => {
          const isActive = row.model === active;
          const isBest = row.model === autoBest;
          const isBusy = switching === row.model;

          return (
            <div
              key={row.model}
              className="card"
              style={{
                border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
                boxShadow: isActive ? '0 6px 20px rgba(37, 99, 235, 0.12)' : 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{row.model}</h2>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {isBest && (
                      <span className="badge badge-low">
                        <Award size={12} /> Best
                      </span>
                    )}
                    {isActive && <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }}>Active</span>}
                  </div>
                </div>

                <div className="kpi-mini-grid">
                  <div className="kpi-mini">
                    <span>ROC-AUC</span>
                    <strong>{pct(row.roc_auc)}</strong>
                  </div>
                  <div className="kpi-mini">
                    <span>Accuracy</span>
                    <strong>{pct(row.accuracy)}</strong>
                  </div>
                  <div className="kpi-mini">
                    <span>Recall</span>
                    <strong>{pct(row.recall)}</strong>
                  </div>
                  <div className="kpi-mini">
                    <span>Precision</span>
                    <strong>{pct(row.precision)}</strong>
                  </div>
                  <div className="kpi-mini">
                    <span>F1-Score</span>
                    <strong>{pct(row.f1_score)}</strong>
                  </div>
                  <div className="kpi-mini">
                    <span>Specificity</span>
                    <strong>{pct(row.specificity)}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'}`}
                style={{ width: '100%' }}
                disabled={isActive || Boolean(switching)}
                onClick={() => handleSelectModel(row.model)}
              >
                {isActive
                  ? 'Currently Active Model'
                  : isBusy
                  ? 'Switching...'
                  : `Use ${row.model} for Predictions`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Classification Reports Section */}
      <div className="card" style={{ marginBottom: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="var(--primary)" />
              <span>Classification Report (Held-Out Test Set, n = {summary.test_records || 600})</span>
            </h3>
            <p className="card-subtitle">
              Per-class Precision, Recall, F1-Score, and Support from <code>sklearn.metrics.classification_report</code>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {comparison.map((row) => (
              <button
                key={row.model}
                type="button"
                onClick={() => setSelectedReportTab(row.model)}
                className={`btn btn-sm ${selectedReportTab === row.model ? 'btn-primary' : 'btn-secondary'}`}
              >
                {row.model}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Class / Average</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1-Score</th>
                <th>Support</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'No Heart Disease (0)', label: 'Class 0 — No Heart Disease' },
                { key: 'Heart Disease (1)', label: 'Class 1 — Heart Disease' },
                { key: 'macro avg', label: 'Macro Average' },
                { key: 'weighted avg', label: 'Weighted Average' },
              ].map((item) => {
                const row = activeReport[item.key] || {};
                return (
                  <tr key={item.key}>
                    <td><strong>{item.label}</strong></td>
                    <td>{pct(row.precision)}</td>
                    <td>{pct(row.recall)}</td>
                    <td>{pct(row['f1-score'])}</td>
                    <td>{row.support ?? '—'}</td>
                  </tr>
                );
              })}
              <tr style={{ background: 'var(--primary-soft)' }}>
                <td><strong>Overall Accuracy ({selectedReportTab})</strong></td>
                <td colSpan={3}><strong>{pct(activeReport.accuracy)}</strong></td>
                <td><strong>{summary.test_records || 600}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Backend Text Report Preview */}
        <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={15} />
              <span>Saved in backend: <code>backend/reports/classification_reports.txt</code></span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowRawReport((v) => !v)}
            >
              {showRawReport ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              <span>{showRawReport ? 'Hide Raw Backend Report' : 'View Raw Backend Report'}</span>
            </button>
          </div>

          {showRawReport && (
            <pre
              style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                fontSize: '0.78rem',
                lineHeight: 1.5,
                overflowX: 'auto',
                color: 'var(--text)',
                maxHeight: '420px',
              }}
            >
              {rawReportText}
            </pre>
          )}
        </div>
      </div>

      {/* Why Logistic Regression Outperforms Random Forest */}
      {winner.points && (
        <div className="card" style={{ marginBottom: '22px' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Lightbulb size={18} color="var(--moderate)" />
            <span>{winner.headline || 'Why Logistic Regression Outperforms Random Forest Here'}</span>
          </h3>
          <div className="grid-2">
            {winner.points.map((pt, i) => (
              <div
                key={i}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px', color: 'var(--text)' }}>
                  {pt.title}
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                  {pt.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROC Curve + Feature Importance */}
      <div className="grid-2" style={{ marginBottom: '22px' }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '10px' }}>ROC Curve Comparison (Test Set)</h3>
          <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxHeight: '260px', display: 'block' }}>
            <line x1={pad} y1={h - pad} x2={w - 14} y2={h - pad} stroke="var(--border-strong)" />
            <line x1={pad} y1={h - pad} x2={pad} y2={14} stroke="var(--border-strong)" />
            <line x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(1)} stroke="var(--text-muted)" strokeDasharray="4 4" />
            {Object.entries(modelsMap).map(([name, mdata]) => {
              const pts = mdata.test?.roc_curve || [];
              const d = pts
                .map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.fpr).toFixed(1)} ${sy(p.tpr).toFixed(1)}`)
                .join(' ');
              return (
                <path
                  key={name}
                  d={d}
                  fill="none"
                  stroke={MODEL_COLORS[name] || '#2563eb'}
                  strokeWidth={name === active ? 3.5 : 2}
                />
              );
            })}
            <text x={w / 2} y={h - 6} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
              False Positive Rate
            </text>
            <text
              x="12"
              y={h / 2}
              textAnchor="middle"
              fontSize="11"
              fill="var(--text-muted)"
              transform={`rotate(-90 12 ${h / 2})`}
            >
              True Positive Rate
            </text>
          </svg>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', fontSize: '0.82rem' }}>
            {Object.entries(modelsMap).map(([name, mdata]) => (
              <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    background: MODEL_COLORS[name] || '#2563eb',
                    display: 'inline-block',
                  }}
                />
                {name} (AUC {(mdata.test?.roc_auc || 0).toFixed(3)})
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: '12px' }}>
            Top Predictive Features ({isRfActive ? 'Random Forest Importance' : 'Logistic Regression Signal'})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {feats.map((f) => {
              const val = isRfActive ? f.importance : f.abs_weight;
              const widthPct = Math.round((val / maxFeatVal) * 100);
              const isPos = isRfActive ? true : f.weight >= 0;
              return (
                <div key={f.feature}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '3px' }}>
                    <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                      {f.feature.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontWeight: 600, color: isRfActive ? 'var(--low)' : isPos ? 'var(--high)' : 'var(--low)' }}>
                      {isRfActive ? `${(f.importance * 100).toFixed(1)}%` : `${isPos ? '+' : ''}${f.weight.toFixed(3)}`}
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--surface-subtle)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${widthPct}%`,
                        borderRadius: '999px',
                        background: isRfActive ? 'var(--low)' : isPos ? 'var(--primary)' : 'var(--low)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confusion Matrices */}
      <div className="card">
        <h3 className="card-title" style={{ marginBottom: '14px' }}>Confusion Matrices (Held-Out Test Set)</h3>
        <div className="model-cards-grid">
          {Object.entries(modelsMap).map(([name, mdata]) => {
            const t = mdata.test || {};
            const isActive = name === active;
            return (
              <div
                key={name}
                style={{
                  border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontWeight: 700, fontSize: '0.92rem' }}>
                  <span>{name}</span>
                  {isActive && <span className="badge" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>Active</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div className="cm-box cm-tp">
                    <strong>{t.true_positives}</strong>
                    <span>True Positive</span>
                  </div>
                  <div className="cm-box cm-fp">
                    <strong>{t.false_positives}</strong>
                    <span>False Positive</span>
                  </div>
                  <div className="cm-box cm-fn">
                    <strong>{t.false_negatives}</strong>
                    <span>False Negative</span>
                  </div>
                  <div className="cm-box cm-tn">
                    <strong>{t.true_negatives}</strong>
                    <span>True Negative</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
