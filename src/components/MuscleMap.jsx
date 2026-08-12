import React from 'react';

export default function MuscleMap({ workouts, exercisesLib }) {
  const now = new Date();
  const fatigueMap = {}; 
  
  if (workouts && workouts.length > 0) {
    workouts.forEach(w => {
      if (w.completed) {
        const wDate = new Date(w.completedAt || w.date);
        const hoursDiff = (now - wDate) / (1000 * 60 * 60);
        // Only track fatigue for workouts in the last 72 hours
        if (hoursDiff <= 72 && w.exercises) {
          w.exercises.forEach(ex => {
            const muscle = exercisesLib[ex.exerciseId] || 'Otros';
            if (!fatigueMap[muscle] || hoursDiff < fatigueMap[muscle]) {
              fatigueMap[muscle] = hoursDiff;
            }
          });
        }
      }
    });
  }

  const getColor = (muscleStr) => {
    // Find if any trained muscle string includes the target
    const m = Object.keys(fatigueMap).find(k => k.toLowerCase().includes(muscleStr.toLowerCase()));
    if (!m) return '#1f2937'; // Default dark gray (rested completely / no activity)
    const h = fatigueMap[m];
    if (h <= 24) return '#ef4444'; // Red (Fatigued)
    if (h <= 48) return '#eab308'; // Yellow (Recovering)
    return '#10b981'; // Green (Rested)
  };

  const getGlow = (muscleStr) => {
    const color = getColor(muscleStr);
    if (color === '#1f2937') return 'none';
    return `drop-shadow(0 0 5px ${color}80)`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '2rem', width: '100%' }}>
      {/* Minimalist Human Body SVG */}
      <svg width="140" height="240" viewBox="0 0 100 200" style={{ filter: 'drop-shadow(0 0 15px rgba(0,0,0,0.5))' }}>
        {/* Head */}
        <circle cx="50" cy="20" r="14" fill="#1f2937" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        
        {/* Torso/Chest (Pecho) */}
        <path d="M 32 40 L 68 40 L 72 70 L 28 70 Z" fill={getColor('pecho')} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" style={{ transition: 'fill 0.5s', filter: getGlow('pecho') }} />
        
        {/* Core/Abs (Core) */}
        <path d="M 28 70 L 72 70 L 65 105 L 35 105 Z" fill={getColor('core')} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" style={{ transition: 'fill 0.5s', filter: getGlow('core') }} />
        
        {/* Left Arm (Brazos) */}
        <path d="M 32 40 L 15 50 L 10 90 L 20 90 L 28 55 Z" fill={getColor('brazo')} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" style={{ transition: 'fill 0.5s', filter: getGlow('brazo') }} />
        
        {/* Right Arm (Brazos) */}
        <path d="M 68 40 L 85 50 L 90 90 L 80 90 L 72 55 Z" fill={getColor('brazo')} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" style={{ transition: 'fill 0.5s', filter: getGlow('brazo') }} />
        
        {/* Left Leg (Piernas) */}
        <path d="M 35 105 L 49 105 L 45 190 L 25 190 Z" fill={getColor('pierna')} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" style={{ transition: 'fill 0.5s', filter: getGlow('pierna') }} />
        
        {/* Right Leg (Piernas) */}
        <path d="M 51 105 L 65 105 L 75 190 L 55 190 Z" fill={getColor('pierna')} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" style={{ transition: 'fill 0.5s', filter: getGlow('pierna') }} />
      </svg>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--foreground)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '500' }}>
          <div style={{width: 14, height: 14, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.6)'}}></div> Fatigado (24h)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '500' }}>
          <div style={{width: 14, height: 14, borderRadius: '50%', background: '#eab308', boxShadow: '0 0 8px rgba(234,179,8,0.6)'}}></div> Recuperándose (48h)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: '500' }}>
          <div style={{width: 14, height: 14, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)'}}></div> Fresco (72h)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--muted-foreground)' }}>
          <div style={{width: 14, height: 14, borderRadius: '50%', background: '#1f2937', border: '1px solid rgba(255,255,255,0.1)'}}></div> Sin actividad reciente
        </div>
      </div>
    </div>
  );
}
