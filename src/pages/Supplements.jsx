import React from 'react';
import { Pill } from 'lucide-react';
import '../styles/global.css';

export default function Supplements() {
  return (
    <div className="supplements-page" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="empty-state glass" style={{ padding: '4rem', textAlign: 'center', maxWidth: '500px', width: '100%' }}>
        <div style={{ background: 'rgba(163, 230, 53, 0.1)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
          <Pill size={40} color="var(--primary)" />
        </div>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'white' }}>Suplementación</h1>
        <div className="badge" style={{ marginBottom: '1.5rem', background: 'rgba(168, 85, 247, 0.2)', color: '#a855f7', fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
          Próximamente
        </div>
        <p style={{ color: 'var(--muted-foreground)', lineHeight: '1.6' }}>
          Estamos preparando una sección completa donde podrás gestionar, recomendar y llevar un control detallado de la suplementación deportiva.
        </p>
      </div>
    </div>
  );
}
