import React from 'react';
import { Award } from 'lucide-react';

export default function Trophies({ rmLogs }) {
  // Extract top 3 PRs
  const bestPRs = {};
  rmLogs.forEach(log => {
    const val = parseFloat(log.value);
    if (!bestPRs[log.exerciseOrBodyPart] || val > bestPRs[log.exerciseOrBodyPart]) {
      bestPRs[log.exerciseOrBodyPart] = val;
    }
  });

  const top3 = Object.entries(bestPRs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (top3.length === 0) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted-foreground)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)' }}>
        <Award size={32} style={{ opacity: 0.2, marginBottom: '0.5rem' }} />
        <p style={{ margin: 0, fontSize: '0.85rem' }}>Registra tus RMs (1 Rep Max) para empezar a ganar trofeos y ver tus mejores marcas aquí.</p>
      </div>
    );
  }

  const getStyle = (idx) => {
    if (idx === 0) return { border: '1px solid rgba(234, 179, 8, 0.4)', bg: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(0,0,0,0.4))', color: '#eab308' }; // Gold
    if (idx === 1) return { border: '1px solid rgba(156, 163, 175, 0.4)', bg: 'linear-gradient(135deg, rgba(156, 163, 175, 0.15), rgba(0,0,0,0.4))', color: '#9ca3af' }; // Silver
    if (idx === 2) return { border: '1px solid rgba(180, 83, 9, 0.4)', bg: 'linear-gradient(135deg, rgba(180, 83, 9, 0.15), rgba(0,0,0,0.4))', color: '#b45309' }; // Bronze
    return { border: '1px solid rgba(168, 85, 247, 0.4)', bg: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(0,0,0,0.4))', color: '#a855f7' }; // Purple (Others)
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', width: '100%' }}>
      {top3.map((pr, idx) => {
        const s = getStyle(idx);
        return (
          <div key={idx} style={{
            background: s.bg,
            border: s.border,
            borderRadius: '16px',
            padding: '1.25rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: 'default',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = `0 12px 24px rgba(0,0,0,0.4), 0 0 15px ${s.color}40`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.2)';
          }}
          >
            {/* Subtle glow effect behind the icon */}
            <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '40px', height: '40px', background: s.color, filter: 'blur(30px)', opacity: 0.3 }}></div>
            
            <Award size={36} color={s.color} style={{ filter: `drop-shadow(0 0 8px ${s.color}80)` }} />
            
            <div style={{ textAlign: 'center', zIndex: 1 }}>
              <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '1.4rem', color: 'white', fontWeight: '800', letterSpacing: '-0.5px' }}>{pr[1]} <span style={{fontSize:'0.9rem', color: 'var(--muted-foreground)'}}>kg</span></h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted-foreground)', lineHeight: '1.2', fontWeight: '500' }}>{pr[0]}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
