import React from 'react';
import { Droplets, Utensils, Activity, HeartPulse } from 'lucide-react';
import '../styles/global.css';

export default function Tips() {
  return (
    <div className="tips-page">
      <div className="page-header">
        <div>
          <h1>Consejos de Salud</h1>
          <p>Recomendaciones generales para maximizar tus resultados y cuidar tu cuerpo.</p>
        </div>
      </div>

      <div className="grid">
        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: '#3b82f6' }}>
              <Droplets size={32} />
            </div>
            <h2 style={{ margin: 0, color: 'white' }}>Importancia de la Hidratación</h2>
          </div>
          <p style={{ color: 'var(--muted-foreground)', lineHeight: '1.6', marginBottom: '1rem' }}>
            El agua compone aproximadamente el 60% de tu cuerpo. Mantenerse hidratado es vital para el rendimiento físico, la recuperación muscular y el funcionamiento de las articulaciones.
          </p>
          <ul style={{ color: 'var(--foreground)', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
            <li>Bebe al menos 2 a 3 litros de agua al día, dependiendo de tu actividad.</li>
            <li>Durante el entrenamiento, intenta beber unos sorbos cada 15-20 minutos.</li>
            <li>La deshidratación puede causar calambres, fatiga prematura y mayor riesgo de lesiones.</li>
          </ul>
        </div>

        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(163, 230, 53, 0.1)', borderRadius: '12px', color: 'var(--primary)' }}>
              <Activity size={32} />
            </div>
            <h2 style={{ margin: 0, color: 'white' }}>Estiramiento y Calentamiento</h2>
          </div>
          <p style={{ color: 'var(--muted-foreground)', lineHeight: '1.6', marginBottom: '1rem' }}>
            Un buen calentamiento prepara tus músculos y articulaciones, aumentando el flujo sanguíneo y previniendo lesiones graves durante el levantamiento de pesas.
          </p>
          <ul style={{ color: 'var(--foreground)', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
            <li>Dedica de 5 a 10 minutos a calentar antes de comenzar tu rutina (ej. bicicleta suave o movilidad articular).</li>
            <li>Haz series de aproximación con poco peso antes de ir por tu RM o peso máximo.</li>
            <li>Al finalizar, realiza estiramientos estáticos para mejorar la flexibilidad y reducir las agujetas.</li>
          </ul>
        </div>

        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius)', gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', color: '#f59e0b' }}>
              <Utensils size={32} />
            </div>
            <h2 style={{ margin: 0, color: 'white' }}>Nutrición y Comidas</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            <div>
              <h4 style={{ color: 'var(--foreground)', marginBottom: '0.5rem' }}>Proteínas</h4>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Fundamentales para la reparación muscular. Fuentes recomendadas: Pollo, huevos, pescados, legumbres, yogurt griego y proteína en polvo. Intenta consumir entre 1.6g a 2g por kilo de peso corporal si buscas ganar masa muscular.
              </p>
            </div>
            <div>
              <h4 style={{ color: 'var(--foreground)', marginBottom: '0.5rem' }}>Carbohidratos</h4>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Tu principal fuente de energía. Prefiere carbohidratos complejos como avena, arroz integral, papa y batata para mantener la energía estable durante el día y los entrenamientos.
              </p>
            </div>
            <div>
              <h4 style={{ color: 'var(--foreground)', marginBottom: '0.5rem' }}>Grasas Saludables</h4>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Importantes para el equilibrio hormonal. Incluye en tu dieta aguacate (palta), aceite de oliva, frutos secos y semillas en porciones controladas.
              </p>
            </div>
          </div>
        </div>
        
        <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius)', gridColumn: '1 / -1', background: 'linear-gradient(to right, rgba(0,0,0,0.4), rgba(239, 68, 68, 0.05))', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <HeartPulse size={28} color="#ef4444" />
            <h3 style={{ margin: 0, color: '#ef4444' }}>Descanso: El factor olvidado</h3>
          </div>
          <p style={{ color: 'var(--muted-foreground)', lineHeight: '1.6', margin: 0 }}>
            El músculo no crece en el gimnasio, crece mientras duermes y descansas. Dormir entre 7 a 8 horas diarias es innegociable si buscas resultados reales. La falta de sueño dispara el cortisol (hormona del estrés) y reduce la testosterona, afectando directamente tus ganancias.
          </p>
        </div>
      </div>
    </div>
  );
}
