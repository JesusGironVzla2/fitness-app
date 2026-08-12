import React from 'react';

export default function ActivityCalendar({ workouts }) {
  // Generate last 12 weeks
  const weeks = 15;
  const days = 7;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  // Initialize empty heatmap [weekIdx][dayIdx]
  const heatmap = Array.from({ length: weeks }, () => Array(days).fill(0));
  
  // For each workout, find its place in the grid
  workouts.forEach(w => {
    if(w.completed) {
      const wDate = new Date(w.date || w.completedAt);
      wDate.setHours(0,0,0,0);
      const diffTime = Math.abs(today - wDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Calculate day of week (0 is Sunday, 1 is Monday...)
      const dayIdx = wDate.getDay(); 
      // Calculate how many weeks ago
      // Today is in week index (weeks - 1)
      // If diffDays is less than (weeks * 7)
      // We align by adjusting for current day of week
      const currentDayOfWeek = today.getDay();
      const daysAgoFromEndOfCurrentWeek = diffDays + (6 - currentDayOfWeek);
      
      if(daysAgoFromEndOfCurrentWeek < weeks * 7 && daysAgoFromEndOfCurrentWeek >= 0) {
        const weekIdx = (weeks - 1) - Math.floor(daysAgoFromEndOfCurrentWeek / 7);
        if(heatmap[weekIdx] && heatmap[weekIdx][dayIdx] !== undefined) {
           heatmap[weekIdx][dayIdx] += 1;
        }
      }
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '0.5rem', justifyContent: 'center' }}>
        {heatmap.map((week, wIdx) => (
          <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {week.map((count, dIdx) => {
              // Hide future days in the last week
              if (wIdx === weeks - 1 && dIdx > today.getDay()) {
                return <div key={dIdx} style={{ width: '14px', height: '14px' }} />;
              }

              let color = 'rgba(255,255,255,0.05)'; // empty
              let glow = 'none';
              if (count === 1) { color = '#10b981'; glow = '0 0 4px rgba(16, 185, 129, 0.4)'; }
              if (count >= 2) { color = '#047857'; glow = '0 0 6px rgba(4, 120, 87, 0.6)'; }
              
              return (
                <div 
                  key={dIdx} 
                  style={{
                    width: '14px', height: '14px', 
                    backgroundColor: color, 
                    borderRadius: '3px',
                    boxShadow: glow,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  title={count > 0 ? `${count} entrenamiento(s)` : 'Sin actividad'}
                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
        <span>Menos</span>
        <div style={{width:'12px', height:'12px', background:'rgba(255,255,255,0.05)', borderRadius:'2px'}} />
        <div style={{width:'12px', height:'12px', background:'#10b981', borderRadius:'2px'}} />
        <div style={{width:'12px', height:'12px', background:'#047857', borderRadius:'2px'}} />
        <span>Más</span>
      </div>
    </div>
  );
}
