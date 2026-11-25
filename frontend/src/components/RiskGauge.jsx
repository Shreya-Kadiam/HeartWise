import React from 'react';

export default function RiskGauge({ probability = 0, riskLevel = 'low', riskTier = 'Low Risk' }) {
  const clamped = Math.max(0, Math.min(100, Number(probability) || 0));
  const radius = 84;
  const circumference = Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const colorMap = {
    low: 'var(--low)',
    moderate: 'var(--moderate)',
    high: 'var(--high)',
  };
  const strokeColor = colorMap[riskLevel] || 'var(--primary)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox="0 0 220 130" style={{ width: '220px', height: '130px', overflow: 'visible' }}>
        <path
          d="M 26 112 A 84 84 0 0 1 194 112"
          fill="none"
          stroke="var(--gauge-track)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 26 112 A 84 84 0 0 1 194 112"
          fill="none"
          stroke={strokeColor}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text
          x="110"
          y="94"
          textAnchor="middle"
          fontSize="32"
          fontWeight="700"
          fill="var(--text)"
        >
          {clamped.toFixed(1)}%
        </text>
        <text
          x="110"
          y="116"
          textAnchor="middle"
          fontSize="12"
          fontWeight="500"
          fill="var(--text-muted)"
        >
          Estimated Risk
        </text>
      </svg>

      <span className={`badge badge-${riskLevel}`} style={{ marginTop: '4px' }}>
        {riskTier}
      </span>
    </div>
  );
}
