import React, { useState, useEffect } from 'react';
import { Play, Pause, Heart, Wind, Moon, Volume2 } from 'lucide-react';
import '../styles/global.css';

export default function Wellness() {
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState('Listo'); // Inhala, Sostén, Exhala
  const [timer, setTimer] = useState(0);
  const [activeSound, setActiveSound] = useState(null);

  // Box Breathing Logic: 4s inhale, 4s hold, 4s exhale, 4s hold
  useEffect(() => {
    let interval;
    if (isBreathing) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setTimer(0);
      setBreathPhase('Listo');
    }
    return () => clearInterval(interval);
  }, [isBreathing]);

  useEffect(() => {
    if (!isBreathing) return;
    
    const cycle = timer % 16;
    if (cycle < 4) {
      setBreathPhase('Inhala');
    } else if (cycle < 8) {
      setBreathPhase('Sostén');
    } else if (cycle < 12) {
      setBreathPhase('Exhala');
    } else {
      setBreathPhase('Sostén');
    }
  }, [timer, isBreathing]);

  const toggleSound = (sound) => {
    if (activeSound === sound) {
      setActiveSound(null);
    } else {
      setActiveSound(sound);
    }
  };

  return (
    <div className="wellness-page" style={{ position: 'relative', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Heart color="#ec4899" /> Modo Wellness
          </h1>
          <p>Recuperación activa mental y física. Tómate un momento para ti.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', flex: 1 }}>
        
        {/* Breathing Exercise Panel */}
        <div className="panel glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', border: '1px solid rgba(236, 72, 153, 0.3)', background: 'linear-gradient(135deg, rgba(0,0,0,0.6), rgba(236, 72, 153, 0.1))' }}>
          <h3 style={{ color: '#ec4899', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Wind size={24} /> Respiración de Caja (Box Breathing)
          </h3>
          <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', marginBottom: '3rem', fontSize: '0.9rem' }}>
            Reduce el cortisol y mejora tu enfoque antes o después de entrenar.
          </p>

          <div style={{ position: 'relative', width: '250px', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '3rem' }}>
            {/* Animated Circle */}
            <div 
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'rgba(236, 72, 153, 0.1)',
                border: '2px solid rgba(236, 72, 153, 0.5)',
                transition: 'transform 4s linear, opacity 1s',
                transform: isBreathing 
                  ? (breathPhase === 'Inhala' ? 'scale(1.5)' : (breathPhase === 'Sostén' ? 'scale(1.5)' : (breathPhase === 'Exhala' ? 'scale(0.8)' : 'scale(0.8)')))
                  : 'scale(1)',
                opacity: isBreathing ? 1 : 0.3
              }}
            />
            
            <div style={{ zIndex: 10, textAlign: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '2rem', color: isBreathing ? '#fff' : 'var(--muted-foreground)', transition: 'color 0.5s' }}>
                {breathPhase}
              </h2>
              {isBreathing && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#ec4899' }}>
                  {4 - (timer % 4)}s
                </p>
              )}
            </div>
          </div>

          <button 
            className="btn-primary" 
            style={{ 
              background: isBreathing ? 'rgba(255,255,255,0.1)' : '#ec4899', 
              color: isBreathing ? 'white' : 'white',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              borderRadius: '50px',
              border: isBreathing ? '1px solid rgba(255,255,255,0.2)' : 'none'
            }}
            onClick={() => setIsBreathing(!isBreathing)}
          >
            {isBreathing ? <><Pause size={20} /> Detener</> : <><Play size={20} /> Iniciar Sesión</>}
          </button>
        </div>

        {/* Meditation / Sleep Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="panel glass" style={{ border: '1px solid rgba(99, 102, 241, 0.3)', background: 'linear-gradient(135deg, rgba(0,0,0,0.6), rgba(99, 102, 241, 0.1))' }}>
            <h3 style={{ color: '#6366f1', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Volume2 size={24} /> Paisajes Sonoros
            </h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Enmascara el ruido de fondo y entra en un estado de flujo profundo.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { id: 'rain', name: 'Lluvia Suave', color: '#3b82f6' },
                { id: 'waves', name: 'Olas del Mar', color: '#0ea5e9' },
                { id: 'brown_noise', name: 'Ruido Marrón (Enfoque)', color: '#d97706' }
              ].map(sound => (
                <button 
                  key={sound.id}
                  className="glass"
                  onClick={() => toggleSound(sound.id)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '1rem', 
                    borderRadius: 'var(--radius)', 
                    border: activeSound === sound.id ? `1px solid ${sound.color}` : '1px solid rgba(255,255,255,0.05)',
                    background: activeSound === sound.id ? `${sound.color}20` : 'transparent',
                    cursor: 'pointer',
                    color: 'white',
                    transition: 'all 0.3s'
                  }}
                >
                  <span style={{ fontWeight: '500' }}>{sound.name}</span>
                  {activeSound === sound.id ? <Pause size={20} color={sound.color} /> : <Play size={20} color="var(--muted-foreground)" />}
                </button>
              ))}
            </div>
            
            {activeSound && (
              <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#6366f1', textAlign: 'center', animation: 'fade-up 0.3s' }}>
                Reproduciendo paisaje sonoro... (Simulación UI)
              </p>
            )}
          </div>

          <div className="panel glass" style={{ border: '1px solid rgba(168, 85, 247, 0.3)', background: 'linear-gradient(135deg, rgba(0,0,0,0.6), rgba(168, 85, 247, 0.1))' }}>
            <h3 style={{ color: '#a855f7', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Moon size={24} /> Optimización del Sueño
            </h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              El músculo crece mientras duermes. Consejos para esta noche:
            </p>
            <ul style={{ color: 'var(--foreground)', fontSize: '0.9rem', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li>Apaga las pantallas 1 hora antes de dormir.</li>
              <li>Mantén tu habitación fría (aprox. 18°C - 20°C).</li>
              <li>Toma magnesio o manzanilla para relajar el sistema nervioso.</li>
            </ul>
          </div>
          
        </div>

      </div>
    </div>
  );
}
