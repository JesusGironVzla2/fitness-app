import React from 'react';

export default function ProgressRings({ rings }) {
  // rings: [{ color, percentage, label, icon }]
  const size = 160;
  const strokeWidth = 10;
  const center = size / 2;

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
        {rings.map((ring, idx) => {
          const radius = center - strokeWidth * 2 - (idx * (strokeWidth + 4));
          const circumference = 2 * Math.PI * radius;
          // Avoid NaN or negative percentages
          const pct = Math.max(0, Math.min(100, ring.percentage || 0));
          const offset = circumference - (pct / 100) * circumference;

          return (
            <g key={idx}>
              {/* Background Ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={`${ring.color}33`}
                strokeWidth={strokeWidth}
              />
              {/* Progress Ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  animation: 'drawRing 1.5s ease-out backwards'
                }}
              />
            </g>
          );
        })}
      </svg>
      {/* Center content */}
      <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' }}>🚀</span>
      </div>
      <style>
        {`
          @keyframes drawRing {
            from { stroke-dashoffset: 1000; }
          }
        `}
      </style>
    </div>
  );
}
