import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { currentRole } from './mocks/AuthContext.jsx';
import Layout from '../../src/components/Layout.jsx';
import Login from '../../src/pages/Login.jsx';
import Dashboard from '../../src/pages/Dashboard.jsx';
import Trainers from '../../src/pages/Trainers.jsx';
import Exercises from '../../src/pages/Exercises.jsx';
import Students from '../../src/pages/Students.jsx';
import Workouts from '../../src/pages/Workouts.jsx';
import StudentWorkouts from '../../src/pages/StudentWorkouts.jsx';
import StudentProgress from '../../src/pages/StudentProgress.jsx';
import BodyMetrics from '../../src/pages/BodyMetrics.jsx';
import Training from '../../src/pages/Training.jsx';
import Supplements from '../../src/pages/Supplements.jsx';
import Chat from '../../src/pages/Chat.jsx';
import Settings from '../../src/pages/Settings.jsx';
import Support from '../../src/pages/Support.jsx';
import Tips from '../../src/pages/Tips.jsx';
import Wellness from '../../src/pages/Wellness.jsx';

const PAGES = [
  ['/login', 'Login', Login, 'Lleva tu entrenamiento al siguiente nivel'],
  ['/dashboard', 'Dashboard', Dashboard, 'Análisis Inteligente'],
  ['/entrenadores', 'Entrenadores', Trainers, 'Gestión de Entrenadores'],
  ['/ejercicios', 'Ejercicios', Exercises, 'Biblioteca de Ejercicios'],
  ['/alumnos', 'Mis Alumnos', Students, 'Registrar Alumno'],
  ['/rutinas', 'Rutinas', Workouts, 'Gestión de Rutinas'],
  ['/mis-rutinas', 'Mis Rutinas', StudentWorkouts, 'Entrenamientos del'],
  ['/progreso', 'Mi Progreso', StudentProgress, 'Registrar Log'],
  ['/control-corporal', 'Control Corporal', BodyMetrics, 'Evaluación Antropométrica'],
  ['/fuerza-hipertrofia', 'Fuerza e Hipertrofia', Training, '1RM estimado'],
  ['/suplementacion', 'Suplementacion', Supplements, 'Suplementación'],
  ['/mensajes', 'Mensajes', Chat, 'Selecciona un alumno'],
  ['/soporte', 'Soporte', Support, 'Soporte'],
  ['/configuracion', 'Configuracion', Settings, 'Guardar Cambios'],
  ['/consejos', 'Consejos', Tips, 'Consejos de Salud'],
  ['/wellness', 'Wellness', Wellness, 'Respiración de Caja'],
];

async function tick(ms = 15) {
  await new Promise(r => setTimeout(r, ms));
}

export async function run(role) {
  currentRole.value = role;
  const results = [];

  for (const [path, name, Page, marker] of PAGES) {
    globalThis.__SMOKE_PAGE__ = `${role} ${path}`;
    if (process.env.CHECK_VERBOSE) console.log('   ->', role, path);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const errors = [];

    let root;
    try {
      root = createRoot(host, {
        onUncaughtError: (e) => errors.push(e?.message || String(e)),
        onCaughtError: (e) => errors.push(e?.message || String(e)),
      });
      root.render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<Layout />}>
              <Route path={path} element={<Page />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
      // Deja correr los efectos y las promesas de los mocks.
      for (let i = 0; i < 5; i++) await tick();

      const text = (host.textContent || '').replace(/\s+/g, ' ');
      const rendered = text.includes(marker);
      results.push({
        path, name, role, marker,
        ok: errors.length === 0 && host.innerHTML.length > 0 && rendered,
        rendered,
        chars: host.innerHTML.length,
        errors,
        sample: text.trim().slice(0, 90),
      });
    } catch (err) {
      results.push({ path, name, role, marker, ok: false, rendered: false, chars: 0, errors: [err.message], sample: '' });
    } finally {
      try { root && root.unmount(); } catch { /* ignore */ }
      host.remove();
    }
  }
  return results;
}
