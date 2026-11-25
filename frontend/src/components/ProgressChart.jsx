import React, { useState } from 'react';

const METRICS = [
  { key: 'probability', label: 'Risk Score', unit: '%', color: '#2563eb', minZero: true, exactMax: 100 },
  { key: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', color: '#0ea5e9' },
  { key: 'cholesterol', label: 'Cholesterol', unit: 'mg/dL', color: '#8b5cf6' },
  { key: 'bmi', label: 'BMI', unit: '', color: '#059669' },
  { key: 'daily_steps', label: 'Daily Steps', unit: 'steps', color: '#d97706' },
];

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const dt = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ProgressChart({ timeline = [] }) {
  const [selectedMetric, setSelectedMetric] = useState('probability');
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const metric = METRICS.find((m) => m.key === selectedMetric) || METRICS[0];

  if (!timeline.length) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        Complete your first health checkup to start tracking your progress over time.
      </div>
    );
  }

  const values = timeline.map((pt) => Number(pt[metric.key] ?? 0));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minVal = metric.minZero ? 0 : Math.max(0, Math.floor(rawMin * 0.9));
  const maxVal = metric.exactMax
    ? metric.exactMax
    : Math.ceil((rawMax === rawMin ? rawMax + 10 : rawMax) * 1.08);
  const range = Math.max(1, maxVal - minVal);

  const width = 680;
  const height = 230;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 34;

  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const coords = timeline.map((pt, idx) => {
    const x =
      timeline.length === 1
        ? padLeft + innerW / 2
        : padLeft + (idx / (timeline.length - 1)) * innerW;
    const val = Number(pt[metric.key] ?? 0);
    const y = padTop + innerH - ((val - minVal) / range) * innerH;
    return { x, y, val, pt };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + innerH).toFixed(1)} Z`
      : '';

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    val: Math.round(minVal + ratio * range),
    y: padTop + innerH - ratio * innerH,
  }));

  const activePoint = hoveredIdx !== null ? coords[hoveredIdx] : coords[coords.length - 1];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div className="no-print" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setSelectedMetric(m.key)}
              className="btn btn-sm"
              style={{
                background: selectedMetric === m.key ? 'var(--primary-soft)' : 'var(--surface-subtle)',
                color: selectedMetric === m.key ? 'var(--primary)' : 'var(--text-secondary)',
                borderColor: selectedMetric === m.key ? 'var(--primary-border)' : 'var(--border)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {activePoint && (
          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text)' }}>{formatShortDate(activePoint.pt.date)}:</strong>{' '}
            <span style={{ color: metric.color, fontWeight: 700 }}>
              {metric.key === 'daily_steps'
                ? Math.round(activePoint.val).toLocaleString()
                : activePoint.val}
              {metric.unit ? ` ${metric.unit}` : ''}
            </span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metric.color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={metric.color} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              y1={t.y}
              x2={width - padRight}
              y2={t.y}
              stroke="var(--border)"
              strokeDasharray={i === 0 ? undefined : '3 3'}
            />
            <text
              x={padLeft - 8}
              y={t.y + 4}
              textAnchor="end"
              fontSize="11"
              fill="var(--text-muted)"
            >
              {t.val}
            </text>
          </g>
        ))}

        {areaPath && <path d={areaPath} fill="url(#chartAreaGrad)" />}

        {coords.length > 1 && (
          <path
            d={linePath}
            fill="none"
            stroke={metric.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {coords.map((c, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <g
              key={c.pt.id || idx}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(idx)}
            >
              <circle
                cx={c.x}
                cy={c.y}
                r={isHovered ? 6.5 : 4.5}
                fill="var(--surface)"
                stroke={metric.color}
                strokeWidth={isHovered ? 3 : 2.5}
              />
              <text
                x={c.x}
                y={height - 10}
                textAnchor="middle"
                fontSize="11"
                fill="var(--text-muted)"
              >
                {formatShortDate(c.pt.date)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
