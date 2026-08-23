import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { __fixtures } from './mocks/firebase-firestore.js';
import StudentWorkouts from '../../src/pages/StudentWorkouts.jsx';

const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

// Esperar a que algo aparezca, en lugar de dormir un tiempo fijo: con una
// espera fija la prueba fallaba de forma intermitente cuando la máquina iba
// cargada por las otras suites.
async function esperar(fn, limite = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < limite) {
    const v = fn();
    if (v) return v;
    await tick(25);
  }
  return null;
}

const hoy = new Date();
const clave = (d) => {
  const x = new Date(hoy); x.setDate(x.getDate() - d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
};

export async function run() {
  __fixtures.exercises = [{ id: 'press', name: 'Press de banca', targetMuscle: 'Pecho' }];
  __fixtures.workouts = [
    { id: 'ayer', studentId: 'user-1', completed: true, date: clave(3),
      exercises: [{ exerciseId: 'press', name: 'Press de banca', sets: 4, reps: 10 }],
      actualData: { 0: { done: true, reps: '4x10', weight: 62.5, rir: '2' } } },
    { id: 'hoy', studentId: 'user-1', completed: false, date: clave(0),
      exercises: [{ exerciseId: 'press', name: 'Press de banca', sets: 4, reps: 10 }] },
  ];

  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(<MemoryRouter><StudentWorkouts /></MemoryRouter>);
  await esperar(() => host.querySelector('.last-session'));

  const out = [];
  const chip = host.querySelector('.last-session');
  const texto = chip ? chip.textContent.replace(/\s+/g, ' ').trim() : '(no aparece)';
  out.push({ caso: 'Aparece el bloque "última vez"', esperado: true, obtenido: !!chip && !chip.classList.contains('last-session-empty') });
  out.push({ caso: 'Muestra la serie de hace 3 días', esperado: true, obtenido: texto.includes('4x10 · 62.5 kg · RIR 2') });
  out.push({ caso: 'Muestra cuándo fue', esperado: true, obtenido: texto.includes('hace 3 días') });

  // Pulsar "Repetir" debe copiar los valores a los controles
  const btn = host.querySelector('.last-session-btn');
  out.push({ caso: 'Existe el botón Repetir', esperado: true, obtenido: !!btn });
  if (btn) {
    btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await esperar(() => {
      const i = host.querySelector('input[type="number"]');
      return i && String(i.value) === '62.5';
    });
    const pesoInput = host.querySelector('input[type="number"]');
    out.push({ caso: 'Repetir copia el peso (62.5)', esperado: true, obtenido: pesoInput && String(pesoInput.value) === '62.5' });
  }

  root.unmount(); host.remove();
  __fixtures.workouts = []; __fixtures.exercises = [];
  return out;
}
